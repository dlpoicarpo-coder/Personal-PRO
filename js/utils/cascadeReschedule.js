/**
 * Cascade Rescheduling Simulation Module
 * Pure functions for calculating cascade shifts without DB side effects.
 */

/**
 * Helper to get the next date string matching macrocycle.trainingDays
 * @param {string} lastDateStr - 'YYYY-MM-DD'
 * @param {number[]} trainingDays - e.g. [1, 3, 5] (0=Sun, 1=Mon, ..., 6=Sat)
 * @returns {string} - 'YYYY-MM-DD'
 */
function getNextTrainingDate(lastDateStr, trainingDays) {
  const d = new Date(lastDateStr + 'T12:00:00');
  if (!trainingDays || !trainingDays.length) {
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }
  while (true) {
    d.setDate(d.getDate() + 1);
    if (trainingDays.includes(d.getDay())) {
      return d.toISOString().slice(0, 10);
    }
  }
}

/**
 * Pure simulation function for cascade rescheduling without DB side effects.
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

  const schedules = JSON.parse(JSON.stringify(rawSchedules || []));
  const workouts = JSON.parse(JSON.stringify(rawWorkouts || []));
  const macroId = String(macrocycle.id);
  const studentId = String(macrocycle.studentId);
  const trainingDays = macrocycle.trainingDays || [];

  // Filter schedules belonging to this macrocycle
  let macroSchedules = schedules
    .filter(s => String(s.macrocycleId) === macroId && String(s.studentId) === studentId)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Find missed candidate schedules:
  // - workoutId present
  // - status in ('scheduled', 'confirmed')
  // - date < todayStr (string comparison)
  // - !cascadeProcessed
  const missedCandidates = macroSchedules.filter(s =>
    s.workoutId &&
    (s.status === 'scheduled' || s.status === 'confirmed') &&
    s.date < todayStr &&
    !s.cascadeProcessed
  );

  if (missedCandidates.length === 0) {
    return {
      message: 'Nenhum agendamento atrasado pendente para este macrociclo.',
      missedFound: [],
      shifts: [],
      novosWorkoutsCriados: []
    };
  }

  const report = {
    missedFound: [],
    shifts: [],
    novosWorkoutsCriados: []
  };

  for (const missed of missedCandidates) {
    report.missedFound.push({
      scheduleId: missed.id,
      date: missed.date,
      workoutId: missed.workoutId,
      workoutName: missed.workoutName || ''
    });

    // Step a: mark missed in memory
    missed.status = 'missed';
    missed.cascadeProcessed = true;

    // Step b: get following active schedules for same student + macrocycle
    const following = macroSchedules.filter(s =>
      s.workoutId &&
      (s.status === 'scheduled' || s.status === 'confirmed') &&
      s.date > missed.date
    ).sort((a, b) => a.date.localeCompare(b.date));

    let contentToShift = {
      workoutId: missed.workoutId,
      workoutName: missed.workoutName || ''
    };

    // Step c: slide content one position forward
    for (let i = 0; i < following.length; i++) {
      const targetSched = following[i];
      const oldWorkoutName = targetSched.workoutName || '';

      const nextContent = {
        workoutId: targetSched.workoutId,
        workoutName: targetSched.workoutName || ''
      };

      // Assign shifted content to current target
      targetSched.workoutId = contentToShift.workoutId;
      targetSched.workoutName = contentToShift.workoutName;

      report.shifts.push({
        scheduleId: targetSched.id,
        date: targetSched.date,
        de: oldWorkoutName,
        para: targetSched.workoutName
      });

      contentToShift = nextContent;
    }

    // Step d: Create new workout+schedule at the end for leftover shifted content
    const lastDate = macroSchedules.length > 0 ? macroSchedules[macroSchedules.length - 1].date : missed.date;
    const nextDate = getNextTrainingDate(lastDate, trainingDays);

    report.novosWorkoutsCriados.push({
      date: nextDate,
      workoutName: contentToShift.workoutName,
      workoutId: contentToShift.workoutId
    });

    // Append virtual schedule so subsequent iterations account for the new last date/schedule
    const virtualSched = {
      id: 'virtual_' + Math.random().toString(36).substring(2, 7),
      studentId: studentId,
      macrocycleId: macroId,
      workoutId: contentToShift.workoutId,
      workoutName: contentToShift.workoutName,
      date: nextDate,
      status: 'scheduled'
    };
    macroSchedules.push(virtualSched);
    macroSchedules.sort((a, b) => a.date.localeCompare(b.date));
  }

  return report;
}
