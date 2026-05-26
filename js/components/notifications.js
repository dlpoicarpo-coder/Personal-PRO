import db from '../db.js';
import { openModal, closeModal } from './modal.js';
import { Calc } from '../utils/calculations.js';

export async function checkNotifications() {
  const students = await db.getAll('students');
  const activeStudents = students.filter(s => s.status === 'Ativo');
  
  const notifications = [];
  const now = new Date();
  
  // 1. Avaliações Vencidas (mais de 90 dias)
  const assessments = await db.getAll('assessments');
  activeStudents.forEach(s => {
    const studentAsses = assessments.filter(a => a.studentId === s.id);
    studentAsses.sort((a,b) => new Date(b.date) - new Date(a.date));
    const last = studentAsses[0];
    if (last) {
      const days = (now - new Date(last.date)) / (1000 * 60 * 60 * 24);
      if (days > 90) {
        notifications.push({
          type: 'warning',
          icon: '📊',
          title: 'Avaliação Vencida',
          desc: `A última avaliação de <strong>${s.name}</strong> foi há ${Math.round(days)} dias.`,
          link: '#/avaliacoes'
        });
      }
    } else {
      notifications.push({
        type: 'info',
        icon: '📝',
        title: 'Avaliação Pendente',
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
          type: 'success',
          icon: '🎂',
          title: 'Aniversariante do Mês',
          desc: `<strong>${s.name}</strong> faz aniversário este mês (dia ${bDate.getDate() + 1}).`,
          link: '#/alunos'
        });
      }
    }
  });

  return notifications;
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
      title: '🔔 Central de Notificações',
      size: 'md',
      content: `
        <div class="notifications-list" style="display:flex;flex-direction:column;gap:12px;">
          ${notifs.length ? notifs.map(n => `
            <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card)">
              <div style="font-size:1.5rem">${n.icon}</div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:2px;color:var(--text-primary)">${n.title}</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">${n.desc}</div>
              </div>
              ${n.link ? `<a href="${n.link}" class="btn btn-ghost btn-sm" onclick="document.querySelector('.modal-close')?.click()">Acessar</a>` : ''}
            </div>
          `).join('') : `
            <div style="text-align:center;padding:30px;color:var(--text-muted)">
              <div style="font-size:2rem;margin-bottom:10px">🎉</div>
              <div>Tudo em dia! Nenhuma notificação pendente.</div>
            </div>
          `}
        </div>
      `
    });
  });
}
