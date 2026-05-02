// ========================================
// PERSONAL PRO — Students Page
// ========================================

import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

export async function renderStudents() {  // <-- CORRIGIDO AQUI (S maiúsculo)
  const students = await db.getAll('students');
  students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return `
    <div class="page-header">
      <div>
        <h1>Gestão de Alunos</h1>
        <p class="subtitle">${students.length} aluno(s) cadastrado(s)</p>
      </div>
      <div class="flex gap-sm">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" id="studentSearch" placeholder="Buscar aluno..." />
        </div>
        <button class="btn btn-primary" id="addStudentBtn">+ Novo Aluno</button>
      </div>
    </div>

    <div class="tabs" id="studentTabs">
      <button class="tab active" data-filter="all">Todos (${students.length})</button>
      <button class="tab" data-filter="Ativo">Ativos (${students.filter(s => s.status === 'Ativo').length})</button>
      <button class="tab" data-filter="Inativo">Inativos (${students.filter(s => s.status === 'Inativo').length})</button>
    </div>

    <div id="studentsList">
      ${students.length ? renderStudentCards(students) : `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>Nenhum aluno cadastrado</h3>
          <p>Clique em "Novo Aluno" para adicionar o primeiro</p>
        </div>
      `}
    </div>
  `;
}

export function initStudents(navigateFn) {
  return `<div class="students-grid stagger-children">${students.map(s => `
    <div class="card student-card" data-id="${s.id}" data-status="${s.status}" data-name="${s.name.toLowerCase()}">
      <div class="flex items-center gap-md mb-md">
        <div class="avatar avatar-lg">${s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div style="flex:1">
          <h3 style="margin:0;font-size:1.05rem">${s.name}</h3>
          <div class="text-muted text-sm">${s.code}</div>
        </div>
        <span class="badge ${s.status === 'Ativo' ? 'badge-success' : 'badge-warning'}">${s.status}</span>
      </div>
      <div class="student-meta">
        ${s.age ? `<div class="meta-item"><span class="text-muted text-xs">Idade</span><span class="text-sm">${s.age} anos</span></div>` : ''}
        ${s.goal ? `<div class="meta-item"><span class="text-muted text-xs">Objetivo</span><span class="text-sm">${s.goal}</span></div>` : ''}
        ${s.phone ? `<div class="meta-item"><span class="text-muted text-xs">Telefone</span><span class="text-sm">${s.phone}</span></div>` : ''}
      </div>
      <div class="flex gap-sm mt-md" style="border-top:1px solid var(--border-color);padding-top:12px">
        <button class="btn btn-ghost btn-sm view-student" data-id="${s.id}">👁 Ver</button>
        <button class="btn btn-ghost btn-sm edit-student" data-id="${s.id}">✏️ Editar</button>
        <button class="btn btn-ghost btn-sm delete-student" data-id="${s.id}" style="margin-left:auto;color:var(--danger)">🗑</button>
      </div>
    </div>
  `).join('')}</div>`;
}

function studentFormHTML(student = {}) {
  return `
    <form id="studentForm" class="student-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome Completo *</label>
          <input class="form-input" name="name" value="${student.name || ''}" required placeholder="Ex: João da Silva" />
        </div>
        <div class="form-group">
          <label class="form-label">Código</label>
          <input class="form-input" name="code" value="${student.code || ''}" placeholder="Ex: JOA-001" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data de Nascimento</label>
          <input class="form-input" name="birthDate" type="date" value="${student.birthDate || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Gênero</label>
          <select class="form-select" name="gender">
            <option value="">Selecione</option>
            <option value="M" ${student.gender === 'M' ? 'selected' : ''}>Masculino</option>
            <option value="F" ${student.gender === 'F' ? 'selected' : ''}>Feminino</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Telefone</label>
          <input class="form-input" name="phone" value="${student.phone || ''}" placeholder="(00) 00000-0000" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" name="email" type="email" value="${student.email || ''}" placeholder="email@exemplo.com" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Objetivo Principal</label>
          <select class="form-select" name="goal">
            <option value="">Selecione</option>
            <option ${student.goal === 'Hipertrofia' ? 'selected' : ''}>Hipertrofia</option>
            <option ${student.goal === 'Emagrecimento' ? 'selected' : ''}>Emagrecimento</option>
            <option ${student.goal === 'Condicionamento' ? 'selected' : ''}>Condicionamento</option>
            <option ${student.goal === 'Saúde' ? 'selected' : ''}>Saúde</option>
            <option ${student.goal === 'Reabilitação' ? 'selected' : ''}>Reabilitação</option>
            <option ${student.goal === 'Performance' ? 'selected' : ''}>Performance</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" name="status">
            <option value="Ativo" ${student.status === 'Ativo' || !student.status ? 'selected' : ''}>Ativo</option>
            <option value="Inativo" ${student.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
            <option value="Em avaliação" ${student.status === 'Em avaliação' ? 'selected' : ''}>Em avaliação</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea class="form-textarea" name="notes" rows="3" placeholder="Observações adicionais...">${student.notes || ''}</textarea>
      </div>
    </form>
  `;
}

async function viewStudentHTML(student) {
  const age = student.birthDate ? Calc.calcularIdade(student.birthDate) : student.age || '-';
  const workouts = (await db.getAll('workouts')).filter(w => w.studentId === student.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const assessments = (await db.getAll('assessments')).filter(a => a.studentId === student.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  const bfData = (await db.getAll('biofeedback')).filter(b => b.studentId === student.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return `
    <div class="flex items-center gap-lg mb-lg">
      <div class="avatar avatar-xl">${student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
      <div>
        <h2 style="margin:0">${student.name}</h2>
        <div class="text-muted">${student.code} · <span class="badge ${student.status === 'Ativo' ? 'badge-success' : 'badge-warning'}">${student.status}</span></div>
      </div>
    </div>
    <div class="grid-3 mb-lg">
      <div class="card" style="text-align:center"><div class="text-muted text-xs" style="margin-bottom:4px">IDADE</div><div style="font-size:1.5rem;font-weight:700" class="text-gradient">${age}</div></div>
      <div class="card" style="text-align:center"><div class="text-muted text-xs" style="margin-bottom:4px">OBJETIVO</div><div style="font-size:1rem;font-weight:600">${student.goal || '-'}</div></div>
      <div class="card" style="text-align:center"><div class="text-muted text-xs" style="margin-bottom:4px">GÊNERO</div><div style="font-size:1rem;font-weight:600">${student.gender === 'M' ? 'Masculino' : student.gender === 'F' ? 'Feminino' : '-'}</div></div>
    </div>
    <div class="grid-2 mb-md">
      <div><span class="text-muted text-sm">Telefone:</span> <span class="text-sm">${student.phone || '-'}</span></div>
      <div><span class="text-muted text-sm">Email:</span> <span class="text-sm">${student.email || '-'}</span></div>
    </div>
    ${student.notes ? `<div class="mb-md"><span class="text-muted text-sm">Observações:</span><p class="text-sm" style="margin-top:4px">${student.notes}</p></div>` : ''}

    <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
      <h4 class="mb-sm">Treinos Recentes</h4>
      ${workouts.length ? `<div class="table-container"><table class="data-table"><thead><tr><th>Treino</th><th>Data</th><th>Exercícios</th></tr></thead>
        <tbody>${workouts.map(w => `<tr><td><strong>${w.name}</strong>${w.cycle ? ` <span class="text-muted text-xs">(${w.cycle})</span>` : ''}</td><td>${Calc.formatDate(w.date)}</td><td>${(w.exercises || []).length}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted text-sm">Nenhum treino cadastrado</p>'}
    </div>

    <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
      <h4 class="mb-sm">Avaliações</h4>
      ${assessments.length ? `<div class="table-container"><table class="data-table"><thead><tr><th>Tipo</th><th>Data</th><th>Detalhes</th></tr></thead>
        <tbody>${assessments.map(a => `<tr><td><span class="badge badge-info">${a.type || 'Geral'}</span></td><td>${Calc.formatDate(a.date)}</td><td class="text-sm">${a.peso ? 'Peso: ' + a.peso + 'kg' : ''}${a.percentualGordura ? ' · BF: ' + a.percentualGordura + '%' : ''}${a.rm1 ? ' · 1RM: ' + a.rm1 + 'kg' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted text-sm">Nenhuma avaliação registrada</p>'}
    </div>

    <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
      <h4 class="mb-sm">Biofeedback Recente</h4>
      ${bfData.length ? `<div class="table-container"><table class="data-table"><thead><tr><th>Data</th><th>Sono</th><th>Humor</th><th>Energia</th><th>Estresse</th><th>PSE</th><th>Carga</th></tr></thead>
        <tbody>${bfData.map(b => `<tr><td>${Calc.formatDate(b.date)}</td><td>${b.sleep || '-'}</td><td>${b.mood || '-'}</td><td>${b.energy || '-'}</td><td>${b.stress || '-'}</td><td style="color:${(b.pse || 0) > 8 ? 'var(--danger)' : (b.pse || 0) > 6 ? 'var(--warning)' : 'var(--success)'}"><strong>${b.pse || '-'}</strong></td><td>${b.trainingLoad || '-'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted text-sm">Nenhum registro de biofeedback</p>'}
    </div>

    <div class="flex gap-sm mt-lg" style="border-top:1px solid var(--border-color);padding-top:16px">
      <a href="#/treinos" class="btn btn-secondary btn-sm">Ver Treinos</a>
      <a href="#/avaliacoes" class="btn btn-secondary btn-sm">Ver Avaliações</a>
      <a href="#/biofeedback" class="btn btn-secondary btn-sm">Ver Biofeedback</a>
      <a href="#/relatorios" class="btn btn-secondary btn-sm">Ver Relatório</a>
    </div>
  `;
}

export function initStudents(navigateFn) {
  // Add student
  document.getElementById('addStudentBtn')?.addEventListener('click', () => {
    openModal({
      title: '+ Novo Aluno',
      content: studentFormHTML(),
      size: 'lg',
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', id: 'cancelAdd', onClick: () => closeModal() },
        {
          label: 'Salvar', class: 'btn-primary', id: 'saveStudent', onClick: async () => {
            const form = document.getElementById('studentForm');
            const fd = new FormData(form);
            const data = Object.fromEntries(fd);
            if (!data.name) { notify.error('Nome é obrigatório'); return; }
            if (!data.code) {
              data.code = data.name.substring(0, 3).toUpperCase() + '-' + String(Math.floor(Math.random() * 900) + 100);
            }
            if (data.birthDate) data.age = Calc.calcularIdade(data.birthDate);
            await db.add('students', data);
            notify.success('Aluno cadastrado!');
            closeModal();
            navigateFn('/alunos');
          }
        }
      ]
    });
  });

  // Search
  document.getElementById('studentSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.student-card').forEach(card => {
      card.style.display = card.dataset.name.includes(q) ? '' : 'none';
    });
  });

  // Tabs
  document.querySelectorAll('#studentTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#studentTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      document.querySelectorAll('.student-card').forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.status === filter) ? '' : 'none';
      });
    });
  });

  // View, Edit, Delete
  document.querySelectorAll('.view-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('students', btn.dataset.id);
      if (s) openModal({ title: s.name, content: await viewStudentHTML(s), size: 'lg' });
    });
  });

  document.querySelectorAll('.edit-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('students', btn.dataset.id);
      if (!s) return;
      openModal({
        title: 'Editar Aluno',
        content: studentFormHTML(s),
        size: 'lg',
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelEdit', onClick: () => closeModal() },
          {
            label: 'Salvar', class: 'btn-primary', id: 'saveEdit', onClick: async () => {
              const form = document.getElementById('studentForm');
              const fd = new FormData(form);
              const data = { ...s, ...Object.fromEntries(fd) };
              if (data.birthDate) data.age = Calc.calcularIdade(data.birthDate);
              await db.put('students', data);
              notify.success('Aluno atualizado!');
              closeModal();
              navigateFn('/alunos');
            }
          }
        ]
      });
    });
  });

  document.querySelectorAll('.delete-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('students', btn.dataset.id);
      if (!s) return;
      if (window.confirm(`Excluir ${s.name}?`)) {
        await db.delete('students', s.id);
        notify.success('Aluno removido');
        navigateFn('/alunos');
      }
    });
  });
}
