import db from '../db.js';
import { openModal, closeModal } from './modal.js';
import { Calc } from '../utils/calculations.js';

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
          type: 'warning', icon: '📊', title: 'Avaliação Vencida',
          desc: `A última avaliação de <strong>${s.name}</strong> foi há ${Math.round(days)} dias.`,
          link: '#/avaliacoes'
        });
      }
    } else {
      notifications.push({
        type: 'info', icon: '📝', title: 'Avaliação Pendente',
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
          type: 'success', icon: '🎂', title: 'Aniversariante do Mês',
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
          type: 'warning', icon: '🔄', title: 'Fim de Macrociclo',
          desc: `O macrociclo "<strong>${m.name}</strong>" de ${s.name} ${msg}.`,
          link: '#/periodizacao'
        });
      }
    });
  });

  // 4. Respostas da Anamnese
  const anamneses = await db.getAll('anamneses');
  anamneses.forEach(a => {
    if (a.submittedAt) {
      const diffDays = (nowMs - new Date(a.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 3 && diffDays >= 0) {
        notifications.push({
          type: 'info', icon: '📋', title: 'Nova Anamnese',
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
          type: 'info', icon: '🔋', title: 'Check-in Pré-treino',
          desc: `<strong>${st.name}</strong> enviou check-in${estresseAlert}${painAlert}.`,
          link: '#/treino-ao-vivo'
        });
      } else if (b.formType === 'post') {
        notifications.push({
          type: 'info', icon: '🥵', title: 'Biofeedback Pós-treino',
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
          type: 'info', icon: '📅', title: 'Aula Agendada Hoje',
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
            type: 'success', icon: '🏆', title: 'Treino Concluído',
            desc: `<strong>${st.name}</strong> concluiu o treino "${sess.workoutName || 'Sessão'}".`,
            link: '#/treino-ao-vivo'
          });
        }
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
