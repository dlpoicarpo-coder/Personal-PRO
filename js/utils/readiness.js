export function computeReadiness(studentId, allBf, studentName = '') {
  // Filter check-ins (pre-workout) and sort ascending by date
  const studentPreBf = allBf
    .filter(e => e.studentId === studentId && (e.formType === 'pre' || !e.formType))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // If no check-ins at all
  if (studentPreBf.length === 0) {
    return {
      studentId, studentName,
      kind: 'readiness',
      status: 'collecting',
      level: 'none',
      headline: 'Sem dados',
      detail: 'Nenhum check-in registrado.',
      metrics: [],
      progress: { have: 0, need: 7 }
    };
  }

  // Get 'today' (the most recent one) and 'historical' (all others)
  const todayEntry = studentPreBf[studentPreBf.length - 1];
  const historical = studentPreBf.slice(0, studentPreBf.length - 1);

  const have = historical.length;
  const need = 7;

  // We always collect the current values to return in metrics (even if collecting)
  const todayVals = {
    sleep: todayEntry.sleep != null ? todayEntry.sleep : null,
    tqr: (todayEntry.tqr != null ? todayEntry.tqr : (todayEntry.energy != null ? todayEntry.energy : null)),
    stress: todayEntry.stress != null ? todayEntry.stress : null,
    pain: todayEntry.pain != null ? todayEntry.pain : null
  };

  if (have < need) {
    return {
      studentId, studentName,
      kind: 'readiness',
      status: 'collecting',
      level: 'none',
      headline: 'Base em maturao',
      detail: `Faltam ${need - have} check-ins para calcular baseline.`,
      metrics: [],
      progress: { have, need }
    };
  }

  // Calculate Mean and SD for each core metric in historical data
  const calcStats = (metricExtractFn) => {
    const vals = historical.map(metricExtractFn).filter(v => v != null);
    if (vals.length === 0) return { mean: null, sd: null };
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const sd = Math.sqrt(variance);
    return { mean, sd };
  };

  const stats = {
    sleep: calcStats(e => e.sleep),
    tqr: calcStats(e => e.tqr != null ? e.tqr : e.energy),
    stress: calcStats(e => e.stress),
    pain: calcStats(e => e.pain)
  };

  const metricsInfo = [];
  let warnings = 0;
  let dangers = 0;
  let worstDetail = null;

  const evaluateMetric = (name, val, stat, isBadHigh) => {
    if (val == null || stat.mean == null) return;
    
    let level = 'none';
    let isBackstopDanger = false;
    let z = null;

    // 1. Backstop (Absolute Floor)
    if (name === 'sleep' && val <= 3) isBackstopDanger = true;
    if (name === 'tqr' && val <= 3) isBackstopDanger = true;
    if (name === 'stress' && val >= 8) isBackstopDanger = true;
    if (name === 'pain' && val >= 7) isBackstopDanger = true;

    // 2. Z-Score (if SD >= 0.5)
    if (stat.sd >= 0.5) {
      z = (val - stat.mean) / stat.sd;
      if (isBadHigh) {
        if (z >= 1.5) level = 'danger';
        else if (z >= 1.0) level = 'warning';
      } else {
        if (z <= -1.5) level = 'danger';
        else if (z <= -1.0) level = 'warning';
      }
    }

    if (isBackstopDanger) level = 'danger';

    if (level === 'danger') dangers++;
    else if (level === 'warning') warnings++;

    metricsInfo.push({ name, z, today: val, mean: stat.mean, level });

    if (level !== 'none' && !worstDetail) {
      const metricLabel = name === 'sleep' ? 'Sono' : name === 'tqr' ? 'Recuperao (TQR)' : name === 'stress' ? 'Estresse' : 'Dor';
      worstDetail = `${metricLabel} ${isBackstopDanger ? 'em nvel crtico' : 'fora do normal'}.`;
    }
  };

  evaluateMetric('sleep', todayVals.sleep, stats.sleep, false);
  evaluateMetric('tqr', todayVals.tqr, stats.tqr, false);
  evaluateMetric('stress', todayVals.stress, stats.stress, true);
  evaluateMetric('pain', todayVals.pain, stats.pain, true);

  // Overall level logic
  let finalLevel = 'none';
  if (dangers > 0) finalLevel = 'danger';
  else if (warnings >= 2) finalLevel = 'danger';
  else if (warnings === 1) finalLevel = 'warning';

  let headline = 'Tudo dentro do padro';
  if (finalLevel === 'danger') headline = 'Ateno necessria (Prontido)';
  else if (finalLevel === 'warning') headline = 'Prontido abaixo do normal';

  return {
    studentId, studentName,
    kind: 'readiness',
    status: 'ok',
    level: finalLevel,
    headline: finalLevel === 'none' ? headline : headline,
    detail: worstDetail || 'As mtricas esto de acordo com a linha de base do aluno.',
    metrics: metricsInfo,
    progress: null
  };
}

