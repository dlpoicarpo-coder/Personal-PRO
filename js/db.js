// ========================================
// PERSONAL PRO — Supabase Wrapper (Sistema de Treinamento)
// ========================================

const supabaseUrl = 'https://vbxedlloesvjpqzunqyv.supabase.co'; 
const supabaseKey = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';
const SUPABASE_TABLES = ['students', 'workouts', 'sessions', 'biofeedback', 'macrocycles', 'assessments', 'anamneses', 'finances', 'workout_templates', 'exercises', 'cycles', 'schedules', 'settings'];

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
    if (!this.supabase || !SUPABASE_TABLES.includes(storeName)) return localData;

    try {
      const { data, error } = await this.supabase
        .from(storeName)
        .select('data');
        
      if (error) {
        console.warn(`Supabase getAll error (${storeName}), usando fallback local:`, error.message);
        return localData;
      }
      
      if (data) {
        const remoteData = data.map(row => row.data);
        // Merge with local data (remote overrides local if id matches)
        const merged = [...localData];
        remoteData.forEach(remoteItem => {
          const idx = merged.findIndex(i => i.id === remoteItem.id);
          if (idx >= 0) {
            // Keep remote if updated later or simply override
            merged[idx] = remoteItem;
          } else {
            merged.push(remoteItem);
          }
        });
        // Update local cache
        this._saveLocal(storeName, merged);
        return merged;
      }
      return localData;
    } catch (err) {
      return localData;
    }
  }

  async getAllForStudent(storeName, studentId, trainerId) {
    let localData = this._getLocal(storeName).filter(i => i.studentId === studentId);
    if (!this.supabase || !SUPABASE_TABLES.includes(storeName)) return localData;

    try {
      let query = this.supabase
        .from(storeName)
        .select('data');
      
      // We can't easily filter by data->studentId in basic select without specific indexing,
      // but if the table has trainer_id we can filter by it to reduce payload.
      if (trainerId) {
        query = query.eq('trainer_id', trainerId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.warn(`Supabase getAllForStudent error (${storeName}):`, error.message);
        return localData;
      }
      
      if (data) {
        const remoteData = data.map(row => row.data).filter(d => d.studentId === studentId);
        // Merge
        const merged = [...localData];
        remoteData.forEach(remoteItem => {
          const idx = merged.findIndex(i => i.id === remoteItem.id);
          if (idx >= 0) merged[idx] = remoteItem;
          else merged.push(remoteItem);
        });
        return merged;
      }
      return localData;
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

    let trainerId = item.trainer_id || item.trainerId || null;
    if (!trainerId && this.supabase) {
      try {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
          trainerId = user.id;
        }
      } catch (err) {
        console.warn('Erro ao obter trainerId para o payload do Supabase:', err);
      }
    }

    const payload = {
      id: item.id,
      data: item
    };
    if (trainerId) {
      payload.trainer_id = trainerId;
      item.trainer_id = trainerId;
      item.trainerId = trainerId;
    }

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

  async exportAll() {
    const data = { _version: 'v4' };
    for (const store of SUPABASE_TABLES) {
      data[store] = await this.getAll(store);
    }
    return data;
  }

  async importAll(data) {
    if (!data._version) throw new Error('Invalid format');
    for (const store of SUPABASE_TABLES) {
      if (data[store]) {
        await this.clear(store);
        for (const item of data[store]) {
          await this.put(store, item);
        }
      }
    }
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
        // ── PEITO ──
        { name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Barra', description: 'Exercício base para desenvolvimento do peitoral maior. Deite no banco, segure a barra na largura dos ombros, desça até o peito e empurre até a extensão dos braços.' },
        { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Halteres', description: 'Foco na porção clavicular (superior) do peitoral. Banco inclinado a 30-45°, desça os halteres controladamente e pressione para cima.' },
        { name: 'Crucifixo Reto', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Halteres', description: 'Isolamento do peitoral com amplitude máxima. Braços levemente flexionados, abra em arco até sentir o alongamento e feche contraindo o peito.' },
        { name: 'Peck Deck (Voador)', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Máquina', description: 'Isolamento do peitoral na máquina. Ajuste a altura do assento, mantenha os cotovelos alinhados e junte os braços à frente do peito.' },
        { name: 'Cross Over', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Cabo', description: 'Exercício no cabo para definição do peitoral. Posicione-se no centro, puxe os cabos para baixo e à frente cruzando as mãos.' },
        { name: 'Supino Declinado com Barra', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Barra', description: 'Foco na porção esternal (inferior) do peitoral. Banco declinado a 15-30°, execução similar ao supino reto.' },
        { name: 'Flexão de Braços', muscleGroup: 'Peito', category: 'Funcional', equipment: 'Peso corporal', description: 'Exercício funcional básico. Mãos na largura dos ombros, corpo alinhado, desça o peito ao chão e empurre de volta.' },
        // ── COSTAS ──
        { name: 'Puxada Frontal', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Cabo', description: 'Desenvolvimento dos dorsais. Segure a barra na largura ou além dos ombros, puxe até a altura do queixo contraindo as escápulas.' },
        { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Barra', description: 'Exercício composto para espessura das costas. Tronco inclinado a 45°, puxe a barra em direção ao abdômen inferior.' },
        { name: 'Remada Unilateral com Halter', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Halteres', description: 'Trabalho unilateral para corrigir assimetrias. Apoie uma mão e joelho no banco, puxe o halter em direção ao quadril.' },
        { name: 'Remada Baixa (Sentado)', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Cabo', description: 'Foco na porção média das costas e romboides. Sentado, pés apoiados, puxe o triângulo em direção ao abdômen.' },
        { name: 'Barra Fixa (Pull-up)', muscleGroup: 'Costas', category: 'Funcional', equipment: 'Peso corporal', description: 'Exercício avançado de peso corporal. Pegada pronada, puxe o corpo até o queixo ultrapassar a barra.' },
        { name: 'Pullover no Cabo', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Cabo', description: 'Isolamento do dorsal. Em pé de frente ao cabo alto, braços estendidos, puxe a barra em arco até as coxas.' },
        { name: 'Levantamento Terra', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Barra', description: 'Exercício composto completo para toda a cadeia posterior. Mantenha a coluna neutra, empurre o chão com os pés e estenda quadril e joelhos.' },
        // ── OMBROS ──
        { name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres', description: 'Exercício base para deltoides. Sentado ou em pé, pressione os halteres acima da cabeça até a extensão total dos braços.' },
        { name: 'Elevação Lateral', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres', description: 'Isolamento do deltoide lateral. Eleve os halteres lateralmente até a altura dos ombros, cotovelos levemente flexionados.' },
        { name: 'Elevação Frontal', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres', description: 'Foco no deltoide anterior. Eleve os halteres à frente até a altura dos olhos, alternando ou simultaneamente.' },
        { name: 'Crucifixo Invertido', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres', description: 'Foco no deltoide posterior. Tronco inclinado, abra os braços lateralmente mantendo cotovelos levemente flexionados.' },
        { name: 'Face Pull', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Cabo', description: 'Saúde do ombro e deltoide posterior. No cabo alto com corda, puxe em direção ao rosto abrindo os cotovelos.' },
        { name: 'Arnold Press', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres', description: 'Variação do desenvolvimento com rotação. Comece com palmas voltadas para o rosto, rode e pressione acima da cabeça.' },
        { name: 'Remada Alta', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Barra', description: 'Trabalha deltoide lateral e trapézio. Puxe a barra próximo ao corpo até a altura do queixo, cotovelos apontando para cima.' },
        // ── BÍCEPS ──
        { name: 'Rosca Direta com Barra', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Barra', description: 'Exercício base para bíceps. Cotovelos fixos ao lado do corpo, flexione os antebraços contraindo o bíceps no topo.' },
        { name: 'Rosca Alternada com Halteres', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Halteres', description: 'Permite foco unilateral e maior amplitude. Alterne os braços supinando o punho durante a subida.' },
        { name: 'Rosca Martelo', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Halteres', description: 'Pegada neutra que enfatiza o braquiorradial e braquial. Flexione mantendo as palmas voltadas uma para a outra.' },
        { name: 'Rosca Scott', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Barra', description: 'Isolamento do bíceps no banco Scott. Apoie os braços no banco, flexione lentamente e desça controladamente.' },
        { name: 'Rosca Concentrada', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Halteres', description: 'Máximo isolamento do bíceps. Sentado, cotovelo apoiado na parte interna da coxa, flexione e segure a contração.' },
        // ── TRÍCEPS ──
        { name: 'Tríceps Pulley', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Cabo', description: 'Exercício padrão para tríceps. Cotovelos fixos ao lado do corpo, estenda os antebraços para baixo contraindo o tríceps.' },
        { name: 'Tríceps Testa', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Barra', description: 'Foco na cabeça longa do tríceps. Deitado no banco, desça a barra em direção à testa e estenda os braços.' },
        { name: 'Tríceps Francês', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Halteres', description: 'Exercício overhead para cabeça longa. Halter atrás da cabeça, estenda verticalmente mantendo cotovelos fixos.' },
        { name: 'Tríceps Corda', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Cabo', description: 'Variação com corda para maior ativação. Abra as pontas da corda ao final do movimento para pico de contração.' },
        { name: 'Mergulho nas Paralelas', muscleGroup: 'Tríceps', category: 'Funcional', equipment: 'Peso corporal', description: 'Exercício avançado. Corpo vertical (foco tríceps), desça até 90° nos cotovelos e empurre de volta.' },
        // ── QUADRÍCEPS ──
        { name: 'Agachamento Livre com Barra', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Barra', description: 'Rei dos exercícios de perna. Barra apoiada no trapézio, agache até pelo menos 90° nos joelhos mantendo a coluna neutra.' },
        { name: 'Leg Press 45°', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina', description: 'Alta carga com menor demanda de estabilização. Pés na largura dos ombros, desça até 90° nos joelhos.' },
        { name: 'Cadeira Extensora', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina', description: 'Isolamento do quadríceps. Estenda os joelhos até a extensão total, segure a contração por 1-2 segundos.' },
        { name: 'Hack Squat', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina', description: 'Agachamento guiado na máquina com foco no quadríceps. Costas apoiadas, desça controladamente.' },
        { name: 'Agachamento Búlgaro', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Halteres', description: 'Exercício unilateral avançado. Pé traseiro elevado no banco, agache até o joelho quase tocar o chão.' },
        { name: 'Passada (Avanço)', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Halteres', description: 'Trabalha quadríceps e glúteos. Dê um passo à frente, desça o joelho traseiro em direção ao chão e volte.' },
        // ── POSTERIOR ──
        { name: 'Mesa Flexora', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Máquina', description: 'Isolamento dos isquiotibiais deitado. Flexione os joelhos puxando a almofada em direção aos glúteos.' },
        { name: 'Cadeira Flexora', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Máquina', description: 'Isolamento sentado dos isquiotibiais. Flexione os joelhos contra a resistência da máquina.' },
        { name: 'Stiff com Barra', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Barra', description: 'Alongamento ativo dos isquiotibiais. Pernas semi-estendidas, incline o tronco à frente mantendo a coluna neutra.' },
        { name: 'Bom Dia (Good Morning)', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Barra', description: 'Barra no trapézio, incline o tronco à frente como uma reverência. Foco nos isquiotibiais e eretores da espinha.' },
        // ── GLÚTEOS ──
        { name: 'Hip Thrust', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Barra', description: 'Melhor exercício para glúteos. Costas apoiadas no banco, barra no quadril, empurre os quadris para cima até a extensão total.' },
        { name: 'Elevação Pélvica', muscleGroup: 'Glúteos', category: 'Funcional', equipment: 'Peso corporal', description: 'Versão no solo do hip thrust. Deitado, pés apoiados, eleve o quadril contraindo os glúteos no topo.' },
        { name: 'Abdução na Máquina', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Máquina', description: 'Isolamento do glúteo médio. Sentado, abra as pernas contra a resistência da máquina.' },
        { name: 'Agachamento Sumô', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Halteres', description: 'Pés afastados além dos ombros com pontas para fora. Enfatiza glúteos e adutores.' },
        // ── PANTURRILHA ──
        { name: 'Panturrilha em Pé', muscleGroup: 'Panturrilha', category: 'Musculação', equipment: 'Máquina', description: 'Foco no gastrocnêmio (porção lateral). Em pé, eleve os calcanhares o máximo possível e desça alongando.' },
        { name: 'Panturrilha Sentado', muscleGroup: 'Panturrilha', category: 'Musculação', equipment: 'Máquina', description: 'Foco no sóleo (porção profunda). Joelhos a 90°, eleve os calcanhares contra a resistência.' },
        { name: 'Panturrilha no Leg Press', muscleGroup: 'Panturrilha', category: 'Musculação', equipment: 'Máquina', description: 'Pés na borda inferior da plataforma, empurre apenas com os dedos e antepé.' },
        // ── ABDÔMEN / CORE ──
        { name: 'Abdominal Crunch', muscleGroup: 'Abdômen', category: 'Musculação', equipment: 'Peso corporal', description: 'Flexão do tronco para isolamento do reto abdominal. Eleve os ombros do chão contraindo o abdômen.' },
        { name: 'Abdominal Infra', muscleGroup: 'Abdômen', category: 'Musculação', equipment: 'Peso corporal', description: 'Foco na porção inferior do reto abdominal. Eleve as pernas ou o quadril em direção ao peito.' },
        { name: 'Prancha Frontal', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal', description: 'Exercício isométrico para estabilização do core. Mantenha o corpo em linha reta apoiado nos antebraços e pontas dos pés.' },
        { name: 'Prancha Lateral', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal', description: 'Estabilização lateral do core e oblíquos. Apoiado em um antebraço, corpo em linha reta lateral.' },
        { name: 'Russian Twist', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal', description: 'Rotação do tronco para oblíquos. Sentado com pés elevados, rode o tronco de um lado para o outro com peso.' },
        { name: 'Abdominal na Roda', muscleGroup: 'Core', category: 'Funcional', equipment: 'Roda abdominal', description: 'Exercício avançado de core. Ajoelhado, role a roda à frente estendendo o corpo e retorne contraindo o abdômen.' },
        // ── CORPO INTEIRO / FUNCIONAL ──
        { name: 'Burpee', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Peso corporal', description: 'Exercício metabólico completo. Agache, salte para posição de flexão, faça uma flexão, volte e salte.' },
        { name: 'Kettlebell Swing', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Kettlebell', description: 'Movimento explosivo de quadril. Balance o kettlebell entre as pernas e projete para frente com extensão do quadril.' },
        { name: 'Farmer Walk', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Halteres', description: 'Caminhe com pesos pesados em cada mão. Trabalha grip, core, trapézio e estabilização geral.' },
        { name: 'Battle Rope', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Corda naval', description: 'Exercício de alta intensidade com corda naval. Faça ondas alternadas ou simultâneas por tempo determinado.' },
        // ── CARDIO ──
        { name: 'Esteira - Caminhada', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Esteira', description: 'Atividade aeróbica de baixa intensidade. Ideal para aquecimento, recuperação ativa ou LISS (Low Intensity Steady State).' },
        { name: 'Esteira - Corrida', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Esteira', description: 'Atividade aeróbica de média a alta intensidade. Pode ser usada para MICT (moderada contínua) ou intervalados.' },
        { name: 'Bicicleta Ergométrica', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Bicicleta', description: 'Baixo impacto articular. Excelente para aquecimento, condicionamento ou HIIT em bike.' },
        { name: 'Elíptico / Transport', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Elíptico', description: 'Movimento de corpo inteiro com baixo impacto. Trabalha membros superiores e inferiores simultaneamente.' },
        { name: 'Remo Ergométrico', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Remo', description: 'Cardio de corpo inteiro. Excelente para condicionamento — trabalha pernas, costas e braços no mesmo movimento.' },
        { name: 'Pular Corda', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Corda', description: 'Alta queima calórica em pouco tempo. Melhora coordenação, agilidade e condicionamento cardiovascular.' },
        { name: 'HIIT Genérico', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Variado', description: 'Treino Intervalado de Alta Intensidade. Alterne períodos de esforço máximo (20-40s) com descanso ativo (10-60s).' },
        // ── ALONGAMENTO / MOBILIDADE ──
        { name: 'Foam Rolling', muscleGroup: 'Corpo Inteiro', category: 'Mobilidade', equipment: 'Rolo', description: 'Auto-liberação miofascial com rolo. Role lentamente sobre os músculos tensos por 30-60s cada grupo.' },
        { name: 'Mobilidade de Quadril', muscleGroup: 'Glúteos', category: 'Mobilidade', equipment: 'Nenhum', description: 'Exercícios de mobilidade articular do quadril: rotações internas/externas, 90/90, pigeon stretch.' },
        { name: 'Rotação Torácica', muscleGroup: 'Core', category: 'Mobilidade', equipment: 'Nenhum', description: 'Melhora a mobilidade da coluna torácica. Fundamental para postura e saúde do ombro.' },
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
