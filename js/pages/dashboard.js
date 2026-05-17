// ========================================
// PERSONAL PRO — Dashboard Page (v2)
// Clean SVG-based, no emoji
// ========================================

import db from '../db.js';
import { Calc } from '../utils/calculations.js';

export async function renderDashboard() {
  const students    = await db.getAll('students');
  const workouts    = await db.getAll('workouts');
  const assessments = await db.getAll('assessments');
  const biofeedback = await db.getAll('biofeedback');
  const sessions    = await db.getAll('sessions');
  const schedules   = await db.getAll('schedules');
  const financial   = await db.getAll('financial');

  const activeStudents   = students.filter(s => s.status === 'Ativo');
  const now              = new Date();
  const thisMonth        = now.getMonth();
  const thisYear         = now.getFullYear();

  const monthSessions = sessions.filter(s => {
    if (s.status !== 'completed') return false;
    const d = new Date(s.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  // Treinos de hoje
  const todayStr = now.toISOString().slice(0, 10);
  const todaySchedules = schedules.filter(s => s.date === todayStr && s.status === 'scheduled');

  // Receita do mês — usa paidDate (data real do pagamento) ou dueDate como fallback
  const monthRevenue = financial
    .filter(f => {
      if (f.status !== 'paid') return false;
      const refDate = new Date(f.paidDate || f.dueDate || 0);
      return refDate.getMonth() === thisMonth && refDate.getFullYear() === thisYear;
    })
    .reduce((t, f) => t + (parseFloat(f.amount) || 0), 0);

  // Taxa de adesão (sessões realizadas / treinos agendados no mês)
  const monthScheduled = schedules.filter(s => { const d = new Date(s.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const adherenceRate = monthScheduled.length > 0 ? Math.round((monthSessions.length / monthScheduled.length) * 100) : 0;

  // Biofeedback recente e alertas
  const recentBf = biofeedback.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  const avgSleep  = recentBf.length ? (recentBf.reduce((s, b) => s + (b.sleep || 0), 0) / recentBf.length).toFixed(1) : '-';
  const alerts    = recentBf.filter(b => (b.sleep || 10) < 5 || (b.stress || 0) >= 8 || (b.pain || 0) >= 6);

  // Próximas avaliações (alunos sem avaliação nos últimos 30 dias)
  const needsAssessment = activeStudents.filter(s => {
    const lastAss = assessments.filter(a => a.studentId === s.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!lastAss) return true;
    return (now - new Date(lastAss.date)) > 30 * 86400000;
  });

  return `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitle">${now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="flex gap-sm">
        <a href="#/tracker" class="btn btn-primary">▶ Iniciar Treino</a>
      </div>
    </div>

    <!-- STATS -->
    <div class="stats-grid stagger-children">
      <div class="stat-card">
        <div class="stat-value text-gradient">${activeStudents.length}</div>
        <div class="stat-label">Alunos Ativos</div>
        <div class="stat-change positive">de ${students.length} cadastrados</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-gradient">${monthSessions.length}</div>
        <div class="stat-label">Sessões no Mês</div>
        <div class="stat-change ${adherenceRate >= 70 ? 'positive' : 'negative'}">${adherenceRate}% de adesão</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-gradient">${monthRevenue > 0 ? 'R$ ' + monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : '—'}</div>
        <div class="stat-label">Receita do Mês</div>
        <div class="stat-change">${new Date().toLocaleDateString('pt-BR', { month: 'long' })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-gradient">${avgSleep}</div>
        <div class="stat-label">Média de Sono</div>
        <div class="stat-change">últimos check-ins</div>
      </div>
    </div>

    ${alerts.length > 0 ? `
    <div class="card mt-lg" style="border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.05)">
      <div class="card-header">
        <span class="card-title" style="color:var(--warning)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Alertas de Biofeedback (${alerts.length})
        </span>
        <a href="#/biofeedback" class="btn btn-ghost btn-sm">Ver todos →</a>
      </div>
      <div>
        ${alerts.slice(0, 3).map(b => {
          const st = students.find(s => s.id === b.studentId);
          const issues = [];
          if ((b.sleep || 10) < 5) issues.push(`Sono baixo: ${b.sleep}/10`);
          if ((b.stress || 0) >= 8) issues.push(`Estresse alto: ${b.stress}/10`);
          if ((b.pain || 0) >= 6) issues.push(`Dor: ${b.pain}/10`);
          return `<div class="flex items-center gap-md" style="padding:8px 0;border-bottom:1px solid var(--border-color)">
            <div class="avatar avatar-sm" style="background:rgba(245,158,11,0.2);color:var(--warning)">${st ? st.name[0] : '?'}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.88rem">${st?.name || 'Aluno'}</div>
              <div style="font-size:0.75rem;color:var(--warning)">${issues.join(' · ')}</div>
            </div>
            <span class="text-xs text-muted">${Calc.formatDate(b.date)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="grid-2 mt-lg">
      <!-- Treinos de Hoje -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Treinos Hoje</span>
          <a href="#/agenda" class="btn btn-ghost btn-sm">Agenda →</a>
        </div>
        ${todaySchedules.length ? todaySchedules.slice(0, 5).map(s => {
          const st = students.find(x => x.id === s.studentId);
          return `<div class="flex items-center gap-md" style="padding:8px 0;border-bottom:1px solid var(--border-color)">
            <div class="avatar avatar-sm">${st ? st.name[0] : '?'}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.88rem">${st?.name || 'Aluno'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${s.time || ''} · ${s.workoutName || 'Treino'}</div>
            </div>
            <a href="#/tracker" class="btn btn-primary btn-sm">▶</a>
          </div>`;
        }).join('') : `<div class="empty-state" style="padding:24px 0"><p class="text-muted text-sm">Nenhum treino agendado para hoje</p><a href="#/agenda" class="btn btn-secondary btn-sm mt-sm">Ver Agenda</a></div>`}
      </div>

      <!-- Alunos Recentes -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Alunos Ativos</span>
          <a href="#/alunos" class="btn btn-ghost btn-sm">Ver todos →</a>
        </div>
        ${activeStudents.length ? activeStudents.slice(0, 5).map(s => {
          const lastSession = sessions.filter(x => x.studentId === s.id && x.status === 'completed').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          const daysSince = lastSession ? Math.floor((now - new Date(lastSession.date)) / 86400000) : null;
          return `<div class="flex items-center gap-md" style="padding:8px 0;border-bottom:1px solid var(--border-color)">
            <div class="avatar avatar-sm">${s.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.88rem">${s.name}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">${s.goal || 'Sem objetivo'}</div>
            </div>
            ${daysSince !== null ? `<span class="text-xs" style="color:${daysSince > 7 ? 'var(--warning)' : 'var(--success)'}">${daysSince}d</span>` : ''}
          </div>`;
        }).join('') : `<div class="empty-state" style="padding:24px 0"><h3>Nenhum aluno</h3><a href="#/alunos" class="btn btn-primary btn-sm">+ Novo Aluno</a></div>`}
      </div>
    </div>

    <div class="grid-2 mt-lg">
      <!-- Biofeedback Recente -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Biofeedback Recente</span>
          <a href="#/biofeedback" class="btn btn-ghost btn-sm">Ver todos →</a>
        </div>
        ${recentBf.length ? recentBf.slice(0, 5).map(b => {
          const st = students.find(s => s.id === b.studentId);
          const sleepColor = (b.sleep || 0) < 5 ? 'var(--danger)' : (b.sleep || 0) < 7 ? 'var(--warning)' : 'var(--success)';
          return `<div class="flex items-center gap-md" style="padding:8px 0;border-bottom:1px solid var(--border-color)">
            <div class="avatar avatar-sm">${st ? st.name[0] : '?'}</div>
            <div style="flex:1">
              <div style="font-weight:500;font-size:0.85rem">${st?.name || 'Aluno'}</div>
              <div class="text-muted text-xs">${Calc.formatDate(b.date)}</div>
            </div>
            <div class="flex gap-sm text-xs">
              <span style="color:${sleepColor}">Sono ${b.sleep || '-'}</span>
              <span style="color:var(--text-muted)">Disp ${b.mood || '-'}</span>
              <span>Est ${b.stress || '-'}</span>
            </div>
          </div>`;
        }).join('') : `<div class="empty-state" style="padding:24px 0"><p class="text-muted text-sm">Os check-ins aparecerão aqui</p></div>`}
      </div>

      <!-- Precisa de Avaliação -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Reavaliação Pendente</span>
          <a href="#/avaliacoes" class="btn btn-ghost btn-sm">Avaliações →</a>
        </div>
        ${needsAssessment.length ? needsAssessment.slice(0, 5).map(s => {
          const lastAss = assessments.filter(a => a.studentId === s.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          return `<div class="flex items-center gap-md" style="padding:8px 0;border-bottom:1px solid var(--border-color)">
            <div class="avatar avatar-sm">${s.name[0]}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.88rem">${s.name}</div>
              <div class="text-xs text-muted">${lastAss ? 'Última: ' + Calc.formatDate(lastAss.date) : 'Nunca avaliado'}</div>
            </div>
            <a href="#/avaliacoes" class="btn btn-ghost btn-sm" style="font-size:0.75rem">Avaliar</a>
          </div>`;
        }).join('') : `<div class="empty-state" style="padding:24px 0"><p class="text-muted text-sm">Todos os alunos estão em dia</p></div>`}
      </div>
    </div>

    <div class="card mt-lg">
      <div class="card-header">
        <span class="card-title">Atividade Semanal</span>
      </div>
      <div style="height:220px;position:relative"><canvas id="weeklyChart"></canvas></div>
    </div>
  `;
}

export async function initDashboardCharts() {
  const canvas = document.getElementById('weeklyChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const workouts = await db.getAll('workouts');

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const now = new Date();
  const weekData = new Array(7).fill(0);

  workouts.forEach(w => {
    const d = new Date(w.date);
    const diff = Math.floor((now - d) / 86400000);
    if (diff >= 0 && diff < 7) {
      weekData[d.getDay()]++;
    }
  });

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Treinos',
        data: weekData,
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      }
    }
  });
}
