// ============================================================
// PERSONAL PRO — Periodization Engine (Scientific)
// Baseado em: "Bases Científicas e Modelos de Periodização v3"
// Gera progressão científica de carga/reps/séries por semana
// ============================================================

// ── MODELOS CIENTÍFICOS ──────────────────────────────────────
export const PERIODIZATION_MODELS = {

  // 1. LINEAR CLÁSSICA — Iniciantes/Intermediários
  // Volume ↓ semana a semana | Intensidade ↑
  linear: {
    id: 'linear', label: 'Linear Clássica',
    color: '#3b82f6', icon: '📈',
    desc: 'Volume decresce, intensidade aumenta progressivamente. Ideal para iniciantes.',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const phases = [
        { label: 'Adaptação',   sets: 3, repsMin: 15, repsMax: 20, intensityPct: 55, restSeconds: 60,  rpe: '5-6' },
        { label: 'Hipertrofia', sets: 4, repsMin: 10, repsMax: 12, intensityPct: 68, restSeconds: 90,  rpe: '7-8' },
        { label: 'Força',       sets: 4, repsMin: 6,  repsMax: 8,  intensityPct: 78, restSeconds: 120, rpe: '8-9' },
        { label: 'Pico',        sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: 87, restSeconds: 180, rpe: '9' },
      ];
      const idx = Math.min(Math.floor(progress * phases.length), phases.length - 1);
      return { phase: phases[idx].label, ...phases[idx], volDelta: idx === 0 ? 0 : -5 };
    }
  },

  // 2. LINEAR REVERSA — RML / Resistência / Emagrecimento
  // Intensidade ↓ | Volume ↑ (mais reps, mais séries)
  reverse_linear: {
    id: 'reverse_linear', label: 'Linear Reversa',
    color: '#8b5cf6', icon: '📉',
    desc: 'Inicia com alta intensidade e migra para alto volume. Ideal para RML e emagrecimento.',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 55, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const phases = [
        { label: 'Força Base',      sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: 85, restSeconds: 180, rpe: '9' },
        { label: 'Hipertrofia',     sets: 4, repsMin: 8,  repsMax: 10, intensityPct: 72, restSeconds: 120, rpe: '7-8' },
        { label: 'Resistência',     sets: 3, repsMin: 12, repsMax: 15, intensityPct: 62, restSeconds: 75,  rpe: '6-7' },
        { label: 'Resistência Max', sets: 3, repsMin: 18, repsMax: 25, intensityPct: 50, restSeconds: 45,  rpe: '6' },
      ];
      const idx = Math.min(Math.floor(progress * phases.length), phases.length - 1);
      return { phase: phases[idx].label, ...phases[idx], volDelta: idx === 0 ? 0 : +5 };
    }
  },

  // 3. ONDULATÓRIA DIÁRIA (DUP) — Intermediário/Avançado
  // Alterna Força/Hipertrofia/Metabólico em cada sessão da semana
  undulating: {
    id: 'undulating', label: 'Ondulatória (DUP)',
    color: '#f59e0b', icon: '🌊',
    desc: 'Daily Undulating Periodization: oscila entre sessões de força, hipertrofia e metabólico.',
    // Para ondulatória retornamos 3 sub-sessões por semana
    sessions: [
      { type: 'A', label: 'Força',       sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: 85, restSeconds: 180, rpe: '9', icon: '💪' },
      { type: 'B', label: 'Hipertrofia', sets: 4, repsMin: 8,  repsMax: 12, intensityPct: 72, restSeconds: 90,  rpe: '7-8', icon: '🏋️' },
      { type: 'C', label: 'Metabólico',  sets: 3, repsMin: 15, repsMax: 20, intensityPct: 60, restSeconds: 45,  rpe: '6', icon: '🔥' },
    ],
    // Progressão de carga: +2.5-5% a cada ciclo de 3 sessões
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 55, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const loadMultiplier = 1 + ((week - 1) * 0.025); // +2.5% por semana
      return { phase: 'Ondulatória', sets: '3-5', repsMin: 3, repsMax: 20, intensityPct: 72, restSeconds: 90, rpe: '7-8', loadMultiplier, volDelta: 0 };
    }
  },

  // 4. BLOCOS (Block Periodization / MST) — Alto Rendimento
  // 3 blocos sequenciais: Acumulação → Intensificação → Realização
  block: {
    id: 'block', label: 'Blocos (MST)',
    color: '#ef4444', icon: '🧱',
    desc: 'Mesociclos específicos: Acumulação (volume), Intensificação (carga), Realização (pico).',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const third = Math.ceil(totalWeeks / 3);
      if (week <= third) {
        return { phase: 'Acumulação', sets: 5, repsMin: 12, repsMax: 15, intensityPct: 63, restSeconds: 60, rpe: '6-7', volDelta: +5 };
      } else if (week <= third * 2) {
        return { phase: 'Intensificação', sets: 4, repsMin: 6, repsMax: 8, intensityPct: 78, restSeconds: 120, rpe: '8-9', volDelta: -10 };
      } else {
        return { phase: 'Realização', sets: 5, repsMin: 2, repsMax: 4, intensityPct: 92, restSeconds: 300, rpe: '9-10', volDelta: -20 };
      }
    }
  },

  // 5. CONJUGADA — Força/Powerlifting
  // Alterna esforço máximo (ME) e esforço dinâmico (DE)
  conjugate: {
    id: 'conjugate', label: 'Conjugada',
    color: '#ec4899', icon: '⚡',
    desc: 'Westside-based: alterna Esforço Máximo (90-100% 1RM) e Esforço Dinâmico (50-60% 1RM veloz).',
    sessions: [
      { type: 'ME', label: 'Esforço Máximo',   sets: 5, repsMin: 1, repsMax: 3,  intensityPct: 95, restSeconds: 300, rpe: '10', icon: '🏆' },
      { type: 'DE', label: 'Esforço Dinâmico', sets: 8, repsMin: 2, repsMax: 3,  intensityPct: 55, restSeconds: 60,  rpe: '7', icon: '💨' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 5, repsMax: 8, intensityPct: 55, restSeconds: 120, rpe: '5', volDelta: -40 };
      }
      return { phase: 'Conjugada', sets: '5-8', repsMin: 1, repsMax: 3, intensityPct: 75, restSeconds: 180, rpe: '8-10', volDelta: 0 };
    }
  },

  // 6. CONCORRENTE — Emagrecimento/Recomposição
  // Alterna Força (mantém massa) + Metabólico (EPOC/queima)
  concurrent: {
    id: 'concurrent', label: 'Concorrente',
    color: '#10b981', icon: '🌀',
    desc: 'Alterna força (mantém massa magra) e metabólico (queima gordura via EPOC). Ideal para emagrecimento.',
    sessions: [
      { type: 'S', label: 'Força',      sets: 4, repsMin: 8,  repsMax: 12, intensityPct: 70, restSeconds: 90,  rpe: '7-8', icon: '💪' },
      { type: 'M', label: 'Metabólico', sets: 3, repsMin: 15, repsMax: 20, intensityPct: 58, restSeconds: 30,  rpe: '6-7', icon: '🔥' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const isForceWeek = week % 2 !== 0;
      return isForceWeek
        ? { phase: 'Semana Força', sets: 4, repsMin: 8, repsMax: 12, intensityPct: 70, restSeconds: 90, rpe: '7-8', volDelta: 0 }
        : { phase: 'Semana Metabólica', sets: 3, repsMin: 15, repsMax: 20, intensityPct: 58, restSeconds: 30, rpe: '6-7', volDelta: +5 };
    }
  },
};

