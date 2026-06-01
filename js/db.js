// ========================================
// PERSONAL PRO â€” Database (v3)
// Supabase Auth + Multi-Tenant Isolation
// All records scoped to trainer_id (user.id)
// ========================================

import { getSupabase, getCurrentUser } from './utils/auth.js';

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

  // â”€â”€ LOCAL STORAGE HELPERS (scoped per trainer_id) â”€â”€
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

  // â”€â”€ GET SINGLE RECORD â”€â”€
  async get(storeName, id) {
    const trainerId = await this._getTrainerId();
    const local = (this._getLocal(storeName, trainerId) || []).find(i => i.id === id) || null;
    if (!this.supabase) return local;

    try {
      let q = this.supabase.from(storeName).select('*').eq('id', id);
      // exercises e methods: nÃ£o filtrar por trainer_id (is_default=true tem trainer_id=null)
      if (trainerId && storeName !== 'exercises' && storeName !== 'methods') {
        q = q.eq('trainer_id', trainerId);
      }
      const { data, error } = await q.maybeSingle();
      if (error) { console.warn(`get(${storeName}) error:`, error.message); return local; }
      if (!data) return local;
      return data.data && typeof data.data === 'object' ? { ...data.data, id: data.id } : data;
    } catch(e) { console.warn(`get(${storeName}) exception:`, e?.message); return local; }
  }

  // Tabelas que existem no Supabase (as demais ficam sÃ³ em localStorage)
  SUPABASE_TABLES = new Set([
    'students','sessions','biofeedback','workouts','assessments',
    'cycles','macrocycles','schedules','financial','finances',
    'events','prescriptions','anamnesis','settings','exercises','methods',
  ]);

  // â”€â”€ GET ALL RECORDS â”€â”€
  async getStudentByEmail(email) {
    const trainerId = await this._getTrainerId();
    const local = this._getLocal('students', trainerId) || [];
    const localMatch = local.find(s => s.email?.toLowerCase().trim() === email);
    if (localMatch) return localMatch;
    if (!this.supabase) return null;
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('*')
        .filter('data->>email', 'eq', email);
      if (!error && data && data.length > 0) {
        const r = data[0];
        return r.data ? { ...r.data, id: r.id } : r;
      }
    } catch (e) {
      console.error('getStudentByEmail error:', e);
    }
    return null;
  }

  async getAll(storeName) {
    const trainerId = await this._getTrainerId();
    const local     = this._getLocal(storeName, trainerId) || [];

    if (!this.supabase || !this.SUPABASE_TABLES.has(storeName)) return local;

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
        // Deduplicar por id
        const seen = new Set();
        data  = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
        error = r1.error;
      } else {
        let q = this.supabase.from(storeName).select('*');
        if (trainerId) q = q.eq('trainer_id', trainerId);
        ({ data, error } = await q);
      }

      if (error) {
        console.warn(`getAll(${storeName}) Supabase error:`, error.message);
        return local;
      }

      if (!data) return local;

      // Mapear: usar r.data (JSONB) se existir, senÃ£o usar a row direta
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
      const result = [...merged.values()];

      this._saveLocal(storeName, result, trainerId);
      return result;
    } catch (e) {
      console.warn(`getAll(${storeName}) exception:`, e?.message || e);
      return local;
    }
  }

  // â”€â”€ GET ALL FOR STUDENT (sem filtro de trainer_id) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async getAllForStudent(storeName, studentId) {
    const trainerId = await this._getTrainerId();
    const local = (this._getLocal(storeName, trainerId) || [])
      .filter(r => r?.studentId === studentId);

    if (!this.supabase) return local;

    try {
      // Busca 1: pelo trainer_id (registros do personal + formulÃ¡rios com trainer correto)
      // Busca 2: pelo studentId direto via JSONB (registros antigos)
      const [r1, r2] = await Promise.all([
        this.supabase.from(storeName).select('*').eq('trainer_id', trainerId),
        this.supabase.from(storeName).select('*').filter('data->>studentId', 'eq', studentId),
      ]);

      const all  = [...(r1.data||[]), ...(r2.data||[])];
      const seen = new Set();
      return all
        .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
        .map(r => r.data ? { ...r.data, id: r.id } : r)
        .filter(r => r?.studentId === studentId);
    } catch (e) {
      console.warn('getAllForStudent error:', e);
      return local;
    }
  }

  // â”€â”€ GET BY INDEX â”€â”€
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

  // â”€â”€ ADD (alias for put) â”€â”€
  async add(storeName, item) {
    return this.put(storeName, item);
  }

  // â”€â”€ DELETE â”€â”€
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

  // â”€â”€ CLEAR â”€â”€
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

  // â”€â”€ COUNT â”€â”€
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

  // â”€â”€ SET CURRENT USER (called after login) â”€â”€
  setUser(user) {
    this._currentUser = user;
  }

  // ── SEED INITIAL TEMPLATES ──
  async seedTemplates() {
    const trainerId = await this._getTrainerId();
    if (!trainerId) return;

    // Sempre verificar métodos independente do seed de exercícios
    await this.seedMethods();

    const exercisesCount = await this.count('exercises');
    if (exercisesCount < 80) {
      const exercises = [
        // PEITO
        { name: 'Supino Reto com Barra',         muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'ExercÃ­cio base para desenvolvimento do peitoral maior.' },
        { name: 'Supino Inclinado com Halteres',  muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Foco na porÃ§Ã£o clavicular do peitoral.' },
        { name: 'Supino Declinado com Barra',     muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'ÃŠnfase na porÃ§Ã£o inferior do peitoral.' },
        { name: 'Crucifixo Reto',                 muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento do peitoral com amplitude mÃ¡xima.' },
        { name: 'Crucifixo Inclinado',            muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento da porÃ§Ã£o superior do peitoral.' },
        { name: 'Peck Deck (Voador)',             muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Isolamento do peitoral na mÃ¡quina.' },
        { name: 'Cross Over Alto',                muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'ÃŠnfase na porÃ§Ã£o inferior do peitoral.' },
        { name: 'Cross Over Baixo',               muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'ÃŠnfase na porÃ§Ã£o superior do peitoral.' },
        { name: 'FlexÃ£o de BraÃ§os',               muscleGroup: 'Peito',        category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'ExercÃ­cio funcional bÃ¡sico para peitoral.' },
        { name: 'FlexÃ£o Diamante',                muscleGroup: 'Peito',        category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'VariaÃ§Ã£o com Ãªnfase no trÃ­ceps.' },
        { name: 'Supino com Halteres',            muscleGroup: 'Peito',        category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Maior amplitude de movimento que a barra.' },
        // COSTAS
        { name: 'Puxada Frontal',                 muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'Desenvolvimento dos dorsais.' },
        { name: 'Puxada Fechada',                 muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'ÃŠnfase na espessura das costas.' },
        { name: 'Remada Curvada com Barra',       muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'ExercÃ­cio composto para espessura das costas.' },
        { name: 'Remada Unilateral com Halter',   muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Trabalho unilateral para corrigir assimetrias.' },
        { name: 'Remada Baixa (Sentado)',          muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'Foco na porÃ§Ã£o mÃ©dia das costas e romboides.' },
        { name: 'Remada Cavalinho',               muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Remada em mÃ¡quina para espessura das costas.' },
        { name: 'Barra Fixa (Pull-up)',           muscleGroup: 'Costas',       category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'ExercÃ­cio avanÃ§ado de peso corporal.' },
        { name: 'Levantamento Terra',             muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'ExercÃ­cio composto para toda a cadeia posterior.' },
        { name: 'Levantamento Terra Romeno',      muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'ÃŠnfase nos isquiotibiais e glÃºteos.' },
        { name: 'Pullover com Halter',            muscleGroup: 'Costas',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Trabalha serrÃ¡til e dorsal.' },
        // OMBROS
        { name: 'Desenvolvimento com Halteres',   muscleGroup: 'Ombros',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'ExercÃ­cio base para deltoides.' },
        { name: 'Desenvolvimento com Barra',      muscleGroup: 'Ombros',       category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'Maior sobrecarga no desenvolvimento.' },
        { name: 'ElevaÃ§Ã£o Lateral',               muscleGroup: 'Ombros',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento do deltoide lateral.' },
        { name: 'ElevaÃ§Ã£o Frontal',               muscleGroup: 'Ombros',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Foco no deltoide anterior.' },
        { name: 'ElevaÃ§Ã£o Lateral no Cabo',       muscleGroup: 'Ombros',       category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'TensÃ£o constante no deltoide lateral.' },
        { name: 'Face Pull',                      muscleGroup: 'Ombros',       category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'SaÃºde do ombro e deltoide posterior.' },
        { name: 'Arnold Press',                   muscleGroup: 'Ombros',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'VariaÃ§Ã£o do desenvolvimento com rotaÃ§Ã£o.' },
        { name: 'Encolhimento de Ombros',         muscleGroup: 'Ombros',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento do trapÃ©zio.' },
        // BÃCEPS
        { name: 'Rosca Direta com Barra',         muscleGroup: 'BÃ­ceps',       category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'ExercÃ­cio base para bÃ­ceps.' },
        { name: 'Rosca Alternada com Halteres',   muscleGroup: 'BÃ­ceps',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Permite foco unilateral e maior amplitude.' },
        { name: 'Rosca Martelo',                  muscleGroup: 'BÃ­ceps',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Pegada neutra que enfatiza o braquiorradial.' },
        { name: 'Rosca Scott',                    muscleGroup: 'BÃ­ceps',       category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'Isolamento do bÃ­ceps no banco Scott.' },
        { name: 'Rosca Concentrada',              muscleGroup: 'BÃ­ceps',       category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'MÃ¡ximo isolamento do bÃ­ceps.' },
        { name: 'Rosca no Cabo',                  muscleGroup: 'BÃ­ceps',       category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'TensÃ£o constante no bÃ­ceps.' },
        { name: 'Rosca 21',                       muscleGroup: 'BÃ­ceps',       category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'TÃ©cnica avanÃ§ada: 7 parciais baixo + 7 alto + 7 completas.' },
        // TRÃCEPS
        { name: 'TrÃ­ceps Pulley',                 muscleGroup: 'TrÃ­ceps',      category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'ExercÃ­cio padrÃ£o para trÃ­ceps.' },
        { name: 'TrÃ­ceps Testa',                  muscleGroup: 'TrÃ­ceps',      category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'Foco na cabeÃ§a longa do trÃ­ceps.' },
        { name: 'TrÃ­ceps FrancÃªs',                muscleGroup: 'TrÃ­ceps',      category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'ExercÃ­cio overhead para cabeÃ§a longa.' },
        { name: 'TrÃ­ceps Corda',                  muscleGroup: 'TrÃ­ceps',      category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'VariaÃ§Ã£o com corda para maior ativaÃ§Ã£o.' },
        { name: 'Mergulho (Dip)',                 muscleGroup: 'TrÃ­ceps',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'ExercÃ­cio composto para trÃ­ceps e peito inferior.' },
        { name: 'ExtensÃ£o de TrÃ­ceps no Cabo',    muscleGroup: 'TrÃ­ceps',      category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'ExtensÃ£o unilateral no cabo.' },
        { name: 'TrÃ­ceps Coice',                  muscleGroup: 'TrÃ­ceps',      category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Isolamento da cabeÃ§a lateral do trÃ­ceps.' },
        // QUADRÃCEPS
        { name: 'Agachamento Livre com Barra',    muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'Rei dos exercÃ­cios de perna.' },
        { name: 'Agachamento Frontal',            muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'Maior ativaÃ§Ã£o do quadrÃ­ceps.' },
        { name: 'Leg Press 45Â°',                  muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Alta carga com menor demanda de estabilizaÃ§Ã£o.' },
        { name: 'Cadeira Extensora',              muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Isolamento do quadrÃ­ceps.' },
        { name: 'Agachamento BÃºlgaro',            muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'ExercÃ­cio unilateral avanÃ§ado.' },
        { name: 'Passada (AvanÃ§o)',               muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Trabalha quadrÃ­ceps e glÃºteos.' },
        { name: 'Afundo com Barra',               muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'VariaÃ§Ã£o do afundo com maior carga.' },
        { name: 'Hack Squat',                     muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Agachamento guiado com Ãªnfase no quadrÃ­ceps.' },
        { name: 'Agachamento SumÃ´',               muscleGroup: 'QuadrÃ­ceps',   category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Enfatiza glÃºteos e adutores.' },
        // POSTERIOR
        { name: 'Mesa Flexora',                   muscleGroup: 'Posterior',    category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Isolamento dos isquiotibiais deitado.' },
        { name: 'Cadeira Flexora',                muscleGroup: 'Posterior',    category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Isolamento dos isquiotibiais sentado.' },
        { name: 'Stiff com Barra',                muscleGroup: 'Posterior',    category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'Alongamento ativo dos isquiotibiais.' },
        { name: 'Stiff Unilateral',               muscleGroup: 'Posterior',    category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'VersÃ£o unilateral para equilÃ­brio.' },
        { name: 'Good Morning',                   muscleGroup: 'Posterior',    category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'Fortalece eretores e isquiotibiais.' },
        // GLÃšTEOS
        { name: 'Hip Thrust',                     muscleGroup: 'GlÃºteos',      category: 'MusculaÃ§Ã£o', equipment: 'Barra',         loadType: 'weight',     description: 'Melhor exercÃ­cio para glÃºteos.' },
        { name: 'Hip Thrust com Halteres',        muscleGroup: 'GlÃºteos',      category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'VersÃ£o com halteres para variaÃ§Ã£o.' },
        { name: 'AbduÃ§Ã£o na MÃ¡quina',             muscleGroup: 'GlÃºteos',      category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Isolamento do glÃºteo mÃ©dio.' },
        { name: 'Coice no Cabo',                  muscleGroup: 'GlÃºteos',      category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'Isolamento do glÃºteo mÃ¡ximo.' },
        { name: 'Ponte de GlÃºteos',               muscleGroup: 'GlÃºteos',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'VersÃ£o sem carga do hip thrust.' },
        { name: 'Agachamento SumÃ´ com Halter',    muscleGroup: 'GlÃºteos',      category: 'MusculaÃ§Ã£o', equipment: 'Halteres',      loadType: 'weight',     description: 'Enfatiza glÃºteos e adutores.' },
        // PANTURRILHA
        { name: 'Panturrilha em PÃ©',              muscleGroup: 'Panturrilha',  category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Foco no gastrocnÃªmio.' },
        { name: 'Panturrilha Sentado',            muscleGroup: 'Panturrilha',  category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'Foco no sÃ³leo.' },
        { name: 'Panturrilha no Leg Press',       muscleGroup: 'Panturrilha',  category: 'MusculaÃ§Ã£o', equipment: 'MÃ¡quina',       loadType: 'weight',     description: 'VariaÃ§Ã£o com maior amplitude.' },
        // CORE / ABDÃ”MEN
        { name: 'Abdominal Crunch',               muscleGroup: 'AbdÃ´men',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'FlexÃ£o do tronco para reto abdominal.' },
        { name: 'Abdominal Infra',                muscleGroup: 'AbdÃ´men',      category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'ElevaÃ§Ã£o de pernas para abdÃ´men inferior.' },
        { name: 'Crunch no Cabo',                 muscleGroup: 'AbdÃ´men',      category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'Abdominal com sobrecarga.' },
        { name: 'Prancha Frontal',                muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'time',       defaultReps: '30s', description: 'ExercÃ­cio isomÃ©trico para estabilizaÃ§Ã£o do core.' },
        { name: 'Prancha Lateral',                muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'time',       defaultReps: '20s', description: 'EstabilizaÃ§Ã£o lateral do core e oblÃ­quos.' },
        { name: 'Prancha com Toque no Ombro',     muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'AntirrotaÃ§Ã£o e estabilidade do core.' },
        { name: 'Russian Twist',                  muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'RotaÃ§Ã£o do tronco para oblÃ­quos.' },
        { name: 'Dead Bug',                       muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'EstabilizaÃ§Ã£o lombar em decÃºbito.' },
        { name: 'Bird Dog',                       muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', loadType: 'bodyweight', description: 'CoordenaÃ§Ã£o e estabilidade lombo-pÃ©lvica.' },
        { name: 'Rollout com Roda',               muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Roda abdominal',loadType: 'bodyweight', description: 'Anti-extensÃ£o avanÃ§ada para core.' },
        { name: 'RotaÃ§Ã£o com Cabo',               muscleGroup: 'Core',         category: 'MusculaÃ§Ã£o', equipment: 'Cabo',          loadType: 'weight',     description: 'RotaÃ§Ã£o de tronco com resistÃªncia.' },
        // CARDIO / ENDURANCE â€” expandido
        { name: 'Esteira - Corrida',               muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Esteira',        loadType: 'time',       defaultReps: '20min', intensityField: 'speed_kmh',  description: 'Corrida aerÃ³bica. Registre velocidade (km/h).' },
        { name: 'Esteira - Caminhada',             muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Esteira',        loadType: 'time',       defaultReps: '30min', intensityField: 'speed_kmh',  description: 'Caminhada aerÃ³bica de baixa intensidade.' },
        { name: 'Esteira - Intervalado (HIIT)',    muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Esteira',        loadType: 'time',       defaultReps: '30s',   intensityField: 'speed_kmh',  description: 'Sprint + recuperaÃ§Ã£o. Ex: 30s rÃ¡pido / 90s lento.' },
        { name: 'Corrida ao Ar Livre',             muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '30min', intensityField: 'pace_min_km',description: 'Corrida externa. Registre pace (min/km).' },
        { name: 'Caminhada ao Ar Livre',           muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '40min', intensityField: 'pace_min_km',description: 'Caminhada externa de baixa intensidade.' },
        { name: 'Bicicleta ErgomÃ©trica',           muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Bicicleta',      loadType: 'time',       defaultReps: '20min', intensityField: 'watts',      description: 'Pedalada indoor. Registre potÃªncia (watts) ou RPM.' },
        { name: 'Bicicleta ErgomÃ©trica - HIIT',   muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Bicicleta',      loadType: 'time',       defaultReps: '20s',   intensityField: 'watts',      description: 'Sprint de 20s + recuperaÃ§Ã£o de 40s. 8-12 rounds (Tabata).' },
        { name: 'Ciclismo ao Ar Livre',            muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Bicicleta',      loadType: 'time',       defaultReps: '45min', intensityField: 'speed_kmh',  description: 'Pedalar externo. Registre velocidade e distÃ¢ncia.' },
        { name: 'ElÃ­ptico',                        muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'ElÃ­ptico',       loadType: 'time',       defaultReps: '20min', intensityField: 'level',      description: 'AerÃ³bico de baixo impacto. Registre nÃ­vel de resistÃªncia.' },
        { name: 'Remo ErgomÃ©trico',                muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Remo',           loadType: 'time',       defaultReps: '15min', intensityField: 'pace_500m',  description: 'Remo indoor. Registre pace/500m e dividir por splits.' },
        { name: 'Remo ErgomÃ©trico - Sprint',       muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Remo',           loadType: 'time',       defaultReps: '250m',  intensityField: 'pace_500m',  description: 'Sprints de 250m com recuperaÃ§Ã£o ativa.' },
        { name: 'NataÃ§Ã£o - Nado Livre',            muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Piscina',        loadType: 'time',       defaultReps: '30min', intensityField: 'pace_100m',  description: 'Nado contÃ­nuo. Registre pace/100m.' },
        { name: 'NataÃ§Ã£o - Intervalado',           muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Piscina',        loadType: 'time',       defaultReps: '50m',   intensityField: 'pace_100m',  description: 'Series de 50m com descanso controlado.' },
        { name: 'Pular Corda',                     muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Corda',          loadType: 'time',       defaultReps: '2min',  intensityField: 'jumps_min',  description: 'AerÃ³bico de alta intensidade. Ã“timo para coordenaÃ§Ã£o.' },
        { name: 'Pular Corda - Dupla Entrada',    muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Corda',          loadType: 'time',       defaultReps: '30s',   intensityField: 'jumps_min',  description: 'TÃ©cnica avanÃ§ada. Alta demanda cardiovascular.' },
        { name: 'HIIT Tabata',                     muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Variado',        loadType: 'time',       defaultReps: '20s',   intensityField: 'level',      description: '20s max / 10s repouso Ã— 8 rounds = 4min. Alta intensidade.' },
        { name: 'HIIT 30-30',                      muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Variado',        loadType: 'time',       defaultReps: '30s',   intensityField: 'level',      description: '30s esforÃ§o mÃ¡ximo / 30s recuperaÃ§Ã£o ativa. 8-12 rounds.' },
        { name: 'HIIT PirÃ¢mide',                   muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Variado',        loadType: 'time',       defaultReps: '30s',   intensityField: 'level',      description: '30sâ†’60sâ†’90sâ†’60sâ†’30s de esforÃ§o, com igual recuperaÃ§Ã£o.' },
        { name: 'Fartlek',                         muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '30min', intensityField: 'speed_kmh',  description: 'Corrida com variaÃ§Ãµes espontÃ¢neas de ritmo e intensidade.' },
        { name: 'Corrida de Limiar (Tempo Run)',   muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '20min', intensityField: 'pace_min_km',description: 'Corrida no limiar anaerÃ³bio. ~80-85% FC MÃ¡x.' },
        { name: 'Corrida Longa (LSD)',             muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Nenhum',         loadType: 'time',       defaultReps: '60min', intensityField: 'pace_min_km',description: 'Long Slow Distance. 60-75% FC MÃ¡x. Base aerÃ³bica.' },
        { name: 'Corrida em Pista - Intervalado', muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Pista',          loadType: 'time',       defaultReps: '400m',  intensityField: 'pace_min_km',description: 'Series de 400m, 800m ou 1km com recuperaÃ§Ã£o ativa.' },
        { name: 'Step AerÃ³bico',                   muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Step',           loadType: 'time',       defaultReps: '30min', intensityField: 'level',      description: 'AerÃ³bico com step. Baixo impacto, boa coordenaÃ§Ã£o.' },
        { name: 'Spinning',                        muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Bicicleta',      loadType: 'time',       defaultReps: '45min', intensityField: 'watts',      description: 'Ciclismo indoor em grupo. Alta intensidade.' },
        { name: 'Escalador de Montanha',           muscleGroup: 'Cardio',        category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s',   intensityField: 'reps',       description: 'Mountain climber. Core + cardio.' },
        { name: 'Jumping Jack',                    muscleGroup: 'Cardio',        category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s',   intensityField: 'reps',       description: 'Polichinelo. Aquecimento e cardio leve.' },
        { name: 'Agachamento com Salto',           muscleGroup: 'Cardio',        category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'bodyweight', defaultReps: '15',    intensityField: 'reps',       description: 'Jump squat. PotÃªncia + cardio metabÃ³lico.' },
        { name: 'Burpee',                          muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Peso corporal',  loadType: 'bodyweight', defaultReps: '10',    intensityField: 'reps',       description: 'ExercÃ­cio metabÃ³lico completo. Alta demanda cardiorrespiratÃ³ria.' },
        { name: 'Kettlebell Swing',                muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Kettlebell',     loadType: 'weight',     defaultReps: '15',    intensityField: 'weight',     description: 'Movimento explosivo de quadril. Cardio + forÃ§a.' },
        { name: 'Battle Rope - Ondas Alternadas', muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Corda',          loadType: 'time',       defaultReps: '30s',   intensityField: 'reps',       description: 'Cardio de alta intensidade. Ombros e core.' },
        { name: 'Box Jump',                        muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Caixote',        loadType: 'bodyweight', defaultReps: '10',    intensityField: 'height_cm',  description: 'Salto explosivo. PotÃªncia de membros inferiores.' },
        { name: 'Assault Bike',                    muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Assault Bike',   loadType: 'time',       defaultReps: '20s',   intensityField: 'calories',   description: 'Bicicleta com braÃ§os. Exige todo o corpo. Alta intensidade.' },
        { name: 'Ski Erg',                         muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Ski Erg',        loadType: 'time',       defaultReps: '500m',  intensityField: 'pace_500m',  description: 'Simulador de esqui nÃ³rdico. Core + cardio.' },
        { name: 'Air Runner',                      muscleGroup: 'Cardio',        category: 'Cardio',     equipment: 'Air Runner',     loadType: 'time',       defaultReps: '200m',  intensityField: 'pace_min_km',description: 'Esteira nÃ£o motorizada. Mais demanda do que a convencional.' },
        // FUNCIONAIS jÃ¡ existentes mantidos abaixo
        { name: 'Kettlebell Goblet Squat',         muscleGroup: 'QuadrÃ­ceps',    category: 'Funcional',  equipment: 'Kettlebell',     loadType: 'weight',     description: 'Agachamento com kettlebell.' },
        { name: 'Turkish Get-Up',                  muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Kettlebell',     loadType: 'weight',     description: 'Movimento complexo para estabilidade total.' },
        { name: 'Farmer Walk',                     muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Halteres',       loadType: 'weight',     description: 'Caminhada com carga para forÃ§a funcional.' },
        { name: 'Slam Ball',                       muscleGroup: 'Corpo Inteiro', category: 'Funcional',  equipment: 'Medicine Ball',  loadType: 'weight',     description: 'PotÃªncia e forÃ§a explosiva.' },
        // MOBILIDADE
        { name: 'Alongamento de Quadril',          muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s', description: 'Flexibilidade do flexor do quadril.' },
        { name: 'RotaÃ§Ã£o TorÃ¡cica',                muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '30s', description: 'Mobilidade da coluna torÃ¡cica.' },
        { name: 'Hip 90/90',                       muscleGroup: 'Mobilidade',    category: 'Mobilidade', equipment: 'Peso corporal',  loadType: 'time',       defaultReps: '45s', description: 'Mobilidade de quadril em rotaÃ§Ã£o interna/externa.' },
        { name: 'Abertura de Quadril com Haltere', muscleGroup: 'GlÃºteos',       category: 'Mobilidade', equipment: 'Halteres',       loadType: 'weight',     description: 'Fortalecimento e mobilidade do glÃºteo mÃ©dio.' },
      ];

      const existing = await this.getAll('exercises');
      
      // Clean up legacy non-deterministic default templates for this trainer
      const defaultToClean = existing.filter(e => e.is_default && !e.id.startsWith('ex_'));
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
      // ForÃ§a / Hipertrofia
      { name: 'Drop-set',       category: 'Hipertrofia', description: 'Executar atÃ© a falha, reduzir carga ~20% e continuar sem descanso. Repetir 2-3x.', sets: '3+drops', repsHint: '8-12 + drops', restHint: '120-180s entre drop-sets completos' },
      { name: 'PirÃ¢mide Crescente',  category: 'ForÃ§a',        description: 'Aumentar carga a cada sÃ©rie, reduzir reps: 15â†’12â†’10â†’8. Boa para progressÃ£o de forÃ§a.', sets: '4', repsHint: '15â†’12â†’10â†’8', restHint: '90-120s' },
      { name: 'PirÃ¢mide Decrescente',category: 'ForÃ§a',        description: 'Inicia pesado e reduz carga: 8â†’10â†’12â†’15. Trabalha forÃ§a e resistÃªncia na mesma sessÃ£o.', sets: '4', repsHint: '8â†’10â†’12â†’15', restHint: '90-120s' },
      { name: 'PirÃ¢mide Dupla',      category: 'Hipertrofia',  description: 'Crescente depois decrescente: 15â†’12â†’10â†’8â†’10â†’12â†’15. MÃ¡ximo volume. Mais desgastante.', sets: '7', repsHint: '15â†’12â†’10â†’8â†’10â†’12â†’15', restHint: '90s' },
      { name: 'PirÃ¢mide Completa',   category: 'Hipertrofia',  description: 'VersÃ£o estendida com 10 sÃ©ries: 20â†’15â†’12â†’10â†’8â†’6â†’8â†’10â†’12â†’15. Volume e intensidade mÃ¡ximos. Para avanÃ§ados.', sets: '10', repsHint: '20â†’15â†’12â†’10â†’8â†’6â†’8â†’10â†’12â†’15', restHint: '90-120s' },
      { name: 'Rest-Pause',      category: 'ForÃ§a',       description: 'Executar atÃ© a falha, descanso de 15-20s, continuar atÃ© nova falha. 2-3 mini-sÃ©ries.', sets: '1-3', repsHint: 'AtÃ© a falha + pausa', restHint: '15-20s entre mini-sÃ©ries' },
      { name: 'Super-sÃ©rie Agonista', category: 'Hipertrofia', description: 'Dois exercÃ­cios do mesmo grupo muscular sem descanso. Ex: Supino + Crucifixo.', sets: '3', repsHint: '10-12 cada', restHint: '90s apÃ³s o par' },
      { name: 'Super-sÃ©rie Antagonista', category: 'Hipertrofia', description: 'Dois exercÃ­cios de grupos opostos sem descanso. Ex: Rosca + TrÃ­ceps.', sets: '3', repsHint: '10-12 cada', restHint: '60s apÃ³s o par' },
      { name: 'Tri-set',         category: 'Hipertrofia', description: 'TrÃªs exercÃ­cios consecutivos sem descanso. Alto estÃ­mulo metabÃ³lico.', sets: '3', repsHint: '8-12 cada', restHint: '120s apÃ³s o tri' },
      { name: 'SÃ©rie Gigante',   category: 'Hipertrofia', description: '4+ exercÃ­cios consecutivos. MÃ¡ximo estÃ­mulo. Reduzir cargas.', sets: '3', repsHint: '10-15 cada', restHint: '180s apÃ³s o set' },
      { name: 'Cluster',         category: 'ForÃ§a',       description: 'Carga 85-95% 1RM. ExecuÃ§Ã£o: 2-3 reps, pausa 10-15s, repetir atÃ© 5 cluster. ForÃ§a mÃ¡xima.', sets: '5', repsHint: '2-3 por cluster', restHint: '10-15s entre clusters; 3-5min entre sets' },
      { name: 'ExcÃªntrico Acentuado', category: 'Hipertrofia', description: 'Fase excÃªntrica 4-6 segundos. Provoca mais dano muscular e hipertrofia.', sets: '3-4', repsHint: '6-8', restHint: '120s' },
      { name: 'Isometria',       category: 'ForÃ§a',       description: 'SustentaÃ§Ã£o em posiÃ§Ã£o de tensÃ£o por 30-60s. Boa para estabilizaÃ§Ã£o.', sets: '3', repsHint: '30-60s', restHint: '90s' },
      { name: 'PrÃ©-exaustÃ£o',    category: 'Hipertrofia', description: 'Isolamento antes do composto. Ex: Crucifixo â†’ Supino. Fatiga o mÃºsculo-alvo primeiro.', sets: '3', repsHint: '12 iso + 8-10 composto', restHint: '0s entre, 120s entre sÃ©ries' },
      { name: 'Bi-set',          category: 'Hipertrofia', description: 'Dois exercÃ­cios para o mesmo mÃºsculo, sem pausa.', sets: '3-4', repsHint: '10 cada', restHint: '90s apÃ³s o par' },
      { name: '21s',             category: 'Hipertrofia', description: '7 reps parciais (0-90Â°) + 7 reps parciais (90-180Â°) + 7 reps completas = 21.', sets: '3', repsHint: '21 (7+7+7)', restHint: '90-120s' },
      { name: 'Stripping',       category: 'Hipertrofia', description: 'Similar ao drop-set com barra: remover anilhas sem parar.', sets: '1 longa', repsHint: 'AtÃ© a falha com cada carga', restHint: '120-180s' },
      { name: 'FST-7',           category: 'Hipertrofia', description: '7 sÃ©ries do exercÃ­cio isolador com 30-45s descanso. Alta congestÃ£o.', sets: '7', repsHint: '12-15', restHint: '30-45s' },
      // Cardio / Endurance
      { name: 'Zona 1 (Z1)',     category: 'Cardio',      description: '<65% FC MÃ¡x. RecuperaÃ§Ã£o ativa, base aerÃ³bica.', sets: '1', repsHint: '20-60min contÃ­nuo', restHint: 'Sem descanso' },
      { name: 'Zona 2 (Z2)',     category: 'Cardio',      description: '65-75% FC MÃ¡x. Base aerÃ³bica. Longo e lento.', sets: '1', repsHint: '30-90min contÃ­nuo', restHint: 'Sem descanso' },
      { name: 'Zona 3 (Z3)',     category: 'Cardio',      description: '75-80% FC MÃ¡x. Limiar aerÃ³bico inferior.', sets: '1', repsHint: '20-40min', restHint: 'Sem descanso' },
      { name: 'Zona 4 (Z4) â€” Limiar', category: 'Cardio', description: '80-90% FC MÃ¡x. Limiar anaerÃ³bio.', sets: '1-3', repsHint: '10-20min', restHint: '5min recuperaÃ§Ã£o ativa entre blocos' },
      { name: 'Zona 5 (Z5) â€” VO2max', category: 'Cardio', description: '90-100% FC MÃ¡x. Intervalos curtos. Melhora VO2max.', sets: '4-8', repsHint: '3-5min esforÃ§o', restHint: '3-5min recuperaÃ§Ã£o' },
      { name: 'Tabata',          category: 'Cardio',      description: '20s mÃ¡ximo / 10s repouso Ã— 8 rounds = 4min.', sets: '1-3 blocos', repsHint: '20s esforÃ§o / 10s repouso', restHint: '60-90s entre blocos' },
      { name: 'HIIT 1:2',        category: 'Cardio',      description: 'Ratio 1:2 trabalho:descanso. 30s esforÃ§o / 60s recuperaÃ§Ã£o. 8-12 rounds.', sets: '8-12', repsHint: '30s esforÃ§o', restHint: '60s recuperaÃ§Ã£o ativa' },
      { name: 'HIIT 1:1',        category: 'Cardio',      description: 'Ratio 1:1. 30s esforÃ§o / 30s recuperaÃ§Ã£o. Mais intenso.', sets: '8-12', repsHint: '30s esforÃ§o', restHint: '30s recuperaÃ§Ã£o ativa' },
      { name: 'SIT (Sprint Interval Training)', category: 'Cardio', description: 'Sprints de 10-30s mÃ¡ximos. Melhora potÃªncia anaerÃ³bica.', sets: '4-6', repsHint: '10-30s sprint', restHint: '2-4min recuperaÃ§Ã£o completa' },
      { name: 'SÃ©rie de RepetiÃ§Ã£o (VO2max)', category: 'Cardio', description: 'Intervalos de 3-5min a 95-100% VO2max.', sets: '4-6', repsHint: '3-5min', restHint: 'Igual ao esforÃ§o' },
      { name: 'Steady State',    category: 'Cardio',      description: 'Ritmo constante e moderado. Zona 2-3. Base aerÃ³bica.', sets: '1', repsHint: '20-60min', restHint: 'Sem descanso' },
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


  // â”€â”€ RESEED ADMIN â€” marca todos os padrÃµes (chamado pelo painel admin) â”€â”€
  async reseedDefaults() {
    // Marcar todos os exercÃ­cios existentes como padrÃ£o
    const exercises = await this.getAll('exercises');
    for (const e of exercises) {
      if (!e.is_default) await this.put('exercises', { ...e, is_default: true });
    }
    // Marcar todos os mÃ©todos existentes como padrÃ£o
    const methods = await this.getAll('methods');
    for (const m of methods) {
      if (!m.is_default) await this.put('methods', { ...m, is_default: true });
    }
    return { exercises: exercises.length, methods: methods.length };
  }


  // â”€â”€ GLOBAL DATA (admin defaults â€” visible to all) â”€â”€
  // ExercÃ­cios/mÃ©todos/templates com is_default=true sÃ£o globais
  // NÃ£o filtrados por trainer_id
  async getGlobal(storeName) {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from(storeName)
          .select('data')
          .eq('is_default', true);
        if (!error && data?.length) return data.map(r => r.data);
      } catch(_) {}
    }
    // Fallback: LocalStorage global (sem trainer_id)
    try {
      const raw = localStorage.getItem(`pp_global_${storeName}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  // â”€â”€ GET ALL (user data + global defaults merged) â”€â”€
  async getAllWithGlobal(storeName) {
    const [userItems, globalItems] = await Promise.all([
      this.getAll(storeName),
      this.getGlobal(storeName),
    ]);
    // Merge: globais primeiro, depois os do usuÃ¡rio (sem duplicar ids)
    const userIds = new Set(userItems.map(i => i.id));
    const merged  = [...globalItems.filter(g => !userIds.has(g.id)), ...userItems];
    return merged;
  }

  // â”€â”€ SEED GLOBAL DEFAULTS (admin only) â”€â”€
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
