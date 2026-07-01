// ========================================
// PERSONAL PRO — Database (v3)
// Supabase Auth + Multi-Tenant Isolation
// All records scoped to trainer_id (user.id)
// ========================================

import { getSupabase, getCurrentUser } from './utils/auth.js';

/**
 * Corrige strings com double-encoding UTF-8 (Latin-1 interpretado como UTF-8).
 * Ex: 'PrÃ©-exaustÃo' → 'Pré-exaustão'
 */
export function fixEncoding(str) {
  if (!str || typeof str !== 'string') return str;
  // Heuristic: se contém sequências Latin-1 típicas de UTF-8 mal decodificado
  if (!/[\xC0-\xC3\xC5-\xCB\xCD-\xCF\xD1-\xD4\xD6-\xD9\xDB-\xDF]/.test(str)) return str;
  try {
    // Recodificar de Latin-1 para bytes e decodificar como UTF-8
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

/**
 * Recursivamente corrige strings em objetos e arrays com double-encoding UTF-8.
 */
export function fixObjectEncoding(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return fixEncoding(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(fixObjectEncoding);
  }
  if (typeof obj === 'object') {
    const res = {};
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        res[k] = fixObjectEncoding(obj[k]);
      }
    }
    return res;
  }
  return obj;
}

const SUPABASE_URL = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

class Database {
  constructor() {
    // Use the singleton from auth.js
    this._currentUser = null;
  }

  _deletionsKey(trainerId) {
    return trainerId ? `pp_${trainerId}_deletions` : `pp_deletions`;
  }

