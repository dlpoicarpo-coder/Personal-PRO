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
      <div class="card-header"><span class="card-title">Próximas Sessões</span></div>
      ${(() => {
      const upcoming = filteredEvents.filter(e => e.date >= today && e.status !== 'completed').sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0, 15);
      if (!upcoming.length) return '<p class="text-muted text-center" style="padding:20px">Nenhuma sessão futura agendada</p>';
      return `<div class="table-container"><table class="data-table"><thead><tr><th>Data</th><th>Hora</th><th>Aluno</th><th>Treino</th><th>Duração</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>${upcoming.map(ev => {
        const st = students.find(s => s.id === ev.studentId);
        return `<tr><td>${Calc.formatDate(ev.date)}</td><td>${ev.time || '—'}</td><td>${st ? st.name : '?'}</td><td>${ev.workoutName || '-'}</td><td>${ev.duration || 60}min</td>
              <td><span class="badge badge-${statusColors[ev.status] || 'info'}">${statusLabels[ev.status] || ev.status}</span></td>
              <td><button class="btn btn-ghost btn-sm start-tracker" data-id="${ev.id}" data-student="${ev.studentId}" data-workout="${ev.workoutId || ''}">Iniciar</button> <button class="btn btn-ghost btn-sm del-event" data-id="${ev.id}" style="color:var(--danger)">✕</button></td></tr>`;
      }).join('')}</tbody></table></div>`;
    })()}
    </div>
  `;
}

function renderDayEvents(dayEvents, students, statusColors, statusLabels) {
  if (!dayEvents.length) return '<div class="empty-state" style="padding:30px"><p class="text-muted">Nenhum treino neste dia</p></div>';
  return dayEvents.map(ev => {
    const st = students.find(s => s.id === ev.studentId);
    return `<div class="event-card" style="border-left:3px solid var(--${statusColors[ev.status] || 'info'})">
      <div class="flex items-center justify-between mb-sm">
        <div class="flex items-center gap-sm">
          <div class="avatar avatar-sm">${st ? st.name[0] : '?'}</div>
          <div><strong>${st ? st.name : '?'}</strong><div class="text-xs text-muted">${ev.time || '—'} · ${ev.duration || 60}min</div></div>
        </div>
        <span class="badge badge-${statusColors[ev.status] || 'info'}">${statusLabels[ev.status] || ev.status}</span>
      </div>
      <div class="text-sm text-muted mb-sm">${ev.workoutName || 'Treino não definido'}</div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm wa-reminder" data-id="${ev.id}">WhatsApp</button>
        <button class="btn btn-ghost btn-sm wa-pre" data-id="${ev.id}" style="color:var(--primary)">🏃 Pré</button>
        <button class="btn btn-ghost btn-sm wa-post" data-id="${ev.id}" style="color:var(--accent)">🏋 Pós</button>
        <button class="btn btn-primary btn-sm start-tracker" data-id="${ev.id}" data-student="${ev.studentId}" data-workout="${ev.workoutId || ''}">▶ Iniciar</button>
        <select class="form-select" style="width:auto;padding:4px 8px;font-size:0.75rem" data-status="${ev.id}">
          ${Object.entries(statusLabels).map(([k, v]) => `<option value="${k}" ${ev.status === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm del-event" data-id="${ev.id}" style="color:var(--danger)">✕</button>
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
  // WhatsApp
  document.querySelectorAll('.wa-reminder').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ev = await db.get('schedules', btn.dataset.id);
      if (!ev) return;
      const st = await db.get('students', ev.studentId);
      if (!st?.phone) { notify.warning('Aluno sem telefone cadastrado'); return; }
      const formLink = `${location.origin}${location.pathname}#/form/pre/${st.id}`;
      sendWhatsApp(st.phone, reminderMsg(st.name.split(' ')[0], ev.workoutName || 'Treino', Calc.formatDate(ev.date), ev.time || '', formLink));
    });
  });
  document.querySelectorAll('.wa-pre').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ev = await db.get('schedules', btn.dataset.id); if (!ev) return;
      const st = await db.get('students', ev.studentId);
      if (!st?.phone) { notify.warning('Sem telefone'); return; }
      sendWhatsApp(st.phone, preFormMsg(st.name.split(' ')[0], `${location.origin}${location.pathname}#/form/pre/${st.id}`));
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
  document.querySelectorAll('[data-status]').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const ev = await db.get('schedules', sel.dataset.status);
      if (ev) { ev.status = e.target.value; await db.put('schedules', ev); notify.success('Status atualizado'); }
    });
  });
  document.querySelectorAll('.del-event').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Remover?')) { await db.delete('schedules', btn.dataset.id); navigateFn('/agenda'); }
    });
  });
  // Auto-start tracker with student and workout pre-selected (item 7)
  document.querySelectorAll('.start-tracker').forEach(btn => {
    btn.addEventListener('click', async () => {
      const evId = btn.dataset.id;
      const ev = evId ? await db.get('schedules', evId) : null;
      if (ev && ev.studentId && ev.workoutId) {
        // Store the pre-selection for the live tracker
        sessionStorage.setItem('pp_autostart', JSON.stringify({
          studentId: ev.studentId,
          workoutId: ev.workoutId,
          workoutName: ev.workoutName || ''
        }));
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
}
