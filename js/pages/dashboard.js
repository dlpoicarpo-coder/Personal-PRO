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
  const macrocycles = await db.getAll('macrocycles');
  const financial = await db.getAll('financial');

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

  // 1. Inatividade de Alunos
  const studentSessions = activeStudents.map(s => {
    const completed = sessions.filter(x => x.studentId === s.id && x.status === 'completed');
    const last = completed.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const daysSince = last ? Math.floor((Date.now() - new Date(last.date)) / 86400000) : null;
    return { ...s, lastSession: last, daysSince };
  });
  studentSessions.sort((a, b) => {
    if (a.daysSince === null && b.daysSince === null) return 0;
    if (a.daysSince === null) return -1;
    if (b.daysSince === null) return 1;
    return b.daysSince - a.daysSince;
  });

  // 2. Mensalidades em Atraso
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    return new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
  };
  const overdueRecs = financial.filter(r => r.status === 'pending' && parseLocalDate(r.dueDate) < now);
  const overdueEnriched = overdueRecs.map(r => {
    const st = students.find(s => s.id === r.studentId);
    const daysOverdue = Math.floor((now - parseLocalDate(r.dueDate)) / 86400000);
    return { ...r, student: st, daysOverdue };
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);

  // 3. Macrociclos Críticos
  const criticalMacros = macrocycles
    .filter(m => m.status === 'active' && m.startDate && m.totalWeeks)
    .map(m => {
      const endMs = new Date(m.startDate + 'T12:00:00').getTime() + m.totalWeeks * 7 * 86400000;
      const daysLeft = Math.ceil((endMs - now.getTime()) / 86400000);
      const st = students.find(s => s.id === m.studentId);
      return { ...m, student: st, daysLeft };
    })
    .filter(m => m.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

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

    <h3 class="mb-sm mt-lg" style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Resumo Operacional</h3>
    <div class="grid-3 mb-lg stagger-children">
      
      <!-- Card 1: Inatividade de Alunos -->
      <div class="card" style="padding: 16px;">
        <div class="card-header" style="padding-bottom: 8px; margin-bottom: 8px; justify-content: space-between;">
          <span class="card-title" style="font-size: 0.9rem; font-weight: 700; gap: 6px;">⚠️ Inatividade de Alunos</span>
          <a href="#/alunos" class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem;">Ver todos</a>
        </div>
        <div class="flex flex-col gap-xs">
          ${studentSessions.slice(0, 5).map(s => {
            const dayColor = s.daysSince === null ? 'var(--text-muted)' : s.daysSince > 7 ? 'var(--danger)' : s.daysSince > 3 ? 'var(--warning)' : 'var(--success)';
            const dayText = s.daysSince === null ? 'Sem treinos' : s.daysSince === 0 ? 'Hoje' : s.daysSince === 1 ? 'Ontem' : `${s.daysSince}d atrás`;
            return `
              <div class="flex items-center justify-between" style="padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
                <div class="flex items-center gap-sm" style="min-width: 0; flex: 1;">
                  <div class="avatar avatar-sm" style="width: 26px; height: 26px; font-size: 0.7rem;">
                    ${s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name.split(' ')[0]}</span>
                </div>
                <span class="badge" style="background:${dayColor}15; color:${dayColor}; font-size: 0.68rem; padding: 2px 8px;">${dayText}</span>
              </div>
            `;
          }).join('')}
          ${studentSessions.length === 0 ? '<p class="text-muted text-xs text-center" style="padding: 10px 0;">Nenhum aluno ativo</p>' : ''}
        </div>
      </div>

      <!-- Card 2: Mensalidades em Atraso -->
      <div class="card" style="padding: 16px;">
        <div class="card-header" style="padding-bottom: 8px; margin-bottom: 8px; justify-content: space-between;">
          <span class="card-title" style="font-size: 0.9rem; font-weight: 700; gap: 6px;">💰 Pagamentos em Atraso</span>
          <a href="#/financeiro" class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem;">Ver todos</a>
        </div>
        <div class="flex flex-col gap-xs">
          ${overdueEnriched.slice(0, 5).map(r => {
            const fmtAmt = 'R$ ' + Number(r.amount||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const phone = r.student?.phone || '';
            return `
              <div class="flex items-center justify-between" style="padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
                <div style="min-width: 0; flex: 1; margin-right: 8px;">
                  <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.student ? r.student.name : 'Desconhecido'}">${r.student ? r.student.name.split(' ')[0] : 'Desconhecido'}</div>
                  <div class="text-muted text-xs">${fmtAmt} · ${new Date(r.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="flex items-center gap-xs">
                  <span class="badge badge-danger" style="font-size: 0.68rem; padding: 2px 6px;">${r.daysOverdue}d</span>
                  ${phone ? `
                    <button class="btn btn-ghost btn-sm charge-wa-dash" data-student="${r.studentId}" data-amount="${r.amount}" data-due="${r.dueDate}" style="padding: 4px; color: #25d366; cursor: pointer; background: none; border: none;" title="Cobrar por WhatsApp">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
          ${overdueEnriched.length === 0 ? '<p class="text-muted text-xs text-center" style="padding: 10px 0;">Nenhum pagamento em atraso</p>' : ''}
        </div>
      </div>

      <!-- Card 3: Macrociclos Críticos -->
      <div class="card" style="padding: 16px;">
        <div class="card-header" style="padding-bottom: 8px; margin-bottom: 8px; justify-content: space-between;">
          <span class="card-title" style="font-size: 0.9rem; font-weight: 700; gap: 6px;">⏰ Macrociclos Críticos</span>
          <a href="#/periodizacao" class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem;">Ver todos</a>
        </div>
        <div class="flex flex-col gap-xs">
          ${criticalMacros.slice(0, 5).map(m => {
            const color = m.daysLeft < 0 ? 'var(--danger)' : m.daysLeft === 0 ? 'var(--danger)' : 'var(--warning)';
            const labelText = m.daysLeft < 0 ? `Expirou há ${Math.abs(m.daysLeft)}d` : m.daysLeft === 0 ? 'Termina hoje!' : `Termina em ${m.daysLeft}d`;
            return `
              <div class="flex items-center justify-between" style="padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
                <div style="min-width: 0; flex: 1; margin-right: 8px;">
                  <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.student ? m.student.name.split(' ')[0] : 'Aluno'}</div>
                  <div class="text-muted text-xs" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${m.name} · ${m.totalWeeks}sem</div>
                </div>
                <span class="badge" style="background:${color}15; color:${color}; font-size: 0.68rem; padding: 2px 8px; white-space: nowrap;">${labelText}</span>
              </div>
            `;
          }).join('')}
          ${criticalMacros.length === 0 ? '<p class="text-muted text-xs text-center" style="padding: 10px 0;">Nenhum macrociclo crítico</p>' : ''}
        </div>
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
  // Bind WhatsApp charge click events on operational card
  document.querySelectorAll('.charge-wa-dash').forEach(btn => {
    btn.addEventListener('click', async () => {
      const st = await db.get('students', btn.dataset.student);
      if (!st?.phone) return;
      const amount = parseFloat(btn.dataset.amount)||0;
      const due    = Calc.formatDate(btn.dataset.due);
      
      // Get Pix Key
      let pixKey = '[configure sua chave Pix em Configurações]';
      try {
        const s = await db.get('settings','trainer');
        if (s?.pixKey) pixKey = s.pixKey;
      } catch {}

      const fmtBRL = (v) => 'R$ ' + Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const msg = `Olá ${st.name.split(' ')[0]}! 👋\n\nPassando para lembrar que sua mensalidade de *${fmtBRL(amount)}* com vencimento em *${due}* está pendente.\n\nChave Pix: ${pixKey}\n\nQualquer dúvida estou à disposição! 💪`;
      
      // Open WhatsApp
      const cleanPhone = st.phone.replace(/\D/g, '');
      const num = cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone;
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  });

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