// ── OBJETIVOS DISPONÍVEIS ────────────────────────────────────
export const TRAINING_GOALS = [
  { id: 'hypertrophy',    label: 'Hipertrofia Muscular',    suggested: ['linear', 'undulating'],        icon: '💪' },
  { id: 'fat_loss',       label: 'Emagrecimento',           suggested: ['concurrent', 'undulating'],    icon: '🔥' },
  { id: 'strength',       label: 'Força Máxima',            suggested: ['block', 'conjugate'],          icon: '🏋️' },
  { id: 'power',          label: 'Potência/Explosão',       suggested: ['conjugate', 'block'],          icon: '⚡' },
  { id: 'endurance',      label: 'Resistência Aeróbia',     suggested: ['reverse_linear'],              icon: '🏃' },
  { id: 'rml',            label: 'Resistência Muscular',    suggested: ['reverse_linear', 'concurrent'],icon: '🔄' },
  { id: 'health',         label: 'Saúde e Qualidade de Vida',suggested: ['linear', 'undulating'],       icon: '❤️' },
  { id: 'body_recomp',    label: 'Recomposição Corporal',   suggested: ['concurrent', 'undulating'],    icon: '⚖️' },
];

// ── GERADOR DE PROGRESSÃO CIENTÍFICA ────────────────────────
/**
 * Gera a tabela completa de progressão por exercício e por semana
 * @param {Object} config
 * @param {string} config.model - id do modelo (linear, block, undulating, etc.)
 * @param {string} config.goal - id do objetivo
 * @param {number} config.totalWeeks - total de semanas do macrociclo
 * @param {number} config.deloadEvery - deload a cada N semanas (0 = sem deload)
 * @param {Array} config.exercises - [{ id, name, initialLoadKg }]
 * @returns {Object} { weekSchedule[], exerciseProgression[] }
 */
