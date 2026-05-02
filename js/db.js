// ========================================
// PERSONAL PRO — Supabase Wrapper (NoSQL Mode)
// ========================================

const supabaseUrl = 'https://vbxedlloesvjpqzunqyv.supabase.co'; 
const supabaseKey = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

class Database {
  constructor() {
    this.supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
    if (!this.supabase) {
      console.warn("Supabase client não encontrado. Usando LocalStorage (Offline Mode).");
    }
  }

  // Helper for LocalStorage
  _getLocal(storeName) {
    try {
      const data = localStorage.getItem(`pp_${storeName}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveLocal(storeName, items) {
    try {
      localStorage.setItem(`pp_${storeName}`, JSON.stringify(items));
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
  }

  async get(storeName, id) {
    let localItem = this._getLocal(storeName).find(i => i.id === id) || null;
    if (!this.supabase) return localItem;

    try {
      const { data, error } = await this.supabase
        .from(storeName)
        .select('data')
        .eq('id', id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.warn(`Supabase get error (${storeName}), usando fallback local:`, error.message);
        return localItem;
      }
      return data ? data.data : localItem;
    } catch (err) {
      console.warn(`Supabase get exception, usando fallback local:`, err.message);
      return localItem;
    }
  }

  async getAll(storeName) {
    let localData = this._getLocal(storeName);
    if (!this.supabase) return localData;

    try {
      const { data, error } = await this.supabase
        .from(storeName)
        .select('data');
        
      if (error) {
        console.warn(`Supabase getAll error (${storeName}), usando fallback local:`, error.message);
        return localData;
      }
      return data ? data.map(row => row.data) : localData;
    } catch (err) {
      return localData;
    }
  }

  async getByIndex(storeName, indexName, value) {
    const all = await this.getAll(storeName);
    return all.filter(item => item && item[indexName] === value);
  }

  async put(storeName, item) {
    // Corrige a diferença entre 'key' e 'id' que existe no login.js do seu Github
    if (!item.id && item.key) item.id = item.key;
    
    if (!item.id) item.id = crypto.randomUUID();
    item.updatedAt = new Date().toISOString();
    if (!item.createdAt) item.createdAt = new Date().toISOString();

    // Sempre salva localmente como garantia (Offline-first / Fallback)
    const localAll = this._getLocal(storeName);
    const idx = localAll.findIndex(i => i.id === item.id);
    if (idx >= 0) localAll[idx] = item; else localAll.push(item);
    this._saveLocal(storeName, localAll);

    if (!this.supabase) return item;

    const payload = {
      id: item.id,
      data: item
    };

    try {
      const { error } = await this.supabase
        .from(storeName)
        .upsert(payload);
        
      if (error) {
        console.warn(`Supabase put error (${storeName}), salvo apenas localmente:`, error.message);
      }
    } catch (err) {
      console.warn(`Supabase put exception (${storeName}):`, err.message);
    }
    
    return item;
  }

  async add(storeName, item) {
    return this.put(storeName, item);
  }

  async delete(storeName, id) {
    // Delete local
    const localAll = this._getLocal(storeName).filter(i => i.id !== id);
    this._saveLocal(storeName, localAll);

    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from(storeName)
        .delete()
        .eq('id', id);
        
      if (error) {
        console.warn(`Supabase delete error (${storeName}):`, error.message);
      }
    } catch(err) {
      // ignore
    }
  }

  async clear(storeName) {
    localStorage.removeItem(`pp_${storeName}`);
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from(storeName)
        .delete()
        .not('id', 'is', null);
        
      if (error) console.warn(`Supabase clear error (${storeName}):`, error.message);
    } catch(err) {}
  }

  async count(storeName) {
    const localCount = this._getLocal(storeName).length;
    if (!this.supabase) return localCount;

    try {
      const { count, error } = await this.supabase
        .from(storeName)
        .select('id', { count: 'exact', head: true });
        
      if (error) {
        console.warn(`Supabase count error (${storeName}):`, error.message);
        return localCount;
      }
      return count || 0;
    } catch(err) {
      return localCount;
    }
  }
}

export const db = new Database();
export default db;
