// ========================================
// PERSONAL PRO — Biweekly Summary Page
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';

export async function renderWeeklySummary() {
  const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
  const sessions = await db.getAll('sessions');
  const finance = await db.getAll('financial');
  
  const now = new Date();
  const periodEnd = new Date(now);
  const periodStart = new Date(now); 
  periodStart.setDate(now.getDate() - 15);
  periodStart.setHours(0, 0, 0, 0);

  // 1. Atividade da Quinzena
  const periodSessions = sessions.filter(x => new Date(x.date) >= periodStart && new Date(x.date) <= periodEnd);
  const completed = periodSessions.filter(x => x.status === 'completed');
  const missed = periodSessions.filter(x => x.status === 'missed');
  
  // Resumo por Aluno
  const studentMetrics = students.map(st => {
    const sSessions = periodSessions.filter(s => s.studentId === st.id);
    const sCompleted = sSessions.filter(s => s.status === 'completed');
    const sMissed = sSessions.filter(s => s.status === 'missed');
    const sVol = sCompleted.reduce((acc, curr) => acc + (curr.totalVolume || 0), 0);
    const sDurSec = sCompleted.reduce((acc, curr) => acc + (curr.totalDuration || 0), 0);
    const sDurMin = sDurSec / 60;
    const density = sDurMin > 0 ? (sVol / sDurMin) : 0; // kg/min
    const kcal = sDurMin * 6; // Estimativa de 6 kcal por minuto de treino resistido

    return {
      ...st,
      completedCount: sCompleted.length,
      missedCount: sMissed.length,
      volume: sVol,
      density: density,
      kcal: kcal
    };
  }).sort((a,b) => b.completedCount - a.completedCount);

  // 2. Aniversariantes da Quinzena
  const bdays = students.filter(s => {
    if (!s.birthDate) return false;
    const parts = s.birthDate.split('-');
    if (parts.length !== 3) return false;
    const bMonth = parseInt(parts[1], 10) - 1;
    const bDay = parseInt(parts[2], 10);
    const bDateThisYear = new Date(now.getFullYear(), bMonth, bDay);
    return bDateThisYear >= periodStart && bDateThisYear <= periodEnd;
  }).sort((a,b) => {
    const d1 = parseInt(a.birthDate.split('-')[2]);
    const d2 = parseInt(b.birthDate.split('-')[2]);
    return d1 - d2;
  });

  // 3. Financeiro da Quinzena
  const wkFinance = finance.filter(f => {
    if (f.status === 'Pago') return false;
    const dDate = new Date(f.dueDate);
    return dDate >= periodStart && dDate <= periodEnd;
  }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

  const totalAdesao = periodSessions.length ? Math.round((completed.length / periodSessions.length) * 100) : 0;

  return `
    <div class="page-header">
      <div>
        <h1>Balanço Quinzenal</h1>
        <p class="subtitle">Resumo estratégico de ${periodStart.toLocaleDateString('pt-BR')} a ${periodEnd.toLocaleDateString('pt-BR')}</p>
      </div>
    </div>
    
    <div class="stats-grid mb-xl" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card">
        <div class="stat-label">SESSÕES REALIZADAS</div>
        <div class="stat-value" style="color:var(--primary)">${completed.length}</div>
        <div class="text-xs text-muted mt-xs">nos últimos 15 dias</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">TAXA DE ADESÃO</div>
        <div class="stat-value" style="color:${totalAdesao >= 80 ? 'var(--success)' : totalAdesao >= 50 ? 'var(--warning)' : 'var(--danger)'}">${totalAdesao}%</div>
        <div class="text-xs text-muted mt-xs">treinos feitos x marcados</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">COBRANÇAS DA QUINZENA</div>
        <div class="stat-value" style="color:var(--warning)">${wkFinance.length}</div>
        <div class="text-xs text-muted mt-xs">pendentes ou vencendo</div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Coluna 1: Lista de Alunos -->
      <div class="flex flex-col gap-lg">
        <div class="card" style="padding:0">
          <div class="card-header" style="padding:16px"><span class="card-title" style="color:var(--primary)">Atividade por Aluno</span></div>
          <div class="table-container" style="max-height: 500px; overflow-y: auto;">
            <table class="data-table" style="width:100%; font-size:0.85rem">
              <thead>
                <tr>
                  <th style="padding:12px 16px">Aluno</th>
                  <th style="text-align:center">Concluídas</th>
                  <th style="text-align:center">Faltas</th>
                  <th style="text-align:right">Volume (15d)</th>
                  <th style="text-align:right">Gasto Calórico</th>
                  <th style="text-align:right; padding-right:16px">Densidade</th>
                </tr>
              </thead>
              <tbody>
                ${studentMetrics.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum aluno ativo.</td></tr>' : ''}
                ${studentMetrics.map(s => `
                  <tr>
                    <td style="padding:12px 16px; font-weight:600">${s.name}</td>
                    <td style="text-align:center; color:var(--success)">${s.completedCount}</td>
                    <td style="text-align:center; color:${s.missedCount > 0 ? 'var(--danger)' : 'var(--text-muted)'}">${s.missedCount}</td>
                    <td style="text-align:right; color:var(--text-muted)">${s.volume ? (s.volume/1000).toFixed(1)+'t' : '-'}</td>
                    <td style="text-align:right; color:var(--warning)">${s.kcal ? Math.round(s.kcal) + ' kcal' : '-'}</td>
                    <td style="text-align:right; padding-right:16px; color:var(--accent)">${s.density ? Math.round(s.density) + ' kg/min' : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Coluna 2: Alertas -->
      <div class="flex flex-col gap-lg">
        <div class="card">
          <div class="card-header"><span class="card-title" style="color:var(--warning)">Financeiro da Quinzena</span></div>
          ${wkFinance.length === 0 ? '<p class="text-muted text-sm" style="padding:16px 0">Nenhuma cobrança pendente para este período.</p>' : ''}
          <div class="flex flex-col gap-sm">
            ${wkFinance.map(f => {
              const st = students.find(s => s.id === f.studentId);
              return `
              <div class="flex items-center gap-md" style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05)">
                <div style="flex:1">
                  <div style="font-weight:600">${st ? st.name : 'Aluno Removido'}</div>
                  <div class="text-xs text-muted">Vence em: ${Calc.formatDate(f.dueDate)}</div>
                </div>
                <div style="font-weight:800">R$ ${f.amount.toFixed(2)}</div>
              </div>
            `}).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title" style="color:var(--accent)">Aniversariantes</span></div>
          ${bdays.length === 0 ? '<p class="text-muted text-sm" style="padding:16px 0">Nenhum aniversariante nesta quinzena.</p>' : ''}
          <div class="flex flex-col gap-sm">
            ${bdays.map(s => {
              const parts = s.birthDate.split('-');
              return `
              <div class="flex items-center gap-md" style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05)">
                <div class="avatar avatar-md" style="background:var(--accent-glow); color:var(--accent)">${parts[2]}/${parts[1]}</div>
                <div style="flex:1">
                  <div style="font-weight:600">${s.name}</div>
                  <div class="text-xs text-muted">${Calc.calcularIdade(s.birthDate)} anos</div>
                </div>
                ${s.phone ? `<button class="btn btn-ghost btn-sm" onclick="window.open('https://wa.me/55${s.phone.replace(/\\D/g,'')}?text=Parabéns%20${encodeURIComponent(s.name.split(' ')[0])}!%20Feliz%20aniversário!','_blank')" style="color:#25d366">Parabéns</button>` : ''}
              </div>
            `}).join('')}
          </div>
        </div>
        
      </div>
    </div>
  `;
}

export function initWeeklySummary(navigateFn) {
  // Inicializações se necessárias
}