export function generateProgression(config) {
  const { model, totalWeeks, deloadEvery, exercises = [] } = config;
  const modelDef = PERIODIZATION_MODELS[model] || PERIODIZATION_MODELS.linear;

  // 1. Gerar schedule semanal (sem exercícios específicos)
  const weekSchedule = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const wk = modelDef.buildWeek(w, totalWeeks, deloadEvery || 0);
    weekSchedule.push({ week: w, ...wk });
  }

  // 2. Para cada exercício, gerar progressão de carga semana a semana
  const exerciseProgression = exercises.map(ex => {
    const baseLoad = parseFloat(ex.initialLoadKg) || 20;
    const weeks = weekSchedule.map(wk => {
      const isDeload = wk.phase === 'Deload';
      // Calcular carga baseada no % de intensidade relativo à carga inicial
      // Assumimos que a carga inicial = 70% 1RM (estimativa padrão)
      const estimated1RM = baseLoad / 0.70;
      const loadKg = isDeload
        ? Math.round(baseLoad * 0.6 * 2) / 2  // deload: -40% da carga inicial
        : Math.round((estimated1RM * (wk.intensityPct / 100)) * 2) / 2; // arredonda p/ 0.5kg

      const repsDisplay = isDeload
        ? `${wk.repsMin}-${wk.repsMax}`
        : (typeof wk.repsMin === 'number' && wk.repsMin === wk.repsMax
          ? String(wk.repsMin)
          : `${wk.repsMin}-${wk.repsMax}`);

      return {
        week: wk.week,
        phase: wk.phase,
        sets: wk.sets,
        reps: repsDisplay,
        loadKg: Math.max(loadKg, 5), // mínimo 5kg
        intensityPct: wk.intensityPct,
        restSeconds: wk.restSeconds,
        rpe: wk.rpe,
        isDeload,
      };
    });
    return { exerciseId: ex.id, name: ex.name, initialLoadKg: baseLoad, weeks };
  });

  return { weekSchedule, exerciseProgression, modelDef };
}

// ── UTILITÁRIOS ──────────────────────────────────────────────
export function formatRest(seconds) {
  if (seconds >= 60) return `${Math.floor(seconds / 60)}min${seconds % 60 ? ` ${seconds % 60}s` : ''}`;
  return `${seconds}s`;
}

export function getModelById(id) {
  return PERIODIZATION_MODELS[id] || null;
}

export function getGoalById(id) {
  return TRAINING_GOALS.find(g => g.id === id) || null;
}

// Fase intensidade → cor visual
export function intensityColor(pct, isDeload) {
  if (isDeload) return '#3b82f6';
  if (pct >= 90) return '#ef4444';
  if (pct >= 80) return '#f97316';
  if (pct >= 70) return '#eab308';
  return '#22c55e';
}
