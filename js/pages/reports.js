// ========================================
// PERSONAL PRO — Reports Page (v4)
// Cycle selection + Student-focused dossier
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
        <select class="form-select" id="reportCycle" style="min-width:180px;display:none">
          <option value="">Todos os ciclos</option>
        </select>
        <button class="btn btn-primary" id="exportPdfBtn" style="display:none">Gerar Dossiê PDF</button>
      </div>
    </div>
    <div id="reportContent">
      <div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Selecione um aluno</h3><p class="text-muted">Escolha um aluno para ver o relatório completo</p></div>
    </div>
  `;
}

async function getStudentCycles(studentId) {
  const workouts = (await db.getAll('workouts')).filter(w => w.studentId === studentId);
  const cycles = [...new Set(workouts.map(w => w.cycle).filter(Boolean))];
  return cycles.sort();
}

async function renderStudentReport(studentId, cycleFilter = '') {
  const student = await db.get('students', studentId);
  if (!student) return '';
  const allWorkouts = (await db.getAll('workouts')).filter(w => w.studentId === studentId);
  const workouts = cycleFilter ? allWorkouts.filter(w => w.cycle === cycleFilter) : allWorkouts;
  const sessions = (await db.getAll('sessions')).filter(s => s.studentId === studentId);
  const bf = (await db.getAll('biofeedback')).filter(b => b.studentId === studentId).sort((a, b) => new Date(a.date) - new Date(b.date));
  const assessments = (await db.getAll('assessments')).filter(a => a.studentId === studentId);
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

  // Workout summary for the cycle
  const workoutSummary = workouts.map(w => {
    const exCount = (w.exercises || []).length;
    return `<div class="event-card mb-sm">
      <div class="flex items-center justify-between">
        <div><strong>${w.name}</strong> <span class="text-muted text-xs">${w.cycle || ''}</span></div>
        <span class="badge badge-info">${exCount} exercícios</span>
      </div>
      <div class="text-xs text-muted mt-xs">${Calc.formatDate(w.date)}</div>
      ${(w.exercises || []).slice(0, 4).map(e => `<span class="text-xs" style="margin-right:8px">${e.name} (${e.sets}×${e.reps})</span>`).join('')}
      ${exCount > 4 ? `<span class="text-xs text-muted">+${exCount - 4} mais</span>` : ''}
    </div>`;
  }).join('');

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
        <div class="stat-label">Treinos Prescritos</div>
        <div class="stat-value text-gradient">${workouts.length}</div>
        <div class="text-xs text-muted" style="margin-top:4px">Fichas criadas para o aluno</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sessões Realizadas</div>
        <div class="stat-value text-gradient">${completed.length}</div>
        <div class="text-xs text-muted" style="margin-top:4px">Treinos efetivamente feitos</div>
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
        <div class="stat-value text-gradient">${totalLoad}</div>
        <div class="text-xs text-muted" style="margin-top:4px">PSE × Duração acumulada</div>
      </div>
    </div>

    <div class="card mb-lg" style="border-left:3px solid var(--primary);background:rgba(16,185,129,0.03)">
      <div class="card-header"><span class="card-title">Resumo para o Aluno</span></div>
      <p class="text-xs text-muted" style="margin-bottom:8px">Este texto é escrito em linguagem acessível para que o aluno compreenda seu progresso.</p>
      <p class="text-sm" style="line-height:1.8">${parecerAluno}</p>
    </div>

    <div class="card mb-lg" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title">Análise Técnica do Treinador</span></div>
      <p class="text-xs text-muted" style="margin-bottom:8px">Análise com base nos dados coletados e indicadores de carga de treino.</p>
      <p class="text-sm" style="line-height:1.7">${parecerTecnico}</p>
    </div>

    ${workouts.length ? `
    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Treinos Prescritos no Ciclo</span></div>
      <p class="text-xs text-muted mb-md">Fichas de treino criadas pelo treinador para este período.</p>
      ${workoutSummary}
    </div>` : ''}

    <div class="card mb-lg" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title">Periodização Atual</span></div>
      <p class="text-xs text-muted mb-sm">Macrociclo ativo do aluno com distribuição de volume e intensidade ao longo das semanas.</p>
      <div id="reportPeriodization"></div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card">
        <div class="card-header"><span class="card-title">Evolução do Bem-estar</span></div>
        <p class="text-xs text-muted mb-sm">Gráfico de linhas mostrando as variáveis de bem-estar ao longo do tempo. <strong>Sono</strong> (roxo), <strong>Humor</strong> (verde), <strong>Energia</strong> (azul) e <strong>Estresse</strong> (amarelo tracejado). Valores acima de 7 indicam boa recuperação. Estresse abaixo de 5 é ideal.</p>
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
    <div class="card mb-lg"><div class="card-header"><span class="card-title">Evolução de Medidas Corporais</span></div>
      <p class="text-xs text-muted mb-sm">Acompanhamento de peso corporal e percentual de gordura ao longo das avaliações. A tendência é mais importante que valores isolados.</p>
      <div style="height:280px;position:relative"><canvas id="measuresChart"></canvas></div>
    </div>` : ''}

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
    if (pdfBtn) pdfBtn.style.display = sid ? '' : 'none';
    if (cycleSel) cycleSel.style.display = sid ? '' : 'none';

    if (!sid) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Selecione um aluno</h3></div>';
      return;
    }

    // Populate cycles
    const cycles = await getStudentCycles(sid);
    if (cycleSel) {
      cycleSel.innerHTML = '<option value="">Todos os ciclos</option>' + cycles.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    content.innerHTML = await renderStudentReport(sid);
    initReportCharts(sid);
    loadPeriodizationForReport(sid);
  });

  // Cycle filter change
  cycleSel?.addEventListener('change', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    const content = document.getElementById('reportContent');
    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
    content.innerHTML = await renderStudentReport(sid, cycleSel.value);
    initReportCharts(sid);
  });

  // PDF Export — Professional dossier
  pdfBtn?.addEventListener('click', async () => {
    const sid = document.getElementById('reportStudent')?.value;
    if (!sid) return;
    const student = await db.get('students', sid);
    if (!student) return;
    const cycleFilter = cycleSel?.value || '';
    const settings = await db.get('settings', 'trainer');
    const trainerName = settings?.trainerName || 'Personal PRO';

    const pdfArea = document.getElementById('pdfArea');
    if (!pdfArea) { notify.error('Carregue o relatório primeiro'); return; }

    // Gather data for PDF
    const allWorkouts = (await db.getAll('workouts')).filter(w => w.studentId === sid);
    const workouts = cycleFilter ? allWorkouts.filter(w => w.cycle === cycleFilter) : allWorkouts;
    const sessions = (await db.getAll('sessions')).filter(s => s.studentId === sid && s.status === 'completed');
    const bf = (await db.getAll('biofeedback')).filter(b => b.studentId === sid);

    const printWin = window.open('', '_blank');
    const charts = pdfArea.querySelectorAll('canvas');
    let chartsHTML = '';
    charts.forEach((c, i) => {
      const titles = ['Evolução do Bem-estar', 'Carga de Treino Semanal', 'PSE por Sessão', 'Radar de Wellness', 'Evolução de Medidas', 'Frequência Semanal'];
      const descs = [
        'Sono (roxo), Humor (verde), Energia (azul), Estresse (amarelo). Valores acima de 7 indicam boa recuperação.',
        'Volume de carga calculado como PSE × Duração. Aumentos graduais de ~10% por semana são ideais.',
        'Percepção Subjetiva de Esforço. Zona ideal para hipertrofia: 6-8. Acima de 8 por 3+ sessões = fadiga.',
        'Quanto mais expandido, melhor o estado geral. Áreas "encolhidas" indicam pontos de atenção.',
        'Tendência de peso corporal e % de gordura ao longo das avaliações.',
        'Sessões por semana. Mínimo recomendado: 3x/semana para resultados consistentes.'
      ];
      const img = c.toDataURL('image/png');
      chartsHTML += `<div class="chart-block"><h3>${titles[i] || 'Gráfico'}</h3><p class="chart-desc">${descs[i] || ''}</p><img src="${img}" /></div>`;
    });

    const parecer = pdfArea.querySelector('.card[style*="border-left:3px solid var(--primary)"] .text-sm')?.textContent || '';
    const tecnico = pdfArea.querySelector('.card[style*="border-left:3px solid var(--accent)"] .text-sm')?.textContent || '';

    // Session details for PDF
    let sessionTableHTML = '';
    if (sessions.length) {
      sessionTableHTML = `<h2>Sessões Realizadas</h2>
        <p class="section-desc">Registro detalhado de cada treino concluído com métricas de volume e intensidade.</p>
        <table><thead><tr><th>Data</th><th>Treino</th><th>Duração</th><th>Volume</th><th>Séries</th><th>PSE</th></tr></thead><tbody>
        ${sessions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(se => `<tr>
          <td>${new Date(se.date).toLocaleDateString('pt-BR')}</td>
          <td><strong>${se.workoutName || '-'}</strong></td>
          <td>${se.totalDuration ? Math.round(se.totalDuration / 60) + 'min' : '-'}</td>
          <td>${se.totalVolume || '-'} kg</td>
          <td>${se.totalSets || '-'}</td>
          <td>${se.postBiofeedback?.pse || '-'}</td>
        </tr>`).join('')}</tbody></table>`;
    }

    // Workout prescriptions for PDF
    let workoutTableHTML = '';
    if (workouts.length) {
      workoutTableHTML = `<h2>Fichas de Treino Prescritas</h2>
        <p class="section-desc">Fichas de treinamento criadas pelo treinador para o período selecionado.</p>`;
      workouts.forEach(w => {
        workoutTableHTML += `<h3 style="font-size:14px;margin-top:16px">${w.name} <span style="color:#999;font-size:12px">${w.cycle || ''} — ${new Date(w.date).toLocaleDateString('pt-BR')}</span></h3>`;
        if (w.exercises?.length) {
          workoutTableHTML += `<table><thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>Descanso</th><th>Método</th></tr></thead><tbody>
          ${w.exercises.map(e => `<tr><td>${e.name}</td><td>${e.sets}</td><td>${e.reps}</td><td>${e.load || '-'}</td><td>${e.rest || '-'}s</td><td>${e.method || '-'}</td></tr>`).join('')}
          </tbody></table>`;
        }
      });
    }

    printWin.document.write(`<!DOCTYPE html><html><head><title>Dossiê - ${student.name}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:30px 40px;max-width:850px;margin:0 auto;font-size:13px;line-height:1.5}
        h1{font-size:26px;border-bottom:3px solid #00A499;padding-bottom:10px;margin-bottom:8px}
        h1 span{color:#00A499}
        h2{font-size:17px;color:#00A499;margin-top:28px;border-bottom:1px solid #e0e0e0;padding-bottom:6px}
        h3{font-size:14px;color:#333;margin-top:16px}
        .subtitle{font-size:12px;color:#888;margin-bottom:20px}
        .header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:16px;background:#f8faf9;border-radius:8px}
        .avatar{width:56px;height:56px;border-radius:50%;background:#00A499;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex-shrink:0}
        .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:20px 0}
        .stat{text-align:center;padding:14px 8px;border:1px solid #e8e8e8;border-radius:8px;background:#fafafa}
        .stat-val{font-size:26px;font-weight:700;color:#00A499}
        .stat-lbl{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
        .parecer{background:#f0f9f6;border-left:4px solid #00A499;padding:16px 20px;border-radius:0 8px 8px 0;margin:14px 0;line-height:1.8;font-size:13px}
        .tecnico{background:#f0f6f9;border-left:4px solid #0695b4;padding:16px 20px;border-radius:0 8px 8px 0;margin:14px 0;line-height:1.7;font-size:12px}
        .section-desc{font-size:11px;color:#888;margin:4px 0 12px;line-height:1.5}
        table{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:12px}
        th{background:#f3f3f3;padding:8px 10px;text-align:left;font-weight:600;border-bottom:2px solid #ddd;font-size:11px;text-transform:uppercase;color:#555}
        td{padding:7px 10px;border-bottom:1px solid #eee}
        tr:nth-child(even) td{background:#fafafa}
        .chart-block{margin:20px 0;page-break-inside:avoid}
        .chart-block h3{font-size:15px;color:#00A499;margin-bottom:2px}
        .chart-block .chart-desc{font-size:11px;color:#888;margin:0 0 8px;line-height:1.4}
        .chart-block img{max-width:100%;height:auto;border:1px solid #eee;border-radius:6px}
        .footer{text-align:center;font-size:10px;color:#aaa;margin-top:40px;border-top:1px solid #ddd;padding-top:12px}
        .cycle-badge{display:inline-block;background:#e0f7f0;color:#00A499;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
        @media print{body{padding:15px 20px}h1{font-size:22px}.stats{gap:6px}.stat{padding:10px 6px}.stat-val{font-size:22px}}
      </style></head><body>
      <h1>Personal<span>PRO</span> — Dossiê de Performance</h1>
      <p class="subtitle">Relatório gerado em ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} por ${trainerName}</p>
      <div class="header">
        <div class="avatar">${student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div><strong style="font-size:18px">${student.name}</strong><br>
        <span style="color:#666">${student.code} · Objetivo: ${student.goal || '-'} · ${student.age || '-'} anos</span><br>
        <span class="cycle-badge">${cycleFilter || 'Todos os Ciclos'}</span></div>
      </div>
      ${pdfArea.querySelector('.stats-grid') ? '<div class="stats">' + Array.from(pdfArea.querySelectorAll('.stat-card')).map(c => `<div class="stat"><div class="stat-val">${c.querySelector('.stat-value')?.textContent || '-'}</div><div class="stat-lbl">${c.querySelector('.stat-label')?.textContent || ''}</div></div>`).join('') + '</div>' : ''}
      <h2>Resumo para o Aluno</h2>
      <p class="section-desc">Análise em linguagem acessível para compreensão do aluno sobre seu progresso.</p>
      <div class="parecer">${parecer}</div>
      <h2>Análise Técnica do Treinador</h2>
      <p class="section-desc">Análise baseada nos indicadores de carga de treino, recuperação e bem-estar coletados.</p>
      <div class="tecnico">${tecnico}</div>
      ${sessionTableHTML}
      ${workoutTableHTML}
      <h2>Gráficos de Evolução</h2>
      <p class="section-desc">Visualização gráfica dos indicadores coletados ao longo do período. Leia as descrições abaixo de cada gráfico para interpretar os dados.</p>
      ${chartsHTML}
      <div class="footer">Dossiê gerado por ${trainerName} — ${new Date().toLocaleDateString('pt-BR')} — Personal PRO · Sistema Profissional de Treinamento</div>
    </body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 600);
    notify.success('Dossiê aberto para impressão/PDF!');
  });
}

async function initReportCharts(studentId) {
  if (typeof Chart === 'undefined') return;
  const bf = (await db.getAll('biofeedback')).filter(b => b.studentId === studentId).sort((a, b) => new Date(a.date) - new Date(b.date));
  const sessions = (await db.getAll('sessions')).filter(s => s.studentId === studentId);
  const assessments = (await db.getAll('assessments')).filter(a => a.studentId === studentId);
  const co = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, scales: { y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } };

  const wCtx = document.getElementById('wellnessChart');
  if (wCtx && bf.length > 1) {
    new Chart(wCtx, {
      type: 'line', data: {
        labels: bf.map(b => Calc.formatDate(b.date)), datasets: [
          { label: 'Sono', data: bf.map(b => b.sleep || 0), borderColor: '#8b5cf6', tension: 0.3 },
          { label: 'Humor', data: bf.map(b => b.mood || 0), borderColor: '#10b981', tension: 0.3 },
          { label: 'Energia', data: bf.map(b => b.energy || 0), borderColor: '#06b6d4', tension: 0.3 },
          { label: 'Estresse', data: bf.map(b => b.stress || 0), borderColor: '#f59e0b', tension: 0.3, borderDash: [5, 5] },
        ]
      }, options: { ...co, scales: { ...co.scales, y: { ...co.scales.y, min: 0, max: 10 } } }
    });
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
    new Chart(rCtx, { type: 'radar', data: { labels: ['Sono', 'Humor', 'Energia', 'Baixo Estresse', 'Sem Dor'], datasets: [{ label: 'Média', data: [avg('sleep'), avg('mood'), avg('energy'), 10 - avg('stress'), 10 - (avg('pain') || 0)], backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10b981', pointBackgroundColor: '#10b981' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, color: '#64748b', backdropColor: 'transparent' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#94a3b8', font: { size: 11 } } } }, plugins: { legend: { display: false } } } });
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
    if (sorted.some(a => a.weight)) ds.push({ label: 'Peso (kg)', data: sorted.map(a => a.weight || null), borderColor: '#10b981', tension: 0.3, yAxisID: 'y' });
    if (sorted.some(a => a.bodyFat)) ds.push({ label: 'BF %', data: sorted.map(a => a.bodyFat || null), borderColor: '#f59e0b', tension: 0.3, yAxisID: 'y1' });
    if (ds.length) new Chart(mCtx, { type: 'line', data: { labels: sorted.map(a => Calc.formatDate(a.date)), datasets: ds }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { y: { position: 'left', ticks: { color: '#10b981' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y1: { position: 'right', ticks: { color: '#f59e0b' }, grid: { display: false } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } } });
  }

  // ── CYCLE COMPARISON CHART ──
  const cdCtx = document.getElementById('cycleDiffChart');
  if (cdCtx && bf.length >= 4) {
    const mid = Math.floor(bf.length / 2);
    const first = bf.slice(0, mid);
    const second = bf.slice(mid);
    const avgOf = (arr, key) => arr.length ? (arr.reduce((s, b) => s + (b[key] || 0), 0) / arr.length).toFixed(1) : 0;
    const metrics = ['sleep', 'mood', 'energy', 'stress', 'pse'];
    const labels = ['Sono', 'Humor', 'Energia', 'Estresse', 'PSE'];
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
}

async function loadPeriodizationForReport(studentId) {
  const container = document.getElementById('reportPeriodization');
  if (!container) return;
  const macros = (await db.getAll('macrocycles')).filter(m => m.studentId === studentId);
  const active = macros.find(m => m.status === 'active') || macros[0];
  if (!active || !active.weeks) {
    container.innerHTML = '<p class="text-muted text-sm">Nenhuma periodização encontrada para este aluno.</p>';
    return;
  }
  const currentWeek = Math.ceil((Date.now() - new Date(active.startDate).getTime()) / (7 * 86400000));
  container.innerHTML = `
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
    </div>
  `;
}
