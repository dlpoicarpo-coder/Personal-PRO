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
    // "since" para badge = últimas 24h (sempre mostra respostas recentes)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // "since" para toast = última vez que checou (evita repetir toast)
    const lastCheck = localStorage.getItem('pp_last_notif_check');
    const sinceToast = lastCheck
      ? new Date(lastCheck)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const students  = await db.getAll('students');
    const schedules = await db.getAll('schedules');
    const sessions  = await db.getAll('sessions');
    const macros    = await db.getAll('macrocycles');

    // Data local hoje (YYYY-MM-DD)
    const _d = new Date();
    const todayStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;

    // ── Treinos de hoje ──────────────────────────────────────
    const todaySchedules = schedules.filter(s =>
      s.status === 'scheduled' && (s.date||'').slice(0,10) === todayStr
    );

    // Mostrar treinos de hoje no badge SEMPRE (não bloquear por dia)
    if (todaySchedules.length > 0) {
      // Toast só uma vez por sessão (não por dia — usar sessionStorage)
      if (!sessionStorage.getItem('pp_today_notif_shown')) {
        todaySchedules.forEach(s => {
          const st = students.find(x => x.id === s.studentId);
          notify.info(`📅 Treino hoje: ${st?.name || 'Aluno'} às ${s.time || '—'}`);
        });
        sessionStorage.setItem('pp_today_notif_shown', '1');
      }
    }

    // ── Biofeedback novo de todos os alunos ─────────────────
    const activeStudents = students.filter(s => s.status === 'Ativo');
    const allBfArrays    = await Promise.all(
      activeStudents.map(s => db.getAllForStudent('biofeedback', s.id).catch(() => []))
    );
    const allBf = allBfArrays.flat();

    // Respostas de pré novas (badge = 24h, toast = desde último check)
    const newPre = allBf.filter(b =>
      b.formType === 'pre' &&
      new Date(b.submittedAt || b.date) > since24h
    );
    const newPreToast = allBf.filter(b =>
      b.formType === 'pre' &&
      new Date(b.submittedAt || b.date) > sinceToast
    );

    // Respostas de pós novas
    const newPost = allBf.filter(b =>
      (b.formType === 'post' || b.formType === 'complete') &&
      new Date(b.submittedAt || b.completedAt || b.date) > since24h
    );
    const newPostToast = allBf.filter(b =>
      (b.formType === 'post' || b.formType === 'complete') &&
      new Date(b.submittedAt || b.completedAt || b.date) > sinceToast
    );

    // Sessões com pós preenchido
    const newPostSessions = sessions.filter(s =>
      s.postBiofeedback?.pse &&
      s.postBiofeedback.submittedAt &&
      new Date(s.postBiofeedback.submittedAt) > since24h
    );
    const newPostSessionsToast = sessions.filter(s =>
      s.postBiofeedback?.pse &&
      s.postBiofeedback.submittedAt &&
      new Date(s.postBiofeedback.submittedAt) > sinceToast
    );

    // ── Macrociclos encerrando em ≤7 dias ───────────────────
    const macroAlerts = macros
      .filter(m => m.status === 'active' && m.startDate && m.totalWeeks)
      .filter(m => {
        const endMs = new Date(m.startDate + 'T12:00:00').getTime() + m.totalWeeks * 7 * 86400000;
        const days  = Math.ceil((endMs - Date.now()) / 86400000);
        return days >= 0 && days <= 7;
      });

    // ── Reavaliações pendentes (>30 dias) ───────────────────
    const allStudents   = await db.getAll('students');
    const allAssessments= await db.getAll('assessments');
    const reassessAlerts = allStudents
      .filter(s => s.status === 'Ativo')
      .map(s => {
        const last = allAssessments
          .filter(a => a.studentId === s.id)
          .sort((a,b) => new Date(b.date)-new Date(a.date))[0];
        const days = last
          ? Math.floor((Date.now()-new Date(last.date))/86400000)
          : 999;
        return { ...s, daysSince: days, lastAss: last };
      })
      .filter(s => s.daysSince > 30)
      .sort((a,b) => b.daysSince-a.daysSince);

    // Badge = treinos hoje + respostas + macrociclos + reavaliações críticas (>60d)
    const criticalReassess = reassessAlerts.filter(s => s.daysSince > 60);
    const total = todaySchedules.length + newPre.length + newPost.length
                + newPostSessions.length + macroAlerts.length + criticalReassess.length;
    updateNotificationBadge(total);

    // ── Toasts para respostas novas (só desde último check) ──
    if (newPreToast.length > 0) {
      const st = students.find(s => s.id === newPreToast[0].studentId);
      notify.info(`📋 ${st?.name || 'Aluno'} preencheu o pré-treino`);
    }
    if (newPostToast.length + newPostSessionsToast.length > 0) {
      const sid = newPostToast[0]?.studentId || newPostSessionsToast[0]?.studentId;
      const st  = students.find(s => s.id === sid);
      notify.success(`✅ ${st?.name || 'Aluno'} preencheu o pós-treino`);
    }
    macroAlerts.forEach(m => {
      const st   = students.find(s => s.id === m.studentId);
      const endMs= new Date(m.startDate+'T12:00:00').getTime() + m.totalWeeks*7*86400000;
      const days = Math.ceil((endMs - Date.now()) / 86400000);
      notify.warning(`⏰ ${st?.name||'Aluno'}: macrociclo encerra em ${days===0?'hoje':days+' dia(s)'}`);
    });

    localStorage.setItem('pp_last_notif_check', new Date().toISOString());
    return { todaySchedules, newPre, newPost: newPost.length + newPostSessions.length, macroAlerts, total };
  } catch (e) {
    console.warn('Notification check error:', e);
    return { todaySchedules: [], newPre: [], newPost: 0, macroAlerts: [], total: 0 };
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
  // Carregar dados base primeiro
  const students    = await db.getAll('students');
  const sessions    = await db.getAll('sessions');
  const schedules   = await db.getAll('schedules');
  const macrocycles = await db.getAll('macrocycles');

  // Biofeedback — mesclar trainer + formulários públicos
  const biofeedback_raw = await db.getAll('biofeedback');
  const activeSt = students.filter(s => s.status === 'Ativo');
  const pubBfArr = await Promise.all(
    activeSt.map(s => db.getAllForStudent('biofeedback', s.id).catch(()=>[]))
  );
  const pubBf = pubBfArr.flat();
  const bfMap = new Map();
  [...biofeedback_raw, ...pubBf].forEach(b => { if(b?.id) bfMap.set(b.id, b); });
  const biofeedback = [...bfMap.values()];

  // Usar data local (YYYY-MM-DD) para evitar problema de UTC
  const d = new Date();
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todaySchedules = schedules.filter(s => {
    if (s.status !== 'scheduled') return false;
    const schedDate = (s.date || '').slice(0, 10);
    return schedDate === todayLocal;
  });

  // Macrociclos encerrando em até 7 dias
  const nowMs = Date.now();
  const macroAlerts = macrocycles
    .filter(m => m.status === 'active' && m.startDate && m.totalWeeks)
    .map(m => {
      const endMs    = new Date(m.startDate + 'T12:00:00').getTime() + m.totalWeeks * 7 * 86400000;
      const daysLeft = Math.ceil((endMs - nowMs) / 86400000);
      return { ...m, daysLeft };
    })
    .filter(m => m.daysLeft >= 0 && m.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Últimas respostas (últimas 48h) — sem depender de submittedByStudent
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentResponses = [
    ...biofeedback
      .filter(b =>
        (b.formType === 'pre' || b.formType === 'post' || b.formType === 'complete') &&
        new Date(b.submittedAt || b.date) > since48h
      )
      .map(b => ({
        type:      b.formType === 'pre' ? 'pre' : 'post',
        studentId: b.studentId,
        date:      b.submittedAt || b.date,
        data:      b,
      })),
    ...sessions
      .filter(s =>
        s.postBiofeedback?.pse &&
        s.postBiofeedback.submittedAt &&
        new Date(s.postBiofeedback.submittedAt) > since48h
      )
      .map(s => ({
        type:      'post_session',
        studentId: s.studentId,
        date:      s.postBiofeedback.submittedAt,
        data:      s,
      })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Reavaliações pendentes
  const allAssessmentsNotif = await db.getAll('assessments');
  const reassessAlerts = students
    .filter(s => s.status === 'Ativo')
    .map(s => {
      const last = allAssessmentsNotif
        .filter(a => a.studentId === s.id)
        .sort((a,b) => new Date(b.date)-new Date(a.date))[0];
      const days = last ? Math.floor((Date.now()-new Date(last.date))/86400000) : 999;
      return { ...s, daysSince: days, lastAss: last };
    })
    .filter(s => s.daysSince > 30)
    .sort((a,b) => b.daysSince-a.daysSince);

  return `
    <div style="font-family:system-ui,sans-serif">

      ${todaySchedules.length > 0 ? `
      <div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#10b981;margin-bottom:10px">
          Treinos hoje (${todaySchedules.length})
        </div>
        ${todaySchedules.map(s => {
          const st = students.find(x => x.id === s.studentId);
          return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div>
              <div style="font-size:0.88rem;font-weight:600;color:#f1f5f9">${st?.name || 'Aluno'}</div>
              <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px">${s.time || ''} · ${s.workoutName || 'Treino'}</div>
            </div>
            <button class="btn btn-ghost btn-sm send-reminder"
              data-student-id="${s.studentId}"
              data-schedule-id="${s.id}"
              title="Enviar lembrete via WhatsApp"
              style="padding:6px 8px;color:#10b981;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:6px;cursor:pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          </div>`;
        }).join('')}
      </div>` : `
      <div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#10b981;margin-bottom:6px">Treinos hoje</div>
        <p style="font-size:0.82rem;color:#64748b;margin:0">Nenhum treino agendado para hoje</p>
      </div>`}

      ${macroAlerts.length > 0 ? `
      <div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8b5cf6;margin-bottom:10px">
          ⏰ Macrociclos encerrando (${macroAlerts.length})
        </div>
        ${macroAlerts.map(m => {
          const st = students.find(x => x.id === m.studentId);
          const urgColor = m.daysLeft === 0 ? '#ef4444' : m.daysLeft <= 2 ? '#f97316' : '#f59e0b';
          const urgLabel = m.daysLeft === 0 ? 'Encerra hoje!' : m.daysLeft === 1 ? 'Encerra amanhã' : `${m.daysLeft} dias restantes`;
          return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div>
              <div style="font-size:0.88rem;font-weight:600;color:#f1f5f9">${st?.name || 'Aluno'}</div>
              <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px">${m.name || 'Macrociclo'} · ${m.totalWeeks}sem</div>
            </div>
            <span style="font-size:0.75rem;font-weight:700;color:${urgColor};background:${urgColor}22;padding:3px 8px;border-radius:10px;white-space:nowrap">${urgLabel}</span>
          </div>`;
        }).join('')}
      </div>` : ''}

      ${recentResponses.length > 0 || true ? `
      <div style="padding:14px 18px">
        <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6366f1;margin-bottom:10px">
          Respostas recentes (48h)
        </div>
        ${recentResponses.length > 0 ? recentResponses.slice(0, 8).map(r => {
          const st = students.find(x => x.id === r.studentId);
          const isPost = r.type === 'post' || r.type === 'post_session';
          const pse = r.type === 'post_session' ? r.data.postBiofeedback?.pse : r.data.pse;
          const icon = isPost ? '✅' : '📋';
          const label = isPost ? 'Pós-treino' : 'Pré-treino';
          const labelColor = isPost ? '#10b981' : '#6366f1';
          const time = new Date(r.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dateStr = new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:1.1rem;min-width:22px">${icon}</span>
            <div style="flex:1">
              <div style="font-size:0.88rem;font-weight:600;color:#f1f5f9">${st?.name || 'Aluno'}</div>
              <div style="font-size:0.72rem;margin-top:2px">
                <span style="color:${labelColor}">${label}</span>
                <span style="color:#64748b"> · ${dateStr} às ${time}${pse ? ` · PSE ${pse}/10` : ''}</span>
              </div>
            </div>
          </div>`;
        }).join('') : `<p style="font-size:0.82rem;color:#64748b;margin:0;padding:8px 0">Nenhuma resposta nas últimas 48h</p>`}
      </div>

      ${reassessAlerts?.length > 0 ? `
      <div style="padding:14px 18px;border-top:1px solid rgba(255,255,255,0.08)">
        <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#f59e0b;margin-bottom:10px">
          📐 Reavaliações pendentes (${reassessAlerts.length})
        </div>
        ${reassessAlerts.slice(0,4).map(s => {
          const urgColor = s.daysSince>90?'#ef4444':s.daysSince>60?'#f97316':'#f59e0b';
          const label    = s.daysSince===999?'Nunca avaliado':`${s.daysSince} dias sem avaliar`;
          return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div>
              <div style="font-size:0.88rem;font-weight:600;color:#f1f5f9">${s.name}</div>
              <div style="font-size:0.72rem;color:${urgColor};margin-top:2px;font-weight:600">${label}</div>
              ${s.lastAss ? `<div style="font-size:0.65rem;color:#64748b">Última: ${new Date(s.lastAss.date).toLocaleDateString('pt-BR')}</div>` : ''}
            </div>
            <a href="#/avaliacoes" style="font-size:0.72rem;font-weight:700;color:${urgColor};background:${urgColor}22;padding:3px 8px;border-radius:10px;text-decoration:none;white-space:nowrap">Avaliar →</a>
          </div>`;
        }).join('')}
      </div>` : ''}

    </div>
  `:`<div style="padding:14px 18px"><p style="color:#64748b;font-size:0.82rem">Nenhuma notificação</p></div>`}
  `;
}

// ── POLLING — verificar respostas a cada 2 minutos ──────────
let _pollingInterval = null;

export function startNotificationPolling() {
  if (_pollingInterval) return;

  // Sempre resetar lastCheck ao iniciar nova sessão do app
  // Garante que treinos de hoje e respostas recentes sejam verificados
  const lastCheck = localStorage.getItem('pp_last_notif_check');
  if (lastCheck) {
    const lastDate = new Date(lastCheck).toDateString();
    if (lastDate !== new Date().toDateString()) {
      localStorage.removeItem('pp_last_notif_check');
      sessionStorage.removeItem('pp_today_notif_shown');
    }
  }

  // Aguardar 3 segundos para o app carregar antes de checar
  setTimeout(() => {
    checkAndNotifyNewResponses();
    _pollingInterval = setInterval(checkAndNotifyNewResponses, 2 * 60 * 1000);
  }, 3000);
}

export function stopNotificationPolling() {
  if (_pollingInterval) { clearInterval(_pollingInterval); _pollingInterval = null; }
}
