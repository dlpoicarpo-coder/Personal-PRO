// ========================================
// PERSONAL PRO — Reports Page (v4)
// Cycle selection + Student-focused dossier
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { notify } from '../components/toast.js';
import { analyzeBiofeedback, overallStatus, trainingRecommendation } from '../utils/alerts.js';
import { generateAlgorithmicInsight, generateAIInsight } from '../insights.js';

export async function renderReports() {
  const students = await db.getAll('students');
  const active = students.filter(s => s.status === 'Ativo');
  return `
    <div class="page-header">
      <div><h1>Relatórios de Performance</h1><p class="subtitle">Dossiê compacto com gráficos de evolução e comparação entre ciclos</p></div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <select class="form-select" id="reportStudent" style="min-width:220px">
          <option value="">Selecione um aluno</option>
          ${active.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <select class="form-select" id="reportCycle" style="min-width:160px;display:none">
          <option value="">Todos os ciclos</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="exportWaBtn" style="display:none;color:#25d366;border-color:#25d366">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Enviar
        </button>
        <select class="form-select form-select-sm" id="pdfFormatSel" style="display:none; min-width:140px; border-color:var(--primary); color:var(--primary); font-weight:600">
          <option value="mobile">📱 Celular (Vertical)</option>
          <option value="a4">📄 A4 (Horizontal)</option>
        </select>
        <button class="btn btn-primary btn-sm" id="exportPdfBtn" style="display:none">Gerar PDF</button>
      </div>
    </div>
    <div id="pdfAnnotationsContainer" style="display:none;margin-bottom:16px;">
      <label class="form-label">Anotações do Treinador (para o PDF):</label>
      <textarea id="pdfAnnotations" class="form-textarea" placeholder="Adicione notas, comentários ou orientações extras para o aluno..."></textarea>
    </div>
    <div id="reportContent">
      <div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Selecione um aluno</h3><p class="text-muted">Escolha um aluno para ver o relatório completo</p></div>
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
  const workouts = cycleFilter ? allWorkouts.filter(w => w.macrocycleId === cycleFilter || w.cycle === cycleFilter) : allWorkouts;
  const workoutIds = new Set(workouts.map(w => w.id));
  
  const allSessions = (await db.getAll('sessions')).filter(s => s.studentId === studentId);
  const sessions = cycleFilter ? allSessions.filter(s => workoutIds.has(s.workoutId)) : (startDate ? allSessions.filter(s => new Date(s.date) >= startDate && new Date(s.date) <= endDate) : allSessions);
  
  const allBf = (await db.getAll('biofeedback')).filter(b => b.studentId === studentId).sort((a, b) => new Date(a.date) - new Date(b.date));
  const bf = cycleFilter ? allBf.filter(b => sessions.some(s => new Date(s.date).toDateString() === new Date(b.date).toDateString())) : (startDate ? allBf.filter(b => new Date(b.date) >= startDate && new Date(b.date) <= endDate) : allBf);
  
  const allAss = (await db.getAll('assessments')).filter(a => a.studentId === studentId);
  const assessments = startDate ? allAss.filter(a => new Date(a.date) >= startDate && new Date(a.date) <= endDate) : allAss;
  const completed = sessions.filter(s => s.status === 'completed');
  const recent10 = bf.slice(-10);
  const avgPse = recent10.length ? (recent10.reduce((s, b) => s + (b.pse || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgSleep = recent10.length ? (recent10.reduce((s, b) => s + (b.sleep || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgMood = recent10.length ? (recent10.reduce((s, b) => s + (b.mood || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgTqr    = recent10.length ? (recent10.reduce((s, b) => s + (b.tqr || b.energy || 0), 0) / recent10.length).toFixed(1) : '-';
  const totalLoad = bf.reduce((s, b) => s + (b.trainingLoad || 0), 0);

  const pseNum = parseFloat(avgPse) || 0;
  const sleepNum = parseFloat(avgSleep) || 0;
  const cycleLabel = cycleFilter || 'Todos os Ciclos';

  // ── Cálculo de calorias com base na avaliação mais recente ──
  const lastComp   = assessments.filter(a=>a.type==='composicao').sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
  const age        = student?.birthDate ? Calc.calcularIdade(student.birthDate) : (student?.age || 0);
  const sexo       = student?.gender || 'M';
  const objMap     = {'Emagrecimento':'emagrecimento','Perda de peso':'emagrecimento','Hipertrofia':'hipertrofia','Ganho de massa':'hipertrofia','Manutenção':'manutencao','Saúde':'manutencao','Condicionamento':'manutencao'};
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
  if (pseNum > 8) parecerAluno += 'Atenção: Seus treinos estão muito intensos! Vamos reduzir um pouco o ritmo para seu corpo se recuperar melhor. ';
  else if (pseNum > 6) parecerAluno += 'Você está treinando no nível ideal! Continue assim, seu corpo está respondendo muito bem. ';
  else parecerAluno += 'Você ainda tem bastante fôlego! Podemos aumentar a intensidade gradualmente. ';
  if (sleepNum < 6) parecerAluno += 'Seu sono está abaixo do ideal — tente dormir entre 7 e 9 horas para otimizar seus resultados. ';
  else if (sleepNum >= 7) parecerAluno += 'Ótimo sono! Isso ajuda muito na recuperação e nos ganhos. ';
  if (completed.length > 0) parecerAluno += `Parabéns! Você completou ${completed.length} sessão(ões) no período. `;
  if (totalLoad > 2000) parecerAluno += 'Sua carga acumulada está alta — estamos monitorando para evitar excesso.';
  else parecerAluno += 'Sua carga está dentro do esperado. Tudo sob controle!';

  // Professor technical analysis
  let parecerTecnico = '';
  if (pseNum > 8) parecerTecnico += 'PSE média elevada (>8), indicando possível fadiga acumulada. Recomenda-se reduzir volume em 20-30%. ';
  else if (pseNum > 6) parecerTecnico += 'PSE em nível adequado para progressão. Aluno responde bem ao estímulo. ';
  else parecerTecnico += 'PSE baixa, margem para aumento progressivo de intensidade. ';
  if (sleepNum < 6) parecerTecnico += 'Sono comprometido — orientar higiene do sono. ';
  if (totalLoad > 2000) parecerTecnico += 'Carga acumulada significativa. Monitorar sinais de overreaching.';

  // ── Evolução de carga por exercício (baseado nas sessões) ──
  const loadProgression = {};
  completed
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

  // Top exercícios com maior progressão de carga
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
  const avgDuration         = completed.length ? Math.round(completed.reduce((t, s) => t + (s.totalDuration || 0), 0) / completed.length / 60) : 0;

  const workoutSummary = ''; // mantido por compatibilidade

  // Group workouts by base name for comparative chart (trainer side)
  const getBaseWorkoutName = name => {
    if (!name) return 'Treino Avulso';
    return name.replace(/\s*—\s*Sem\s*\d+/i, '').replace(/\s*-\s*Semana\s*\d+/i, '').replace(/\s*Sem\s*\d+/i, '').trim();
  };

  const workoutsByName = {};
  completed.forEach(s => {
    if (!s.workoutName) return;
    const base = getBaseWorkoutName(s.workoutName);
    if (!workoutsByName[base]) workoutsByName[base] = [];
    workoutsByName[base].push(s);
  });
  const comparableBases = Object.keys(workoutsByName).filter(base => workoutsByName[base].length >= 2);

  let compareSessionsHtml = '';
  if (comparableBases.length > 0) {
    compareSessionsHtml = `
    <div class="card mb-lg">
      <div class="card-header">
        <span class="card-title">📈 Comparativo de Sessões Idênticas</span>
      </div>
      <p class="text-xs text-muted mb-md">Compare a evolução de Volume total e PSE para o mesmo treino ao longo das semanas.</p>
      <div class="form-group" style="max-width:300px">
        <select id="compareWorkoutSel" class="form-select" style="margin-bottom:12px;padding:8px;font-size:0.85rem">
          ${comparableBases.map((base, idx) => `<option value="${base}" ${idx===0?'selected':''}>${base}</option>`).join('')}
        </select>
      </div>
      <div style="height:250px;position:relative">
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
        <div class="text-muted">${student.code} · ${student.goal || '-'} · ${student.age || '-'} anos</div>
        <div class="text-xs text-muted mt-xs">Ciclo: <strong style="color:var(--primary)">${cycleLabel}</strong></div>
      </div>
    </div>

    <!-- Stats principais -->
    <div class="stats-grid mb-lg" style="grid-template-columns:repeat(5,1fr)">
      <div class="stat-card">
        <div class="stat-label">Sessões</div>
        <div class="stat-value text-gradient">${completed.length}</div>
        <div class="text-xs text-muted" style="margin-top:4px">realizadas</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Volume Total</div>
        <div class="stat-value text-gradient">${(totalVolAllSessions/1000).toFixed(1)}t</div>
        <div class="text-xs text-muted" style="margin-top:4px">${totalVolAllSessions.toLocaleString('pt-BR')} kg</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">PSE Média</div>
        <div class="stat-value" style="color:${pseNum > 8 ? 'var(--danger)' : pseNum > 6 ? 'var(--warning)' : 'var(--success)'}">${avgPse}</div>
        <div class="text-xs text-muted" style="margin-top:4px">${pseNum > 8 ? 'Alta — atenção' : pseNum > 6 ? 'Adequada' : 'Leve'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sono Médio</div>
        <div class="stat-value" style="color:${sleepNum < 5 ? 'var(--danger)' : sleepNum < 7 ? 'var(--warning)' : 'var(--success)'}">${avgSleep}</div>
        <div class="text-xs text-muted" style="margin-top:4px">${sleepNum < 5 ? 'Insuficiente' : sleepNum < 7 ? 'Regular' : 'Bom'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Carga Total</div>
        <div class="stat-value text-gradient">${Math.round(totalLoad)}</div>
        <div class="text-xs text-muted" style="margin-top:4px">PSE × duração</div>
      </div>
    </div>

    <!-- Motor de Insights -->
    <div class="card mb-lg" style="border:1px solid rgba(139, 92, 246, 0.4); background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.02) 100%); position: relative; overflow: hidden;">
      <div style="position: absolute; top: -20px; right: -20px; font-size: 8rem; opacity: 0.05; user-select: none;">✨</div>
      <div class="card-header"><span class="card-title" style="color:var(--accent); display:flex; align-items:center; gap:8px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        Resumo da Evolução (Últimas 4 semanas)
      </span></div>
      
      <p style="font-size:0.95rem; line-height:1.6; color:var(--text-color); margin-bottom: 16px;">
        ${generateAlgorithmicInsight(student, completed, bf, 28).text}
      </p>

      <div id="aiInsightResult" style="display:none; margin-top:16px; padding-top:16px; border-top:1px dashed var(--border-color)">
        <p style="font-size:0.95rem; line-height:1.6; color:var(--text-color);" id="aiInsightText"></p>
      </div>

      <button id="btnGenerateAI" class="btn btn-primary" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border:none; display:flex; align-items:center; gap:8px">
        <span>Analisar com IA (Gemini)</span>
      </button>
    </div>

    <!-- Sub-stats de treino -->
    <div class="stats-grid mb-lg" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card" style="padding:12px;text-align:center">
        <div class="stat-label" style="font-size:0.65rem">Média/Sessão</div>
        <div class="stat-value" style="font-size:1.3rem;color:var(--accent)">${avgVolPerSession.toLocaleString('pt-BR')} kg</div>
        <div class="text-xs text-muted" style="margin-top:2px">volume por treino</div>
      </div>
      <div class="stat-card" style="padding:12px;text-align:center">
        <div class="stat-label" style="font-size:0.65rem">Maior Volume</div>
        <div class="stat-value" style="font-size:1.3rem;color:var(--warning)">${maxVolSession.toLocaleString('pt-BR')} kg</div>
        <div class="text-xs text-muted" style="margin-top:2px">em uma sessão</div>
      </div>
      <div class="stat-card" style="padding:12px;text-align:center">
        <div class="stat-label" style="font-size:0.65rem">Duração Média</div>
        <div class="stat-value" style="font-size:1.3rem;color:var(--primary)">${avgDuration} min</div>
        <div class="text-xs text-muted" style="margin-top:2px">por sessão</div>
      </div>
    </div>

    ${tmbResult && tdeeResult && metaResult ? `
    <!-- Gasto Energético e Macros -->
    <div class="card mb-lg" style="border-left:3px solid var(--primary)">
      <div class="card-header">
        <span class="card-title">Gasto Energético Estimado</span>
        <span class="text-xs text-muted">${tmbResult.formula} · Base: ${lastComp ? Calc.formatDate(lastComp.date) : '—'}</span>
      </div>
      <div class="stats-grid mb-sm" style="grid-template-columns:repeat(3,1fr);gap:8px">
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">TMB</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--text-secondary)">${tmbResult.valor} <span style="font-size:0.72rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">Basal · ${tmbResult.formula}</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">TDEE</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--primary)">${tdeeResult.valor} <span style="font-size:0.72rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">×${tdeeResult.fator} · ~${Math.round(sessPerWeek*10)/10}×/sem</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">Meta (${student?.goal||'Manutenção'})</div>
          <div style="font-size:1.3rem;font-weight:800;color:${obj.includes('emagr')?'var(--warning)':obj.includes('hipert')?'var(--success)':'var(--accent)'}">${metaResult.kcal} <span style="font-size:0.72rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">${metaResult.label}</div>
        </div>
      </div>
      ${macrosRes ? `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[['Proteína',macrosRes.proteina,'#10b981'],['Carboidrato',macrosRes.carboidrato,'#f59e0b'],['Gordura',macrosRes.gordura,'#8b5cf6']].map(([n,m,c])=>`
          <div style="padding:10px 12px;background:var(--bg-page);border-radius:8px;border-left:3px solid ${c}">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">${n}</div>
            <div style="font-size:1.3rem;font-weight:700;color:${c}">${m.g}g</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${m.kcal}kcal · ${m.pct}%</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:8px;font-size:0.72rem;color:var(--text-muted)">
        Proteína: <strong>${macrosRes.protPorKg}g/kg</strong> · ISSN Position Stand (Stokes et al. 2018) · Peso: ${lastComp.peso}kg${lastComp.massaMagra?` · Massa magra: ${Calc.formatNum(lastComp.massaMagra)}kg`:''}
      </div>` : ''}
    </div>` : ''}

    <div class="card mb-lg" style="border-left:3px solid var(--primary);background:rgba(16,185,129,0.03)">
      <div class="card-header"><span class="card-title">Resumo para o Aluno</span></div>
      <p class="text-xs text-muted" style="margin-bottom:8px">Análise em linguagem acessível.</p>
      <p class="text-sm" style="line-height:1.8">${parecerAluno}</p>
    </div>

    <div class="card mb-lg" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title">Análise Técnica do Treinador</span></div>
      <p class="text-xs text-muted" style="margin-bottom:8px">Baseada nos indicadores de carga e bem-estar.</p>
      <p class="text-sm" style="line-height:1.7">${parecerTecnico}</p>
    </div>

    <!-- Progressão de carga por exercício -->
    ${progressionItems.length ? `
    <div class="card mb-lg">
      <div class="card-header">
        <span class="card-title">Progressão de Carga por Exercício</span>
        <span class="text-xs text-muted">${progressionItems.length} exercícios com dados suficientes</span>
      </div>
      <p class="text-xs text-muted mb-md">Evolução da carga utilizada ao longo das sessões registradas. Verde = progresso, vermelho = regressão.</p>
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>Exercício</th>
            <th style="text-align:center">1ª Carga</th>
            <th style="text-align:center">Última Carga</th>
            <th style="text-align:center">Máximo</th>
            <th style="text-align:center">Δ Carga</th>
            <th style="text-align:center">Evolução</th>
            <th style="text-align:center">Vol. Total</th>
            <th style="text-align:center">Séries</th>
          </tr></thead>
          <tbody>
            ${progressionItems.map(p => {
              const deltaColor = p.delta > 0 ? 'var(--success)' : p.delta < 0 ? 'var(--danger)' : 'var(--text-muted)';
              const arrow      = p.delta > 0 ? '↑' : p.delta < 0 ? '↓' : '=';
              const barWidth   = Math.min(100, Math.abs(p.pct));
              return `<tr>
                <td><strong style="font-size:0.85rem">${p.name}</strong></td>
                <td style="text-align:center;color:var(--text-muted)">${p.first.load}kg</td>
                <td style="text-align:center;font-weight:600">${p.last.load}kg</td>
                <td style="text-align:center;color:var(--warning);font-weight:600">${p.maxLoad}kg</td>
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
                <td style="text-align:center;font-size:0.82rem">${(p.totalVol/1000).toFixed(1)}t</td>
                <td style="text-align:center;color:var(--text-muted);font-size:0.82rem">${p.sessions}</td>
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
      <div class="card-header"><span class="card-title">Progressão de Carga</span></div>
      <p class="text-muted text-sm" style="padding:16px 0">Sem sessões registradas com setLog suficiente para análise de progressão. Registre sessões via Treino ao Vivo para ver a evolução.</p>
    </div>`}

    ${compareSessionsHtml}

    <div class="card mb-lg" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title">Periodização Atual</span></div>
      <p class="text-xs text-muted mb-sm">Macrociclo ativo com distribuição de volume e intensidade.</p>
      <div id="reportPeriodization"></div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card">
        <div class="card-header"><span class="card-title">Evolução do Bem-estar</span></div>
        <p class="text-xs text-muted mb-sm">Gráfico de linhas mostrando as variáveis de bem-estar ao longo do tempo. <strong>Sono</strong> (roxo), <strong>TQR/Recuperação</strong> (verde) e <strong>Estresse</strong> (amarelo tracejado). Valores acima de 7 indicam boa recuperação. Estresse abaixo de 5 é ideal.</p>
        <div style="height:280px;position:relative"><canvas id="wellnessChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Carga de Treino Semanal</span></div>
        <p class="text-xs text-muted mb-sm">Volume de carga semanal calculado como <strong>PSE × Duração (min)</strong>. Picos excessivos ou aumento >10% entre semanas podem indicar risco de overtraining. A consistência é mais importante que picos altos.</p>
        <div style="height:280px;position:relative"><canvas id="loadChart"></canvas></div>
      </div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card">
        <div class="card-header"><span class="card-title">PSE por Sessão</span></div>
        <p class="text-xs text-muted mb-sm">Percepção Subjetiva de Esforço (escala 1-10). Valores <strong>acima de 8 por 3+ sessões consecutivas</strong> indicam fadiga acumulada. A zona ideal para hipertrofia é entre 6 e 8.</p>
        <div style="height:250px;position:relative"><canvas id="pseChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Radar de Wellness</span></div>
        <p class="text-xs text-muted mb-sm">Média dos últimos 5 check-ins. Quanto mais expandido o radar, melhor o estado geral do aluno. Áreas "encolhidas" indicam pontos de atenção (ex: sono baixo, estresse alto).</p>
        <div style="height:250px;position:relative"><canvas id="radarChart"></canvas></div>
      </div>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Comparação entre Ciclos</span></div>
      <p class="text-xs text-muted mb-sm">Mostra a <strong>média de cada indicador</strong> dividida por período (primeira metade vs segunda metade dos dados). Barras maiores na segunda metade indicam <strong>melhora</strong> (exceto estresse, onde menos é melhor). Ideal para demonstrar ao aluno a evolução ao longo do tempo.</p>
      <div style="height:280px;position:relative"><canvas id="cycleDiffChart"></canvas></div>
    </div>

    ${assessments.length ? `
    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Evolução de Medidas Corporais</span></div>
      <p class="text-xs text-muted mb-sm">Acompanhamento de peso corporal e percentual de gordura ao longo das avaliações. A tendência é mais importante que valores isolados.</p>
      <div style="height:280px;position:relative"><canvas id="measuresChart"></canvas></div>
    </div>` : ''}

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Gasto Calórico nos Treinos</span></div>
      <p class="text-xs text-muted mb-sm">Estimativa de calorias gastas por sessão, baseada na duração e peso corporal (MET de musculação).</p>
      <div style="height:280px;position:relative"><canvas id="kcalChart"></canvas></div>
    </div>
    
    <div class="card mb-lg" id="densityChart_card">
      <div class="card-header"><span class="card-title">Densidade de Treino (kg/min)</span></div>
      <p class="text-xs text-muted mb-sm">Relação entre Volume (kg) e Duração (min) das sessões.</p>
      <div style="height:280px;position:relative"><canvas id="densityChart"></canvas></div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card"><div class="card-header"><span class="card-title">Frequência — Últimas 8 Semanas</span></div>
        <p class="text-xs text-muted mb-sm">Sessões realizadas por semana. A <strong>consistência</strong> (mínimo 3x/semana) é o fator mais importante para resultados a longo prazo.</p>
        <div style="height:220px;position:relative"><canvas id="freqChart"></canvas></div>
      </div>
      <div class="card"><div class="card-header"><span class="card-title">Alertas Recentes</span></div>
        <p class="text-xs text-muted mb-sm">Resumo dos últimos check-ins de biofeedback com classificação automática e recomendações.</p>
        ${recent10.length ? recent10.slice(-5).reverse().map(e => {
    const alerts = analyzeBiofeedback(e);
    const status = overallStatus(e);
    const rec = trainingRecommendation(e);
    return `<div class="event-card" style="border-left:3px solid var(--${status.color})">
            <div class="flex items-center justify-between"><span>${status.icon} ${Calc.formatDate(e.date)}</span><span class="badge badge-${status.color}">${status.label}</span></div>
            ${alerts.length ? `<div class="text-sm mt-xs">${alerts.map(a => `${a.icon} ${a.metric}: ${a.value}`).join(' · ')}</div>` : ''}
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
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">—</div><h3>Selecione um aluno</h3></div>';
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
    const content = document.getElementById('reportContent');
    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    content.innerHTML = await renderStudentReport(sid, cycleSel.value);
    initReportCharts(sid, cycleSel.value);
  });

  // WhatsApp — enviar resumo ao aluno
  document.getElementById('exportWaBtn')?.addEventListener('click', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    const student  = await db.get('students', sid);
    if (!student?.phone) { notify.warning('Aluno sem telefone cadastrado'); return; }
    const sessions = (await db.getAll('sessions')).filter(s => s.studentId === sid && s.status === 'completed');
    const bf       = (await db.getAll('biofeedback')).filter(b => b.studentId === sid);
    const recent10 = bf.slice(-10);
    const avgPse   = recent10.length ? (recent10.reduce((t,b)=>t+(b.pse||0),0)/recent10.length).toFixed(1) : '-';
    const avgSleep = recent10.length ? (recent10.reduce((t,b)=>t+(b.sleep||0),0)/recent10.length).toFixed(1) : '-';
    const avgTqr   = recent10.length ? (recent10.reduce((s,b)=>s+(b.tqr||b.energy||0),0)/recent10.length).toFixed(1) : '-';
    const avgTqrR  = avgTqr;
    const totalVol = sessions.reduce((t,s)=>t+(s.totalVolume||0),0);
    const cycleLabel = cycleSel?.value || 'Geral';
    const msg = [
      `📊 *Seu Relatório de Performance — Personal PRO*`,
      ``,
      `👤 Aluno: *${student.name}*`,
      `📅 Ciclo: ${cycleLabel}`,
      ``,
      `🏋 *Treinos*`,
      `• Sessões realizadas: ${sessions.length}`,
      `• Volume total acumulado: ${totalVol}kg`,
      ``,
      `📈 *Indicadores (últimos ${recent10.length} check-ins)*`,
      `• Sono médio: ${avgSleep}/10`,
      `• TQR médio: ${avgTqr||avgTqrR||'-'}/10`,
      `• PSE médio: ${avgPse}/10`,
      ``,
      `✅ Continue assim! Resultados consistentes vêm da consistência nos treinos e no descanso.`,
      ``,
      `_Relatório gerado pelo Personal PRO_`,
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
    
    newWin.document.write('<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Gerando relatório...</h2></body></html>');
    
    const student = await db.get('students', sid);
    if (!student) { newWin.close(); return; }
    const cycleFilter = cycleSel?.value || '';
    const settings    = await db.get('settings', 'trainer') || {};
    const trainerName = settings?.trainerName || 'Personal PRO';

    const pdfArea = document.getElementById('pdfArea');
    if (!pdfArea) { newWin.close(); notify.error('Carregue o relatório primeiro'); return; }

    // ── Dados ──
    const allWorkouts = (await db.getAll('workouts')).filter(w => w.studentId === sid);
    const workouts    = cycleFilter ? allWorkouts.filter(w => w.cycle === cycleFilter) : allWorkouts;
    const sessions    = (await db.getAll('sessions')).filter(s => s.studentId === sid && s.status === 'completed');
    const bf          = (await db.getAll('biofeedback')).filter(b => b.studentId === sid);
    const assessments = (await db.getAll('assessments')).filter(a => a.studentId === sid);

    // ── Stats ──
    const recent10  = bf.slice(-10);
    const avgPse    = recent10.length ? (recent10.reduce((t,b)=>t+(b.pse||0),0)/recent10.length).toFixed(1) : '-';
    const avgSleep  = recent10.length ? (recent10.reduce((t,b)=>t+(b.sleep||0),0)/recent10.length).toFixed(1) : '-';
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

    // ── Resumo de treinos — deduplica por nome+ciclo, mostra só únicas ──
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

    // ── Parecer ──
    const pseNum   = parseFloat(avgPse)||0;
    const sleepNum = parseFloat(avgSleep)||0;
    let parecerAluno = '';
    if (pseNum > 8)      parecerAluno += 'Atenção: seus treinos estão muito intensos. Vamos ajustar o ritmo para garantir boa recuperação. ';
    else if (pseNum > 6) parecerAluno += 'Você está treinando na intensidade ideal! Continue assim. ';
    else                 parecerAluno += 'Boa consistência! Temos margem para evoluir a intensidade gradualmente. ';
    if (sleepNum > 0 && sleepNum < 6)    parecerAluno += 'O sono está abaixo do ideal — priorize 7 a 9 horas para maximizar os resultados. ';
    else if (sleepNum >= 7)              parecerAluno += 'Ótima qualidade de sono! Isso acelera muito a recuperação e os ganhos. ';
    if (sessions.length > 0)            parecerAluno += `Parabéns pelas ${sessions.length} sessão(ões) concluídas! A consistência é o maior segredo dos resultados. `;
    parecerAluno += totalLoad > 2000 ? 'A carga acumulada está elevada — estamos monitorando de perto.' : 'Sua carga de treino está dentro do esperado.';

    let parecerTecnico = '';
    if (pseNum > 8)      parecerTecnico += 'PSE média elevada (>8): possível fadiga acumulada. Recomendar redução de volume 20–30% ou semana de deload. ';
    else if (pseNum > 6) parecerTecnico += 'PSE em nível adequado. Progressão viável nas próximas semanas. ';
    else                 parecerTecnico += 'PSE baixa — espaço para aumento de carga ou densidade. ';
    if (sleepNum > 0 && sleepNum < 6) parecerTecnico += 'Sono comprometido: orientar higiene do sono. ';
    if (totalLoad > 2000)             parecerTecnico += 'Carga acumulada significativa — monitorar sinais de overreaching (queda de performance, irritabilidade, FC elevada em repouso).';

    // ── Capturar gráficos por ID (não por posição) ──
    const chartIds = [
      { id: 'wellnessChart',  title: 'Evolução do Bem-estar',      desc: 'Sono (roxo), TQR (verde), Estresse (amarelo), Dor (verm.), Motivação (azul), Alimentação (laranja).' },
      { id: 'loadChart',      title: 'Carga de Treino Semanal',     desc: 'Carga semanal = PSE × Duração. Aumentos graduais de ~10%/semana são ideais para progressão sem risco.' },
      { id: 'pseChart',       title: 'PSE por Sessão',              desc: 'Percepção Subjetiva de Esforço (1–10). Zona ideal para hipertrofia: 6–8. Acima de 8 por 3+ sessões seguidas = atenção à fadiga.' },
      { id: 'radarChart',     title: 'Radar de Wellness',           desc: 'Média dos últimos 5 check-ins. Quanto maior a área, melhor o estado geral. Pontas "encolhidas" indicam itens a melhorar.' },
      { id: 'freqChart',      title: 'Frequência Semanal',          desc: 'Sessões realizadas por semana. Consistência ≥3x/semana é fundamental para resultados duradouros.' },
      { id: 'measuresChart',  title: 'Evolução de Medidas Corporais', desc: 'Tendência de peso e % de gordura ao longo das avaliações físicas.' },
      { id: 'kcalChart',      title: 'Gasto Calórico',              desc: 'Estimativa de calorias gastas por sessão ao longo do tempo.' },
      { id: 'densityChart',   title: 'Densidade de Treino',         desc: 'Relação entre Volume (kg) e Duração (min) das sessões.' },
      { id: 'cycleDiffChart', title: 'Comparação de Períodos',      desc: 'Comparação entre a primeira e segunda metade dos dados coletados. Melhoras aparecem como barras verdes maiores.' },
    ];

    let chartsHTML = '';
    chartIds.forEach(({ id, title, desc }) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      try {
        const img = canvas.toDataURL('image/png');
        // Verificar se o canvas tem conteúdo real (não está em branco)
        if (img === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') return;
        chartsHTML += `
          <div class="chart-block">
            <h3>${title}</h3>
            <p class="chart-desc">${desc}</p>
            <img src="${img}" />
          </div>`;
      } catch(e) { /* canvas vazio ou sem dados */ }
    });

    // ── Gerar PDF via Blob URL (evita bloqueio de popup no Brave/Chrome) ──
    const format = document.getElementById('pdfFormatSel')?.value || 'mobile';
    const isDark = true; // Always dark theme for PDF
    
    // Forçando tema baseado no formato
    const pdfBg = isDark ? '#0b0f19' : '#ffffff';
    const pdfText = isDark ? '#f1f5f9' : '#111827';
    const pdfSubText = isDark ? '#94a3b8' : '#4b5563';
    const pdfCardBg = isDark ? '#111827' : '#f3f4f6';
    const pdfBorder = isDark ? '#1f2937' : '#e5e7eb';
    const pdfTableEven = isDark ? '#111827' : '#f9fafb';
    const pdfTableTh = isDark ? '#1f2937' : '#e5e7eb';
    
    const pageConfig = format === 'mobile' 
      ? '@page { size: 420px 850px; margin: 0; } body { width: 420px; padding: 24px 20px; } .stats { grid-template-columns: repeat(3, 1fr); gap: 6px; } .charts-grid { grid-template-columns: 1fr; }'
      : '@page { size: A4 portrait; margin: 0; } body { max-width: 800px; padding: 40px; } .stats { grid-template-columns: repeat(6, 1fr); gap: 10px; } .charts-grid { grid-template-columns: 1fr 1fr; }';

      const customAnnotations = document.getElementById('pdfAnnotations')?.value || '';

      const htmlContent = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>Dossiê — ${student.name}</title>
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

        /* Secções */
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

        /* Gráficos */
        .chart-block { margin: 16px 0; page-break-inside: avoid; }
        .chart-block h3 { font-size: 13px; color: #10b981; margin-bottom: 2px; font-weight: 700; }
        .chart-block .chart-desc { font-size: 10px; color: ${pdfSubText}; margin: 0 0 7px; line-height: 1.4; }
        .chart-block img { max-width: 100%; height: auto; border: 1px solid ${pdfBorder}; border-radius: 6px; }
        .charts-grid { display: grid; gap: 14px; }
        .chart-full { grid-column: 1 / -1; }

        /* Footer */
        .footer { text-align: center; font-size: 10px; color: ${pdfSubText}; margin-top: 32px; border-top: 1px solid ${pdfBorder}; padding-top: 10px; }

        /* Nota de rodapé */
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
        <h1>Personal PRO — Dossiê de Performance</h1>
        <p class="doc-subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} por ${trainerName}</p>
      </div>

      <div class="student-block">
        <div class="avatar">${student.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
        <div class="student-info">
          <h2>${student.name}</h2>
          <p>${student.code || ''} · Objetivo: ${student.goal || '-'} · ${student.age || (student.birthDate ? new Date().getFullYear() - new Date(student.birthDate).getFullYear() : '-')} anos</p>
          <span class="cycle-tag">${cycleFilter || 'Todos os Ciclos'}</span>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-val">${uniqueWorkouts.length}</div><div class="stat-lbl">Treinos Prescritos</div></div>
        <div class="stat"><div class="stat-val">${sessions.length}</div><div class="stat-lbl">Sessões Realizadas</div></div>
        <div class="stat"><div class="stat-val" style="color:${pseNum>8?'#ef4444':pseNum>6?'#f59e0b':'#10b981'}">${avgPse}</div><div class="stat-lbl">PSE Média</div></div>
        <div class="stat"><div class="stat-val" style="color:${sleepNum>0&&sleepNum<6?'#ef4444':sleepNum>=7?'#10b981':'#f59e0b'}">${avgSleep}</div><div class="stat-lbl">Sono Médio</div></div>
        <div class="stat"><div class="stat-val" style="color:${parseFloat(avgTqr||0)<5?'#ef4444':parseFloat(avgTqr||0)<7?'#f59e0b':'#10b981'}">${avgTqr||'-'}</div><div class="stat-lbl">TQR Médio</div></div>
        <div class="stat"><div class="stat-val">${Math.round(totalLoad)}</div><div class="stat-lbl">Carga Total</div></div>
      </div>

      <h2>Resumo para o Aluno</h2>
      <p class="section-desc">Análise em linguagem acessível sobre seu progresso.</p>
      <div class="parecer">${parecerAluno}</div>

      <h2>Análise Técnica</h2>
      <p class="section-desc">Avaliação baseada nos indicadores de carga e bem-estar coletados.</p>
      <div class="tecnico">${parecerTecnico}</div>

      ${customAnnotations ? `
      <h2>Anotações do Treinador</h2>
      <p class="section-desc">Observações e orientações personalizadas adicionadas neste relatório.</p>
      <div class="tecnico" style="border-left-color: #f59e0b;">${customAnnotations.replace(/\n/g, '<br>')}</div>
      ` : ''}

      ${sessions.length ? `
      <h2>Sessões Realizadas</h2>
      <p class="section-desc">${sessions.length} sessão(ões) · Volume total: ${totalVol.toLocaleString('pt-BR')} kg · Média/sessão: ${sessions.length ? Math.round(totalVol / sessions.length).toLocaleString('pt-BR') : 0} kg · Duração média: ${avgDuration}min</p>
      <table>
        <thead><tr>
          <th>Data</th><th>Treino</th><th>Dur.</th><th>Volume</th><th>Séries</th>
          <th>PSE</th><th>TQR pós</th><th>RIR méd.</th><th>Kcal est.</th><th>Densidade</th>
        </tr></thead>
        <tbody>
          ${sessions.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20).map(se=>{
            const durMin  = se.totalDuration ? Math.round(se.totalDuration/60) : 0;
            const vol     = se.totalVolume ? Math.round(se.totalVolume) : 0;
            const pse     = se.postBiofeedback?.pse || '-';
            const tqrPost = se.postBiofeedback?.tqrPost || '-';
            // RIR médio das séries
            const setLog  = se.setLog || [];
            const rirSets = setLog.filter(s => s.rir != null);
            const avgRir  = rirSets.length ? Math.round(rirSets.reduce((t,s)=>t+(s.rir||0),0)/rirSets.length*10)/10 : '-';
            // Calorias estimadas (MET musculação × peso)
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
                exSummary.push(`${ex.name} (${setsForEx.length}x máx ${maxLoad}kg)`);
              }
            });
            const summaryStr = exSummary.join(' • ');

            return `<tr>
              <td>${new Date(se.date).toLocaleDateString('pt-BR')}</td>
              <td><strong>${se.workoutName||'-'}</strong></td>
              <td>${durMin?durMin+'min':'-'}</td>
              <td>${vol?vol+' kg':'-'}</td>
              <td>${se.totalSets||'-'}</td>
              <td style="color:${pseColor};font-weight:600">${pse}</td>
              <td>${tqrPost}/10</td>
              <td>${avgRir}</td>
              <td>${kcalEst!=='-'?kcalEst+'kcal':'-'}</td>
              <td style="font-size:10px;color:#888">${dens!=='-'?dens+' kg/min':'-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : ''}

      ${progressionItems.length ? `
      <h2>Progressão de Carga por Exercício</h2>
      <p class="section-desc">Evolução da carga registrada ao longo das sessões. A sobrecarga progressiva é o principal motor do ganho de força e hipertrofia.</p>
      <table>
        <thead><tr><th>Exercício</th><th>1ª Carga</th><th>Última Carga</th><th>Máximo</th><th>Δ Carga</th><th>Evolução</th><th>Vol. Total</th></tr></thead>
        <tbody>
          ${progressionItems.map(p=>`
            <tr>
              <td><strong>${p.name}</strong></td>
              <td style="color:#888">${p.first.load}kg</td>
              <td style="font-weight:700">${p.last.load}kg</td>
              <td style="color:#f59e0b;font-weight:600">${p.maxLoad}kg</td>
              <td style="color:${p.delta>=0?'#10b981':'#ef4444'};font-weight:700">${p.delta>0?'+':''}${p.delta}kg</td>
              <td style="color:${p.delta>=0?'#10b981':'#ef4444'};font-weight:700">${p.delta>0?'↑':'↓'} ${Math.abs(p.pct)}%</td>
              <td style="color:#666">${(p.totalVol/1000).toFixed(1)}t</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}

      ${chartsHTML ? `
      <h2>Gráficos de Evolução</h2>
      <p class="section-desc">Visualização dos indicadores coletados. Leia as descrições para interpretar cada gráfico.</p>
      <div class="charts-grid">${chartsHTML}</div>` : ''}

      <div class="footer">
        Dossiê gerado por ${trainerName} — ${new Date().toLocaleDateString('pt-BR')} — Personal PRO · Sistema Profissional de Treinamento
      </div>
    </body></html>`;

    newWin.document.open();
    newWin.document.write(htmlContent);
    newWin.document.close();
    notify.success('PDF aberto em uma nova guia! Use Ctrl+P (ou ⌘+P) para salvar.');
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
  const workouts = cycleFilter ? allWorkouts.filter(w => w.macrocycleId === cycleFilter || w.cycle === cycleFilter) : allWorkouts;
  const workoutIds = new Set(workouts.map(w => w.id));

  const allSessions = (await db.getAll('sessions')).filter(s => s.studentId === studentId);
  const sessions = cycleFilter ? allSessions.filter(s => workoutIds.has(s.workoutId)) : (startDate ? allSessions.filter(s => new Date(s.date) >= startDate && new Date(s.date) <= endDate) : allSessions);

  const allBf = (await db.getAll('biofeedback')).filter(b => b.studentId === studentId).sort((a, b) => new Date(a.date) - new Date(b.date));
  const bf = cycleFilter ? allBf.filter(b => sessions.some(s => new Date(s.date).toDateString() === new Date(b.date).toDateString())) : (startDate ? allBf.filter(b => new Date(b.date) >= startDate && new Date(b.date) <= endDate) : allBf);

  const allAss = (await db.getAll('assessments')).filter(a => a.studentId === studentId);
  const assessments = startDate ? allAss.filter(a => new Date(a.date) >= startDate && new Date(a.date) <= endDate) : allAss;

  const sortedSes = [...sessions].filter(s => s.status === 'completed').sort((a,b) => new Date(a.date) - new Date(b.date));
  const student = await db.get('students', studentId);
  const co = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, scales: { y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } };
  const chartsInstance = {};

  const btnAI = document.getElementById('btnGenerateAI');
  const txtAI = document.getElementById('aiInsightText');
  const resAI = document.getElementById('aiInsightResult');
  if (btnAI && txtAI && resAI) {
    btnAI.addEventListener('click', async () => {
      btnAI.disabled = true;
      btnAI.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;margin-right:8px"></div> <span>Gerando análise...</span>';
      resAI.style.display = 'block';
      txtAI.innerHTML = 'A Inteligência Artificial está analisando suas métricas de sono, volume e esforço...';
      
      try {
        const aiText = await generateAIInsight(student, sortedSes, bf, 7);
        txtAI.innerHTML = `<strong>Insight de Ouro ✨:</strong><br/><br/>${aiText.replace(/\\n/g, '<br/>')}`;
        btnAI.style.display = 'none'; // hide after success
      } catch(err) {
        txtAI.innerHTML = `<span style="color:var(--danger)">Erro: ${err.message}</span>`;
        btnAI.innerHTML = '<span>Tentar novamente</span>';
        btnAI.disabled = false;
      }
    });
  }

  // Wellness chart — filtrar apenas registros que têm dados de bem-estar (não só PSE do tracker)
  const wCtx = document.getElementById('wellnessChart');
  const bfWellness = bf.filter(b => b.sleep || b.mood || b.energy || b.stress || b.pain || b.motivation || b.food);
  if (wCtx && bfWellness.length > 1) {
    new Chart(wCtx, {
      type: 'line',
      data: {
        labels: bfWellness.map(b => Calc.formatDate(b.date).slice(0,5)),
        datasets: [
          { label: 'Sono',       data: bfWellness.map(b => b.sleep  || null), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.05)', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true },
          { label: 'TQR',      data: bfWellness.map(b => b.tqr ?? b.energy ?? null), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.05)', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true },
          { label: 'Estresse (↓=melhor)', data: bfWellness.map(b => b.stress || null), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.05)', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true, borderDash: [5,3] },
          { label: 'Dor', data: bfWellness.map(b => b.pain || null), borderColor: '#ef4444', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true, borderDash: [2,2] },
          { label: 'Motivação', data: bfWellness.map(b => b.motivation || null), borderColor: '#3b82f6', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true },
          { label: 'Alimentação', data: bfWellness.map(b => b.food || null), borderColor: '#f97316', tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true },
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
    wCtx.parentElement.innerHTML = '<p class="text-muted text-sm text-center" style="padding:40px">Sem dados de bem-estar suficientes. Registre check-ins de biofeedback com sono, disposição e energia.</p>';
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
      labels: ['Sono', 'TQR', 'Motivação', 'Alimentação', 'Baixo Estresse'],
      datasets: [{ label: 'Média (últimos 5)', data: [
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
    new Chart(fCtx, { type: 'bar', data: { labels: wKeys.map(k => new Date(k + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), datasets: [{ label: 'Sessões', data: wKeys.map(k => wc[k]), backgroundColor: 'rgba(6,182,212,0.5)', borderColor: '#06b6d4', borderWidth: 1, borderRadius: 4 }] }, options: { ...co, plugins: { legend: { display: false } }, scales: { ...co.scales, y: { ...co.scales.y, beginAtZero: true, ticks: { ...co.scales.y.ticks, stepSize: 1 } } } } });
  }

  const mCtx = document.getElementById('measuresChart');
  if (mCtx && assessments.length > 1) {
    const sorted = [...assessments].sort((a, b) => new Date(a.date) - new Date(b.date));
    const ds = [];
    if (sorted.some(a => a.peso)) ds.push({ label: 'Peso (kg)', data: sorted.map(a => a.peso || null), borderColor: '#10b981', tension: 0.3, yAxisID: 'y' });
    if (sorted.some(a => a.percentualGordura)) ds.push({ label: 'BF %', data: sorted.map(a => a.percentualGordura || null), borderColor: '#f59e0b', tension: 0.3, yAxisID: 'y1' });
    if (ds.length) new Chart(mCtx, { type: 'line', data: { labels: sorted.map(a => Calc.formatDate(a.date)), datasets: ds }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { y: { position: 'left', ticks: { color: '#10b981' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y1: { position: 'right', ticks: { color: '#f59e0b' }, grid: { display: false } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } } });
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

  // ── GRÁFICO DE PROGRESSÃO DE CARGA ──
  const lpCtx = document.getElementById('loadProgressChart');
  if (lpCtx && sessions.length >= 2) {
    // Pegar os top 3 exercícios mais treinados para o gráfico de linha
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
      // Coletar todas as datas únicas ordenadas para usar como labels (evita adaptador de data)
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
          { label: `Período 1 (${first.length} registros)`, data: firstData, backgroundColor: 'rgba(148,163,184,0.5)', borderColor: '#94a3b8', borderWidth: 1, borderRadius: 4 },
          { label: `Período 2 (${second.length} registros)`, data: secondData, backgroundColor: 'rgba(16,185,129,0.6)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 },
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
                const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
                const sign = diff > 0 ? '+' : '';
                return `Variação: ${arrow} ${sign}${diff.toFixed(1)}`;
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
    const getBaseWorkoutName = name => {
      if (!name) return 'Treino Avulso';
      return name.replace(/\s*—\s*Sem\s*\d+/i, '').replace(/\s*-\s*Semana\s*\d+/i, '').replace(/\s*Sem\s*\d+/i, '').trim();
    };

    const workoutsByName = {};
    sortedSes.forEach(s => {
      if (!s.workoutName) return;
      const base = getBaseWorkoutName(s.workoutName);
      if (!workoutsByName[base]) workoutsByName[base] = [];
      workoutsByName[base].push(s);
    });

    const drawCompareChart = () => {
      const base = compSel.value;
      const sessList = (workoutsByName[base] || []).sort((a,b) => new Date(a.date) - new Date(b.date));

      if (compareChart) compareChart.destroy();
      
      const labels = sessList.map(s => {
        const dStr = Calc.formatDate(s.date).slice(0,5);
        const wkMatch = s.workoutName?.match(/Sem\s*(\d+)/i);
        return wkMatch ? `Sem ${wkMatch[1]} (${dStr})` : dStr;
      });

      compareChart = new Chart(compCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Volume Total (kg)',
              data: sessList.map(s => (s.setLog||[]).reduce((t,x)=>t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0)),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.05)',
              tension: 0.3,
              yAxisID: 'y',
              fill: true,
              pointRadius: 4
            },
            {
              label: 'PSE (Borg)',
              data: sessList.map(s => s.postBiofeedback?.pse || s.pse || null),
              borderColor: '#ef4444',
              tension: 0.3,
              yAxisID: 'y1',
              borderDash: [5, 3],
              pointRadius: 4
            }
          ]
        },
        options: {
          ...co,
          scales: {
            x: co.scales.x,
            y: {
              position: 'left',
              title: { display: true, text: 'Volume (kg)', color: '#94a3b8', font: {size: 10} },
              ticks: { color: '#6366f1', font: {size: 10} },
              grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y1: {
              position: 'right',
              title: { display: true, text: 'PSE', color: '#94a3b8', font: {size: 10} },
              ticks: { color: '#ef4444', font: {size: 10}, min: 0, max: 10 },
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
    container.innerHTML = '<p class="text-muted text-sm">Nenhuma periodização encontrada para este aluno.</p>';
    return;
  }
  
  let active = selectedMacroId ? macros.find(m => m.id === selectedMacroId) : (macros.find(m => m.status === 'active') || macros[0]);
  
  const currentWeek = Math.ceil((Date.now() - new Date(active.startDate).getTime()) / (7 * 86400000));
  
  container.innerHTML = `
    <div style="margin-bottom:12px">
      <select class="form-select" id="reportMacroSelect" style="max-width:300px;font-size:0.85rem">
        ${macros.map(m => `<option value="${m.id}" ${m.id === active.id ? 'selected' : ''}>${m.name} (${new Date(m.startDate).toLocaleDateString('pt-BR')})</option>`).join('')}
      </select>
    </div>
    ${active.weeks ? `
    <div class="text-sm text-muted mb-sm"><strong>${active.name}</strong> · ${active.totalWeeks} semanas · Início: ${new Date(active.startDate).toLocaleDateString('pt-BR')}</div>
    <div class="week-timeline" style="min-height:60px">
      ${active.weeks.map((w, i) => {
        const intColor = w.phase === 'deload' ? '#3b82f6' : w.intensityPct >= 85 ? '#ef4444' : w.intensityPct >= 75 ? '#f97316' : w.intensityPct >= 65 ? '#eab308' : '#22c55e';
        return `<div class="week-block ${i + 1 === currentWeek ? 'week-current' : ''}" style="border-bottom:3px solid ${intColor}" title="Sem ${w.week}: ${w.label} — Vol: ${w.volumePct}% | Int: ${w.intensityPct}%">
          <div class="week-num" style="color:${intColor}">S${w.week}</div>
          <div class="week-bar-int" style="height:${w.intensityPct * 0.4}px;background:${intColor}"></div>
        </div>`;
      }).join('')}
    </div>
    <div class="flex gap-md mt-sm text-xs text-muted" style="flex-wrap:wrap">
      <span style="color:#22c55e">● Leve</span>
      <span style="color:#eab308">● Moderada</span>
      <span style="color:#f97316">● Alta</span>
      <span style="color:#ef4444">● Muito Alta</span>
      <span style="color:#3b82f6">● Deload</span>
    </div>` : '<p class="text-xs text-muted">Macrociclo sem semanas definidas.</p>'}
  `;

  document.getElementById('reportMacroSelect')?.addEventListener('change', (e) => {
    loadPeriodizationForReport(studentId, e.target.value);
  });
}
