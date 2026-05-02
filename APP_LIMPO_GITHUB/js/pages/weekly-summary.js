// ========================================
// PERSONAL PRO — Weekly Summary Page
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';

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

export function initWeeklySummary(navigateFn) { /* static page, no events needed */ }
