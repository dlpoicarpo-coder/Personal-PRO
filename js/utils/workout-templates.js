// ========================================
// PERSONAL PRO — Workout Templates
// Modelos científicos prontos por objetivo
// ========================================

export const BUILT_IN_TEMPLATES = [
  // ── HIPERTROFIA ──
  {
    id: 'hyp-ab', name: 'AB — Hipertrofia (2×/sem)', goal: 'Hipertrofia',
    daysPerWeek: 2, category: 'Hipertrofia',
    description: 'Divisão A/B alternada. Ideal para iniciantes e intermediários com 2 dias de treino por semana.',
    workouts: [
      { name: 'Treino A — Peito, Ombro, Tríceps', exercises: [
        { name: 'Supino Reto com Barra',      sets: 4, reps: '8-12', rest: '90', method: 'Pirâmide Crescente' },
        { name: 'Supino Inclinado com Halteres',sets:3, reps: '10-12',rest: '75' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '10-12',rest: '75' },
        { name: 'Elevação Lateral com Halteres',sets: 3, reps: '12-15',rest: '60' },
        { name: 'Tríceps Pulley',               sets: 3, reps: '12-15',rest: '60' },
        { name: 'Tríceps Francês',              sets: 3, reps: '10-12',rest: '60' },
      ]},
      { name: 'Treino B — Costas, Bíceps, Pernas', exercises: [
        { name: 'Puxada Frente com Barra',      sets: 4, reps: '8-12', rest: '90' },
        { name: 'Remada Curvada com Barra',     sets: 4, reps: '8-12', rest: '90' },
        { name: 'Rosca Direta com Barra',       sets: 3, reps: '10-12',rest: '75' },
        { name: 'Agachamento Livre',            sets: 4, reps: '8-12', rest: '120' },
        { name: 'Leg Press 45°',               sets: 3, reps: '12-15',rest: '90' },
        { name: 'Cadeira Extensora',            sets: 3, reps: '12-15',rest: '60' },
      ]},
    ]
  },
  {
    id: 'hyp-abc', name: 'ABC — Hipertrofia (3×/sem)', goal: 'Hipertrofia',
    daysPerWeek: 3, category: 'Hipertrofia',
    description: 'Divisão clássica ABC. Um grupo muscular por dia. Ótimo para intermediários.',
    workouts: [
      { name: 'Treino A — Peito e Tríceps', exercises: [
        { name: 'Supino Reto com Barra',       sets: 4, reps: '8-10', rest: '90', method: 'Pirâmide Crescente' },
        { name: 'Supino Inclinado com Halteres',sets:3, reps: '10-12',rest: '75' },
        { name: 'Crucifixo com Halteres',      sets: 3, reps: '12-15',rest: '60' },
        { name: 'Tríceps Pulley',              sets: 4, reps: '12-15',rest: '60', method: 'Drop-set' },
        { name: 'Tríceps Testa com Halteres',  sets: 3, reps: '10-12',rest: '60' },
      ]},
      { name: 'Treino B — Costas e Bíceps', exercises: [
        { name: 'Puxada Frente com Barra',     sets: 4, reps: '8-12', rest: '90' },
        { name: 'Remada Curvada com Barra',    sets: 4, reps: '8-12', rest: '90' },
        { name: 'Remada Unilateral com Haltere',sets:3, reps: '10-12',rest: '75' },
        { name: 'Rosca Direta com Barra',      sets: 3, reps: '10-12',rest: '75' },
        { name: 'Rosca Alternada com Halteres',sets:3, reps: '10-12', rest: '60' },
      ]},
      { name: 'Treino C — Pernas e Ombros', exercises: [
        { name: 'Agachamento Livre',           sets: 4, reps: '8-12', rest: '120' },
        { name: 'Leg Press 45°',              sets: 3, reps: '12-15',rest: '90' },
        { name: 'Mesa Flexora',               sets: 3, reps: '12-15',rest: '75' },
        { name: 'Panturrilha no Smith',        sets: 4, reps: '15-20',rest: '60' },
        { name: 'Desenvolvimento com Halteres',sets:3, reps: '10-12', rest: '75' },
        { name: 'Elevação Lateral com Halteres',sets:3,reps: '12-15', rest: '60' },
      ]},
    ]
  },
  {
    id: 'hyp-abcd', name: 'ABCD — Hipertrofia (4×/sem)', goal: 'Hipertrofia',
    daysPerWeek: 4, category: 'Hipertrofia',
    description: 'Divisão ABCD avançada. Máximo volume por grupo muscular. Para intermediários/avançados.',
    workouts: [
      { name: 'Treino A — Peito', exercises: [
        { name: 'Supino Reto com Barra',        sets: 4, reps: '6-10', rest: '90', method: 'Pirâmide Crescente' },
        { name: 'Supino Inclinado com Halteres',sets: 4, reps: '8-12', rest: '75' },
        { name: 'Supino Declinado com Halteres',sets: 3, reps: '10-12',rest: '75' },
        { name: 'Crucifixo com Halteres',       sets: 3, reps: '12-15',rest: '60', method: 'Drop-set' },
        { name: 'Peck Deck',                    sets: 3, reps: '12-15',rest: '60' },
      ]},
      { name: 'Treino B — Costas', exercises: [
        { name: 'Barra Fixa',                   sets: 4, reps: '6-10', rest: '120' },
        { name: 'Remada Curvada com Barra',     sets: 4, reps: '8-10', rest: '90' },
        { name: 'Puxada Frente com Barra',      sets: 3, reps: '10-12',rest: '75' },
        { name: 'Remada Unilateral com Haltere',sets: 3, reps: '10-12',rest: '75' },
        { name: 'Pullover com Haltere',         sets: 3, reps: '12-15',rest: '60' },
      ]},
      { name: 'Treino C — Pernas', exercises: [
        { name: 'Agachamento Livre',            sets: 5, reps: '6-10', rest: '120' },
        { name: 'Leg Press 45°',               sets: 4, reps: '10-15',rest: '90' },
        { name: 'Cadeira Extensora',            sets: 3, reps: '12-15',rest: '60', method: 'Drop-set' },
        { name: 'Mesa Flexora',                sets: 3, reps: '10-12',rest: '75' },
        { name: 'Stiff com Halteres',          sets: 3, reps: '10-12',rest: '75' },
        { name: 'Panturrilha no Leg Press',    sets: 5, reps: '15-20',rest: '45' },
      ]},
      { name: 'Treino D — Ombros e Braços', exercises: [
        { name: 'Desenvolvimento com Barra',   sets: 4, reps: '8-10', rest: '90' },
        { name: 'Elevação Lateral com Halteres',sets:4, reps: '12-15',rest: '60' },
        { name: 'Crucifixo Invertido',         sets: 3, reps: '12-15',rest: '60' },
        { name: 'Rosca Direta com Barra',      sets: 3, reps: '10-12',rest: '75' },
        { name: 'Rosca Concentrada',           sets: 3, reps: '10-12',rest: '60' },
        { name: 'Tríceps Pulley',              sets: 3, reps: '12-15',rest: '60', method: 'Drop-set' },
        { name: 'Tríceps Corda',               sets: 3, reps: '12-15',rest: '60' },
      ]},
    ]
  },
  // ── FORÇA ──
  {
    id: 'str-531', name: '5/3/1 — Força (4×/sem)', goal: 'Força',
    daysPerWeek: 4, category: 'Força',
    description: 'Baseado no método Wendler 5/3/1. 4 dias com um levantamento principal por dia. Ideal para ganho de força a longo prazo.',
    workouts: [
      { name: 'Dia 1 — Supino', exercises: [
        { name: 'Supino Reto com Barra',        sets: 3, reps: '5/3/1', rest: '180', method: 'Pirâmide Crescente' },
        { name: 'Supino com Halteres',          sets: 5, reps: '10',    rest: '90' },
        { name: 'Tríceps Pulley',               sets: 5, reps: '10',    rest: '60' },
      ]},
      { name: 'Dia 2 — Agachamento', exercises: [
        { name: 'Agachamento Livre',            sets: 3, reps: '5/3/1', rest: '180', method: 'Pirâmide Crescente' },
        { name: 'Leg Press 45°',               sets: 5, reps: '10',    rest: '120' },
        { name: 'Perna Flexora',               sets: 5, reps: '10',    rest: '75' },
      ]},
      { name: 'Dia 3 — Desenvolvimento', exercises: [
        { name: 'Desenvolvimento com Barra',    sets: 3, reps: '5/3/1', rest: '180', method: 'Pirâmide Crescente' },
        { name: 'Desenvolvimento com Halteres', sets: 5, reps: '10',    rest: '90' },
        { name: 'Elevação Lateral com Halteres',sets: 5, reps: '15',    rest: '60' },
      ]},
      { name: 'Dia 4 — Terra', exercises: [
        { name: 'Levantamento Terra',           sets: 3, reps: '5/3/1', rest: '240', method: 'Pirâmide Crescente' },
        { name: 'Remada Curvada com Barra',     sets: 5, reps: '10',    rest: '90' },
        { name: 'Puxada Frente com Barra',      sets: 5, reps: '10',    rest: '90' },
      ]},
    ]
  },
  // ── EMAGRECIMENTO ──
  {
    id: 'fat-circ', name: 'Circuito — Emagrecimento (3×/sem)', goal: 'Emagrecimento',
    daysPerWeek: 3, category: 'Emagrecimento',
    description: 'Circuito metabólico com exercícios compostos e cardio. Alta demanda calórica. Para iniciantes a intermediários.',
    workouts: [
      { name: 'Circuito A — Superior + Cardio', exercises: [
        { name: 'Supino com Halteres',          sets: 3, reps: '15', rest: '45', method: 'Série Gigante' },
        { name: 'Puxada Frente com Barra',      sets: 3, reps: '15', rest: '45' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '15', rest: '45' },
        { name: 'Burpee',                       sets: 3, reps: '12', rest: '60' },
        { name: 'Esteira - Intervalado (HIIT)', sets: 1, reps: '15min', rest: '0', method: 'HIIT 1:1' },
      ]},
      { name: 'Circuito B — Inferior + Cardio', exercises: [
        { name: 'Agachamento Livre',            sets: 3, reps: '20', rest: '45', method: 'Série Gigante' },
        { name: 'Stiff com Halteres',           sets: 3, reps: '15', rest: '45' },
        { name: 'Elevação Pélvica com Elástico',sets: 3, reps: '20', rest: '45' },
        { name: 'Agachamento com Salto',        sets: 3, reps: '15', rest: '60' },
        { name: 'Bicicleta Ergométrica - HIIT', sets: 1, reps: '15min', rest: '0', method: 'Tabata' },
      ]},
      { name: 'Circuito C — Full Body', exercises: [
        { name: 'Kettlebell Swing',             sets: 4, reps: '15', rest: '30' },
        { name: 'Burpee',                       sets: 4, reps: '10', rest: '30' },
        { name: 'Pular Corda',                  sets: 4, reps: '1min', rest: '30', method: 'Tabata' },
        { name: 'Escalador de Montanha',        sets: 4, reps: '30s', rest: '30' },
        { name: 'Battle Rope - Ondas Alternadas',sets:4, reps: '30s', rest: '30' },
      ]},
    ]
  },
  // ── FUNCIONAL ──
  {
    id: 'fun-full', name: 'Full Body Funcional (3×/sem)', goal: 'Condicionamento',
    daysPerWeek: 3, category: 'Funcional',
    description: 'Treino funcional completo com movimentos multiarticulares. Ideal para saúde geral, qualidade de vida e condicionamento.',
    workouts: [
      { name: 'Full Body A', exercises: [
        { name: 'Agachamento Livre',            sets: 3, reps: '12', rest: '60' },
        { name: 'Supino com Halteres',          sets: 3, reps: '12', rest: '60' },
        { name: 'Remada Curvada com Barra',     sets: 3, reps: '12', rest: '60' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '12', rest: '60' },
        { name: 'Prancha Abdominal',            sets: 3, reps: '30s', rest: '45' },
        { name: 'Pular Corda',                  sets: 2, reps: '2min', rest: '60' },
      ]},
      { name: 'Full Body B', exercises: [
        { name: 'Levantamento Terra',           sets: 3, reps: '10', rest: '90' },
        { name: 'Puxada Frente com Barra',      sets: 3, reps: '10', rest: '75' },
        { name: 'Agachamento com Haltere',      sets: 3, reps: '15', rest: '60' },
        { name: 'Kettlebell Swing',             sets: 3, reps: '15', rest: '60' },
        { name: 'Escalador de Montanha',        sets: 3, reps: '30s', rest: '45' },
        { name: 'Esteira - Caminhada',          sets: 1, reps: '20min', rest: '0' },
      ]},
    ]
  },
  // ── CARDIO / ENDURANCE ──
  {
    id: 'card-init', name: 'Cardio Iniciante (3×/sem)', goal: 'Resistência',
    daysPerWeek: 3, category: 'Cardio / Endurance',
    description: 'Programa de base aeróbica para iniciantes. 8 semanas de progressão gradual em Zona 2. Nenhum equipamento necessário além de esteira ou área externa.',
    workouts: [
      { name: 'Sessão Cardio — Zona 2', exercises: [
        { name: 'Aquecimento — Caminhada',      sets: 1, reps: '5min',  rest: '0', method: 'Zona 1 (Z1)' },
        { name: 'Caminhada ao Ar Livre',        sets: 1, reps: '25min', rest: '0', method: 'Zona 2 (Z2)' },
        { name: 'Volta à calma — Caminhada',    sets: 1, reps: '5min',  rest: '0', method: 'Zona 1 (Z1)' },
      ]},
      { name: 'Sessão Cardio — Progressivo', exercises: [
        { name: 'Esteira - Caminhada',          sets: 1, reps: '5min',  rest: '0', method: 'Zona 1 (Z1)' },
        { name: 'Esteira - Corrida',            sets: 1, reps: '20min', rest: '0', method: 'Progressivo' },
        { name: 'Esteira - Caminhada',          sets: 1, reps: '5min',  rest: '0', method: 'Zona 1 (Z1)' },
      ]},
    ]
  },
  {
    id: 'card-hiit', name: 'HIIT Avançado (3×/sem)', goal: 'Condicionamento',
    daysPerWeek: 3, category: 'Cardio / Endurance',
    description: 'Protocolo HIIT periodizado para melhora de VO₂max e composição corporal. Para praticantes com base aeróbica consolidada.',
    workouts: [
      { name: 'HIIT — Tabata', exercises: [
        { name: 'Aquecimento',                  sets: 1, reps: '8min',  rest: '0', method: 'Zona 2 (Z2)' },
        { name: 'Bicicleta Ergométrica - HIIT', sets: 8, reps: '20s',  rest: '10s', method: 'Tabata' },
        { name: 'Recuperação ativa',            sets: 1, reps: '5min',  rest: '0', method: 'Zona 1 (Z1)' },
        { name: 'HIIT Tabata',                  sets: 8, reps: '20s',  rest: '10s', method: 'Tabata' },
        { name: 'Esfriamento',                  sets: 1, reps: '5min',  rest: '0', method: 'Zona 1 (Z1)' },
      ]},
      { name: 'HIIT — Intervalado Longo', exercises: [
        { name: 'Aquecimento',                  sets: 1, reps: '10min', rest: '0', method: 'Zona 2 (Z2)' },
        { name: 'Corrida ao Ar Livre',          sets: 4, reps: '4min',  rest: '3min', method: 'Zona 5 (Z5) — VO2max' },
        { name: 'Esfriamento',                  sets: 1, reps: '5min',  rest: '0', method: 'Zona 1 (Z1)' },
      ]},
      { name: 'Cardio Regenerativo', exercises: [
        { name: 'Corrida Longa (LSD)',           sets: 1, reps: '40min', rest: '0', method: 'Zona 2 (Z2)' },
      ]},
    ]
  },
  // ── REABILITAÇÃO / IDOSO ──
  {
    id: 'rehab-senior', name: 'Funcional — Idoso / Reabilitação (3×/sem)', goal: 'Saúde',
    daysPerWeek: 3, category: 'Reabilitação',
    description: 'Programa de baixo impacto para idosos ou em reabilitação. Foco em mobilidade, equilíbrio e funcionalidade.',
    workouts: [
      { name: 'Sessão Funcional A', exercises: [
        { name: 'Marcha Estacionária',          sets: 2, reps: '60s',  rest: '30' },
        { name: 'Agachamento na Cadeira',       sets: 3, reps: '10',   rest: '60' },
        { name: 'Supino Sentado (Máquina)',     sets: 3, reps: '12',   rest: '60' },
        { name: 'Remada com Elástico',          sets: 3, reps: '12',   rest: '60' },
        { name: 'Equilíbrio Unipodal',          sets: 3, reps: '30s',  rest: '30' },
        { name: 'Alongamento de Quadril',       sets: 2, reps: '30s',  rest: '0' },
      ]},
      { name: 'Sessão Funcional B', exercises: [
        { name: 'Elevação de Tornozelo Sentado',sets: 3, reps: '15',   rest: '45' },
        { name: 'Elevação Pélvica com Elástico',sets: 3, reps: '15',   rest: '45' },
        { name: 'Hip 90/90',                    sets: 2, reps: '45s',  rest: '30' },
        { name: 'Rotação Torácica',             sets: 2, reps: '10',   rest: '30' },
        { name: 'Esteira - Caminhada',          sets: 1, reps: '15min', rest: '0', method: 'Zona 1 (Z1)' },
      ]},
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
