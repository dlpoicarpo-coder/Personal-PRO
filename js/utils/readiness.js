export function computeReadiness(studentId, allBf, studentName = '') {
  // 1. Filtrar check-ins (pre-workout) e ordenar cronologicamente
  const studentPreBf = allBf
    .filter(e => e.studentId === studentId && (e.formType === 'pre' || !e.formType))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (studentPreBf.length === 0) {
    return {
      studentId, studentName, kind: 'readiness', status: 'collecting', level: 'none',
      headline: 'Sem dados', detail: 'Nenhum check-in registrado.', metrics: [],
      progress: { have: 0, need: 7 }
    };
  }

  // Separar o mais recente ("hoje") da base histórica
  const todayEntry = studentPreBf[studentPreBf.length - 1];
  const historical = studentPreBf.slice(0, studentPreBf.length - 1);

  const have = historical.length;
  const need = 7;

  // Extrair métricas do dia
  const todayVals = {
    sleep: todayEntry.sleep != null ? todayEntry.sleep : null,
    tqr: (todayEntry.tqr != null ? todayEntry.tqr : (todayEntry.energy != null ? todayEntry.energy : null)),
    stress: todayEntry.stress != null ? todayEntry.stress : null,
    pain: todayEntry.pain != null ? todayEntry.pain : null
  };

  if (have < need) {
    return {
      studentId, studentName, kind: 'readiness', status: 'collecting', level: 'none',
      headline: 'Base em maturação', detail: `Faltam ${need - have} check-ins para calcular baseline.`,
      metrics: [], progress: { have, need }
    };
  }

  // Média (μ) e desvio padrão amostral (σ) do histórico (N - 1)
  const calcStats = (extractFn) => {
    const vals = historical.map(extractFn).filter(v => v != null);
    if (vals.length < 2) return { mean: null, sd: null };
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (vals.length - 1);
    return { mean, sd: Math.sqrt(variance) };
  };

  const stats = {
    sleep: calcStats(e => e.sleep),
    tqr: calcStats(e => e.tqr != null ? e.tqr : e.energy),
    stress: calcStats(e => e.stress),
    pain: calcStats(e => e.pain)
  };

  const metricsInfo = [];

  const evaluateMetric = (name, val, stat, isBadHigh) => {
    if (val == null || stat.mean == null) return;
    
    let level = 'none', isBackstopDanger = false, z = null;

    // Piso absoluto (backstop)
    if (name === 'sleep' && val <= 3) isBackstopDanger = true;
    if (name === 'tqr' && val <= 3) isBackstopDanger = true;
    if (name === 'stress' && val >= 8) isBackstopDanger = true;
    if (name === 'pain' && val >= 7) isBackstopDanger = true;

    // Z-Score Limiares (apenas se sd >= 0.5)
    if (stat.sd != null && stat.sd >= 0.5) {
      z = (val - stat.mean) / stat.sd;
      if (isBadHigh) {
        if (z >= 1.5) level = 'danger'; else if (z >= 1.0) level = 'warning';
      } else {
        if (z <= -1.5) level = 'danger'; else if (z <= -1.0) level = 'warning';
      }
    }

    if (isBackstopDanger) level = 'danger';
    
    metricsInfo.push({ name, z, today: val, mean: stat.mean, level, isBackstopDanger });
  };

  evaluateMetric('sleep', todayVals.sleep, stats.sleep, false);
  evaluateMetric('tqr', todayVals.tqr, stats.tqr, false);
  evaluateMetric('stress', todayVals.stress, stats.stress, true);
  evaluateMetric('pain', todayVals.pain, stats.pain, true);

  // Analisar piores métricas para a mensagem
  const flagged = metricsInfo.filter(m => m.level !== 'none');
  
  // Ordenar severidade (danger > warning), empate por maior desvio |z|
  flagged.sort((a, b) => {
    if (a.level === 'danger' && b.level !== 'danger') return -1;
    if (a.level !== 'danger' && b.level === 'danger') return 1;
    const aZ = a.isBackstopDanger && a.z == null ? 999 : Math.abs(a.z || 0);
    const bZ = b.isBackstopDanger && b.z == null ? 999 : Math.abs(b.z || 0);
    return bZ - aZ;
  });

  let worstDetail = 'As métricas estão de acordo com a linha de base do aluno.';
  if (flagged.length > 0) {
    const labels = { sleep: 'Sono', tqr: 'Recuperação (TQR)', stress: 'Estresse', pain: 'Dor' };
    const formatName = (m) => labels[m.name];
    if (flagged.length === 1) {
      worstDetail = `${formatName(flagged[0])} ${flagged[0].isBackstopDanger ? 'em nível crítico' : 'fora do normal'}.`;
    } else {
      worstDetail = `${formatName(flagged[0])} e ${formatName(flagged[1])} ${flagged[0].isBackstopDanger || flagged[1].isBackstopDanger ? 'em nível crítico' : 'fora do normal'}.`;
    }
  }

  const dangers = flagged.filter(m => m.level === 'danger').length;
  const warnings = flagged.filter(m => m.level === 'warning').length;

  let finalLevel = 'none';
  if (dangers > 0) finalLevel = 'danger';
  else if (warnings >= 2) finalLevel = 'danger';
  else if (warnings === 1) finalLevel = 'warning';

  let headline = finalLevel === 'danger' ? 'Atenção necessária (Prontidão)' : finalLevel === 'warning' ? 'Prontidão abaixo do normal' : 'Tudo dentro do padrão';

  return {
    studentId, studentName, kind: 'readiness', status: 'ok', level: finalLevel,
    headline, detail: worstDetail,
    metrics: metricsInfo, progress: null
  };
}

