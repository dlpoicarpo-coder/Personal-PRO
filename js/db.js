// ========================================
// PERSONAL PRO — Supabase Wrapper
// ========================================

// ⚠️ ATENÇÃO: COLA AQUI AS TUAS CHAVES DO SUPABASE
const supabaseUrl = 'https://vbxedlloesvjpqzunqyv.supabase.co'; 
const supabaseKey = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

// Inicializa o cliente do Supabase (que foi carregado no index.html)
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const STORES = {
  students: { keyPath: 'id', indexes: ['code', 'name', 'status'] },
  workouts: { keyPath: 'id', indexes: ['studentId', 'date', 'type'] },
  exercises: { keyPath: 'id', indexes: ['name', 'muscleGroup', 'category'] },
  assessments: { keyPath: 'id', indexes: ['studentId', 'date', 'type'] },
  biofeedback: { keyPath: 'id', indexes: ['studentId', 'date'] },
  anamnesis: { keyPath: 'id', indexes: ['studentId'] },
  settings: { keyPath: 'key' },
  cycles: { keyPath: 'id', indexes: ['studentId'] },
  sessions: { keyPath: 'id', indexes: ['studentId', 'workoutId', 'date', 'status'] },
  macrocycles: { keyPath: 'id', indexes: ['studentId', 'status'] },
  financial: { keyPath: 'id', indexes: ['studentId', 'dueDate', 'status'] },
  schedules: { keyPath: 'id', indexes: ['studentId', 'date', 'status'] },
};

class Database {
  constructor() {
    this.supabase = supabase;
  }

  async ready() {
    // Mantido para compatibilidade com o teu código antigo
    return Promise.resolve();
  }

  _getKeyPath(storeName) {
    return STORES[storeName]?.keyPath || 'id';
  }

  async add(storeName, data) {
    if (!data.id && this._getKeyPath(storeName) === 'id') data.id = crypto.randomUUID();
    data.createdAt = data.createdAt || new Date().toISOString();
    data.updatedAt = new Date().toISOString();

    const { data: result, error } = await this.supabase
      .from(storeName)
      .insert([data])
      .select();

    if (error) {
        console.error(`Erro ao adicionar em ${storeName}:`, error);
        throw error;
    }
    return result[0];
  }

  async put(storeName, data) {
    data.updatedAt = new Date().toISOString();

    const { data: result, error } = await this.supabase
      .from(storeName)
      .upsert([data])
      .select();

    if (error) {
        console.error(`Erro ao atualizar em ${storeName}:`, error);
        throw error;
    }
    return result[0];
  }

  async get(storeName, id) {
    const key = this._getKeyPath(storeName);
    const { data, error } = await this.supabase
      .from(storeName)
      .select('*')
      .eq(key, id)
      .single();

    if (error && error.code !== 'PGRST116') { 
         console.error(`Erro ao buscar ${id} em ${storeName}:`, error);
    }
    return data || null;
  }

  async getAll(storeName) {
    const { data, error } = await this.supabase
      .from(storeName)
      .select('*');

    if (error) {
         console.error(`Erro ao buscar todos em ${storeName}:`, error);
         return [];
    }
    return data || [];
  }

  async getByIndex(storeName, indexName, value) {
    const { data, error } = await this.supabase
      .from(storeName)
      .select('*')
      .eq(indexName, value);

    if (error) {
         console.error(`Erro ao buscar por index em ${storeName}:`, error);
         return [];
    }
    return data || [];
  }

  async delete(storeName, id) {
    const key = this._getKeyPath(storeName);
    const { error } = await this.supabase
      .from(storeName)
      .delete()
      .eq(key, id);

    if (error) {
        console.error(`Erro ao deletar ${id} em ${storeName}:`, error);
        throw error;
    }
  }

  async clear(storeName) {
      const { error } = await this.supabase.from(storeName).delete().neq(this._getKeyPath(storeName), 'dummy');
      if (error) console.error(`Erro ao limpar ${storeName}:`, error);
  }

  async count(storeName) {
    const { count, error } = await this.supabase
      .from(storeName)
      .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return count;
  }

  // Exportar/Importar
  async exportAll() {
    const data = {};
    for (const name of Object.keys(STORES)) {
      data[name] = await this.getAll(name);
    }
    data._exportDate = new Date().toISOString();
    return data;
  }

  async importAll(data) {
    for (const name of Object.keys(STORES)) {
      if (data[name] && Array.isArray(data[name])) {
        await this.clear(name);
        for (const item of data[name]) {
          await this.put(name, item);
        }
      }
    }
  }
}

const db = new Database();
export default db;
export { db, STORES };
