// ========================================
// PERSONAL PRO — Notifications Manager (v1)
// Notificações de treino para aluno + resposta do biofeedback
// ========================================
import db from '../db.js';
import { notify } from '../components/toast.js';

// ── PERMISSÃO DO NAVEGADOR ──────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendBrowserNotification(title, body, icon = null) {
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: icon || `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%2310b981'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-weight='900' font-size='50' fill='white'>P</text></svg>`,
    });
    setTimeout(() => n.close(), 6000);
  } catch (e) { console.warn('Browser notification error:', e); }
}

// ── NOTIFICAÇÃO DE TREINO AGENDADO ──────────────────────────
export function sendWorkoutReminder(student, schedule, trainerPhone = '') {
  const time = schedule.time || '';
  const name = student?.name || 'Aluno';
  const workout = schedule.workoutName || 'treino';

  // Browser notification (para o personal)
  sendBrowserNotification(
    `Lembrete — ${name}`,
    `Treino às ${time}: ${workout}`
  );

  // WhatsApp para o aluno
  const phone = student?.phone?.replace(/\D/g, '') || '';
  if (!phone) return null;

  const msg = `Olá, ${name}! 👋\n\nLembrete do seu treino de hoje às *${time}*:\n📋 ${workout}\n\nBom treino! 💪\n\n_Personal PRO_`;
  const wa = `https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}?text=${encodeURIComponent(msg)}`;
  return wa;
}

// ── NOTIFICAÇÃO DE RESPOSTA DO ALUNO ────────────────────────
export async function checkAndNotifyNewResponses() {
  try {
    const lastCheck = localStorage.getItem('pp_last_notif_check');
    const since = lastCheck ? new Date(lastCheck) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const biofeedback = await db.getAll('biofeedback');
    const students    = await db.getAll('students');

    // Respostas de pré-treino novas (enviadas pelo aluno via link)
    const newPre = biofeedback.filter(b =>
      b.formType === 'pre' &&
      b.submittedByStudent &&
      new Date(b.date) > since
    );

    // Respostas de pós-treino novas
    const newPost = biofeedback.filter(b =>
      (b.formType === 'post' || b.formType === 'complete') &&
      b.submittedByStudent &&
      new Date(b.completedAt || b.date) > since
    );

    // Sessões com pós preenchido pelo aluno
    const sessions = await db.getAll('sessions');
    const newPostSessions = sessions.filter(s =>
      s.postBiofeedback?.submittedByStudent &&
      s.postBiofeedback?.submittedAt &&
      new Date(s.postBiofeedback.submittedAt) > since
    );

    let count = newPre.length + newPost.length + newPostSessions.length;

    if (count > 0) {
      // Badge no sino
      updateNotificationBadge(count);

      // Browser notification
      sendBrowserNotification(
        `${count} nova${count > 1 ? 's' : ''} resposta${count > 1 ? 's' : ''}`,
        `${newPre.length > 0 ? `${newPre.length} pré-treino` : ''}${newPost.length + newPostSessions.length > 0 ? ` · ${newPost.length + newPostSessions.length} pós-treino` : ''}`.trim()
      );

      // Toast
      if (newPre.length > 0) {
        const st = students.find(s => s.id === newPre[0].studentId);
        notify.info(`📋 ${st?.name || 'Aluno'} preencheu o pré-treino`);
      }
      if (newPostSessions.length > 0) {
        const session = newPostSessions[0];
        const st = students.find(s => s.id === session.studentId);
        notify.info(`✅ ${st?.name || 'Aluno'} preencheu o pós-treino — PSE ${session.postBiofeedback.pse}/10`);
      }
    }

    localStorage.setItem('pp_last_notif_check', new Date().toISOString());
    return { newPre, newPost: newPost.length + newPostSessions.length, total: count };
  } catch (e) {
    console.warn('Notification check error:', e);
    return { newPre: [], newPost: 0, total: 0 };
  }
}

// ── BADGE NO SINO DA SIDEBAR ────────────────────────────────
function updateNotificationBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

// ── PAINEL DE NOTIFICAÇÕES ──────────────────────────────────
export async function renderNotificationsPanel() {
  const biofeedback = await db.getAll('biofeedback');
  const sessions    = await db.getAll('sessions');
  const students    = await db.getAll('students');
  const schedules   = await db.getAll('schedules');

  const today = new Date().toDateString();
  const todaySchedules = schedules.filter(s =>
    s.status === 'scheduled' &&
    new Date(s.date).toDateString() === today
  );

  // Últimas respostas (últimas 48h)
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentResponses = [
    ...biofeedback
      .filter(b => b.submittedByStudent && new Date(b.date) > since48h)
      .map(b => ({
        type: b.formType === 'pre' ? 'pre' : 'post',
        studentId: b.studentId,
        date: b.date,
        data: b,
      })),
    ...sessions
      .filter(s => s.postBiofeedback?.submittedByStudent && new Date(s.postBiofeedback.submittedAt) > since48h)
      .map(s => ({
        type: 'post_session',
        studentId: s.studentId,
        date: s.postBiofeedback.submittedAt,
        data: s,
      })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return `
    <div style="min-width:320px;max-width:400px;max-height:500px;overflow-y:auto">

      ${todaySchedules.length > 0 ? `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border-color)">
        <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">
          Treinos de Hoje (${todaySchedules.length})
        </div>
        ${todaySchedules.map(s => {
          const st = students.find(x => x.id === s.studentId);
          return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)">
            <div>
              <div style="font-size:0.85rem;font-weight:500">${st?.name || 'Aluno'}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">${s.time || ''} · ${s.workoutName || 'Treino'}</div>
            </div>
            <button class="btn btn-ghost btn-sm send-reminder"
              data-student-id="${s.studentId}"
              data-schedule-id="${s.id}"
              title="Enviar lembrete via WhatsApp"
              style="padding:4px 8px;color:var(--primary)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          </div>`;
        }).join('')}
      </div>` : ''}

      <div style="padding:12px 16px">
        <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">
          Respostas Recentes (48h)
        </div>
        ${recentResponses.length > 0 ? recentResponses.slice(0, 10).map(r => {
          const st = students.find(x => x.id === r.studentId);
          const isPost = r.type === 'post' || r.type === 'post_session';
          const pse = r.type === 'post_session' ? r.data.postBiofeedback?.pse : r.data.pse;
          const icon = isPost ? '✅' : '📋';
          const label = isPost ? 'Pós-treino' : 'Pré-treino';
          const time = new Date(r.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dateStr = new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color)">
            <span style="font-size:1.2rem">${icon}</span>
            <div style="flex:1">
              <div style="font-size:0.85rem;font-weight:500">${st?.name || 'Aluno'}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">${label} · ${dateStr} às ${time}${pse ? ` · PSE ${pse}/10` : ''}</div>
            </div>
          </div>`;
        }).join('') : `<p class="text-sm text-muted text-center" style="padding:16px 0">Nenhuma resposta nas últimas 48h</p>`}
      </div>
    </div>
  `;
}

// ── POLLING — verificar respostas a cada 2 minutos ──────────
let _pollingInterval = null;

export function startNotificationPolling() {
  if (_pollingInterval) return;
  checkAndNotifyNewResponses(); // checar imediatamente
  _pollingInterval = setInterval(checkAndNotifyNewResponses, 2 * 60 * 1000);
}

export function stopNotificationPolling() {
  if (_pollingInterval) { clearInterval(_pollingInterval); _pollingInterval = null; }
}
