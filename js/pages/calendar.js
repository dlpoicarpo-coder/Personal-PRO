// ========================================
// PERSONAL PRO — Training Calendar Page (v3)
// Student filter + weekday selection + auto-start
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { sendWhatsApp, reminderMsg, preFormMsg, postFormMsg } from '../utils/whatsapp.js';

const DURATIONS = [30, 45, 50, 60, 75, 90, 120];
const WEEKDAYS = [
  { id: 0, label: 'Dom', short: 'D' }, { id: 1, label: 'Seg', short: 'S' },
  { id: 2, label: 'Ter', short: 'T' }, { id: 3, label: 'Qua', short: 'Q' },
  { id: 4, label: 'Qui', short: 'Q' }, { id: 5, label: 'Sex', short: 'S' },
  { id: 6, label: 'Sáb', short: 'S' },
];
let currentYear, currentMonth, studentFilter = '';

export async function renderCalendar() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  return buildCalendarHTML();
}

async function buildCalendarHTML() {
  const students = await db.getAll('students');
  const events = await db.getAll('schedules');
  const active = students.filter(s => s.status === 'Ativo');
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const today = new Date().toISOString().slice(0, 10);
  
  // Apply student filter
  const filteredEvents = studentFilter ? events.filter(e => e.studentId === studentFilter) : events;
  const todayEvents = filteredEvents.filter(e => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const statusColors = { scheduled: 'info', confirmed: 'primary', completed: 'success', missed: 'danger' };
  const statusLabels = { scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Realizado', missed: 'Faltou' };

  return `
    <div class="page-header"><div><h1>Agenda de Treinos</h1><p class="subtitle">Agende sessões e envie lembretes automáticos</p></div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <select class="form-select" id="calStudentFilter" style="min-width:180px">
          <option value="">Todos os alunos</option>
          ${active.map(s => `<option value="${s.id}" ${studentFilter === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="addEventBtn">+ Agendar Treino</button>
      </div>
    </div>

    ${(() => {
      const monthEvents = filteredEvents.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const total = monthEvents.length;
      const done  = monthEvents.filter(e => e.status === 'completed').length;
      const missed = monthEvents.filter(e => e.status === 'missed').length;
      const rate  = total > 0 ? Math.round((done / total) * 100) : 0;
      if (total === 0) return '';
      return `
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="stat-card" style="text-align:center;padding:12px">
          <div class="stat-label">NO MÊS</div>
          <div class="stat-value text-gradient">${total}</div>
          <div class="stat-change">agendamentos</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:12px">
          <div class="stat-label">REALIZADOS</div>
          <div class="stat-value" style="color:var(--success)">${done}</div>
          <div class="stat-change positive">${rate}% de adesão</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:12px">
          <div class="stat-label">FALTAS</div>
          <div class="stat-value" style="color:${missed>0?'var(--danger)':'var(--success)'}">${missed}</div>
          <div class="stat-change">este mês</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:12px">
          <div class="stat-label">PENDENTES</div>
          <div class="stat-value" style="color:var(--accent)">${total - done - missed}</div>
          <div class="stat-change">agendados</div>
        </div>
      </div>`;
    })()}
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <button class="btn btn-ghost btn-sm" id="prevMonth">← </button>
          <span class="card-title" style="text-transform:capitalize">${monthName}</span>
          <button class="btn btn-ghost btn-sm" id="nextMonth"> →</button>
        </div>
        <div class="calendar-grid">
          <div class="cal-header">Dom</div><div class="cal-header">Seg</div><div class="cal-header">Ter</div><div class="cal-header">Qua</div><div class="cal-header">Qui</div><div class="cal-header">Sex</div><div class="cal-header">Sáb</div>
          ${Array.from({ length: firstDay }, () => '<div class="cal-day cal-empty"></div>').join('')}
          ${Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvs = filteredEvents.filter(e => e.date === dateStr);
    const isToday = dateStr === today;
    const evDots = dayEvs.slice(0, 3).map(ev => {
      const st = students.find(s => s.id === ev.studentId);
      return `<div class="cal-ev-mini" style="background:var(--${statusColors[ev.status] || 'info'})" title="${ev.time || ''} ${st ? st.name : ''}">${ev.time ? ev.time.slice(0, 5) : ''}</div>`;
    }).join('');
    return `<div class="cal-day ${isToday ? 'cal-today' : ''} ${dayEvs.length ? 'cal-has-events' : ''}" data-date="${dateStr}">
              <span class="cal-day-num">${d}</span>
              ${evDots}
              ${dayEvs.length > 3 ? `<span class="cal-more">+${dayEvs.length - 3}</span>` : ''}
            </div>`;
  }).join('')}
        </div>
        <div class="flex gap-sm mt-md" style="justify-content:center">
          <button class="btn btn-ghost btn-sm" id="todayBtn">Hoje</button>
        </div>
      </div>

      <div class="card" id="dayEventsCard">
        <div class="card-header"><span class="card-title" id="dayTitle">Hoje — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
        <div id="dayEventsList">${renderDayEvents(todayEvents, students, statusColors, statusLabels)}</div>
      </div>
    </div>

    <div class="card mt-lg">
      <div class="card-header">
        <span class="card-title">Próximas Sessões</span>
        <div class="flex gap-md text-xs text-muted">
          <span style="color:var(--success)">● Confirmado</span>
          <span style="color:var(--info)">● Agendado</span>
          <span style="color:var(--danger)">● Faltou</span>
        </div>
      </div>
      ${(() => {
        const upcoming = filteredEvents
          .filter(e => e.date >= today && e.status !== 'completed')
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
          .slice(0, 20);
        if (!upcoming.length) return '<p class="text-muted text-center" style="padding:20px">Nenhuma sessão futura agendada</p>';
        return `<div class="table-container"><table class="data-table"><thead>
          <tr><th>Data</th><th>Hora</th><th>Aluno</th><th>Treino</th><th>Dur.</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>${upcoming.map(ev => {
          const st = students.find(s => s.id === ev.studentId);
          const sc = statusColors[ev.status] || 'info';
          const isPast = ev.date < today;
          return `<tr style="${isPast ? 'opacity:0.6' : ''}">
            <td>${Calc.formatDate(ev.date)}</td>
            <td>${ev.time || '—'}</td>
            <td>
              <div class="flex items-center gap-sm">
                <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                ${st?.name || '?'}
              </div>
            </td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ev.workoutName || '-'}</td>
            <td>${ev.duration || 60}min</td>
            <td><span class="badge badge-${sc}">${statusLabels[ev.status] || ev.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-primary btn-sm start-tracker" data-id="${ev.id}" data-student="${ev.studentId}" data-workout="${ev.workoutId || ''}" style="padding:4px 8px;font-size:0.75rem">▶</button>
                <button class="btn btn-ghost btn-sm wa-reminder" data-id="${ev.id}" title="WhatsApp" style="padding:4px 6px;color:#25d366">${ICON_WA}</button>
                <button class="btn btn-ghost btn-sm edit-event" data-id="${ev.id}" title="Editar" style="padding:4px 6px;color:var(--text-muted)">${ICON_EDIT}</button>
                <button class="btn btn-ghost btn-sm del-event" data-id="${ev.id}" title="Excluir" style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody></table></div>`;
      })()}
    </div>
  `;
}

const ICON_WA = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DEL = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;

function renderDayEvents(dayEvents, students, statusColors, statusLabels) {
  if (!dayEvents.length) return `
    <div class="empty-state" style="padding:30px">
      <p class="text-muted text-sm">Nenhum treino neste dia</p>
    </div>`;

  return dayEvents.map(ev => {
    const st = students.find(s => s.id === ev.studentId);
    const statusColor = statusColors[ev.status] || 'info';
    const missed = ev.status === 'missed';
    return `
    <div class="event-card" style="
      border-left:3px solid var(--${statusColor});
      margin-bottom:10px;padding:12px;border-radius:0 8px 8px 0;
      background:${missed ? 'rgba(239,68,68,0.04)' : 'var(--bg-page)'};
      opacity:${missed ? 0.85 : 1}">
      <div class="flex items-center justify-between mb-sm">
        <div class="flex items-center gap-sm">
          <div class="avatar avatar-sm">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
          <div>
            <div style="font-weight:600;font-size:0.9rem">${st?.name || '?'}</div>
            <div class="text-xs text-muted">${ev.time || '—'} · ${ev.duration || 60}min</div>
          </div>
        </div>
        <span class="badge badge-${statusColor}">${statusLabels[ev.status] || ev.status}</span>
      </div>

      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px">
        ${ev.workoutName || 'Treino não definido'}
        ${ev.notes ? `<span style="color:var(--text-secondary)"> · ${ev.notes}</span>` : ''}
      </div>

      <div class="flex gap-xs" style="flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary btn-sm start-tracker" data-id="${ev.id}" data-student="${ev.studentId}" data-workout="${ev.workoutId || ''}" style="display:flex;align-items:center;gap:5px">
          ▶ Iniciar
        </button>
        <button class="btn btn-ghost btn-sm wa-reminder" data-id="${ev.id}" title="Lembrete WhatsApp" style="color:#25d366;display:flex;align-items:center;gap:4px">
          ${ICON_WA} Lembrete
        </button>
        <button class="btn btn-ghost btn-sm wa-pre" data-id="${ev.id}" title="Link Pré-treino" style="color:var(--primary);display:flex;align-items:center;gap:4px">
          ${ICON_WA} Pré
        </button>
        <button class="btn btn-ghost btn-sm wa-post" data-id="${ev.id}" title="Link Pós-treino" style="color:var(--accent);display:flex;align-items:center;gap:4px">
          ${ICON_WA} Pós
        </button>
        <div style="margin-left:auto;display:flex;gap:4px;align-items:center">
          <select class="form-select" style="width:auto;padding:3px 6px;font-size:0.75rem" data-status="${ev.id}">
            ${Object.entries(statusLabels).map(([k, v]) => `<option value="${k}" ${ev.status === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm edit-event" data-id="${ev.id}" title="Editar" style="padding:4px 6px;color:var(--text-muted)">
            ${ICON_EDIT}
          </button>
          <button class="btn btn-ghost btn-sm del-event" data-id="${ev.id}" title="Excluir" style="padding:4px 6px;color:var(--danger)">
            ${ICON_DEL}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

export function initCalendar(navigateFn) {
  // Student filter (item 3)
  document.getElementById('calStudentFilter')?.addEventListener('change', async (e) => {
    studentFilter = e.target.value;
    const content = document.getElementById('pageContent');
    if (content) { content.innerHTML = await buildCalendarHTML(); initCalendar(navigateFn); }
  });

  // Month navigation
  document.getElementById('prevMonth')?.addEventListener('click', async () => {
    currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    const content = document.getElementById('pageContent');
    if (content) { content.innerHTML = await buildCalendarHTML(); initCalendar(navigateFn); }
  });
  document.getElementById('nextMonth')?.addEventListener('click', async () => {
    currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    const content = document.getElementById('pageContent');
    if (content) { content.innerHTML = await buildCalendarHTML(); initCalendar(navigateFn); }
  });
  document.getElementById('todayBtn')?.addEventListener('click', async () => {
    const now = new Date(); currentYear = now.getFullYear(); currentMonth = now.getMonth();
    const content = document.getElementById('pageContent');
    if (content) { content.innerHTML = await buildCalendarHTML(); initCalendar(navigateFn); }
  });

  // Click day
  document.querySelectorAll('.cal-day[data-date]').forEach(day => {
    day.addEventListener('click', async () => {
      const date = day.dataset.date;
      const events = await db.getAll('schedules');
      const students = await db.getAll('students');
      const filtered = studentFilter ? events.filter(e => e.studentId === studentFilter) : events;
      const dayEvs = filtered.filter(e => e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      const title = document.getElementById('dayTitle');
      const list = document.getElementById('dayEventsList');
      const d = new Date(date + 'T12:00:00');
      if (title) title.textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      const sc = { scheduled: 'info', confirmed: 'primary', completed: 'success', missed: 'danger' };
      const sl = { scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Realizado', missed: 'Faltou' };
      if (list) { list.innerHTML = renderDayEvents(dayEvs, students, sc, sl); bindDayActions(navigateFn); }
      document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('cal-selected'));
      day.classList.add('cal-selected');
    });
  });

  bindDayActions(navigateFn);
  bindAddEvent(navigateFn);
}

function bindDayActions(navigateFn) {
  // WhatsApp lembrete
  document.querySelectorAll('.wa-reminder').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ev = await db.get('schedules', btn.dataset.id); if (!ev) return;
      const st = await db.get('students', ev.studentId);
      if (!st?.phone) { notify.warning('Aluno sem telefone cadastrado'); return; }
      const formLink = `${location.origin}${location.pathname}#/form/pre/${st.id}?t=${st.trainerId||st.trainer_id||''}&n=${encodeURIComponent(st.name)}`;
      sendWhatsApp(st.phone, reminderMsg(st.name.split(' ')[0], ev.workoutName || 'Treino', Calc.formatDate(ev.date), ev.time || '', formLink));
    });
  });
  document.querySelectorAll('.wa-pre').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ev = await db.get('schedules', btn.dataset.id); if (!ev) return;
      const st = await db.get('students', ev.studentId);
      if (!st?.phone) { notify.warning('Sem telefone'); return; }
      sendWhatsApp(st.phone, preFormMsg(st.name.split(' ')[0], `${location.origin}${location.pathname}#/form/pre/${st.id}?t=${st.trainerId||st.trainer_id||''}&n=${encodeURIComponent(st.name)}`));
    });
  });
  document.querySelectorAll('.wa-post').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ev = await db.get('schedules', btn.dataset.id); if (!ev) return;
      const st = await db.get('students', ev.studentId);
      if (!st?.phone) { notify.warning('Sem telefone'); return; }
      const sessions = await db.getAll('sessions');
      const last = sessions.filter(s => s.studentId === ev.studentId && s.status === 'completed').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      sendWhatsApp(st.phone, postFormMsg(st.name.split(' ')[0], `${location.origin}${location.pathname}#/form/post/${last?.id || 'none'}`));
    });
  });

  // Editar evento
  document.querySelectorAll('.edit-event').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ev = await db.get('schedules', btn.dataset.id);
      if (!ev) return;
      const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
      const wks = (await db.getAll('workouts')).filter(w => w.studentId === ev.studentId);
      openModal({
        title: 'Editar Agendamento', size: 'md',
        preventBackdropClose: true,
        content: `<form id="editEventForm">
          <div class="form-group">
            <label class="form-label">Aluno</label>
            <input class="form-input" value="${students.find(s=>s.id===ev.studentId)?.name || '?'}" disabled />
          </div>
          <div class="form-group">
            <label class="form-label">Treino</label>
            <select class="form-select" name="workoutId">
              <option value="">Sem treino definido</option>
              ${wks.map(w => `<option value="${w.id}" ${ev.workoutId===w.id?'selected':''}>${w.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Data</label>
              <input class="form-input" name="date" type="date" value="${ev.date}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Horário</label>
              <input class="form-input" name="time" type="time" value="${ev.time || '07:00'}" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Duração (min)</label>
              <select class="form-select" name="duration">
                ${DURATIONS.map(d => `<option ${parseInt(ev.duration)===d?'selected':''}>${d}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" name="status">
                <option value="scheduled" ${ev.status==='scheduled'?'selected':''}>Agendado</option>
                <option value="confirmed" ${ev.status==='confirmed'?'selected':''}>Confirmado</option>
                <option value="completed" ${ev.status==='completed'?'selected':''}>Realizado</option>
                <option value="missed" ${ev.status==='missed'?'selected':''}>Faltou</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observações</label>
            <input class="form-input" name="notes" value="${ev.notes || ''}" placeholder="Ex: Foco em pernas" />
          </div>
        </form>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('editEventForm'));
            const data = Object.fromEntries(fd);
            const wk = data.workoutId ? await db.get('workouts', data.workoutId) : null;
            await db.put('schedules', {
              ...ev,
              date: data.date, time: data.time,
              duration: parseInt(data.duration) || 60,
              status: data.status,
              workoutId: data.workoutId || ev.workoutId,
              workoutName: wk ? wk.name : ev.workoutName,
              notes: data.notes,
            });
            notify.success('Agendamento atualizado!');
            closeModal();
            navigateFn('/agenda');
          }}
        ]
      });
    });
  });

  // Status select
  document.querySelectorAll('[data-status]').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const ev = await db.get('schedules', sel.dataset.status);
      if (ev) { ev.status = e.target.value; await db.put('schedules', ev); notify.success('Status atualizado'); }
    });
  });

  // Excluir
  document.querySelectorAll('.del-event').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Remover este agendamento?')) {
        await db.delete('schedules', btn.dataset.id);
        notify.success('Agendamento removido');
        navigateFn('/agenda');
      }
    });
  });

  // Iniciar treino
  document.querySelectorAll('.start-tracker').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ev = btn.dataset.id ? await db.get('schedules', btn.dataset.id) : null;
      if (ev?.studentId && ev?.workoutId) {
        sessionStorage.setItem('pp_autostart', JSON.stringify({ studentId: ev.studentId, workoutId: ev.workoutId, workoutName: ev.workoutName || '' }));
      }
      navigateFn('/tracker');
    });
  });
}

function bindAddEvent(navigateFn) {
  document.getElementById('addEventBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    openModal({
      title: '+ Agendar Treino', size: 'md',
      preventBackdropClose: true,
      content: `<form id="eventForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Aluno *</label><select class="form-select" name="studentId" id="evStudent" required><option value="">Selecione</option>${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Treino</label><select class="form-select" name="workoutId" id="evWorkout"><option value="">Selecione aluno</option></select></div>
        </div>
        <div class="form-group">
          <label class="form-label">Dias da Semana</label>
          <div class="flex gap-sm" id="weekdayPicker" style="flex-wrap:wrap">
            ${WEEKDAYS.map(d => `<label style="display:flex;align-items:center;gap:4px;padding:6px 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);cursor:pointer;font-size:0.85rem;transition:all 0.2s">
              <input type="checkbox" name="weekday" value="${d.id}" style="accent-color:var(--primary)"> ${d.label}
            </label>`).join('')}
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Data Início *</label><input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required /></div>
          <div class="form-group"><label class="form-label">Horário</label><input class="form-input" name="time" type="time" value="07:00" /></div>
          <div class="form-group"><label class="form-label">Duração (min)</label><select class="form-select" name="duration">${DURATIONS.map(d => `<option ${d === 60 ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Semanas de Repetição</label>
          <select class="form-select" name="repeat">
            <option value="">Apenas esta data</option>
            <option value="4">4 semanas</option>
            <option value="8">8 semanas</option>
            <option value="12">12 semanas</option>
            <option value="16">16 semanas</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Observações</label><input class="form-input" name="notes" placeholder="Ex: Foco em pernas" /></div>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        {
          label: 'Agendar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('eventForm'));
            const d = Object.fromEntries(fd);
            if (!d.studentId || !d.date) { notify.error('Preencha aluno e data'); return; }
            const wk = d.workoutId ? await db.get('workouts', d.workoutId) : null;
            d.workoutName = wk ? wk.name : ''; d.status = 'scheduled'; d.duration = parseInt(d.duration) || 60;
            
            // Get selected weekdays
            const weekdays = Array.from(document.querySelectorAll('#weekdayPicker input:checked')).map(i => parseInt(i.value));
            const repeatWeeks = parseInt(d.repeat) || 0;
            
            if (weekdays.length > 0 && repeatWeeks > 0) {
              // Generate events for each selected weekday for N weeks
              const startDate = new Date(d.date + 'T12:00:00');
              for (let week = 0; week < repeatWeeks; week++) {
                for (const dayId of weekdays) {
                  const eventDate = new Date(startDate);
                  eventDate.setDate(startDate.getDate() + (week * 7) + ((dayId - startDate.getDay() + 7) % 7));
                  if (eventDate >= startDate) {
                    await db.add('schedules', { ...d, date: eventDate.toISOString().slice(0, 10), id: undefined, repeat: undefined, weekday: undefined });
                  }
                }
              }
            } else {
              // Single event
              await db.add('schedules', { ...d, repeat: undefined, weekday: undefined });
              if (repeatWeeks > 0) {
                for (let i = 1; i < repeatWeeks; i++) {
                  const nd = new Date(d.date + 'T12:00:00'); nd.setDate(nd.getDate() + 7 * i);
                  await db.add('schedules', { ...d, date: nd.toISOString().slice(0, 10), id: undefined, repeat: undefined });
                }
              }
            }
            
            notify.success('Treino(s) agendado(s)!'); closeModal(); navigateFn('/agenda');
          }
        }
      ]
    });
    setTimeout(() => {
      document.getElementById('evStudent')?.addEventListener('change', async (e) => {
        const sel = document.getElementById('evWorkout');
        const wks = (await db.getAll('workouts')).filter(w => w.studentId === e.target.value);
        sel.innerHTML = '<option value="">Selecione</option>' + wks.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
      });
    }, 100);
  });

  // ── LEMBRETES AUTOMÁTICOS VIA WHATSAPP ──────────────────────
  // Verifica agendamentos a cada 60s e dispara WA 10h e 30min antes
  initAutoReminders();
}

// ─────────────────────────────────────────────────────────────
// SISTEMA DE LEMBRETES AUTOMÁTICOS
//
// Como o WhatsApp não tem API de envio silencioso, o sistema:
// 1. Abre a aba do WhatsApp automaticamente (sem confirmação)
// 2. A mensagem já está preenchida — o personal só pressiona enviar
// 3. O formulário pré-treino e o lembrete são enviados juntos
//
// Momentos de envio (por agendamento):
//   - 10h antes  → lembrete + link check-in pré-treino
//   - 30min antes → lembrete final + link check-in pré-treino
//   - Após sessão → link formulário pós-treino (disparado pelo live-tracker)
// ─────────────────────────────────────────────────────────────
export function initAutoReminders() {
  if (window._ppReminderInterval) clearInterval(window._ppReminderInterval);
  checkReminders();
  window._ppReminderInterval = setInterval(checkReminders, 60_000);
}

async function checkReminders() {
  try {
    const events   = await db.getAll('schedules');
    const students = await db.getAll('students');
    const settings = await db.get('settings','trainer').catch(()=>({}));
    const now      = Date.now();

    const today      = new Date().toISOString().slice(0,10);
    const storageKey = `pp_reminders_${today}`;
    let sent = {};
    try { sent = JSON.parse(localStorage.getItem(storageKey)||'{}'); } catch(_) {}

    for (const ev of events) {
      if (ev.status === 'completed' || ev.status === 'missed') continue;
      if (!ev.date || !ev.time) continue;
      const st = students.find(s => s.id === ev.studentId);
      if (!st?.phone) continue;

      const [h, m]  = (ev.time || '08:00').split(':').map(Number);
      const eventMs = new Date(`${ev.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).getTime();
      const diffMin = (eventMs - now) / 60_000;

      const base    = window.location.href.split('#')[0];
      const preLink = `${base}#/form/pre/${ev.studentId}?t=${ev.trainerId||ev.trainer_id||''}&n=${encodeURIComponent(ev.studentName)}`;

      // ── 10h antes ──────────────────────────────────────────
      const id10h = `${ev.id}_10h`;
      if (!sent[id10h] && diffMin >= 590 && diffMin <= 600) {
        sent[id10h] = new Date().toISOString();
        const msg = buildMsg10h(st.name, ev, preLink, settings?.trainerName);
        autoSendWA(st.phone, msg, `Lembrete 10h — ${st.name}`, id10h);
      }

      // ── 30min antes ────────────────────────────────────────
      const id30m = `${ev.id}_30m`;
      if (!sent[id30m] && diffMin >= 29 && diffMin <= 31) {
        sent[id30m] = new Date().toISOString();
        const msg = buildMsg30m(st.name, ev, preLink, settings?.trainerName);
        autoSendWA(st.phone, msg, `Lembrete 30min — ${st.name}`, id30m);
      }
    }

    localStorage.setItem(storageKey, JSON.stringify(sent));
  } catch(_) {}
}

// ── Envio automático: abre WA + notificação discreta ──────────
function autoSendWA(phone, msg, label, reminderKey) {
  const num    = phone.replace(/\D/g,'');
  const waNum  = num.startsWith('55') ? num : '55'+num;
  const waUrl  = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;

  // Abrir WA automaticamente em nova aba
  window.open(waUrl, '_blank', 'noopener,noreferrer');

  // Notificação discreta no sistema (não precisa de interação)
  showSentBadge(label);

  // Notificação nativa do browser se permitida
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('📤 Personal PRO', {
      body: `${label} enviado via WhatsApp`,
      icon: '/icons/icon-192x192.png',
    });
  }
}

// Badge discreto no canto inferior esquerdo
function showSentBadge(label) {
  const id  = `ppbadge_${Date.now()}`;
  const div = document.createElement('div');
  div.id    = id;
  div.style.cssText = [
    'position:fixed;bottom:20px;left:20px;z-index:9999',
    'background:var(--bg-card);border:1px solid rgba(37,211,102,0.4)',
    'border-left:4px solid #25d366;border-radius:10px',
    'padding:10px 14px;font-size:0.8rem;font-weight:600',
    'box-shadow:0 4px 20px rgba(0,0,0,0.25)',
    'display:flex;align-items:center;gap:8px',
    'animation:slideInLeft 0.3s ease',
    'max-width:280px',
  ].join(';');
  div.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#25d366" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    <span style="color:var(--text-primary)">${label}</span>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ── Pedir permissão de notificação ao carregar ─────────────────
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ── Mensagem 10h antes ────────────────────────────────────────
function buildMsg10h(name, ev, preLink, trainerName) {
  const nome   = name.split(' ')[0];
  const hora   = ev.time || '';
  const data   = ev.date
    ? new Date(ev.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})
    : '';
  const treino = ev.workoutName || 'Treino';
  return [
    `🏋️ *Personal PRO*`,
    ``,
    `Bom dia, ${nome}! 👋`,
    ``,
    `📅 Lembrete: você tem treino *hoje*!`,
    ``,
    `📋 *${treino}*`,
    `⏰ ${data}${hora ? ` às *${hora}*` : ''}`,
    ``,
    `📝 *Preencha o check-in antes de chegar* (leva ~30 segundos):`,
    preLink,
    ``,
    `Suas respostas ajudam a personalizar o treino de hoje. 💪`,
    ``,
    trainerName ? `_Personal: ${trainerName}_` : `_Personal PRO_`,
  ].join('\n');
}

// ── Mensagem 30min antes ──────────────────────────────────────
function buildMsg30m(name, ev, preLink, trainerName) {
  const nome   = name.split(' ')[0];
  const hora   = ev.time || '';
  const treino = ev.workoutName || 'Treino';
  return [
    `🏋️ *Personal PRO*`,
    ``,
    `${nome}, seu treino começa em *30 minutos*! ⏱️`,
    ``,
    `📋 *${treino}*${hora ? ` — ⏰ ${hora}` : ''}`,
    ``,
    `📝 Se ainda não preencheu o check-in, faça agora:`,
    preLink,
    ``,
    `Até já! 💪`,
    ``,
    trainerName ? `_Personal: ${trainerName}_` : `_Personal PRO_`,
  ].join('\n');
}

// ── Mensagem pós-treino — exportada para uso externo ──────────
// (inline no live-tracker.js — mantida aqui para referência)

