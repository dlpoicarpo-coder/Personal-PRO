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

/**
 * Applies cascadeGrandfathered flag to past missed schedules belonging to ACTIVE macrocycles via db.put.
 * @param {Object} dbInstance 
 * @param {Array} rawSchedules 
 * @param {Array} rawMacrocycles 
 * @param {string} todayStr 
 * @returns {Promise<number>} Count of marked schedules
 */
export async function applyGrandfathering(dbInstance, rawSchedules, rawMacrocycles, todayStr) {
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
  );

  let count = 0;
  for (const schedule of candidates) {
    schedule.cascadeGrandfathered = true;
    await dbInstance.put('schedules', schedule);
    count++;
  }

  console.log('[FASE A APLICADA]', 'total marcado:', count);
  return count;
}

/**
 * Live Cascade Rescheduling Engine for new missed schedules (excluding cascadeGrandfathered and cascadeProcessed).
 * Migrates workout CONTENT (name, exercises, phase, intensityPct, etc.) across fixed slots.
 *
 * @param {Object} dbInstance 
 * @param {Array} rawSchedules 
 * @param {Array} rawWorkouts 
 * @param {Array} rawMacrocycles 
 * @param {string} todayStr 
 * @param {boolean} dryRun - If true, logs actions without db.put / db.add writes
 * @returns {Promise<Array>} List of reports per processed macrocycle
 */
export async function applyLiveCascade(dbInstance, rawSchedules, rawWorkouts, rawMacrocycles, todayStr, dryRun = true) {
  const activeMacros = (rawMacrocycles || []).filter(m => m.status === 'active');
  const activeMacroIds = new Set(activeMacros.map(m => String(m.id)));

  // 1. Detect new missed schedules
  const newMissedCandidates = (rawSchedules || []).filter(s =>
    s.workoutId &&
    s.macrocycleId &&
    activeMacroIds.has(String(s.macrocycleId)) &&
    (s.status === 'scheduled' || s.status === 'confirmed') &&
    s.date && s.date < todayStr &&
    !s.cascadeGrandfathered &&
    !s.cascadeProcessed
  ).sort((a, b) => a.date.localeCompare(b.date));

  if (newMissedCandidates.length === 0) {
    return [];
  }

  // 3. Group missed by macrocycle
  const missedByMacro = {};
  newMissedCandidates.forEach(s => {
    const mid = String(s.macrocycleId);
    if (!missedByMacro[mid]) missedByMacro[mid] = [];
    missedByMacro[mid].push(s);
  });

  const reports = [];

  for (const macroId of Object.keys(missedByMacro)) {
    const macrocycle = activeMacros.find(m => String(m.id) === macroId);
    if (!macrocycle) continue;

    const missed = missedByMacro[macroId].sort((a, b) => a.date.localeCompare(b.date));

    // Get future schedules of the same macrocycle with workoutId
    const future = (rawSchedules || [])
      .filter(s =>
        String(s.macrocycleId) === macroId &&
        s.workoutId &&
        (s.status === 'scheduled' || s.status === 'confirmed') &&
        s.date && s.date >= todayStr
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    // Content queue: array of workoutIds whose content will be migrated in order
    const contentQueue = [...missed, ...future].map(s => s.workoutId);
    const F = future.length;

    const realocacoes = [];
    const novosSlots = [];

    // 3d. Reallocate content for the first F items
    for (let i = 0; i < F; i++) {
      const sourceWorkoutId = contentQueue[i];
      const targetSchedule = future[i];
      const targetWorkoutId = targetSchedule.workoutId;

      const sourceWorkout = (rawWorkouts || []).find(w => String(w.id) === String(sourceWorkoutId));
      const targetWorkout = (rawWorkouts || []).find(w => String(w.id) === String(targetWorkoutId));

      if (sourceWorkout && targetWorkout) {
        realocacoes.push({
          targetScheduleId: targetSchedule.id,
          targetDate: targetSchedule.date,
          targetWorkoutId: targetWorkout.id,
          conteudoAntigoName: targetWorkout.name,
          conteudoNovoName: sourceWorkout.name,
          sourceWorkoutId: sourceWorkout.id
        });

        if (!dryRun) {
          // Mutate targetWorkout content only (never id, date, studentId, macrocycleId, etc.)
          targetWorkout.name = sourceWorkout.name;
          targetWorkout.exercises = JSON.parse(JSON.stringify(sourceWorkout.exercises || []));
          targetWorkout.phase = sourceWorkout.phase;
          targetWorkout.intensityPct = sourceWorkout.intensityPct;
          targetWorkout.isDeload = sourceWorkout.isDeload;
          targetWorkout.category = sourceWorkout.category;
          targetWorkout.notes = sourceWorkout.notes;

          await dbInstance.put('workouts', targetWorkout);

          targetSchedule.workoutName = targetWorkout.name;
          await dbInstance.put('schedules', targetSchedule);
        }
      }
    }

    // 3e. Create new slots for remaining content beyond F
    let currentDate = (rawSchedules || [])
      .filter(s => String(s.macrocycleId) === macroId)
      .map(s => s.date)
      .sort()
      .pop() || todayStr;

    const remainingWorkoutIds = contentQueue.slice(F);

    for (const sourceId of remainingWorkoutIds) {
      currentDate = getNextTrainingDate(currentDate, macrocycle.trainingDays || []);
      const sourceWorkout = (rawWorkouts || []).find(w => String(w.id) === String(sourceId));

      if (sourceWorkout) {
        const newWorkoutPayload = {
          studentId: macrocycle.studentId,
          macrocycleId: macrocycle.id,
          name: sourceWorkout.name,
          date: currentDate,
          exercises: JSON.parse(JSON.stringify(sourceWorkout.exercises || [])),
          phase: sourceWorkout.phase,
          intensityPct: sourceWorkout.intensityPct,
          isDeload: sourceWorkout.isDeload,
          category: sourceWorkout.category,
          notes: sourceWorkout.notes,
          _offline: true
        };

        novosSlots.push({
          newDate: currentDate,
          workoutName: sourceWorkout.name,
          sourceWorkoutId: sourceWorkout.id
        });

        if (!dryRun) {
          const savedWorkout = await dbInstance.add('workouts', newWorkoutPayload);
          const newSchedulePayload = {
            studentId: macrocycle.studentId,
            workoutId: savedWorkout.id,
            macrocycleId: macrocycle.id,
            date: currentDate,
            time: macrocycle.trainingTime || '07:00',
            duration: macrocycle.sessionDuration || 60,
            workoutName: savedWorkout.name,
            status: 'scheduled',
            repeat: 'none',
            _offline: true
          };
          await dbInstance.add('schedules', newSchedulePayload);
        }
      }
    }

    // 3f. Mark original missed items
    for (const missedItem of missed) {
      if (!dryRun) {
        missedItem.status = 'missed';
        missedItem.cascadeProcessed = true;
        await dbInstance.put('schedules', missedItem);
      }
    }

    const report = {
      macrocycleId: macrocycle.id,
      studentId: macrocycle.studentId,
      missedCount: missed.length,
      realocadosCount: F,
      novosSlotsCount: remainingWorkoutIds.length,
      realocacoes,
      novosSlots,
      dryRun
    };

    reports.push(report);

    // Audit Log
    console.log('[CASCADE LIVE' + (dryRun ? ' DRY-RUN]' : ']'), JSON.stringify(report, null, 2));
  }

  return reports;
}
