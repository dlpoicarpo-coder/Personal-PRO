// ========================================
// PERSONAL PRO — Periodization Models
// ========================================

export const PERIODIZATION_TYPES = [
  { id: 'linear', name: 'Linear', desc: 'Aumenta intensidade e diminui volume progressivamente' },
  { id: 'undulating_daily', name: 'Ondulatória Diária (DUP)', desc: 'Varia estímulo a cada sessão: força, hipertrofia, resistência' },
  { id: 'undulating_weekly', name: 'Ondulatória Semanal', desc: 'Varia foco a cada semana dentro do mesociclo' },
  { id: 'block', name: 'Em Bloco', desc: 'Blocos focados: Acumulação → Intensificação → Pico' },
];

export const MESOCYCLE_PHASES = [
  { id: 'adaptacao', name: 'Adaptação', color: '#3b82f6', volumePct: 70, intensityPct: 50 },
  { id: 'hipertrofia', name: 'Hipertrofia', color: '#10b981', volumePct: 85, intensityPct: 70 },
  { id: 'forca', name: 'Força', color: '#f59e0b', volumePct: 60, intensityPct: 85 },
  { id: 'potencia', name: 'Potência', color: '#ef4444', volumePct: 40, intensityPct: 95 },
  { id: 'resistencia', name: 'Resistência Muscular', color: '#8b5cf6', volumePct: 90, intensityPct: 55 },
  { id: 'deload', name: 'Deload / Recuperação', color: '#64748b', volumePct: 40, intensityPct: 40 },
  { id: 'pico', name: 'Pico / Taper', color: '#ec4899', volumePct: 30, intensityPct: 100 },
  { id: 'manutencao', name: 'Manutenção', color: '#06b6d4', volumePct: 65, intensityPct: 65 },
];

// Generate weekly plan based on periodization type
export function generateWeeklyPlan(type, totalWeeks, phases, deloadEvery = 4) {
  const weeks = [];

  if (type === 'linear') {
    // Linear: progressive increase in intensity, decrease in volume
    for (let i = 0; i < totalWeeks; i++) {
      const isDeload = deloadEvery > 0 && (i + 1) % deloadEvery === 0;
      if (isDeload) {
        weeks.push({ week: i + 1, phase: 'deload', volumePct: 40, intensityPct: 40, repsRange: '12-15', setsMultiplier: 0.6, label: 'Deload' });
      } else {
        const progress = i / (totalWeeks - 1);
        const vol = Math.round(90 - (progress * 40)); // 90% → 50%
        const int = Math.round(50 + (progress * 45)); // 50% → 95%
        const reps = progress < 0.33 ? '12-15' : progress < 0.66 ? '8-12' : '4-8';
        weeks.push({ week: i + 1, phase: 'progressao', volumePct: vol, intensityPct: int, repsRange: reps, setsMultiplier: 1, label: `Semana ${i + 1}` });
      }
    }
  } else if (type === 'undulating_weekly') {
    // Undulating weekly: alternates focus each week
    const patterns = [
      { phase: 'resistencia', volumePct: 85, intensityPct: 55, repsRange: '12-15', label: 'Resistência' },
      { phase: 'hipertrofia', volumePct: 80, intensityPct: 70, repsRange: '8-12', label: 'Hipertrofia' },
      { phase: 'forca', volumePct: 60, intensityPct: 85, repsRange: '4-6', label: 'Força' },
    ];
    for (let i = 0; i < totalWeeks; i++) {
      const isDeload = deloadEvery > 0 && (i + 1) % deloadEvery === 0;
      if (isDeload) {
        weeks.push({ week: i + 1, phase: 'deload', volumePct: 40, intensityPct: 40, repsRange: '12-15', setsMultiplier: 0.6, label: 'Deload' });
      } else {
        const p = patterns[i % patterns.length];
        // Progressive overload within pattern
        const blockNum = Math.floor(i / patterns.length);
        const overload = blockNum * 3;
        weeks.push({ week: i + 1, ...p, intensityPct: Math.min(100, p.intensityPct + overload), setsMultiplier: 1 });
      }
    }
  } else if (type === 'block') {
    // Block: dedicated phases
    const phaseList = phases || ['adaptacao', 'hipertrofia', 'forca', 'pico'];
    const weeksPerPhase = Math.max(2, Math.floor(totalWeeks / phaseList.length));

    phaseList.forEach((phaseId, pi) => {
      const phase = MESOCYCLE_PHASES.find(p => p.id === phaseId) || MESOCYCLE_PHASES[0];
      for (let w = 0; w < weeksPerPhase && weeks.length < totalWeeks; w++) {
        const isDeload = w === weeksPerPhase - 1 && weeksPerPhase >= 4;
        if (isDeload) {
          weeks.push({ week: weeks.length + 1, phase: 'deload', volumePct: 40, intensityPct: 40, repsRange: '12-15', setsMultiplier: 0.6, label: 'Deload', blockPhase: phase.name });
        } else {
          const progress = w / (weeksPerPhase - 1 || 1);
          const vol = Math.round(phase.volumePct + (progress * 10));
          const int = Math.round(phase.intensityPct + (progress * 5));
          const reps = phase.intensityPct >= 80 ? '4-6' : phase.volumePct >= 80 ? '12-15' : '8-12';
          weeks.push({ week: weeks.length + 1, phase: phaseId, volumePct: Math.min(100, vol), intensityPct: Math.min(100, int), repsRange: reps, setsMultiplier: 1, label: phase.name, blockPhase: phase.name });
        }
      }
    });
    // Fill remaining weeks
    while (weeks.length < totalWeeks) {
      weeks.push({ week: weeks.length + 1, phase: 'manutencao', volumePct: 65, intensityPct: 65, repsRange: '8-12', setsMultiplier: 1, label: 'Manutenção' });
    }
  } else if (type === 'undulating_daily') {
    // DUP: each week has mixed sessions
    for (let i = 0; i < totalWeeks; i++) {
      const isDeload = deloadEvery > 0 && (i + 1) % deloadEvery === 0;
      if (isDeload) {
        weeks.push({
          week: i + 1, phase: 'deload', volumePct: 40, intensityPct: 40, repsRange: '12-15', setsMultiplier: 0.6, label: 'Deload',
          sessions: [
            { focus: 'Leve', reps: '15', intensity: 40 },
            { focus: 'Leve', reps: '15', intensity: 40 },
          ]
        });
      } else {
        const blockNum = Math.floor(i / deloadEvery || i / 4);
        const overload = blockNum * 3;
        weeks.push({
          week: i + 1, phase: 'dup', volumePct: 75, intensityPct: 70 + overload, repsRange: 'variado', setsMultiplier: 1, label: `DUP Sem. ${i + 1}`,
          sessions: [
            { focus: 'Hipertrofia', reps: '8-12', intensity: Math.min(100, 70 + overload) },
            { focus: 'Força', reps: '4-6', intensity: Math.min(100, 85 + overload) },
            { focus: 'Resistência', reps: '12-20', intensity: Math.min(100, 55 + overload) },
          ]
        });
      }
    }
  }

  return weeks;
}

// Calculate target volume for a week based on baseline
export function weeklyVolume(baselineSets, weekPlan) {
  return Math.round(baselineSets * (weekPlan.volumePct / 100) * (weekPlan.setsMultiplier || 1));
}

// Calculate target intensity (% of 1RM)
export function weeklyIntensity(rm1, weekPlan) {
  return Math.round(rm1 * (weekPlan.intensityPct / 100));
}
