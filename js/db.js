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

  get supabase() {
    return getSupabase();
  }

  // Get current user id (trainer_id used in all records)
  async _getTrainerId() {
    if (this._currentUser?.id) return this._currentUser.id;
    const user = await getCurrentUser();
    if (user) this._currentUser = user;
    return user?.id || null;
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
      const res = data.data && typeof data.data === 'object' ? { ...data.data, id: data.id } : data;
      return fixObjectEncoding(res);
    } catch(e) { console.warn(`get(${storeName}) exception:`, e?.message); return fixObjectEncoding(local); }
  }

  // Tabelas que existem no Supabase (as demais ficam só em localStorage)
  SUPABASE_TABLES = new Set([
    'students','sessions','biofeedback','workouts','assessments',
    'cycles','macrocycles','schedules','financial','finances',
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
        .filter('data->>email', 'eq', email);
      if (!error && data && data.length > 0) {
        const r = data[0];
        const res = r.data ? { ...r.data, id: r.id } : r;
        return fixObjectEncoding(res);
      }
    } catch (e) {
      console.error('getStudentByEmail error:', e);
    }
    return null;
  }

  async getAll(storeName) {
    const trainerId = await this._getTrainerId();
    const local     = this._getLocal(storeName, trainerId) || [];

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
        const all = [...(r1.data||[]), ...(r2.data||[])];
        // Deduplicar por id e por nome (evita duplicatas de global vs personal)
        const seenId = new Set();
        const seenName = new Set();
        data  = all.filter(r => { 
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
        if (r.data && typeof r.data === 'object') {
          return { ...r.data, id: r.id }; // id da row sempre prevalece
        }
        return { ...r };
      });

      // Mesclar com local (local pode ter registros offline)
      const merged = new Map();
      local.forEach(r => { if (r?.id) merged.set(r.id, r); });
      remote.forEach(r => { if (r?.id) merged.set(r.id, r); });
      let result = [...merged.values()];

      // Deduplicar por nome para exercises e methods
      if (storeName === 'exercises' || storeName === 'methods') {
        const seenName = new Set();
        const deduped = [];
        for (const item of result) {
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
    const local = (this._getLocal(storeName, trainerId) || [])
      .filter(r => r?.studentId === studentId);

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
        .map(r => r.data ? { ...r.data, id: r.id } : r)
        .filter(r => r?.studentId === studentId);
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

    // Save locally first (offline-first)
    const all = this._getLocal(storeName, trainerId);
    const idx = all.findIndex(i => i.id === item.id);
    if (idx >= 0) all[idx] = item; else all.push(item);
    this._saveLocal(storeName, all, trainerId);

    if (!this.supabase) return item;

    try {
      const payload = { id: item.id, trainer_id: trainerId || null, data: item };
      const { error } = await this.supabase.from(storeName).upsert(payload);
      if (error) console.warn(`Supabase put error (${storeName}):`, error.message);
    } catch (err) { console.warn(`Supabase put exception:`, err.message); }

    return item;
  }

  // ── ADD (alias for put) ──
  async add(storeName, item) {
    return this.put(storeName, item);
  }

  // ── DELETE ──
  async delete(storeName, id) {
    const trainerId = await this._getTrainerId();
    const all = this._getLocal(storeName, trainerId).filter(i => i.id !== id);
    this._saveLocal(storeName, all, trainerId);

    if (!this.supabase) return;
    try {
      let q = this.supabase.from(storeName).delete().eq('id', id);
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { error } = await q;
      if (error) console.warn(`Supabase delete error (${storeName}):`, error.message);
    } catch {}
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

    const exercisesCount = await this.count('exercises');
    if (exercisesCount < 80) {
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
        // POSTERIOR
        { name: 'Mesa Flexora',                   muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento dos isquiotibiais deitado.' },
        { name: 'Cadeira Flexora',                muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento dos isquiotibiais sentado.' },
        { name: 'Stiff com Barra',                muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Alongamento ativo dos isquiotibiais.' },
        { name: 'Stiff Unilateral',               muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Versão unilateral para equilíbrio.' },
        { name: 'Good Morning',                   muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Fortalece eretores e isquiotibiais.' },
        // GLÚTEOS
        { name: 'Hip Thrust',                     muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Barra',         loadType: 'weight',     description: 'Melhor exercício para glúteos.' },
        { name: 'Hip Thrust com Halteres',        muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Versão com halteres para variação.' },
        { name: 'Abdução na Máquina',             muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Isolamento do glúteo médio.' },
        { name: 'Coice no Cabo',                  muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Cabo',          loadType: 'weight',     description: 'Isolamento do glúteo máximo.' },
        { name: 'Ponte de Glúteos',               muscleGroup: 'Glúteos',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Versão sem carga do hip thrust.' },
        { name: 'Agachamento Sumô com Halter',    muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Halteres',      loadType: 'weight',     description: 'Enfatiza glúteos e adutores.' },
        // PANTURRILHA
        { name: 'Panturrilha em Pé',              muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Foco no gastrocnêmio.' },
        { name: 'Panturrilha Sentado',            muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Foco no sóleo.' },
        { name: 'Panturrilha no Leg Press',       muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       loadType: 'weight',     description: 'Variação com maior amplitude.' },
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
        // CARDIO / ENDURANCE — expandido
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
        { name: 'Air Runner',                      muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Air Runner',     loadType: 'time',       defaultReps: '200m',  intensityField: 'pace_min_km',description: 'Esteira não motorizada. Mais demanda do que a convencional.' },
        // FUNCIONAIS já existentes mantidos abaixo
        { name: 'Kettlebell Goblet Squat',         muscleGroup: 'Quadríceps',    category: 'Funcional',  equipment: 'Kettlebell',     loadType: 'weight',     description: 'Agachamento com kettlebell.' },
        { name: 'Turkish Get-Up',                  muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Kettlebell',     loadType: 'weight',     description: 'Movimento complexo para estabilidade total.' },
        { name: 'Farmer Walk',                     muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Halteres',       loadType: 'weight',     description: 'Caminhada com carga para força funcional.' },
        { name: 'Slam Ball',                       muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Medicine Ball',  loadType: 'weight',     description: 'Potência e força explosiva.' },
        // MOBILIDADE
        { name: 'Alongamento de Quadril',          muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s', description: 'Flexibilidade do flexor do quadril.' },
        { name: 'Rotação Torácica',                muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s', description: 'Mobilidade da coluna torácica.' },
        { name: 'Hip 90/90',                       muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '45s', description: 'Mobilidade de quadril em rotação interna/externa.' },
        { name: 'Abertura de Quadril com Haltere', muscleGroup: 'Glúteos',       category: 'Mobilidade', equipment: 'Halteres',       loadType: 'weight',     description: 'Fortalecimento e mobilidade do glúteo médio.' },
      ];

      const existing = await this.getAll('exercises');
      
      // Clean up legacy non-deterministic default templates for this trainer
      const defaultToClean = existing.filter(e => e.is_default && (!e.id.startsWith('ex_') || !e.id.endsWith('_' + trainerId)));
      for (const ex of defaultToClean) {
        await this.delete('exercises', ex.id);
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
      // Força / Hipertrofia
      { name: 'Drop-set',       category: 'Hipertrofia', description: 'Executar até a falha, reduzir carga ~20% e continuar sem descanso. Repetir 2-3x.', sets: '3+drops', repsHint: '8-12 + drops', restHint: '120-180s entre drop-sets completos' },
      { name: 'Pirâmide Crescente',  category: 'Força',        description: 'Aumentar carga a cada série, reduzir reps: 15→12→10→8. Boa para progressão de força.', sets: '4', repsHint: '15→12→10→8', restHint: '90-120s' },
      { name: 'Pirâmide Decrescente',category: 'Força',        description: 'Inicia pesado e reduz carga: 8→10→12→15. Trabalha força e resistência na mesma sessão.', sets: '4', repsHint: '8→10→12→15', restHint: '90-120s' },
      { name: 'Pirâmide Dupla',      category: 'Hipertrofia',  description: 'Crescente depois decrescente: 15→12→10→8→10→12→15. Máximo volume. Mais desgastante.', sets: '7', repsHint: '15→12→10→8→10→12→15', restHint: '90s' },
      { name: 'Pirâmide Completa',   category: 'Hipertrofia',  description: 'Versão estendida com 10 séries: 20→15→12→10→8→6→8→10→12→15. Volume e intensidade máximos. Para avançados.', sets: '10', repsHint: '20→15→12→10→8→6→8→10→12→15', restHint: '90-120s' },
      { name: 'Rest-Pause',      category: 'Força',       description: 'Executar até a falha, descanso de 15-20s, continuar até nova falha. 2-3 mini-séries.', sets: '1-3', repsHint: 'Até a falha + pausa', restHint: '15-20s entre mini-séries' },
      { name: 'Super-série Agonista', category: 'Hipertrofia', description: 'Dois exercícios do mesmo grupo muscular sem descanso. Ex: Supino + Crucifixo.', sets: '3', repsHint: '10-12 cada', restHint: '90s após o par' },
      { name: 'Super-série Antagonista', category: 'Hipertrofia', description: 'Dois exercícios de grupos opostos sem descanso. Ex: Rosca + Tríceps.', sets: '3', repsHint: '10-12 cada', restHint: '60s após o par' },
      { name: 'Tri-set',         category: 'Hipertrofia', description: 'Três exercícios consecutivos sem descanso. Alto estímulo metabólico.', sets: '3', repsHint: '8-12 cada', restHint: '120s após o tri' },
      { name: 'Série Gigante',   category: 'Hipertrofia', description: '4+ exercícios consecutivos. Máximo estímulo. Reduzir cargas.', sets: '3', repsHint: '10-15 cada', restHint: '180s após o set' },
      { name: 'Cluster',         category: 'Força',       description: 'Carga 85-95% 1RM. Execução: 2-3 reps, pausa 10-15s, repetir até 5 cluster. Força máxima.', sets: '5', repsHint: '2-3 por cluster', restHint: '10-15s entre clusters; 3-5min entre sets' },
      { name: 'Excêntrico Acentuado', category: 'Hipertrofia', description: 'Fase excêntrica 4-6 segundos. Provoca mais dano muscular e hipertrofia.', sets: '3-4', repsHint: '6-8', restHint: '120s' },
      { name: 'Isometria',       category: 'Força',       description: 'Sustentação em posição de tensão por 30-60s. Boa para estabilização.', sets: '3', repsHint: '30-60s', restHint: '90s' },
      { name: 'Pré-exaustão',    category: 'Hipertrofia', description: 'Isolamento antes do composto. Ex: Crucifixo → Supino. Fatiga o músculo-alvo primeiro.', sets: '3', repsHint: '12 iso + 8-10 composto', restHint: '0s entre, 120s entre séries' },
      { name: 'Bi-set',          category: 'Hipertrofia', description: 'Dois exercícios para o mesmo músculo, sem pausa.', sets: '3-4', repsHint: '10 cada', restHint: '90s após o par' },
      { name: '21s',             category: 'Hipertrofia', description: '7 reps parciais (0-90°) + 7 reps parciais (90-180°) + 7 reps completas = 21.', sets: '3', repsHint: '21 (7+7+7)', restHint: '90-120s' },
      { name: 'Stripping',       category: 'Hipertrofia', description: 'Similar ao drop-set com barra: remover anilhas sem parar.', sets: '1 longa', repsHint: 'Até a falha com cada carga', restHint: '120-180s' },
      { name: 'FST-7',           category: 'Hipertrofia', description: '7 séries do exercício isolador com 30-45s descanso. Alta congestão.', sets: '7', repsHint: '12-15', restHint: '30-45s' },
      // Cardio / Endurance
      { name: 'Zona 1 (Z1)',     category: 'Cardio',      description: '<65% FC Máx. Recuperação ativa, base aeróbica.', sets: '1', repsHint: '20-60min contínuo', restHint: 'Sem descanso' },
      { name: 'Zona 2 (Z2)',     category: 'Cardio',      description: '65-75% FC Máx. Base aeróbica. Longo e lento.', sets: '1', repsHint: '30-90min contínuo', restHint: 'Sem descanso' },
      { name: 'Zona 3 (Z3)',     category: 'Cardio',      description: '75-80% FC Máx. Limiar aeróbico inferior.', sets: '1', repsHint: '20-40min', restHint: 'Sem descanso' },
      { name: 'Zona 4 (Z4) — Limiar', category: 'Cardio', description: '80-90% FC Máx. Limiar anaeróbio.', sets: '1-3', repsHint: '10-20min', restHint: '5min recuperação ativa entre blocos' },
      { name: 'Zona 5 (Z5) — VO2max', category: 'Cardio', description: '90-100% FC Máx. Intervalos curtos. Melhora VO2max.', sets: '4-8', repsHint: '3-5min esforço', restHint: '3-5min recuperação' },
      { name: 'Tabata',          category: 'Cardio',      description: '20s máximo / 10s repouso × 8 rounds = 4min.', sets: '1-3 blocos', repsHint: '20s esforço / 10s repouso', restHint: '60-90s entre blocos' },
      { name: 'HIIT 1:2',        category: 'Cardio',      description: 'Ratio 1:2 trabalho:descanso. 30s esforço / 60s recuperação. 8-12 rounds.', sets: '8-12', repsHint: '30s esforço', restHint: '60s recuperação ativa' },
      { name: 'HIIT 1:1',        category: 'Cardio',      description: 'Ratio 1:1. 30s esforço / 30s recuperação. Mais intenso.', sets: '8-12', repsHint: '30s esforço', restHint: '30s recuperação ativa' },
      { name: 'SIT (Sprint Interval Training)', category: 'Cardio', description: 'Sprints de 10-30s máximos. Melhora potência anaeróbica.', sets: '4-6', repsHint: '10-30s sprint', restHint: '2-4min recuperação completa' },
      { name: 'Série de Repetição (VO2max)', category: 'Cardio', description: 'Intervalos de 3-5min a 95-100% VO2max.', sets: '4-6', repsHint: '3-5min', restHint: 'Igual ao esforço' },
      { name: 'Steady State',    category: 'Cardio',      description: 'Ritmo constante e moderado. Zona 2-3. Base aeróbica.', sets: '1', repsHint: '20-60min', restHint: 'Sem descanso' },
      { name: 'Progressivo',     category: 'Cardio',      description: 'Aumentar velocidade/intensidade a cada bloco. Ex: +0.5km/h a cada 5min.', sets: '1', repsHint: 'Progressivo', restHint: 'Sem descanso' },
    ];
    const existing = await this.getAll('methods');
    
    // Clean up legacy non-deterministic default methods for this trainer
    const defaultToClean = existing.filter(m => m.is_default && !m.id.startsWith('met_'));
    for (const m of defaultToClean) {
      await this.delete('methods', m.id);
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