  _getTombstones(trainerId) {
    try {
      const key = this._deletionsKey(trainerId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }

  _saveTombstones(tombstones, trainerId) {
    try {
      const key = this._deletionsKey(trainerId);
      localStorage.setItem(key, JSON.stringify(tombstones));
    } catch (e) { console.error('LocalStorage error in tombstones:', e); }
  }

  _addTombstone(storeName, id, trainerId) {
    const tombstones = this._getTombstones(trainerId);
    if (!tombstones.some(t => t.id === id && t.storeName === storeName)) {
      tombstones.push({ id, storeName, deletedAt: new Date().toISOString() });
      this._saveTombstones(tombstones, trainerId);
    }
  }

  _removeTombstone(storeName, id, trainerId) {
    let tombstones = this._getTombstones(trainerId);
    tombstones = tombstones.filter(t => !(t.id === id && t.storeName === storeName));
    this._saveTombstones(tombstones, trainerId);
  }

  _pruneTombstones(trainerId) {
    let tombstones = this._getTombstones(trainerId);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    tombstones = tombstones.filter(t => new Date(t.deletedAt).getTime() > thirtyDaysAgo);
    this._saveTombstones(tombstones, trainerId);
  }

  get supabase() {
    return getSupabase();
  }

  // Get current user id (trainer_id used in all records)
  async _getTrainerId() {
    if (this.studentPortalTrainerId) return this.studentPortalTrainerId;
    if (this._currentUser?.id) return this._currentUser.id;
    const user = await getCurrentUser();
    if (user) {
      this._currentUser = user;
      if (user.id && !user._offline) {
        this.startAutoSync(user.id);
      }
    }
    return user?.id || null;
  }

  async syncBothWays(trainerId) {
    if (!this.supabase || !trainerId) return;
    if (this._syncing) return;
    this._syncing = true;
    console.log(`[Sync] Starting two-way database sync for trainer: ${trainerId}`);
    try {
      // 0. Prune old tombstones
      this._pruneTombstones(trainerId);

      // Retry outstanding deletions first
      const tombstones = this._getTombstones(trainerId);
      const remainingTombstones = [];
      for (const tomb of tombstones) {
        try {
          let q = this.supabase.from(tomb.storeName).delete().eq('id', tomb.id);
          if (trainerId) q = q.eq('trainer_id', trainerId);
          const { error } = await q;
          if (error) {
            console.warn(`[Sync] Failed to retry remote delete for ${tomb.storeName} ID ${tomb.id}:`, error.message);
            remainingTombstones.push(tomb);
          }
        } catch (err) {
          console.warn(`[Sync] Exception retry remote delete:`, err);
          remainingTombstones.push(tomb);
        }
      }
      this._saveTombstones(remainingTombstones, trainerId);

      for (const storeName of this.SUPABASE_TABLES) {
        const localItems = this._getLocal(storeName, trainerId) || [];
        const currentStoreTombstones = new Set(
          this._getTombstones(trainerId)
            .filter(t => t.storeName === storeName)
            .map(t => t.id)
        );

        // Fetch remote data (all columns) for this trainer
        let q = this.supabase.from(storeName).select('*');
        if (storeName !== 'exercises' && storeName !== 'methods') {
          q = q.eq('trainer_id', trainerId);
        } else {
          q = q.eq('trainer_id', trainerId);
        }
        const { data: remoteRows, error } = await q;

        if (error) {
          console.warn(`[Sync] Failed to fetch remote data for ${storeName}:`, error.message);
          continue;
        }

        const remote = (remoteRows || []).map(r => {
          let itemData;
          if (r.data && typeof r.data === 'object') {
            itemData = { 
              ...r.data, 
              id: r.id,
              updatedAt: r.data.updatedAt || r.updated_at,
              createdAt: r.data.createdAt || r.created_at
            };
          } else {
            itemData = { 
              ...r,
              updatedAt: r.updatedAt || r.updated_at,
              createdAt: r.createdAt || r.created_at
            };
          }
          itemData._synced = true;
          return itemData;
        });

        const remoteMap = new Map(remote.map(r => [r.id, r]));
        const toUpload = [];
        const merged = new Map();

        // 1. Check local items for upload or local retention
        for (const localItem of localItems) {
          if (!localItem.id) continue;
          if (currentStoreTombstones.has(localItem.id)) continue;

          const remoteItem = remoteMap.get(localItem.id);

          if (!remoteItem) {
            if (localItem._synced === true) {
              // Deleted on another device, remove locally
              console.log(`[Sync] Item ${localItem.id} from ${storeName} was deleted on remote. Removing locally.`);
              continue;
            } else {
              toUpload.push(localItem);
              merged.set(localItem.id, localItem);
            }
          } else {
            const isLocalModified = !localItem._synced;

            if (isLocalModified) {
              const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
              const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();

              if (localTime > remoteTime + 1000) {
                toUpload.push(localItem);
                merged.set(localItem.id, localItem);
              } else {
                merged.set(localItem.id, remoteItem);
              }
            } else {
              merged.set(localItem.id, remoteItem);
            }
          }
        }

        // 2. Add remote items that don't exist locally
        // Re-ler tombstones frescos do localStorage para capturar deleções que
        // aconteceram durante este sync (evita re-importar itens recém-excluídos)
        const freshTombstones = new Set(
          this._getTombstones(trainerId)
            .filter(t => t.storeName === storeName)
            .map(t => t.id)
        );
        for (const remoteItem of remote) {
          if (!remoteItem.id) continue;
          if (freshTombstones.has(remoteItem.id)) continue;
          if (!merged.has(remoteItem.id)) {
            merged.set(remoteItem.id, remoteItem);
          }
        }

        // 3. Save merged results locally
        const result = [...merged.values()];
        this._saveLocal(storeName, result, trainerId);

        // 4. Perform upload if needed
        if (toUpload.length > 0) {
          console.log(`[Sync] Uploading ${toUpload.length} items to ${storeName}...`);
          const tablesWithIsDefault = new Set(['exercises', 'methods']);
          const chunkSize = 50;
          for (let i = 0; i < toUpload.length; i += chunkSize) {
            const chunk = toUpload.slice(i, i + chunkSize);
            const payloads = chunk.map(item => {
              const { _synced, ...cleanItem } = item;
              const base = { id: item.id, trainer_id: trainerId, data: cleanItem };
              if (tablesWithIsDefault.has(storeName)) base.is_default = item.is_default || false;
              return base;
            });
            const { error: upsertError } = await this.supabase
              .from(storeName)
              .upsert(payloads);
            if (upsertError) {
              console.warn(`[Sync] Failed to upload chunk to ${storeName}:`, upsertError.message);
            } else {
              // Mark uploaded items as synced locally
              const currentLocal = this._getLocal(storeName, trainerId) || [];
              const localMap = new Map(currentLocal.map(x => [x.id, x]));
              chunk.forEach(item => {
                const localItem = localMap.get(item.id);
                if (localItem) {
                  localItem._synced = true;
                  localMap.set(item.id, localItem);
                }
              });
              this._saveLocal(storeName, [...localMap.values()], trainerId);
            }
          }
        }
      }
      console.log(`[Sync] Two-way sync completed successfully!`);
    } catch (err) {
      console.warn(`[Sync] Error during sync:`, err);
    } finally {
      this._syncing = false;
    }
  }

  async syncLocalToRemote(trainerId) {
    return this.syncBothWays(trainerId);
  }

  async syncStudentData(studentId, trainerId) {
    if (!this.supabase || !studentId || !trainerId) return;
    if (this._studentSyncing) return;
    this._studentSyncing = true;
    console.log(`[Student Sync] Starting sync for student: ${studentId}`);
    try {
      // 0. Prune and retry tombstones
      this._pruneTombstones(trainerId);

      const tombstones = this._getTombstones(trainerId);
      const remainingTombstones = [];
      for (const tomb of tombstones) {
        try {
          let q = this.supabase.from(tomb.storeName).delete().eq('id', tomb.id);
          if (trainerId) q = q.eq('trainer_id', trainerId);
          const { error } = await q;
          if (error) {
            console.warn(`[Student Sync] Failed to retry remote delete for ${tomb.storeName} ID ${tomb.id}:`, error.message);
            remainingTombstones.push(tomb);
          }
        } catch (err) {
          console.warn(`[Student Sync] Exception retry remote delete:`, err);
          remainingTombstones.push(tomb);
        }
      }
      this._saveTombstones(remainingTombstones, trainerId);

      const tablesToSync = ['students', 'sessions', 'workouts', 'biofeedback', 'assessments', 'schedules', 'macrocycles', 'financial', 'exercises', 'methods'];
      for (const storeName of tablesToSync) {
        const localItems = this._getLocal(storeName, trainerId) || [];
        const studentLocal = storeName === 'students'
          ? localItems.filter(r => r && r.id === studentId)
          : (storeName === 'exercises' || storeName === 'methods')
            ? localItems
            : localItems.filter(r => r && (r.studentId === studentId || r.student_id === studentId));

        const currentStoreTombstones = new Set(
          this._getTombstones(trainerId)
            .filter(t => t.storeName === storeName)
            .map(t => t.id)
        );

        // Fetch remote data (all columns) for this student/trainer
        let remoteRows = [];
        let error = null;
        if (storeName === 'students') {
          const { data, error: err } = await this.supabase.from(storeName).select('*').eq('id', studentId);
          remoteRows = data || [];
          error = err;
        } else if (storeName === 'exercises' || storeName === 'methods') {
          const q1 = this.supabase.from(storeName).select('*').eq('trainer_id', trainerId);
          const q2 = this.supabase.from(storeName).select('*').eq('is_default', true);
          const [r1, r2] = await Promise.all([q1, q2]);
          const combined = [...(r1.data || []), ...(r2.data || [])];
          const seenIds = new Set();
          remoteRows = combined.filter(row => {
            if (!row || seenIds.has(row.id)) return false;
            seenIds.add(row.id);
            return true;
          });
          error = r1.error || r2.error;
        } else {
          const { data, error: err } = await this.supabase
            .from(storeName)
            .select('*')
            .filter('data->>studentId', 'eq', studentId);
          remoteRows = data || [];
          error = err;
        }

        if (error) {
          console.warn(`[Student Sync] Failed to fetch remote data for ${storeName}:`, error.message);
          continue;
        }

        const remote = (remoteRows || []).map(r => {
          let itemData;
          if (r.data && typeof r.data === 'object') {
            itemData = { 
              ...r.data, 
              id: r.id,
              updatedAt: r.data.updatedAt || r.updated_at,
              createdAt: r.data.createdAt || r.created_at
            };
          } else {
            itemData = { 
              ...r,
              updatedAt: r.updatedAt || r.updated_at,
              createdAt: r.createdAt || r.created_at
            };
          }
          itemData._synced = true;
          return itemData;
        });

        const remoteMap = new Map(remote.map(r => [r.id, r]));
        const toUpload = [];
        const merged = new Map();

        // 1. Check local student items for upload or local retention
        for (const localItem of studentLocal) {
          if (!localItem.id) continue;
          if (currentStoreTombstones.has(localItem.id)) continue;

          const remoteItem = remoteMap.get(localItem.id);

          if (!remoteItem) {
            if (localItem._synced === true) {
              // Deleted on another device, remove locally
              console.log(`[Student Sync] Item ${localItem.id} from ${storeName} was deleted on remote. Removing locally.`);
              continue;
            } else {
              toUpload.push(localItem);
              merged.set(localItem.id, localItem);
            }
          } else {
            const isLocalModified = !localItem._synced;

            if (isLocalModified) {
              const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
              const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();

              if (localTime > remoteTime + 1000) {
                toUpload.push(localItem);
                merged.set(localItem.id, localItem);
              } else {
                merged.set(localItem.id, remoteItem);
              }
            } else {
              merged.set(localItem.id, remoteItem);
            }
          }
        }

        // 2. Add remote items that don't exist locally
        for (const remoteItem of remote) {
          if (!remoteItem.id) continue;
          if (currentStoreTombstones.has(remoteItem.id)) continue;
          if (!merged.has(remoteItem.id)) {
            merged.set(remoteItem.id, remoteItem);
          }
        }

        // 3. Save merged results locally, preserving other student data
        const allLocal = this._getLocal(storeName, trainerId) || [];
        const localMap = new Map(allLocal.map(x => [x.id, x]));
        
        // Remove locally deleted items for this student
        studentLocal.forEach(localItem => {
          if (!merged.has(localItem.id)) {
            localMap.delete(localItem.id);
          }
        });

        merged.forEach(r => localMap.set(r.id, r));
        this._saveLocal(storeName, [...localMap.values()], trainerId);

        // 4. Perform upload if needed
        if (toUpload.length > 0) {
          console.log(`[Student Sync] Uploading ${toUpload.length} items to ${storeName}...`);
          const tablesWithIsDefault = new Set(['exercises', 'methods']);
          const payloads = toUpload.map(item => {
            const { _synced, ...cleanItem } = item;
            const base = { id: item.id, trainer_id: trainerId || null, data: cleanItem };
            if (tablesWithIsDefault.has(storeName)) base.is_default = item.is_default || false;
            return base;
          });
          const { error: upsertError } = await this.supabase
            .from(storeName)
            .upsert(payloads);
          if (upsertError) {
            console.warn(`[Student Sync] Failed to upload to ${storeName}:`, upsertError.message);
          } else {
            // Mark uploaded items as synced locally
            const currentLocal = this._getLocal(storeName, trainerId) || [];
            const localMap2 = new Map(currentLocal.map(x => [x.id, x]));
            toUpload.forEach(item => {
              const localItem = localMap2.get(item.id);
              if (localItem) {
                localItem._synced = true;
                localMap2.set(item.id, localItem);
              }
            });
            this._saveLocal(storeName, [...localMap2.values()], trainerId);
          }
        }
      }
      console.log(`[Student Sync] Sync completed successfully!`);
    } catch (err) {
      console.warn(`[Student Sync] Error during student sync:`, err);
    } finally {
      this._studentSyncing = false;
    }
  }

  startAutoSync(trainerId) {
    if (this._autoSyncInterval) clearInterval(this._autoSyncInterval);
    
    // Initial sync
    this.syncBothWays(trainerId).catch(err => console.warn('Initial sync failed:', err));
    
    // Periodic sync every 30 seconds
    this._autoSyncInterval = setInterval(() => {
      this.syncBothWays(trainerId).catch(err => console.warn('Periodic sync failed:', err));
    }, 30_000);
    
    // Sync on online event
    if (!this._onlineListenerBound) {
      window.addEventListener('online', () => {
        console.log('[Sync] Connection restored, triggering sync...');
        this.syncBothWays(trainerId).catch(err => console.warn('Online sync failed:', err));
      });
      this._onlineListenerBound = true;
    }
  }

  // ── LOCAL STORAGE HELPERS (scoped per trainer_id) ──
  _localKey(storeName, trainerId) {
    return trainerId ? `pp_${trainerId}_${storeName}` : `pp_${storeName}`;
  }

  _getLocal(storeName, trainerId) {
    try {
      const key = this._localKey(storeName, trainerId);
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
      // Fallback: try old unscoped key (migration)
      const old = localStorage.getItem(`pp_${storeName}`);
      return old ? JSON.parse(old) : [];
    } catch { return []; }
  }

  _saveLocal(storeName, items, trainerId) {
    try {
      localStorage.setItem(this._localKey(storeName, trainerId), JSON.stringify(items));
    } catch (e) { console.error('LocalStorage error:', e); }
  }

  // ── GET SINGLE RECORD ──
  async get(storeName, id) {
    const trainerId = await this._getTrainerId();
    const tombstones = this._getTombstones(trainerId);
    const isDeleted = tombstones.some(t => t.storeName === storeName && t.id === id);
    if (isDeleted) return null;

    const local = (this._getLocal(storeName, trainerId) || []).find(i => i.id === id) || null;
    if (!this.supabase) return fixObjectEncoding(local);

    try {
      let q = this.supabase.from(storeName).select('*').eq('id', id);
      // exercises e methods: não filtrar por trainer_id (is_default=true tem trainer_id=null)
      if (trainerId && storeName !== 'exercises' && storeName !== 'methods') {
        q = q.eq('trainer_id', trainerId);
      }
      const { data, error } = await q.maybeSingle();
      if (error) { console.warn(`get(${storeName}) error:`, error.message); return fixObjectEncoding(local); }
      if (!data) return fixObjectEncoding(local);
      const res = data.data && typeof data.data === 'object' ? { 
        ...data.data, 
        id: data.id,
        updatedAt: data.data.updatedAt || data.updated_at,
        createdAt: data.data.createdAt || data.created_at
      } : {
        ...data,
        updatedAt: data.updatedAt || data.updated_at,
        createdAt: data.createdAt || data.created_at
      };
      res._synced = true;
      
      if (local) {
        const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
        const remoteTime = new Date(res.updatedAt || res.createdAt || 0).getTime();
        if (localTime > remoteTime) {
          return fixObjectEncoding(local);
        }
      }
      return fixObjectEncoding(res);
    } catch(e) { console.warn(`get(${storeName}) exception:`, e?.message); return fixObjectEncoding(local); }
  }

  // Tabelas que existem no Supabase (as demais ficam só em localStorage)
  SUPABASE_TABLES = new Set([
    'students','sessions','biofeedback','workouts','assessments',
    'cycles','macrocycles','schedules','financial',
    'events','prescriptions','anamnesis','settings','exercises','methods',
  ]);

  // ── GET ALL RECORDS ──
  async getStudentByEmail(email) {
    const trainerId = await this._getTrainerId();
    const local = this._getLocal('students', trainerId) || [];
    const localMatch = local.find(s => s.email?.toLowerCase().trim() === email);
    if (localMatch) return fixObjectEncoding(localMatch);
    if (!this.supabase) return null;
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('*')
        .ilike('data->>email', email);
      if (!error && data && data.length > 0) {
        const r = data[0];
        const res = r.data ? { ...r.data, id: r.id } : r;
        res._synced = true;
        return fixObjectEncoding(res);
      }
    } catch (e) {
      console.error('getStudentByEmail error:', e);
    }
    return null;
  }

  async getAll(storeName) {
    const trainerId = await this._getTrainerId();
    let local       = this._getLocal(storeName, trainerId) || [];

    if (storeName === 'exercises' || storeName === 'methods') {
      const prefix = storeName === 'methods' ? 'met_' : 'ex_';
      const sortedLocal = [...local].sort((a, b) => {
        const aPrefix = a && a.id && a.id.startsWith(prefix);
        const bPrefix = b && b.id && b.id.startsWith(prefix);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;
        return 0;
      });
      const seenName = new Set();
      local = sortedLocal.filter(item => {
        if (!item) return false;
        const name = item.name ? String(item.name).toLowerCase().trim() : '';
        if (name) {
          if (seenName.has(name)) return false;
          seenName.add(name);
        }
        return true;
      });
    }

    if (!this.supabase || !this.SUPABASE_TABLES.has(storeName)) return fixObjectEncoding(local);

    try {
      let data, error;

      // exercises e methods: buscar trainer_id OU is_default=true
      if (storeName === 'exercises' || storeName === 'methods') {
        const q1 = trainerId
          ? this.supabase.from(storeName).select('*').eq('trainer_id', trainerId)
          : this.supabase.from(storeName).select('*').eq('is_default', true);
        const q2 = this.supabase.from(storeName).select('*').eq('is_default', true);
        const [r1, r2] = await Promise.all([q1, q2]);
        const prefix = storeName === 'methods' ? 'met_' : 'ex_';
        const sortedAll = [...(r1.data||[]), ...(r2.data||[])].sort((a, b) => {
          const aPrefix = a.id && a.id.startsWith(prefix);
          const bPrefix = b.id && b.id.startsWith(prefix);
          if (aPrefix && !bPrefix) return -1;
          if (!aPrefix && bPrefix) return 1;
          return 0;
        });
        // Deduplicar por id e por nome (evita duplicatas de global vs personal)
        const seenId = new Set();
        const seenName = new Set();
        data  = sortedAll.filter(r => { 
          if (!r) return false;
          const rName = r.data && r.data.name ? String(r.data.name).toLowerCase().trim() : '';
          if (seenId.has(r.id) || (rName && seenName.has(rName))) return false; 
          seenId.add(r.id);
          if (rName) seenName.add(rName);
          return true; 
        });
        error = r1.error;
      } else {
        let q = this.supabase.from(storeName).select('*');
        if (trainerId) q = q.eq('trainer_id', trainerId);
        ({ data, error } = await q);
      }

      if (error) {
        console.warn(`getAll(${storeName}) Supabase error:`, error.message);
        return fixObjectEncoding(local);
      }

      if (!data) return fixObjectEncoding(local);

      // Mapear: usar r.data (JSONB) se existir, senão usar a row direta
      const remote = data.map(r => {
        let itemData;
        if (r.data && typeof r.data === 'object') {
          itemData = {
            ...r.data, 
            id: r.id,
            updatedAt: r.data.updatedAt || r.updated_at,
            createdAt: r.data.createdAt || r.created_at
          };
        } else {
          itemData = {
            ...r,
            updatedAt: r.updatedAt || r.updated_at,
            createdAt: r.createdAt || r.created_at
          };
        }
        itemData._synced = true;
        return itemData;
      });

      const tombstones = this._getTombstones(trainerId);
      const storeTombstones = new Set(tombstones.filter(t => t.storeName === storeName).map(t => t.id));

      // Mesclar com local (local pode ter registros offline) mantendo o registro com updatedAt mais recente
      const merged = new Map();
      local.forEach(r => { if (r?.id && !storeTombstones.has(r.id)) merged.set(r.id, r); });
      remote.forEach(r => {
        if (r?.id && !storeTombstones.has(r.id)) {
          const localItem = merged.get(r.id);
          if (localItem) {
            const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
            const remoteTime = new Date(r.updatedAt || r.createdAt || 0).getTime();
            if (remoteTime >= localTime) {
              merged.set(r.id, r);
            }
          } else {
            merged.set(r.id, r);
          }
        }
      });
      let result = [...merged.values()];

      // Deduplicar por nome para exercises e methods
      if (storeName === 'exercises' || storeName === 'methods') {
        const prefix = storeName === 'methods' ? 'met_' : 'ex_';
        const sortedResult = [...result].sort((a, b) => {
          const aPrefix = a.id && a.id.startsWith(prefix);
          const bPrefix = b.id && b.id.startsWith(prefix);
          if (aPrefix && !bPrefix) return -1;
          if (!aPrefix && bPrefix) return 1;
          return 0;
        });
        const seenName = new Set();
        const deduped = [];
        for (const item of sortedResult) {
          const name = item.name ? String(item.name).toLowerCase().trim() : '';
          if (name) {
            if (seenName.has(name)) continue;
            seenName.add(name);
          }
          deduped.push(item);
        }
        result = deduped;
      }

      this._saveLocal(storeName, result, trainerId);
      return fixObjectEncoding(result);
    } catch (e) {
      console.warn(`getAll(${storeName}) exception:`, e?.message || e);
      return fixObjectEncoding(local);
    }
  }

  // ── GET ALL FOR STUDENT (sem filtro de trainer_id) ──────────
  async getAllForStudent(storeName, studentId) {
    const trainerId = await this._getTrainerId();
    const tombstones = this._getTombstones(trainerId);
    const storeTombstones = new Set(tombstones.filter(t => t.storeName === storeName).map(t => t.id));

    const local = (this._getLocal(storeName, trainerId) || [])
      .filter(r => r?.studentId === studentId && !storeTombstones.has(r?.id));

    if (!this.supabase) return fixObjectEncoding(local);

    try {
      // Busca 1: pelo trainer_id (registros do personal + formulários com trainer correto)
      // Busca 2: pelo studentId direto via JSONB (registros antigos)
      const [r1, r2] = await Promise.all([
        this.supabase.from(storeName).select('*').eq('trainer_id', trainerId),
        this.supabase.from(storeName).select('*').filter('data->>studentId', 'eq', studentId),
      ]);

      const all  = [...(r1.data||[]), ...(r2.data||[])];
      const seen = new Set();
      const res = all
        .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
        .map(r => {
          let itemData = r.data ? { ...r.data, id: r.id } : r;
          itemData._synced = true;
          return itemData;
        })
        .filter(r => r?.studentId === studentId && !storeTombstones.has(r?.id));
      return fixObjectEncoding(res);
    } catch (e) {
      console.warn('getAllForStudent error:', e);
      return fixObjectEncoding(local);
    }
  }

  // ── GET BY INDEX ──
  async getByIndex(storeName, indexName, value) {
    const all = await this.getAll(storeName);
    return all.filter(item => item && item[indexName] === value);
  }

  // ── PUT (UPSERT) ──
  async put(storeName, item) {
    const trainerId = await this._getTrainerId() || item.trainer_id || item.trainerId;

    // Normalize id
    if (!item.id && item.key) item.id = item.key;
    if (!item.id) item.id = crypto.randomUUID();
    item.updatedAt = (()=>{ const d=new Date(),o=d.getTimezoneOffset(),l=new Date(d.getTime()-o*60000),s=o<=0?'+':'-',h=String(Math.floor(Math.abs(o)/60)).padStart(2,'0'),m=String(Math.abs(o)%60).padStart(2,'0'); return l.toISOString().slice(0,-1)+s+h+':'+m; })();
    if (!item.createdAt) item.createdAt = (()=>{ const d=new Date(),o=d.getTimezoneOffset(),l=new Date(d.getTime()-o*60000),s=o<=0?'+':'-',h=String(Math.floor(Math.abs(o)/60)).padStart(2,'0'),m=String(Math.abs(o)%60).padStart(2,'0'); return l.toISOString().slice(0,-1)+s+h+':'+m; })();
    if (trainerId) {
      item.trainer_id = trainerId;
      item.trainerId = trainerId;
    }

    // Remove from deletions tombstone log if it exists
    this._removeTombstone(storeName, item.id, trainerId);

    // Any put/modification means the local item is not synced until the remote write succeeds
    delete item._synced;

    // Save locally first (offline-first)
    const all = this._getLocal(storeName, trainerId);
    const idx = all.findIndex(i => i.id === item.id);
    if (idx >= 0) all[idx] = item; else all.push(item);
    this._saveLocal(storeName, all, trainerId);

    if (!this.supabase) return item;

    try {
      // Apenas exercises e methods têm coluna is_default no schema do Supabase
      // Incluir is_default em outras tabelas causa erro 400 (schema cache error)
      const tablesWithIsDefault = new Set(['exercises', 'methods']);
      const payload = tablesWithIsDefault.has(storeName)
        ? { id: item.id, trainer_id: trainerId || null, is_default: item.is_default || false, data: item }
        : { id: item.id, trainer_id: trainerId || null, data: item };

      const { error } = await this.supabase.from(storeName).upsert(payload);
      if (error) {
        console.warn(`Supabase put error (${storeName}):`, error.message);
      } else {
        // Mark as synced locally since the server write succeeded
        const currentLocal = this._getLocal(storeName, trainerId) || [];
        const localIdx = currentLocal.findIndex(i => i.id === item.id);
        if (localIdx >= 0) {
          currentLocal[localIdx]._synced = true;
          this._saveLocal(storeName, currentLocal, trainerId);
        }
      }
    } catch (err) { console.warn(`Supabase put exception:`, err.message); }

    if (trainerId && !item._offline) {
      const sid = item.studentId || item.student_id;
      if (sid) {
        setTimeout(() => this.syncStudentData(sid, trainerId).catch(() => {}), 500);
      } else {
        setTimeout(() => this.syncBothWays(trainerId).catch(() => {}), 500);
      }
    }

    return item;
  }

  // ── ADD (alias for put) ──
  async add(storeName, item) {
    return this.put(storeName, item);
  }

  // ── DELETE ──
  async delete(storeName, id, trainerId = null) {
    const resolvedTrainerId = trainerId || await this._getTrainerId() || (typeof portalState !== 'undefined' ? portalState.trainerId : null);
    const all = this._getLocal(storeName, resolvedTrainerId).filter(i => i.id !== id);
    this._saveLocal(storeName, all, resolvedTrainerId);

    // Save tombstone local log
    if (this.SUPABASE_TABLES.has(storeName)) {
      this._addTombstone(storeName, id, resolvedTrainerId);
    }

    if (!this.supabase) return;
    try {
      let q = this.supabase.from(storeName).delete().eq('id', id);
      if (resolvedTrainerId) q = q.eq('trainer_id', resolvedTrainerId);
      const { error } = await q;
      if (!error) {
        this._removeTombstone(storeName, id, resolvedTrainerId);
        console.log(`[Delete] Remote delete OK for ${storeName} ID ${id}`);
      } else {
        console.warn(`Supabase delete error (${storeName}):`, error.message);
        // Tombstone permanece para retry no próximo syncBothWays
      }
    } catch (err) {
      console.warn(`Supabase delete exception:`, err.message);
      // Tombstone permanece para retry
    }
    // NÃO disparar syncBothWays aqui — evita race condition onde o item
    // recém-excluído ainda aparece no Supabase e é re-importado
  }

  // ── CLEAR ──
  async clear(storeName) {
    const trainerId = await this._getTrainerId();
    localStorage.removeItem(this._localKey(storeName, trainerId));
    if (!this.supabase) return;
    try {
      let q = this.supabase.from(storeName).delete().not('id', 'is', null);
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { error } = await q;
      if (error) console.warn(`Supabase clear error:`, error.message);
    } catch {}
  }

  // ── COUNT ──
  async count(storeName) {
    const trainerId = await this._getTrainerId();
    const local = this._getLocal(storeName, trainerId);
    if (!this.supabase) return local.length;
    try {
      let q = this.supabase.from(storeName).select('id', { count: 'exact', head: true });
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { count, error } = await q;
      if (error) return local.length;
      return count || 0;
    } catch { return local.length; }
  }

  //   // ── SEED INITIAL TEMPLATES ──
async seedTemplates() {
    const trainerId = await this._getTrainerId();
    if (!trainerId) return;

    // Sempre verificar métodos independente do seed de exercícios
    await this.seedMethods();

    // ── MIGRATION: VINCULAR IMAGENS E VÍDEOS DE EXERCÍCIOS LOCALMENTE ──
    try {
      const existing = await this.getAll('exercises');
      let updatedAny = false;
      for (const ex of existing) {
        if (!ex.is_default || ex.media_customized) continue;
        if (ex.name) {
          const nameLower = ex.name.trim().toLowerCase();
          let imageUrl = null;
          let videoUrl = null;
          const slugKey = slugify(ex.name);
          
          const mediaMap = {

            // Abdômen / Core
            'abdominal_infra': { imageUrl: 'assets/exercises/abdominal_infra.png', videoUrl: 'https://www.youtube.com/shorts/52431jS1yS4' },
            'crunch_no_cabo': { imageUrl: 'assets/exercises/cable_crunch.png', videoUrl: 'https://www.youtube.com/shorts/HlX1oFEt2a4' },
            'abdominal_no_cabo_rope_crunch': { imageUrl: 'assets/exercises/cable_crunch.png', videoUrl: 'https://www.youtube.com/shorts/HlX1oFEt2a4' },
            'prancha_frontal': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'prancha_lateral': { imageUrl: 'assets/exercises/side_plank.png', videoUrl: 'https://www.youtube.com/shorts/pWGhRO5grqs' },
            'prancha_com_toque_no_ombro': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'russian_twist': { imageUrl: 'assets/exercises/russian_twist.png', videoUrl: 'https://www.youtube.com/shorts/qzoJJuL-3-c' },
            'dead_bug': { imageUrl: 'assets/exercises/dead_bug.png', videoUrl: 'https://www.youtube.com/shorts/qzoJJuL-3-c' },
            'bird_dog': { imageUrl: 'assets/exercises/dead_bug.png', videoUrl: 'https://www.youtube.com/shorts/qzoJJuL-3-c' },
            'rollout_com_roda': { imageUrl: 'assets/exercises/ab_wheel_rollout.png', videoUrl: 'https://www.youtube.com/shorts/t2yXQq6sfhA' },
            'abdominal_na_roda': { imageUrl: 'assets/exercises/ab_wheel_rollout.png', videoUrl: 'https://www.youtube.com/shorts/t2yXQq6sfhA' },
            'rotacao_com_cabo': { imageUrl: 'assets/exercises/cable_crossover.png', videoUrl: 'https://www.youtube.com/shorts/qzoJJuL-3-c' },
            'abdominal_crunch': { imageUrl: 'assets/exercises/abdominal_crunch.png', videoUrl: 'https://www.youtube.com/shorts/52431jS1yS4' },
            'prancha': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            
            // Bíceps
            'rosca_21': { imageUrl: 'assets/exercises/barbell_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/Lz1gT6dI2Yw' },
            'rosca_alternada_com_halteres': { imageUrl: 'assets/exercises/alternating_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/q2Z0hLhWwR8' },
            'rosca_alternada': { imageUrl: 'assets/exercises/alternating_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/q2Z0hLhWwR8' },
            'rosca_direta_no_cross': { imageUrl: 'assets/exercises/cable_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/3iV7L_kE2s0' },
            'rosca_no_cabo': { imageUrl: 'assets/exercises/cable_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/3iV7L_kE2s0' },
            'rosca_direta_com_barra': { imageUrl: 'assets/exercises/barbell_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/R2_8Bv9Zkco' },
            'rosca_direta': { imageUrl: 'assets/exercises/barbell_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/R2_8Bv9Zkco' },
            'rosca_martelo': { imageUrl: 'assets/exercises/dumbbell_hammer_curl.png', videoUrl: 'https://www.youtube.com/shorts/c2D17Ld2424' },
            'rosca_scott': { imageUrl: 'assets/exercises/preacher_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/90_d-DsrOkE' },
            'rosca_concentrada': { imageUrl: 'assets/exercises/concentration_curl.png', videoUrl: 'https://www.youtube.com/shorts/90_d-DsrOkE' },
            
            // Costas
            'barra_fixa_pull_up': { imageUrl: 'assets/exercises/pullup.png', videoUrl: 'https://www.youtube.com/shorts/3wz97y0-8fI' },
            'barra_fixa': { imageUrl: 'assets/exercises/pullup.png', videoUrl: 'https://www.youtube.com/shorts/3wz97y0-8fI' },
            'levantamento_terra_romeno': { imageUrl: 'assets/exercises/stiff_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/eYpGZkX7w2g' },
            'pullover_com_halter': { imageUrl: 'assets/exercises/dumbbell_pullover.png', videoUrl: 'https://www.youtube.com/shorts/N2_yB9m15j4' },
            'pullover': { imageUrl: 'assets/exercises/dumbbell_pullover.png', videoUrl: 'https://www.youtube.com/shorts/N2_yB9m15j4' },
            'pullover_no_cabo': { imageUrl: 'assets/exercises/dumbbell_pullover.png', videoUrl: 'https://www.youtube.com/shorts/J1-yJ9bOqLo' },
            'puxada_fechada': { imageUrl: 'assets/exercises/lat_pulldown.png', videoUrl: 'https://www.youtube.com/shorts/_2MfZAj98tk' },
            'puxada_frontal': { imageUrl: 'assets/exercises/lat_pulldown.png', videoUrl: 'https://www.youtube.com/shorts/_2MfZAj98tk' },
            'remada_baixa_sentado': { imageUrl: 'assets/exercises/seated_cable_row.png', videoUrl: 'https://www.youtube.com/shorts/T3_9O4o0y8Y' },
            'remada_baixa': { imageUrl: 'assets/exercises/seated_cable_row.png', videoUrl: 'https://www.youtube.com/shorts/T3_9O4o0y8Y' },
            'remada_cavalinho': { imageUrl: 'assets/exercises/barbell_row.png', videoUrl: 'https://www.youtube.com/shorts/2K3d2V1OqLc' },
            'remada_curvada_com_barra': { imageUrl: 'assets/exercises/barbell_row.png', videoUrl: 'https://www.youtube.com/shorts/E2_1f3w0fCc' },
            'remada_curvada': { imageUrl: 'assets/exercises/barbell_row.png', videoUrl: 'https://www.youtube.com/shorts/E2_1f3w0fCc' },
            'remada_unilateral_com_halter': { imageUrl: 'assets/exercises/dumbbell_row.png', videoUrl: 'https://www.youtube.com/shorts/OhQTM6Mkq-E' },
            'remada_unilateral': { imageUrl: 'assets/exercises/dumbbell_row.png', videoUrl: 'https://www.youtube.com/shorts/OhQTM6Mkq-E' },
            'levantamento_terra': { imageUrl: 'assets/exercises/barbell_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/DjsLHZ4jxTU' },
            'terra': { imageUrl: 'assets/exercises/barbell_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/DjsLHZ4jxTU' },
            
            // Glúteos
            'elevacao_pelvica': { imageUrl: 'assets/exercises/hip_thrust.png', videoUrl: 'https://www.youtube.com/shorts/AM8sOtlgKjo' },
            'hip_thrust': { imageUrl: 'assets/exercises/hip_thrust.png', videoUrl: 'https://www.youtube.com/shorts/AM8sOtlgKjo' },
            'hip_thrust_com_halteres': { imageUrl: 'assets/exercises/hip_thrust.png', videoUrl: 'https://www.youtube.com/shorts/F2_8L2J4C0c' },
            'ponte_de_gluteos': { imageUrl: 'assets/exercises/hip_thrust.png', videoUrl: 'https://www.youtube.com/shorts/G2_8L2J4C0c' },
            'coice_no_cabo': { imageUrl: 'assets/exercises/glute_kickback.png', videoUrl: 'https://www.youtube.com/shorts/bJ8KLIqvlfw' },
            'extensao_de_quadril_no_cabo': { imageUrl: 'assets/exercises/glute_kickback.png', videoUrl: 'https://www.youtube.com/shorts/bJ8KLIqvlfw' },
            'abducao_na_maquina': { imageUrl: 'assets/exercises/hip_abductor.png', videoUrl: 'https://www.youtube.com/shorts/nabhYLtz8Gg' },
            'cadeira_abdutora': { imageUrl: 'assets/exercises/hip_abductor.png', videoUrl: 'https://www.youtube.com/shorts/nabhYLtz8Gg' },
            'cadeira_abdultora': { imageUrl: 'assets/exercises/hip_abductor.png', videoUrl: 'https://www.youtube.com/shorts/nabhYLtz8Gg' },
            'abertura_de_quadril_com_haltere': { imageUrl: 'assets/exercises/hip_abductor.png', videoUrl: 'https://www.youtube.com/shorts/A2_7L2N4C2c' },
            'abertura_de_quadril': { imageUrl: 'assets/exercises/hip_abductor.png', videoUrl: 'https://www.youtube.com/shorts/A2_7L2N4C2c' },
            'agachamento_sumo': { imageUrl: 'assets/exercises/sumo_squat.png', videoUrl: 'https://www.youtube.com/shorts/-4mbprALquk' },
            'agachamento_sumo_com_halter': { imageUrl: 'assets/exercises/sumo_squat.png', videoUrl: 'https://www.youtube.com/shorts/-4mbprALquk' },
            'pelvica_na_maquina': { imageUrl: 'assets/exercises/hip_thrust_machine.png', videoUrl: 'https://www.youtube.com/shorts/DzGn0Igti5g' },
            'hip_thrust_na_maquina': { imageUrl: 'assets/exercises/hip_thrust_machine.png', videoUrl: 'https://www.youtube.com/shorts/DzGn0Igti5g' },
            'elevacao_pelvica_na_maquina': { imageUrl: 'assets/exercises/hip_thrust_machine.png', videoUrl: 'https://www.youtube.com/shorts/DzGn0Igti5g' },
            'elevacao_de_pelve': { imageUrl: 'assets/exercises/hip_thrust.png', videoUrl: 'https://www.youtube.com/shorts/AM8sOtlgKjo' },
            
            // Ombros
            'arnold_press': { imageUrl: 'assets/exercises/arnold_press.png', videoUrl: 'https://www.youtube.com/shorts/5I7ogOjvdnc' },
            'crucifixo_invertido': { imageUrl: 'assets/exercises/dumbbell_shoulder_press.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'desenvolvimento_com_barra': { imageUrl: 'assets/exercises/dumbbell_shoulder_press.png', videoUrl: 'https://www.youtube.com/shorts/5I7ogOjvdnc' },
            'desenvolvimento_com_halteres': { imageUrl: 'assets/exercises/dumbbell_shoulder_press.png', videoUrl: 'https://www.youtube.com/shorts/5I7ogOjvdnc' },
            'desenvolvimento': { imageUrl: 'assets/exercises/dumbbell_shoulder_press.png', videoUrl: 'https://www.youtube.com/shorts/5I7ogOjvdnc' },
            'elevacao_frontal': { imageUrl: 'assets/exercises/dumbbell_front_raise.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'elevacao_frontal_polia': { imageUrl: 'assets/exercises/dumbbell_front_raise.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'encolhimento_de_ombros': { imageUrl: 'assets/exercises/dumbbell_shrug.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'encolhimento': { imageUrl: 'assets/exercises/dumbbell_shrug.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'elevacao_lateral': { imageUrl: 'assets/exercises/lateral_raise.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'elevacao_lateral_no_cabo': { imageUrl: 'assets/exercises/cable_lateral_raise.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'face_pull': { imageUrl: 'assets/exercises/face_pull.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            
            // Panturrilha
            'panturrilha_no_leg_press': { imageUrl: 'assets/exercises/leg_press_45.png', videoUrl: 'https://www.youtube.com/shorts/yuIdTWl3oJ8' },
            'panturrilha_sentado': { imageUrl: 'assets/exercises/seated_calf_raise.png', videoUrl: 'https://www.youtube.com/shorts/T46yKiz8laY' },
            'panturrilha_em_pe': { imageUrl: 'assets/exercises/standing_calf_raise.png', videoUrl: 'https://www.youtube.com/shorts/T46yKiz8laY' },
            'panturrilha_em_pe_na_maquina': { imageUrl: 'assets/exercises/standing_calf_raise.png', videoUrl: 'https://www.youtube.com/shorts/T46yKiz8laY' },
            
            // Peito
            'cross_over': { imageUrl: 'assets/exercises/cable_crossover.png', videoUrl: 'https://www.youtube.com/shorts/YyFaD_mt8kQ' },
            'crossover': { imageUrl: 'assets/exercises/cable_crossover.png', videoUrl: 'https://www.youtube.com/shorts/YyFaD_mt8kQ' },
            'cross_over_alto': { imageUrl: 'assets/exercises/cable_crossover.png', videoUrl: 'https://www.youtube.com/shorts/YyFaD_mt8kQ' },
            'cross_over_baixo': { imageUrl: 'assets/exercises/cable_crossover.png', videoUrl: 'https://www.youtube.com/shorts/YyFaD_mt8kQ' },
            'crucifixo_inclinado': { imageUrl: 'assets/exercises/incline_dumbbell_press.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            'crucifixo_reto': { imageUrl: 'assets/exercises/incline_dumbbell_press.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            'flexao_de_bracos': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'flexao_diamante': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'supino_com_halteres': { imageUrl: 'assets/exercises/incline_dumbbell_press.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            'supino_declinado_com_barra': { imageUrl: 'assets/exercises/barbell_bench_press.png', videoUrl: 'https://www.youtube.com/shorts/YiP-Zhk5YMk' },
            'supino_reto_com_barra': { imageUrl: 'assets/exercises/barbell_bench_press.png', videoUrl: 'https://www.youtube.com/shorts/YiP-Zhk5YMk' },
            'supino_reto': { imageUrl: 'assets/exercises/barbell_bench_press.png', videoUrl: 'https://www.youtube.com/shorts/YiP-Zhk5YMk' },
            'supino_inclinado_com_halteres': { imageUrl: 'assets/exercises/incline_dumbbell_press.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            'peck_deck_voador': { imageUrl: 'assets/exercises/peck_deck.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            'crucifixo_maquina': { imageUrl: 'assets/exercises/peck_deck.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            'supino_reto_com_halteres': { imageUrl: 'assets/exercises/incline_dumbbell_press.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            
            // Posterior / Quadríceps
            'stiff_unilateral': { imageUrl: 'assets/exercises/stiff_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/KtP2EMfyiuw' },
            'stiff_com_barra': { imageUrl: 'assets/exercises/stiff_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/KtP2EMfyiuw' },
            'stiff': { imageUrl: 'assets/exercises/stiff_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/KtP2EMfyiuw' },
            'agachamento_livre_com_barra': { imageUrl: 'assets/exercises/barbell_squat.png', videoUrl: 'https://www.youtube.com/shorts/Fpens-iRVmI' },
            'agachamento_livre': { imageUrl: 'assets/exercises/barbell_squat.png', videoUrl: 'https://www.youtube.com/shorts/Fpens-iRVmI' },
            'cadeira_extensora': { imageUrl: 'assets/exercises/leg_extension.png', videoUrl: 'https://www.youtube.com/shorts/PzIfB9MiiX8' },
            'extensora': { imageUrl: 'assets/exercises/leg_extension.png', videoUrl: 'https://www.youtube.com/shorts/PzIfB9MiiX8' },
            'leg_press_45': { imageUrl: 'assets/exercises/leg_press_45.png', videoUrl: 'https://www.youtube.com/shorts/yuIdTWl3oJ8' },
            'leg_press': { imageUrl: 'assets/exercises/leg_press_45.png', videoUrl: 'https://www.youtube.com/shorts/yuIdTWl3oJ8' },
            'agachamento_bulgaro': { imageUrl: 'assets/exercises/bulgarian_split_squat.png', videoUrl: 'https://www.youtube.com/shorts/blmW6LTufL4' },
            'afundo_com_barra': { imageUrl: 'assets/exercises/barbell_lunge.png', videoUrl: 'https://www.youtube.com/shorts/rltJymhFtHg' },
            'afundo': { imageUrl: 'assets/exercises/barbell_lunge.png', videoUrl: 'https://www.youtube.com/shorts/rltJymhFtHg' },
            'passada_avanco': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'passada': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'agachamento_frontal': { imageUrl: 'assets/exercises/front_squat.png', videoUrl: 'https://www.youtube.com/shorts/wPwUGaHapkw' },
            'hack_squat': { imageUrl: 'assets/exercises/hack_squat.png', videoUrl: 'https://www.youtube.com/shorts/USv0A4xLQKs' },
            'goblet_squat': { imageUrl: 'assets/exercises/goblet_squat.png', videoUrl: 'https://www.youtube.com/shorts/XBsOmtbLlYQ' },
            'cadeira_flexora': { imageUrl: 'assets/exercises/seated_leg_curl.png', videoUrl: 'https://www.youtube.com/shorts/T46yKiz8laY' },
            'mesa_flexora': { imageUrl: 'assets/exercises/lying_leg_curl.png', videoUrl: 'https://www.youtube.com/shorts/IXg1PQ_5gmw' },
            'good_morning': { imageUrl: 'assets/exercises/good_morning.png', videoUrl: 'https://www.youtube.com/shorts/4YMQB-STHkg' },
            'bom_dia': { imageUrl: 'assets/exercises/good_morning.png', videoUrl: 'https://www.youtube.com/shorts/4YMQB-STHkg' },
            'passada_avanco_com_halteres': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            
            // Tríceps
            'extensao_de_triceps_no_cabo': { imageUrl: 'assets/exercises/tricep_pushdown.png', videoUrl: 'https://www.youtube.com/shorts/_dXIovzZ5sk' },
            'mergulho_nas_paralelas': { imageUrl: 'assets/exercises/tricep_dips.png', videoUrl: 'https://www.youtube.com/shorts/p_DeBmkbCUc' },
            'mergulho_nas_barras_paralelas': { imageUrl: 'assets/exercises/tricep_dips.png', videoUrl: 'https://www.youtube.com/shorts/p_DeBmkbCUc' },
            'triceps_coice': { imageUrl: 'assets/exercises/tricep_kickback.png', videoUrl: 'https://www.youtube.com/shorts/Cd0-tP9utgM' },
            'triceps_corda': { imageUrl: 'assets/exercises/tricep_pushdown.png', videoUrl: 'https://www.youtube.com/shorts/_dXIovzZ5sk' },
            'triceps_pulley': { imageUrl: 'assets/exercises/tricep_pushdown.png', videoUrl: 'https://www.youtube.com/shorts/_dXIovzZ5sk' },
            'triceps_testa': { imageUrl: 'assets/exercises/tricep_overhead.png', videoUrl: 'https://www.youtube.com/shorts/Cd0-tP9utgM' },
            'triceps_frances': { imageUrl: 'assets/exercises/tricep_overhead.png', videoUrl: 'https://www.youtube.com/shorts/Cd0-tP9utgM' },
            'mergulho': { imageUrl: 'assets/exercises/tricep_dips.png', videoUrl: 'https://www.youtube.com/shorts/p_DeBmkbCUc' },
            'supino_fechado': { imageUrl: 'assets/exercises/close_grip_bench_press.png', videoUrl: 'https://www.youtube.com/shorts/p_DeBmkbCUc' },
            
            // Mobilidade / Alongamento
            'rotacao_toracica': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/4YMQB-STHkg' },
            'alongamento_de_quadril': { imageUrl: 'assets/exercises/side_plank.png', videoUrl: 'https://www.youtube.com/shorts/4YMQB-STHkg' },
            'hip_90_90': { imageUrl: 'assets/exercises/side_plank.png', videoUrl: 'https://www.youtube.com/shorts/4YMQB-STHkg' },
            'abertura_de_quadril_com_haltere': { imageUrl: 'assets/exercises/hip_abductor.png', videoUrl: 'https://www.youtube.com/shorts/A2_7L2N4C2c' },
            
            // Cardio
            'esteira_corrida': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'esteira_caminhada': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'esteira_intervalado_hiit': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'corrida_ao_ar_livre': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'caminhada_ao_ar_livre': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'fartlek': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'corrida_de_limiar_tempo_run': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'corrida_longa_lsd': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'corrida_em_pista_intervalado': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'ciclismo_ao_ar_livre': { imageUrl: 'assets/exercises/leg_press_45.png', videoUrl: 'https://www.youtube.com/shorts/yuIdTWl3oJ8' },
            'bicicleta_ergometrica': { imageUrl: 'assets/exercises/leg_press_45.png', videoUrl: 'https://www.youtube.com/shorts/yuIdTWl3oJ8' },
            'bicicleta_ergometrica_hiit': { imageUrl: 'assets/exercises/leg_press_45.png', videoUrl: 'https://www.youtube.com/shorts/yuIdTWl3oJ8' },
            'spinning': { imageUrl: 'assets/exercises/leg_press_45.png', videoUrl: 'https://www.youtube.com/shorts/yuIdTWl3oJ8' },
            'assault_bike': { imageUrl: 'assets/exercises/leg_press_45.png', videoUrl: 'https://www.youtube.com/shorts/yuIdTWl3oJ8' },
            'eliptico': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'remo_ergometrico': { imageUrl: 'assets/exercises/seated_cable_row.png', videoUrl: 'https://www.youtube.com/shorts/T3_9O4o0y8Y' },
            'remo_ergometrico_sprint': { imageUrl: 'assets/exercises/seated_cable_row.png', videoUrl: 'https://www.youtube.com/shorts/T3_9O4o0y8Y' },
            'pular_corda': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'pular_corda_dupla_entrada': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'jumping_jack': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'burpee': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'escalador_de_montanha': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'kettlebell_swing': { imageUrl: 'assets/exercises/goblet_squat.png', videoUrl: 'https://www.youtube.com/shorts/XBsOmtbLlYQ' },
            'box_jump': { imageUrl: 'assets/exercises/goblet_squat.png', videoUrl: 'https://www.youtube.com/shorts/XBsOmtbLlYQ' },
            'salto_na_caixa_box_jump': { imageUrl: 'assets/exercises/goblet_squat.png', videoUrl: 'https://www.youtube.com/shorts/XBsOmtbLlYQ' },
            'agachamento_com_salto': { imageUrl: 'assets/exercises/goblet_squat.png', videoUrl: 'https://www.youtube.com/shorts/XBsOmtbLlYQ' },
            'battle_rope_ondas_alternadas': { imageUrl: 'assets/exercises/cable_crossover.png', videoUrl: 'https://www.youtube.com/shorts/YyFaD_mt8kQ' },
            'ski_erg': { imageUrl: 'assets/exercises/seated_cable_row.png', videoUrl: 'https://www.youtube.com/shorts/T3_9O4o0y8Y' },
            'air_runner': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'natacao_nado_livre': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'natacao_intervalado': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'hiit_tabata': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'hiit_30_30': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'hiit_piramide': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'aquecimento_cardio': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'treino_continuo_cardio': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'desaquecimento_cardio': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'tiro_sprint_cardio': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'recuperacao_ativa_cardio': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'step_aerobico': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            
            // LPO / Potência / Funcionais
            'arranco_snatch': { imageUrl: 'assets/exercises/barbell_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/DjsLHZ4jxTU' },
            'arremesso_clean_jerk': { imageUrl: 'assets/exercises/barbell_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/DjsLHZ4jxTU' },
            'arremesso_de_medicine_ball': { imageUrl: 'assets/exercises/goblet_squat.png', videoUrl: 'https://www.youtube.com/shorts/XBsOmtbLlYQ' },
            'slam_ball': { imageUrl: 'assets/exercises/goblet_squat.png', videoUrl: 'https://www.youtube.com/shorts/XBsOmtbLlYQ' },
            'flexao_de_braco_com_salto': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'turkish_get_up': { imageUrl: 'assets/exercises/dumbbell_hammer_curl.png', videoUrl: 'https://www.youtube.com/shorts/c2D17Ld2424' },
            'farmer_walk': { imageUrl: 'assets/exercises/dumbbell_row.png', videoUrl: 'https://www.youtube.com/shorts/OhQTM6Mkq-E' },
            
            // Novos Mapeamentos (Variações)
            'supino_inclinado_com_barra': { imageUrl: 'assets/exercises/barbell_bench_press.png', videoUrl: 'https://www.youtube.com/shorts/YiP-Zhk5YMk' },
            'supino_declinado_com_halteres': { imageUrl: 'assets/exercises/incline_dumbbell_press.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            'flexao_de_bracos_inclinada': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'flexao_de_bracos_declinada': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/H9cXPIL8nds' },
            'crucifixo_de_pe_no_cabo': { imageUrl: 'assets/exercises/cable_crossover.png', videoUrl: 'https://www.youtube.com/shorts/YyFaD_mt8kQ' },
            'puxada_frontal_com_triangulo': { imageUrl: 'assets/exercises/lat_pulldown.png', videoUrl: 'https://www.youtube.com/shorts/_2MfZAj98tk' },
            'puxada_frontal_pegada_inversa': { imageUrl: 'assets/exercises/lat_pulldown.png', videoUrl: 'https://www.youtube.com/shorts/_2MfZAj98tk' },
            'remada_curvada_com_halteres': { imageUrl: 'assets/exercises/dumbbell_row.png', videoUrl: 'https://www.youtube.com/shorts/OhQTM6Mkq-E' },
            'remada_supinada_com_barra': { imageUrl: 'assets/exercises/barbell_row.png', videoUrl: 'https://www.youtube.com/shorts/E2_1f3w0fCc' },
            'crucifixo_invertido_na_maquina': { imageUrl: 'assets/exercises/peck_deck.png', videoUrl: 'https://www.youtube.com/shorts/wkUemXl4vFI' },
            'meio_terra_rack_pull': { imageUrl: 'assets/exercises/barbell_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/DjsLHZ4jxTU' },
            'elevacao_lateral_sentado': { imageUrl: 'assets/exercises/lateral_raise.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'elevacao_frontal_com_barra': { imageUrl: 'assets/exercises/dumbbell_front_raise.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'elevacao_frontal_com_anilha': { imageUrl: 'assets/exercises/dumbbell_front_raise.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'crucifixo_invertido_no_cabo': { imageUrl: 'assets/exercises/cable_lateral_raise.png', videoUrl: 'https://www.youtube.com/shorts/Cwcs5h5Sgh0' },
            'rosca_scott_com_halteres': { imageUrl: 'assets/exercises/preacher_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/90_d-DsrOkE' },
            'rosca_direta_com_barra_w': { imageUrl: 'assets/exercises/barbell_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/R2_8Bv9Zkco' },
            'rosca_inclinada_com_halteres': { imageUrl: 'assets/exercises/alternating_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/q2Z0hLhWwR8' },
            'rosca_spider': { imageUrl: 'assets/exercises/alternating_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/q2Z0hLhWwR8' },
            'rosca_martelo_no_cabo': { imageUrl: 'assets/exercises/cable_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/3iV7L_kE2s0' },
            'rosca_inversa_com_barra': { imageUrl: 'assets/exercises/barbell_bicep_curl.png', videoUrl: 'https://www.youtube.com/shorts/R2_8Bv9Zkco' },
            'triceps_testa_com_barra_w': { imageUrl: 'assets/exercises/tricep_overhead.png', videoUrl: 'https://www.youtube.com/shorts/Cd0-tP9utgM' },
            'triceps_testa_com_halteres': { imageUrl: 'assets/exercises/tricep_overhead.png', videoUrl: 'https://www.youtube.com/shorts/Cd0-tP9utgM' },
            'triceps_frances_unilateral': { imageUrl: 'assets/exercises/tricep_overhead.png', videoUrl: 'https://www.youtube.com/shorts/Cd0-tP9utgM' },
            'triceps_frances_no_cabo': { imageUrl: 'assets/exercises/tricep_overhead.png', videoUrl: 'https://www.youtube.com/shorts/Cd0-tP9utgM' },
            'triceps_coice_no_cabo': { imageUrl: 'assets/exercises/tricep_kickback.png', videoUrl: 'https://www.youtube.com/shorts/Cd0-tP9utgM' },
            'agachamento_livre_com_halteres': { imageUrl: 'assets/exercises/goblet_squat.png', videoUrl: 'https://www.youtube.com/shorts/XBsOmtbLlYQ' },
            'agachamento_no_smith': { imageUrl: 'assets/exercises/hack_squat.png', videoUrl: 'https://www.youtube.com/shorts/USv0A4xLQKs' },
            'agachamento_hack': { imageUrl: 'assets/exercises/hack_squat.png', videoUrl: 'https://www.youtube.com/shorts/USv0A4xLQKs' },
            'passada_lateral': { imageUrl: 'assets/exercises/walking_lunge.png', videoUrl: 'https://www.youtube.com/shorts/nFWardGq1Uo' },
            'stiff_com_halteres': { imageUrl: 'assets/exercises/stiff_deadlift.png', videoUrl: 'https://www.youtube.com/shorts/KtP2EMfyiuw' },
            'mesa_flexora_unilateral': { imageUrl: 'assets/exercises/lying_leg_curl.png', videoUrl: 'https://www.youtube.com/shorts/IXg1PQ_5gmw' },
            'cadeira_flexora_unilateral': { imageUrl: 'assets/exercises/seated_leg_curl.png', videoUrl: 'https://www.youtube.com/shorts/T46yKiz8laY' },
            'coice_de_gluteo_no_solo': { imageUrl: 'assets/exercises/side_plank.png', videoUrl: 'https://www.youtube.com/shorts/bJ8KLIqvlfw' },
            'panturrilha_sentado_na_maquina': { imageUrl: 'assets/exercises/seated_calf_raise.png', videoUrl: 'https://www.youtube.com/shorts/T46yKiz8laY' },
            'panturrilha_em_pe_com_halteres': { imageUrl: 'assets/exercises/standing_calf_raise.png', videoUrl: 'https://www.youtube.com/shorts/T46yKiz8laY' },
            'panturrilha_unilateral_em_pe': { imageUrl: 'assets/exercises/standing_calf_raise.png', videoUrl: 'https://www.youtube.com/shorts/T46yKiz8laY' },
            'abdominal_obliquo_no_solo': { imageUrl: 'assets/exercises/abdominal_infra.png', videoUrl: 'https://www.youtube.com/shorts/52431jS1yS4' },
            'abdominal_infra_na_barra': { imageUrl: 'assets/exercises/abdominal_infra.png', videoUrl: 'https://www.youtube.com/shorts/52431jS1yS4' },
            'abdominal_canivete_v_up': { imageUrl: 'assets/exercises/abdominal_infra.png', videoUrl: 'https://www.youtube.com/shorts/52431jS1yS4' },
            'abdominal_remador': { imageUrl: 'assets/exercises/abdominal_infra.png', videoUrl: 'https://www.youtube.com/shorts/52431jS1yS4' },
            'alongamento_de_gluteo_pigeon': { imageUrl: 'assets/exercises/side_plank.png', videoUrl: 'https://www.youtube.com/shorts/4YMQB-STHkg' },
            'alongamento_gato_camelo': { imageUrl: 'assets/exercises/plank.png', videoUrl: 'https://www.youtube.com/shorts/4YMQB-STHkg' }
          };
          
          let matched = mediaMap[slugKey];
          if (!matched) {
            // Seletor de busca flexível por substring
            const foundKey = Object.keys(mediaMap).find(key => 
              slugKey.includes(key) || key.includes(slugKey)
            );
            if (foundKey) {
              matched = mediaMap[foundKey];
            }
          }
          
          if (matched) {
            imageUrl = matched.imageUrl;
            videoUrl = matched.videoUrl;
          }

          if (imageUrl !== ex.imageUrl || videoUrl !== ex.videoUrl) {
            if (imageUrl) ex.imageUrl = imageUrl;
            if (videoUrl) ex.videoUrl = videoUrl;
            delete ex._synced;
            await this.put('exercises', ex);
            updatedAny = true;
          }
        }
      }
      if (updatedAny) {
        console.log('Exercícios atualizados localmente com imagens e vídeos.');
      }
    } catch (err) {
      console.warn('Erro na migração de imagens de exercícios:', err);
    }

    const exercises = [
        // PEITO
        { name: 'Supino Reto com Barra',         muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Exercício base para desenvolvimento do peitoral maior.' },
        { name: 'Supino Inclinado com Halteres',  muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Foco na porção clavicular do peitoral.' },
        { name: 'Supino Declinado com Barra',     muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Ênfase na porção inferior do peitoral.' },
        { name: 'Crucifixo Reto',                 muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento do peitoral com amplitude máxima.' },
        { name: 'Crucifixo Inclinado',            muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento da porção superior do peitoral.' },
        { name: 'Peck Deck (Voador)',             muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento do peitoral na máquina.' },
        { name: 'Cross Over Alto',                muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Ênfase na porção inferior do peitoral.' },
        { name: 'Cross Over Baixo',               muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Ênfase na porção superior do peitoral.' },
        { name: 'Flexão de Braços',               muscleGroup: 'Peito',        category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Exercício funcional básico para peitoral.' },
        { name: 'Flexão Diamante',                muscleGroup: 'Peito',        category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Variação com ênfase no tríceps.' },
        { name: 'Supino com Halteres',            muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Maior amplitude de movimento que a barra.' },
        { name: 'Crucifixo Máquina',               muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Crucifixo isolado na máquina (Peck Deck).' },
        { name: 'Supino Reto com Halteres',         muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Supino reto usando halteres.' },
        
        // COSTAS
        { name: 'Puxada Frontal',                 muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Desenvolvimento dos dorsais.' },
        { name: 'Puxada Fechada',                 muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Ênfase na espessura das costas.' },
        { name: 'Remada Curvada com Barra',       muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Exercício composto para espessura das costas.' },
        { name: 'Remada Unilateral com Halter',   muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Trabalho unilateral para corrigir assimetrias.' },
        { name: 'Remada Baixa (Sentado)',          muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Foco na porção média das costas e romboides.' },
        { name: 'Remada Cavalinho',               muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Remada em máquina para espessura das costas.' },
        { name: 'Barra Fixa (Pull-up)',           muscleGroup: 'Costas',       category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Exercício avançado de peso corporal.' },
        { name: 'Levantamento Terra',             muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Exercício composto para toda a cadeia posterior.' },
        { name: 'Levantamento Terra Romeno',      muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Ênfase nos isquiotibiais e glúteos.' },
        { name: 'Pullover com Halter',            muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Trabalha serrátil e dorsal.' },
        { name: 'Barra Fixa',                      muscleGroup: 'Costas',       category: 'Calistenia', equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Barra fixa tradicional de calistenia.' },
        { name: 'Remada Baixa',                    muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Remada baixa com puxador na polia.' },
        
        // OMBROS
        { name: 'Desenvolvimento com Halteres',   muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Exercício base para deltoides.' },
        { name: 'Desenvolvimento com Barra',      muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Maior sobrecarga no desenvolvimento.' },
        { name: 'Elevação Lateral',               muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento do deltoide lateral.' },
        { name: 'Elevação Frontal',               muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Foco no deltoide anterior.' },
        { name: 'Elevação Lateral no Cabo',       muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Tensão constante no deltoide lateral.' },
        { name: 'Face Pull',                      muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Saúde do ombro e deltoide posterior.' },
        { name: 'Arnold Press',                   muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Variação do desenvolvimento com rotação.' },
        { name: 'Encolhimento de Ombros',         muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento do trapézio.' },
        
        // BÍCEPS
        { name: 'Rosca Direta com Barra',         muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Exercício base para bíceps.' },
        { name: 'Rosca Alternada com Halteres',   muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Permite foco unilateral e maior amplitude.' },
        { name: 'Rosca Martelo',                  muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Pegada neutra que enfatiza o braquiorradial.' },
        { name: 'Rosca Scott',                    muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Isolamento do bíceps no banco Scott.' },
        { name: 'Rosca Concentrada',              muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Máximo isolamento do bíceps.' },
        { name: 'Rosca no Cabo',                  muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Tensão constante no bíceps.' },
        { name: 'Rosca 21',                       muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Técnica avançada: 7 parciais baixo + 7 alto + 7 completas.' },
        
        // TRÍCEPS
        { name: 'Tríceps Pulley',                 muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Exercício padrão para tríceps.' },
        { name: 'Tríceps Testa',                  muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Foco na cabeça longa do tríceps.' },
        { name: 'Tríceps Francês',                muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Exercício overhead para cabeça longa.' },
        { name: 'Tríceps Corda',                  muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Variação com corda para maior ativação.' },
        { name: 'Mergulho (Dip)',                 muscleGroup: 'Tríceps',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Exercício composto para tríceps e peito inferior.' },
        { name: 'Extensão de Tríceps no Cabo',    muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Extensão unilateral no cabo.' },
        { name: 'Tríceps Coice',                  muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento da cabeça lateral do tríceps.' },
        { name: 'Supino Fechado',                  muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Supino com pegada fechada para foco no tríceps.' },
        
        // QUADRÍCEPS
        { name: 'Agachamento Livre com Barra',    muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Rei dos exercícios de perna.' },
        { name: 'Agachamento Frontal',            muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Maior ativação do quadríceps.' },
        { name: 'Leg Press 45°',                  muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Alta carga com menor demanda de estabilização.' },
        { name: 'Cadeira Extensora',              muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento do quadríceps.' },
        { name: 'Agachamento Búlgaro',            muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Exercício unilateral avançado.' },
        { name: 'Passada (Avanço)',               muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Trabalha quadríceps e glúteos.' },
        { name: 'Afundo com Barra',               muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Variação do afundo com maior carga.' },
        { name: 'Hack Squat',                     muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Agachamento guiado com ênfase no quadríceps.' },
        { name: 'Agachamento Sumô',               muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Enfatiza glúteos e adutores.' },
        { name: 'Passada/Avanço com Halteres',      muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Passada dinâmica caminhando com halteres.' },
        
        // POSTERIOR
        { name: 'Mesa Flexora',                   muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento dos isquiotibiais deitado.' },
        { name: 'Cadeira Flexora',                muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento dos isquiotibiais sentado.' },
        { name: 'Stiff com Barra',                muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Alongamento active dos isquiotibiais.' },
        { name: 'Stiff Unilateral',               muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Versão unilateral para equilíbrio.' },
        { name: 'Good Morning',                   muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Fortalece eretores e isquiotibiais.' },
        
        // GLÚTEOS
        { name: 'Hip Thrust',                     muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Melhor exercício para glúteos.' },
        { name: 'Hip Thrust com Halteres',        muscleGroup: 'Glúteos',      category: 'Glúteos',      equipment: 'Halteres',      loadType: 'weight',     description: 'Versão com halteres para variação.' },
        { name: 'Abdução na Máquina',             muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento do glúteo médio.' },
        { name: 'Coice no Cabo',                  muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Isolamento do glúteo máximo.' },
        { name: 'Ponte de Glúteos',               muscleGroup: 'Glúteos',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Versão sem carga do hip thrust.' },
        { name: 'Agachamento Sumô com Halter',    muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Enfatiza glúteos e adutores.' },
        { name: 'Elevação de Pelve',                muscleGroup: 'Glúteos',      category: 'Calistenia', equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Elevação pélvica básica sem carga para calistenia.' },
        
        // PANTURRILHA
        { name: 'Panturrilha em Pé',              muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Foco no gastrocnêmio.' },
        { name: 'Panturrilha Sentado',            muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Foco no sóleo.' },
        { name: 'Panturrilha no Leg Press',       muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Variação com maior amplitude.' },
        { name: 'Panturrilha em Pé na Máquina',     muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Exercício para panturrilhas na máquina em pé.' },
        
        // CORE / ABDÔMEN
        { name: 'Abdominal Crunch',               muscleGroup: 'Abdômen',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Flexão do tronco para reto abdominal.' },
        { name: 'Abdominal Infra',                muscleGroup: 'Abdômen',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Elevação de pernas para abdômen inferior.' },
        { name: 'Crunch no Cabo',                 muscleGroup: 'Abdômen',      category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Abdominal com sobrecarga.' },
        { name: 'Prancha Frontal',                muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'time',       defaultReps: '30s', description: 'Exercício isométrico para estabilização do core.' },
        { name: 'Prancha Lateral',                muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'time',       defaultReps: '20s', description: 'Estabilização lateral do core e oblíquos.' },
        { name: 'Prancha com Toque no Ombro',     muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Antirrotação e estabilidade do core.' },
        { name: 'Russian Twist',                  muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Rotação do tronco para oblíquos.' },
        { name: 'Dead Bug',                       muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Exercício isométrico para estabilização lombar.' },
        { name: 'Bird Dog',                       muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Coordenação e estabilidade lombo-pélvica.' },
        { name: 'Rollout com Roda',               muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Roda abdominal',loadType: 'bodyweight', description: 'Anti-extensão avançada para core.' },
        { name: 'Rotação com Cabo',               muscleGroup: 'Core',         category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Rotação de tronco com resistência.' },
        { name: 'Prancha',                         muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Prancha frontal estática para estabilização do core.' },
        
        // CARDIO / ENDURANCE
        { name: 'Esteira - Corrida',               muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Esteira',        loadType: 'time',       defaultReps: '20min', intensityField: 'speed_kmh',  description: 'Corrida aeróbica. Registre velocidade (km/h).' },
        { name: 'Esteira - Caminhada',             muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Esteira',        loadType: 'time',       defaultReps: '30min', intensityField: 'speed_kmh',  description: 'Caminhada aeróbica de baixa intensidade.' },
        { name: 'Esteira - Intervalado (HIIT)',    muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Esteira',        loadType: 'time',       defaultReps: '30s',   intensityField: 'speed_kmh',  description: 'Sprint + recuperação. Ex: 30s rápido / 90s lento.' },
        { name: 'Corrida ao Ar Livre',             muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '30min', intensityField: 'pace_min_km',description: 'Corrida externa. Registre pace (min/km).' },
        { name: 'Caminhada ao Ar Livre',           muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '40min', intensityField: 'pace_min_km',description: 'Caminhada externa de baixa intensidade.' },
        { name: 'Bicicleta Ergométrica',           muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Bicicleta',      loadType: 'time',       defaultReps: '20min', intensityField: 'watts',      description: 'Pedalada indoor. Registre potência (watts) ou RPM.' },
        { name: 'Bicicleta Ergométrica - HIIT',   muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Bicicleta',      loadType: 'time',       defaultReps: '20s',   intensityField: 'watts',      description: 'Sprint de 20s + recuperação de 40s. 8-12 rounds (Tabata).' },
        { name: 'Ciclismo ao Ar Livre',            muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Bicicleta',      loadType: 'time',       defaultReps: '45min', intensityField: 'speed_kmh',  description: 'Pedalar externo. Registre velocidade e distância.' },
        { name: 'Elíptico',                        muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Elíptico',       loadType: 'time',       defaultReps: '20min', intensityField: 'level',      description: 'Aeróbico de baixo impacto. Registre nível de resistência.' },
        { name: 'Remo Ergométrico',                muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Remo',           loadType: 'time',       defaultReps: '15min', intensityField: 'pace_500m',  description: 'Remo indoor. Registre pace/500m e dividir por splits.' },
        { name: 'Remo Ergométrico - Sprint',       muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Remo',           loadType: 'time',       defaultReps: '250m',  intensityField: 'pace_500m',  description: 'Sprints de 250m com recuperação ativa.' },
        { name: 'Natação - Nado Livre',            muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Piscina',        loadType: 'time',       defaultReps: '30min', intensityField: 'pace_100m',  description: 'Nado contínuo. Registre pace/100m.' },
        { name: 'Natação - Intervalado',           muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Piscina',        loadType: 'time',       defaultReps: '50m',   intensityField: 'pace_100m',  description: 'Series de 50m com descanso controlado.' },
        { name: 'Pular Corda',                     muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Corda',          loadType: 'time',       defaultReps: '2min',  intensityField: 'jumps_min',  description: 'Aeróbico de alta intensidade. Ótimo para coordenação.' },
        { name: 'Pular Corda - Dupla Entrada',    muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Corda',          loadType: 'time',       defaultReps: '30s',   intensityField: 'jumps_min',  description: 'Técnica avançada. Alta demanda cardiovascular.' },
        { name: 'HIIT Tabata',                     muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Variado',        loadType: 'time',       defaultReps: '20s',   intensityField: 'level',      description: '20s max / 10s repouso × 8 rounds = 4min. Alta intensidade.' },
        { name: 'HIIT 30-30',                      muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Variado',        loadType: 'time',       defaultReps: '30s',   intensityField: 'level',      description: '30s esforço máximo / 30s recuperação ativa. 8-12 rounds.' },
        { name: 'HIIT Pirâmide',                   muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Variado',        loadType: 'time',       defaultReps: '30s',   intensityField: 'level',      description: '30s→60s→90s→60s→30s de esforço, com igual recuperação.' },
        { name: 'Fartlek',                         muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '30min', intensityField: 'speed_kmh',  description: 'Corrida com variações espontâneas de ritmo e intensidade.' },
        { name: 'Corrida de Limiar (Tempo Run)',   muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '20min', intensityField: 'pace_min_km',description: 'Corrida no limiar anaeróbio. ~80-85% FC Máx.' },
        { name: 'Corrida Longa (LSD)',             muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '60min', intensityField: 'pace_min_km',description: 'Long Slow Distance. 60-75% FC Máx. Base aeróbica.' },
        { name: 'Corrida em Pista - Intervalado', muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Pista',          loadType: 'time',       defaultReps: '400m',  intensityField: 'pace_min_km',description: 'Series de 400m, 800m ou 1km com recuperação ativa.' },
        { name: 'Step Aeróbico',                   muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Step',           loadType: 'time',       defaultReps: '30min', intensityField: 'level',      description: 'Aeróbico com step. Baixo impacto, boa coordenação.' },
        { name: 'Spinning',                        muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Bicicleta',      loadType: 'time',       defaultReps: '45min', intensityField: 'watts',      description: 'Ciclismo indoor em grupo. Alta intensidade.' },
        { name: 'Escalador de Montanha',           muscleGroup: 'Cardio',        category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s',   intensityField: 'reps',       description: 'Mountain climber. Core + cardio.' },
        { name: 'Jumping Jack',                    muscleGroup: 'Cardio',        category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s',   intensityField: 'reps',       description: 'Polichinelo. Aquecimento e cardio leve.' },
        { name: 'Agachamento com Salto',           muscleGroup: 'Cardio',        category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'bodyweight', defaultReps: '15',    intensityField: 'reps',       description: 'Jump squat. Potência + cardio metabólico.' },
        { name: 'Burpee',                          muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'bodyweight', defaultReps: '10',    intensityField: 'reps',       description: 'Exercício metabólico completo. Alta demanda cardiorrespiratória.' },
        { name: 'Kettlebell Swing',                muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Kettlebell',     loadType: 'weight',     defaultReps: '15',    intensityField: 'weight',     description: 'Movimento explosivo de quadril. Cardio + força.' },
        { name: 'Battle Rope - Ondas Alternadas', muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Corda',          loadType: 'time',       defaultReps: '30s',   intensityField: 'reps',       description: 'Cardio de alta intensidade. Ombros e core.' },
        { name: 'Box Jump',                        muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Caixote',        loadType: 'bodyweight', defaultReps: '10',    intensityField: 'height_cm',  description: 'Salto explosivo. Potência de membros inferiores.' },
        { name: 'Assault Bike',                    muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Assault Bike',   loadType: 'time',       defaultReps: '20s',   intensityField: 'calories',   description: 'Bicicleta com braços. Exige todo o corpo. Alta intensidade.' },
        { name: 'Ski Erg',                         muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Ski Erg',        loadType: 'time',       defaultReps: '500m',  intensityField: 'pace_500m',  description: 'Simulador de esqui nórdico. Core + cardio.' },
        { name: 'Air Runner',                      muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Air Runner',     loadType: 'time',       defaultReps: '200m',  intensityField: 'pace_min_km',description: 'Esteira não motorizada. Mais demanda do que a unconventional.' },
        { name: 'Aquecimento (Cardio)',             muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '5 min', intensityField: 'level', description: 'Aquecimento cardiovascular geral.' },
        { name: 'Treino Contínuo (Cardio)',         muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '30 min', intensityField: 'level', description: 'Treino cardiovascular contínuo.' },
        { name: 'Desaquecimento (Cardio)',          muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '5 min', intensityField: 'level', description: 'Desaquecimento cardiovascular geral (cool down).' },
        { name: 'Tiro/Sprint (Cardio)',             muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '30 seg', intensityField: 'level', description: 'Tiro de corrida/esforço de alta intensidade.' },
        { name: 'Recuperação Ativa (Cardio)',       muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '60 seg', intensityField: 'level', description: 'Recuperação activa em intensidade baixa.' },
        
        // POTÊNCIA
        { name: 'Salto na Caixa (Box Jump)',        muscleGroup: 'Corpo Inteiro', category: 'Potência',   equipment: 'Caixote',        loadType: 'bodyweight', defaultReps: '5', intensityField: 'height_cm', description: 'Salto explosivo na caixa para potência.' },
        { name: 'Arremesso de Medicine Ball',       muscleGroup: 'Corpo Inteiro', category: 'Potência',   equipment: 'Medicine Ball',  loadType: 'weight',     defaultReps: '5', description: 'Arremesso explosivo de bola medicinal.' },
        { name: 'Flexão de Braço com Salto',        muscleGroup: 'Peito',        category: 'Potência',   equipment: 'Peso corporal', loadType: 'bodyweight', defaultReps: '5', description: 'Flexão pliométrica com empurrão explosivo.' },
        { name: 'Arranco (Snatch)',                 muscleGroup: 'Corpo Inteiro', category: 'Potência',   equipment: 'Barra',         loadType: 'weight',     defaultReps: '3', description: 'Levantamento olímpico completo em um único movimento.' },
        { name: 'Arremesso (Clean & Jerk)',         muscleGroup: 'Corpo Inteiro', category: 'Potência',   equipment: 'Barra',         loadType: 'weight',     defaultReps: '3', description: 'Levantamento olímpico em dois tempos.' },
        
        // FUNCIONAIS
        { name: 'Kettlebell Goblet Squat',         muscleGroup: 'Quadríceps',    category: 'Funcional',  equipment: 'Kettlebell',     loadType: 'weight',     description: 'Agachamento com kettlebell.' },
        { name: 'Turkish Get-Up',                  muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Kettlebell',     loadType: 'weight',     description: 'Movimento complexo para estabilidade total.' },
        { name: 'Farmer Walk',                     muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Halteres',       loadType: 'weight',     description: 'Caminhada com carga para força funcional.' },
        { name: 'Slam Ball',                       muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Medicine Ball',  loadType: 'weight',     description: 'Potência e força explosiva.' },
        
        // MOBILIDADE
        { name: 'Alongamento de Quadril',          muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s', description: 'Flexibilidade do flexor do quadril.' },
        { name: 'Rotação Torácica',                muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s', description: 'Mobilidade da coluna torácica.' },
        { name: 'Hip 90/90',                       muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '45s', description: 'Mobilidade de quadril em rotação interna/externa.' },
        { name: 'Abertura de Quadril com Haltere', muscleGroup: 'Glúteos',       category: 'Mobilidade', equipment: 'Halteres',       loadType: 'weight',     description: 'Fortalecimento e mobilidade do glúteo médio.' },
        
        // NOVOS EXERCÍCIOS E VARIAÇÕES
        // PEITO
        { name: 'Supino Inclinado com Barra',     muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Supino inclinado com barra para porção clavicular.' },
        { name: 'Supino Declinado com Halteres',  muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Supino declinado com halteres para peitoral inferior.' },
        { name: 'Flexão de Braços Inclinada',     muscleGroup: 'Peito',        category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Flexão com as mãos elevadas, facilitando o exercício.' },
        { name: 'Flexão de Braços Declinada',     muscleGroup: 'Peito',        category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Flexão com os pés elevados, aumentando a intensidade.' },
        { name: 'Crucifixo de Pé no Cabo',        muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Crucifixo na polia média de pé.' },
        
        // COSTAS
        { name: 'Puxada Frontal com Triângulo',   muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Puxada com pegada triângulo fechada.' },
        { name: 'Puxada Frontal Pegada Inversa',  muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Puxada com pegada supinada invertida.' },
        { name: 'Remada Curvada com Halteres',    muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Remada inclinada segurando halteres.' },
        { name: 'Remada Supinada com Barra',      muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Remada curvada supinada pegada inversa.' },
        { name: 'Crucifixo Invertido na Máquina',  muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento de deltoide posterior na máquina.' },
        { name: 'Meio Terra (Rack Pull)',         muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Levantamento terra parcial a partir dos blocos.' },
        
        // OMBROS
        { name: 'Elevação Lateral Sentado',       muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Elevação lateral eliminando balanço do corpo.' },
        { name: 'Elevação Frontal com Barra',     muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Elevação frontal utilizando barra.' },
        { name: 'Elevação Frontal com Anilha',    muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Anilha',        loadType: 'weight',     description: 'Elevação frontal segurando anilha com pegada neutra.' },
        { name: 'Crucifixo Invertido no Cabo',    muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Isolamento de deltoides posteriores na polia alta.' },
        
        // BÍCEPS
        { name: 'Rosca Scott com Halteres',       muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Rosca Scott usando halteres unilateral.' },
        { name: 'Rosca Direta com Barra W',       muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Rosca direta com barra W reduzindo estresse nos punhos.' },
        { name: 'Rosca Inclinada com Halteres',   muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Rosca bíceps sentado no banco inclinado 45 graus.' },
        { name: 'Rosca Spider',                   muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Rosca apoiando o peito no banco inclinado, braços soltos.' },
        { name: 'Rosca Martelo no Cabo',          muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Rosca martelo usando corda na polia baixa.' },
        { name: 'Rosca Inversa com Barra',        muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Rosca direta pronada pegada inversa.' },
        
        // TRÍCEPS
        { name: 'Tríceps Testa com Barra W',      muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Tríceps testa com barra W deitado no banco.' },
        { name: 'Tríceps Testa com Halteres',     muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Tríceps testa usando halteres deitado.' },
        { name: 'Tríceps Francês Unilateral',     muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Extensão de tríceps acima da cabeça unilateral.' },
        { name: 'Tríceps Francês no Cabo',        muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Extensão de tríceps acima da cabeça com corda na polia.' },
        { name: 'Tríceps Coice no Cabo',          muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Extensão unilateral no cabo para deltoide e tríceps.' },
        
        // QUADRÍCEPS
        { name: 'Agachamento Livre com Halteres', muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Agachamento livre com halteres nas laterais.' },
        { name: 'Agachamento no Smith',           muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Agachamento guiado no Smith.' },
        { name: 'Agachamento Hack',               muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Agachamento guiado no Hack Squat.' },
        { name: 'Passada Lateral',                muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Avanço lateral para adutores e quadríceps.' },
        
        // POSTERIOR / GLÚTEOS
        { name: 'Stiff com Halteres',             muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Stiff-legged deadlift utilizando halteres.' },
        { name: 'Mesa Flexora Unilateral',        muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Flexão de joelhos unilateral deitado.' },
        { name: 'Cadeira Flexora Unilateral',     muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Flexão de joelhos unilateral sentado.' },
        { name: 'Coice de Glúteo no Solo',        muscleGroup: 'Glúteos',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Glute kickback em quatro apoios sem carga.' },
        
        // PANTURRILHAS
        { name: 'Panturrilha Sentado na Máquina', muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Panturrilha sentada na máquina sóleo.' },
        { name: 'Panturrilha em Pé com Halteres', muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Panturrilhas em pé segurando halteres.' },
        { name: 'Panturrilha Unilateral em Pé',   muscleGroup: 'Panturrilha',  category: 'Funcional',  equipment: 'Peso corporal', bodyweight: true, description: 'Elevação de panturrilha unilateral sem carga.' },
        
        // CORE / ABDÔMEN
        { name: 'Abdominal Oblíquo no Solo',      muscleGroup: 'Abdômen',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Flexão lateral do tronco para oblíquos.' },
        { name: 'Abdominal Infra na Barra',       muscleGroup: 'Abdômen',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Elevação de pernas pendurado na barra.' },
        { name: 'Abdominal Canivete (V-up)',      muscleGroup: 'Abdômen',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Elevação simultânea de pernas e tronco.' },
        { name: 'Abdominal Remador',              muscleGroup: 'Abdômen',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Sit-up completo estendendo e flexionando pernas.' },
        
        // MOBILIDADE / ALONGAMENTO
        { name: 'Alongamento de Glúteo (Pigeon)',  muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s', description: 'Alongamento profundo de glúteos e quadril (Pigeon Pose).' },
        { name: 'Alongamento Gato-Camelo',        muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '45s', description: 'Mobilização de coluna em flexão e extensão quadrupedal.' },
        
        // Ildemera Plan Exercises
        { name: 'Leg 45°',                        muscleGroup: 'Quadríceps',    category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Leg Press a 45 graus.' },
        { name: 'Puxada Alta Triângulo',          muscleGroup: 'Costas',        category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Puxada alta usando puxador triângulo.' },
        { name: 'Supino com Halter',              muscleGroup: 'Peito',         category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Supino reto com halteres.' },
        { name: 'Desenvolvimento Unilateral',     muscleGroup: 'Ombros',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Desenvolvimento de ombros com haltere unilateral.' },
        { name: 'Prancha Isométrica',             muscleGroup: 'Core',          category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s', description: 'Prancha frontal isométrica no solo.' },
        { name: 'Búlgaro no Step',                muscleGroup: 'Quadríceps',    category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Agachamento búlgaro com o pé traseiro apoiado no step.' },
        { name: 'Remada Articulada',              muscleGroup: 'Costas',        category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Remada sentada na máquina articulada.' },
        { name: 'Stiff',                          muscleGroup: 'Posterior',     category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Exercício stiff para posterior de coxa.' },
        { name: 'Flexão de Braços / Supino Máquina', muscleGroup: 'Peito',      category: 'Musculação', equipment: 'Peso corporal/Máquina', loadType: 'weight', description: 'Flexão de braços no solo ou supino máquina vertical.' },
        { name: 'Cadeira Abdutora',               muscleGroup: 'Glúteos',       category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Abdução de quadril na cadeira abdutora.' },
        { name: 'Dead Bug',                       muscleGroup: 'Core',          category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'weight',     description: 'Estabilização de core deitado alternando braços e pernas.' },
        { name: 'Panturrilha',                    muscleGroup: 'Panturrilha',   category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Exercício de panturrilha.' },
        { name: 'Puxada Alta',                    muscleGroup: 'Costas',        category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Puxada alta na polia.' },
        { name: 'Desenvolvimento',                muscleGroup: 'Ombros',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Desenvolvimento para deltoides.' },
        { name: 'Remada Unilateral',              muscleGroup: 'Costas',        category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Remada unilateral.' },
        { name: 'Caminhada inclinada',            muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Esteira',        loadType: 'time',       defaultReps: '30min', description: 'Caminhada com inclinação na esteira.' },
        { name: 'Escada de Agilidade',            muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Variado',        loadType: 'time',       defaultReps: '30s', description: 'Trabalho de agilidade e coordenação na escada de chão.' }
    ];

    const existing = await this.getAll('exercises');
    const newExerciseIds = new Set(exercises.map(ex => 'ex_' + slugify(ex.name) + '_' + trainerId));
    const hasAllDefault = [...newExerciseIds].every(id => existing.some(e => e.id === id));

    if (!hasAllDefault) {
      console.log('[Seed] Seeding missing default exercises...');
      // Clean up legacy/removed default templates for this trainer
      const defaultToClean = existing.filter(e => 
        e.is_default && 
        (!e.id.startsWith('ex_') || !e.id.endsWith('_' + trainerId) || !newExerciseIds.has(e.id))
      );
      for (const ex of defaultToClean) {
        await this.delete('exercises', ex.id);
      }

      // Clear any accidental tombstones for the seeded exercises to prevent sync from deleting them
      for (const id of newExerciseIds) {
        this._removeTombstone('exercises', id, trainerId);
      }

      // Seed exercises deterministically
      for (const ex of exercises) {
        const id = 'ex_' + slugify(ex.name) + '_' + trainerId;
        await this.put('exercises', { ...ex, id, is_default: true, trainer_id: trainerId });
      }
    }
  }

  // ── SEED MÉTODOS ──
  async seedMethods() {
    const trainerId = await this._getTrainerId();
    if (!trainerId) return;
    const methods = [
      // Geral
      { name: 'Unilateral',     category: 'Geral',        description: 'Executar o exercício de um lado de cada vez para correção de assimetrias e equilíbrio muscular.', sets: '3-4', repsHint: '10-12', restHint: '60s' },
      
      // Hipertrofia
      { name: 'Drop-set',       category: 'Hipertrofia', description: 'Executar até a falha, reduzir carga ~20% e continuar sem descanso. Repetir 2-3x.', sets: '3+drops', repsHint: '8-12 + drops', restHint: '120-180s entre drop-sets completos' },
      { name: 'Pirâmide Dupla',      category: 'Hipertrofia',  description: 'Crescente depois decrescente: 15→12→10→8→10→12→15. Máximo volume. Mais desgastante.', sets: '7', repsHint: '15→12→10→8→10→12→15', restHint: '90s' },
      { name: 'Pirâmide Completa',   category: 'Hipertrofia',  description: 'Versão estendida com 10 séries: 20→15→12→10→8→6→8→10→12→15. Volume e intensidade máximos. Para avançados.', sets: '10', repsHint: '20→15→12→10→8→6→8→10→12→15', restHint: '90-120s' },
      { name: 'Super-série Agonista', category: 'Hipertrofia', description: 'Dois exercícios do mesmo grupo muscular sem descanso. Ex: Supino + Crucifixo.', sets: '3', repsHint: '10-12 cada', restHint: '90s após o par' },
      { name: 'Super-série Antagonista', category: 'Hipertrofia', description: 'Dois exercícios de grupos opostos sem descanso. Ex: Rosca + Tríceps.', sets: '3', repsHint: '10-12 cada', restHint: '60s após o par' },
      { name: 'Tri-set',         category: 'Hipertrofia', description: 'Três exercícios consecutivos sem descanso. Alto estímulo metabólico.', sets: '3', repsHint: '8-12 cada', restHint: '120s após o tri' },
      { name: 'Série Gigante',   category: 'Hipertrofia', description: '4+ exercícios consecutivos. Máximo estímulo. Reduzir cargas.', sets: '3', repsHint: '10-15 cada', restHint: '180s após o set' },
      { name: 'Excêntrico Acentuado', category: 'Hipertrofia', description: 'Fase excêntrica 4-6 segundos. Provoca mais dano muscular e hipertrofia.', sets: '3-4', repsHint: '6-8', restHint: '120s' },
      { name: 'Pré-exaustão',    category: 'Hipertrofia', description: 'Isolamento antes do composto. Ex: Crucifixo → Supino. Fatiga o músculo-alvo primeiro.', sets: '3', repsHint: '12 iso + 8-10 composto', restHint: '0s entre, 120s entre séries' },
      { name: 'Bi-set',          category: 'Hipertrofia', description: 'Dois exercícios para o mesmo músculo, sem pausa.', sets: '3-4', repsHint: '10 cada', restHint: '90s após o par' },
      { name: '21s',             category: 'Hipertrofia', description: '7 reps parciais (0-90°) + 7 reps parciais (90-180°) + 7 reps completas = 21.', sets: '3', repsHint: '21 (7+7+7)', restHint: '90-120s' },
      { name: 'Stripping',       category: 'Hipertrofia', description: 'Similar ao drop-set com barra: remover anilhas sem parar.', sets: '1 longa', repsHint: 'Até a falha com cada carga', restHint: '120-180s' },
      { name: 'FST-7',           category: 'Hipertrofia', description: '7 séries do exercício isolador com 30-45s descanso. Alta congestão.', sets: '7', repsHint: '12-15', restHint: '30-45s' },

      // Força / Potência
      { name: 'Pirâmide Crescente',  category: 'Força / Potência',        description: 'Aumentar carga a cada série, reduzir reps: 15→12→10→8. Boa para progressão de força.', sets: '4', repsHint: '15→12→10→8', restHint: '90-120s' },
      { name: 'Pirâmide Decrescente',category: 'Força / Potência',        description: 'Inicia pesado e reduz carga: 8→10→12→15. Trabalha força e resistência na mesma sessão.', sets: '4', repsHint: '8→10→12→15', restHint: '90-120s' },
      { name: 'Rest-Pause',      category: 'Força / Potência',       description: 'Executar até a falha, descanso de 15-20s, continuar até nova falha. 2-3 mini-séries.', sets: '1-3', repsHint: 'Até a falha + pausa', restHint: '15-20s entre mini-séries' },
      { name: 'Cluster',         category: 'Força / Potência',       description: 'Carga 85-95% 1RM. Execução: 2-3 reps, pausa 10-15s, repetir até 5 cluster. Força máxima.', sets: '5', repsHint: '2-3 por cluster', restHint: '10-15s entre clusters; 3-5min entre sets' },
      { name: 'Isometria',       category: 'Força / Potência',       description: 'Sustentação em posição de tensão por 30-60s. Boa para estabilização.', sets: '3', repsHint: '30-60s', restHint: '90s' },

      // Resistência / RML
      { name: 'Série de Exaustão', category: 'Resistência / RML', description: 'Série executada até a falha muscular concêntrica para desenvolvimento de endurance muscular.', sets: '2-3', repsHint: '15-25+', restHint: '45-60s' },
      { name: 'Circuito',         category: 'Resistência / RML', description: 'Transição imediata entre múltiplos exercícios para aumentar gasto calórico e condicionamento.', sets: '3-4 voltas', repsHint: '15-20', restHint: '2-3min após circuito' },

      // Cardio / Endurance
      { name: 'Zona 1 (Z1)',     category: 'Cardio / Endurance',      description: '<65% FC Máx. Recuperação ativa, base aeróbica.', sets: '1', repsHint: '20-60min contínuo', restHint: 'Sem descanso' },
      { name: 'Zona 2 (Z2)',     category: 'Cardio / Endurance',      description: '65-75% FC Máx. Base aeróbica. Longo e lento.', sets: '1', repsHint: '30-90min contínuo', restHint: 'Sem descanso' },
      { name: 'Zona 3 (Z3)',     category: 'Cardio / Endurance',      description: '75-80% FC Máx. Limiar aeróbico inferior.', sets: '1', repsHint: '20-40min', restHint: 'Sem descanso' },
      { name: 'Zona 4 (Z4) — Limiar', category: 'Cardio / Endurance', description: '80-90% FC Máx. Limiar anaeróbio.', sets: '1-3', repsHint: '10-20min', restHint: '5min recuperação ativa entre blocos' },
      { name: 'Zona 5 (Z5) — VO2max', category: 'Cardio / Endurance', description: '90-100% FC Máx. Intervalos curtos. Melhora VO2max.', sets: '4-8', repsHint: '3-5min esforço', restHint: '3-5min recuperação' },
      { name: 'Tabata',          category: 'Cardio / Endurance',      description: '20s máximo / 10s repouso × 8 rounds = 4min.', sets: '1-3 blocos', repsHint: '20s esforço / 10s repouso', restHint: '60-90s entre blocos' },
      { name: 'HIIT 1:2',        category: 'Cardio / Endurance',      description: 'Ratio 1:2 trabalho:descanso. 30s esforço / 60s recuperação. 8-12 rounds.', sets: '8-12', repsHint: '30s esforço', restHint: '60s recuperação ativa' },
      { name: 'HIIT 1:1',        category: 'Cardio / Endurance',      description: 'Ratio 1:1. 30s esforço / 30s recuperação. Mais intenso.', sets: '8-12', repsHint: '30s esforço', restHint: '30s recuperação ativa' },
      { name: 'SIT (Sprint Interval Training)', category: 'Cardio / Endurance', description: 'Sprints de 10-30s máximos. Melhora potência anaeróbica.', sets: '4-6', repsHint: '10-30s sprint', restHint: '2-4min recuperação completa' },
      { name: 'Série de Repetição (VO2max)', category: 'Cardio / Endurance', description: 'Intervalos de 3-5min a 95-100% VO2max.', sets: '4-6', repsHint: '3-5min', restHint: 'Igual ao esforço' },
      { name: 'Steady State',    category: 'Cardio / Endurance',      description: 'Ritmo constante e moderado. Zona 2-3. Base aeróbica.', sets: '1', repsHint: '20-60min', restHint: 'Sem descanso' },
      { name: 'Progressivo',     category: 'Cardio / Endurance',      description: 'Aumentar velocidade/intensidade a cada bloco. Ex: +0.5km/h a cada 5min.', sets: '1', repsHint: 'Progressivo', restHint: 'Sem descanso' },
      { name: 'Polarizado (80/20)', category: 'Cardio / Endurance',      description: 'Distribuição científica: 80% do volume em baixa intensidade (Z1/Z2) e 20% em alta intensidade (Z5+), evitando zona moderada.', sets: '1', repsHint: '80% Z2 / 20% Z5', restHint: 'Nenhum' },
      { name: 'Gibala 10x60s (HIIT)', category: 'Cardio / Endurance',   description: 'Protocolo de Gibala: 10 tiros de 60s a ~90% FC Máx com 60s de recuperação ativa. Excelente para eficiência de tempo.', sets: '10 rounds', repsHint: '60s esforço', restHint: '60s rec. ativa' },
      { name: 'Gibala 3x20s (Sprint)', category: 'Cardio / Endurance',   description: 'The One-Minute Workout (Gibala): 3 tiros máximos (all-out) de 20s, com 2min de recuperação leve entre eles.', sets: '3 rounds', repsHint: '20s sprint', restHint: '2min rec. leve' },

      // Mobilidade / Flexibilidade
      { name: 'Alongamento Ativo', category: 'Mobilidade / Flexibilidade', description: 'Sustentação ativa de posições articulares no limite da amplitude de movimento.', sets: '2-3', repsHint: '30-45s', restHint: '15s' },
      { name: 'Mobilidade Articular', category: 'Mobilidade / Flexibilidade', description: 'Exercícios dinâmicos visando aumentar a lubrificação sinovial e amplitude.', sets: '3', repsHint: '10-15 reps lentas', restHint: '0s' },

      // Core / Estabilização
      { name: 'Estabilização Core', category: 'Core / Estabilização', description: 'Manutenção de posturas isométricas que recrutam eretores da espinha, transverso abdominal e oblíquos.', sets: '3-4', repsHint: '30-60s', restHint: '45s' },
      { name: 'Anti-Rotacional', category: 'Core / Estabilização', description: 'Exercícios com resistência que desafiam o core a impedir o movimento rotacional.', sets: '3', repsHint: '10-12', restHint: '60s' },

      // Regenerativo / Recovery
      { name: 'Recuperação Ativa', category: 'Regenerativo / Recovery', description: 'Esforço de baixíssima intensidade pós-treino ou em dia regenerativo para remover lactato.', sets: '1', repsHint: '10-20min', restHint: 'Nenhum' },
      { name: 'Liberação Miofascial', category: 'Regenerativo / Recovery', description: 'Automassagem com rolo de espuma (foam roller) ou bola para soltar fáscias musculares.', sets: '1', repsHint: '1-2min por grupo', restHint: '0s' },

      // Aquecimento / Preparação
      { name: 'RAMP (Ativação)', category: 'Aquecimento / Preparação', description: 'Ativação progressiva (Raise, Activate, Mobilize, Potentiate) para preparar o sistema nervoso e articular.', sets: '1', repsHint: '5-10min', restHint: '0s' },
      { name: 'Facilitação Neuromuscular', category: 'Aquecimento / Preparação', description: 'FNP (Facilitação Neuromuscular Proprioceptiva) - contrair-relaxar para ganho rápido de amplitude articular.', sets: '2-3', repsHint: '15-20s', restHint: '15s' },
      { name: 'Ativação Muscular', category: 'Aquecimento / Preparação', description: 'Estímulo direcionado de baixa intensidade para ativação de músculos alvo.', sets: '2', repsHint: '15-20', restHint: '30s' },

      // Calistenia / Ginástica
      { name: 'Progressão Calistênica', category: 'Calistenia / Ginástica', description: 'Trabalho focado em progressões de força relativa e peso corporal (ex: Tuck Planche, Front Lever).', sets: '4-5', repsHint: 'Submáxima', restHint: '120-180s' },
      { name: 'Isometria Avançada', category: 'Calistenia / Ginástica', description: 'Manutenção de posturas calistênicas estáticas sob máxima contração voluntária (ex: L-sit, Handstand).', sets: '3-4', repsHint: '10-20s', restHint: '90s' },
      { name: 'Treino de Skills', category: 'Calistenia / Ginástica', description: 'Desenvolvimento de habilidades ginásticas e controle motor antes da fadiga muscular.', sets: '3-5', repsHint: 'Trabalho de técnica', restHint: '120s' },

      // LPO / Levantamento Olímpico
      { name: 'Complex Olímpico', category: 'LPO / Levantamento Olímpico', description: 'Sequência ininterrupta de variações de LPO (ex: Clean + Front Squat + Jerk) para potência e coordenação.', sets: '3-5', repsHint: '1-3 complexes', restHint: '120-180s' },
      { name: 'Cluster LPO', category: 'LPO / Levantamento Olímpico', description: 'Séries compostas por repetições únicas (singles) com pausa curta de 10-15s para foco na técnica.', sets: '4-6', repsHint: '3-5 singles', restHint: '180s' },
      { name: 'Potência / Velocidade', category: 'LPO / Levantamento Olímpico', description: 'Trabalho dinâmico com 60-80% 1RM focado na velocidade de execução concêntrica.', sets: '4-6', repsHint: '2-3', restHint: '120s' },

      // Coordenação / Agilidade
      { name: 'Escada de Agilidade', category: 'Coordenação / Agilidade', description: 'Padrões rápidos de passos na escada de agilidade para coordenação neuromuscular e velocidade de pés.', sets: '4-6 voltas', repsHint: 'Trabalho rápido', restHint: '45-60s' },
      { name: 'Treino de Reação', category: 'Coordenação / Agilidade', description: 'Deslocamento multidirecional responsivo a comandos visuais ou auditivos do treinador.', sets: '4-6', repsHint: '15-30s esforço', restHint: '60s' },
      { name: 'Drill Técnico', category: 'Coordenação / Agilidade', description: 'Exercícios repetitivos específicos para refino de gestos esportivos e controle de movimento.', sets: '3-4', repsHint: '10-15', restHint: '60s' },

      // Reabilitação / Preventivo
      { name: 'Isolamento Corretivo', category: 'Reabilitação / Preventivo', description: 'Recrutamento seletivo de estabilizadores profundos para prevenção de lesões e reabilitação pós-lesão.', sets: '3', repsHint: '12-15 lentas', restHint: '45s' },
      { name: 'Controle Motor', category: 'Reabilitação / Preventivo', description: 'Exercícios de baixa sobrecarga focados na qualidade biomecânica e recrutamento muscular consciente.', sets: '3', repsHint: '10-15', restHint: '30-45s' },
      { name: 'Excêntrico Lento (Rehab)', category: 'Reabilitação / Preventivo', description: 'Foco exclusivo na fase de estiramento controlado (4-6 segundos) para tratamento de tendinopatias.', sets: '3-4', repsHint: '8-10', restHint: '60s' }
    ];
    const existing = await this.getAll('methods');
    const newMethodIds = new Set(methods.map(m => 'met_' + slugify(m.name) + '_' + trainerId));
    
    // Clean up legacy/removed default methods for this trainer
    const defaultToClean = existing.filter(m => 
      m.is_default && 
      (!m.id.startsWith('met_') || !m.id.endsWith('_' + trainerId) || !newMethodIds.has(m.id))
    );
    for (const m of defaultToClean) {
      await this.delete('methods', m.id);
    }

    // Clear any accidental tombstones for the seeded methods to prevent sync from deleting them
    for (const id of newMethodIds) {
      this._removeTombstone('methods', id, trainerId);
    }

    // Seed methods deterministically
    for (const m of methods) {
      const id = 'met_' + slugify(m.name) + '_' + trainerId;
      await this.put('methods', { ...m, id, is_default: true, trainer_id: trainerId });
    }
  }


  // ── RESEED ADMIN — marca todos os padrões (chamado pelo painel admin) ──
  async reseedDefaults() {
    // Marcar todos os exercícios existentes como padrão
    const exercises = await this.getAll('exercises');
    for (const e of exercises) {
      if (!e.is_default) await this.put('exercises', { ...e, is_default: true });
    }
    // Marcar todos os métodos existentes como padrão
    const methods = await this.getAll('methods');
    for (const m of methods) {
      if (!m.is_default) await this.put('methods', { ...m, is_default: true });
    }
    return { exercises: exercises.length, methods: methods.length };
  }


  // ── GLOBAL DATA (admin defaults — visible to all) ──
  // Exercícios/métodos/templates com is_default=true são globais
  // Não filtrados por trainer_id
  async getGlobal(storeName) {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from(storeName)
          .select('data')
          .eq('is_default', true);
        if (!error && data?.length) return fixObjectEncoding(data.map(r => r.data));
      } catch(_) {}
    }
    // Fallback: LocalStorage global (sem trainer_id)
    try {
      const raw = localStorage.getItem(`pp_global_${storeName}`);
      return fixObjectEncoding(raw ? JSON.parse(raw) : []);
    } catch { return []; }
  }

  // ── GET ALL (user data + global defaults merged) ──
  async getAllWithGlobal(storeName) {
    const [userItems, globalItems] = await Promise.all([
      this.getAll(storeName),
      this.getGlobal(storeName),
    ]);
    // Merge: globais primeiro, depois os do usuário (sem duplicar ids)
    const userIds = new Set(userItems.map(i => i.id));
    const merged  = [...globalItems.filter(g => !userIds.has(g.id)), ...userItems];
    return merged;
  }

  // ── SEED GLOBAL DEFAULTS (admin only) ──
  async seedGlobalDefaults(storeName, items) {
    const marked = items.map(item => ({ ...item, is_default: true }));
    if (this.supabase) {
      try {
        for (const item of marked) {
          if (!item.id) item.id = crypto.randomUUID();
          await this.supabase.from(storeName).upsert({ id: item.id, is_default: true, data: item });
        }
        return;
      } catch(_) {}
    }
    localStorage.setItem(`pp_global_${storeName}`, JSON.stringify(marked));
  }



}

const db = new Database();
export default db;
export { db };
