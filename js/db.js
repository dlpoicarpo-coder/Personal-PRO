// ========================================
// PERSONAL PRO — Supabase Wrapper (Cloud Edition)
// ========================================

const supabaseUrl = 'https://vbxedlloesvjpqzunqyv.supabase.co'; 
const supabaseKey = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

class Database {
  constructor() {
    // Single Supabase instance (fixes "Multiple GoTrueClient instances" warning)
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
    // Compatibilidade: converte 'key' para 'id' se necessário
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

  async seedTemplates() {
    // Adiciona templates iniciais se o banco estiver vazio
    const exerciciosCount = await this.count('exercises');
    if (exerciciosCount === 0) {
      const templatesEx = [
        // Peito
        { name: 'Supino Reto com Barra', group: 'Peito', type: 'Força' },
        { name: 'Supino Inclinado com Halteres', group: 'Peito', type: 'Força' },
        { name: 'Crucifixo Máquina', group: 'Peito', type: 'Força' },
        { name: 'Crossover Polia Alta', group: 'Peito', type: 'Força' },
        // Costas
        { name: 'Puxada Frontal Aberta', group: 'Costas', type: 'Força' },
        { name: 'Remada Curvada com Barra', group: 'Costas', type: 'Força' },
        { name: 'Remada Baixa Triângulo', group: 'Costas', type: 'Força' },
        { name: 'Pulldown com Corda', group: 'Costas', type: 'Força' },
        // Pernas (Quadríceps e Posteriores)
        { name: 'Agachamento Livre', group: 'Pernas', type: 'Força' },
        { name: 'Leg Press 45º', group: 'Pernas', type: 'Força' },
        { name: 'Cadeira Extensora', group: 'Pernas', type: 'Força' },
        { name: 'Mesa Flexora', group: 'Pernas', type: 'Força' },
        { name: 'Cadeira Flexora', group: 'Pernas', type: 'Força' },
        { name: 'Elevação Pélvica', group: 'Pernas', type: 'Força' },
        { name: 'Panturrilha no Leg Press', group: 'Pernas', type: 'Força' },
        // Ombros
        { name: 'Desenvolvimento com Halteres', group: 'Ombros', type: 'Força' },
        { name: 'Elevação Lateral com Halteres', group: 'Ombros', type: 'Força' },
        { name: 'Elevação Frontal', group: 'Ombros', type: 'Força' },
        { name: 'Crucifixo Invertido Máquina', group: 'Ombros', type: 'Força' },
        // Bíceps e Tríceps
        { name: 'Rosca Direta com Barra W', group: 'Bíceps', type: 'Força' },
        { name: 'Rosca Alternada com Halteres', group: 'Bíceps', type: 'Força' },
        { name: 'Rosca Scott Máquina', group: 'Bíceps', type: 'Força' },
        { name: 'Tríceps Pulley (Corda)', group: 'Tríceps', type: 'Força' },
        { name: 'Tríceps Testa com Barra W', group: 'Tríceps', type: 'Força' },
        { name: 'Tríceps Francês com Halter', group: 'Tríceps', type: 'Força' },
        // Abdômen
        { name: 'Abdominal Supra (Solo)', group: 'Abdômen', type: 'Força' },
        { name: 'Abdominal Infra (Paralela)', group: 'Abdômen', type: 'Força' },
        { name: 'Prancha Isométrica', group: 'Abdômen', type: 'Força' },
        // Cardio Específico
        { name: 'Corrida (Esteira) - MICT', group: 'Cardio', type: 'Cardio' },
        { name: 'Bicicleta Ergométrica', group: 'Cardio', type: 'Cardio' },
        { name: 'Elíptico', group: 'Cardio', type: 'Cardio' },
        { name: 'Tiro Sprint (HIIT)', group: 'Cardio', type: 'Cardio' },
        { name: 'Tiro Sprint (SIT)', group: 'Cardio', type: 'Cardio' },
        { name: 'Pular Corda', group: 'Cardio', type: 'Cardio' }
      ];
      for (const ex of templatesEx) {
        await this.put('exercises', ex);
      }
    }

    const cyclesCount = await this.count('cycles');
    if (cyclesCount === 0) {
      const templatesCycles = [
        {
          name: 'Macrociclo: Hipertrofia (12 Semanas)',
          description: 'Focado em ganho máximo de massa magra. Ondulação progressiva de carga.',
          phases: ['Adaptação Anatômica (3 sem)', 'Hipertrofia I (4 sem)', 'Hipertrofia II (3 sem)', 'Polimento / Deload (2 sem)'],
          duration: '12 semanas'
        },
        {
          name: 'Macrociclo: Emagrecimento Acelerado',
          description: 'Combinação de Treinamento de Força com HIIT/SIT para otimização metabólica.',
          phases: ['Resistência Muscular (4 sem)', 'Misto Força+HIIT (4 sem)', 'Definição Extrema (4 sem)'],
          duration: '12 semanas'
        },
        {
          name: 'Macrociclo: Treinamento Concorrente (Cardio + Força)',
          description: 'Periodização Polarizada. Foco em melhorar a capacidade cardiorrespiratória e manter massa magra.',
          phases: ['Base Aeróbica (4 sem)', 'Intensificação (HIIT + Força Base) (4 sem)', 'Performance Máxima (4 sem)'],
          duration: '12 semanas'
        }
      ];
      for (const cycle of templatesCycles) {
        await this.put('cycles', cycle);
      }
    }
  }
}

export const db = new Database();
export default db;
