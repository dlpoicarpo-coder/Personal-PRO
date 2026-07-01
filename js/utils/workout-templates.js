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
    periodizationTypes: ['linear', 'block'],
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
    periodizationTypes: ['linear', 'undulating', 'concurrent'],
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
    periodizationTypes: ['linear', 'undulating'],
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

  // ── Template específico para Ondulatória (DUP) ──
  {
    id: 'tpl_dup_full_body',
    name: 'DUP — Full Body Ondulatório',
    category: 'Hipertrofia',
    goal: 'Hipertrofia + Força',
    description: 'Três estímulos por semana alternando Força (5×5), Hipertrofia (4×10) e Potência (3×3) no mesmo exercício.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['undulating'],
    workouts: [
      { name: 'Dia Força (5×5)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 5, reps: '5', load: '', rest: '180', method: 'Força' },
        { name: 'Supino Reto com Barra', sets: 5, reps: '5', load: '', rest: '180', method: 'Força' },
        { name: 'Levantamento Terra', sets: 5, reps: '5', load: '', rest: '180', method: 'Força' },
      ]},
      { name: 'Dia Hipertrofia (4×10)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '10', load: '', rest: '90', method: 'Hipertrofia' },
        { name: 'Supino Reto com Barra', sets: 4, reps: '10', load: '', rest: '90', method: 'Hipertrofia' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '10', load: '', rest: '90', method: 'Hipertrofia' },
      ]},
      { name: 'Dia Potência (3×3)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 3, reps: '3', load: '', rest: '240', method: 'Velocidade' },
        { name: 'Supino Reto com Barra', sets: 3, reps: '3', load: '', rest: '240', method: 'Velocidade' },
        { name: 'Levantamento Terra', sets: 3, reps: '3', load: '', rest: '240', method: 'Velocidade' },
      ]},
    ]
  },

  // ── Template específico para Blocos ──
  {
    id: 'tpl_block_periodization',
    name: 'Blocos — Acumulação → Intensificação',
    category: 'Força',
    goal: 'Força + Hipertrofia',
    description: 'Progressão em blocos: semanas de acumulação (volume alto) seguidas de intensificação (carga alta) e realização (pico).',
    daysPerWeek: 4,
    builtIn: true,
    periodizationTypes: ['block'],
    workouts: [
      { name: 'A — Quadril Dominante', exercises: [
        { name: 'Levantamento Terra', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Agachamento Búlgaro', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Mesa Flexora', sets: 3, reps: '10', load: '', rest: '90', method: '' },
      ]},
      { name: 'B — Joelho Dominante', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Leg Press 45°', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Cadeira Extensora', sets: 3, reps: '10', load: '', rest: '60', method: '' },
      ]},
      { name: 'C — Empurrar (Upper Push)', exercises: [
        { name: 'Supino Reto com Barra', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Desenvolvimento com Barra', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Tríceps Testa', sets: 3, reps: '10', load: '', rest: '60', method: '' },
      ]},
      { name: 'D — Puxar (Upper Pull)', exercises: [
        { name: 'Puxada Frontal', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Remada Curvada com Barra', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Rosca Direta com Barra', sets: 3, reps: '10', load: '', rest: '60', method: '' },
      ]},
    ]
  },

  // ── Template específico para Conjugada ──
  {
    id: 'tpl_conjugate',
    name: 'Conjugada — ME + DE',
    category: 'Força',
    goal: 'Força Máxima',
    description: 'Método Westside: dois dias de Esforço Máximo (ME) e dois de Esforço Dinâmico (DE) por semana.',
    daysPerWeek: 4,
    builtIn: true,
    periodizationTypes: ['conjugate'],
    workouts: [
      { name: 'ME Lower (Esforço Máximo Inferior)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 5, reps: '1-3', load: '', rest: '240', method: 'Esforço Máximo' },
        { name: 'Levantamento Terra Romeno', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Mesa Flexora', sets: 3, reps: '10', load: '', rest: '90', method: '' },
      ]},
      { name: 'ME Upper (Esforço Máximo Superior)', exercises: [
        { name: 'Supino Reto com Barra', sets: 5, reps: '1-3', load: '', rest: '240', method: 'Esforço Máximo' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '6', load: '', rest: '120', method: '' },
        { name: 'Tríceps Testa', sets: 3, reps: '8', load: '', rest: '90', method: '' },
      ]},
      { name: 'DE Lower (Esforço Dinâmico Inferior)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 8, reps: '2', load: '', rest: '60', method: 'Velocidade' },
        { name: 'Levantamento Terra', sets: 6, reps: '1', load: '', rest: '60', method: 'Velocidade' },
      ]},
      { name: 'DE Upper (Esforço Dinâmico Superior)', exercises: [
        { name: 'Supino Reto com Barra', sets: 9, reps: '3', load: '', rest: '60', method: 'Velocidade' },
        { name: 'Remada Unilateral com Halter', sets: 4, reps: '8', load: '', rest: '60', method: '' },
      ]},
    ]
  },

  // ── Template específico para Concorrente ──
  {
    id: 'tpl_concurrent',
    name: 'Concorrente — Força + Cardio',
    category: 'Hipertrofia',
    goal: 'Condicionamento + Força',
    description: 'Treinos combinando musculação e trabalho cardiovascular na mesma sessão ou em dias alternados.',
    daysPerWeek: 4,
    builtIn: true,
    periodizationTypes: ['concurrent'],
    workouts: [
      { name: 'Treino A — Força + Cardio LISS', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Supino Reto com Barra', sets: 4, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Treino Contínuo (Cardio)', sets: 1, reps: '20 min', load: 'Z2', rest: '0', method: '' },
      ]},
      { name: 'Treino B — Força + HIIT', exercises: [
        { name: 'Levantamento Terra', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Puxada Frontal', sets: 4, reps: '10', load: '', rest: '90', method: '' },
        { name: 'Tiro/Sprint (Cardio)', sets: 6, reps: '30 seg', load: 'Z4', rest: '0', method: 'Série' },
      ]},
    ]
  },

  // ── Template para Linear Reversa ──
  {
    id: 'tpl_reverse_linear',
    name: 'Linear Reversa — RML',
    category: 'Resistência',
    goal: 'Resistência Muscular',
    description: 'Começa com repetições altas e reduz ao longo do ciclo. Ideal para resistência e emagrecimento.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['reverse_linear'],
    workouts: [
      { name: 'Full Body RML', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (Resistência)' },
        { name: 'Supino Inclinado com Halteres', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (Resistência)' },
        { name: 'Puxada Frontal', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (Resistência)' },
        { name: 'Levantamento Terra Romeno', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (Resistência)' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (Resistência)' },
      ]},
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
    periodizationTypes: ['linear', 'block', 'conjugate'],
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
    periodizationTypes: ['block', 'conjugate'],
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
    periodizationTypes: ['lsd', 'polarized'],
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
    periodizationTypes: ['hiit'],
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
    description: 'Treino no VT2/OBLA (85-92% FCmáx) para aumentar velocidade sustentável. Mínimo 20 min para adaptação do tamponamento de lactato.',
    daysPerWeek: 2,
    builtIn: true,
    periodizationTypes: ['threshold'],
    workouts: [
      { name: 'Tempo Run', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Treino Contínuo (Cardio)', sets: 1, reps: '20-40 min', load: 'Z4', rest: '0', method: 'Zona 4 (Z4) — Limiar' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' }
      ]}
    ]
  },

  // ── Template para Polarizado ──
  {
    id: 'tpl_polarized',
    name: 'Polarizado — 80/20',
    category: 'Cardio Endurance',
    goal: 'Performance',
    description: '80% do volume em Z1/Z2 e 20% em Z4/Z5. Modelo usado por atletas de elite.',
    daysPerWeek: 5,
    builtIn: true,
    periodizationTypes: ['polarized'],
    workouts: [
      { name: 'Sessão Longa Z2 (×4)', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' },
        { name: 'Treino Contínuo (Cardio)', sets: 1, reps: '60-90 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' },
      ]},
      { name: 'Sessão Intensa Z4/Z5 (×1)', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '15 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Tiro/Sprint (Cardio)', sets: 5, reps: '4 min', load: 'Z4', rest: '0', method: 'Série' },
        { name: 'Recuperação Ativa (Cardio)', sets: 5, reps: '3 min', load: 'Z1', rest: '0', method: 'Série' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' },
      ]},
    ]
  },

  // ── Template para Fartlek ──
  {
    id: 'tpl_fartlek',
    name: 'Fartlek — Variação Livre',
    category: 'Cardio Endurance',
    goal: 'Condicionamento',
    description: 'Alternância livre de ritmo durante o treino, sem protocolo rígido. Estimula todas as zonas.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['fartlek'],
    workouts: [
      { name: 'Fartlek Livre', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' },
        { name: 'Treino Contínuo (Cardio)', sets: 1, reps: '30-40 min', load: 'Z1-Z4', rest: '0', method: 'Fartlek' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' },
      ]},
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
    periodizationTypes: ['conjugate', 'block'],
    workouts: [
      { name: 'Lower Power', exercises: [
        { name: 'Salto na Caixa (Box Jump)', sets: 4, reps: '3-5', load: 'Corporal', rest: '120', method: 'Explosivo', loadType: 'bodyweight' },
        { name: 'Agachamento com Salto', sets: 3, reps: '5', load: 'Corporal', rest: '90', method: 'Explosivo', loadType: 'bodyweight' },
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '3', load: '70% 1RM', rest: '180', method: 'Velocidade' },
      ]},
      { name: 'Upper Power', exercises: [
        { name: 'Arremesso de Medicine Ball', sets: 4, reps: '5', load: 'Leve', rest: '90', method: 'Explosivo', loadType: 'bodyweight' },
        { name: 'Flexão de Braço com Salto', sets: 3, reps: '5', load: 'Corporal', rest: '90', method: 'Explosivo', loadType: 'bodyweight' },
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
    periodizationTypes: ['block', 'conjugate'],
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
    periodizationTypes: ['reverse_linear', 'concurrent'],
    workouts: [
      { name: 'Circuito Full Body', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Supino Inclinado com Halteres', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Puxada Frontal', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Elevação Lateral', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Abdominal Crunch', sets: 3, reps: '30', load: 'Corporal', rest: '45', method: '', loadType: 'bodyweight' },
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
    periodizationTypes: ['reverse_linear', 'concurrent'],
    workouts: [
      { name: 'Upper Calistenia', exercises: [
        { name: 'Barra Fixa', sets: 4, reps: 'Máx', load: 'Corporal', rest: '90', method: '', loadType: 'bodyweight' },
        { name: 'Flexão de Braços', sets: 4, reps: 'Máx', load: 'Corporal', rest: '90', method: '', loadType: 'bodyweight' },
        { name: 'Mergulho nas Paralelas', sets: 3, reps: '10-15', load: 'Corporal', rest: '90', method: '', loadType: 'bodyweight' },
        { name: 'Prancha', sets: 3, reps: '60s', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
      ]},
      { name: 'Lower e Core', exercises: [
        { name: 'Agachamento Búlgaro', sets: 4, reps: '15', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
        { name: 'Agachamento com Salto', sets: 3, reps: '15', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
        { name: 'Elevação de Pelve', sets: 3, reps: '20', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
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
    periodizationTypes: ['reverse_linear', 'lsd'],
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
        { name: 'Agachamento Búlgaro', sets: 3, reps: '15', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
        { name: 'Flexão de Braços', sets: 3, reps: 'Máx', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
        { name: 'Remada Curvada com Barra', sets: 3, reps: '15', load: 'Leve', rest: '60', method: '' },
        { name: 'Abdominal Crunch', sets: 3, reps: '40', load: 'Corporal', rest: '45', method: '', loadType: 'bodyweight' },
      ]}
    ]
  },
  {
    id: 'tpl_ildemera_ondulatorio',
    name: 'Ildemera — DUP Ondulatório (Full Body + Cardio)',
    category: 'Hipertrofia',
    goal: 'Emagrecimento / Condicionamento',
    description: 'Planejamento estratégico de 5 dias semanais para Ildemera. Combina 3 treinos Full Body (Metabólico, Hipertrofia e Força) com 2 dias de Cardio (LISS e HIIT).',
    daysPerWeek: 5,
    builtIn: true,
    periodizationTypes: ['undulating', 'linear'],
    workouts: [
      { name: 'Full Body A — Metabólico', exercises: [
        { name: 'Leg 45°', sets: 3, reps: '20-25', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Puxada Alta Triângulo', sets: 3, reps: '18-20', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Agachamento Sumô', sets: 3, reps: '20', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Supino com Halter', sets: 3, reps: '15-18', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Elevação Pélvica', sets: 3, reps: '20', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Desenvolvimento Unilateral', sets: 2, reps: '18', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Prancha Isométrica', sets: 3, reps: '30-40s', load: 'Corporal', rest: '45', method: '', loadType: 'time' }
      ]},
      { name: 'Cardio 1 — LISS', exercises: [
        { name: 'Caminhada inclinada', sets: 1, reps: '35-40 min', load: 'Zona 2', rest: '0', method: '', loadType: 'time' }
      ]},
      { name: 'Full Body B — Hipertrofia', exercises: [
        { name: 'Búlgaro no Step', sets: 3, reps: '10-12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Remada Articulada', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Stiff', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Flexão de Braços / Supino Máquina', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Cadeira Extensora', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Cadeira Abdutora', sets: 3, reps: '15', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Dead Bug', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Panturrilha', sets: 3, reps: '15-20', load: '', rest: '60', method: '', loadType: 'weight' }
      ]},
      { name: 'Cardio 2 — HIIT', exercises: [
        { name: 'Escada de Agilidade', sets: 1, reps: '20-25 min', load: 'Borg 7-8', rest: '0', method: 'HIIT 30-30', loadType: 'time' }
      ]},
      { name: 'Full Body C — Força (Presencial)', exercises: [
        { name: 'Leg 45°', sets: 4, reps: '8', load: '', rest: '90', method: 'Pirâmide', loadType: 'weight' },
        { name: 'Puxada Alta', sets: 4, reps: '8', load: '', rest: '90', method: '', loadType: 'weight' },
        { name: 'Agachamento Sumô', sets: 3, reps: '8', load: '', rest: '90', method: '', loadType: 'weight' },
        { name: 'Desenvolvimento', sets: 3, reps: '8', load: '', rest: '90', method: '', loadType: 'weight' },
        { name: 'Cadeira Flexora', sets: 3, reps: '8', load: '', rest: '90', method: '', loadType: 'weight' },
        { name: 'Remada Unilateral', sets: 3, reps: '8', load: '', rest: '90', method: '', loadType: 'weight' },
        { name: 'Prancha Lateral', sets: 3, reps: '30s', load: 'Corporal', rest: '90', method: '', loadType: 'time' }
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