export function computeLoad(studentId, allSessions, studentName = '') {
  const cutoffDate = new Date('2026-06-27T00:00:00');
  const validSessions = allSessions.filter(s => 
    s.studentId === studentId && s.status === 'completed' && s.postBiofeedback?.pse && new Date(s.date) >= cutoffDate
  );

  if (validSessions.length === 0) {
    return {
      studentId, studentName, kind: 'load', status: 'maturing', level: 'none',
      headline: 'Sem dados', detail: 'Nenhuma sessão válida encontrada.',
      metrics: [], progress: { have: 0, need: 3 }
    };
  }

  const parseLocal = (dStr) => {
    const safeStr = dStr.length === 10 ? dStr + 'T12:00:00' : dStr;
    const d = new Date(safeStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const getWeekKey = (dateString) => {
    const d = parseLocal(dateString);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.getFullYear(), d.getMonth(), diff);
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
  };

  const getWeekdayIndex = (dateString) => {
    const d = parseLocal(dateString);
    const day = d.getDay();
    return day === 0 ? 7 : day;
  };

  // Dia atual
  const today = new Date();
  const todayDay = today.getDay();
  const todayIndex = todayDay === 0 ? 7 : todayDay;
  const currentWeekKey = getWeekKey(today.toISOString());

  const loadByWeek = {};
  
  validSessions.forEach(s => {
    const durMin = s.totalDuration ? s.totalDuration / 60 : (s.durationMin || 0);
    const carga = s.postBiofeedback.pse * durMin;
    const weekKey = getWeekKey(s.date);
    const wdIndex = getWeekdayIndex(s.date);
    
    if (!loadByWeek[weekKey]) loadByWeek[weekKey] = { total: 0, partial: 0 };
    loadByWeek[weekKey].total += carga;
    
    // Calcula carga parcial "até hoje (mesmo index de dia da semana)"
    if (wdIndex <= todayIndex) {
      loadByWeek[weekKey].partial += carga;
    }
  });

  const sortedWeeks = Object.keys(loadByWeek).sort();
  const historicalWeeksKeys = sortedWeeks.filter(k => k < currentWeekKey);
  const currentWeekData = loadByWeek[currentWeekKey] || { partial: 0 };
  const currentLoadPartial = currentWeekData.partial;

  const have = historicalWeeksKeys.length, need = 3;
  if (have < need) {
    return {
      studentId, studentName, kind: 'load', status: 'maturing', level: 'none',
      headline: 'Base em maturação', detail: `Faltam ${need - have} semanas completas para calcular baseline de carga.`,
      metrics: [], progress: { have, need }
    };
  }

  const historicalPartials = historicalWeeksKeys.map(k => loadByWeek[k].partial);

  // Média (μ) e desvio padrão amostral (σ) da carga
  const mean = historicalPartials.reduce((a, b) => a + b, 0) / have;
  let sd = null;
  if (have >= 2) {
    const variance = historicalPartials.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (have - 1);
    sd = Math.sqrt(variance);
  }

  let level = 'none', z = null, detail = 'Carga de treino dentro do padrão.';
  
  if (sd != null && sd >= 1) { // Só dispara se houver variância
    z = (currentLoadPartial - mean) / sd;
    if (z >= 1.5) { 
      level = 'danger'; 
      detail = 'Carga bem acima do padrão dele — vale rever a progressão e confirmar como ele está.'; 
    } else if (z >= 1.0) { 
      level = 'warning'; 
      detail = 'Carga acima do normal dele nesta semana — vale acompanhar.'; 
    }
  }

  let headline = level === 'danger' ? 'Spike Crítico de Carga' : level === 'warning' ? 'Aumento de Carga (Spike)' : 'Tudo dentro do padrão';

  return {
    studentId, studentName, kind: 'load', status: 'ok', level, headline, detail,
    metrics: [{ name: 'trainingLoad', z, today: currentLoadPartial, mean }], progress: null
  };
}
