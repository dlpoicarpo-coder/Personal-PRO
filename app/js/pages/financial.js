// ========================================
// PERSONAL PRO — Financial Management (v2)
// Monthly payment generation
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

export async function renderFinancial() {
  const students = await db.getAll('students');
  const records = await db.getAll('financial');
  const sessions = await db.getAll('sessions');
  const active = students.filter(s => s.status === 'Ativo');
  records.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
  const now = new Date();
  const thisMonth = now.getMonth(), thisYear = now.getFullYear();
  const monthRecords = records.filter(r => { const d = new Date(r.dueDate); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const totalExpected = monthRecords.reduce((t, r) => t + (r.amount || 0), 0);
  const totalPaid = monthRecords.filter(r => r.status === 'paid').reduce((t, r) => t + (r.amount || 0), 0);
  const overdue = records.filter(r => r.status === 'pending' && new Date(r.dueDate) < now).length;

  return `
    <div class="page-header"><div><h1>Gestão Financeira</h1><p class="subtitle">Controle de pagamentos e sessões</p></div>
      <div class="flex gap-sm">
        <button class="btn btn-secondary" id="genMonthlyBtn">Gerar Mensalidades</button>
        <button class="btn btn-primary" id="addFinancialBtn">+ Novo Registro</button>
      </div>
    </div>
    <div class="stats-grid stagger-children">
      <div class="stat-card"><div class="stat-label">Faturamento Esperado</div><div class="stat-value text-gradient">R$ ${totalExpected.toFixed(0)}</div><div class="stat-change">${now.toLocaleDateString('pt-BR', { month: 'long' })}</div></div>
      <div class="stat-card"><div class="stat-label">Recebido</div><div class="stat-value" style="color:var(--success)">R$ ${totalPaid.toFixed(0)}</div></div>
      <div class="stat-card"><div class="stat-label">Pendente</div><div class="stat-value" style="color:var(--warning)">R$ ${(totalExpected - totalPaid).toFixed(0)}</div></div>
      <div class="stat-card"><div class="stat-label">Vencidos</div><div class="stat-value" style="color:var(--danger)">${overdue}</div></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Registros Financeiros</span></div>
      ${records.length ? `<div class="table-container"><table class="data-table"><thead><tr><th>Aluno</th><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${records.map(r => {
    const st = students.find(s => s.id === r.studentId);
    const due = new Date(r.dueDate);
    const isOverdue = r.status === 'pending' && due < now;
    return `<tr><td>${st ? st.name : '?'}</td><td>${r.description || '-'}</td><td><strong>R$ ${(r.amount || 0).toFixed(2)}</strong></td>
            <td style="${isOverdue ? 'color:var(--danger);font-weight:600' : ''}">${Calc.formatDate(r.dueDate)}${isOverdue ? ' !' : ''}</td>
            <td>${r.paymentMethod || '-'}</td>
            <td><span class="badge badge-${r.status === 'paid' ? 'success' : isOverdue ? 'danger' : 'warning'}">${r.status === 'paid' ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente'}</span></td>
            <td class="flex gap-sm">
              ${r.status !== 'paid' ? `<button class="btn btn-ghost btn-sm mark-paid" data-id="${r.id}" title="Marcar pago">Pagar</button>` : ''}
              <button class="btn btn-ghost btn-sm delete-fin" data-id="${r.id}" style="color:var(--danger)">✕</button>
            </td></tr>`;
  }).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Nenhum registro financeiro</h3></div>`}
    </div>
    <div class="card mt-lg">
      <div class="card-header"><span class="card-title">Sessões por Aluno (Mês Atual)</span></div>
      <div class="table-container"><table class="data-table"><thead><tr><th>Aluno</th><th>Sessões Realizadas</th><th>Sessões Esperadas</th><th>Progresso</th></tr></thead>
        <tbody>${active.map(s => {
    const ms = sessions.filter(x => x.studentId === s.id && x.status === 'completed' && new Date(x.date).getMonth() === thisMonth && new Date(x.date).getFullYear() === thisYear).length;
    const exp = s.expectedSessions || 12;
    const pct = Math.min(100, Math.round((ms / exp) * 100));
    return `<tr><td>${s.name}</td><td><strong>${ms}</strong></td><td>${exp}</td><td><div class="progress-bar" style="width:120px;display:inline-block"><div class="progress-fill" style="width:${pct}%"></div></div> ${pct}%</td></tr>`;
  }).join('')}</tbody></table></div>
    </div>
  `;
}

export function initFinancial(navigateFn) {
  // Generate monthly payments
  document.getElementById('genMonthlyBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    openModal({
      title: 'Gerar Mensalidades', size: 'md',
      content: `<form id="genMonthForm">
        <p class="text-muted text-sm mb-md">Gerar registros de pagamento para os meses selecionados</p>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Mês Inicial</label><input class="form-input" name="startMonth" type="month" value="${new Date().toISOString().slice(0, 7)}" /></div>
          <div class="form-group"><label class="form-label">Quantidade de Meses</label><select class="form-select" name="months"><option value="1">1 mês</option><option value="3">3 meses</option><option value="6" selected>6 meses</option><option value="12">12 meses</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Valor Padrão (R$)</label><input class="form-input" name="defaultAmount" type="number" step="0.01" value="300.00" /></div>
        <div class="form-group"><label class="form-label">Dia de Vencimento</label><input class="form-input" name="dueDay" type="number" min="1" max="28" value="5" /></div>
        <div class="form-group"><label class="form-label">Forma de Pagamento</label><select class="form-select" name="paymentMethod"><option>Pix</option><option>Cartão de Crédito</option><option>Cartão de Débito</option><option>Dinheiro</option><option>Boleto</option><option>Transferência</option></select></div>
        <div class="form-group"><label class="form-label">Alunos</label>
          <div class="flex gap-sm" style="flex-wrap:wrap">${students.map(s => `<label class="flex items-center gap-xs" style="padding:4px 10px;border:1px solid var(--border-color);border-radius:6px;cursor:pointer"><input type="checkbox" name="students" value="${s.id}" checked /> ${s.name.split(' ')[0]}</label>`).join('')}</div>
        </div>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        {
          label: 'Gerar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('genMonthForm'));
            const startMonth = fd.get('startMonth');
            const numMonths = parseInt(fd.get('months')) || 1;
            const amount = parseFloat(fd.get('defaultAmount')) || 300;
            const dueDay = parseInt(fd.get('dueDay')) || 5;
            const method = fd.get('paymentMethod');
            const selectedStudents = fd.getAll('students');

            let count = 0;
            for (const sid of selectedStudents) {
              const st = students.find(s => s.id === sid);
              for (let m = 0; m < numMonths; m++) {
                const [y, mo] = startMonth.split('-').map(Number);
                const date = new Date(y, mo - 1 + m, dueDay);
                const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                await db.add('financial', {
                  studentId: sid,
                  amount,
                  dueDate: date.toISOString().slice(0, 10),
                  paymentMethod: method,
                  description: `Mensalidade ${monthName}`,
                  status: 'pending',
                });
                count++;
              }
            }
            notify.success(`${count} registros de mensalidade gerados!`);
            closeModal();
            navigateFn('/financeiro');
          }
        }
      ]
    });
  });

  // Add single record
  document.getElementById('addFinancialBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    openModal({
      title: '+ Novo Registro Financeiro', size: 'md',
      content: `<form id="finForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Aluno *</label><select class="form-select" name="studentId" required><option value="">Selecione</option>${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Valor (R$)</label><input class="form-input" name="amount" type="number" step="0.01" placeholder="500.00" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Vencimento</label><input class="form-input" name="dueDate" type="date" value="${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().slice(0, 10)}" /></div>
          <div class="form-group"><label class="form-label">Forma de Pagamento</label><select class="form-select" name="paymentMethod"><option>Pix</option><option>Cartão de Crédito</option><option>Cartão de Débito</option><option>Dinheiro</option><option>Boleto</option><option>Transferência</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Descrição</label><input class="form-input" name="description" placeholder="Ex: Mensalidade Maio/2026" /></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-select" name="status"><option value="pending">Pendente</option><option value="paid">Pago</option></select></div>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        {
          label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('finForm'));
            const d = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione um aluno'); return; }
            d.amount = parseFloat(d.amount) || 0;
            await db.add('financial', d);
            notify.success('Registro salvo!');
            closeModal(); navigateFn('/financeiro');
          }
        }
      ]
    });
  });

  document.querySelectorAll('.mark-paid').forEach(btn => {
    btn.addEventListener('click', async () => {
      const r = await db.get('financial', btn.dataset.id);
      if (r) { r.status = 'paid'; r.paidDate = new Date().toISOString(); await db.put('financial', r); notify.success('Marcado como pago!'); navigateFn('/financeiro'); }
    });
  });

  document.querySelectorAll('.delete-fin').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir registro?')) { await db.delete('financial', btn.dataset.id); navigateFn('/financeiro'); }
    });
  });
}
