// ========================================
// VETOR — Dashboard Page (v2)
// Clean SVG-based, no emoji
// ========================================

import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { computeReadiness, computeLoad } from '../utils/readiness.js';
import { buildTriage } from '../utils/triage.js';

export async function renderDashboard() {
  const students = await db.getAll('students');
  const workouts = await db.getAll('workouts');
  const assessments = await db.getAll('assessments');
  const biofeedback = await db.getAll('biofeedback');
  const sessions = await db.getAll('sessions');
  const macrocycles = await db.getAll('macrocycles');
  const financial = await db.getAll('financial');
  const schedules = await db.getAll('schedules', { enrich: true });
  const settings = await db.get('settings', 'trainer') || {};

  const activeStudents = students.filter(s => s.status === 'Ativo');
  const now = new Date();
  const thisMonthStr = String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const monthWorkouts = workouts.filter(w => w.date && w.date.startsWith(thisMonthStr));
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const monthSessions = completedSessions.filter(s => s.date && s.date.startsWith(thisMonthStr));

  // Recent biofeedback alerts
  const recentBf = biofeedback
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  // 4. Aderência (semana atual e semana passada)
  const activeMacros = macrocycles.filter(m => m.status === 'active');
  
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // segunda-feira
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // domingo
  
  const weekStartStr = new Date(weekStart.getTime() - weekStart.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const weekEndStr = new Date(weekEnd.getTime() - weekEnd.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setDate(prevWeekStart.getDate() + 6);

  const prevWeekStartStr = new Date(prevWeekStart.getTime() - prevWeekStart.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const prevWeekEndStr = new Date(prevWeekEnd.getTime() - prevWeekEnd.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  function getAdherenceForRange(startStr, endStr) {
    const adherences = [];
    activeMacros.forEach(m => {
      const previstos = workouts.filter(w =>
        w.macrocycleId === m.id &&
        w.date >= startStr && w.date <= endStr
      );
      if (previstos.length > 0) {
        const realizados = completedSessions.filter(s => 
          previstos.some(p => p.id === s.workoutId)
        );
        let val = realizados.length / previstos.length;
        if (val > 1) val = 1;
        adherences.push(val);
      }
    });
    if (!adherences.length) return null;
    const sum = adherences.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / adherences.length) * 100);
  }

  const aderenciaGeral = getAdherenceForRange(weekStartStr, weekEndStr);
  const aderenciaPassada = getAdherenceForRange(prevWeekStartStr, prevWeekEndStr);

  let aderenciaStatChange = 'sessões realizadas vs. previstas';
  if (aderenciaGeral !== null && aderenciaPassada !== null) {
    const diff = aderenciaGeral - aderenciaPassada;
    if (diff > 0) {
      aderenciaStatChange = `<span style="color:var(--success);font-weight:600">▲ +${diff}% vs semana passada</span>`;
    } else if (diff < 0) {
      aderenciaStatChange = `<span style="color:var(--danger);font-weight:600">▼ ${diff}% vs semana passada</span>`;
    }
  }

  // 5. Agenda de hoje
  const todayWorkouts = workouts.filter(w =>
    w.date === todayStr &&
    activeStudents.some(s => s.id === w.studentId)
  ).map(w => {
    const st = activeStudents.find(s => s.id === w.studentId);
    const sch = schedules.find(s => s.workoutId === w.id && s.date === todayStr);
    const checkin = biofeedback.find(b => b.studentId === w.studentId && b.date?.startsWith(todayStr) && b.formType === 'pre');
    return { student: st, workout: w, time: sch?.time || null, checkin };
  }).sort((a,b) => (a.time||'99:99').localeCompare(b.time||'99:99'));

  // 1. Triagem (Sinais de Atenção)
  const triageItems = buildTriage({
    students, sessions, biofeedback, financial,
    allBf: biofeedback
  });
  const triageDangerWarningCount = triageItems.filter(i => i.level === 'danger' || i.level === 'warning').length;

  // 3. Macrociclos Críticos
  const criticalMacros = macrocycles
    .map(m => {
      const status = Calc.getMacrocycleStatus(m, now);
      const st = students.find(s => s.id === m.studentId);
      return { ...m, student: st, status };
    })
    .filter(m => m.status.isCritical)
    .sort((a, b) => {
      if (a.status.isEndingSoon && !b.status.isEndingSoon) return -1;
      if (!a.status.isEndingSoon && b.status.isEndingSoon) return 1;
      return a.status.daysLeft - b.status.daysLeft;
    });

  // 4. Radar PSE (Prontidão e Carga Baseada no Z-Score)
  const radarItems = [];
  let maturingStudentsCount = 0;

  activeStudents.forEach(st => {
    const r = computeReadiness(st.id, biofeedback, st.name);
    const l = computeLoad(st.id, completedSessions, st.name);

    let studentHasAlert = false;
    let studentIsMaturing = false;

    if (r.level !== 'none') {
      radarItems.push({ student: st, kind: 'readiness', level: r.level, headline: r.headline });
      studentHasAlert = true;
    } else if (r.status === 'collecting') {
      studentIsMaturing = true;
    }

    if (l.level !== 'none') {
      radarItems.push({ student: st, kind: 'load', level: l.level, headline: l.headline });
      studentHasAlert = true;
    } else if (l.status === 'maturing') {
      studentIsMaturing = true;
    }

    if (!studentHasAlert && studentIsMaturing) {
      maturingStudentsCount++;
    }
  });

  // Ordenar: danger no topo
  radarItems.sort((a, b) => {
    if (a.level === 'danger' && b.level !== 'danger') return -1;
    if (a.level !== 'danger' && b.level === 'danger') return 1;
    return 0;
  });

  // 6. Ciclos terminando
  const endingSoon = macrocycles
    .filter(m => m.status === 'active')
    .map(m => ({ m, st: students.find(s => s.id === m.studentId), status: Calc.getMacrocycleStatus(m, now) }))
    .filter(({ status }) => status.daysLeft > 0 && status.daysLeft <= 14)
    .sort((a,b) => a.status.daysLeft - b.status.daysLeft);

  // 7. Reavaliações Pendentes (> 90 dias ou nunca avaliado)
  const pendingReassessments = activeStudents.map(st => {
    const studentAss = assessments.filter(a => a.studentId === st.id);
    const lastAss = studentAss.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))[0];
    const daysSince = lastAss
      ? Math.floor((now.getTime() - new Date(lastAss.date || lastAss.createdAt).getTime()) / 86400000)
      : null;
    return { student: st, lastAss, daysSince };
  })
  .filter(item => item.daysSince === null || item.daysSince > 90)
  .sort((a, b) => {
    if (a.daysSince === null && b.daysSince !== null) return -1;
    if (a.daysSince !== null && b.daysSince === null) return 1;
    if (a.daysSince === null && b.daysSince === null) return 0;
    return b.daysSince - a.daysSince;
  });


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
        <div class="stat-value ${aderenciaGeral === null ? 'text-gradient' : ''}" ${aderenciaGeral !== null ? `style="color: ${aderenciaGeral >= 80 ? 'var(--success)' : aderenciaGeral >= 50 ? 'var(--warning)' : 'var(--danger)'};"` : ''}>${aderenciaGeral !== null ? aderenciaGeral + '%' : '—'}</div>
        <div class="stat-label">Aderência (semana)</div>
        <div class="stat-change">${aderenciaStatChange}</div>
      </div>
    </div>

    <h3 class="mb-sm mt-lg" style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Resumo Operacional</h3>
    <div class="grid-3 mb-lg stagger-children" style="align-items: start;">
      
      <!-- Coluna 1: Precisa de atenção + Ações Rápidas -->
      <div class="flex flex-col gap-md">
        <!-- Card 1: Precisa de atenção hoje -->
        <div class="card" style="padding: 16px;">
          <div class="card-header" style="padding-bottom: 8px; margin-bottom: 8px; justify-content: space-between;">
            <span class="card-title" style="font-size: 0.9rem; font-weight: 700; gap: 6px; display:flex; align-items:center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4v.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              Precisa de atenção hoje ${triageDangerWarningCount > 0 ? `<span class="text-xs" style="color:var(--text-muted);font-weight:500;">(${triageDangerWarningCount})</span>` : ''}
            </span>
            <a href="#/alunos" class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem;">Ver alunos</a>
          </div>
          <div class="flex flex-col gap-xs">
            ${triageItems.length > 0 ? triageItems.map(item => {
              const color = item.level === 'danger' ? 'var(--danger)' : item.level === 'warning' ? 'var(--warning)' : 'var(--text-muted)';
              const bgClass = item.level === 'danger' ? 'var(--danger)' : item.level === 'warning' ? 'var(--warning)' : 'var(--text-muted)';
              return `
                <a href="#/biofeedback?sid=${item.studentId}" class="flex items-center justify-between" style="padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 0.82rem; text-decoration: none; color: inherit;">
                  <div class="flex items-center gap-sm" style="min-width: 0; flex: 1;">
                    <div class="avatar avatar-sm" style="width: 26px; height: 26px; font-size: 0.7rem; flex-shrink: 0;">
                      ${item.studentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.studentName.split(' ')[0]}</div>
                      <div class="text-xs" style="color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.reason}</div>
                    </div>
                  </div>
                  <span class="badge" style="background:${bgClass}15; color:${color}; font-size: 0.68rem; padding: 2px 8px; text-transform: uppercase;">${item.signal}</span>
                </a>
              `;
            }).join('') : '<p class="text-muted text-xs text-center" style="padding: 10px 0;">Nenhum alerta hoje</p>'}
            ${triageItems.length === 0 && maturingStudentsCount > 0 ? `
              <div class="text-center mt-xs pt-xs" style="border-top: 1px dashed var(--border-color);">
                <span class="text-muted text-xs">${maturingStudentsCount} aluno(s) com base em maturação.</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card: Ações Rápidas -->
        <div class="card" style="padding: 16px;">
          <div class="card-header" style="padding-bottom: 8px; margin-bottom: 8px;">
            <span class="card-title" style="font-size: 0.9rem; font-weight: 700; gap: 6px; display:flex; align-items:center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Ações Rápidas
            </span>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <a href="#/agenda" class="btn btn-ghost btn-sm" style="padding: 8px 10px; font-size: 0.8rem; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; text-decoration: none; color: var(--text-primary); font-weight: 600;">Agendar treino</a>
            <a href="#/avaliacoes" class="btn btn-ghost btn-sm" style="padding: 8px 10px; font-size: 0.8rem; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; text-decoration: none; color: var(--text-primary); font-weight: 600;">Nova avaliação</a>
            <a href="#/financeiro" class="btn btn-ghost btn-sm" style="padding: 8px 10px; font-size: 0.8rem; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; text-decoration: none; color: var(--text-primary); font-weight: 600;">Financeiro</a>
            <a href="#/tracker" class="btn btn-ghost btn-sm" style="padding: 8px 10px; font-size: 0.8rem; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; text-decoration: none; color: var(--text-primary); font-weight: 600;">Treino ao vivo</a>
          </div>
        </div>
      </div>

      <!-- Coluna 2: Agenda de hoje + Reavaliação pendente -->
      <div class="flex flex-col gap-md">
        <!-- Card 2: Agenda de hoje -->
        <div class="card" style="padding: 16px;">
          <div class="card-header" style="padding-bottom: 8px; margin-bottom: 8px; justify-content: space-between;">
            <span class="card-title" style="font-size: 0.9rem; font-weight: 700; gap: 6px; display:flex; align-items:center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Agenda de hoje
            </span>
            <a href="#/calendario" class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem;">Ver calendário</a>
          </div>
          <div class="flex flex-col gap-xs">
            ${todayWorkouts.length > 0 ? todayWorkouts.map(tw => {
              const timeText = tw.time || 'Horário a confirmar';
              const checkinBadge = tw.checkin 
                ? `<span class="badge badge-success" style="font-size:0.65rem; padding: 2px 6px;">Check-in feito</span>`
                : `<span class="badge" style="background:var(--bg-secondary); color:var(--text-muted); font-size:0.65rem; padding: 2px 6px;">Aguardando</span>`;
              return `
                <div class="flex items-center justify-between" style="padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
                  <div class="flex items-center gap-sm" style="min-width: 0; flex: 1;">
                    <div class="avatar avatar-sm" style="width: 26px; height: 26px; font-size: 0.7rem; flex-shrink: 0;">
                      ${tw.student ? tw.student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
                    </div>
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tw.student ? tw.student.name.split(' ')[0] : 'Aluno'}</div>
                      <div class="text-xs" style="color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tw.workout.name}</div>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-xs" style="flex-shrink: 0; margin-left: 8px;">
                    <span style="font-weight: 500; font-size: 0.8rem;">${timeText}</span>
                    ${checkinBadge}
                  </div>
                </div>
              `;
            }).join('') : '<p class="text-muted text-xs text-center" style="padding: 10px 0;">Nenhum treino agendado para hoje</p>'}
          </div>
        </div>

        <!-- Card: Reavaliação pendente -->
        <div class="card" style="padding: 16px;">
          <div class="card-header" style="padding-bottom: 8px; margin-bottom: 8px; justify-content: space-between;">
            <span class="card-title" style="font-size: 0.9rem; font-weight: 700; gap: 6px; display:flex; align-items:center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Reavaliação pendente ${pendingReassessments.length > 0 ? `<span class="text-xs" style="color:var(--text-muted);font-weight:500;">(${pendingReassessments.length})</span>` : ''}
            </span>
            <a href="#/avaliacoes" class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem;">Ver todas</a>
          </div>
          <div class="flex flex-col gap-xs">
            ${pendingReassessments.length > 0 ? pendingReassessments.slice(0, 5).map(item => {
              const timeLabel = item.daysSince === null ? 'Nunca avaliado' : `há ${item.daysSince} dias`;
              const badgeColor = item.daysSince === null || item.daysSince > 120 ? 'var(--danger)' : 'var(--warning)';
              return `
                <a href="#/avaliacoes?sid=${item.student.id}" class="flex items-center justify-between" style="padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 0.82rem; text-decoration: none; color: inherit;">
                  <div class="flex items-center gap-sm" style="min-width: 0; flex: 1;">
                    <div class="avatar avatar-sm" style="width: 26px; height: 26px; font-size: 0.7rem; flex-shrink: 0;">
                      ${item.student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.student.name.split(' ')[0]}</div>
                      <div class="text-xs" style="color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.student.name}</div>
                    </div>
                  </div>
                  <span class="badge" style="background:${badgeColor}15; color:${badgeColor}; font-size: 0.68rem; padding: 2px 8px; white-space: nowrap;">${timeLabel}</span>
                </a>
              `;
            }).join('') : '<p class="text-muted text-xs text-center" style="padding: 10px 0;">Nenhuma reavaliação pendente</p>'}
          </div>
        </div>
      </div>

      <!-- Coluna da Direita (Agrupa Macrociclos, Radar e Avanço) -->
      <div class="flex flex-col gap-md">
        <!-- Card 3: Macrociclos Críticos -->
        <div class="card" style="padding: 12px 16px;">
        <div class="card-header" style="padding-bottom: 8px; margin-bottom: 8px; justify-content: space-between;">
          <span class="card-title" style="font-size: 0.9rem; font-weight: 700; gap: 6px; display:flex; align-items:center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Macrociclos Críticos
          </span>
          <a href="#/periodizacao" class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.72rem;">Ver todos</a>
        </div>
        <div class="flex flex-col gap-xs">
          ${criticalMacros.slice(0, 5).map(m => {
            const stColor = m.status.daysLeft < 0 ? 'var(--danger)' : m.status.daysLeft === 0 ? 'var(--danger)' : 'var(--warning)';
            let labelText = '';
            if (m.status.isEndingSoon) {
               labelText = m.status.daysLeft < 0 ? `Expirou há ${Math.abs(m.status.daysLeft)}d` : m.status.daysLeft === 0 ? 'Termina hoje!' : `Termina em ${m.status.daysLeft}d`;
            } else if (m.status.isChangingWeek) {
               labelText = `Semana ${m.status.currentWeek}`;
            }
            return `
              <div class="flex items-center justify-between" style="padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 0.82rem;">
                <div style="min-width: 0; flex: 1; margin-right: 8px;">
                  <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.student ? m.student.name.split(' ')[0] : 'Aluno'}</div>
                  <div class="text-muted text-xs" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${m.name} · ${m.totalWeeks}sem</div>
                </div>
                <span class="badge" style="background:${stColor}15; color:${stColor}; font-size: 0.68rem; padding: 2px 8px; white-space: nowrap;">${labelText}</span>
              </div>
            `;
          }).join('')}
          ${criticalMacros.length === 0 ? '<p class="text-muted text-xs text-center" style="padding: 10px 0;">Nenhum macrociclo crítico</p>' : ''}
        </div>
      </div> <!-- Fecha Card 3 -->

      <!-- Radar PSE -->
      <div>
        <h3 class="mb-xs mt-xs" style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Radar PSE (Prontidão e Carga)</h3>
        <div class="card" style="padding: 12px 16px;">
          <div class="flex flex-col gap-xs">
        ${radarItems.length > 0 ? radarItems.map(item => {
          const color = item.level === 'danger' ? 'var(--danger)' : 'var(--warning)';
          const iconSvg = item.kind === 'load' 
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
          return `
            <a href="#/biofeedback?sid=${item.student.id}" class="flex items-center gap-sm" style="padding: 12px 0; border-bottom: 1px solid var(--border-color); text-decoration: none; color: inherit;">
              <div class="avatar avatar-sm" style="width: 36px; height: 36px; font-size: 1rem; background: ${color}15; color: ${color};">
                ${iconSvg}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.95rem; font-weight: 600;">${item.student.name.split(' ')[0]}</div>
                <div class="text-xs" style="color: ${color}; font-weight: 500;">${item.headline}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          `;
        }).join('') : '<p class="text-muted text-sm text-center" style="padding: 10px 0;">Nenhum alerta hoje.</p>'}
      </div>
    </div>
    </div> <!-- Fecha Radar PSE wrapper -->

    <div>
      <h3 class="mb-xs mt-xs" style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Ciclos Terminando</h3>
      <div class="card" style="padding: 12px 16px;">
        <div class="flex flex-col gap-xs">
          ${endingSoon.length > 0 ? endingSoon.map(item => {
            const { m, st, status } = item;
            const daysLeft = status.daysLeft;
            const color = daysLeft <= 7 ? 'var(--danger)' : 'var(--warning)';
            const bgClass = daysLeft <= 7 ? 'var(--danger)' : 'var(--warning)';
            const label = daysLeft <= 7 ? `termina em ${daysLeft}d` : `semana ${status.currentWeek} de ${m.totalWeeks}`;
            return `
              <div class="flex items-center gap-sm" style="padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <div class="avatar avatar-sm" style="width: 32px; height: 32px; font-size: 0.8rem;">
                  ${st ? st.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${st ? st.name.split(' ')[0] : 'Aluno'}</div>
                  <div class="text-muted text-xs" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
                </div>
                <span class="badge" style="background:${bgClass}15; color:${color}; font-size: 0.68rem; padding: 2px 8px; text-transform: uppercase;">${label}</span>
              </div>
            `;
          }).join('') : '<p class="text-muted text-xs text-center" style="padding: 10px 0;">Nenhum ciclo encerrando em breve</p>'}
        </div>
      </div>
    </div>      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Biofeedback Recente</span>
        <a href="#/biofeedback" class="btn btn-ghost btn-sm">Ver todos</a>
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
                  <span title="Sono" style="color:${sleepColor}">Sono: ${b.sleep ? `${Math.round(b.sleep / 2)}/5` : '-'}</span>
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
      const msg = `Olá ${st.name.split(' ')[0]},\n\nPassando para lembrar que sua mensalidade de *${fmtBRL(amount)}* com vencimento em *${due}* está pendente.\n\nChave Pix: ${pixKey}\n\nQualquer dúvida estou à disposição.`;
      
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
