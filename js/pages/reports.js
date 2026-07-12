// ========================================
// VETOR â€” Reports Page (v4)
// Cycle selection + Student-focused dossier
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { notify } from '../components/toast.js';
import { analyzeBiofeedback, overallStatus, trainingRecommendation } from '../utils/alerts.js';

export async function renderReports() {
  const storedStudent = sessionStorage.getItem('pp_reports_student_filter') || '';
  const students = await db.getAll('students');
  const active = students.filter(s => s.status === 'Ativo');
  return `
    <div class="page-header">
      <div><h1>RelatÃ³rios de Performance</h1><p class="subtitle">DossiÃª compacto com grÃ¡ficos de evoluÃ§Ã£o e comparaÃ§Ã£o entre ciclos</p></div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <select class="form-select" id="reportStudent" style="min-width:220px">
          <option value="">Selecione um aluno</option>
          ${active.map(s => `<option value="${s.id}" ${storedStudent === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <select class="form-select" id="reportCycle" style="min-width:160px;display:none">
          <option value="">Todos os ciclos</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="exportWaBtn" style="display:none;color:#25d366;border-color:#25d366">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Enviar
        </button>
        <select class="form-select form-select-sm" id="pdfFormatSel" style="display:none; min-width:140px; border-color:var(--primary); color:var(--primary); font-weight:600">
          <option value="mobile">ðŸ“± Celular (Vertical)</option>
          <option value="a4">ðŸ“„ A4 (Horizontal)</option>
        </select>
        <button class="btn btn-primary btn-sm" id="exportPdfBtn" style="display:none">Gerar PDF</button>
      </div>
    </div>
    <div id="pdfAnnotationsContainer" style="display:none;margin-bottom:16px;">
      <label class="form-label">AnotaÃ§Ãµes do Treinador (para o PDF):</label>
      <textarea id="pdfAnnotations" class="form-textarea" placeholder="Adicione notas, comentÃ¡rios ou orientaÃ§Ãµes extras para o aluno..."></textarea>
    </div>
    <div id="reportContent">
      <div class="empty-state"><div class="empty-icon" style="font-size:2rem">â€”</div><h3>Selecione um aluno</h3><p class="text-muted">Escolha um aluno para ver o relatÃ³rio completo</p></div>
    </div>
  `;
}

async function getStudentCycles(studentId) {
  const macros = (await db.getAll('macrocycles')).filter(m => m.studentId === studentId);
  return macros.map(m => ({ id: m.id, name: m.name, start: m.startDate, end: m.endDate }));
}

async function renderStudentReport(studentId, cycleFilter = '') {
  const student = await db.get('students', studentId);
  if (!student) return '';
  let startDate = null, endDate = null;
  if (cycleFilter) {
    const macro = await db.get('macrocycles', cycleFilter);
    if (macro) { startDate = new Date(macro.startDate); endDate = new Date(macro.endDate); endDate.setHours(23,59,59,999); }
  }
  const allWorkouts = (await db.getAll('workouts')).filter(w => w.studentId === studentId);
  const workouts = cycleFilter ? allWorkouts.filter(w => String(w.macrocycleId) === String(cycleFilter) || String(w.cycle) === String(cycleFilter)) : allWorkouts;
  const workoutIds = new Set(workouts.map(w => String(w.id)));
  
  const allBiofeedback = await db.getAll('biofeedback');
  const allSessionsRaw = (await db.getAll('sessions')).filter(s => s.studentId === studentId);
  const allSessions = allSessionsRaw.map(s => {
    const durationMin = s.durationMin || (s.totalDuration ? Math.round(s.totalDuration / 60) : 0);
    const exercises = s.exercises || [];
    const setLog = (s.setLog || []).map(set => ({
      ...set,
      exerciseName: set.exerciseName || (exercises[set.exIdx]?.name) || (set.exerciseIdx != null ? exercises[set.exerciseIdx]?.name : null) || null,
      load: parseFloat(set.load) || 0,
      reps: parseFloat(set.reps) || 0,
    }));
    const totalVol = s.totalVolume || setLog.reduce((t,x)=>t+(x.load||0)*(x.reps||0),0);

    // Enrich with biofeedback
    const dateStr = (s.date || '').substring(0, 10);
    const bfId = `bf_${s.studentId}_${dateStr}`;
    const bfObj = allBiofeedback.find(b => b.id === bfId || (b.studentId === s.studentId && (b.date || '').startsWith(dateStr)));
    
    let postBiofeedback = s.postBiofeedback || null;
    let trainingLoad = s.trainingLoad || null;
    if (bfObj) {
      postBiofeedback = {
        ...(s.postBiofeedback || {}),
        pse: bfObj.pse || s.postBiofeedback?.pse,
        trainingLoad: bfObj.trainingLoad || s.postBiofeedback?.trainingLoad,
        tqrPost: bfObj.tqrPost || s.postBiofeedback?.tqrPost,
        feeling: bfObj.feeling || s.postBiofeedback?.feeling,
        notes: bfObj.postNotes || bfObj.notes || s.postBiofeedback?.notes,
        submittedByStudent: bfObj.submittedByStudent || s.postBiofeedback?.submittedByStudent,
      };
      trainingLoad = bfObj.trainingLoad || s.trainingLoad;
    }

    return { ...s, durationMin, setLog, totalVolume: totalVol, postBiofeedback, trainingLoad };
  });
  const sessions = cycleFilter ? allSessions.filter(s => workoutIds.has(String(s.workoutId))) : (startDate ? allSessions.filter(s => new Date(s.date) >= startDate && new Date(s.date) <= endDate) : allSessions);
  
  const allBf = (await db.getAll('biofeedback')).filter(b => b.studentId === studentId).sort((a, b) => new Date(a.date) - new Date(b.date));
  const bf = cycleFilter ? allBf.filter(b => sessions.some(s => new Date(s.date).toDateString() === new Date(b.date).toDateString())) : (startDate ? allBf.filter(b => new Date(b.date) >= startDate && new Date(b.date) <= endDate) : allBf);
  
  const allAss = (await db.getAll('assessments')).filter(a => a.studentId === studentId);
  const assessments = startDate ? allAss.filter(a => new Date(a.date) >= startDate && new Date(a.date) <= endDate) : allAss;
  const completed = sessions.filter(s => s.status === 'completed');
  const recent10 = bf.slice(-10);
  const avgPse = recent10.length ? (recent10.reduce((s, b) => s + (b.pse || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgSleep = recent10.length ? ((recent10.reduce((s, b) => s + (b.sleep || 0), 0) / recent10.length)/2).toFixed(1) : '-';
  const avgMood = recent10.length ? (recent10.reduce((s, b) => s + (b.mood || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgTqr    = recent10.length ? (recent10.reduce((s, b) => s + (b.tqr || b.energy || 0), 0) / recent10.length).toFixed(1) : '-';
  const totalLoad = bf.reduce((s, b) => s + (b.trainingLoad || 0), 0);

  const pseNum = parseFloat(avgPse) || 0;
  const sleepNum = parseFloat(avgSleep) || 0;
  const cycleLabel = cycleFilter || 'Todos os Ciclos';

  // â”€â”€ CÃ¡lculo de calorias com base na avaliaÃ§Ã£o mais recente â”€â”€
  const lastComp   = assessments.filter(a=>a.type==='composicao').sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
  const age        = student?.birthDate ? Calc.calcularIdade(student.birthDate) : (student?.age || 0);
  const sexo       = student?.gender || 'M';
  const objMap     = {'Emagrecimento':'emagrecimento','Perda de peso':'emagrecimento','Hipertrofia':'hipertrofia','Ganho de massa':'hipertrofia','ManutenÃ§Ã£o':'manutencao','SaÃºde':'manutencao','Condicionamento':'manutencao'};
  const obj        = objMap[student?.goal] || 'manutencao';
  const tmbResult  = lastComp?.peso && age ? Calc.tmb(lastComp.peso, lastComp.altura, age, sexo, lastComp.massaMagra) : null;
  const sessPerWeek= completed.length > 1
    ? completed.length / Math.max(1, Math.ceil((new Date(completed[0].date) - new Date(completed[completed.length-1].date)) / (7*86400000)))
    : 3;
  const nivelAtiv  = sessPerWeek >= 5 ? 'ativo' : sessPerWeek >= 3 ? 'moderado' : sessPerWeek >= 1 ? 'leve' : 'sedentario';
  const tdeeResult = tmbResult ? Calc.tdee(tmbResult.valor, nivelAtiv) : null;
  const metaResult = tdeeResult ? Calc.metaCalorica(tdeeResult.valor, obj) : null;
  const macrosRes  = metaResult && lastComp?.peso ? Calc.macros(metaResult.kcal, lastComp.peso, obj) : null;

  // Student-friendly dossier text
  let parecerAluno = '';
  if (pseNum > 8) parecerAluno += 'AtenÃ§Ã£o: Seus treinos estÃ£o muito intensos! Vamos reduzir um pouco o ritmo para seu corpo se recuperar melhor. ';
  else if (pseNum > 6) parecerAluno += 'VocÃª estÃ¡ treinando no nÃ­vel ideal! Continue assim, seu corpo estÃ¡ respondendo muito bem. ';
  else parecerAluno += 'VocÃª ainda tem bastante fÃ´lego! Podemos aumentar a intensidade gradualmente. ';
  if (sleepNum < 3) parecerAluno += 'Seu sono estÃ¡ abaixo do ideal â€” tente dormir entre 7 e 9 horas para otimizar seus resultados. ';
  else if (sleepNum >= 3.5) parecerAluno += 'Ã“timo sono! Isso ajuda muito na recuperaÃ§Ã£o e nos ganhos. ';
  if (completed.length > 0) parecerAluno += `ParabÃ©ns! VocÃª completou ${completed.length} sessÃ£o(Ãµes) no perÃ­odo. `;
  if (totalLoad > 2000) parecerAluno += 'Sua carga acumulada estÃ¡ alta â€” estamos monitorando para evitar excesso.';
  else parecerAluno += 'Sua carga estÃ¡ dentro do esperado. Tudo sob controle!';

  // Professor technical analysis
  let parecerTecnico = '';
  if (pseNum > 8) parecerTecnico += 'PSE mÃ©dia elevada (>8), indicando possÃ­vel fadiga acumulada. Recomenda-se reduzir volume em 20-30%. ';
  else if (pseNum > 6) parecerTecnico += 'PSE em nÃ­vel adequado para progressÃ£o. Aluno responde bem ao estÃ­mulo. ';
  else parecerTecnico += 'PSE baixa, margem para aumento progressivo de intensidade. ';
  if (sleepNum < 3) parecerTecnico += 'Sono comprometido â€” orientar higiene do sono. ';
  if (totalLoad > 2000) parecerTecnico += 'Carga acumulada significativa. Monitorar sinais de overreaching.';

  // â”€â”€ EvoluÃ§Ã£o de carga por exercÃ­cio (baseado nas sessÃµes) â”€â”€
  const loadProgression = {};
  completed
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(s => {
      (s.setLog || []).forEach(set => {
        const exName = set.exerciseName;
        if (!exName || !set.load || set.load <= 0) return;
        if (!loadProgression[exName]) loadProgression[exName] = [];
        loadProgression[exName].push({
          date: s.date,
          load: set.load,
          reps: set.reps || 0,
          vol:  set.load * (set.reps || 1),
        });
      });
    });

  // Top exercÃ­cios com maior progressÃ£o de carga
  const progressionItems = Object.entries(loadProgression)
    .filter(([, sets]) => sets.length >= 2)
    .map(([name, sets]) => {
      const first     = sets[0];
      const last      = sets[sets.length - 1];
      const maxLoad   = Math.max(...sets.map(s => s.load));
      const minLoad   = Math.min(...sets.map(s => s.load));
      const delta     = last.load - first.load;
      const pct       = first.load > 0 ? Math.round((delta / first.load) * 100) : 0;
      const totalVol  = sets.reduce((t, s) => t + s.vol, 0);
      const avgReps   = Math.round(sets.reduce((t, s) => t + s.reps, 0) / sets.length);
      return { name, first, last, maxLoad, minLoad, delta, pct, totalVol, avgReps, sessions: sets.length };
    })
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 8);

  // Stats gerais de carga
  const totalVolAllSessions = completed.reduce((t, s) => t + Math.round(s.totalVolume || 0), 0);
  const avgVolPerSession    = completed.length ? Math.round(totalVolAllSessions / completed.length) : 0;
  const maxVolSession       = completed.length ? Math.max(...completed.map(s => Math.round(s.totalVolume || 0))) : 0;
  const avgDuration         = completed.length ? Math.round(completed.reduce((t, s) => t + (s.durationMin || 0), 0) / completed.length) : 0;

  const workoutSummary = ''; // mantido por compatibilidade

  // Group workouts by base name for comparative chart (trainer side)
  const getBaseWorkoutName = name => {
    if (!name) return 'Treino Avulso';
    return name
      .replace(/\s*[\-â€”â€“]\s*Semana\s*\d+/i, '')
      .replace(/\s*[\-â€”â€“]\s*Sem\s*\d+/i, '')
      .replace(/\s*Semana\s*\d+/i, '')
      .replace(/\s*Sem\s*\d+/i, '')
      .replace(/\s*[\-â€”â€“]\s*$/g, '')
      .trim();
  };

  const workoutsByName = {};
  completed.forEach(s => {
    if (!s.workoutName) return;
    const base = getBaseWorkoutName(s.workoutName);
    if (!workoutsByName[base]) workoutsByName[base] = [];
    workoutsByName[base].push(s);
  });
  const comparableBases = Object.keys(workoutsByName).filter(base => base !== 'Treino Avulso' && workoutsByName[base].length >= 2);

  let compareSessionsHtml = '';
  if (comparableBases.length > 0) {
    compareSessionsHtml = `
    <div class="card mb-lg">
      <div class="card-header">
        <span class="card-title">Comparativo de SessÃµes IdÃªnticas</span>
      </div>
      <p class="text-xs text-muted mb-md">ComparaÃ§Ã£o cronolÃ³gica do Volume total levantado e da PercepÃ§Ã£o de EsforÃ§o (PSE) para o mesmo protocolo ao longo das semanas, demonstrando a sobrecarga progressiva e a eficiÃªncia neuromuscular.</p>
      <div class="form-group" style="max-width:300px">
        <select id="compareWorkoutSel" class="form-select" style="margin-bottom:12px;padding:8px;font-size:0.85rem">
          ${comparableBases.map((base, idx) => `<option value="${base}" ${idx===0?'selected':''}>${base}</option>`).join('')}
        </select>
      </div>
      <div style="height:350px;position:relative">
        <canvas id="compareWorkoutChart"></canvas>
      </div>
    </div>`;
  }

  return `
    <div id="pdfArea">
    <div class="flex items-center gap-lg mb-lg">
      <div class="avatar avatar-lg" style="width:60px;height:60px;font-size:1.5rem">${student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
      <div>
        <h2 style="margin:0">${student.name}</h2>
        <div class="text-muted">${student.code} Â· ${student.goal || '-'} Â· ${student.age || '-'} anos</div>
        <div class="text-xs text-muted mt-xs">Ciclo: <strong style="color:var(--primary)">${cycleLabel}</strong></div>
      </div>
    </div>

    <!-- Stats principais -->
    <div class="stats-grid mb-lg" style="grid-template-columns:repeat(5,1fr)">
      <div class="stat-card">
        <div class="stat-label">SessÃµes</div>
        <div class="stat-value text-gradient">${completed.length}</div>
        <div class="text-xs text-muted" style="margin-top:4px">realizadas</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Volume Total</div>
        <div class="stat-value text-gradient">${(totalVolAllSessions/1000).toFixed(1)}t</div>
        <div class="text-xs text-muted" style="margin-top:4px">${totalVolAllSessions.toLocaleString('pt-BR')} kg</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">PSE MÃ©dia</div>
        <div class="stat-value" style="color:${pseNum > 8 ? 'var(--danger)' : pseNum > 6 ? 'var(--warning)' : 'var(--success)'}">${avgPse}</div>
        <div class="text-xs text-muted" style="margin-top:4px">${pseNum > 8 ? 'Alta â€” atenÃ§Ã£o' : pseNum > 6 ? 'Adequada' : 'Leve'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sono MÃ©dio</div>
        <div class="stat-value" style="color:${sleepNum < 2.5 ? 'var(--danger)' : sleepNum < 3.5 ? 'var(--warning)' : 'var(--success)'}">${avgSleep}</div>
        <div class="text-xs text-muted" style="margin-top:4px">${sleepNum < 2.5 ? 'Insuficiente' : sleepNum < 3.5 ? 'Regular' : 'Bom'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Carga Total</div>
        <div class="stat-value text-gradient">${Math.round(totalLoad)}</div>
        <div class="text-xs text-muted" style="margin-top:4px">PSE Ã— duraÃ§Ã£o</div>
      </div>
    </div>



    <!-- Sub-stats de treino -->
    <div class="stats-grid mb-lg" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card" style="padding:12px;text-align:center">
        <div class="stat-label" style="font-size:0.65rem">MÃ©dia/SessÃ£o</div>
        <div class="stat-value" style="font-size:1.3rem;color:var(--accent)">${avgVolPerSession.toLocaleString('pt-BR')} kg</div>
        <div class="text-xs text-muted" style="margin-top:2px">volume por treino</div>
      </div>
      <div class="stat-card" style="padding:12px;text-align:center">
        <div class="stat-label" style="font-size:0.65rem">Maior Volume</div>
        <div class="stat-value" style="font-size:1.3rem;color:var(--warning)">${maxVolSession.toLocaleString('pt-BR')} kg</div>
        <div class="text-xs text-muted" style="margin-top:2px">em uma sessÃ£o</div>
      </div>
      <div class="stat-card" style="padding:12px;text-align:center">
        <div class="stat-label" style="font-size:0.65rem">DuraÃ§Ã£o MÃ©dia</div>
        <div class="stat-value" style="font-size:1.3rem;color:var(--primary)">${avgDuration} min</div>
        <div class="text-xs text-muted" style="margin-top:2px">por sessÃ£o</div>
      </div>
    </div>

    ${tmbResult && tdeeResult && metaResult ? `
    <!-- Gasto EnergÃ©tico e Macros -->
    <div class="card mb-lg" style="border-left:3px solid var(--primary)">
      <div class="card-header">
        <span class="card-title">Gasto EnergÃ©tico Estimado</span>
        <span class="text-xs text-muted">${tmbResult.formula} Â· Base: ${lastComp ? Calc.formatDate(lastComp.date) : 'â€”'}</span>
      </div>
      <div class="stats-grid mb-sm" style="grid-template-columns:repeat(3,1fr);gap:8px">
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">TMB</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--text-secondary)">${tmbResult.valor} <span style="font-size:0.72rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">Basal Â· ${tmbResult.formula}</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">TDEE</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--primary)">${tdeeResult.valor} <span style="font-size:0.72rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">Ã—${tdeeResult.fator} Â· ~${Math.round(sessPerWeek*10)/10}Ã—/sem</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">Meta (${student?.goal||'ManutenÃ§Ã£o'})</div>
          <div style="font-size:1.3rem;font-weight:800;color:${obj.includes('emagr')?'var(--warning)':obj.includes('hipert')?'var(--success)':'var(--accent)'}">${metaResult.kcal} <span style="font-size:0.72rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">${metaResult.label}</div>
        </div>
      </div>
      ${macrosRes ? `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[['ProteÃ­na',macrosRes.proteina,'#10b981'],['Carboidrato',macrosRes.carboidrato,'#f59e0b'],['Gordura',macrosRes.gordura,'#8b5cf6']].map(([n,m,c])=>`
          <div style="padding:10px 12px;background:var(--bg-page);border-radius:8px;border-left:3px solid ${c}">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">${n}</div>
            <div style="font-size:1.3rem;font-weight:700;color:${c}">${m.g}g</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${m.kcal}kcal Â· ${m.pct}%</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:8px;font-size:0.72rem;color:var(--text-muted)">
        ProteÃ­na: <strong>${macrosRes.protPorKg}g/kg</strong> Â· ISSN Position Stand (Stokes et al. 2018) Â· Peso: ${lastComp.peso}kg${lastComp.massaMagra?` Â· Massa magra: ${Calc.formatNum(lastComp.massaMagra)}kg`:''}
      </div>` : ''}
    </div>` : ''}

    <div class="card mb-lg" style="border-left:3px solid var(--primary);background:rgba(16,185,129,0.03)">
      <div class="card-header"><span class="card-title">Resumo para o Aluno</span></div>
      <p class="text-xs text-muted" style="margin-bottom:8px">AnÃ¡lise em linguagem acessÃ­vel.</p>
      <p class="text-sm" style="line-height:1.8">${parecerAluno}</p>
    </div>

    <div class="card mb-lg" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title">AnÃ¡lise TÃ©cnica do Treinador</span></div>
      <p class="text-xs text-muted" style="margin-bottom:8px">Baseada nos indicadores de carga e bem-estar.</p>
      <p class="text-sm" style="line-height:1.7">${parecerTecnico}</p>
    </div>

    <!-- ProgressÃ£o de carga por exercÃ­cio -->
    ${progressionItems.length ? `
    <div class="card mb-lg">
      <div class="card-header">
        <span class="card-title">ProgressÃ£o de Carga por ExercÃ­cio</span>
        <span class="text-xs text-muted">${progressionItems.length} exercÃ­cios com dados suficientes</span>
      </div>
      <p class="text-xs text-muted mb-md">EvoluÃ§Ã£o da carga utilizada ao longo das sessÃµes registradas. Verde = progresso, vermelho = regressÃ£o.</p>
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>ExercÃ­cio</th>
            <th style="text-align:center">1Âª Carga</th>
            <th style="text-align:center">Ãšltima Carga</th>
            <th style="text-align:center" class="hide-mobile">MÃ¡ximo</th>
            <th style="text-align:center">Î” Carga</th>
            <th style="text-align:center">EvoluÃ§Ã£o</th>
            <th style="text-align:center" class="hide-mobile">Vol. Total</th>
            <th style="text-align:center" class="hide-mobile">SÃ©ries</th>
          </tr></thead>
          <tbody>
            ${progressionItems.map(p => {
              const deltaColor = p.delta > 0 ? 'var(--success)' : p.delta < 0 ? 'var(--danger)' : 'var(--text-muted)';
              const arrow      = p.delta > 0 ? 'â†‘' : p.delta < 0 ? 'â†“' : '=';
              const barWidth   = Math.min(100, Math.abs(p.pct));
              return `<tr>
                <td><strong style="font-size:0.85rem">${p.name}</strong></td>
                <td style="text-align:center;color:var(--text-muted)">${p.first.load}kg</td>
                <td style="text-align:center;font-weight:600">${p.last.load}kg</td>
                <td style="text-align:center;color:var(--warning);font-weight:600" class="hide-mobile">${p.maxLoad}kg</td>
                <td style="text-align:center;color:${deltaColor};font-weight:700">
                  ${p.delta > 0 ? '+' : ''}${p.delta}kg
                </td>
                <td style="text-align:center;min-width:100px">
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                    <div style="width:60px;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden">
                      <div style="height:100%;width:${barWidth}%;background:${deltaColor};border-radius:3px"></div>
                    </div>
                    <span style="color:${deltaColor};font-weight:700;font-size:0.8rem">${arrow} ${Math.abs(p.pct)}%</span>
                  </div>
                </td>
                <td style="text-align:center;font-size:0.82rem" class="hide-mobile">${(p.totalVol/1000).toFixed(1)}t</td>
                <td style="text-align:center;color:var(--text-muted);font-size:0.82rem" class="hide-mobile">${p.sessions}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-sm" style="height:200px;position:relative">
        <canvas id="loadProgressChart"></canvas>
      </div>
    </div>` : `
    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">ProgressÃ£o de Carga</span></div>
      <p class="text-muted text-sm" style="padding:16px 0">Sem sessÃµes registradas com setLog suficiente para anÃ¡lise de progressÃ£o. Registre sessÃµes via Treino ao Vivo para ver a evoluÃ§Ã£o.</p>
    </div>`}

    ${compareSessionsHtml}

    <div class="card mb-lg" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title">PeriodizaÃ§Ã£o Atual</span></div>
      <p class="text-xs text-muted mb-sm">Macrociclo ativo com distribuiÃ§Ã£o de volume e intensidade.</p>
      <div id="reportPeriodization"></div>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">EvoluÃ§Ã£o do Bem-estar</span></div>
      <p class="text-xs text-muted mb-sm">Acompanhamento dos indicadores de Sono, RecuperaÃ§Ã£o Geral (TQR) e NÃ­vel de Estresse ao longo do tempo. Valores mais altos de Sono e TQR indicam melhor capacidade adaptativa e recuperaÃ§Ã£o. Valores baixos de Estresse sÃ£o ideais para o anabolismo e prevenÃ§Ã£o de fadiga crÃ´nica.</p>
      <div style="height:360px;position:relative"><canvas id="wellnessChart"></canvas></div>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Carga de Treino Semanal</span></div>
      <p class="text-xs text-muted mb-sm">Carga total semanal calculada como o produto da PercepÃ§Ã£o Subjetiva de EsforÃ§o (PSE) pela DuraÃ§Ã£o da sessÃ£o (minutos). Acompanhe a modulaÃ§Ã£o de carga para evitar aumentos abruptos (superiores a 10% entre semanas) e gerenciar a fadiga.</p>
      <div style="height:360px;position:relative"><canvas id="loadChart"></canvas></div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card">
        <div class="card-header"><span class="card-title">PercepÃ§Ã£o Subjetiva de EsforÃ§o (PSE)</span></div>
        <p class="text-xs text-muted mb-sm">EsforÃ§o relatado pelo aluno apÃ³s cada sessÃ£o (escala Borg modificada de 1 a 10). MÃ©dia consistente acima de 8 indica sessÃµes de alta intensidade com necessidade de atenÃ§Ã£o Ã  recuperaÃ§Ã£o.</p>
        <div style="height:300px;position:relative"><canvas id="pseChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Radar de ProntidÃ£o</span></div>
        <p class="text-xs text-muted mb-sm">Snapshot mÃ©dio das Ãºltimas 5 avaliaÃ§Ãµes subjetivas de bem-estar. Uma Ã¡rea de preenchimento maior representa um melhor estado de prontidÃ£o fÃ­sica e mental.</p>
        <div style="height:300px;position:relative"><canvas id="radarChart"></canvas></div>
      </div>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">ComparaÃ§Ã£o entre Ciclos</span></div>
      <p class="text-xs text-muted mb-sm">Comparativo da mÃ©dia dos indicadores entre a primeira metade e a segunda metade do perÃ­odo selecionado, avaliando quantitativamente a evoluÃ§Ã£o do sono, da recuperaÃ§Ã£o, da intensidade e do estresse.</p>
      <div style="height:360px;position:relative"><canvas id="cycleDiffChart"></canvas></div>
    </div>

    ${assessments.filter(a => a.type === 'composicao').length ? `
    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">EvoluÃ§Ã£o de Medidas Corporais</span></div>
      <p class="text-xs text-muted mb-sm">Curva evolutiva do peso corporal e percentual de gordura ao longo das avaliaÃ§Ãµes fÃ­sicas consecutivas.</p>
      <div style="height:360px;position:relative"><canvas id="measuresChart"></canvas></div>
    </div>` : ''}

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Gasto CalÃ³rico Estimado</span></div>
      <p class="text-xs text-muted mb-sm">Estimativa de gasto energÃ©tico por sessÃ£o com base no MET do treinamento de forÃ§a e no peso corporal registrado.</p>
      <div style="height:360px;position:relative"><canvas id="kcalChart"></canvas></div>
    </div>
    
    <div class="card mb-lg" id="densityChart_card">
      <div class="card-header"><span class="card-title">Densidade de Treino (kg/min)</span></div>
      <p class="text-xs text-muted mb-sm">Quantidade de carga total movimentada dividida pelo tempo da sessÃ£o, indicando a eficiÃªncia de trabalho por minuto.</p>
      <div style="height:360px;position:relative"><canvas id="densityChart"></canvas></div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card">
        <div class="card-header"><span class="card-title">FrequÃªncia Semanal</span></div>
        <p class="text-xs text-muted mb-sm">Quantidade de sessÃµes realizadas por semana ao longo das Ãºltimas 8 semanas. A consistÃªncia de treino Ã© o fator crÃ­tico para o sucesso fisiolÃ³gico de longo prazo.</p>
        <div style="height:280px;position:relative"><canvas id="freqChart"></canvas></div>
      </div>
      <div class="card"><div class="card-header"><span class="card-title">Alertas Recentes</span></div>
        <p class="text-xs text-muted mb-sm">Resumo dos Ãºltimos check-ins de biofeedback com classificaÃ§Ã£o automÃ¡tica e recomendaÃ§Ãµes.</p>
        ${recent10.length ? recent10.slice(-5).reverse().map(e => {
    const alerts = analyzeBiofeedback(e);
    const status = overallStatus(e);
    const rec = trainingRecommendation(e);
    return `<div class="event-card" style="border-left:3px solid var(--${status.color})">
            <div class="flex items-center justify-between"><span>${status.icon} ${Calc.formatDate(e.date)}</span><span class="badge badge-${status.color}">${status.label}</span></div>
            ${alerts.length ? `<div class="text-sm mt-xs">${alerts.map(a => {
      const valText = a.metric === 'Sono' ? `${Math.round(a.value / 2)}/5` :
        a.metric === 'Dor' ? `${a.value > 8 ? 5 : a.value > 6 ? 4 : a.value > 4 ? 3 : a.value > 2 ? 2 : 1}/5` :
        a.metric === 'ACWR' || a.metric === 'Ciclo Menstrual' || a.metric === 'Dor Localizada' ? `${a.value}` :
        `${a.value}/10`;
      return `${a.icon} ${a.metric}: ${valText}`;
    }).join(' Â· ')}</div>` : ''}
            <div class="text-xs text-muted mt-xs">${rec.label}</div>
          </div>`;
  }).join('') : '<p class="text-muted text-center" style="padding:20px">Sem dados</p>'}
      </div>
    </div>
    </div>
  `;
}

export async function initReports(navigateFn) {
  const pdfBtn = document.getElementById('exportPdfBtn');
  const cycleSel = document.getElementById('reportCycle');

  document.getElementById('reportStudent')?.addEventListener('change', async (e) => {
    const sid = e.target.value;
    sessionStorage.setItem('pp_reports_student_filter', sid);
    sessionStorage.removeItem('pp_reports_cycle_filter');
    const content = document.getElementById('reportContent');
    const pdfFormatSel = document.getElementById('pdfFormatSel');
    if (pdfBtn) pdfBtn.style.display = sid ? '' : 'none';
    if (pdfFormatSel) pdfFormatSel.style.display = sid ? 'inline-block' : 'none';
    if (cycleSel) cycleSel.style.display = sid ? '' : 'none';
    const waBtn = document.getElementById('exportWaBtn');
    if (waBtn) waBtn.style.display = sid ? '' : 'none';
    const annContainer = document.getElementById('pdfAnnotationsContainer');
    if (annContainer) annContainer.style.display = sid ? 'block' : 'none';

    if (!sid) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">â€”</div><h3>Selecione um aluno</h3></div>';
      return;
    }

    // Populate cycles
    const cycles = await getStudentCycles(sid);
    if (cycleSel) {
      cycleSel.innerHTML = '<option value="">Todos os macrociclos</option>' + cycles.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    content.innerHTML = await renderStudentReport(sid);
    initReportCharts(sid, '');
    loadPeriodizationForReport(sid);
  });

  // Cycle filter change
  cycleSel?.addEventListener('change', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    sessionStorage.setItem('pp_reports_cycle_filter', cycleSel.value);
    const content = document.getElementById('reportContent');
    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    content.innerHTML = await renderStudentReport(sid, cycleSel.value);
    initReportCharts(sid, cycleSel.value);
  });

  // Restore student and cycle filters on load
  const storedStudent = sessionStorage.getItem('pp_reports_student_filter') || '';
  const storedCycle = sessionStorage.getItem('pp_reports_cycle_filter') || '';

  if (storedStudent) {
    const studentSel = document.getElementById('reportStudent');
    if (studentSel) {
      studentSel.value = storedStudent;

      const content = document.getElementById('reportContent');
      const pdfFormatSel = document.getElementById('pdfFormatSel');
      if (pdfBtn) pdfBtn.style.display = '';
      if (pdfFormatSel) pdfFormatSel.style.display = 'inline-block';
      if (cycleSel) cycleSel.style.display = '';
      const waBtn = document.getElementById('exportWaBtn');
      if (waBtn) waBtn.style.display = '';
      const annContainer = document.getElementById('pdfAnnotationsContainer');
      if (annContainer) annContainer.style.display = 'block';

      // Populate cycles and restore cycle selection
      const cycles = await getStudentCycles(storedStudent);
      if (cycleSel) {
        cycleSel.innerHTML = '<option value="">Todos os macrociclos</option>' + cycles.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (storedCycle && cycles.some(c => c.id === storedCycle)) {
          cycleSel.value = storedCycle;
        }
      }

      content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
      const activeCycle = cycleSel?.value || '';
      content.innerHTML = await renderStudentReport(storedStudent, activeCycle);
      initReportCharts(storedStudent, activeCycle);
      loadPeriodizationForReport(storedStudent);
    }
  }

  // WhatsApp â€” enviar resumo ao aluno
  document.getElementById('exportWaBtn')?.addEventListener('click', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    const student  = await db.get('students', sid);
    if (!student?.phone) { notify.warning('Aluno sem telefone cadastrado'); return; }
    const sessions = (await db.getAll('sessions')).filter(s => s.studentId === sid && s.status === 'completed');
    const bf       = (await db.getAll('biofeedback')).filter(b => b.studentId === sid);
    const recent10 = bf.slice(-10);
    const avgPse   = recent10.length ? (recent10.reduce((t,b)=>t+(b.pse||0),0)/recent10.length).toFixed(1) : '-';
    const avgSleep = recent10.length ? ((recent10.reduce((t,b)=>t+(b.sleep||0),0)/recent10.length)/2).toFixed(1) : '-';
    const avgTqr   = recent10.length ? (recent10.reduce((s,b)=>s+(b.tqr||b.energy||0),0)/recent10.length).toFixed(1) : '-';
    const avgTqrR  = avgTqr;
    const totalVol = sessions.reduce((t,s)=>t+(s.totalVolume||0),0);
    const cycleLabel = cycleSel?.value || 'Geral';
    const msg = [
      `ðŸš€ *Seu RelatÃ³rio de Performance - Vetor*`,
      ``,
      `ðŸ‘¤ Aluno: *${student.name}*`,
      `ðŸ“… Ciclo: ${cycleLabel}`,
      ``,
      `ðŸ‹ *Treinos*`,
      `â€¢ SessÃµes realizadas: ${sessions.length}`,
      `â€¢ Volume total acumulado: ${totalVol}kg`,
      ``,
      `ðŸ“ˆ *Indicadores (Ãºltimos ${recent10.length} check-ins)*`,
      `â€¢ Sono mÃ©dio: ${avgSleep}/5`,
      `â€¢ TQR mÃ©dio: ${avgTqr||avgTqrR||'-'}/10`,
      `â€¢ PSE mÃ©dio: ${avgPse}/10`,
      ``,
      `âœ… Continue assim! Resultados consistentes vÃªm da consistÃªncia nos treinos e no descanso.`,
      ``,
      `_RelatÃ³rio gerado pelo Vetor_`,
    ].join('\n');
    const phone = student.phone.replace(/\D/g,'');
    window.open(`https://wa.me/${phone.startsWith('55')?phone:'55'+phone}?text=${encodeURIComponent(msg)}`, '_blank');
  });

  // PDF Export
  pdfBtn?.addEventListener('click', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    
    const newWin = window.open('', '_blank');
    if (!newWin) {
      notify.error('Pop-up bloqueado. Permita a abertura de novas guias no seu navegador.');
      return;
    }
    
    newWin.document.write('<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Gerando relatÃ³rio...</h2></body></html>');
    
    const student = await db.get('students', sid);
    if (!student) { newWin.close(); return; }
    const cycleFilter = cycleSel?.value || '';
    const settings    = await db.get('settings', 'trainer') || {};
    const trainerName = settings?.trainerName || 'Vetor';

    const pdfArea = document.getElementById('pdfArea');
    if (!pdfArea) { newWin.close(); notify.error('Carregue o relatÃ³rio primeiro'); return; }

    // â”€â”€ Dados â”€â”€
    const allWorkouts = (await db.getAll('workouts')).filter(w => w.studentId === sid);
    const workouts    = cycleFilter ? allWorkouts.filter(w => String(w.macrocycleId) === String(cycleFilter) || String(w.cycle) === String(cycleFilter)) : allWorkouts;
    const workoutIds  = new Set(workouts.map(w => String(w.id)));

    const allBiofeedback = await db.getAll('biofeedback');
    const allSessionsRaw = (await db.getAll('sessions')).filter(s => s.studentId === sid);
    const allSessions = allSessionsRaw.map(s => {
      const durationMin = s.durationMin || (s.totalDuration ? Math.round(s.totalDuration / 60) : 0);
      const exercises = s.exercises || [];
      const setLog = (s.setLog || []).map(set => ({
        ...set,
        exerciseName: set.exerciseName || (exercises[set.exIdx]?.name) || (set.exerciseIdx != null ? exercises[set.exerciseIdx]?.name : null) || null,
        load: parseFloat(set.load) || 0,
        reps: parseFloat(set.reps) || 0,
      }));
      const totalVol = s.totalVolume || setLog.reduce((t,x)=>t+(x.load||0)*(x.reps||0),0);

      // Enrich with biofeedback
      const dateStr = (s.date || '').substring(0, 10);
      const bfId = `bf_${s.studentId}_${dateStr}`;
      const bfObj = allBiofeedback.find(b => b.id === bfId || (b.studentId === s.studentId && (b.date || '').startsWith(dateStr)));
      
      let postBiofeedback = s.postBiofeedback || null;
      let trainingLoad = s.trainingLoad || null;
      if (bfObj) {
        postBiofeedback = {
          ...(s.postBiofeedback || {}),
          pse: bfObj.pse || s.postBiofeedback?.pse,
          trainingLoad: bfObj.trainingLoad || s.postBiofeedback?.trainingLoad,
          tqrPost: bfObj.tqrPost || s.postBiofeedback?.tqrPost,
          feeling: bfObj.feeling || s.postBiofeedback?.feeling,
          notes: bfObj.postNotes || bfObj.notes || s.postBiofeedback?.notes,
          submittedByStudent: bfObj.submittedByStudent || s.postBiofeedback?.submittedByStudent,
        };
        trainingLoad = bfObj.trainingLoad || s.trainingLoad;
      }

      return { ...s, durationMin, setLog, totalVolume: totalVol, postBiofeedback, trainingLoad };
    });

    const sessions    = cycleFilter ? allSessions.filter(s => s.status === 'completed' && workoutIds.has(String(s.workoutId))) : allSessions.filter(s => s.status === 'completed');
    const bf          = cycleFilter ? allBiofeedback.filter(b => b.studentId === sid && sessions.some(s => new Date(s.date).toDateString() === new Date(b.date).toDateString())) : allBiofeedback.filter(b => b.studentId === sid);
    const assessments = (await db.getAll('assessments')).filter(a => a.studentId === sid);

    // â”€â”€ Stats â”€â”€
    const recent10  = bf.slice(-10);
    const avgPse    = recent10.length ? (recent10.reduce((t,b)=>t+(b.pse||0),0)/recent10.length).toFixed(1) : '-';
    const avgSleep  = recent10.length ? ((recent10.reduce((t,b)=>t+(b.sleep||0),0)/recent10.length)/2).toFixed(1) : '-';
    const avgDisp   = recent10.length ? (recent10.reduce((t,b)=>t+(b.mood||0),0)/recent10.length).toFixed(1) : '-';
    const avgTqr    = recent10.length ? (recent10.reduce((s,b)=>s+(b.tqr||b.energy||0),0)/recent10.length).toFixed(1) : '-';
    const avgTqrR   = avgTqr;
    const totalLoad = bf.reduce((t,b)=>t+(b.trainingLoad||0),0);
    const totalVol  = sessions.reduce((t,s)=>t+Math.round(s.totalVolume||0),0);
    const totalDuration = sessions.reduce((t,s)=>t+(s.totalDuration||0),0);
    const avgDuration = sessions.length ? Math.round((totalDuration / sessions.length) / 60) : 0;

    const loadProgression = {};
    sessions
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(s => {
        (s.setLog || []).forEach(set => {
          const exName = (s.exercises || [])[set.exIdx]?.name;
          if (!exName || !set.load || set.load <= 0) return;
          if (!loadProgression[exName]) loadProgression[exName] = [];
          loadProgression[exName].push({
            date: s.date,
            load: set.load,
            reps: set.reps || 0,
            vol:  set.load * (set.reps || 1),
          });
        });
      });

    const progressionItems = Object.entries(loadProgression)
      .filter(([, sets]) => sets.length >= 2)
      .map(([name, sets]) => {
        const first     = sets[0];
        const last      = sets[sets.length - 1];
        const maxLoad   = Math.max(...sets.map(s => s.load));
        const minLoad   = Math.min(...sets.map(s => s.load));
        const delta     = last.load - first.load;
        const pct       = first.load > 0 ? Math.round((delta / first.load) * 100) : 0;
        const totalVol  = sets.reduce((t, s) => t + s.vol, 0);
        const avgReps   = Math.round(sets.reduce((t, s) => t + s.reps, 0) / sets.length);
        return { name, first, last, maxLoad, minLoad, delta, pct, totalVol, avgReps, sessions: sets.length };
      })
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 8);

    // â”€â”€ Resumo de treinos â€” deduplica por nome+ciclo, mostra sÃ³ Ãºnicas â”€â”€
    const uniqueWorkouts = [];
    const seen = new Set();
    workouts.forEach(w => {
      const key = `${w.cycle||'Geral'}__${w.name}`;
      if (!seen.has(key)) { seen.add(key); uniqueWorkouts.push(w); }
    });

    // Agrupar por ciclo
    const byCycle = {};
    uniqueWorkouts.forEach(w => {
      const c = w.cycle || 'Geral';
      if (!byCycle[c]) byCycle[c] = [];
      byCycle[c].push(w);
    });

    // â”€â”€ Parecer â”€â”€
    const pseNum   = parseFloat(avgPse)||0;
    const sleepNum = parseFloat(avgSleep)||0;
    let parecerAluno = '';
    if (pseNum > 8)      parecerAluno += 'AtenÃ§Ã£o: seus treinos estÃ£o muito intensos. Vamos ajustar o ritmo para garantir boa recuperaÃ§Ã£o. ';
    else if (pseNum > 6) parecerAluno += 'VocÃª estÃ¡ treinando na intensidade ideal! Continue assim. ';
    else                 parecerAluno += 'Boa consistÃªncia! Temos margem para evoluir a intensidade gradualmente. ';
    if (sleepNum > 0 && sleepNum < 3)    parecerAluno += 'O sono estÃ¡ abaixo do ideal â€” priorize 7 a 9 horas para maximizar os resultados. ';
    else if (sleepNum >= 3.5)            parecerAluno += 'Ã“tima qualidade de sono! Isso acelera muito a recuperaÃ§Ã£o e os ganhos. ';
    if (sessions.length > 0)            parecerAluno += `ParabÃ©ns pelas ${sessions.length} sessÃ£o(Ãµes) concluÃ­das! A consistÃªncia Ã© o maior segredo dos resultados. `;
    parecerAluno += totalLoad > 2000 ? 'A carga acumulada estÃ¡ elevada â€” estamos monitorando de perto.' : 'Sua carga de treino estÃ¡ dentro do esperado.';

    let parecerTecnico = '';
    if (pseNum > 8)      parecerTecnico += 'PSE mÃ©dia elevada (>8): possÃ­vel fadiga acumulada. Recomendar reduÃ§Ã£o de volume 20â€“30% ou semana de deload. ';
    else if (pseNum > 6) parecerTecnico += 'PSE em nÃ­vel adequado. ProgressÃ£o viÃ¡vel nas prÃ³ximas semanas. ';
    else                 parecerTecnico += 'PSE baixa â€” espaÃ§o para aumento de carga ou densidade. ';
    if (sleepNum > 0 && sleepNum < 3) parecerTecnico += 'Sono comprometido: orientar higiene do sono. ';
    if (totalLoad > 2000)             parecerTecnico += 'Carga acumulada significativa â€” monitorar sinais de overreaching (queda de performance, irritabilidade, FC elevada em repouso).';

    // â”€â”€ Capturar grÃ¡ficos por ID (nÃ£o por posiÃ§Ã£o) â”€â”€
    const chartIds = [
      { id: 'wellnessChart',  title: 'EvoluÃ§Ã£o do Bem-estar',      desc: 'Sono (roxo), TQR (verde), Estresse (amarelo), Dor (verm.), MotivaÃ§Ã£o (azul), AlimentaÃ§Ã£o (laranja).' },
      { id: 'loadChart',      title: 'Carga de Treino Semanal',     desc: 'Carga semanal = PSE Ã— DuraÃ§Ã£o. Aumentos graduais de ~10%/semana sÃ£o ideais para progressÃ£o sem risco.' },
      { id: 'pseChart',       title: 'PSE por SessÃ£o',              desc: 'PercepÃ§Ã£o Subjetiva de EsforÃ§o (1â€“10). Zona ideal para hipertrofia: 6â€“8. Acima de 8 por 3+ sessÃµes seguidas = atenÃ§Ã£o Ã  fadiga.' },
      { id: 'radarChart',     title: 'Radar de Wellness',           desc: 'MÃ©dia dos Ãºltimos 5 check-ins. Quanto maior a Ã¡rea, melhor o estado geral. Pontas "encolhidas" indicam itens a melhorar.' },
      { id: 'freqChart',      title: 'FrequÃªncia Semanal',          desc: 'SessÃµes realizadas por semana. ConsistÃªncia â‰¥3x/semana Ã© fundamental para resultados duradouros.' },
      { id: 'measuresChart',  title: 'EvoluÃ§Ã£o de Medidas Corporais', desc: 'TendÃªncia de peso e % de gordura ao longo das avaliaÃ§Ãµes fÃ­sicas.' },
      { id: 'kcalChart',      title: 'Gasto CalÃ³rico',              desc: 'Estimativa de calorias gastas por sessÃ£o ao longo do tempo.' },
      { id: 'densityChart',   title: 'Densidade de Treino',         desc: 'RelaÃ§Ã£o entre Volume (kg) e DuraÃ§Ã£o (min) das sessÃµes.' },
      { id: 'cycleDiffChart', title: 'ComparaÃ§Ã£o de PerÃ­odos',      desc: 'ComparaÃ§Ã£o entre a primeira e segunda metade dos dados coletados. Melhoras aparecem como barras verdes maiores.' },
    ];

    let chartsHTML = '';
    chartIds.forEach(({ id, title, desc }) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      try {
        const img = canvas.toDataURL('image/png');
        // Verificar se o canvas tem conteÃºdo real (nÃ£o estÃ¡ em branco)
        if (img === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') return;
        chartsHTML += `
          <div class="chart-block">
            <h3>${title}</h3>
            <p class="chart-desc">${desc}</p>
            <img src="${img}" />
          </div>`;
      } catch(e) { /* canvas vazio ou sem dados */ }
    });

    // â”€â”€ Gerar PDF via Blob URL (evita bloqueio de popup no Brave/Chrome) â”€â”€
    const format = document.getElementById('pdfFormatSel')?.value || 'mobile';
    const isDark = true; // Always dark theme for PDF
    
    // ForÃ§ando tema baseado no formato
    const pdfBg = isDark ? '#0b0f19' : '#ffffff';
    const pdfText = isDark ? '#f1f5f9' : '#111827';
    const pdfSubText = isDark ? '#94a3b8' : '#4b5563';
    const pdfCardBg = isDark ? '#111827' : '#f3f4f6';
    const pdfBorder = isDark ? '#1f2937' : '#e5e7eb';
    const pdfTableEven = isDark ? '#111827' : '#f9fafb';
    const pdfTableTh = isDark ? '#1f2937' : '#e5e7eb';
    
    const pageConfig = format === 'mobile' 
      ? '@page { size: 420px 850px; margin: 0; } body { width: 420px; padding: 24px 20px; } .stats { grid-template-columns: repeat(3, 1fr); gap: 6px; } .charts-grid { grid-template-columns: 1fr; } .hide-mobile { display: none !important; }'
      : '@page { size: A4 portrait; margin: 0; } body { max-width: 800px; padding: 40px; } .stats { grid-template-columns: repeat(6, 1fr); gap: 10px; } .charts-grid { grid-template-columns: 1fr 1fr; }';

      const customAnnotations = document.getElementById('pdfAnnotations')?.value || '';

      const htmlContent = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>DossiÃª â€” ${student.name}</title>
      <style>
        ${pageConfig}
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: ${pdfText}; background-color: ${pdfBg}; margin: 0 auto; font-size: 12px; line-height: 1.5; }

        /* Header */
        .doc-header { border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-bottom: 6px; }
        .doc-header h1 { font-size: 20px; color: #10b981; font-weight: 800; letter-spacing: -0.5px; }
        .doc-subtitle { font-size: 10px; color: ${pdfSubText}; margin-top: 3px; }

        /* Info do aluno */
        .student-block { display: flex; align-items: center; gap: 12px; background: ${pdfCardBg}; border-radius: 8px; padding: 12px; margin: 12px 0; border: 1px solid ${pdfBorder}; }
        .avatar { width: 44px; height: 44px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; flex-shrink: 0; }
        .student-info h2 { font-size: 15px; color: #ffffff; margin-bottom: 2px; }
        .student-info p { font-size: 10px; color: ${pdfSubText}; }
        .cycle-tag { display: inline-block; background: #065f46; color: #d1fae5; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; margin-top: 4px; border: 1px solid #10b981; }

        /* Stats */
        .stats { display: grid; margin: 12px 0; }
        .stat { text-align: center; padding: 10px 6px; border: 1px solid ${pdfBorder}; border-radius: 8px; background: ${pdfCardBg}; }
        .stat-val { font-size: 22px; font-weight: 800; color: #10b981; }
        .stat-lbl { font-size: 9px; color: ${pdfSubText}; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

        /* SecÃ§Ãµes */
        h2 { font-size: 15px; color: #10b981; margin: 20px 0 6px; border-bottom: 1px solid #1f2937; padding-bottom: 5px; font-weight: 700; }
        .section-desc { font-size: 11px; color: ${pdfSubText}; margin: 3px 0 10px; }

        /* Pareceres */
        .parecer { background: #111827; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 8px 0; font-size: 13px; line-height: 1.7; border: 1px solid ${pdfBorder}; border-left-width: 4px; }
        .tecnico { background: #1e293b; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 8px 0; font-size: 12px; line-height: 1.6; color: #60a5fa; border: 1px solid #334155; border-left-width: 4px; }

        /* Tabelas */
        table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; font-size: 12px; }
        th { background: ${pdfTableTh}; padding: 7px 10px; text-align: left; font-weight: 700; border-bottom: 2px solid ${pdfBorder}; font-size: 10px; text-transform: uppercase; color: ${pdfSubText}; }
        td { padding: 7px 10px; border-bottom: 1px solid ${pdfBorder}; color: ${pdfText}; vertical-align: top; }
        tr:nth-child(even) td { background: ${pdfTableEven}; }
        .tag-badge { display: inline-block; background: #d1fae5; color: #065f46; border-radius: 10px; padding: 1px 8px; font-size: 10px; font-weight: 600; }

        /* Treinos por ciclo */
        .cycle-section { margin-bottom: 12px; }
        .cycle-title { font-size: 13px; font-weight: 700; color: ${pdfText}; border-bottom: 1px solid ${pdfBorder}; padding-bottom: 4px; margin-bottom: 6px; }
        .cycle-count { font-weight: 400; color: ${pdfSubText}; font-size: 11px; }

        /* GrÃ¡ficos */
        .chart-block { margin: 16px 0; page-break-inside: avoid; }
        .chart-block h3 { font-size: 13px; color: #10b981; margin-bottom: 2px; font-weight: 700; }
        .chart-block .chart-desc { font-size: 10px; color: ${pdfSubText}; margin: 0 0 7px; line-height: 1.4; }
        .chart-block img { max-width: 100%; height: auto; border: 1px solid ${pdfBorder}; border-radius: 6px; }
        .charts-grid { display: grid; gap: 14px; }
        .chart-full { grid-column: 1 / -1; }

        /* Footer */
        .footer { text-align: center; font-size: 10px; color: ${pdfSubText}; margin-top: 32px; border-top: 1px solid ${pdfBorder}; padding-top: 10px; }

        /* Nota de rodapÃ© */
        .footnote { font-size: 10px; color: ${pdfSubText}; font-style: italic; margin-top: 6px; }

        @media print {
          body { padding: 14px 18px; }
          .stats { gap: 5px; }
          .stat-val { font-size: 18px; }
        }
      </style>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 600); }<\/script>
    </head><body>

      <div class="doc-header">
        <h1>Vetor - DossiÃª de Performance</h1>
        <p class="doc-subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} por ${trainerName}</p>
      </div>

      <div class="student-block">
        <div class="avatar">${student.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
        <div class="student-info">
          <h2>${student.name}</h2>
          <p>${student.code || ''} Â· Objetivo: ${student.goal || '-'} Â· ${student.age || (student.birthDate ? new Date().getFullYear() - new Date(student.birthDate).getFullYear() : '-')} anos</p>
          <span class="cycle-tag">${cycleFilter || 'Todos os Ciclos'}</span>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-val">${uniqueWorkouts.length}</div><div class="stat-lbl">Treinos Prescritos</div></div>
        <div class="stat"><div class="stat-val">${sessions.length}</div><div class="stat-lbl">SessÃµes Realizadas</div></div>
        <div class="stat"><div class="stat-val" style="color:${pseNum>8?'#ef4444':pseNum>6?'#f59e0b':'#10b981'}">${avgPse}</div><div class="stat-lbl">PSE MÃ©dia</div></div>
        <div class="stat"><div class="stat-val" style="color:${sleepNum>0&&sleepNum<3?'#ef4444':sleepNum>=3.5?'#10b981':'#f59e0b'}">${avgSleep}</div><div class="stat-lbl">Sono MÃ©dio</div></div>
        <div class="stat"><div class="stat-val" style="color:${parseFloat(avgTqr||0)<5?'#ef4444':parseFloat(avgTqr||0)<7?'#f59e0b':'#10b981'}">${avgTqr||'-'}</div><div class="stat-lbl">TQR MÃ©dio</div></div>
        <div class="stat"><div class="stat-val">${Math.round(totalLoad)}</div><div class="stat-lbl">Carga Total</div></div>
      </div>

      <h2>Resumo para o Aluno</h2>
      <p class="section-desc">AnÃ¡lise em linguagem acessÃ­vel sobre seu progresso.</p>
      <div class="parecer">${parecerAluno}</div>

      <h2>AnÃ¡lise TÃ©cnica</h2>
      <p class="section-desc">AvaliaÃ§Ã£o baseada nos indicadores de carga e bem-estar coletados.</p>
      <div class="tecnico">${parecerTecnico}</div>

      ${customAnnotations ? `
      <h2>AnotaÃ§Ãµes do Treinador</h2>
      <p class="section-desc">ObservaÃ§Ãµes e orientaÃ§Ãµes personalizadas adicionadas neste relatÃ³rio.</p>
      <div class="tecnico" style="border-left-color: #f59e0b;">${customAnnotations.replace(/\n/g, '<br>')}</div>
      ` : ''}

      ${sessions.length ? `
      <h2>SessÃµes Realizadas</h2>
      <p class="section-desc">${sessions.length} sessÃ£o(Ãµes) Â· Volume total: ${totalVol.toLocaleString('pt-BR')} kg Â· MÃ©dia/sessÃ£o: ${sessions.length ? Math.round(totalVol / sessions.length).toLocaleString('pt-BR') : 0} kg Â· DuraÃ§Ã£o mÃ©dia: ${avgDuration}min</p>
      <div style="overflow-x: auto; width: 100%;">
        <table style="min-width: ${format === 'mobile' ? 'auto' : '650px'}; table-layout: auto;">
          <thead><tr>
            <th>Data</th><th>Treino</th><th>Dur.</th><th>Volume</th><th class="hide-mobile">SÃ©ries</th>
            <th>PSE</th><th class="hide-mobile">TQR pÃ³s</th><th class="hide-mobile">RIR mÃ©d.</th><th class="hide-mobile">Kcal est.</th><th class="hide-mobile">Densidade</th>
          </tr></thead>
          <tbody>
            ${sessions.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20).map(se=>{
              const durMin  = se.totalDuration ? Math.round(se.totalDuration/60) : 0;
              const vol     = se.totalVolume ? Math.round(se.totalVolume) : 0;
              const pse     = se.postBiofeedback?.pse || '-';
              const tqrPost = se.postBiofeedback?.tqrPost || '-';
              // RIR mÃ©dio das sÃ©ries
              const setLog  = se.setLog || [];
              const rirSets = setLog.filter(s => s.rir != null);
              const avgRir  = rirSets.length ? Math.round(rirSets.reduce((t,s)=>t+(s.rir||0),0)/rirSets.length*10)/10 : '-';
              // Calorias estimadas (MET musculaÃ§Ã£o Ã— peso)
              const peso    = se.studentWeight || (se.preBiofeedback?.peso) || null;
              const kcalEst = peso && durMin ? Calc.caloriasAtividade(peso, durMin, 'musculacao') : '-';
              // Densidade de treino (volume / minutos)
              const dens    = vol && durMin ? Math.round(vol / durMin) : '-';
              const pseColor = typeof pse==='number' ? (pse>=9?'#ef4444':pse>=7?'#f59e0b':'#10b981') : '#888';
              
              const exSummary = [];
              (se.exercises || []).forEach((ex, idx) => {
                const setsForEx = setLog.filter(s => s.exIdx === idx);
                if (setsForEx.length) {
                  const maxLoad = Math.max(...setsForEx.map(s => s.load || 0));
                  exSummary.push(`${ex.name} (${setsForEx.length}x mÃ¡x ${maxLoad}kg)`);
                }
              });
              const summaryStr = exSummary.join(' â€¢ ');

              return `<tr>
                <td>${(se.date.includes('T') ? new Date(se.date) : new Date(se.date + 'T12:00')).toLocaleDateString('pt-BR')}</td>
                <td><strong>${se.workoutName||'-'}</strong></td>
                <td>${durMin?durMin+'min':'-'}</td>
                <td>${vol?vol+' kg':'-'}</td>
                <td class="hide-mobile">${se.totalSets||'-'}</td>
                <td style="color:${pseColor};font-weight:600">${pse}</td>
                <td class="hide-mobile">${tqrPost}/10</td>
                <td class="hide-mobile">${avgRir}</td>
                <td class="hide-mobile">${kcalEst!=='-'?kcalEst+'kcal':'-'}</td>
                <td class="hide-mobile" style="font-size:10px;color:#888">${dens!=='-'?dens+' kg/min':'-'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${progressionItems.length ? `
      <h2>ProgressÃ£o de Carga por ExercÃ­cio</h2>
      <p class="section-desc">EvoluÃ§Ã£o da carga registrada ao longo das sessÃµes. A sobrecarga progressiva Ã© o principal motor do ganho de forÃ§a e hipertrofia.</p>
      <div style="overflow-x: auto; width: 100%;">
        <table style="min-width: ${format === 'mobile' ? 'auto' : '600px'}; table-layout: auto;">
          <thead><tr><th>ExercÃ­cio</th><th>1Âª Carga</th><th>Ãšltima Carga</th><th class="hide-mobile">MÃ¡ximo</th><th>Î” Carga</th><th>EvoluÃ§Ã£o</th><th class="hide-mobile">Vol. Total</th></tr></thead>
          <tbody>
            ${progressionItems.map(p=>`
              <tr>
                <td><strong>${p.name}</strong></td>
                <td style="color:#888">${p.first.load}kg</td>
                <td style="font-weight:700">${p.last.load}kg</td>
                <td class="hide-mobile" style="color:#f59e0b;font-weight:600">${p.maxLoad}kg</td>
                <td style="color:${p.delta>=0?'#10b981':'#ef4444'};font-weight:700">${p.delta>0?'+':''}${p.delta}kg</td>
                <td style="color:${p.delta>=0?'#10b981':'#ef4444'};font-weight:700">${p.delta>0?'â†‘':'â†“'} ${Math.abs(p.pct)}%</td>
                <td class="hide-mobile" style="color:#666">${(p.totalVol/1000).toFixed(1)}t</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${chartsHTML ? `
      <h2>GrÃ¡ficos de EvoluÃ§Ã£o</h2>
      <p class="section-desc">VisualizaÃ§Ã£o dos indicadores coletados. Leia as descriÃ§Ãµes para interpretar cada grÃ¡fico.</p>
      <div class="charts-grid">${chartsHTML}</div>` : ''}

      <div class="footer">
        DossiÃª gerado por ${trainerName} - ${new Date().toLocaleDateString('pt-BR')} - Vetor â€” Sistema Profissional de Treinamento
      </div>
    </body></html>`;

    newWin.document.open();
    newWin.document.write(htmlContent);
    newWin.document.close();
    notify.success('PDF aberto em uma nova guia! Use Ctrl+P (ou âŒ˜+P) para salvar.');
  });
}

async function initReportCharts(studentId, cycleFilter = '') {
  if (typeof Chart === 'undefined') return;

  let startDate = null, endDate = null;
  if (cycleFilter) {
    const macro = await db.get('macrocycles', cycleFilter);
    if (macro) {
      startDate = new Date(macro.startDate);
      endDate = new Date(macro.endDate);
      endDate.setHours(23,59,59,999);
    }
  }

  const allWorkouts = (await db.getAll('workouts')).filter(w => w.studentId === studentId);
  const workouts = cycleFilter ? allWorkouts.filter(w => String(w.macrocycleId) === String(cycleFilter) || String(w.cycle) === String(cycleFilter)) : allWorkouts;
  const workoutIds = new Set(workouts.map(w => String(w.id)));

  const allBiofeedback = await db.getAll('biofeedback');
  const allSessionsRaw = (await db.getAll('sessions')).filter(s => s.studentId === studentId);

  // Build a workoutId -> workout map for name enrichment
  const allWorkoutsMap = {};
  allWorkouts.forEach(w => { allWorkoutsMap[String(w.id)] = w; });

  const allSessions = allSessionsRaw.map(s => {
    const durationMin = s.durationMin || (s.totalDuration ? Math.round(s.totalDuration / 60) : 0);
    const exercises = s.exercises || [];
    const setLog = (s.setLog || []).map(set => ({
      ...set,
      exerciseName: set.exerciseName || (exercises[set.exIdx]?.name) || (set.exerciseIdx != null ? exercises[set.exerciseIdx]?.name : null) || null,
      load: parseFloat(set.load) || 0,
      reps: parseFloat(set.reps) || 0,
    }));
    // Use pre-computed totalVolume first, then fall back to computing from setLog
    const setLogVol = setLog.reduce((t, x) => t + (x.load || 0) * (x.reps || 0), 0);
    const totalVol = (s.totalVolume && s.totalVolume > 0) ? s.totalVolume : setLogVol;

    // Enrich workoutName from workouts table if missing
    let workoutName = s.workoutName || null;
    if (!workoutName && s.workoutId) {
      const wkt = allWorkoutsMap[String(s.workoutId)];
      if (wkt) workoutName = wkt.name || null;
    }

    // Enrich with biofeedback
    const dateStr = (s.date || '').substring(0, 10);
    const bfId = `bf_${s.studentId}_${dateStr}`;
    const bfObj = allBiofeedback.find(b => b.id === bfId || (b.studentId === s.studentId && (b.date || '').startsWith(dateStr)));
    
    let postBiofeedback = s.postBiofeedback || null;
    let trainingLoad = s.trainingLoad || null;
    if (bfObj) {
      postBiofeedback = {
        ...(s.postBiofeedback || {}),
        pse: bfObj.pse || s.postBiofeedback?.pse,
        trainingLoad: bfObj.trainingLoad || s.postBiofeedback?.trainingLoad,
        tqrPost: bfObj.tqrPost || s.postBiofeedback?.tqrPost,
        feeling: bfObj.feeling || s.postBiofeedback?.feeling,
        notes: bfObj.postNotes || bfObj.notes || s.postBiofeedback?.notes,
        submittedByStudent: bfObj.submittedByStudent || s.postBiofeedback?.submittedByStudent,
      };
      trainingLoad = bfObj.trainingLoad || s.trainingLoad;
    }

    // Resolve PSE from all possible sources (broadest fallback chain)
    const resolvedPse = postBiofeedback?.pse
      || s.postBiofeedback?.pse
      || bfObj?.pse
      || s.preBiofeedback?.pse
      || s.pse
      || null;

    return { ...s, workoutName, durationMin, setLog, totalVolume: totalVol, postBiofeedback, trainingLoad, resolvedPse };
  });
  const sessions = cycleFilter ? allSessions.filter(s => workoutIds.has(String(s.workoutId))) : (startDate ? allSessions.filter(s => new Date(s.date) >= startDate && new Date(s.date) <= endDate) : allSessions);

  const allBf = (await db.getAll('biofeedback')).filter(b => b.studentId === studentId).sort((a, b) => new Date(a.date) - new Date(b.date));
  const bf = cycleFilter ? allBf.filter(b => sessions.some(s => new Date(s.date).toDateString() === new Date(b.date).toDateString())) : (startDate ? allBf.filter(b => new Date(b.date) >= startDate && new Date(b.date) <= endDate) : allBf);

  const allAss = (await db.getAll('assessments')).filter(a => a.studentId === studentId);
  const assessments = startDate ? allAss.filter(a => new Date(a.date) >= startDate && new Date(a.date) <= endDate) : allAss;

  const sortedSes = [...sessions].filter(s => s.status === 'completed').sort((a,b) => new Date(a.date) - new Date(b.date));
  const student = await db.get('students', studentId);
  const co = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, scales: { y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } };
  const chartsInstance = {};



  // Wellness chart â€” filtrar apenas registros que tÃªm dados de bem-estar (nÃ£o sÃ³ PSE do tracker)
  const wCtx = document.getElementById('wellnessChart');
  const bfWellness = bf.filter(b => b.sleep || b.mood || b.energy || b.stress || b.pain || b.motivation || b.food);
  if (wCtx && bfWellness.length > 1) {
    new Chart(wCtx, {
      type: 'line',
      data: {
        labels: bfWellness.map(b => Calc.formatDate(b.date).slice(0,5)),
        datasets: [
          { label: 'Sono',       data: bfWellness.map(b => b.sleep  || null), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.05)', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true },
          { label: 'RecuperaÃ§Ã£o (TQR)',      data: bfWellness.map(b => b.tqr ?? b.energy ?? null), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.05)', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true },
          { label: 'Estresse (menor = melhor)', data: bfWellness.map(b => b.stress || null), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.05)', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true, borderDash: [5,3] }
        ]
      },
      options: {
        ...co,
        scales: {
          ...co.scales,
          y: { ...co.scales.y, min: 0, max: 10,
            ticks: { color: '#64748b', stepSize: 2 }
          }
        },
        plugins: {
          ...co.plugins,
          annotation: {
            annotations: {
              goodLine: { type: 'line', yMin: 7, yMax: 7, borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1, borderDash: [3,3], label: { content: 'Bom (7)', enabled: true, color: '#10b981', font: { size: 9 } } }
            }
          }
        }
      }
    });
  } else if (wCtx) {
    wCtx.parentElement.innerHTML = '<p class="text-muted text-sm text-center" style="padding:40px">Sem dados de bem-estar suficientes. Registre check-ins de biofeedback com sono, disposiÃ§Ã£o e energia.</p>';
  }

  const lCtx = document.getElementById('loadChart');
  if (lCtx && bf.length > 1) {
    const weeks = {}; bf.forEach(b => { if (!b.trainingLoad) return; const d = new Date(b.date); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); const k = ws.toISOString().slice(0, 10); weeks[k] = (weeks[k] || 0) + b.trainingLoad; });
    const wKeys = Object.keys(weeks).sort().slice(-12);
    new Chart(lCtx, { type: 'bar', data: { labels: wKeys.map(k => new Date(k + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), datasets: [{ label: 'Carga', data: wKeys.map(k => weeks[k]), backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 }] }, options: { ...co, plugins: { legend: { display: false } } } });
  }

  const pCtx = document.getElementById('pseChart');
  if (pCtx && bf.length > 1) {
    const pd = bf.filter(b => b.pse);
    new Chart(pCtx, { type: 'line', data: { labels: pd.map(b => Calc.formatDate(b.date)), datasets: [{ label: 'PSE', data: pd.map(b => b.pse), borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)', fill: true, tension: 0.3 }] }, options: { ...co, scales: { ...co.scales, y: { ...co.scales.y, min: 0, max: 10 } } } });
  }

  const rCtx = document.getElementById('radarChart');
  if (rCtx && bf.length > 0) {
    const l5 = bf.slice(-5); const avg = k => l5.reduce((s, b) => s + (b[k] || 0), 0) / l5.length;
    new Chart(rCtx, { type: 'radar', data: {
      labels: ['Sono', 'TQR', 'MotivaÃ§Ã£o', 'AlimentaÃ§Ã£o', 'Baixo Estresse'],
      datasets: [{ label: 'MÃ©dia (Ãºltimos 5)', data: [
        avg('sleep'), 
        avg('tqr') ?? avg('energy'), 
        avg('motivation') || 5, 
        (avg('food') || 5) * 2, 
        10 - avg('stress')
      ], backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10b981', pointBackgroundColor: '#10b981' }]
    }, options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, color: '#64748b', backdropColor: 'transparent' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#94a3b8', font: { size: 11 } } } }, plugins: { legend: { display: false } } } });
  }

  const fCtx = document.getElementById('freqChart');
  if (fCtx) {
    const done = sessions.filter(s => s.status === 'completed');
    const wc = {}; done.forEach(s => { const d = new Date(s.date || s.createdAt); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); const k = ws.toISOString().slice(0, 10); wc[k] = (wc[k] || 0) + 1; });
    const wKeys = Object.keys(wc).sort().slice(-8);
    new Chart(fCtx, { type: 'bar', data: { labels: wKeys.map(k => new Date(k + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), datasets: [{ label: 'SessÃµes', data: wKeys.map(k => wc[k]), backgroundColor: 'rgba(6,182,212,0.5)', borderColor: '#06b6d4', borderWidth: 1, borderRadius: 4 }] }, options: { ...co, plugins: { legend: { display: false } }, scales: { ...co.scales, y: { ...co.scales.y, beginAtZero: true, ticks: { ...co.scales.y.ticks, stepSize: 1 } } } } });
  }

  const mCtx = document.getElementById('measuresChart');
  const compAssessments = assessments.filter(a => a.type === 'composicao');
  if (mCtx && compAssessments.length >= 1) {
    const sorted = [...compAssessments].sort((a, b) => new Date(a.date) - new Date(b.date));
    const ds = [];
    if (sorted.some(a => a.peso))
      ds.push({
        label: 'Peso (kg)',
        data: sorted.map(a => a.peso || null),
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)',
        fill: false, tension: 0.3, yAxisID: 'y', pointRadius: 5, borderWidth: 2
      });

    let pctMin = 0;
    let pctMax = 100;
    if (sorted.some(a => a.percentualGordura)) {
      // Calcular faixa real para Y1 (zoom nos dados reais)
      const gordVals  = sorted.map(a => a.percentualGordura).filter(Boolean);
      const magraVals = sorted.map(a => a.percentualGordura ? 100 - a.percentualGordura : null).filter(Boolean);
      const allPct    = [...gordVals, ...magraVals];
      if (allPct.length > 0) {
        pctMin    = Math.floor(Math.min(...allPct) - 2);
        pctMax    = Math.ceil(Math.max(...allPct) + 2);
      }

      ds.push({
        label: '% Gordura',
        data: sorted.map(a => a.percentualGordura || null),
        borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)',
        fill: false, tension: 0.3, yAxisID: 'y1',
        borderDash: [5, 3], pointRadius: 5, borderWidth: 2
      });
      ds.push({
        label: '% Massa Magra',
        data: sorted.map(a => a.percentualGordura ? parseFloat((100 - a.percentualGordura).toFixed(1)) : null),
        borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)',
        fill: false, tension: 0.3, yAxisID: 'y1',
        borderDash: [2, 2], pointRadius: 5, borderWidth: 2
      });
    }

    if (ds.length) {
      const existingChart = chartsInstance?.['measuresChart'];
      if (existingChart) { existingChart.destroy(); }
      chartsInstance['measuresChart'] = new Chart(mCtx, {
        type: 'line',
        data: { labels: sorted.map(a => Calc.formatDate(a.date)), datasets: ds },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: '#94a3b8', font: { size: 11 },
                usePointStyle: true, pointStyle: 'circle',
              }
            },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const v = ctx.parsed.y;
                  if (v == null) return '';
                  if (ctx.dataset.yAxisID === 'y1') return `${ctx.dataset.label}: ${v.toFixed(1)}%`;
                  return `${ctx.dataset.label}: ${v.toFixed(1)} kg`;
                }
              }
            }
          },
          scales: {
            y: {
              position: 'left',
              title: { display: true, text: 'Peso (kg)', color: '#10b981', font: { size: 10 } },
              ticks: { color: '#10b981' },
              grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y1: {
              position: 'right',
              title: { display: true, text: '%', color: '#94a3b8', font: { size: 10 } },
              ticks: { color: '#94a3b8', callback: v => v + '%' },
              grid: { display: false },
              min: pctMin, max: pctMax
            },
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
          }
        }
      });
    }
  }

  const kcCtx = document.getElementById('kcalChart');
  if (kcCtx && sortedSes.length > 0) {
    const labels = sortedSes.map(s => Calc.formatDate(s.date).slice(0,5));
    const data = sortedSes.map(s => {
      const durMin = s.totalDuration ? s.totalDuration / 60 : 0;
      const p = s.studentWeight || student.weight || 70;
      return durMin ? Calc.caloriasAtividade(p, durMin, 'musculacao') : 0;
    });
    
    chartsInstance['kcalChart'] = new Chart(kcCtx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Kcal Estimada', data, backgroundColor: 'rgba(249, 115, 22, 0.5)', borderColor: '#f97316', borderWidth: 1, borderRadius: 4 }] },
      options: { ...co, plugins: { legend: { display: false } } }
    });
  }

  // Densidade
  const denCtx = document.getElementById('densityChart');
  if (denCtx && sortedSes.length > 0) {
    const denLabels = sortedSes.map(s => Calc.formatDate(s.date).slice(0,5));
    const denData = sortedSes.map(s => {
      const vol = s.totalVolume || 0;
      const dur = s.totalDuration ? s.totalDuration / 60 : 0;
      return dur > 0 ? parseFloat((vol / dur).toFixed(1)) : 0;
    });

    chartsInstance['densityChart'] = new Chart(denCtx, {
      type: 'line',
      data: { labels: denLabels, datasets: [{ label: 'Densidade (kg/min)', data: denData, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', fill: true, tension: 0.3 }] },
      options: { ...co, plugins: { legend: { display: false } } }
    });
  }

  // â”€â”€ GRÃFICO DE PROGRESSÃƒO DE CARGA â”€â”€
  const lpCtx = document.getElementById('loadProgressChart');
  if (lpCtx && sessions.length >= 2) {
    // Pegar os top 3 exercÃ­cios mais treinados para o grÃ¡fico de linha
    const logMap = {};
    [...sessions].filter(s=>s.status==='completed').sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(s => {
      (s.setLog||[]).forEach(set => {
        const name = (s.exercises||[])[set.exIdx]?.name;
        if (!name || !set.load || set.load<=0) return;
        if (!logMap[name]) logMap[name] = [];
        logMap[name].push({ date: s.date, load: set.load });
      });
    });
    const top3 = Object.entries(logMap)
      .filter(([,v])=>v.length>=2)
      .sort((a,b)=>b[1].length-a[1].length)
      .slice(0,3);

    if (top3.length) {
      const colors = ['#10b981','#06b6d4','#f59e0b'];
      // Coletar todas as datas Ãºnicas ordenadas para usar como labels (evita adaptador de data)
      const allDates = [...new Set(top3.flatMap(([,v])=>v.map(p=>p.date)))].sort();
      const labelMap = Object.fromEntries(allDates.map((d,i)=>[d,Calc.formatDate(d).slice(0,5)]));
      new Chart(lpCtx, {
        type: 'line',
        data: {
          labels: allDates.map(d=>labelMap[d]),
          datasets: top3.map(([name, points], i) => ({
            label: name,
            data: allDates.map(d => {
              const pt = points.find(p=>p.date===d);
              return pt ? pt.load : null;
            }),
            borderColor: colors[i],
            backgroundColor: colors[i]+'15',
            tension: 0.3,
            pointRadius: 4,
            borderWidth: 2,
            fill: false,
            spanGaps: true,
          }))
        },
        options: {
          ...co,
          scales: {
            x: { ticks:{ color:'#94a3b8', font:{size:9} }, grid:{display:false} },
            y: { ticks:{ color:'#64748b', font:{size:9}, callback: v => v+'kg' }, grid:{ color:'rgba(148,163,184,0.07)' } }
          },
          plugins: { legend: { labels:{ color:'#94a3b8', font:{size:10}, boxWidth:12 } } }
        }
      });
    }
  }
  const cdCtx = document.getElementById('cycleDiffChart');
  if (cdCtx && bf.length >= 4) {
    const mid = Math.floor(bf.length / 2);
    const first = bf.slice(0, mid);
    const second = bf.slice(mid);
    const avgOf = (arr, key) => arr.length ? (arr.reduce((s, b) => s + (b[key] || 0), 0) / arr.length).toFixed(1) : 0;
    const metrics = ['sleep', 'tqr', 'stress', 'pse'];
    const labels  = ['Sono', 'TQR', 'Estresse', 'PSE'];
    const firstData = metrics.map(k => parseFloat(avgOf(first, k)));
    const secondData = metrics.map(k => parseFloat(avgOf(second, k)));

    new Chart(cdCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: `PerÃ­odo 1 (${first.length} registros)`, data: firstData, backgroundColor: 'rgba(148,163,184,0.5)', borderColor: '#94a3b8', borderWidth: 1, borderRadius: 4 },
          { label: `PerÃ­odo 2 (${second.length} registros)`, data: secondData, backgroundColor: 'rgba(16,185,129,0.6)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 },
        ]
      },
      options: {
        ...co,
        scales: { ...co.scales, y: { ...co.scales.y, min: 0, max: 10 } },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const diff = secondData[idx] - firstData[idx];
                const arrow = diff > 0 ? 'â†‘' : diff < 0 ? 'â†“' : '=';
                const sign = diff > 0 ? '+' : '';
                return `VariaÃ§Ã£o: ${arrow} ${sign}${diff.toFixed(1)}`;
              }
            }
          }
        }
      }
    });
  }

  // Identical Sessions comparison (trainer side)
  const compSel = document.getElementById('compareWorkoutSel');
  const compCtx = document.getElementById('compareWorkoutChart');
  let compareChart = null;

  if (compSel && compCtx && sortedSes.length > 0) {
    // Broader name normalization â€” strip week/session suffixes and numbering
    const getBaseWorkoutName = name => {
      if (!name) return 'Treino Avulso';
      return name
        .replace(/\s*[\-â€”â€“]\s*Semana\s*\d+/i, '')
        .replace(/\s*[\-â€”â€“]\s*Sem\.?\s*\d+/i, '')
        .replace(/\s*Semana\s*\d+/i, '')
        .replace(/\s*Sem\.?\s*\d+/i, '')
        .replace(/\s*S\d+/i, '')       // e.g. "Full Body A S3"
        .replace(/\s*\(\d+\)/g, '')    // e.g. "Full Body A (3)"
        .replace(/\s*#\d+/g, '')       // e.g. "Full Body A #3"
        .replace(/\s*[\-â€”â€“]\s*$/g, '')
        .trim();
    };

    const workoutsByName = {};
    sortedSes.forEach(s => {
      // Use workoutName (already enriched from DB above) or fall back to 'Treino Avulso'
      const rawName = s.workoutName || (s.workoutId ? `Treino ${s.workoutId}` : 'Treino Avulso');
      const base = getBaseWorkoutName(rawName);
      if (!workoutsByName[base]) workoutsByName[base] = [];
      workoutsByName[base].push(s);
    });

    // Only show groups with >= 2 sessions in the dropdown
    const comparableBases = Object.keys(workoutsByName).filter(b => b !== 'Treino Avulso' && workoutsByName[b].length >= 2);
    if (comparableBases.length > 0) {
      // Rebuild the dropdown options with the correct groups
      compSel.innerHTML = comparableBases.map((base, idx) =>
        `<option value="${base}" ${idx === 0 ? 'selected' : ''}>${base} (${workoutsByName[base].length} sessÃµes)</option>`
      ).join('');
    }

    const drawCompareChart = () => {
      const base = compSel.value;
      const sessList = (workoutsByName[base] || []).sort((a, b) => new Date(a.date) - new Date(b.date));

      if (compareChart) compareChart.destroy();
      if (sessList.length === 0) return;

      const labels = sessList.map((s, i) => {
        const dStr = Calc.formatDate(s.date).slice(0, 5);
        const wkMatch = (s.workoutName || '').match(/Sem\.?\s*(\d+)/i);
        return wkMatch ? `Sem ${wkMatch[1]} (${dStr})` : `SessÃ£o ${i + 1} (${dStr})`;
      });

      // Volume: use pre-computed totalVolume (most accurate) with setLog as fallback
      const volumeData = sessList.map(s => {
        if (s.totalVolume && s.totalVolume > 0) return Math.round(s.totalVolume);
        return (s.setLog || []).reduce((t, x) => t + (parseFloat(x.load) || 0) * (parseFloat(x.reps) || 0), 0);
      });

      // PSE: use the pre-resolved resolvedPse field covering all sources
      const pseData = sessList.map(s => {
        const pse = s.resolvedPse || s.postBiofeedback?.pse || s.preBiofeedback?.pse || s.pse || null;
        return pse !== null ? parseFloat(pse) : null;
      });

      const hasAnyPse = pseData.some(v => v !== null);

      compareChart = new Chart(compCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Volume Total (kg)',
              data: volumeData,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.08)',
              tension: 0.3,
              yAxisID: 'y',
              fill: true,
              pointRadius: 5,
              pointHoverRadius: 7,
              borderWidth: 2.5,
              spanGaps: true,
            },
            {
              label: 'PSE â€” PercepÃ§Ã£o de EsforÃ§o (Borg 0-10)',
              data: pseData,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.04)',
              tension: 0.3,
              yAxisID: 'y1',
              borderDash: [6, 3],
              pointRadius: hasAnyPse ? 5 : 0,
              pointHoverRadius: 7,
              borderWidth: 2,
              spanGaps: true,
              hidden: !hasAnyPse,
            }
          ]
        },
        options: {
          ...co,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              labels: {
                color: '#94a3b8',
                font: { size: 11 },
                usePointStyle: true,
                pointStyleWidth: 10,
              }
            },
            tooltip: {
              callbacks: {
                title: ctx => labels[ctx[0]?.dataIndex] || '',
                label: ctx => {
                  if (ctx.datasetIndex === 0) return ` Volume: ${ctx.parsed.y?.toLocaleString('pt-BR')} kg`;
                  if (ctx.datasetIndex === 1) return ctx.parsed.y !== null ? ` PSE: ${ctx.parsed.y} / 10` : ' PSE: nÃ£o registrada';
                  return '';
                },
                afterBody: items => {
                  const i = items[0]?.dataIndex;
                  if (i === undefined || i === 0) return '';
                  const diff = volumeData[i] - volumeData[i - 1];
                  const sign = diff >= 0 ? '+' : '';
                  const pct = volumeData[i - 1] > 0 ? ` (${sign}${Math.round((diff / volumeData[i - 1]) * 100)}%)` : '';
                  return `VariaÃ§Ã£o vs anterior: ${sign}${diff.toLocaleString('pt-BR')} kg${pct}`;
                }
              }
            }
          },
          scales: {
            x: {
              ...co.scales.x,
              ticks: { ...co.scales.x?.ticks, maxRotation: 40, font: { size: 10 } }
            },
            y: {
              position: 'left',
              title: { display: true, text: 'Volume Total (kg)', color: '#6366f1', font: { size: 10 } },
              ticks: { color: '#6366f1', font: { size: 10 } },
              grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y1: {
              position: 'right',
              min: 0,
              max: 10,
              title: { display: hasAnyPse, text: 'PSE (Borg 0-10)', color: '#ef4444', font: { size: 10 } },
              ticks: { color: '#ef4444', font: { size: 10 }, stepSize: 1 },
              grid: { display: false }
            }
          }
        }
      });
    };

    compSel.addEventListener('change', drawCompareChart);
    drawCompareChart();
  }
}

async function loadPeriodizationForReport(studentId, selectedMacroId = null) {
  const container = document.getElementById('reportPeriodization');
  if (!container) return;
  const macros = (await db.getAll('macrocycles')).filter(m => m.studentId === studentId);
  if (!macros.length) {
    container.innerHTML = '<p class="text-muted text-sm">Nenhuma periodizaÃ§Ã£o encontrada para este aluno.</p>';
    return;
  }
  
  let active = selectedMacroId ? macros.find(m => m.id === selectedMacroId) : (macros.find(m => m.status === 'active') || macros[0]);
  
  const getDaysDifference = (d1, d2) => {
    const t1 = new Date(d1.includes('T') ? d1 : d1 + 'T12:00');
    const t2 = new Date(d2.includes('T') ? d2 : d2 + 'T12:00');
    const s1 = new Date(t1.getFullYear(), t1.getMonth(), t1.getDate());
    const s2 = new Date(t2.getFullYear(), t2.getMonth(), t2.getDate());
    return Math.round((s1 - s2) / 86400000);
  };
  const elapsedDays = getDaysDifference(new Date().toISOString().split('T')[0], active.startDate);
  const currentWeek = Math.floor(Math.abs(elapsedDays) / 7) + 1;
  
  container.innerHTML = `
    <div style="margin-bottom:12px">
      <select class="form-select" id="reportMacroSelect" style="max-width:300px;font-size:0.85rem">
        ${macros.map(m => `<option value="${m.id}" ${m.id === active.id ? 'selected' : ''}>${m.name} (${(m.startDate.includes('T') ? new Date(m.startDate) : new Date(m.startDate + 'T12:00')).toLocaleDateString('pt-BR')})</option>`).join('')}
      </select>
    </div>
    ${active.weeks ? `
    <div class="text-sm text-muted mb-sm"><strong>${active.name}</strong> Â· ${active.totalWeeks} semanas Â· InÃ­cio: ${(active.startDate.includes('T') ? new Date(active.startDate) : new Date(active.startDate + 'T12:00')).toLocaleDateString('pt-BR')}</div>
    <div class="week-timeline" style="min-height:60px">
      ${active.weeks.map((w, i) => {
        const intColor = w.phase === 'deload' ? '#3b82f6' : w.intensityPct >= 85 ? '#ef4444' : w.intensityPct >= 75 ? '#f97316' : w.intensityPct >= 65 ? '#eab308' : '#22c55e';
        return `<div class="week-block ${i + 1 === currentWeek ? 'week-current' : ''}" style="border-bottom:3px solid ${intColor}" title="Sem ${w.week}: ${w.label} â€” Vol: ${w.volumePct}% | Int: ${w.intensityPct}%">
          <div class="week-num" style="color:${intColor}">S${w.week}</div>
          <div class="week-bar-int" style="height:${w.intensityPct * 0.4}px;background:${intColor}"></div>
        </div>`;
      }).join('')}
    </div>
    <div class="flex gap-md mt-sm text-xs text-muted" style="flex-wrap:wrap">
      <span style="color:#22c55e">â— Leve</span>
      <span style="color:#eab308">â— Moderada</span>
      <span style="color:#f97316">â— Alta</span>
      <span style="color:#ef4444">â— Muito Alta</span>
      <span style="color:#3b82f6">â— Deload</span>
    </div>` : '<p class="text-xs text-muted">Macrociclo sem semanas definidas.</p>'}
  `;

  document.getElementById('reportMacroSelect')?.addEventListener('change', (e) => {
    loadPeriodizationForReport(studentId, e.target.value);
  });
}

