// ========================================
// PERSONAL PRO — Workout Templates Library
// Pre-built + custom workout templates
// ========================================

export const BUILT_IN_TEMPLATES = [
  {
    id: 'tpl_fullbody_beginner',
    name: 'Full Body — Iniciante',
    category: 'Iniciante',
    goal: 'Adaptação',
    description: 'Treino completo para quem está começando. Foco em aprender os movimentos básicos com baixa intensidade.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      {
        name: 'Treino A - Full Body', exercises: [
          { name: 'Leg Press 45°', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Cadeira Extensora', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Supino na Máquina', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Puxada Frontal', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Desenvolvimento na Máquina', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Abdominal Crunch', sets: 3, reps: '15', load: '', rest: '45', method: '' },
        ]
      },
      {
        name: 'Treino B - Full Body', exercises: [
          { name: 'Agachamento no Smith', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Mesa Flexora', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Supino Inclinado na Máquina', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Remada na Máquina', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Elevação Lateral', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Prancha', sets: 3, reps: '30s', load: '', rest: '45', method: '' },
        ]
      },
    ]
  },
  {
    id: 'tpl_upper_lower',
    name: 'Superior / Inferior — Intermediário',
    category: 'Intermediário',
    goal: 'Hipertrofia',
    description: 'Divisão clássica upper/lower para ganho de massa muscular com volume moderado.',
    daysPerWeek: 4,
    builtIn: true,
    workouts: [
      {
        name: 'Treino A - Superior', exercises: [
          { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
          { name: 'Puxada Frontal', sets: 4, reps: '10', load: '', rest: '90', method: '' },
          { name: 'Desenvolvimento com Halteres', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
          { name: 'Remada Curvada com Barra', sets: 3, reps: '10', load: '', rest: '90', method: '' },
          { name: 'Rosca Direta com Barra', sets: 3, reps: '12', load: '', rest: '60', method: '' },
          { name: 'Tríceps Pulley', sets: 3, reps: '12', load: '', rest: '60', method: '' },
        ]
      },
      {
        name: 'Treino B - Inferior', exercises: [
          { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', load: '', rest: '120', method: '' },
          { name: 'Leg Press 45°', sets: 4, reps: '10-12', load: '', rest: '90', method: '' },
          { name: 'Cadeira Extensora', sets: 3, reps: '12', load: '', rest: '60', method: '' },
          { name: 'Mesa Flexora', sets: 3, reps: '12', load: '', rest: '60', method: '' },
          { name: 'Panturrilha em Pé na Máquina', sets: 4, reps: '15', load: '', rest: '45', method: '' },
          { name: 'Abdominal Crunch', sets: 3, reps: '20', load: '', rest: '45', method: '' },
        ]
      },
    ]
  },
  {
    id: 'tpl_push_pull_legs',
    name: 'Push / Pull / Legs — Avançado',
    category: 'Avançado',
    goal: 'Hipertrofia',
    description: 'Divisão PPL clássica para atletas avançados. Alto volume com métodos intensificadores.',
    daysPerWeek: 6,
    builtIn: true,
    workouts: [
      {
        name: 'Push (Empurrar)', exercises: [
          { name: 'Supino Reto com Barra', sets: 4, reps: '6-8', load: '', rest: '120', method: '' },
          { name: 'Supino Inclinado com Halteres', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
          { name: 'Desenvolvimento com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
          { name: 'Elevação Lateral', sets: 4, reps: '12-15', load: '', rest: '60', method: 'Drop set' },
          { name: 'Tríceps Testa', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
          { name: 'Tríceps Corda', sets: 3, reps: '12-15', load: '', rest: '60', method: '' },
        ]
      },
      {
        name: 'Pull (Puxar)', exercises: [
          { name: 'Puxada Frontal', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
          { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
          { name: 'Remada Unilateral com Halter', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
          { name: 'Face Pull', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Rosca Alternada com Halteres', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
          { name: 'Rosca Martelo', sets: 3, reps: '12', load: '', rest: '60', method: '' },
        ]
      },
      {
        name: 'Legs (Pernas)', exercises: [
          { name: 'Agachamento Livre com Barra', sets: 4, reps: '6-8', load: '', rest: '180', method: '' },
          { name: 'Leg Press 45°', sets: 4, reps: '10-12', load: '', rest: '90', method: '' },
          { name: 'Cadeira Extensora', sets: 3, reps: '12-15', load: '', rest: '60', method: 'Drop set' },
          { name: 'Mesa Flexora', sets: 4, reps: '10-12', load: '', rest: '60', method: '' },
          { name: 'Stiff com Barra', sets: 3, reps: '10-12', load: '', rest: '90', method: '' },
          { name: 'Panturrilha em Pé na Máquina', sets: 5, reps: '12-15', load: '', rest: '45', method: '' },
        ]
      },
    ]
  },
  {
    id: 'tpl_abc_hyper',
    name: 'ABC — Hipertrofia Clássico',
    category: 'Intermediário',
    goal: 'Hipertrofia',
    description: 'Divisão ABC com foco em hipertrofia: Peito/Tríceps, Costas/Bíceps, Pernas/Ombros.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      {
        name: 'A - Peito / Tríceps', exercises: [
          { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
          { name: 'Supino Inclinado com Halteres', sets: 4, reps: '10', load: '', rest: '90', method: '' },
          { name: 'Cross Over', sets: 3, reps: '12-15', load: '', rest: '60', method: '' },
          { name: 'Tríceps Pulley', sets: 3, reps: '12', load: '', rest: '60', method: '' },
          { name: 'Tríceps Testa', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
        ]
      },
      {
        name: 'B - Costas / Bíceps', exercises: [
          { name: 'Puxada Frontal', sets: 4, reps: '10', load: '', rest: '90', method: '' },
          { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10', load: '', rest: '90', method: '' },
          { name: 'Remada Unilateral com Halter', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
          { name: 'Rosca Direta com Barra', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
          { name: 'Rosca Alternada com Halteres', sets: 3, reps: '12', load: '', rest: '60', method: '' },
        ]
      },
      {
        name: 'C - Pernas / Ombros', exercises: [
          { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', load: '', rest: '120', method: '' },
          { name: 'Leg Press 45°', sets: 4, reps: '12', load: '', rest: '90', method: '' },
          { name: 'Mesa Flexora', sets: 3, reps: '12', load: '', rest: '60', method: '' },
          { name: 'Desenvolvimento com Halteres', sets: 3, reps: '10-12', load: '', rest: '60', method: '' },
          { name: 'Elevação Lateral', sets: 3, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Panturrilha em Pé na Máquina', sets: 4, reps: '15', load: '', rest: '45', method: '' },
        ]
      },
    ]
  },
  {
    id: 'tpl_senior',
    name: 'Saúde e Bem-estar — Sênior',
    category: 'Iniciante',
    goal: 'Saúde',
    description: 'Programa adaptado para público sênior. Foco em funcionalidade, equilíbrio e qualidade de vida.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      {
        name: 'Treino A - Membros Inferiores', exercises: [
          { name: 'Leg Press 45°', sets: 3, reps: '12-15', load: '', rest: '60', method: '' },
          { name: 'Cadeira Extensora', sets: 3, reps: '12-15', load: '', rest: '60', method: '' },
          { name: 'Cadeira Flexora', sets: 3, reps: '12-15', load: '', rest: '60', method: '' },
          { name: 'Panturrilha Sentado', sets: 3, reps: '15', load: '', rest: '45', method: '' },
          { name: 'Caminhada na Esteira', sets: 1, reps: '15 min', load: '', rest: '', method: '' },
        ]
      },
      {
        name: 'Treino B - Membros Superiores', exercises: [
          { name: 'Supino na Máquina', sets: 3, reps: '12-15', load: '', rest: '60', method: '' },
          { name: 'Puxada Frontal', sets: 3, reps: '12-15', load: '', rest: '60', method: '' },
          { name: 'Desenvolvimento na Máquina', sets: 3, reps: '12-15', load: '', rest: '60', method: '' },
          { name: 'Rosca Direta com Halteres', sets: 2, reps: '15', load: '', rest: '60', method: '' },
          { name: 'Tríceps Corda', sets: 2, reps: '15', load: '', rest: '60', method: '' },
        ]
      },
    ]
  },
  {
    id: 'tpl_conditioning',
    name: 'Condicionamento — Circuito',
    category: 'Intermediário',
    goal: 'Condicionamento',
    description: 'Treino em circuito para melhorar o condicionamento cardiovascular e resistência muscular.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      {
        name: 'Circuito Full Body', exercises: [
          { name: 'Agachamento no Smith', sets: 3, reps: '15', load: '', rest: '30', method: 'Circuito' },
          { name: 'Supino Reto com Barra', sets: 3, reps: '15', load: '', rest: '30', method: 'Circuito' },
          { name: 'Remada na Máquina', sets: 3, reps: '15', load: '', rest: '30', method: 'Circuito' },
          { name: 'Desenvolvimento na Máquina', sets: 3, reps: '15', load: '', rest: '30', method: 'Circuito' },
          { name: 'Abdominal Crunch', sets: 3, reps: '20', load: '', rest: '30', method: 'Circuito' },
          { name: 'Prancha', sets: 3, reps: '30s', load: '', rest: '60', method: '' },
        ]
      },
    ]
  },
  {
    id: 'tpl_strength',
    name: 'Força Máxima — 5x5',
    category: 'Avançado',
    goal: 'Força',
    description: 'Programa de força baseado no método 5x5. Ideal para quem busca ganho de força máxima.',
    daysPerWeek: 3,
    builtIn: true,
    workouts: [
      {
        name: 'Dia A', exercises: [
          { name: 'Agachamento Livre com Barra', sets: 5, reps: '5', load: '', rest: '180', method: '' },
          { name: 'Supino Reto com Barra', sets: 5, reps: '5', load: '', rest: '180', method: '' },
          { name: 'Remada Curvada com Barra', sets: 5, reps: '5', load: '', rest: '120', method: '' },
        ]
      },
      {
        name: 'Dia B', exercises: [
          { name: 'Agachamento Livre com Barra', sets: 5, reps: '5', load: '', rest: '180', method: '' },
          { name: 'Desenvolvimento com Barra', sets: 5, reps: '5', load: '', rest: '180', method: '' },
          { name: 'Levantamento Terra', sets: 1, reps: '5', load: '', rest: '180', method: '' },
        ]
      },
    ]
  },
];

export function getTemplatesByCategory() {
  const grouped = {};
  BUILT_IN_TEMPLATES.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });
  return grouped;
}
