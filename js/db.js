// ========================================
// PERSONAL PRO — Database (v3)
// Supabase Auth + Multi-Tenant Isolation
// All records scoped to trainer_id (user.id)
// ========================================

import { getSupabase, getCurrentUser } from './utils/auth.js';

const SUPABASE_URL = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

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
    const local = this._getLocal(storeName, trainerId).find(i => i.id === id) || null;
    if (!this.supabase) return local;

    try {
      let q = this.supabase.from(storeName).select('data').eq('id', id);
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { data, error } = await q.single();
      if (error && error.code !== 'PGRST116') return local;
      return data ? data.data : local;
    } catch { return local; }
  }

  // ── GET ALL RECORDS ──
  async getAll(storeName) {
    const trainerId = await this._getTrainerId();
    const local = this._getLocal(storeName, trainerId);
    if (!this.supabase) return local;

    try {
      let q = this.supabase.from(storeName).select('data');
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { data, error } = await q;
      if (error) return local;
      const remote = data ? data.map(r => r.data) : local;
      // Sync local cache
      this._saveLocal(storeName, remote, trainerId);
      return remote;
    } catch { return local; }
  }

  // ── GET BY INDEX ──
  async getByIndex(storeName, indexName, value) {
    const all = await this.getAll(storeName);
    return all.filter(item => item && item[indexName] === value);
  }

  // ── PUT (UPSERT) ──
  async put(storeName, item) {
    const trainerId = await this._getTrainerId();

    // Normalize id
    if (!item.id && item.key) item.id = item.key;
    if (!item.id) item.id = crypto.randomUUID();
    item.updatedAt = new Date().toISOString();
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    if (trainerId) item.trainer_id = trainerId;

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

  // ── SET CURRENT USER (called after login) ──
  setUser(user) {
    this._currentUser = user;
  }

  // ── SEED INITIAL TEMPLATES ──
  async seedTemplates() {
    const exercisesCount = await this.count('exercises');
    if (exercisesCount < 80) {
      const exercises = [
        // PEITO
        { name: 'Supino Reto com Barra',         muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Barra',         description: 'Exercício base para desenvolvimento do peitoral maior.' },
        { name: 'Supino Inclinado com Halteres',  muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      description: 'Foco na porção clavicular do peitoral.' },
        { name: 'Supino Declinado com Barra',     muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Barra',         description: 'Ênfase na porção inferior do peitoral.' },
        { name: 'Crucifixo Reto',                 muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      description: 'Isolamento do peitoral com amplitude máxima.' },
        { name: 'Crucifixo Inclinado',            muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      description: 'Isolamento da porção superior do peitoral.' },
        { name: 'Peck Deck (Voador)',             muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Máquina',       description: 'Isolamento do peitoral na máquina.' },
        { name: 'Cross Over Alto',                muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Cabo',          description: 'Ênfase na porção inferior do peitoral.' },
        { name: 'Cross Over Baixo',               muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Cabo',          description: 'Ênfase na porção superior do peitoral.' },
        { name: 'Flexão de Braços',               muscleGroup: 'Peito',        category: 'Funcional',  equipment: 'Peso corporal', description: 'Exercício funcional básico para peitoral.' },
        { name: 'Flexão Diamante',                muscleGroup: 'Peito',        category: 'Funcional',  equipment: 'Peso corporal', description: 'Variação com ênfase no tríceps.' },
        { name: 'Supino com Halteres',            muscleGroup: 'Peito',        category: 'Musculação', equipment: 'Halteres',      description: 'Maior amplitude de movimento que a barra.' },
        // COSTAS
        { name: 'Puxada Frontal',                 muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          description: 'Desenvolvimento dos dorsais.' },
        { name: 'Puxada Fechada',                 muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          description: 'Ênfase na espessura das costas.' },
        { name: 'Remada Curvada com Barra',       muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Barra',         description: 'Exercício composto para espessura das costas.' },
        { name: 'Remada Unilateral com Halter',   muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Halteres',      description: 'Trabalho unilateral para corrigir assimetrias.' },
        { name: 'Remada Baixa (Sentado)',          muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Cabo',          description: 'Foco na porção média das costas e romboides.' },
        { name: 'Remada Cavalinho',               muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Máquina',       description: 'Remada em máquina para espessura das costas.' },
        { name: 'Barra Fixa (Pull-up)',           muscleGroup: 'Costas',       category: 'Funcional',  equipment: 'Peso corporal', description: 'Exercício avançado de peso corporal.' },
        { name: 'Levantamento Terra',             muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Barra',         description: 'Exercício composto para toda a cadeia posterior.' },
        { name: 'Levantamento Terra Romeno',      muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Barra',         description: 'Ênfase nos isquiotibiais e glúteos.' },
        { name: 'Pullover com Halter',            muscleGroup: 'Costas',       category: 'Musculação', equipment: 'Halteres',      description: 'Trabalha serrátil e dorsal.' },
        // OMBROS
        { name: 'Desenvolvimento com Halteres',   muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      description: 'Exercício base para deltoides.' },
        { name: 'Desenvolvimento com Barra',      muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Barra',         description: 'Maior sobrecarga no desenvolvimento.' },
        { name: 'Elevação Lateral',               muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      description: 'Isolamento do deltoide lateral.' },
        { name: 'Elevação Frontal',               muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      description: 'Foco no deltoide anterior.' },
        { name: 'Elevação Lateral no Cabo',       muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Cabo',          description: 'Tensão constante no deltoide lateral.' },
        { name: 'Face Pull',                      muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Cabo',          description: 'Saúde do ombro e deltoide posterior.' },
        { name: 'Arnold Press',                   muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      description: 'Variação do desenvolvimento com rotação.' },
        { name: 'Encolhimento de Ombros',         muscleGroup: 'Ombros',       category: 'Musculação', equipment: 'Halteres',      description: 'Isolamento do trapézio.' },
        // BÍCEPS
        { name: 'Rosca Direta com Barra',         muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         description: 'Exercício base para bíceps.' },
        { name: 'Rosca Alternada com Halteres',   muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Halteres',      description: 'Permite foco unilateral e maior amplitude.' },
        { name: 'Rosca Martelo',                  muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Halteres',      description: 'Pegada neutra que enfatiza o braquiorradial.' },
        { name: 'Rosca Scott',                    muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         description: 'Isolamento do bíceps no banco Scott.' },
        { name: 'Rosca Concentrada',              muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Halteres',      description: 'Máximo isolamento do bíceps.' },
        { name: 'Rosca no Cabo',                  muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Cabo',          description: 'Tensão constante no bíceps.' },
        { name: 'Rosca 21',                       muscleGroup: 'Bíceps',       category: 'Musculação', equipment: 'Barra',         description: 'Técnica avançada: 7 parciais baixo + 7 alto + 7 completas.' },
        // TRÍCEPS
        { name: 'Tríceps Pulley',                 muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Cabo',          description: 'Exercício padrão para tríceps.' },
        { name: 'Tríceps Testa',                  muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Barra',         description: 'Foco na cabeça longa do tríceps.' },
        { name: 'Tríceps Francês',                muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Halteres',      description: 'Exercício overhead para cabeça longa.' },
        { name: 'Tríceps Corda',                  muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Cabo',          description: 'Variação com corda para maior ativação.' },
        { name: 'Mergulho (Dip)',                 muscleGroup: 'Tríceps',      category: 'Funcional',  equipment: 'Peso corporal', description: 'Exercício composto para tríceps e peito inferior.' },
        { name: 'Extensão de Tríceps no Cabo',    muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Cabo',          description: 'Extensão unilateral no cabo.' },
        { name: 'Tríceps Coice',                  muscleGroup: 'Tríceps',      category: 'Musculação', equipment: 'Halteres',      description: 'Isolamento da cabeça lateral do tríceps.' },
        // QUADRÍCEPS
        { name: 'Agachamento Livre com Barra',    muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Barra',         description: 'Rei dos exercícios de perna.' },
        { name: 'Agachamento Frontal',            muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Barra',         description: 'Maior ativação do quadríceps.' },
        { name: 'Leg Press 45°',                  muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Máquina',       description: 'Alta carga com menor demanda de estabilização.' },
        { name: 'Cadeira Extensora',              muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Máquina',       description: 'Isolamento do quadríceps.' },
        { name: 'Agachamento Búlgaro',            muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      description: 'Exercício unilateral avançado.' },
        { name: 'Passada (Avanço)',               muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      description: 'Trabalha quadríceps e glúteos.' },
        { name: 'Afundo com Barra',               muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Barra',         description: 'Variação do afundo com maior carga.' },
        { name: 'Hack Squat',                     muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Máquina',       description: 'Agachamento guiado com ênfase no quadríceps.' },
        { name: 'Agachamento Sumô',               muscleGroup: 'Quadríceps',   category: 'Musculação', equipment: 'Halteres',      description: 'Enfatiza glúteos e adutores.' },
        // POSTERIOR / ISQUIOTIBIAIS
        { name: 'Mesa Flexora',                   muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Máquina',       description: 'Isolamento dos isquiotibiais deitado.' },
        { name: 'Cadeira Flexora',                muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Máquina',       description: 'Isolamento dos isquiotibiais sentado.' },
        { name: 'Stiff com Barra',                muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Barra',         description: 'Alongamento ativo dos isquiotibiais.' },
        { name: 'Stiff Unilateral',               muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Halteres',      description: 'Versão unilateral para equilíbrio.' },
        { name: 'Good Morning',                   muscleGroup: 'Posterior',    category: 'Musculação', equipment: 'Barra',         description: 'Fortalece eretores e isquiotibiais.' },
        // GLÚTEOS
        { name: 'Hip Thrust',                     muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Barra',         description: 'Melhor exercício para glúteos.' },
        { name: 'Hip Thrust com Halteres',        muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Halteres',      description: 'Versão com halteres para variação.' },
        { name: 'Abdução na Máquina',             muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Máquina',       description: 'Isolamento do glúteo médio.' },
        { name: 'Coice no Cabo',                  muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Cabo',          description: 'Isolamento do glúteo máximo.' },
        { name: 'Ponte de Glúteos',               muscleGroup: 'Glúteos',      category: 'Funcional',  equipment: 'Peso corporal', description: 'Versão sem carga do hip thrust.' },
        { name: 'Agachamento Sumô com Halter',    muscleGroup: 'Glúteos',      category: 'Musculação', equipment: 'Halteres',      description: 'Enfatiza glúteos e adutores.' },
        // PANTURRILHA
        { name: 'Panturrilha em Pé',              muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       description: 'Foco no gastrocnêmio.' },
        { name: 'Panturrilha Sentado',            muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       description: 'Foco no sóleo.' },
        { name: 'Panturrilha no Leg Press',       muscleGroup: 'Panturrilha',  category: 'Musculação', equipment: 'Máquina',       description: 'Variação com maior amplitude.' },
        // CORE / ABDÔMEN
        { name: 'Abdominal Crunch',               muscleGroup: 'Abdômen',      category: 'Funcional',  equipment: 'Peso corporal', description: 'Flexão do tronco para reto abdominal.' },
        { name: 'Abdominal Infra',                muscleGroup: 'Abdômen',      category: 'Funcional',  equipment: 'Peso corporal', description: 'Elevação de pernas para abdômen inferior.' },
        { name: 'Crunch no Cabo',                 muscleGroup: 'Abdômen',      category: 'Musculação', equipment: 'Cabo',          description: 'Abdominal com sobrecarga.' },
        { name: 'Prancha Frontal',                muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', description: 'Exercício isométrico para estabilização do core.' },
        { name: 'Prancha Lateral',                muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', description: 'Estabilização lateral do core e oblíquos.' },
        { name: 'Prancha com Toque no Ombro',     muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', description: 'Antirrotação e estabilidade do core.' },
        { name: 'Russian Twist',                  muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', description: 'Rotação do tronco para oblíquos.' },
        { name: 'Dead Bug',                       muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', description: 'Estabilização lombar em decúbito.' },
        { name: 'Bird Dog',                       muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Peso corporal', description: 'Coordenação e estabilidade lombo-pélvica.' },
        { name: 'Rollout com Roda',               muscleGroup: 'Core',         category: 'Funcional',  equipment: 'Roda abdominal', description: 'Anti-extensão avançada para core.' },
        { name: 'Rotação com Cabo',               muscleGroup: 'Core',         category: 'Musculação', equipment: 'Cabo',          description: 'Rotação de tronco com resistência.' },
        // CARDIO / METABÓLICO
        { name: 'Esteira - Corrida',              muscleGroup: 'Cardio',       category: 'Cardio',     equipment: 'Esteira',       description: 'Atividade aeróbica de média a alta intensidade.' },
        { name: 'Esteira - Caminhada',            muscleGroup: 'Cardio',       category: 'Cardio',     equipment: 'Esteira',       description: 'Aeróbico de baixa intensidade.' },
        { name: 'Bicicleta Ergométrica',          muscleGroup: 'Cardio',       category: 'Cardio',     equipment: 'Bicicleta',     description: 'Baixo impacto articular.' },
        { name: 'Elíptico',                       muscleGroup: 'Cardio',       category: 'Cardio',     equipment: 'Elíptico',      description: 'Aeróbico de baixo impacto articular.' },
        { name: 'Remo Ergométrico',               muscleGroup: 'Cardio',       category: 'Cardio',     equipment: 'Remo',          description: 'Cardio de corpo inteiro.' },
        { name: 'HIIT Genérico',                  muscleGroup: 'Cardio',       category: 'Cardio',     equipment: 'Variado',       description: 'Treino Intervalado de Alta Intensidade.' },
        // FUNCIONAL / FULL BODY
        { name: 'Burpee',                         muscleGroup: 'Corpo Inteiro',category: 'Funcional',  equipment: 'Peso corporal', description: 'Exercício metabólico completo.' },
        { name: 'Kettlebell Swing',               muscleGroup: 'Corpo Inteiro',category: 'Funcional',  equipment: 'Kettlebell',    description: 'Movimento explosivo de quadril.' },
        { name: 'Kettlebell Goblet Squat',        muscleGroup: 'Quadríceps',   category: 'Funcional',  equipment: 'Kettlebell',    description: 'Agachamento com kettlebell.' },
        { name: 'Turkish Get-Up',                 muscleGroup: 'Corpo Inteiro',category: 'Funcional',  equipment: 'Kettlebell',    description: 'Movimento complexo para estabilidade total.' },
        { name: 'Box Jump',                       muscleGroup: 'Corpo Inteiro',category: 'Funcional',  equipment: 'Caixote',       description: 'Salto explosivo para potência.' },
        { name: 'Farmer Walk',                    muscleGroup: 'Corpo Inteiro',category: 'Funcional',  equipment: 'Halteres',      description: 'Caminhada com carga para força funcional.' },
        { name: 'Battle Rope',                    muscleGroup: 'Corpo Inteiro',category: 'Funcional',  equipment: 'Corda',         description: 'Exercício metabólico de alta intensidade.' },
        { name: 'Slam Ball',                      muscleGroup: 'Corpo Inteiro',category: 'Funcional',  equipment: 'Medicine Ball', description: 'Potência e força explosiva.' },
        // MOBILIDADE / REABILITAÇÃO
        { name: 'Alongamento de Quadril',         muscleGroup: 'Mobilidade',   category: 'Mobilidade', equipment: 'Peso corporal', description: 'Flexibilidade do flexor do quadril.' },
        { name: 'Rotação Torácica',               muscleGroup: 'Mobilidade',   category: 'Mobilidade', equipment: 'Peso corporal', description: 'Mobilidade da coluna torácica.' },
        { name: 'Hip 90/90',                      muscleGroup: 'Mobilidade',   category: 'Mobilidade', equipment: 'Peso corporal', description: 'Mobilidade de quadril em rotação interna/externa.' },
        { name: 'Abertura de Quadril com Haltere',muscleGroup: 'Glúteos',      category: 'Mobilidade', equipment: 'Halteres',      description: 'Fortalecimento e mobilidade do glúteo médio.' },
      ];

      // Adicionar apenas exercícios que não existem ainda
      const existing = await this.getAll('exercises');
      const existingNames = new Set(existing.map(e => e.name.toLowerCase()));
      for (const ex of exercises) {
        if (!existingNames.has(ex.name.toLowerCase())) {
          await this.add('exercises', ex);
        }
      }
    }
  }
}

const db = new Database();
export default db;
export { db };