export function computeLoad(studentId, allSessions, studentName = '') {
  // Filter sessions (completed, with PSE, and after the bug fix date)
  const cutoffDate = new Date('2026-06-27T00:00:00');
  const validSessions = allSessions.filter(s => {
    if (s.studentId !== studentId || s.status !== 'completed' || !s.postBiofeedback?.pse) return false;
    const d = new Date(s.date);
    return d >= cutoffDate;
  });

  if (validSessions.length === 0) {
    return {
      studentId, studentName,
      kind: 'load',
      status: 'maturing',
      level: 'none',
      headline: 'Sem dados',
      detail: 'Nenhuma sesso vlida encontrada.',
      metrics: [],
      progress: { have: 0, need: 4 }
    };
  }

  // Group load by week (Monday to Sunday)
  const getWeekKey = (dateString) => {
    const d = new Date(dateString);
    // Get Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10);
  };

  const loadByWeek = {};
  validSessions.forEach(s => {
    const durMin = s.totalDuration ? s.totalDuration / 60 : (s.durationMin || 0);
    const pse = s.postBiofeedback.pse;
    const carga = pse * durMin;
    const weekKey = getWeekKey(s.date);
    loadByWeek[weekKey] = (loadByWeek[weekKey] || 0) + carga;
  });

  const sortedWeeks = Object.keys(loadByWeek).sort();
  
  if (sortedWeeks.length === 0) {
    return {
      studentId, studentName,
      kind: 'load',
      status: 'maturing',
      level: 'none',
      headline: 'Base em maturao',
      detail: 'Dados insuficientes.',
      metrics: [],
      progress: { have: 0, need: 4 }
    };
  }

  // Current week is the last one in the sorted array (assuming it's the ongoing week)
  const currentWeekKey = sortedWeeks[sortedWeeks.length - 1];
  const currentLoad = loadByWeek[currentWeekKey];
  const historicalWeeks = sortedWeeks.slice(0, sortedWeeks.length - 1).map(k => loadByWeek[k]);

  const have = historicalWeeks.length;
  const need = 3; // Needs at least 3 previous full weeks

  if (have < need) {
    return {
      studentId, studentName,
      kind: 'load',
      status: 'maturing',
      level: 'none',
      headline: 'Base em maturao',
      detail: `Faltam ${need - have} semanas completas para calcular baseline de carga.`,
      metrics: [],
      progress: { have, need: 4 } // 4 total weeks needed (3 historical + 1 current)
    };
  }

  // Calc Mean and SD of historical weeks
  const mean = historicalWeeks.reduce((a, b) => a + b, 0) / historicalWeeks.length;
  const variance = historicalWeeks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalWeeks.length;
  const sd = Math.sqrt(variance);

  let level = 'none';
  let z = null;
  let detail = 'Carga de treino dentro do padro.';
  
  if (sd >= 1) { // epsilon for load
    z = (currentLoad - mean) / sd;
    if (z >= 1.5) {
      level = 'danger';
      detail = 'Spike agudo de carga detectado! Risco de leso.';
    } else if (z >= 1.0) {
      level = 'warning';
      detail = 'Aumento atpico de carga nesta semana.';
    }
  }

  let headline = 'Tudo dentro do padro';
  if (level === 'danger') headline = 'Spike Crtico de Carga';
  else if (level === 'warning') headline = 'Aumento de Carga (Spike)';

  return {
    studentId, studentName,
    kind: 'load',
    status: 'ok',
    level,
    headline: level === 'none' ? headline : headline,
    detail,
    metrics: [{ name: 'trainingLoad', z, today: currentLoad, mean }],
    progress: null
  };
}
