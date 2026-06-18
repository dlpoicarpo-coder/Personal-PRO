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
  // Ref: Fleck & Kraemer (2014)
  reverse_linear: {
    id: 'reverse_linear', label: 'Linear Reversa',
    color: '#8b5cf6', icon: '📉',
    desc: 'Inicia com alta intensidade e migra para alto volume. Ideal para RML e emagrecimento.',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        // Deload correto: ~50% da fase ativa anterior (não fixo em 55%)
        const progress = (week - 1) / (totalWeeks - 1);
        const activeIntensity = Math.round(85 - progress * 35); // espelha a progressão inversa
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: Math.round(activeIntensity * 0.55), restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const phases = [
        { label: 'Força Base',      sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: 85, restSeconds: 180, rpe: '8-9' },
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
  // Ref: Rhea et al. (2002) — J Strength Cond Res
  undulating: {
    id: 'undulating', label: 'Ondulatória (DUP)',
    color: '#f59e0b', icon: '🌊',
    desc: 'Daily Undulating Periodization: oscila entre sessões de força, hipertrofia e metabólico na mesma semana.',
    // 3 sub-sessões por semana — o buildWeek retorna a sessão correta por índice de dia
    sessions: [
      { type: 'A', label: 'Força',       sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: 85, restSeconds: 180, rpe: '8-9',  icon: '💪' },
      { type: 'B', label: 'Hipertrofia', sets: 4, repsMin: 8,  repsMax: 12, intensityPct: 72, restSeconds: 90,  rpe: '7-8',  icon: '🏋️' },
      { type: 'C', label: 'Metabólico',  sets: 3, repsMin: 15, repsMax: 20, intensityPct: 60, restSeconds: 45,  rpe: '6-7',  icon: '🔥' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 10, repsMax: 15, intensityPct: 55, restSeconds: 60, rpe: '4-5', volDelta: -40, dupSessions: null };
      }
      // Progressão de carga: +2.5% por semana em cada sub-sessão (Rhea et al.)
      const loadMultiplier = 1 + ((week - 1) * 0.025);
      return {
        phase: 'DUP',
        // Retornar as 3 sub-sessões com intensidade progressiva
        dupSessions: [
          { type: 'A', label: 'Força',       sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: Math.min(95, Math.round(85 * loadMultiplier)), restSeconds: 180, rpe: '8-9' },
          { type: 'B', label: 'Hipertrofia', sets: 4, repsMin: 8,  repsMax: 12, intensityPct: Math.min(85, Math.round(72 * loadMultiplier)), restSeconds: 90,  rpe: '7-8' },
          { type: 'C', label: 'Metabólico',  sets: 3, repsMin: 15, repsMax: 20, intensityPct: Math.min(75, Math.round(60 * loadMultiplier)), restSeconds: 45,  rpe: '6-7' },
        ],
        // Valores médios para o grid semanal (representação visual)
        sets: '3-5', repsMin: 3, repsMax: 20,
        intensityPct: Math.round(72 * loadMultiplier),
        restSeconds: 90, rpe: '7-9',
        loadMultiplier, volDelta: 0
      };
    }
  },

  // 4. BLOCOS (Block Periodization / MST) — Alto Rendimento
  // Ref: Issurin (2010) — Sports Med
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
        // Acumulação: 3-4 séries (não 5) para ser compatível com iniciantes/intermediários
        return { phase: 'Acumulação', sets: 4, repsMin: 10, repsMax: 15, intensityPct: 63, restSeconds: 75, rpe: '6-7', volDelta: +5 };
      } else if (week <= third * 2) {
        return { phase: 'Intensificação', sets: 4, repsMin: 5, repsMax: 8, intensityPct: 78, restSeconds: 150, rpe: '8-9', volDelta: -10 };
      } else {
        return { phase: 'Realização', sets: 3, repsMin: 1, repsMax: 4, intensityPct: 92, restSeconds: 300, rpe: '9-10', volDelta: -20 };
      }
    }
  },

  // 5. CONJUGADA — Força/Powerlifting
  // Ref: Simmons (1999) — Westside Barbell
  conjugate: {
    id: 'conjugate', label: 'Conjugada',
    color: '#ec4899', icon: '⚡',
    desc: 'Westside-based: alterna Esforço Máximo (90-100% 1RM) e Esforço Dinâmico (50-60% 1RM, máx velocidade).',
    sessions: [
      { type: 'ME', label: 'Esforço Máximo',   sets: 5, repsMin: 1, repsMax: 3,  intensityPct: 95, restSeconds: 300, rpe: '9-10', icon: '🏆', note: 'Trabalho na falha concêntrica. Rotacionar exercício variante a cada semana.' },
      { type: 'DE', label: 'Esforço Dinâmico', sets: 8, repsMin: 2, repsMax: 3,  intensityPct: 55, restSeconds: 60,  rpe: '5-6',  icon: '💨', note: 'Velocidade máxima de barra — não de esforço. Bar speed é o critério, não RPE alto.' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 5, repsMax: 8, intensityPct: 55, restSeconds: 120, rpe: '5', volDelta: -40 };
      }
      // Conjugada: mesma semana tem ME + DE. Intensidade ME sobe ~2% a cada 3 semanas
      const meCycle = Math.floor((week - 1) / 3);
      const meIntensity = Math.min(100, 90 + meCycle * 2);
      return {
        phase: 'Conjugada',
        sets: '5-8', repsMin: 1, repsMax: 3,
        intensityPct: Math.round((meIntensity + 55) / 2), // média ME+DE para visualização
        restSeconds: 180, rpe: '5-10',
        dupSessions: [
          { type: 'ME', label: 'Esforço Máximo',   sets: 5, repsMin: 1, repsMax: 3, intensityPct: meIntensity, restSeconds: 300, rpe: '9-10', note: 'Rotacionar variante do exercício principal a cada semana.' },
          { type: 'DE', label: 'Esforço Dinâmico', sets: 8, repsMin: 2, repsMax: 3, intensityPct: 55, restSeconds: 60, rpe: '5-6', note: 'Critério: velocidade máxima de barra, não esforço.' },
        ],
        volDelta: 0
      };
    }
  },

  // 6. CONCORRENTE — Emagrecimento/Recomposição
  // Ref: Wilson et al. (2012) — J Strength Cond Res
  concurrent: {
    id: 'concurrent', label: 'Concorrente',
    color: '#10b981', icon: '🌀',
    desc: 'Força e cardio na mesma semana, alternando por dia. Força ANTES do cardio para minimizar interferência.',
    sessions: [
      { type: 'S', label: 'Força',      sets: 4, repsMin: 8,  repsMax: 12, intensityPct: 70, restSeconds: 90,  rpe: '7-8', icon: '💪', note: 'Sempre realizar antes do cardio (mínimo 6h de separação recomendado).' },
      { type: 'M', label: 'Cardio',     sets: 1, repsMin: 20, repsMax: 45, intensityPct: 65, restSeconds: 0,   rpe: '5-7', icon: '🔥', note: 'Z2 (65% FCmáx) ou HIIT curto (30s/60s). Não realizar imediatamente após força.' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      // Correto: alterna força/cardio DENTRO da semana, não semanas inteiras
      const progress = (week - 1) / (totalWeeks - 1);
      // A cada mês, aumenta intensidade da força e duração do cardio
      const strengthIntensity = Math.round(65 + progress * 15); // 65% → 80%
      const cardioIntensity = Math.round(60 + progress * 10);   // 60% → 70%
      return {
        phase: 'Concorrente',
        sets: '3-4', repsMin: 8, repsMax: 20,
        intensityPct: Math.round((strengthIntensity + cardioIntensity) / 2),
        restSeconds: 60, rpe: '6-8',
        dupSessions: [
          { type: 'S', label: 'Força',  sets: 4, repsMin: 8, repsMax: 12, intensityPct: strengthIntensity, restSeconds: 90, rpe: '7-8', note: 'Força antes do cardio. Mín. 6h de separação.' },
          { type: 'M', label: 'Cardio', sets: 1, repsMin: 20, repsMax: 40, intensityPct: cardioIntensity, restSeconds: 0, rpe: '5-7', note: 'Z2 contínuo ou HIIT 30/60. Não imediatamente após força.' },
        ],
        volDelta: progress > 0.5 ? -5 : +3
      };
    }
  },

  // 7. PERSONALIZADO / MANUAL
  manual: {
    id: 'manual', label: 'Personalizado (Ajuste Manual)',
    color: '#94a3b8', icon: '⚙️',
    desc: 'Periodização personalizada. Permite ajuste manual de cada semana.',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      return { phase: 'Hipertrofia', sets: 3, repsMin: 10, repsMax: 12, intensityPct: 70, restSeconds: 90, rpe: '7-8', volDelta: 0 };
    }
  },

  // ── MODELOS DE CARDIO / ENDURANCE ───────────────────────────

  // 8. POLARIZADO — 80% Z1/Z2 + 20% Z4/Z5
  // Ref: Seiler & Tønnessen (2009) — Int J Sports Physiol Perform
  polarized: {
    id: 'polarized', label: 'Polarizado',
    color: '#06b6d4', icon: '◎',
    desc: '80% do volume em Z1/Z2 e 20% em Z4/Z5. Evita a "zona cinzenta" (Z3). Modelo de atletas de elite.',
    isCardio: true,
    sessions: [
      { type: 'Z2', label: 'Longa Z2 (×4)', sets: 1, repsMin: 60, repsMax: 90, intensityPct: 70, restSeconds: 0, rpe: '4-5', icon: '🟢', note: '≤75% FCmáx. Conversa possível. 4 sessões por semana.' },
      { type: 'Z5', label: 'Intensa Z4/Z5 (×1)', sets: 5, repsMin: 4, repsMax: 5, intensityPct: 90, restSeconds: 180, rpe: '8-9', icon: '🔴', note: '≥87% FCmáx. 5 tiros de 4 min. 1 sessão por semana.' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload Aeróbico', sets: 1, repsMin: 30, repsMax: 45, intensityPct: 60, restSeconds: 0, rpe: '3-4', volDelta: -40, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const duration = Math.round(60 + progress * 30); // 60 → 90 min nas sessões Z2
      return { phase: 'Polarizado 80/20', sets: 1, repsMin: duration, repsMax: duration, intensityPct: 72, restSeconds: 0, rpe: '4-9', volDelta: +3, isCardio: true,
        dupSessions: [
          { type: 'Z2', label: `Z2 Longa (${duration} min)`, sets: 1, repsMin: duration, repsMax: duration, intensityPct: 68, restSeconds: 0, rpe: '4-5', note: '80% do volume semanal. ≤75% FCmáx.' },
          { type: 'Z5', label: 'Intervalado Z4/Z5', sets: 5, repsMin: 4, repsMax: 5, intensityPct: 90, restSeconds: 180, rpe: '8-9', note: '20% do volume. ≥87% FCmáx.' },
        ]
      };
    }
  },

  // 9. HIIT — Intervalado de Alta Intensidade
  // Ref: Gibala et al. (2012) — J Physiol
  hiit: {
    id: 'hiit', label: 'HIIT',
    color: '#f97316', icon: '🔥',
    desc: 'Tiros em Z4-Z5 (85-95% FCmáx), 20-60s, recuperação 1:2. Máx 2-3×/semana.',
    isCardio: true,
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload HIIT', sets: 1, repsMin: 20, repsMax: 30, intensityPct: 65, restSeconds: 0, rpe: '4-5', volDelta: -40, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const tiros = Math.round(6 + progress * 4); // 6 → 10 tiros
      return { phase: 'HIIT', sets: tiros, repsMin: 30, repsMax: 60, intensityPct: 90, restSeconds: 90, rpe: '8-9', volDelta: +1, isCardio: true };
    }
  },

  // 10. LSD — Longa Duração e Baixa Intensidade
  // Ref: Maffetone (1980s), Zona 2 training
  lsd: {
    id: 'lsd', label: 'LSD',
    color: '#22c55e', icon: '🏃',
    desc: 'Treino contínuo em Z1/Z2 (65-75% FCmáx), 45-90 min. Desenvolve base aeróbica e oxidação de gordura.',
    isCardio: true,
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Recuperação Ativa', sets: 1, repsMin: 30, repsMax: 40, intensityPct: 55, restSeconds: 0, rpe: '3', volDelta: -30, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const duration = Math.round(45 + progress * 45); // 45 → 90 min
      return { phase: 'LSD Z2', sets: 1, repsMin: duration, repsMax: duration, intensityPct: 68, restSeconds: 0, rpe: '4-5', volDelta: +3, isCardio: true };
    }
  },

  // 11. LIMIAR ANAERÓBIO — Threshold / Tempo Run
  // Ref: Billat (2001) — Sports Med
  threshold: {
    id: 'threshold', label: 'Limiar Anaeróbio',
    color: '#a855f7', icon: '⏱',
    desc: 'Treino no OBLA (~Z3, 78-87% FCmáx). Aumenta velocidade sustentável e resistência à fadiga.',
    isCardio: true,
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload Limiar', sets: 1, repsMin: 20, repsMax: 30, intensityPct: 65, restSeconds: 0, rpe: '4-5', volDelta: -35, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const duration = Math.round(20 + progress * 20); // 20 → 40 min no limiar
      return { phase: 'Tempo Run Z3', sets: 1, repsMin: duration, repsMax: duration, intensityPct: 82, restSeconds: 0, rpe: '7-8', volDelta: +2, isCardio: true };
    }
  },

  // 12. FARTLEK — Variações de ritmo livres
  // Ref: Gosta Holmér (1937) — sem protocolo fixo
  fartlek: {
    id: 'fartlek', label: 'Fartlek',
    color: '#ec4899', icon: '🎲',
    desc: 'Variação livre de ritmo durante treino contínuo. Sem protocolo fixo — o atleta acelera conforme sensação.',
    isCardio: true,
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Recuperação Fartlek', sets: 1, repsMin: 25, repsMax: 35, intensityPct: 60, restSeconds: 0, rpe: '3-4', volDelta: -30, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const duration = Math.round(30 + progress * 20); // 30 → 50 min
      return {
        phase: 'Fartlek Livre',
        sets: 1, repsMin: duration, repsMax: duration,
        intensityPct: 75, // média estimada entre Z1 e Z4
        restSeconds: 0, rpe: '4-8',
        note: 'Sem série/descanso definido. Accelerar e desacelerar conforme sensação, terreno ou referências visuais.',
        volDelta: +2, isCardio: true
      };
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
