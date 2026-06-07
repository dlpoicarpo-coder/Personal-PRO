// ========================================
// PERSONAL PRO — Financial Management (v2)
// Dashboard · Gráficos · Inadimplência · WhatsApp · Metas
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { sendWhatsApp } from '../utils/whatsapp.js';

const ICON_WA  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_DEL = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

const PAYMENT_METHODS = ['Pix','Cartão de Crédito','Cartão de Débito','Dinheiro','Transferência','Boleto'];

function fmtBRL(v) { return 'R$ ' + Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }

// ── Estado do filtro de data (módulo) ──────────────────────────
const finState = {
  month: new Date().getMonth(),
  year:  new Date().getFullYear(),
};

export async function renderFinancial() {
  const students = await db.getAll('students');
  const records  = await db.getAll('financial');
  const sessions = await db.getAll('sessions');
  const active   = students.filter(s => s.status === 'Ativo');

  const now        = new Date();
  const selMonth   = finState.month;
  const selYear    = finState.year;
  const isCurrentMonth = selMonth === now.getMonth() && selYear === now.getFullYear();

  // Label do mês selecionado
  const selDate = new Date(selYear, selMonth, 1);
  const monthLabel = selDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  records.sort((a, b) => {
    const order   = { overdue: 0, pending: 1, paid: 2 };
    const aStatus = (a.status === 'pending' && new Date(a.dueDate) < now) ? 'overdue' : a.status;
    const bStatus = (b.status === 'pending' && new Date(b.dueDate) < now) ? 'overdue' : b.status;
    if (order[aStatus] !== order[bStatus]) return order[aStatus] - order[bStatus];
    return new Date(b.dueDate) - new Date(a.dueDate);
  });

  const inSelMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === selMonth && d.getFullYear() === selYear;
  };

  // ESPERADO: todos com vencimento no mês selecionado
  const monthRecs   = records.filter(r => inSelMonth(r.dueDate));
  const totalExpect = monthRecs.reduce((t, r) => t + (r.amount||0), 0);

  // RECEBIDO: pagos cuja paidDate OU dueDate cai no mês selecionado
  const paidThisMonth = records.filter(r => {
    if (r.status !== 'paid') return false;
    const refDate = r.paidDate || r.dueDate;
    return inSelMonth(refDate);
  });
  const totalPaid = paidThisMonth.reduce((t, r) => t + (r.amount||0), 0);

  // PENDENTE: registros do mês selecionado ainda não pagos
  const totalPend  = monthRecs.filter(r => r.status !== 'paid').reduce((t, r) => t + (r.amount||0), 0);

  // VENCIDOS: pendentes com vencimento passado (qualquer mês)
  const overdue    = records.filter(r => r.status === 'pending' && new Date(r.dueDate) < now);
  const overdueAmt = overdue.reduce((t, r) => t + (r.amount||0), 0);

  // Taxa de coleta
  const collRate = monthRecs.length > 0
    ? Math.round((monthRecs.filter(r=>r.status==='paid').length / monthRecs.length) * 100)
    : (paidThisMonth.length > 0 ? 100 : 0);

  // Receita dos últimos 6 meses (sempre relativo ao mês atual — gráfico histórico)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mo = d.getMonth(); const yr = d.getFullYear();
    const paid = records.filter(r => r.status==='paid' && new Date(r.paidDate||r.dueDate).getMonth()===mo && new Date(r.paidDate||r.dueDate).getFullYear()===yr).reduce((t,r) => t+(r.amount||0), 0);
    const expected = records.filter(r => { const dd = new Date(r.dueDate); return dd.getMonth()===mo && dd.getFullYear()===yr; }).reduce((t,r) => t+(r.amount||0), 0);
    monthlyData.push({ label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), paid, expected });
  }

  // Inadimplentes
  const defaulters = active.filter(s => overdue.some(r => r.studentId === s.id));

  // Sessões do mês selecionado
  const monthSessions = sessions.filter(x => {
    const d = new Date(x.date);
    return x.status==='completed' && d.getMonth()===selMonth && d.getFullYear()===selYear;
  });

  // Registros para a tabela — filtra pelo mês selecionado se não for "Todos"
  // Por padrão, mostrar todos os registros mas com data-month para filtro client-side
  return `
    <div class="page-header">
      <div><h1>Gestão Financeira</h1></div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="genMonthlyBtn">Gerar Mensalidades</button>
        <button class="btn btn-primary btn-sm" id="addFinancialBtn">+ Novo Registro</button>
      </div>
    </div>

    <!-- Seletor de Mês -->
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px">
      <button id="finPrevMonth" class="btn btn-ghost btn-sm" style="font-size:1.1rem;padding:6px 14px" title="Mês anterior">◀</button>
      <div style="text-align:center;min-width:180px">
        <div style="font-size:1.05rem;font-weight:700;color:var(--text-primary);text-transform:capitalize">${monthLabel}</div>
        ${isCurrentMonth ? '<div style="font-size:0.7rem;color:var(--primary);font-weight:600">Mês Atual</div>' : ''}
      </div>
      <button id="finNextMonth" class="btn btn-ghost btn-sm" style="font-size:1.1rem;padding:6px 14px" title="Próximo mês" ${isCurrentMonth ? 'disabled style="opacity:0.3;cursor:default"' : ''}>▶</button>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:16px">
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">ESPERADO</div>
        <div class="stat-value text-gradient" style="font-size:1.2rem">${fmtBRL(totalExpect)}</div>
        <div class="stat-change">${monthLabel}</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">RECEBIDO</div>
        <div class="stat-value" style="color:var(--success);font-size:1.2rem">${fmtBRL(totalPaid)}</div>
        <div class="stat-change positive">${collRate}% de taxa de coleta</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">PENDENTE</div>
        <div class="stat-value" style="color:var(--warning);font-size:1.2rem">${fmtBRL(totalPend)}</div>
        <div class="stat-change">${monthRecs.filter(r=>r.status==='pending').length} cobrança(s)</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">VENCIDO</div>
        <div class="stat-value" style="color:var(--danger);font-size:1.2rem">${fmtBRL(overdueAmt)}</div>
        <div class="stat-change">${overdue.length} registro(s)</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">INADIMPLENTES</div>
        <div class="stat-value" style="color:${defaulters.length>0?'var(--danger)':'var(--success)'}">${defaulters.length}</div>
        <div class="stat-change">de ${active.length} ativos</div>
      </div>
    </div>

    <div class="grid-2 mb-lg">
      <!-- Gráfico de receita -->
      <div class="card">
        <div class="card-header"><span class="card-title">Receita — Últimos 6 Meses</span></div>
        <div style="height:180px"><canvas id="revenueChart"></canvas></div>
        <div class="flex gap-md mt-sm" style="justify-content:center">
          <span class="text-xs" style="color:#10b981">■ Recebido</span>
          <span class="text-xs" style="color:rgba(16,185,129,0.25)">■ Esperado</span>
        </div>
      </div>

      <!-- Inadimplentes -->
      <div class="card">
        <div class="card-header">
          <span class="card-title" style="${defaulters.length>0?'color:var(--danger)':''}">
            Inadimplência ${defaulters.length>0?`(${defaulters.length})`:'✓'}
          </span>
          ${defaulters.length>0?`<button class="btn btn-ghost btn-sm" id="chargeAllBtn" style="color:#25d366;font-size:0.78rem">${ICON_WA} Cobrar todos</button>`:''}
        </div>
        ${defaulters.length ? defaulters.map(s => {
          const sOverdue = overdue.filter(r=>r.studentId===s.id);
          const total = sOverdue.reduce((t,r)=>t+(r.amount||0),0);
          const oldest = sOverdue.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];
          const days   = Math.floor((now-new Date(oldest.dueDate))/86400000);
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color)">
            <div class="avatar avatar-sm">${s.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.88rem">${s.name}</div>
              <div class="text-xs" style="color:var(--danger)">${sOverdue.length} parcela(s) · ${days}d em atraso · ${fmtBRL(total)}</div>
            </div>
            ${s.phone ? `<button class="btn btn-ghost btn-sm wa-charge" data-student="${s.id}" data-amount="${total}" data-days="${days}" style="padding:4px 6px;color:#25d366">${ICON_WA}</button>` : ''}
          </div>`;
        }).join('') : `
        <div class="empty-state" style="padding:24px">
          <div style="font-size:2rem">✓</div>
          <p class="text-muted text-sm">Todos os alunos em dia!</p>
        </div>`}
      </div>
    </div>

    <!-- Tabs filtro -->
    <div class="tabs" id="finTabs">
      <button class="tab active" data-filter="all">Todos (${records.length})</button>
      <button class="tab" data-filter="month">Mês Selecionado (${monthRecs.length})</button>
      <button class="tab" data-filter="pending">Pendentes (${records.filter(r=>r.status==='pending').length})</button>
      <button class="tab" data-filter="overdue">Vencidos (${overdue.length})</button>
      <button class="tab" data-filter="paid">Pagos (${records.filter(r=>r.status==='paid').length})</button>
    </div>

    <!-- Tabela registros -->
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <span class="card-title">Registros Financeiros</span>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="finFilterStudent" class="form-select" style="max-width:180px;font-size:0.82rem;padding:4px 8px;height:32px">
            <option value="">Todos os alunos</option>
            ${active.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
          <div style="position:relative">
            <svg style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--text-muted)" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="finSearch" class="form-input" placeholder="Buscar aluno..." style="padding-left:28px;width:160px;font-size:0.82rem;height:32px" />
          </div>
        </div>
      </div>

      ${records.length ? `
      <div class="table-container">
        <table class="data-table" id="finTable">
          <thead><tr>
            <th>Aluno</th><th>Descrição</th><th>Valor</th><th>Vencimento</th>
            <th>Pagamento</th><th>Método</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${records.map(r => {
              const st = students.find(s => s.id === r.studentId);
              const due = new Date(r.dueDate);
              const isOverdue = r.status==='pending' && due < now;
              const statusLabel = r.status==='paid' ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente';
              const statusBadge = r.status==='paid' ? 'success' : isOverdue ? 'danger' : 'warning';
              const rMonth = due.getMonth(); const rYear = due.getFullYear();
              const isInSelMonth = rMonth === selMonth && rYear === selYear;
              return `<tr data-status="${isOverdue?'overdue':r.status}" data-student-id="${r.studentId}" data-name="${(st?.name||'').toLowerCase()}" data-in-month="${isInSelMonth?'1':'0'}">
                <td>
                  <div class="flex items-center gap-sm">
                    <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                    <span style="font-size:0.85rem">${st?.name||'?'}</span>
                  </div>
                </td>
                <td style="font-size:0.82rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description||'-'}</td>
                <td><strong style="color:${r.status==='paid'?'var(--success)':isOverdue?'var(--danger)':'var(--text-primary)'}">${fmtBRL(r.amount)}</strong></td>
                <td style="font-size:0.82rem;${isOverdue?'color:var(--danger);font-weight:600':''}">${Calc.formatDate(r.dueDate)}</td>
                <td style="font-size:0.78rem;color:var(--text-muted)">${r.paidDate?Calc.formatDate(r.paidDate):'-'}</td>
                <td style="font-size:0.78rem">${r.paymentMethod||'-'}</td>
                <td><span class="badge badge-${statusBadge}">${statusLabel}</span></td>
                <td>
                  <div style="display:flex;gap:3px;align-items:center">
                    ${r.status!=='paid' ? `
                      <button class="btn btn-ghost btn-sm mark-paid" data-id="${r.id}" title="Marcar como pago"
                        style="padding:4px 6px;color:var(--success)">${ICON_CHECK}</button>
                      ${st?.phone ? `<button class="btn btn-ghost btn-sm wa-remind" data-id="${r.id}" data-student="${r.studentId}" data-amount="${r.amount}" data-due="${r.dueDate}"
                        title="Cobrar via WhatsApp" style="padding:4px 6px;color:#25d366">${ICON_WA}</button>` : ''}
                    ` : ''}
                    <button class="btn btn-ghost btn-sm edit-fin" data-id="${r.id}" title="Editar"
                      style="padding:4px 6px;color:var(--text-muted)">${ICON_EDIT}</button>
                    <button class="btn btn-ghost btn-sm delete-fin" data-id="${r.id}" title="Excluir"
                      style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="empty-state" style="padding:40px">
        <div class="empty-icon">—</div>
        <h3>Nenhum registro financeiro</h3>
        <p>Clique em "Gerar Mensalidades" para criar automaticamente ou "+ Novo Registro" para adicionar manualmente</p>
      </div>`}
    </div>

    <!-- Sessões do mês -->
    <div class="card mt-lg">
      <div class="card-header"><span class="card-title">Sessões Realizadas — ${monthLabel}</span></div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Aluno</th><th>Realizadas</th><th>Esperadas</th><th>Progresso</th><th title="Mensalidade ÷ sessões esperadas">Custo/sessão</th><th title="Custo por sessão × sessões realizadas">Valor proporcional</th></tr></thead>
          <tbody>${active.map(s => {
            const ms = monthSessions.filter(x=>x.studentId===s.id).length;
            const exp = parseInt(s.expectedSessions) || 12;
            const pct = Math.min(100, Math.round((ms/exp)*100));
            const fee = s.monthlyFee ? parseFloat(s.monthlyFee) : null;
            const perSess = fee && exp ? (fee/exp).toFixed(2) : '-';
            const generated = fee && ms ? ((fee/exp)*ms).toFixed(2) : '-';
            return `<tr>
              <td>
                <div class="flex items-center gap-sm">
                  <div class="avatar avatar-sm" style="width:22px;height:22px;font-size:0.6rem">${s.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                  ${s.name}
                </div>
              </td>
              <td><strong style="color:var(--primary)">${ms}</strong></td>
              <td>${exp}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="progress-bar" style="width:90px;height:6px">
                    <div class="progress-fill" style="width:${pct}%;background:${pct>=100?'var(--success)':pct>=70?'var(--primary)':'var(--warning)'}"></div>
                  </div>
                  <span style="font-size:0.78rem;color:${pct>=100?'var(--success)':pct<50?'var(--warning)':'inherit'}">${pct}%</span>
                </div>
              </td>
              <td style="font-size:0.82rem;color:var(--text-muted)">${perSess!=='-'?'R$ '+perSess:'-'}</td>
              <td style="color:var(--primary);font-weight:600">${generated!=='-'?'R$ '+generated:'-'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <p class="text-xs text-muted mt-sm" style="padding:0 4px">
        * <strong>Custo/sessão</strong> = mensalidade ÷ sessões esperadas no mês · <strong>Valor proporcional</strong> = custo/sessão × sessões realizadas
      </p>
    </div>
  `;
}

export function initFinancial(navigateFn) {
  // ── Navegação de mês ──────────────────────────────────────────
  document.getElementById('finPrevMonth')?.addEventListener('click', () => {
    finState.month--;
    if (finState.month < 0) { finState.month = 11; finState.year--; }
    navigateFn('/financeiro');
  });
  document.getElementById('finNextMonth')?.addEventListener('click', () => {
    const now = new Date();
    if (finState.month === now.getMonth() && finState.year === now.getFullYear()) return;
    finState.month++;
    if (finState.month > 11) { finState.month = 0; finState.year++; }
    navigateFn('/financeiro');
  });

  // Função helper para pegar a chave Pix das configurações
  async function getPixKey() {
    try {
      const s = await db.get('settings','trainer');
      return s?.pixKey || '[configure sua chave Pix em Configurações]';
    } catch { return '[configure sua chave Pix em Configurações]'; }
  }
  // Gráfico de receita
  setTimeout(() => {
    const canvas = document.getElementById('revenueChart');
    if (canvas && typeof Chart !== 'undefined') {
      db.getAll('financial').then(records => {
        const now = new Date();
        const labels = [], paid = [], expected = [];
        for (let i = 5; i >= 0; i--) {
          const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mo = d.getMonth(), yr = d.getFullYear();
          const inMonth = (ds) => {
            if (!ds) return false;
            const dd = new Date(ds);
            return dd.getMonth() === mo && dd.getFullYear() === yr;
          };
          labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
          // Recebido: usa paidDate se existir, senão dueDate
          paid.push(records
            .filter(r => r.status === 'paid' && inMonth(r.paidDate || r.dueDate))
            .reduce((t, r) => t + (r.amount||0), 0));
          // Esperado: todos com vencimento neste mês
          expected.push(records
            .filter(r => inMonth(r.dueDate))
            .reduce((t, r) => t + (r.amount||0), 0));
        }
        new Chart(canvas, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Recebido', data: paid,     backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 5 },
              { label: 'Esperado', data: expected, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 5 },
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { ticks: { color:'#64748b', font:{size:9}, callback: v => 'R$' + (v>=1000?(v/1000).toFixed(0)+'k':v.toFixed(0)) }, grid:{ color:'rgba(148,163,184,0.07)' } },
              x: { ticks: { color:'#94a3b8', font:{size:9} }, grid:{ display:false } }
            }
          }
        });
      });
    }
  }, 200);

  // ── Estado ativo dos filtros ──
  let activeTabFilter = 'all';
  let activeSearch    = '';
  let activeStudent   = '';

  function applyFinFilters() {
    document.querySelectorAll('#finTable tbody tr').forEach(row => {
      const st      = row.dataset.status    || '';
      const nm      = row.dataset.name      || '';
      const sid     = row.dataset.studentId || '';
      const inMonth = row.dataset.inMonth   === '1';
      const matchTab     = activeTabFilter === 'all' || st === activeTabFilter || (activeTabFilter === 'month' && inMonth);
      const matchSearch  = !activeSearch || nm.includes(activeSearch);
      const matchStudent = !activeStudent || sid === activeStudent;
      row.style.display = matchTab && matchSearch && matchStudent ? '' : 'none';
    });
  }

  // Filtro por tab
  document.querySelectorAll('#finTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#finTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTabFilter = tab.dataset.filter;
      applyFinFilters();
    });
  });

  // Busca — preserva filtro de tab
  document.getElementById('finSearch')?.addEventListener('input', e => {
    activeSearch = e.target.value.toLowerCase().trim();
    applyFinFilters();
  });

  // Filtro por aluno dropdown
  document.getElementById('finFilterStudent')?.addEventListener('change', e => {
    activeStudent = e.target.value;
    applyFinFilters();
  });

  // WhatsApp cobrança individual
  document.querySelectorAll('.wa-remind').forEach(btn => {
    btn.addEventListener('click', async () => {
      const st = await db.get('students', btn.dataset.student);
      if (!st?.phone) return;
      const amount = parseFloat(btn.dataset.amount)||0;
      const due    = Calc.formatDate(btn.dataset.due);
      const msg = `Olá ${st.name.split(' ')[0]}! 👋\n\nPassando para lembrar que sua mensalidade de *${fmtBRL(amount)}* com vencimento em *${due}* está pendente.\n\nChave Pix: ${await getPixKey()}\n\nQualquer dúvida estou à disposição! 💪`;
      sendWhatsApp(st.phone, msg);
    });
  });

  // WhatsApp cobrar todos inadimplentes
  document.getElementById('chargeAllBtn')?.addEventListener('click', async () => {
    const students = await db.getAll('students');
    const records  = await db.getAll('financial');
    const now      = new Date();
    const overdue  = records.filter(r => r.status==='pending' && new Date(r.dueDate)<now);
    const byStudent= {};
    overdue.forEach(r => { byStudent[r.studentId]=(byStudent[r.studentId]||[]).concat(r); });
    let count=0;
    for (const [sid, recs] of Object.entries(byStudent)) {
      const st = students.find(s=>s.id===sid);
      if (!st?.phone) continue;
      const total = recs.reduce((t,r)=>t+(r.amount||0),0);
      const days  = Math.floor((now-new Date(recs[0].dueDate))/86400000);
      const msg   = `Olá ${st.name.split(' ')[0]}! 👋\n\nIdentificamos *${recs.length} parcela(s)* em aberto no valor de *${fmtBRL(total)}* (${days} dias em atraso).\n\nChave Pix: ${await getPixKey()}\n\nQualquer dúvida estou à disposição! 💪`;
      sendWhatsApp(st.phone, msg);
      count++;
      await new Promise(r=>setTimeout(r,500));
    }
    notify.success(`Cobrança enviada para ${count} aluno(s)!`);
  });

  // WhatsApp cobrança por aluno
  document.querySelectorAll('.wa-charge').forEach(btn => {
    btn.addEventListener('click', async () => {
      const st = await db.get('students', btn.dataset.student);
      if (!st?.phone) return;
      const total = parseFloat(btn.dataset.amount)||0;
      const days  = parseInt(btn.dataset.days)||0;
      const msg   = `Olá ${st.name.split(' ')[0]}! 👋\n\nIdentificamos parcelas em aberto no valor de *${fmtBRL(total)}* (${days} dias em atraso).\n\nChave Pix: ${await getPixKey()}\n\nQualquer dúvida estou à disposição! 💪`;
      sendWhatsApp(st.phone, msg);
    });
  });

  // Marcar pago
  document.querySelectorAll('.mark-paid').forEach(btn => {
    btn.addEventListener('click', async () => {
      const r = await db.get('financial', btn.dataset.id);
      if (!r) return;
      openModal({
        title: 'Confirmar Pagamento', size: 'sm',
        preventBackdropClose: true,
        content: `<div class="form-group">
          <label class="form-label">Data do pagamento</label>
          <input class="form-input" id="paidDateInput" type="date" value="${new Date().toISOString().slice(0,10)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Método utilizado</label>
          <select class="form-select" id="paidMethodInput">
            ${PAYMENT_METHODS.map(m=>`<option ${r.paymentMethod===m?'selected':''}>${m}</option>`).join('')}
          </select>
        </div>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: '✓ Confirmar Pagamento', class: 'btn-primary', onClick: async () => {
            r.status      = 'paid';
            r.paidDate    = document.getElementById('paidDateInput')?.value || new Date().toISOString().slice(0,10);
            r.paymentMethod = document.getElementById('paidMethodInput')?.value || r.paymentMethod;
            await db.put('financial', r);
            notify.success('Pagamento confirmado!');
            closeModal();
            navigateFn('/financeiro');
          }}
        ]
      });
    });
  });

  // Editar registro
  document.querySelectorAll('.edit-fin').forEach(btn => {
    btn.addEventListener('click', async () => {
      const r = await db.get('financial', btn.dataset.id);
      if (!r) return;
      const students = (await db.getAll('students')).filter(s=>s.status==='Ativo');
      openModal({
        title: 'Editar Registro', size: 'md',
        preventBackdropClose: true,
        content: finFormHTML(students, r),
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('finForm'));
            const d  = Object.fromEntries(fd);
            d.amount = parseFloat(d.amount)||0;
            await db.put('financial', { ...r, ...d });
            notify.success('Registro atualizado!');
            closeModal();
            navigateFn('/financeiro');
          }}
        ]
      });
    });
  });

  // Excluir
  document.querySelectorAll('.delete-fin').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir este registro financeiro?')) {
        await db.delete('financial', btn.dataset.id);
        notify.success('Registro excluído.');
        navigateFn('/financeiro');
      }
    });
  });

  // Gerar mensalidades
  document.getElementById('genMonthlyBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s=>s.status==='Ativo');
    openModal({
      title: 'Gerar Mensalidades', size: 'lg',
      preventBackdropClose: true,
      content: `<form id="genMonthForm">
        <p class="text-muted text-sm mb-md">Gera registros de cobrança automaticamente para todos os alunos selecionados.</p>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Mês Inicial</label>
            <input class="form-input" name="startMonth" type="month" value="${new Date().toISOString().slice(0,7)}" />
          </div>
          <div class="form-group"><label class="form-label">Quantos meses</label>
            <select class="form-select" name="months">
              <option value="1">1 mês</option>
              <option value="3">3 meses</option>
              <option value="6" selected>6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Dia de Vencimento</label>
            <input class="form-input" name="dueDay" type="number" min="1" max="28" value="5" />
          </div>
          <div class="form-group"><label class="form-label">Valor Padrão (R$) *</label>
            <input class="form-input" name="defaultAmount" type="number" step="0.01" placeholder="Usa o cadastro do aluno" />
            <div class="form-hint">Deixe vazio para usar o valor cadastrado de cada aluno</div>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Forma de Pagamento Padrão</label>
          <select class="form-select" name="paymentMethod">
            ${PAYMENT_METHODS.map(m=>`<option>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Alunos</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <button type="button" id="selAllStudents" class="btn btn-ghost btn-sm" style="font-size:0.75rem">Selecionar todos</button>
            <button type="button" id="deselAllStudents" class="btn btn-ghost btn-sm" style="font-size:0.75rem">Desmarcar todos</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
            ${students.map(s => `
              <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;font-size:0.82rem">
                <input type="checkbox" name="students" value="${s.id}" checked class="stud-check" /> 
                ${s.name.split(' ')[0]}
                ${s.monthlyFee ? `<span style="font-size:0.7rem;color:var(--primary)">R$${s.monthlyFee}</span>` : ''}
              </label>`).join('')}
          </div>
        </div>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        { label: 'Gerar', class: 'btn-primary', onClick: async () => {
          const fd = new FormData(document.getElementById('genMonthForm'));
          const startMonth = fd.get('startMonth');
          const numMonths  = parseInt(fd.get('months'))||1;
          const defAmount  = fd.get('defaultAmount');
          const dueDay     = parseInt(fd.get('dueDay'))||5;
          const method     = fd.get('paymentMethod');
          const selStudents= fd.getAll('students');
          if (!selStudents.length) { notify.error('Selecione ao menos um aluno'); return; }
          let count=0;
          for (const sid of selStudents) {
            const st = students.find(s=>s.id===sid);
            const amount = defAmount ? parseFloat(defAmount) : (parseFloat(st?.monthlyFee)||0);
            if (!amount) { notify.warning(`${st?.name}: sem valor de mensalidade. Pule ou cadastre no aluno.`); continue; }
            for (let m=0; m<numMonths; m++) {
              const [y, mo] = startMonth.split('-').map(Number);
              const date = new Date(y, mo-1+m, dueDay);
              const monthName = date.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
              await db.add('financial', {
                studentId: sid, amount, dueDate: date.toISOString().slice(0,10),
                paymentMethod: method, description: `Mensalidade ${monthName}`, status: 'pending',
              });
              count++;
            }
          }
          notify.success(`${count} mensalidade(s) gerada(s)!`);
          closeModal();
          navigateFn('/financeiro');
        }}
      ]
    });
    setTimeout(() => {
      document.getElementById('selAllStudents')?.addEventListener('click', () => document.querySelectorAll('.stud-check').forEach(c=>c.checked=true));
      document.getElementById('deselAllStudents')?.addEventListener('click', () => document.querySelectorAll('.stud-check').forEach(c=>c.checked=false));
    }, 100);
  });

  // Novo registro
  document.getElementById('addFinancialBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s=>s.status==='Ativo');
    openModal({
      title: '+ Novo Registro Financeiro', size: 'md',
      preventBackdropClose: true,
      content: finFormHTML(students),
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        { label: 'Salvar', class: 'btn-primary', onClick: async () => {
          const fd = new FormData(document.getElementById('finForm'));
          const d  = Object.fromEntries(fd);
          if (!d.studentId) { notify.error('Selecione um aluno'); return; }
          d.amount = parseFloat(d.amount)||0;
          await db.add('financial', d);
          notify.success('Registro salvo!');
          closeModal();
          navigateFn('/financeiro');
        }}
      ]
    });
  });
}

