// ========================================
// PERSONAL PRO — Workout Templates Library
// Pre-built + custom workout templates
// ========================================

export const BUILT_IN_TEMPLATES = [
  // ================= HIPERTROFIA =================
  {
    id: 'tpl_upper_lower',
    name: 'Superior / Inferior',
    category: 'Hipertrofia',
    goal: 'Hipertrofia',
    description: 'Divisão clássica upper/lower para ganho de massa muscular com volume moderado.',
    daysPerWeek: 4,
    builtIn: true,
    workouts: [
      { name: 'Treino A - Superior', exercises: [
        { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'Puxada Frontal', sets: 4, reps: '10', load: '', rest: '90', method: '' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
        { name: 'Remada Curvada com Barra', sets: 3, reps: '10', load: '', rest: '90', method: '' },
        { name: 'Rosca Direta com Barra', sets: 3, reps: '12', load: '', rest: '60', method: '' },
        { name: 'Tríceps Pulley', sets: 3, reps: '12', load: '', rest: '60', method: '' },
      ]},
      { name: 'Treino B - Inferior', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', load: '', rest: '120', method: '' },
        { name: 'Leg Press 45°', sets: 4, reps: '10-12', load: '', rest: '90', method: '' },
        { name: 'Cadeira Extensora', sets: 3, reps: '12', load: '', rest: '60', method: '' },
        { name: 'Mesa Flexora', sets: 3, reps: '12', load: '', rest: '60', method: '' },
        { name: 'Panturrilha em Pé na Máquina', sets: 4, reps: '15', load: '', rest: '45', method: '' },
      ]}
    ]
  },
  {
    id: 'tpl_push_pull_legs',
    name: 'Push / Pull / Legs',
    category: 'Hipertrofia',
    goal: 'Hipertrofia',
    description: 'Divisão PPL clássica para atletas. Alto volume com métodos intensificadores.',
    daysPerWeek: 6,
    builtIn: true,
    workouts: [
      { name: 'Push (Empurrar)', exercises: [
        { name: 'Supino Reto com Barra', sets: 4, reps: '6-8', load: '', rest: '120', method: '' },
        { name: 'Supino Inclinado com Halteres', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'Desenvolvimento com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'Elevação Lateral', sets: 4, reps: '12-15', load: '', rest: '60', method: 'Drop set' },
        { name: 'Tríceps Testa', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
      ]},
      { name: 'Pull (Puxar)', exercises: [
        { name: 'Puxada Frontal', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'Remada Unilateral com Halter', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
        { name: 'Rosca Alternada com Halteres', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
      ]},
      { name: 'Legs (Pernas)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '6-8', load: '', rest: '180', method: '' },
        { name: 'Leg Press 45°', sets: 4, reps: '10-12', load: '', rest: '90', method: '' },
        { name: 'Cadeira Extensora', sets: 3, reps: '12-15', load: '', rest: '60', method: 'Drop set' },
        { name: 'Mesa Flexora', sets: 4, reps: '10-12', load: '', rest: '60', method: '' },
      ]}
    ]
  },
  {
    id: 'tpl_pyramid_hypertrophy',
    name: 'Pirâmide de Hipertrofia',
    category: 'Hipertrofia',
    goal: 'Hipertrofia',
    description: 'Foco na exaustão total e controle de fadiga usando métodos de pirâmide completa e decrescente.',
    daysPerWeek: 4,
    builtIn: true,
    workouts: [
      { name: 'Peito e Tríceps', exercises: [
        { name: 'Supino Reto com Barra', sets: 5, reps: '12-10-8-10-12', load: '', rest: '90', method: 'Pirâmide Completa' },
        { name: 'Supino Inclinado com Halteres', sets: 4, reps: '8-10-12-15', load: '', rest: '90', method: 'Pirâmide Decrescente' },
        { name: 'Crucifixo Máquina', sets: 3, reps: '12-15', load: '', rest: '60', method: 'Tensão Contínua' },
        { name: 'Tríceps Pulley', sets: 4, reps: '10-12-15-20', load: '', rest: '60', method: 'Pirâmide Decrescente' },
      ]},
      { name: 'Costas e Bíceps', exercises: [
        { name: 'Puxada Frontal', sets: 5, reps: '12-10-8-10-12', load: '', rest: '90', method: 'Pirâmide Completa' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10-12-15', load: '', rest: '90', method: 'Pirâmide Decrescente' },
        { name: 'Rosca Direta com Barra', sets: 4, reps: '12-10-8-12', load: '', rest: '60', method: 'Pirâmide' },
      ]},
      { name: 'Pernas', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 5, reps: '12-10-8-10-12', load: '', rest: '120', method: 'Pirâmide Completa' },
        { name: 'Leg Press 45°', sets: 4, reps: '10-12-15-20', load: '', rest: '90', method: 'Pirâmide Decrescente' },
        { name: 'Cadeira Extensora', sets: 4, reps: '15', load: '', rest: '60', method: 'Drop set' },
      ]}
    ]
  },

  // ================= FORÇA =================
  {
    id: 'tpl_strength_5x5',
    name: 'Força Máxima — 5x5',
    category: 'Força',
    goal: 'Força',
    description: 'Programa clássico de força 5x5 focando nos levantamentos básicos.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      { name: 'Dia A', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 5, reps: '5', load: '', rest: '180', method: '' },
        { name: 'Supino Reto com Barra', sets: 5, reps: '5', load: '', rest: '180', method: '' },
        { name: 'Remada Curvada com Barra', sets: 5, reps: '5', load: '', rest: '120', method: '' },
      ]},
      { name: 'Dia B', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 5, reps: '5', load: '', rest: '180', method: '' },
        { name: 'Desenvolvimento com Barra', sets: 5, reps: '5', load: '', rest: '180', method: '' },
        { name: 'Levantamento Terra', sets: 1, reps: '5', load: '', rest: '180', method: '' },
      ]},
    ]
  },
  {
    id: 'tpl_strength_powerlifting',
    name: 'Powerlifting Básico',
    category: 'Força',
    goal: 'Força',
    description: 'Foco puro em Agachamento, Supino e Terra (SBD) com acessórios auxiliares.',
    daysPerWeek: 4,
    builtIn: true,
    workouts: [
      { name: 'Squat Day', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '3-5', load: '', rest: '180', method: '' },
        { name: 'Leg Press 45°', sets: 3, reps: '8-10', load: '', rest: '120', method: '' },
        { name: 'Prancha', sets: 3, reps: '60s', load: '', rest: '60', method: '' },
      ]},
      { name: 'Bench Day', exercises: [
        { name: 'Supino Reto com Barra', sets: 5, reps: '3-5', load: '', rest: '180', method: '' },
        { name: 'Supino Fechado', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '8', load: '', rest: '90', method: '' },
      ]},
      { name: 'Deadlift Day', exercises: [
        { name: 'Levantamento Terra', sets: 3, reps: '3-5', load: '', rest: '240', method: '' },
        { name: 'Mesa Flexora', sets: 3, reps: '10', load: '', rest: '90', method: '' },
        { name: 'Abdominal Crunch', sets: 3, reps: '20', load: '', rest: '60', method: '' },
      ]}
    ]
  },

  // ================= CARDIO ENDURANCE =================
  {
    id: 'tpl_cardio_base',
    name: 'Base Aeróbica (LISS)',
    category: 'Cardio Endurance',
    goal: 'Condicionamento',
    description: 'Volume aeróbico contínuo de baixa intensidade para desenvolver a base cardiovascular (Zona 2).',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      { name: 'Endurance Longo', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' },
        { name: 'Treino Contínuo (Cardio)', sets: 1, reps: '45-60 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' }
      ]},
      { name: 'Recuperação Ativa', exercises: [
        { name: 'Treino Contínuo (Cardio)', sets: 1, reps: '30 min', load: 'Z1', rest: '0', method: '' }
      ]}
    ]
  },
  {
    id: 'tpl_cardio_hiit',
    name: 'HIIT Curto',
    category: 'Cardio Endurance',
    goal: 'Emagrecimento',
    description: 'Treinamento Intervalado de Alta Intensidade para ganho de VO2Max e queima rápida.',
    daysPerWeek: 2,
    builtIn: true,
    workouts: [
      { name: 'HIIT Protocolo 30/60', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' },
        { name: 'Tiro/Sprint (Cardio)', sets: 8, reps: '30 seg', load: 'Z4', rest: '0', method: 'Série' },
        { name: 'Recuperação Ativa (Cardio)', sets: 8, reps: '60 seg', load: 'Z1', rest: '0', method: 'Série' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' }
      ]}
    ]
  },
  {
    id: 'tpl_cardio_threshold',
    name: 'Treino de Limiar (Tempo Run)',
    category: 'Cardio Endurance',
    goal: 'Performance',
    description: 'Treino no limiar anaeróbico para aumentar a velocidade sustentável e resistência a fadiga.',
    daysPerWeek: 2,
    builtIn: true,
    workouts: [
      { name: 'Tempo Run', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Treino Contínuo (Cardio)', sets: 1, reps: '20 min', load: 'Z3', rest: '0', method: 'Limiar' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' }
      ]}
    ]
  },

  // ================= POTÊNCIA =================
  {
    id: 'tpl_power_plyo',
    name: 'Potência e Pliometria',
    category: 'Potência',
    goal: 'Performance',
    description: 'Foco na taxa de desenvolvimento de força (RFD) usando exercícios explosivos e saltos.',
    daysPerWeek: 2,
    builtIn: true,
    workouts: [
      { name: 'Lower Power', exercises: [
        { name: 'Salto na Caixa (Box Jump)', sets: 4, reps: '3-5', load: 'Corporal', rest: '120', method: 'Explosivo' },
        { name: 'Agachamento com Salto', sets: 3, reps: '5', load: 'Corporal', rest: '90', method: 'Explosivo' },
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '3', load: '70% 1RM', rest: '180', method: 'Velocidade' },
      ]},
      { name: 'Upper Power', exercises: [
        { name: 'Arremesso de Medicine Ball', sets: 4, reps: '5', load: 'Leve', rest: '90', method: 'Explosivo' },
        { name: 'Flexão de Braço com Salto', sets: 3, reps: '5', load: 'Corporal', rest: '90', method: 'Explosivo' },
        { name: 'Supino Reto com Barra', sets: 4, reps: '3', load: '60% 1RM', rest: '120', method: 'Velocidade' },
      ]}
    ]
  },
  {
    id: 'tpl_olympic',
    name: 'LPO Iniciante (Levantamento Olímpico)',
    category: 'Potência',
    goal: 'Performance',
    description: 'Movimentos baseados no arranco e arremesso para desenvolvimento de potência extrema.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      { name: 'Dia A - Arranco', exercises: [
        { name: 'Arranco (Snatch)', sets: 5, reps: '3', load: 'Moderado', rest: '120', method: 'Técnica' },
        { name: 'Agachamento Frontal', sets: 4, reps: '5', load: 'Pesado', rest: '180', method: '' },
      ]},
      { name: 'Dia B - Arremesso', exercises: [
        { name: 'Arremesso (Clean & Jerk)', sets: 5, reps: '3', load: 'Moderado', rest: '120', method: 'Técnica' },
        { name: 'Levantamento Terra', sets: 4, reps: '5', load: 'Pesado', rest: '180', method: '' },
      ]}
    ]
  },

  // ================= RESISTÊNCIA =================
  {
    id: 'tpl_muscular_endurance',
    name: 'Resistência Muscular Localizada',
    category: 'Resistência',
    goal: 'Condicionamento',
    description: 'Séries longas e descansos curtos para melhorar a resistência muscular à fadiga.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      { name: 'Circuito Full Body', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Supino Inclinado com Halteres', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Puxada Frontal', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Elevação Lateral', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Abdominal Crunch', sets: 3, reps: '30', load: 'Corporal', rest: '45', method: '' },
      ]}
    ]
  },
  {
    id: 'tpl_calisthenics',
    name: 'Calistenia e Resistência',
    category: 'Resistência',
    goal: 'Resistência',
    description: 'Controle corporal e resistência com exercícios usando o próprio peso.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      { name: 'Upper Calistenia', exercises: [
        { name: 'Barra Fixa', sets: 4, reps: 'Máx', load: 'Corporal', rest: '90', method: '' },
        { name: 'Flexão de Braços', sets: 4, reps: 'Máx', load: 'Corporal', rest: '90', method: '' },
        { name: 'Mergulho nas Paralelas', sets: 3, reps: '10-15', load: 'Corporal', rest: '90', method: '' },
        { name: 'Prancha', sets: 3, reps: '60s', load: 'Corporal', rest: '60', method: '' },
      ]},
      { name: 'Lower e Core', exercises: [
        { name: 'Agachamento Búlgaro', sets: 4, reps: '15', load: 'Corporal', rest: '60', method: '' },
        { name: 'Agachamento com Salto', sets: 3, reps: '15', load: 'Corporal', rest: '60', method: '' },
        { name: 'Elevação de Pelve', sets: 3, reps: '20', load: 'Corporal', rest: '60', method: '' },
      ]}
    ]
  },
  {
    id: 'tpl_endurance_pro',
    name: 'Endurance Avançado (Resistência)',
    category: 'Resistência',
    goal: 'Resistência',
    description: 'Volume extremamente alto com cargas moderadas/leves, focado em capacidade de trabalho e resistência à fadiga muscular (Lactato).',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      { name: 'Endurance Inferior', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '20', load: 'Leve', rest: '60', method: 'Endurance (Resistência)' },
        { name: 'Leg Press 45°', sets: 4, reps: '20-25', load: 'Leve', rest: '60', method: 'Endurance (Resistência)' },
        { name: 'Passada/Avanço com Halteres', sets: 3, reps: '30 passos', load: 'Leve', rest: '45', method: 'Tensão Contínua' },
        { name: 'Cadeira Extensora', sets: 3, reps: '20', load: 'Leve', rest: '45', method: 'Rest-Pause' },
      ]},
      { name: 'Endurance Superior', exercises: [
        { name: 'Supino Reto com Halteres', sets: 4, reps: '15-20', load: 'Leve', rest: '60', method: 'Endurance (Resistência)' },
        { name: 'Puxada Frontal', sets: 4, reps: '15-20', load: 'Leve', rest: '60', method: 'Endurance (Resistência)' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '20', load: 'Leve', rest: '45', method: 'Tensão Contínua' },
        { name: 'Remada Baixa', sets: 3, reps: '20', load: 'Leve', rest: '45', method: 'Endurance (Resistência)' },
      ]},
      { name: 'Endurance Full Body', exercises: [
        { name: 'Levantamento Terra', sets: 3, reps: '15', load: 'Moderado', rest: '90', method: '' },
        { name: 'Agachamento Búlgaro', sets: 3, reps: '15', load: 'Corporal', rest: '60', method: '' },
        { name: 'Flexão de Braços', sets: 3, reps: 'Máx', load: 'Corporal', rest: '60', method: '' },
        { name: 'Remada Curvada com Barra', sets: 3, reps: '15', load: 'Leve', rest: '60', method: '' },
        { name: 'Abdominal Crunch', sets: 3, reps: '40', load: 'Corporal', rest: '45', method: '' },
      ]}
    ]
  }
];

export function getTemplatesByCategory() {
  const grouped = {};
  BUILT_IN_TEMPLATES.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });
  return grouped;
}
