// ========================================
// PERSONAL PRO — Weekly Summary Page
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { sendWhatsApp } from '../utils/whatsapp.js';
import { notify } from '../components/toast.js';

export async function renderWeeklySummary() {
  const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
  const sessions = await db.getAll('sessions');
  const finance = await db.getAll('financial');
  
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

  // 1. Atividade da Semana
  const wkSessions = sessions.filter(x => new Date(x.date) >= weekStart && new Date(x.date) < weekEnd);
  const completed = wkSessions.filter(x => x.status === 'completed');
  const missed = wkSessions.filter(x => x.status === 'missed');
  
  // Alunos Destaque (mais sessões completadas)
  const studentActivity = {};
  completed.forEach(s => {
    studentActivity[s.studentId] = (studentActivity[s.studentId] || 0) + 1;
  });
  const topStudents = Object.entries(studentActivity)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => {
      const st = students.find(s => s.id === id);
      return st ? { ...st, count } : null;
    }).filter(Boolean);

  // 2. Aniversariantes da Semana
  const bdays = students.filter(s => {
    if (!s.birthDate) return false;
    // birthDate is usually YYYY-MM-DD
    const parts = s.birthDate.split('-');
    if (parts.length !== 3) return false;
    const bMonth = parseInt(parts[1], 10) - 1;
    const bDay = parseInt(parts[2], 10);
    // Create a date for this year's birthday
    const bDateThisYear = new Date(now.getFullYear(), bMonth, bDay);
    return bDateThisYear >= weekStart && bDateThisYear < weekEnd;
  }).sort((a,b) => {
    const d1 = parseInt(a.birthDate.split('-')[2]);
    const d2 = parseInt(b.birthDate.split('-')[2]);
    return d1 - d2;
  });

  // 3. Financeiro da Semana (A Vencer ou Vencidos na semana)
  const wkFinance = finance.filter(f => {
    if (f.status === 'Pago') return false;
    const dDate = new Date(f.dueDate);
    return dDate >= weekStart && dDate < weekEnd;
  }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

  return `
    <div class="page-header">
      <div>
        <h1>Briefing Operacional</h1>
        <p class="subtitle">Resumo estratégico para a semana de ${weekStart.toLocaleDateString('pt-BR')} a ${new Date(weekEnd.getTime()-86400000).toLocaleDateString('pt-BR')}</p>
      </div>
    </div>
    
    <div class="stats-grid mb-xl" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card">
        <div class="stat-label">SESSÕES REALIZADAS</div>
        <div class="stat-value" style="color:var(--primary)">${completed.length}</div>
        <div class="text-xs text-muted mt-xs">nesta semana</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">FALTAS REGISTRADAS</div>
        <div class="stat-value" style="color:${missed.length > 0 ? 'var(--danger)' : 'var(--success)'}">${missed.length}</div>
        <div class="text-xs text-muted mt-xs">nesta semana</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">COBRANÇAS DA SEMANA</div>
        <div class="stat-value" style="color:var(--warning)">${wkFinance.length}</div>
        <div class="text-xs text-muted mt-xs">pendentes ou vencendo</div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Coluna 1 -->
      <div class="flex flex-col gap-lg">
        <div class="card">
          <div class="card-header"><span class="card-title" style="color:var(--primary)">🏆 Alunos em Destaque</span></div>
          ${topStudents.length === 0 ? '<p class="text-muted text-sm" style="padding:16px 0">Nenhum treino registrado ainda nesta semana.</p>' : ''}
          <div class="flex flex-col gap-sm">
            ${topStudents.map(s => `
              <div class="flex items-center gap-md" style="padding:12px 0; border-bottom:1px solid var(--border-color)">
                <div class="avatar avatar-md">${s.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                <div style="flex:1">
                  <div style="font-weight:600">${s.name}</div>
                  <div class="text-xs text-muted">${s.count} sessões concluídas</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title" style="color:var(--warning)">💰 Financeiro da Semana</span></div>
          ${wkFinance.length === 0 ? '<p class="text-muted text-sm" style="padding:16px 0">Nenhuma cobrança pendente para esta semana.</p>' : ''}
          <div class="flex flex-col gap-sm">
            ${wkFinance.map(f => {
              const st = students.find(s => s.id === f.studentId);
              return `
              <div class="flex items-center gap-md" style="padding:12px 0; border-bottom:1px solid var(--border-color)">
                <div style="flex:1">
                  <div style="font-weight:600">${st ? st.name : 'Aluno Removido'}</div>
                  <div class="text-xs text-muted">Vence em: ${Calc.formatDate(f.dueDate)}</div>
                </div>
                <div style="font-weight:800">R$ ${f.amount.toFixed(2)}</div>
              </div>
            `}).join('')}
          </div>
        </div>
      </div>

      <!-- Coluna 2 -->
      <div class="flex flex-col gap-lg">
        <div class="card">
          <div class="card-header"><span class="card-title" style="color:var(--accent)">🎂 Aniversariantes</span></div>
          ${bdays.length === 0 ? '<p class="text-muted text-sm" style="padding:16px 0">Nenhum aniversariante nesta semana.</p>' : ''}
          <div class="flex flex-col gap-sm">
            ${bdays.map(s => {
              const parts = s.birthDate.split('-');
              return `
              <div class="flex items-center gap-md" style="padding:12px 0; border-bottom:1px solid var(--border-color)">
                <div class="avatar avatar-md" style="background:var(--accent-glow); color:var(--accent)">${parts[2]}/${parts[1]}</div>
                <div style="flex:1">
                  <div style="font-weight:600">${s.name}</div>
                  <div class="text-xs text-muted">${Calc.calcularIdade(s.birthDate)} anos</div>
                </div>
                ${s.phone ? `<button class="btn btn-ghost btn-sm" onclick="window.open('https://wa.me/55${s.phone.replace(/\\D/g,'')}?text=Parabéns%20${encodeURIComponent(s.name.split(' ')[0])}!%20Feliz%20aniversário!%20🎉🥳','_blank')" style="color:#25d366">Dar Parabéns</button>` : ''}
              </div>
            `}).join('')}
          </div>
        </div>
        
        <div class="card">
          <div class="card-header"><span class="card-title" style="color:var(--danger)">⚠️ Atenção: Faltas</span></div>
          ${missed.length === 0 ? '<p class="text-muted text-sm" style="padding:16px 0">Nenhuma falta registrada nesta semana. Excelente!</p>' : ''}
          <div class="flex flex-col gap-sm">
            ${missed.map(m => {
              const st = students.find(s => s.id === m.studentId);
              return `
              <div class="flex items-center gap-md" style="padding:12px 0; border-bottom:1px solid var(--border-color)">
                <div style="flex:1">
                  <div style="font-weight:600">${st ? st.name : 'Aluno Removido'}</div>
                  <div class="text-xs text-muted">${Calc.formatDate(m.date)} ${m.time ? 'às '+m.time : ''}</div>
                </div>
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