function finFormHTML(students, r = {}) {
  const nextMonth5 = new Date(new Date().getFullYear(), new Date().getMonth()+1, 5).toISOString().slice(0,10);
  return `<form id="finForm">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Aluno *</label>
        <select class="form-select" name="studentId" required>
          <option value="">Selecione</option>
          ${students.map(s=>`<option value="${s.id}" ${r.studentId===s.id?'selected':''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Valor (R$)</label>
        <input class="form-input" name="amount" type="number" step="0.01" value="${r.amount||''}" placeholder="500.00" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Vencimento</label>
        <input class="form-input" name="dueDate" type="date" value="${r.dueDate||nextMonth5}" />
      </div>
      <div class="form-group"><label class="form-label">Forma de Pagamento</label>
        <select class="form-select" name="paymentMethod">
          ${PAYMENT_METHODS.map(m=>`<option ${r.paymentMethod===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Descrição</label>
      <input class="form-input" name="description" value="${r.description||''}" placeholder="Ex: Mensalidade Maio/2026" />
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-select" name="status">
          <option value="pending" ${r.status!=='paid'?'selected':''}>Pendente</option>
          <option value="paid" ${r.status==='paid'?'selected':''}>Pago</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Data do Pagamento</label>
        <input class="form-input" name="paidDate" type="date" value="${r.paidDate||''}" />
      </div>
    </div>
    <div class="form-group"><label class="form-label">Observações</label>
      <input class="form-input" name="notes" value="${r.notes||''}" placeholder="Notas adicionais..." />
    </div>
  </form>`;
}
