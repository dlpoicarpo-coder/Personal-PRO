// ========================================
// PERSONAL PRO — Weekly Summary Page
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { notify } from '../components/toast.js';

const ICON_WA = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

export async function renderWeeklySummary() {
  const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
  const sessions = await db.getAll('sessions');
  const biofeedback = await db.getAll('biofeedback');
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  return `
    <div class="page-header"><div><h1>Resumo Semanal</h1><p class="subtitle">Semana de ${weekStart.toLocaleDateString('pt-BR')} a ${weekEnd.toLocaleDateString('pt-BR')}</p></div></div>
    <div class="stagger-children">${students.map(s => {
    const wkSessions = sessions.filter(x => x.studentId === s.id && x.status === 'completed' && new Date(x.date) >= weekStart && new Date(x.date) < weekEnd);
    const lastWkSessions = sessions.filter(x => x.studentId === s.id && x.status === 'completed' && new Date(x.date) >= lastWeekStart && new Date(x.date) < weekStart);
    const wkBf = biofeedback.filter(b => b.studentId === s.id && new Date(b.date) >= weekStart && new Date(b.date) < weekEnd);
    const totalVolume = wkSessions.reduce((t, x) => t + (x.totalVolume || 0), 0);
    const totalDuration = wkSessions.reduce((t, x) => t + (x.totalDuration || 0), 0);
    const avgPse = wkBf.length ? (wkBf.reduce((t, b) => t + (b.pse || 0), 0) / wkBf.length).toFixed(1) : '-';
    const avgSleep = wkBf.length ? (wkBf.reduce((t, b) => t + (b.sleep || 0), 0) / wkBf.length).toFixed(1) : '-';
    const avgMood = wkBf.length ? (wkBf.reduce((t, b) => t + (b.mood || 0), 0) / wkBf.length).toFixed(1) : '-';
    const weekLoad = wkBf.reduce((t, b) => t + (b.trainingLoad || 0), 0);
    const last4wLoads = [];
    for (let i = 1; i <= 4; i++) { const ws = new Date(weekStart); ws.setDate(ws.getDate() - 7 * i); const we = new Date(ws); we.setDate(we.getDate() + 7); last4wLoads.push(biofeedback.filter(b => b.studentId === s.id && new Date(b.date) >= ws && new Date(b.date) < we).reduce((t, b) => t + (b.trainingLoad || 0), 0)); }
    const chronicLoad = last4wLoads.reduce((t, l) => t + l, 0) / 4;
    const acwr = Calc.acwr(weekLoad, chronicLoad);
    const acwrC = Calc.acwrClassificacao(acwr);
    const prevSessions = lastWkSessions.length;
    const diff = wkSessions.length - prevSessions;

    return `<div class="card mb-md">
        <div class="flex items-center gap-md mb-md">
          <div class="avatar avatar-lg">${s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div style="flex:1"><h3 style="margin:0">${s.name}</h3><div class="text-muted text-sm">${s.code} · ${s.goal || '-'}</div></div>
          <div>
            ${s.phone ? `<button class="btn btn-ghost btn-sm wa-summary" style="color:#25d366"
              data-phone="${s.phone}"
              data-name="${s.name}"
              data-sessions="${wkSessions.length}"
              data-vol="${totalVolume}"
              data-dur="${Math.round(totalDuration / 60)}"
              data-pse="${avgPse}"
              data-sleep="${avgSleep}"
              data-acwr="${acwr.toFixed(2)} (${acwrC.label})">
              ${ICON_WA} Enviar
            </button>` : `<span class="text-xs text-muted">Sem WhatsApp</span>`}
          </div>
        </div>
        <div class="stats-grid" style="grid-template-columns:repeat(6,1fr)">
          <div class="stat-card" style="text-align:center"><div class="stat-label">SESSÕES</div><div class="stat-value text-gradient">${wkSessions.length}</div><div class="stat-change ${diff >= 0 ? 'positive' : 'negative'}">${diff >= 0 ? '+' : ''}${diff} vs anterior</div></div>
          <div class="stat-card" style="text-align:center"><div class="stat-label">VOLUME</div><div class="stat-value">${totalVolume}kg</div></div>
          <div class="stat-card" style="text-align:center"><div class="stat-label">DURAÇÃO</div><div class="stat-value">${Math.round(totalDuration / 60)}min</div></div>
          <div class="stat-card" style="text-align:center"><div class="stat-label">PSE MÉDIA</div><div class="stat-value">${avgPse}</div></div>
          <div class="stat-card" style="text-align:center"><div class="stat-label">SONO</div><div class="stat-value">${avgSleep}</div></div>
          <div class="stat-card" style="text-align:center"><div class="stat-label">ACWR</div><div class="stat-value"><span class="badge badge-${acwrC.color}">${acwr.toFixed(2)}</span></div><div class="stat-change">${acwrC.label}</div></div>
        </div>
      </div>`;
  }).join('')}</div>
  `;
}

export function initWeeklySummary(navigateFn) {
  document.querySelectorAll('.wa-summary').forEach(btn => {
    btn.addEventListener('click', () => {
      const { phone, name, sessions, vol, dur, pse, sleep, acwr } = btn.dataset;
      const firstName = name.split(' ')[0];
      const msg = `Olá ${firstName}! 👋

Aqui está o seu *Resumo Semanal* de Treinos:
✅ *Sessões concluídas:* ${sessions}
🏋️‍♂️ *Volume Total:* ${vol}kg
⏱️ *Duração Total:* ${dur}min
🧠 *PSE Média:* ${pse}
🛌 *Sono Médio:* ${sleep}
📊 *ACWR:* ${acwr}

Continue assim e vamos juntos em busca da sua melhor versão! 💪`;

      sendWhatsApp(phone, msg);
      notify.success('WhatsApp aberto para envio!');
    });
  });
}
