// ========================================
// PERSONAL PRO — Dashboard Page (v2)
// Clean SVG-based, no emoji
// ========================================

import db from '../db.js';
import { Calc } from '../utils/calculations.js';

export async function renderDashboard() {
  const students = await db.getAll('students');
  const workouts = await db.getAll('workouts');
  const assessments = await db.getAll('assessments');
  const biofeedback = await db.getAll('biofeedback');
  const sessions = await db.getAll('sessions');

  const activeStudents = students.filter(s => s.status === 'Ativo');
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const monthSessions = completedSessions.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  // Recent biofeedback alerts
  const recentBf = biofeedback
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const avgSleep = recentBf.length ? (recentBf.reduce((s, b) => s + (b.sleep || 0), 0) / recentBf.length).toFixed(1) : '-';

  return `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitle">Visão geral do seu negócio</p>
      </div>
      <div class="flex gap-sm">
        <span class="text-muted text-sm">${now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>

    <div class="stats-grid stagger-children">
      <div class="stat-card">
        <div class="stat-value text-gradient">${activeStudents.length}</div>
        <div class="stat-label">Alunos Ativos</div>
        <div class="stat-change positive">de ${students.length} cadastrados</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-gradient">${monthWorkouts.length}</div>
        <div class="stat-label">Treinos no Mês</div>
        <div class="stat-change positive">${new Date().toLocaleDateString('pt-BR', { month: 'long' })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-gradient">${monthSessions.length}</div>
        <div class="stat-label">Sessões Realizadas</div>
        <div class="stat-change">neste mês</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-gradient">${avgSleep}</div>
        <div class="stat-label">Média de Sono</div>
        <div class="stat-change">últimos check-ins</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Alunos Recentes</span>
          <a href="#/alunos" class="btn btn-ghost btn-sm">Ver todos →</a>
        </div>
        ${activeStudents.length ? `
          <div class="student-list">
            ${activeStudents.slice(0, 5).map(s => `
              <div class="student-row flex items-center gap-md" style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                <div class="avatar">${s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
                <div style="flex:1">
                  <div style="font-weight: 600; font-size: 0.9rem;">${s.name}</div>
                  <div class="text-muted text-xs">${s.code} · ${s.goal || 'Sem objetivo definido'}</div>
                </div>
                <span class="badge badge-success">Ativo</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon" style="font-size:2rem">—</div>
            <h3>Nenhum aluno cadastrado</h3>
            <p>Adicione seu primeiro aluno para começar</p>
            <a href="#/alunos" class="btn btn-primary">+ Novo Aluno</a>
          </div>
        `}
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Biofeedback Recente</span>
          <a href="#/biofeedback" class="btn btn-ghost btn-sm">Ver todos →</a>
        </div>
        ${recentBf.length ? `
          <div>
            ${recentBf.slice(0, 5).map(b => {
              const student = students.find(s => s.id === b.studentId);
              const sleepColor = (b.sleep || 0) < 5 ? 'var(--danger)' : (b.sleep || 0) < 7 ? 'var(--warning)' : 'var(--success)';
              return `
                <div class="flex items-center gap-md" style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                  <div class="avatar avatar-sm">${student ? student.name[0] : '?'}</div>
                  <div style="flex:1">
                    <div style="font-weight:500; font-size:0.85rem;">${student ? student.name : 'Desconhecido'}</div>
                    <div class="text-muted text-xs">${Calc.formatDate(b.date)}</div>
                  </div>
                  <div class="flex gap-sm text-xs">
                    <span title="Sono" style="color:${sleepColor}">Sono: ${b.sleep || '-'}</span>
                    <span title="Humor">Hum: ${b.mood || '-'}</span>
                    <span title="Estresse">Est: ${b.stress || '-'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon" style="font-size:2rem">—</div>
            <h3>Sem registros</h3>
            <p>Os check-ins de biofeedback aparecerão aqui</p>
          </div>
        `}
      </div>
    </div>

    <div class="card mt-lg">
      <div class="card-header">
        <span class="card-title">Atividade Semanal</span>
      </div>
      <div style="height: 260px; position: relative;">
        <canvas id="weeklyChart"></canvas>
      </div>
    </div>

    <div class="card mt-lg">
      <div class="card-header">
        <span class="card-title">Densidade de Treino (kg/min)</span>
      </div>
      <div style="height: 260px; position: relative;">
        <canvas id="densityChart"></canvas>
      </div>
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

  const densityCanvas = document.getElementById('densityChart');
  if (densityCanvas) {
    const sessions = await db.getAll('sessions');
    const recentCompleted = sessions.filter(s => s.status === 'completed').sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-15);
    
    const densityLabels = recentCompleted.map(s => Calc.formatDate(s.date).slice(0,5));
    const densityData = recentCompleted.map(s => {
      const vol = s.totalVolume || 0;
      const dur = s.totalDuration ? s.totalDuration / 60 : 0;
      return dur > 0 ? (vol / dur).toFixed(1) : 0;
    });

    new Chart(densityCanvas, {
      type: 'line',
      data: {
        labels: densityLabels,
        datasets: [{
          label: 'Densidade (kg/min)',
          data: densityData,
          borderColor: 'rgb(6, 182, 212)',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: 'rgb(6, 182, 212)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        }
      }
    });
  }
}
