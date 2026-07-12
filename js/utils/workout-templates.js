// ========================================
// VETOR â€” Workout Templates Library
// Pre-built + custom workout templates
// ========================================

export const BUILT_IN_TEMPLATES = [
  // ================= HIPERTROFIA =================
  {
    id: 'tpl_upper_lower',
    name: 'Superior / Inferior',
    category: 'Hipertrofia',
    goal: 'Hipertrofia',
    description: 'DivisÃ£o clÃ¡ssica upper/lower para ganho de massa muscular com volume moderado.',
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
        { name: 'TrÃ­ceps Pulley', sets: 3, reps: '12', load: '', rest: '60', method: '' },
      ]},
      { name: 'Treino B - Inferior', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', load: '', rest: '120', method: '' },
        { name: 'Leg Press 45Â°', sets: 4, reps: '10-12', load: '', rest: '90', method: '' },
        { name: 'Cadeira Extensora', sets: 3, reps: '12', load: '', rest: '60', method: '' },
        { name: 'Mesa Flexora', sets: 3, reps: '12', load: '', rest: '60', method: '' },
        { name: 'Panturrilha em PÃ© na MÃ¡quina', sets: 4, reps: '15', load: '', rest: '45', method: '' },
      ]}
    ]
  },
  {
    id: 'tpl_push_pull_legs',
    name: 'Push / Pull / Legs',
    category: 'Hipertrofia',
    goal: 'Hipertrofia',
    description: 'DivisÃ£o PPL clÃ¡ssica para atletas. Alto volume com mÃ©todos intensificadores.',
    daysPerWeek: 6,
    builtIn: true,
    periodizationTypes: ['linear', 'undulating', 'concurrent'],
    workouts: [
      { name: 'Push (Empurrar)', exercises: [
        { name: 'Supino Reto com Barra', sets: 4, reps: '6-8', load: '', rest: '120', method: '' },
        { name: 'Supino Inclinado com Halteres', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'Desenvolvimento com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'ElevaÃ§Ã£o Lateral', sets: 4, reps: '12-15', load: '', rest: '60', method: 'Drop set' },
        { name: 'TrÃ­ceps Testa', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
      ]},
      { name: 'Pull (Puxar)', exercises: [
        { name: 'Puxada Frontal', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
        { name: 'Remada Unilateral com Halter', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
        { name: 'Rosca Alternada com Halteres', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
      ]},
      { name: 'Legs (Pernas)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '6-8', load: '', rest: '180', method: '' },
        { name: 'Leg Press 45Â°', sets: 4, reps: '10-12', load: '', rest: '90', method: '' },
        { name: 'Cadeira Extensora', sets: 3, reps: '12-15', load: '', rest: '60', method: 'Drop set' },
        { name: 'Mesa Flexora', sets: 4, reps: '10-12', load: '', rest: '60', method: '' },
      ]}
    ]
  },
  {
    id: 'tpl_pyramid_hypertrophy',
    name: 'PirÃ¢mide de Hipertrofia',
    category: 'Hipertrofia',
    goal: 'Hipertrofia',
    description: 'Foco na exaustÃ£o total e controle de fadiga usando mÃ©todos de pirÃ¢mide completa e decrescente.',
    daysPerWeek: 4,
    builtIn: true,
    periodizationTypes: ['linear', 'undulating'],
    workouts: [
      { name: 'Peito e TrÃ­ceps', exercises: [
        { name: 'Supino Reto com Barra', sets: 5, reps: '12-10-8-10-12', load: '', rest: '90', method: 'PirÃ¢mide Completa' },
        { name: 'Supino Inclinado com Halteres', sets: 4, reps: '8-10-12-15', load: '', rest: '90', method: 'PirÃ¢mide Decrescente' },
        { name: 'Crucifixo MÃ¡quina', sets: 3, reps: '12-15', load: '', rest: '60', method: 'TensÃ£o ContÃ­nua' },
        { name: 'TrÃ­ceps Pulley', sets: 4, reps: '10-12-15-20', load: '', rest: '60', method: 'PirÃ¢mide Decrescente' },
      ]},
      { name: 'Costas e BÃ­ceps', exercises: [
        { name: 'Puxada Frontal', sets: 5, reps: '12-10-8-10-12', load: '', rest: '90', method: 'PirÃ¢mide Completa' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10-12-15', load: '', rest: '90', method: 'PirÃ¢mide Decrescente' },
        { name: 'Rosca Direta com Barra', sets: 4, reps: '12-10-8-12', load: '', rest: '60', method: 'PirÃ¢mide' },
      ]},
      { name: 'Pernas', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 5, reps: '12-10-8-10-12', load: '', rest: '120', method: 'PirÃ¢mide Completa' },
        { name: 'Leg Press 45Â°', sets: 4, reps: '10-12-15-20', load: '', rest: '90', method: 'PirÃ¢mide Decrescente' },
        { name: 'Cadeira Extensora', sets: 4, reps: '15', load: '', rest: '60', method: 'Drop set' },
      ]}
    ]
  },

  // â”€â”€ Template especÃ­fico para OndulatÃ³ria (DUP) â”€â”€
  {
    id: 'tpl_dup_full_body',
    name: 'DUP â€” Full Body OndulatÃ³rio',
    category: 'Hipertrofia',
    goal: 'Hipertrofia + ForÃ§a',
    description: 'TrÃªs estÃ­mulos por semana alternando ForÃ§a (5Ã—5), Hipertrofia (4Ã—10) e PotÃªncia (3Ã—3) no mesmo exercÃ­cio.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['undulating'],
    workouts: [
      { name: 'Dia ForÃ§a (5Ã—5)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 5, reps: '5', load: '', rest: '180', method: 'ForÃ§a' },
        { name: 'Supino Reto com Barra', sets: 5, reps: '5', load: '', rest: '180', method: 'ForÃ§a' },
        { name: 'Levantamento Terra', sets: 5, reps: '5', load: '', rest: '180', method: 'ForÃ§a' },
      ]},
      { name: 'Dia Hipertrofia (4Ã—10)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '10', load: '', rest: '90', method: 'Hipertrofia' },
        { name: 'Supino Reto com Barra', sets: 4, reps: '10', load: '', rest: '90', method: 'Hipertrofia' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '10', load: '', rest: '90', method: 'Hipertrofia' },
      ]},
      { name: 'Dia PotÃªncia (3Ã—3)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 3, reps: '3', load: '', rest: '240', method: 'Velocidade' },
        { name: 'Supino Reto com Barra', sets: 3, reps: '3', load: '', rest: '240', method: 'Velocidade' },
        { name: 'Levantamento Terra', sets: 3, reps: '3', load: '', rest: '240', method: 'Velocidade' },
      ]},
    ]
  },

  // â”€â”€ Template especÃ­fico para Blocos â”€â”€
  {
    id: 'tpl_block_periodization',
    name: 'Blocos â€” AcumulaÃ§Ã£o â†’ IntensificaÃ§Ã£o',
    category: 'ForÃ§a',
    goal: 'ForÃ§a + Hipertrofia',
    description: 'ProgressÃ£o em blocos: semanas de acumulaÃ§Ã£o (volume alto) seguidas de intensificaÃ§Ã£o (carga alta) e realizaÃ§Ã£o (pico).',
    daysPerWeek: 4,
    builtIn: true,
    periodizationTypes: ['block'],
    workouts: [
      { name: 'A â€” Quadril Dominante', exercises: [
        { name: 'Levantamento Terra', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Agachamento BÃºlgaro', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Mesa Flexora', sets: 3, reps: '10', load: '', rest: '90', method: '' },
      ]},
      { name: 'B â€” Joelho Dominante', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Leg Press 45Â°', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Cadeira Extensora', sets: 3, reps: '10', load: '', rest: '60', method: '' },
      ]},
      { name: 'C â€” Empurrar (Upper Push)', exercises: [
        { name: 'Supino Reto com Barra', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Desenvolvimento com Barra', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'TrÃ­ceps Testa', sets: 3, reps: '10', load: '', rest: '60', method: '' },
      ]},
      { name: 'D â€” Puxar (Upper Pull)', exercises: [
        { name: 'Puxada Frontal', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Remada Curvada com Barra', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Rosca Direta com Barra', sets: 3, reps: '10', load: '', rest: '60', method: '' },
      ]},
    ]
  },

  // â”€â”€ Template especÃ­fico para Conjugada â”€â”€
  {
    id: 'tpl_conjugate',
    name: 'Conjugada â€” ME + DE',
    category: 'ForÃ§a',
    goal: 'ForÃ§a MÃ¡xima',
    description: 'MÃ©todo Westside: dois dias de EsforÃ§o MÃ¡ximo (ME) e dois de EsforÃ§o DinÃ¢mico (DE) por semana.',
    daysPerWeek: 4,
    builtIn: true,
    periodizationTypes: ['conjugate'],
    workouts: [
      { name: 'ME Lower (EsforÃ§o MÃ¡ximo Inferior)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 5, reps: '1-3', load: '', rest: '240', method: 'EsforÃ§o MÃ¡ximo' },
        { name: 'Levantamento Terra Romeno', sets: 3, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Mesa Flexora', sets: 3, reps: '10', load: '', rest: '90', method: '' },
      ]},
      { name: 'ME Upper (EsforÃ§o MÃ¡ximo Superior)', exercises: [
        { name: 'Supino Reto com Barra', sets: 5, reps: '1-3', load: '', rest: '240', method: 'EsforÃ§o MÃ¡ximo' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '6', load: '', rest: '120', method: '' },
        { name: 'TrÃ­ceps Testa', sets: 3, reps: '8', load: '', rest: '90', method: '' },
      ]},
      { name: 'DE Lower (EsforÃ§o DinÃ¢mico Inferior)', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 8, reps: '2', load: '', rest: '60', method: 'Velocidade' },
        { name: 'Levantamento Terra', sets: 6, reps: '1', load: '', rest: '60', method: 'Velocidade' },
      ]},
      { name: 'DE Upper (EsforÃ§o DinÃ¢mico Superior)', exercises: [
        { name: 'Supino Reto com Barra', sets: 9, reps: '3', load: '', rest: '60', method: 'Velocidade' },
        { name: 'Remada Unilateral com Halter', sets: 4, reps: '8', load: '', rest: '60', method: '' },
      ]},
    ]
  },

  // â”€â”€ Template especÃ­fico para Concorrente â”€â”€
  {
    id: 'tpl_concurrent',
    name: 'Concorrente â€” ForÃ§a + Cardio',
    category: 'Hipertrofia',
    goal: 'Condicionamento + ForÃ§a',
    description: 'Treinos combinando musculaÃ§Ã£o e trabalho cardiovascular na mesma sessÃ£o ou em dias alternados.',
    daysPerWeek: 4,
    builtIn: true,
    periodizationTypes: ['concurrent'],
    workouts: [
      { name: 'Treino A â€” ForÃ§a + Cardio LISS', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Supino Reto com Barra', sets: 4, reps: '8', load: '', rest: '120', method: '' },
        { name: 'Treino ContÃ­nuo (Cardio)', sets: 1, reps: '20 min', load: 'Z2', rest: '0', method: '' },
      ]},
      { name: 'Treino B â€” ForÃ§a + HIIT', exercises: [
        { name: 'Levantamento Terra', sets: 4, reps: '6', load: '', rest: '180', method: '' },
        { name: 'Puxada Frontal', sets: 4, reps: '10', load: '', rest: '90', method: '' },
        { name: 'Tiro/Sprint (Cardio)', sets: 6, reps: '30 seg', load: 'Z4', rest: '0', method: 'SÃ©rie' },
      ]},
    ]
  },

  // â”€â”€ Template para Linear Reversa â”€â”€
  {
    id: 'tpl_reverse_linear',
    name: 'Linear Reversa â€” RML',
    category: 'ResistÃªncia',
    goal: 'ResistÃªncia Muscular',
    description: 'ComeÃ§a com repetiÃ§Ãµes altas e reduz ao longo do ciclo. Ideal para resistÃªncia e emagrecimento.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['reverse_linear'],
    workouts: [
      { name: 'Full Body RML', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (ResistÃªncia)' },
        { name: 'Supino Inclinado com Halteres', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (ResistÃªncia)' },
        { name: 'Puxada Frontal', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (ResistÃªncia)' },
        { name: 'Levantamento Terra Romeno', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (ResistÃªncia)' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '20', load: '', rest: '60', method: 'Endurance (ResistÃªncia)' },
      ]},
    ]
  },

  // ================= FORÃ‡A =================
  {
    id: 'tpl_strength_5x5',
    name: 'ForÃ§a MÃ¡xima â€” 5x5',
    category: 'ForÃ§a',
    goal: 'ForÃ§a',
    description: 'Programa clÃ¡ssico de forÃ§a 5x5 focando nos levantamentos bÃ¡sicos.',
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
    name: 'Powerlifting BÃ¡sico',
    category: 'ForÃ§a',
    goal: 'ForÃ§a',
    description: 'Foco puro em Agachamento, Supino e Terra (SBD) com acessÃ³rios auxiliares.',
    daysPerWeek: 4,
    builtIn: true,
    periodizationTypes: ['block', 'conjugate'],
    workouts: [
      { name: 'Squat Day', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '3-5', load: '', rest: '180', method: '' },
        { name: 'Leg Press 45Â°', sets: 3, reps: '8-10', load: '', rest: '120', method: '' },
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
    name: 'Base AerÃ³bica (LISS)',
    category: 'Cardio Endurance',
    goal: 'Condicionamento',
    description: 'Volume aerÃ³bico contÃ­nuo de baixa intensidade para desenvolver a base cardiovascular (Zona 2).',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['lsd', 'polarized'],
    workouts: [
      { name: 'Endurance Longo', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' },
        { name: 'Treino ContÃ­nuo (Cardio)', sets: 1, reps: '45-60 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' }
      ]},
      { name: 'RecuperaÃ§Ã£o Ativa', exercises: [
        { name: 'Treino ContÃ­nuo (Cardio)', sets: 1, reps: '30 min', load: 'Z1', rest: '0', method: '' }
      ]}
    ]
  },
  {
    id: 'tpl_cardio_hiit',
    name: 'HIIT Curto',
    category: 'Cardio Endurance',
    goal: 'Emagrecimento',
    description: 'Treinamento Intervalado de Alta Intensidade para ganho de VO2Max e queima rÃ¡pida.',
    daysPerWeek: 2,
    builtIn: true,
    periodizationTypes: ['hiit'],
    workouts: [
      { name: 'HIIT Protocolo 30/60', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' },
        { name: 'Tiro/Sprint (Cardio)', sets: 8, reps: '30 seg', load: 'Z4', rest: '0', method: 'SÃ©rie' },
        { name: 'RecuperaÃ§Ã£o Ativa (Cardio)', sets: 8, reps: '60 seg', load: 'Z1', rest: '0', method: 'SÃ©rie' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' }
      ]}
    ]
  },
  {
    id: 'tpl_cardio_threshold',
    name: 'Treino de Limiar (Tempo Run)',
    category: 'Cardio Endurance',
    goal: 'Performance',
    description: 'Treino no VT2/OBLA (85-92% FCmÃ¡x) para aumentar velocidade sustentÃ¡vel. MÃ­nimo 20 min para adaptaÃ§Ã£o do tamponamento de lactato.',
    daysPerWeek: 2,
    builtIn: true,
    periodizationTypes: ['threshold'],
    workouts: [
      { name: 'Tempo Run', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Treino ContÃ­nuo (Cardio)', sets: 1, reps: '20-40 min', load: 'Z4', rest: '0', method: 'Zona 4 (Z4) â€” Limiar' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' }
      ]}
    ]
  },

  // â”€â”€ Template para Polarizado â”€â”€
  {
    id: 'tpl_polarized',
    name: 'Polarizado â€” 80/20',
    category: 'Cardio Endurance',
    goal: 'Performance',
    description: '80% do volume em Z1/Z2 e 20% em Z4/Z5. Modelo usado por atletas de elite.',
    daysPerWeek: 5,
    builtIn: true,
    periodizationTypes: ['polarized'],
    workouts: [
      { name: 'SessÃ£o Longa Z2 (Ã—4)', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' },
        { name: 'Treino ContÃ­nuo (Cardio)', sets: 1, reps: '60-90 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' },
      ]},
      { name: 'SessÃ£o Intensa Z4/Z5 (Ã—1)', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '15 min', load: 'Z2', rest: '0', method: '' },
        { name: 'Tiro/Sprint (Cardio)', sets: 5, reps: '4 min', load: 'Z4', rest: '0', method: 'SÃ©rie' },
        { name: 'RecuperaÃ§Ã£o Ativa (Cardio)', sets: 5, reps: '3 min', load: 'Z1', rest: '0', method: 'SÃ©rie' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' },
      ]},
    ]
  },

  // â”€â”€ Template para Fartlek â”€â”€
  {
    id: 'tpl_fartlek',
    name: 'Fartlek â€” VariaÃ§Ã£o Livre',
    category: 'Cardio Endurance',
    goal: 'Condicionamento',
    description: 'AlternÃ¢ncia livre de ritmo durante o treino, sem protocolo rÃ­gido. Estimula todas as zonas.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['fartlek'],
    workouts: [
      { name: 'Fartlek Livre', exercises: [
        { name: 'Aquecimento (Cardio)', sets: 1, reps: '10 min', load: 'Z1', rest: '0', method: '' },
        { name: 'Treino ContÃ­nuo (Cardio)', sets: 1, reps: '30-40 min', load: 'Z1-Z4', rest: '0', method: 'Fartlek' },
        { name: 'Desaquecimento (Cardio)', sets: 1, reps: '5 min', load: 'Z1', rest: '0', method: '' },
      ]},
    ]
  },

  // ================= POTÃŠNCIA =================
  {
    id: 'tpl_power_plyo',
    name: 'PotÃªncia e Pliometria',
    category: 'PotÃªncia',
    goal: 'Performance',
    description: 'Foco na taxa de desenvolvimento de forÃ§a (RFD) usando exercÃ­cios explosivos e saltos.',
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
        { name: 'FlexÃ£o de BraÃ§o com Salto', sets: 3, reps: '5', load: 'Corporal', rest: '90', method: 'Explosivo', loadType: 'bodyweight' },
        { name: 'Supino Reto com Barra', sets: 4, reps: '3', load: '60% 1RM', rest: '120', method: 'Velocidade' },
      ]}
    ]
  },
  {
    id: 'tpl_olympic',
    name: 'LPO Iniciante (Levantamento OlÃ­mpico)',
    category: 'PotÃªncia',
    goal: 'Performance',
    description: 'Movimentos baseados no arranco e arremesso para desenvolvimento de potÃªncia extrema.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['block', 'conjugate'],
    workouts: [
      { name: 'Dia A - Arranco', exercises: [
        { name: 'Arranco (Snatch)', sets: 5, reps: '3', load: 'Moderado', rest: '120', method: 'TÃ©cnica' },
        { name: 'Agachamento Frontal', sets: 4, reps: '5', load: 'Pesado', rest: '180', method: '' },
      ]},
      { name: 'Dia B - Arremesso', exercises: [
        { name: 'Arremesso (Clean & Jerk)', sets: 5, reps: '3', load: 'Moderado', rest: '120', method: 'TÃ©cnica' },
        { name: 'Levantamento Terra', sets: 4, reps: '5', load: 'Pesado', rest: '180', method: '' },
      ]}
    ]
  },

  // ================= RESISTÃŠNCIA =================
  {
    id: 'tpl_muscular_endurance',
    name: 'ResistÃªncia Muscular Localizada',
    category: 'ResistÃªncia',
    goal: 'Condicionamento',
    description: 'SÃ©ries longas e descansos curtos para melhorar a resistÃªncia muscular Ã  fadiga.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['reverse_linear', 'concurrent'],
    workouts: [
      { name: 'Circuito Full Body', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Supino Inclinado com Halteres', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Puxada Frontal', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'ElevaÃ§Ã£o Lateral', sets: 3, reps: '20', load: 'Leve', rest: '45', method: '' },
        { name: 'Abdominal Crunch', sets: 3, reps: '30', load: 'Corporal', rest: '45', method: '', loadType: 'bodyweight' },
      ]}
    ]
  },
  {
    id: 'tpl_calisthenics',
    name: 'Calistenia e ResistÃªncia',
    category: 'ResistÃªncia',
    goal: 'ResistÃªncia',
    description: 'Controle corporal e resistÃªncia com exercÃ­cios usando o prÃ³prio peso.',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['reverse_linear', 'concurrent'],
    workouts: [
      { name: 'Upper Calistenia', exercises: [
        { name: 'Barra Fixa', sets: 4, reps: 'MÃ¡x', load: 'Corporal', rest: '90', method: '', loadType: 'bodyweight' },
        { name: 'FlexÃ£o de BraÃ§os', sets: 4, reps: 'MÃ¡x', load: 'Corporal', rest: '90', method: '', loadType: 'bodyweight' },
        { name: 'Mergulho nas Paralelas', sets: 3, reps: '10-15', load: 'Corporal', rest: '90', method: '', loadType: 'bodyweight' },
        { name: 'Prancha', sets: 3, reps: '60s', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
      ]},
      { name: 'Lower e Core', exercises: [
        { name: 'Agachamento BÃºlgaro', sets: 4, reps: '15', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
        { name: 'Agachamento com Salto', sets: 3, reps: '15', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
        { name: 'ElevaÃ§Ã£o de Pelve', sets: 3, reps: '20', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
      ]}
    ]
  },
  {
    id: 'tpl_endurance_pro',
    name: 'Endurance AvanÃ§ado (ResistÃªncia)',
    category: 'ResistÃªncia',
    goal: 'ResistÃªncia',
    description: 'Volume extremamente alto com cargas moderadas/leves, focado em capacidade de trabalho e resistÃªncia Ã  fadiga muscular (Lactato).',
    daysPerWeek: 3,
    builtIn: true,
    periodizationTypes: ['reverse_linear', 'lsd'],
    workouts: [
      { name: 'Endurance Inferior', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '20', load: 'Leve', rest: '60', method: 'Endurance (ResistÃªncia)' },
        { name: 'Leg Press 45Â°', sets: 4, reps: '20-25', load: 'Leve', rest: '60', method: 'Endurance (ResistÃªncia)' },
        { name: 'Passada/AvanÃ§o com Halteres', sets: 3, reps: '30 passos', load: 'Leve', rest: '45', method: 'TensÃ£o ContÃ­nua' },
        { name: 'Cadeira Extensora', sets: 3, reps: '20', load: 'Leve', rest: '45', method: 'Rest-Pause' },
      ]},
      { name: 'Endurance Superior', exercises: [
        { name: 'Supino Reto com Halteres', sets: 4, reps: '15-20', load: 'Leve', rest: '60', method: 'Endurance (ResistÃªncia)' },
        { name: 'Puxada Frontal', sets: 4, reps: '15-20', load: 'Leve', rest: '60', method: 'Endurance (ResistÃªncia)' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '20', load: 'Leve', rest: '45', method: 'TensÃ£o ContÃ­nua' },
        { name: 'Remada Baixa', sets: 3, reps: '20', load: 'Leve', rest: '45', method: 'Endurance (ResistÃªncia)' },
      ]},
      { name: 'Endurance Full Body', exercises: [
        { name: 'Levantamento Terra', sets: 3, reps: '15', load: 'Moderado', rest: '90', method: '' },
        { name: 'Agachamento BÃºlgaro', sets: 3, reps: '15', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
        { name: 'FlexÃ£o de BraÃ§os', sets: 3, reps: 'MÃ¡x', load: 'Corporal', rest: '60', method: '', loadType: 'bodyweight' },
        { name: 'Remada Curvada com Barra', sets: 3, reps: '15', load: 'Leve', rest: '60', method: '' },
        { name: 'Abdominal Crunch', sets: 3, reps: '40', load: 'Corporal', rest: '45', method: '', loadType: 'bodyweight' },
      ]}
    ]
  },
  {
    id: 'tpl_ildemera_ondulatorio',
    name: 'DUP OndulatÃ³rio (Full Body + Cardio)',
    category: 'Hipertrofia',
    goal: 'Emagrecimento / Condicionamento',
    description: 'Planejamento estratÃ©gico de 5 dias semanais. Combina 3 treinos Full Body (MetabÃ³lico, Hipertrofia e ForÃ§a) com 2 dias de Cardio (LISS e HIIT).',
    daysPerWeek: 5,
    builtIn: true,
    periodizationTypes: ['undulating', 'linear'],
    workouts: [
      { name: 'Full Body A â€” MetabÃ³lico', exercises: [
        { name: 'Leg 45Â°', sets: 3, reps: '20-25', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Puxada Alta TriÃ¢ngulo', sets: 3, reps: '18-20', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Agachamento SumÃ´', sets: 3, reps: '20', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Supino com Halter', sets: 3, reps: '15-18', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'ElevaÃ§Ã£o PÃ©lvica', sets: 3, reps: '20', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Desenvolvimento Unilateral', sets: 2, reps: '18', load: '', rest: '45', method: '', loadType: 'weight' },
        { name: 'Prancha IsomÃ©trica', sets: 3, reps: '30-40s', load: 'Corporal', rest: '45', method: '', loadType: 'time' }
      ]},
      { name: 'Cardio 1 â€” LISS', exercises: [
        { name: 'Caminhada inclinada', sets: 1, reps: '35-40 min', load: 'Zona 2', rest: '0', method: '', loadType: 'time' }
      ]},
      { name: 'Full Body B â€” Hipertrofia', exercises: [
        { name: 'BÃºlgaro no Step', sets: 3, reps: '10-12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Remada Articulada', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Stiff', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'FlexÃ£o de BraÃ§os / Supino MÃ¡quina', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Cadeira Extensora', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Cadeira Abdutora', sets: 3, reps: '15', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Dead Bug', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' },
        { name: 'Panturrilha', sets: 3, reps: '15-20', load: '', rest: '60', method: '', loadType: 'weight' }
      ]},
      { name: 'Cardio 2 â€” HIIT', exercises: [
        { name: 'Escada de Agilidade', sets: 1, reps: '20-25 min', load: 'Borg 7-8', rest: '0', method: 'HIIT 30-30', loadType: 'time' }
      ]},
      { name: 'Full Body C â€” ForÃ§a (Presencial)', exercises: [
        { name: 'Leg 45Â°', sets: 4, reps: '8', load: '', rest: '90', method: 'PirÃ¢mide', loadType: 'weight' },
        { name: 'Puxada Alta', sets: 4, reps: '8', load: '', rest: '90', method: '', loadType: 'weight' },
        { name: 'Agachamento SumÃ´', sets: 3, reps: '8', load: '', rest: '90', method: '', loadType: 'weight' },
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

