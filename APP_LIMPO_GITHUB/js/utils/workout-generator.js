// ========================================
// PERSONAL PRO — Automatic Workout Generator
// ========================================

/**
 * Generates week-by-week workouts from a periodization plan + exercise library
 * 
 * @param {Object} config
 * @param {string} config.studentId
 * @param {string} config.type - Periodization type (linear, undulating_weekly, undulating_daily, block)
 * @param {number} config.totalWeeks
 * @param {number} config.daysPerWeek - Training days per week (2-6)
 * @param {number} config.deloadEvery
 * @param {Array} config.muscleGroups - Selected muscle groups
 * @param {Array} config.exercises - Selected exercises from library
 * @param {Object} config.rm1Data - 1RM data by exercise name { 'Supino': 80 }
 * @param {Array} config.weeklyPlan - Generated from periodization-models.js
 * @returns {Array} Array of workout objects ready to save
 */
export function generateWorkouts(config) {
  const { studentId, type, totalWeeks, daysPerWeek, exercises, weeklyPlan, rm1Data = {} } = config;
  const workouts = [];

  // Split exercises into training days
  const splits = createSplit(exercises, daysPerWeek);

  for (let w = 0; w < totalWeeks; w++) {
    const weekPlan = weeklyPlan[w];
    if (!weekPlan) continue;

    for (let d = 0; d < daysPerWeek; d++) {
      const dayExercises = splits[d] || [];
      if (!dayExercises.length) continue;

      const workout = {
        studentId,
        name: `${weekPlan.label} — ${splits[d].splitName || `Dia ${d + 1}`}`,
        week: w + 1,
        dayOfWeek: d,
        date: calculateDate(config.startDate, w, d),
        cycle: `Semana ${w + 1} — ${weekPlan.label}`,
        periodizationType: type,
        macrocycleId: config.macrocycleId || null,
        exercises: dayExercises.map(ex => {
          const rm1 = rm1Data[ex.name] || parseFloat(ex.defaultLoad) || 0;
          const params = exerciseParams(weekPlan, type, d, rm1);
          return {
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            category: ex.category,
            sets: params.sets,
            reps: params.reps,
            load: params.load > 0 ? Math.round(params.load * 2) / 2 : '', // round to 0.5
            rest: params.rest,
            method: params.method || '',
            intensityPct: params.intensityPct,
          };
        }),
      };
      workouts.push(workout);
    }
  }

  return workouts;
}

/**
 * Create training split based on exercises and days per week
 */
function createSplit(exercises, days) {
  const splits = [];
  const byGroup = {};
  exercises.forEach(ex => {
    const g = ex.muscleGroup || 'Geral';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(ex);
  });
  const groups = Object.keys(byGroup);

  const SPLIT_NAMES = {
    2: [{ name: 'Superior', groups: ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps'] },
    { name: 'Inferior', groups: ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha', 'Abdômen'] }],
    3: [{ name: 'Push (Empurrar)', groups: ['Peito', 'Ombros', 'Tríceps'] },
    { name: 'Pull (Puxar)', groups: ['Costas', 'Bíceps', 'Antebraço'] },
    { name: 'Legs (Pernas)', groups: ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha', 'Abdômen'] }],
    4: [{ name: 'Peito/Tríceps', groups: ['Peito', 'Tríceps'] },
    { name: 'Costas/Bíceps', groups: ['Costas', 'Bíceps', 'Antebraço'] },
    { name: 'Ombros/Abdômen', groups: ['Ombros', 'Abdômen', 'Core'] },
    { name: 'Pernas', groups: ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha'] }],
    5: [{ name: 'Peito', groups: ['Peito'] },
    { name: 'Costas', groups: ['Costas'] },
    { name: 'Ombros/Trapézio', groups: ['Ombros'] },
    { name: 'Braços', groups: ['Bíceps', 'Tríceps', 'Antebraço'] },
    { name: 'Pernas', groups: ['Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha', 'Abdômen'] }],
    6: [{ name: 'Peito', groups: ['Peito'] },
    { name: 'Costas', groups: ['Costas'] },
    { name: 'Ombros', groups: ['Ombros'] },
    { name: 'Braços', groups: ['Bíceps', 'Tríceps'] },
    { name: 'Quads/Glúteos', groups: ['Quadríceps', 'Glúteos'] },
    { name: 'Post/Panturrilha', groups: ['Posterior', 'Panturrilha', 'Abdômen'] }],
  };

  const template = SPLIT_NAMES[days] || SPLIT_NAMES[3];

  template.forEach(split => {
    const dayExs = [];
    split.groups.forEach(g => {
      if (byGroup[g]) dayExs.push(...byGroup[g]);
    });
    // Also include exercises not matched
    if (dayExs.length === 0) {
      const remaining = exercises.filter(ex => !splits.flat().includes(ex));
      dayExs.push(...remaining.slice(0, Math.ceil(exercises.length / days)));
    }
    dayExs.splitName = split.name;
    splits.push(dayExs);
  });

  return splits;
}

/**
 * Calculate exercise parameters based on week plan and periodization type
 */
function exerciseParams(weekPlan, type, dayIdx, rm1) {
  const intPct = weekPlan.intensityPct / 100;
  const volMod = weekPlan.setsMultiplier || 1;

  // DUP: varies by day
  if (type === 'undulating_daily' && weekPlan.sessions) {
    const sess = weekPlan.sessions[dayIdx % weekPlan.sessions.length];
    const dayIntPct = (sess.intensity || weekPlan.intensityPct) / 100;
    return {
      sets: Math.round(3 * volMod),
      reps: sess.reps || '10',
      load: rm1 > 0 ? Math.round(rm1 * dayIntPct) : '',
      rest: dayIntPct >= 0.8 ? '120' : dayIntPct >= 0.65 ? '90' : '60',
      intensityPct: Math.round(dayIntPct * 100),
      method: '',
    };
  }

  // Standard
  let reps = weekPlan.repsRange || '10';
  let sets = intPct >= 0.85 ? 4 : intPct >= 0.7 ? 4 : 3;
  sets = Math.round(sets * volMod);
  const rest = intPct >= 0.8 ? '120' : intPct >= 0.65 ? '90' : '60';
  const load = rm1 > 0 ? Math.round(rm1 * intPct) : '';

  return { sets, reps, load, rest, intensityPct: weekPlan.intensityPct, method: '' };
}

function calculateDate(startDate, weekIdx, dayIdx) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + (weekIdx * 7) + dayIdx);
  return d.toISOString().slice(0, 10);
}
