// ========================================
// PERSONAL PRO — IndexedDB Wrapper
// ========================================

const DB_NAME = 'PersonalPRO';
const DB_VERSION = 3;

const STORES = {
  students: { keyPath: 'id', indexes: ['code', 'name', 'status'] },
  workouts: { keyPath: 'id', indexes: ['studentId', 'date', 'type'] },
  exercises: { keyPath: 'id', indexes: ['name', 'muscleGroup', 'category'] },
  assessments: { keyPath: 'id', indexes: ['studentId', 'date', 'type'] },
  biofeedback: { keyPath: 'id', indexes: ['studentId', 'date'] },
  anamnesis: { keyPath: 'id', indexes: ['studentId'] },
  settings: { keyPath: 'key' },
  cycles: { keyPath: 'id', indexes: ['studentId'] },
  // Phase 2 stores
  sessions: { keyPath: 'id', indexes: ['studentId', 'workoutId', 'date', 'status'] },
  macrocycles: { keyPath: 'id', indexes: ['studentId', 'status'] },
  financial: { keyPath: 'id', indexes: ['studentId', 'dueDate', 'status'] },
  schedules: { keyPath: 'id', indexes: ['studentId', 'date', 'status'] },
};

class Database {
  constructor() {
    this.db = null;
    this._ready = this._init();
  }

  async _init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const [name, config] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: config.keyPath });
            if (config.indexes) {
              config.indexes.forEach(idx => store.createIndex(idx, idx, { unique: false }));
            }
          }
        }
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async ready() { await this._ready; }

  _tx(storeName, mode = 'readonly') {
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async add(storeName, data) {
    await this.ready();
    if (!data.id) data.id = crypto.randomUUID();
    data.createdAt = data.createdAt || new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').add(data);
      req.onsuccess = () => resolve(data);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async put(storeName, data) {
    await this.ready();
    data.updatedAt = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async get(storeName, id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getAll(storeName) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const idx = store.index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async delete(storeName, id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async clear(storeName) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName, 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async count(storeName) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const req = this._tx(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async exportAll() {
    await this.ready();
    const data = {};
    for (const name of Object.keys(STORES)) {
      data[name] = await this.getAll(name);
    }
    data._exportDate = new Date().toISOString();
    data._version = DB_VERSION;
    return data;
  }

  async importAll(data) {
    await this.ready();
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
