// ========================================
// PERSONAL PRO — Reports Page (v4)
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { notify } from '../components/toast.js';
import { analyzeBiofeedback, overallStatus, trainingRecommendation } from '../utils/alerts.js';

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
        <button class="btn btn-primary btn-sm" id="exportPdfBtn" style="display:none">Gerar PDF</button>
      </div>
    </div>
    <div id="reportContent">
      <div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Selecione um aluno</h3><p class="text-muted">Escolha um aluno para ver o relatório completo</p></div>
    </div>
  `;
}

async function getStudentCycles(studentId) {
  const workouts = await db.getAll('workouts');
  const sessions = await db.getAll('sessions');

  const studentWorkouts = workouts.filter(w => String(w.studentId) === String(studentId));
  const studentSessions = sessions.filter(s => String(s.studentId) === String(studentId));

  console.log("👉 Treinos do aluno:", studentWorkouts);
  console.log("👉 Sessões concluídas:", studentSessions);

  const cycles = [...new Set([
    ...studentWorkouts.map(w => w.cycle || w.ciclo || w.mesocycle || w.fase),
    ...studentSessions.map(s => s.cycle || s.ciclo || s.mesocycle || s.fase)
  ].filter(Boolean))];

  console.log("👉 Ciclos encontrados:", cycles);

  return cycles.sort();
}

async function renderStudentReport(studentId, cycleFilter = '') {
  const student = await db.get('students', studentId);
  if (!student) return '';

  const allWorkouts = (await db.getAll('workouts')).filter(w => String(w.studentId) === String(studentId));
  const workouts = cycleFilter ? allWorkouts.filter(w => (w.cycle || w.ciclo || w.mesocycle || w.fase) === cycleFilter) : allWorkouts;

  let sessions = (await db.getAll('sessions')).filter(s => String(s.studentId) === String(studentId));
  if (cycleFilter) {
    const nomesTreinosDoCiclo = workouts.map(w => w.name);
    sessions = sessions.filter(s =>
      (s.cycle || s.ciclo || s.mesocycle || s.fase) === cycleFilter ||
      nomesTreinosDoCiclo.includes(s.workoutName)
    );
  }

  const bf = (await db.getAll('biofeedback')).filter(b => String(b.studentId) === String(studentId)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const assessments = (await db.getAll('assessments')).filter(a => String(a.studentId) === String(studentId));
  const completed = sessions.filter(s => s.status === 'completed');
  const recent10 = bf.slice(-10);
  const avgPse = recent10.length ? (recent10.reduce((s, b) => s + (b.pse || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgSleep = recent10.length ? (recent10.reduce((s, b) => s + (b.sleep || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgMood = recent10.length ? (recent10.reduce((s, b) => s + (b.mood || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgEnergy = recent10.length ? (recent10.reduce((s, b) => s + (b.energy || 0), 0) / recent10.length).toFixed(1) : '-';
  const totalLoad = bf.reduce((s, b) => s + (b.trainingLoad || 0), 0);

  const pseNum = parseFloat(avgPse) || 0;
  const sleepNum = parseFloat(avgSleep) || 0;
  const cycleLabel = cycleFilter || 'Todos os Ciclos';

  let parecerAluno = '';
  if (pseNum > 8) parecerAluno += 'Atenção: Seus treinos estão muito intensos! Vamos reduzir um pouco o ritmo para seu corpo se recuperar melhor. ';
  else if (pseNum > 6) parecerAluno += 'Você está treinando no nível ideal! Continue assim, seu corpo está respondendo muito bem. ';
  else parecerAluno += 'Você ainda tem bastante fôlego! Podemos aumentar a intensidade gradualmente. ';
  if (sleepNum < 6) parecerAluno += 'Seu sono está abaixo do ideal — tente dormir entre 7 e 9 horas para otimizar seus resultados. ';
  else if (sleepNum >= 7) parecerAluno += 'Ótimo sono! Isso ajuda muito na recuperação e nos ganhos. ';
  if (completed.length > 0) parecerAluno += `Parabéns! Você completou ${completed.length} sessão(ões) no período. `;
  if (totalLoad > 2000) parecerAluno += 'Sua carga acumulada está alta — estamos monitorando para evitar excesso.';
  else parecerAluno += 'Sua carga está dentro do esperado. Tudo sob controle!';

  let parecerTecnico = '';
  if (pseNum > 8) parecerTecnico += 'PSE média elevada (>8), indicando possível fadiga acumulada. Recomenda-se reduzir volume em 20-30%. ';
  else if (pseNum > 6) parecerTecnico += 'PSE em nível adequado para progressão. Aluno responde bem ao estímulo. ';
  else parecerTecnico += 'PSE baixa, margem para aumento progressivo de intensidade. ';
  if (sleepNum < 6) parecerTecnico += 'Sono comprometido — orientar higiene do sono. ';
  if (totalLoad > 2000) parecerTecnico += 'Carga acumulada significativa. Monitorar sinais de overreaching.';

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

  const totalVolAllSessions = completed.reduce((t, s) => t + Math.round(s.totalVolume || 0), 0);
  const avgVolPerSession    = completed.length ? Math.round(totalVolAllSessions / completed.length) : 0;
  const maxVolSession       = completed.length ? Math.max(...completed.map(s => Math.round(s.totalVolume || 0))) : 0;
  const avgDuration         = completed.length ? Math.round(completed.reduce((t, s) => t + (s.totalDuration || 0), 0) / completed.length / 60) : 0;

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

    <div class="card mb-lg" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title">Periodização Atual</span></div>
      <p class="text-xs text-muted mb-sm">Macrociclo ativo com distribuição de volume e intensidade.</p>
      <div id="reportPeriodization"></div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card">
        <div class="card-header"><span class="card-title">Evolução do Bem-estar</span></div>
        <p class="text-xs text-muted mb-sm">Gráfico de linhas mostrando as variáveis de bem-estar ao longo do tempo. <strong>Sono</strong> (roxo), <strong>Disposição</strong> (verde), <strong>Energia</strong> (azul) e <strong>Estresse</strong> (amarelo tracejado).</p>
        <div style="height:280px;position:relative"><canvas id="wellnessChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Carga de Treino Semanal</span></div>
        <p class="text-xs text-muted mb-sm">Volume de carga semanal calculado como <strong>PSE × Duração (min)</strong>.</p>
        <div style="height:280px;position:relative"><canvas id="loadChart"></canvas></div>
      </div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card">
        <div class="card-header"><span class="card-title">PSE por Sessão</span></div>
        <p class="text-xs text-muted mb-sm">Percepção Subjetiva de Esforço (escala 1-10).</p>
        <div style="height:250px;position:relative"><canvas id="pseChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Radar de Wellness</span></div>
        <p class="text-xs text-muted mb-sm">Média dos últimos 5 check-ins. Quanto mais expandido o radar, melhor.</p>
        <div style="height:250px;position:relative"><canvas id="radarChart"></canvas></div>
      </div>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Comparação entre Ciclos</span></div>
      <p class="text-xs text-muted mb-sm">Mostra a <strong>média de cada indicador</strong> dividida por período (primeira metade vs segunda metade).</p>
      <div style="height:280px;position:relative"><canvas id="cycleDiffChart"></canvas></div>
    </div>

    ${assessments.length ? `
    <div class="card mb-lg"><div class="card-header"><span class="card-title">Evolução de Medidas Corporais</span></div>
      <p class="text-xs text-muted mb-sm">Acompanhamento de peso corporal e percentual de gordura.</p>
      <div style="height:280px;position:relative"><canvas id="measuresChart"></canvas></div>
    </div>` : ''}

    <div class="grid-2 mb-lg">
      <div class="card"><div class="card-header"><span class="card-title">Frequência — Últimas 8 Semanas</span></div>
        <p class="text-xs text-muted mb-sm">Sessões realizadas por semana. A <strong>consistência</strong> é o mais importante.</p>
        <div style="height:220px;position:relative"><canvas id="freqChart"></canvas></div>
      </div>
      <div class="card"><div class="card-header"><span class="card-title">Alertas Recentes</span></div>
        <p class="text-xs text-muted mb-sm">Resumo dos últimos check-ins de biofeedback.</p>
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
    if (pdfBtn) pdfBtn.style.display = sid ? '' : 'none';
    if (cycleSel) cycleSel.style.display = sid ? '' : 'none';
    const waBtn = document.getElementById('exportWaBtn');
    if (waBtn) waBtn.style.display = sid ? '' : 'none';

    if (!sid) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">—</div><h3>Selecione um aluno</h3></div>';
      return;
    }

    const cycles = await getStudentCycles(sid);
    if (cycleSel) {
      cycleSel.innerHTML = '<option value="">Todos os ciclos</option>' + cycles.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    content.innerHTML = await renderStudentReport(sid);
    initReportCharts(sid);
    loadPeriodizationForReport(sid);
  });

  cycleSel?.addEventListener('change', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    const content = document.getElementById('reportContent');
    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    content.innerHTML = await renderStudentReport(sid, cycleSel.value);
    initReportCharts(sid);
  });

  document.getElementById('exportWaBtn')?.addEventListener('click', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    const student  = await db.get('students', sid);
    if (!student?.phone) { notify.warning('Aluno sem telefone cadastrado'); return; }
    const sessions = (await db.getAll('sessions')).filter(s => String(s.studentId) === String(sid) && s.status === 'completed');
    const bf       = (await db.getAll('biofeedback')).filter(b => String(b.studentId) === String(sid));
    const recent10 = bf.slice(-10);
    const avgPse   = recent10.length ? (recent10.reduce((t,b)=>t+(b.pse||0),0)/recent10.length).toFixed(1) : '-';
    const avgSleep = recent10.length ? (recent10.reduce((t,b)=>t+(b.sleep||0),0)/recent10.length).toFixed(1) : '-';
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
      `• PSE médio: ${avgPse}/10`,
      ``,
      `✅ Continue assim! Resultados consistentes vêm da consistência nos treinos e no descanso.`,
      ``,
      `_Relatório gerado pelo Personal PRO_`,
    ].join('\n');
    const phone = student.phone.replace(/\D/g,'');
    window.open(`https://wa.me/${phone.startsWith('55')?phone:'55'+phone}?text=${encodeURIComponent(msg)}`, '_blank');
  });

  pdfBtn?.addEventListener('click', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    const student = await db.get('students', sid);
    if (!student) return;
    const cycleFilter = cycleSel?.value || '';
    const settings    = await db.get('settings', 'trainer') || {};
    const trainerName = settings?.trainerName || 'Personal PRO';

    const pdfArea = document.getElementById('pdfArea');
    if (!pdfArea) { notify.error('Carregue o relatório primeiro'); return; }

    const allWorkouts = (await db.getAll('workouts')).filter(w => String(w.studentId) === String(sid));
    const workouts    = cycleFilter ? allWorkouts.filter(w => (w.cycle||w.ciclo||w.mesocycle||w.fase) === cycleFilter) : allWorkouts;
    const sessions    = (await db.getAll('sessions')).filter(s => String(s.studentId) === String(sid) && s.status === 'completed');
    const bf          = (await db.getAll('biofeedback')).filter(b => String(b.studentId) === String(sid));
    const assessments = (await db.getAll('assessments')).filter(a => String(a.studentId) === String(sid));

    const recent10  = bf.slice(-10);
    const avgPse    = recent10.length ? (recent10.reduce((t,b)=>t+(b.pse||0),0)/recent10.length).toFixed(1) : '-';
    const avgSleep  = recent10.length ? (recent10.reduce((t,b)=>t+(b.sleep||0),0)/recent10.length).toFixed(1) : '-';
    const totalLoad = bf.reduce((t,b)=>t+(b.trainingLoad||0),0);
    const totalVol  = sessions.reduce((t,s)=>t+Math.round(s.totalVolume||0),0);
    
    const avgVolPerSession = sessions.length ? Math.round(totalVol / sessions.length) : 0;
    const avgDuration = sessions.length ? Math.round(sessions.reduce((t, s) => t + (s.totalDuration || 0), 0) / sessions.length / 60) : 0;

    const uniqueWorkouts = [];
    const seen = new Set();
    workouts.forEach(w => {
      const key = `${w.cycle||'Geral'}__${w.name}`;
      if (!seen.has(key)) { seen.add(key); uniqueWorkouts.push(w); }
    });

    const pseNum   = parseFloat(avgPse)||0;
    const sleepNum = parseFloat(avgSleep)||0;
    let parecerAluno = '';
    if (pseNum > 8)      parecerAluno += 'Atenção: seus treinos estão muito intensos. Vamos ajustar o ritmo para garantir boa recuperação. ';
    else if (pseNum > 6) parecerAluno += 'Você está treinando na intensidade ideal! Continue assim. ';
    else                 parecerAluno += 'Boa consistência! Temos margem para evoluir a intensidade gradualmente. ';
    if (sleepNum > 0 && sleepNum < 6)    parecerAluno += 'O sono está abaixo do ideal — priorize 7 a 9 horas para maximizar os resultados. ';
    else if (sleepNum >= 7)              parecerAluno += 'Ótima qualidade de sono! Isso acelera muito a recuperação e os ganhos. ';
    if (sessions.length > 0)            parecerAluno += `Parabéns pelas ${sessions.length} sessão(ões) concluídas! A consistência é o maior segredo dos resultados. `;

    let parecerTecnico = '';
    if (pseNum > 8)      parecerTecnico += 'PSE média elevada (>8): possível fadiga acumulada. Recomendar redução de volume 20–30% ou semana de deload. ';
    else if (pseNum > 6) parecerTecnico += 'PSE em nível adequado. Progressão viável nas próximas semanas. ';
    else                 parecerTecnico += 'PSE baixa — espaço para aumento de carga ou densidade. ';
    if (sleepNum > 0 && sleepNum < 6) parecerTecnico += 'Sono comprometido: orientar higiene do sono. ';
    if (totalLoad > 2000)             parecerTecnico += 'Carga acumulada significativa — monitorar sinais de overreaching.';

    const loadProgression = {};
    sessions.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(s => {
      (s.setLog || []).forEach(set => {
        const exName = (s.exercises || [])[set.exIdx]?.name;
        if (!exName || !set.load || set.load <= 0) return;
        if (!loadProgression[exName]) loadProgression[exName] = [];
        loadProgression[exName].push({ date: s.date, load: set.load, reps: set.reps || 0, vol: set.load * (set.reps || 1) });
      });
    });

    const progressionItems = Object.entries(loadProgression).filter(([, sets]) => sets.length >= 2).map(([name, sets]) => {
      const first = sets[0], last = sets[sets.length - 1];
      const maxLoad = Math.max(...sets.map(s => s.load)), minLoad = Math.min(...sets.map(s => s.load));
      const delta = last.load - first.load;
      const pct = first.load > 0 ? Math.round((delta / first.load) * 100) : 0;
      const totalVol = sets.reduce((t, s) => t + s.vol, 0);
      const avgReps = Math.round(sets.reduce((t, s) => t + s.reps, 0) / sets.length);
      return { name, first, last, maxLoad, minLoad, delta, pct, totalVol, avgReps, sessions: sets.length };
    }).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 8);

    const chartIds = [
      { id: 'wellnessChart',  title: 'Evolução do Bem-estar',      desc: 'Sono (roxo), Disposição (verde), Energia (azul), Estresse (amarelo tracejado).' },
      { id: 'loadChart',      title: 'Carga de Treino Semanal',     desc: 'Carga semanal = PSE × Duração. Aumentos graduais são ideais.' },
      { id: 'pseChart',       title: 'PSE por Sessão',              desc: 'Percepção Subjetiva de Esforço (1–10). Zona ideal: 6–8.' },
      { id: 'radarChart',     title: 'Radar de Wellness',           desc: 'Média dos últimos 5 check-ins.' },
      { id: 'freqChart',      title: 'Frequência Semanal',          desc: 'Sessões realizadas por semana.' },
      { id: 'measuresChart',  title: 'Evolução de Medidas Corporais', desc: 'Tendência de peso e % de gordura.' },
      { id: 'cycleDiffChart', title: 'Comparação de Períodos',      desc: 'Comparação entre a primeira e segunda metade dos dados coletados.' },
      { id: 'loadProgressChart', title: 'Progressão de Cargas',      desc: 'Evolução de cargas por exercício.' }
    ];

    let chartsHTML = '';
    chartIds.forEach(({ id, title, desc }) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      try {
        const img = canvas.toDataURL('image/png');
        if (img.length < 1000) return;
        chartsHTML += `<div class="chart-block"><h3>${title}</h3><p class="chart-desc">${desc}</p><img src="${img}" /></div>`;
      } catch(e) { }
    });

    const htmlContent = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>Dossiê — ${student.name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: 28px 36px; max-width: 820px; margin: 0 auto; font-size: 13px; line-height: 1.55; }
        .doc-header { border-bottom: 3px solid #10b981; padding-bottom: 10px; margin-bottom: 6px; }
        .doc-header h1 { font-size: 22px; color: #10b981; font-weight: 800; letter-spacing: -0.5px; }
        .doc-subtitle { font-size: 11px; color: #888; margin-top: 3px; }
        .student-block { display: flex; align-items: center; gap: 14px; background: #f0fdf8; border-radius: 8px; padding: 14px 16px; margin: 14px 0; }
        .avatar { width: 52px; height: 52px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; flex-shrink: 0; }
        .student-info h2 { font-size: 17px; color: #111; margin-bottom: 2px; }
        .student-info p { font-size: 11px; color: #666; }
        .cycle-tag { display: inline-block; background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-top: 4px; }
        .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 14px 0; }
        .stat { text-align: center; padding: 10px 6px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; }
        .stat-val { font-size: 22px; font-weight: 800; color: #10b981; }
        .stat-lbl { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        h2 { font-size: 15px; color: #10b981; margin: 20px 0 6px; border-bottom: 1px solid #d1fae5; padding-bottom: 5px; font-weight: 700; }
        .section-desc { font-size: 11px; color: #888; margin: 3px 0 10px; }
        .parecer { background: #f0fdf8; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 8px 0; font-size: 13px; line-height: 1.7; }
        .tecnico { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 8px 0; font-size: 12px; line-height: 1.6; color: #1e3a5f; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; font-size: 12px; }
        th { background: #f3f4f6; padding: 7px 10px; text-align: left; font-weight: 700; border-bottom: 2px solid #e5e7eb; font-size: 10px; text-transform: uppercase; color: #555; }
        td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        .chart-block { margin: 16px 0; page-break-inside: avoid; }
        .chart-block h3 { font-size: 13px; color: #10b981; margin-bottom: 2px; font-weight: 700; }
        .chart-block .chart-desc { font-size: 10px; color: #888; margin: 0 0 7px; line-height: 1.4; }
        .chart-block img { max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 6px; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        @media print { body { padding: 14px 18px; } .stats { gap: 5px; } .stat-val { font-size: 18px; } }
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
        <div class="stat"><div class="stat-val" style="color:${
