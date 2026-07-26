/**
 * Cascade Rescheduling Simulation Module
 * Queue-based calculation for cascade shifts without DB side effects.
 */

/**
 * Helper to get the next date string matching macrocycle.trainingDays
 * @param {string} lastDateStr - 'YYYY-MM-DD'
 * @param {number[]} trainingDays - e.g. [1, 3, 5] (0=Sun, 1=Mon, ..., 6=Sat)
 * @returns {string} - 'YYYY-MM-DD'
 */
function getNextTrainingDate(lastDateStr, trainingDays) {
  const parts = lastDateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

  const formatDate = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (!trainingDays || !trainingDays.length) {
    d.setDate(d.getDate() + 2);
    return formatDate(d);
  }
  while (true) {
    d.setDate(d.getDate() + 1);
    if (trainingDays.includes(d.getDay())) {
      return formatDate(d);
    }
  }
}

/**
 * Queue-based pure simulation function for cascade rescheduling without DB side effects.
 *
 * @param {Array} rawSchedules 
 * @param {Array} rawWorkouts 
 * @param {Object} macrocycle 
 * @param {string} todayStr - 'YYYY-MM-DD'
 * @returns {Object} Report object
 */
export function simulateCascade(rawSchedules, rawWorkouts, macrocycle, todayStr) {
  if (!macrocycle || !macrocycle.id) {
    return { error: 'Macrociclo invalido' };
  }

  const macroId = String(macrocycle.id);
  const studentId = String(macrocycle.studentId);
  const trainingDays = macrocycle.trainingDays || [];

  // Step 1: Snapshot copies of schedules belonging to this macrocycle & student
  const macroSchedules = (rawSchedules || [])
    .filter(s => String(s.macrocycleId) === macroId && String(s.studentId) === studentId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const snapshot = macroSchedules.map(s => ({ ...s }));

  // Step 2: Separate into missed and future (only schedules with workoutId present)
  const missed = snapshot.filter(s =>
    s.workoutId &&
    (s.status === 'scheduled' || s.status === 'confirmed') &&
    s.date < todayStr &&
    !s.cascadeProcessed
  ).sort((a, b) => a.date.localeCompare(b.date));

  const future = snapshot.filter(s =>
    s.workoutId &&
    (s.status === 'scheduled' || s.status === 'confirmed') &&
    s.date >= todayStr
  ).sort((a, b) => a.date.localeCompare(b.date));

  if (missed.length === 0) {
    return {
      message: 'Nenhum agendamento atrasado pendente para este macrociclo.',
      missedMarcados: [],
      slotsFuturosRealocados: [],
      novosSlotsACriar: []
    };
  }

  // Step 3: Build content queue in original chronological order
  const contentQueue = [...missed, ...future].map(s => ({
    workoutId: s.workoutId,
    workoutName: s.workoutName || ''
  }));

  // Step 4: Reallocate F future slots with first F content items
  const slotsFuturosRealocados = future.map((slot, i) => {
    const conteudoNovo = contentQueue[i];
    return {
      scheduleId: slot.id,
      date: slot.date,
      conteudoAntigo: slot.workoutName || '',
      conteudoNovo: conteudoNovo ? conteudoNovo.workoutName : ''
    };
  });

  // Step 5: Remaining M items in contentQueue (contentQueue[F] to contentQueue[M+F-1]) need M new slots
  const novosSlotsACriar = [];
  let currentDate = snapshot.length > 0 ? snapshot[snapshot.length - 1].date : todayStr;

  const remainingContent = contentQueue.slice(future.length);
  for (const content of remainingContent) {
    currentDate = getNextTrainingDate(currentDate, trainingDays);
    novosSlotsACriar.push({
      date: currentDate,
      workoutName: content.workoutName,
      workoutId: content.workoutId
    });
  }

  // Step 6: missedMarcados
  const missedMarcados = missed.map(m => ({
    scheduleId: m.id,
    date: m.date,
    workoutName: m.workoutName || ''
  }));

  return {
    missedMarcados,
    slotsFuturosRealocados,
    novosSlotsACriar
  };
}

/**
 * Dry-run function for grandfathering past missed schedules belonging to ACTIVE macrocycles without DB writes.
 * @param {Array} rawSchedules 
 * @param {Array} rawMacrocycles 
 * @param {string} todayStr 
 * @returns {Object} Dry-run report
 */
export function dryRunGrandfathering(rawSchedules, rawMacrocycles, todayStr) {
  const activeMacroIds = new Set(
    (rawMacrocycles || [])
      .filter(m => m.status === 'active')
      .map(m => String(m.id))
  );

  const candidates = (rawSchedules || []).filter(s =>
    s.workoutId &&
    s.macrocycleId &&
    activeMacroIds.has(String(s.macrocycleId)) &&
    (s.status === 'scheduled' || s.status === 'confirmed') &&
    s.date && s.date < todayStr &&
    !s.cascadeGrandfathered
  ).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalToGrandfather: candidates.length,
    candidates: candidates.map(s => ({
      id: s.id,
      macrocycleId: s.macrocycleId,
      date: s.date,
      studentId: s.studentId,
      workoutName: s.workoutName || '',
      status: s.status
    }))
  };
}
