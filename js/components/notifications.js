import db from '../db.js';
import { openModal, closeModal } from './modal.js';
import { Calc } from '../utils/calculations.js';
import { notify } from './toast.js';

export async function checkNotifications() {
  const students = await db.getAll('students');
  const activeStudents = students.filter(s => s.status === 'Ativo');
  const settings = await db.get('settings', 'trainer') || {};
  const tz = settings.timezone || 'America/Sao_Paulo';
  
  // Calculate "now" based on timezone
  const nowStr = new Date().toLocaleString("en-US", { timeZone: tz });
  const now = new Date(nowStr);
  const nowMs = now.getTime();
  
  const notifications = [];
  
  // 1. Avaliações Vencidas (mais de 90 dias)
  const assessments = await db.getAll('assessments');
  activeStudents.forEach(s => {
    const studentAsses = assessments.filter(a => a.studentId === s.id);
    studentAsses.sort((a,b) => new Date(b.date) - new Date(a.date));
    const last = studentAsses[0];
    if (last) {
      const days = (nowMs - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 90) {
        notifications.push({
          id: `eval-vencida-${s.id}`,
          type: 'warning', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', title: 'Avaliação Vencida',
          desc: `A última avaliação de <strong>${s.name}</strong> foi há ${Math.round(days)} dias.`,
          link: '#/avaliacoes'
        });
      }
    } else {
      notifications.push({
        id: `eval-pendente-${s.id}`,
        type: 'info', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', title: 'Avaliação Pendente',
        desc: `<strong>${s.name}</strong> não possui nenhuma avaliação registrada.`,
        link: '#/avaliacoes'
      });
    }
  });

  // 2. Aniversariantes do mês
  const currentMonth = now.getMonth();
  activeStudents.forEach(s => {
    if (s.birthDate) {
      const bDate = new Date(s.birthDate);
      if (bDate.getMonth() === currentMonth) {
        notifications.push({
          id: `aniv-${s.id}-${currentMonth}`,
          type: 'success', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>', title: 'Aniversariante do Mês',
          desc: `<strong>${s.name}</strong> faz aniversário este mês (dia ${bDate.getDate() + 1}).`,
          link: '#/alunos'
        });
      }
    }
  });

  // 3. Fim de Ciclo (Macrociclos)
  const macros = await db.getAll('macrocycles');
  activeStudents.forEach(s => {
    const studentMacros = macros.filter(m => m.studentId === s.id && m.endDate);
    studentMacros.forEach(m => {
      const diffDays = (new Date(m.endDate).getTime() - nowMs) / (1000 * 60 * 60 * 24);
      // Avisa se faltam 5 dias ou se terminou nos últimos 3 dias
      if (diffDays <= 5 && diffDays >= -3) {
        let msg = diffDays >= 0 ? `termina em ${Math.ceil(diffDays)} dia(s)` : `terminou há ${Math.abs(Math.floor(diffDays))} dia(s)`;
        if (Math.ceil(diffDays) === 0) msg = 'termina hoje';
        notifications.push({
          id: `fim-macro-${m.id}`,
          type: 'warning', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>', title: 'Fim de Macrociclo',
          desc: `O macrociclo "<strong>${m.name}</strong>" de ${s.name} ${msg}.`,
          link: '#/periodizacao'
        });
      }
    });
  });

  // 4. Anamnese não preenchida
  const anamneses = await db.getAll('anamneses');
  activeStudents.forEach(s => {
    const hasAnamnese = anamneses.some(a => a.studentId === s.id || a.fullName === s.name);
    if (!hasAnamnese) {
      notifications.push({
        id: `anam-pendente-${s.id}`,
        type: 'info', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', title: 'Anamnese Pendente',
        desc: `<strong>${s.name}</strong> ainda não preencheu a anamnese.`,
        link: '#/anamnese'
      });
    }
  });

  // 5. Respostas de Anamnese Recentes
  anamneses.forEach(a => {
    if (a.submittedAt) {
      const diffDays = (nowMs - new Date(a.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 3 && diffDays >= 0) {
        notifications.push({
          id: `nova-anam-${a.id || a.fullName}`,
          type: 'info', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', title: 'Nova Anamnese',
          desc: `Nova resposta de anamnese recebida de <strong>${a.fullName}</strong>.`,
          link: '#/anamnese'
        });
      }
    }
  });

  // 5. Biofeedback (Pré e Pós Treino)
  const biofeedbacks = await db.getAll('biofeedback');
  biofeedbacks.forEach(b => {
    const diffHours = (nowMs - new Date(b.date).getTime()) / (1000 * 60 * 60);
    if (diffHours >= 0 && diffHours <= 24) {
      const st = students.find(s => s.id === b.studentId);
      if (!st) return;
      if (b.formType === 'pre') {
        const estresseAlert = b.stress >= 7 ? '<span style="color:var(--danger)"> (Estresse Alto)</span>' : '';
        const painAlert = b.pain >= 7 ? '<span style="color:var(--danger)"> (Dor Alta)</span>' : '';
        notifications.push({
          id: `pre-bio-${b.id || b.date}`,
          type: 'info', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title: 'Check-in Pré-treino',
          desc: `<strong>${st.name}</strong> enviou check-in${estresseAlert}${painAlert}.`,
          link: '#/treino-ao-vivo'
        });
      } else if (b.formType === 'post') {
        notifications.push({
          id: `post-bio-${b.id || b.date}`,
          type: 'info', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', title: 'Biofeedback Pós-treino',
          desc: `<strong>${st.name}</strong> reportou PSE ${b.pse || '-'} no último treino.`,
          link: '#/relatorios'
        });
      }
    }
  });

  // 6. Aulas / Agendamentos e Sessões
  const schedules = await db.getAll('schedules');
  const todayStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD local format
  schedules.forEach(sch => {
    if (sch.date === todayStr) {
      const st = students.find(s => s.id === sch.studentId);
      if (st) {
        notifications.push({
          id: `aula-hoje-${sch.id}`,
          type: 'info', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', title: 'Aula Agendada Hoje',
          desc: `Você tem aula agendada às <strong>${sch.time}</strong> com ${st.name}.`,
          link: '#/agenda'
        });
      }
    }
  });

  const sessions = await db.getAll('sessions');
  sessions.forEach(sess => {
    if (sess.status === 'completed') {
      const diffHours = (nowMs - new Date(sess.date).getTime()) / (1000 * 60 * 60);
      if (diffHours >= 0 && diffHours <= 24) {
        const st = students.find(s => s.id === sess.studentId);
        if (st) {
          notifications.push({
            id: `treino-concluido-${sess.id}`,
            type: 'success', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>', title: 'Treino Concluído',
            desc: `<strong>${st.name}</strong> concluiu o treino "${sess.workoutName || 'Sessão'}".`,
            link: '#/treino-ao-vivo'
          });
        }
      }
    }
  });

  // Load dismissed items from localStorage
  const dismissed = JSON.parse(localStorage.getItem('pp_notifs_dismissed') || '{}');
  const nowTime = Date.now();
  const cleanedDismissed = {};
  let changed = false;
  for (const [key, ts] of Object.entries(dismissed)) {
    // Retain dismissed items for 30 days
    if (nowTime - ts < 30 * 24 * 60 * 60 * 1000) {
      cleanedDismissed[key] = ts;
    } else {
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem('pp_notifs_dismissed', JSON.stringify(cleanedDismissed));
  }

  // Filter out any dismissed notifications
  return notifications.filter(n => !cleanedDismissed[n.id]);
}

async function refreshNotificationsModal(notifsListContainer, badge) {
  const notifs = await checkNotifications();
  const badgeVal = notifs.length;
  if (badge) {
    if (badgeVal > 0) {
      badge.style.display = 'flex';
      badge.textContent = badgeVal > 9 ? '9+' : badgeVal;
    } else {
      badge.style.display = 'none';
    }
  }

  const countText = document.getElementById('notifCountText');
  if (countText) {
    countText.textContent = `${notifs.length} notificação(oes)`;
  }

  if (notifs.length === 0) {
    notifsListContainer.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--text-muted)">
        <div style="color:var(--success);margin-bottom:10px"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <div>Tudo em dia! Nenhuma notificação pendente.</div>
      </div>`;
    const clearAllBtn = document.getElementById('clearAllNotifBtn');
    if (clearAllBtn) clearAllBtn.style.display = 'none';
  } else {
    notifsListContainer.innerHTML = notifs.map(n => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card)">
        <div style="font-size:1.5rem">${n.icon}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:0.9rem;margin-bottom:2px;color:var(--text-primary)">${n.title}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${n.desc}</div>
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
          ${n.link ? `<a href="${n.link}" class="btn btn-ghost btn-sm" onclick="document.querySelector('.modal-close')?.click()">Acessar</a>` : ''}
          <button class="btn btn-ghost btn-sm dismiss-notif-btn" data-id="${n.id}" style="color:var(--text-muted);padding:4px 6px" title="Dispensar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');
    
    // Bind dismiss buttons
    notifsListContainer.querySelectorAll('.dismiss-notif-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const dismissed = JSON.parse(localStorage.getItem('pp_notifs_dismissed') || '{}');
        dismissed[id] = Date.now();
        localStorage.setItem('pp_notifs_dismissed', JSON.stringify(dismissed));
        notify.success('Notificação dispensada!');
        await refreshNotificationsModal(notifsListContainer, badge);
      });
    });
  }
}

export async function initNotifications() {
  const btn = document.getElementById('notificationBtn');
  const badge = document.getElementById('notifBadge');
  if (!btn) return;

  const notifs = await checkNotifications();
  const seenHashes = JSON.parse(localStorage.getItem('pp_notifs_seen') || '[]');
  const currentHashes = notifs.map(n => n.title + n.desc);
  const unread = currentHashes.filter(h => !seenHashes.includes(h));

  if (unread.length > 0) {
    badge.style.display = 'flex';
    badge.textContent = unread.length > 9 ? '9+' : unread.length;
  } else {
    badge.style.display = 'none';
  }

  btn.addEventListener('click', () => {
    localStorage.setItem('pp_notifs_seen', JSON.stringify(currentHashes));
    badge.style.display = 'none';
    openModal({
      title: '<svg style="display:inline;vertical-align:text-bottom;margin-right:4px" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> Central de Notificações',
      size: 'md',
      content: `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span class="text-sm text-muted" id="notifCountText">${notifs.length} notificação(oes)</span>
          ${notifs.length ? `<button id="clearAllNotifBtn" class="btn btn-ghost btn-sm" style="color:var(--danger);font-size:0.78rem">Limpar todas</button>` : ''}
        </div>
        <div class="notifications-list" id="modalNotifsList" style="display:flex;flex-direction:column;gap:12px;">
          <!-- Dynamically filled -->
        </div>
      `
    });

    // Populate and bind immediately
    const container = document.getElementById('modalNotifsList');
    if (container) {
      refreshNotificationsModal(container, badge);
    }

    // Bind clear all button
    setTimeout(() => {
      document.getElementById('clearAllNotifBtn')?.addEventListener('click', async () => {
        const activeNotifs = await checkNotifications();
        const dismissed = JSON.parse(localStorage.getItem('pp_notifs_dismissed') || '{}');
        activeNotifs.forEach(n => {
          dismissed[n.id] = Date.now();
        });
        localStorage.setItem('pp_notifs_dismissed', JSON.stringify(dismissed));
        badge.style.display = 'none';
        notify.success('Todas as notificações foram limpas!');
        const container = document.getElementById('modalNotifsList');
        if (container) {
          await refreshNotificationsModal(container, badge);
        }
      });
    }, 100);
  });
}
