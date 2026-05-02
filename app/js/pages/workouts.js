// ========================================
// PERSONAL PRO — Workouts Page
// ========================================

import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { generateWorkoutPDF, downloadPDF } from '../utils/pdf-generator.js';

export async function renderWorkouts() {
  const students = await db.getAll('students');
  const workouts = await db.getAll('workouts');
  const exercises = await db.getAll('exercises');
  const activeStudents = students.filter(s => s.status === 'Ativo');
  workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

  return `
    <div class="page-header">
      <div>
        <h1>Prescrição de Treinos</h1>
        <p class="subtitle">${workouts.length} treino(s) registrado(s)</p>
      </div>
      <button class="btn btn-primary" id="addWorkoutBtn">+ Novo Treino</button>
    </div>

    <div class="tabs" id="workoutTabs">
      <button class="tab active" data-filter="all">Todos</button>
      ${activeStudents.map(s => `<button class="tab" data-filter="${s.id}">${s.name.split(' ')[0]}</button>`).join('')}
    </div>

    <div id="workoutsList">
      ${workouts.length ? `
        <div class="table-container">
          <table class="data-table">
            <thead><tr>
              <th>Aluno</th><th>Treino</th><th>Data</th><th>Exercícios</th><th>Ações</th>
            </tr></thead>
            <tbody>
              ${workouts.map(w => {
                const st = students.find(s => s.id === w.studentId);
                return `<tr data-student="${w.studentId}">
                  <td><div class="flex items-center gap-sm"><div class="avatar avatar-sm">${st?st.name[0]:'?'}</div>${st?st.name:'?'}</div></td>
                  <td><strong>${w.name||'Treino'}</strong>${w.cycle?` <span class="text-muted text-xs">(${w.cycle})</span>`:''}</td>
                  <td>${Calc.formatDate(w.date)}</td>
                  <td><span class="badge badge-info">${(w.exercises||[]).length} exercícios</span></td>
                  <td class="flex gap-sm">
                    <button class="btn btn-ghost btn-sm view-workout" data-id="${w.id}" title="Ver">Ver</button>
                    <button class="btn btn-ghost btn-sm pdf-workout" data-id="${w.id}" title="PDF">PDF</button>
                    <button class="btn btn-ghost btn-sm edit-workout" data-id="${w.id}" title="Editar">Editar</button>
                    <button class="btn btn-ghost btn-sm delete-workout" data-id="${w.id}" title="Excluir" style="color:var(--danger)">✕</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon" style="font-size:2rem">—</div>
          <h3>Nenhum treino criado</h3>
          <p>Comece criando o primeiro treino para um aluno</p>
        </div>
      `}
    </div>
  `;
}

function workoutFormHTML(students, workout = {}, allExercises = []) {
  const exList = workout.exercises || [{ name: '', sets: 3, reps: '12', load: '', rest: '60', method: '' }];
  return `
    <form id="workoutForm">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Aluno *</label>
          <select class="form-select" name="studentId" required>
            <option value="">Selecione</option>
            ${students.map(s => `<option value="${s.id}" ${workout.studentId===s.id?'selected':''}>${s.name} (${s.code})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nome do Treino *</label>
          <input class="form-input" name="name" value="${workout.name||''}" placeholder="Ex: Treino A - Superior" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input class="form-input" name="date" type="date" value="${workout.date||new Date().toISOString().slice(0,10)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Ciclo</label>
          <input class="form-input" name="cycle" value="${workout.cycle||''}" placeholder="Ex: Ciclo 1 - Adaptação" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea class="form-textarea" name="notes" rows="2" placeholder="Orientações gerais...">${workout.notes||''}</textarea>
      </div>
      <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:16px">
        <div class="flex items-center justify-between mb-md">
          <h4>Exercícios</h4>
          <button type="button" class="btn btn-secondary btn-sm" id="addExerciseRow">+ Exercício</button>
        </div>
        <div id="exerciseRows">
          ${exList.map((ex, i) => exerciseRowHTML(i, ex, allExercises)).join('')}
        </div>
      </div>
    </form>
  `;
}

function exerciseRowHTML(index, ex = {}, allExercises = []) {
  return `
    <div class="exercise-row card" style="padding:12px;margin-bottom:8px" data-index="${index}">
      <div class="form-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr auto; gap:6px">
        <div class="form-group">
          <label class="form-label text-xs" style="margin-bottom:2px;opacity:0.6">Exercício</label>
          <input class="form-input" name="ex_name_${index}" list="exerciseList" value="${ex.name||''}" placeholder="Nome do exercício" />
        </div>
        <div class="form-group">
          <label class="form-label text-xs" style="margin-bottom:2px;opacity:0.6">Séries</label>
          <input class="form-input" name="ex_sets_${index}" type="number" value="${ex.sets||3}" min="1" placeholder="3" />
        </div>
        <div class="form-group">
          <label class="form-label text-xs" style="margin-bottom:2px;opacity:0.6">Reps</label>
          <input class="form-input" name="ex_reps_${index}" value="${ex.reps||'12'}" placeholder="12" />
        </div>
        <div class="form-group">
          <label class="form-label text-xs" style="margin-bottom:2px;opacity:0.6">Carga (kg)</label>
          <input class="form-input" name="ex_load_${index}" value="${ex.load||''}" placeholder="kg" />
        </div>
        <div class="form-group">
          <label class="form-label text-xs" style="margin-bottom:2px;opacity:0.6">Descanso (s)</label>
          <input class="form-input" name="ex_rest_${index}" value="${ex.rest||'60'}" placeholder="60" />
        </div>
        <div class="form-group">
          <label class="form-label text-xs" style="margin-bottom:2px;opacity:0.6">Método</label>
          <input class="form-input" name="ex_method_${index}" value="${ex.method||''}" placeholder="Drop-set..." />
        </div>
        <button type="button" class="btn btn-ghost btn-icon remove-exercise" data-index="${index}" style="color:var(--danger);align-self:end;margin-bottom:4px" title="Remover">✕</button>
      </div>
    </div>
  `;
}

function collectExercises() {
  const rows = document.querySelectorAll('.exercise-row');
  const exercises = [];
  rows.forEach((row) => {
    const i = row.dataset.index;
    const name = document.querySelector(`[name="ex_name_${i}"]`)?.value;
    if (name) {
      exercises.push({
        name,
        sets: parseInt(document.querySelector(`[name="ex_sets_${i}"]`)?.value) || 3,
        reps: document.querySelector(`[name="ex_reps_${i}"]`)?.value || '12',
        load: document.querySelector(`[name="ex_load_${i}"]`)?.value || '',
        rest: document.querySelector(`[name="ex_rest_${i}"]`)?.value || '60',
        method: document.querySelector(`[name="ex_method_${i}"]`)?.value || '',
      });
    }
  });
  return exercises;
}

export function initWorkouts(navigateFn) {
  const addBtn = document.getElementById('addWorkoutBtn');
  
  addBtn?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    const allEx = await db.getAll('exercises');
    let exIndex = 1;

    openModal({
      title: '+ Novo Treino',
      content: workoutFormHTML(students, {}, allEx) + `<datalist id="exerciseList">${allEx.map(e=>`<option value="${e.name}">`).join('')}</datalist>`,
      size: 'xl',
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', id: 'cancelWk', onClick: () => closeModal() },
        { label: 'Salvar Treino', class: 'btn-primary', id: 'saveWorkout', onClick: async () => {
          const form = document.getElementById('workoutForm');
          const fd = new FormData(form);
          const data = { studentId: fd.get('studentId'), name: fd.get('name'), date: fd.get('date'), cycle: fd.get('cycle'), notes: fd.get('notes') };
          if (!data.studentId || !data.name) { notify.error('Aluno e nome são obrigatórios'); return; }
          data.exercises = collectExercises();
          await db.add('workouts', data);
          notify.success('Treino criado!');
          closeModal();
          navigateFn('/treinos');
        }}
      ]
    });

    setTimeout(() => {
      document.getElementById('addExerciseRow')?.addEventListener('click', () => {
        const container = document.getElementById('exerciseRows');
        const allExDb = []; // Already loaded
        container.insertAdjacentHTML('beforeend', exerciseRowHTML(exIndex++, {}, allExDb));
        bindRemoveExercise();
      });
      bindRemoveExercise();
    }, 100);
  });

  // Tab filter
  document.querySelectorAll('#workoutTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#workoutTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const f = tab.dataset.filter;
      document.querySelectorAll('#workoutsList tbody tr').forEach(row => {
        row.style.display = (f === 'all' || row.dataset.student === f) ? '' : 'none';
      });
    });
  });

  // View
  document.querySelectorAll('.view-workout').forEach(btn => {
    btn.addEventListener('click', async () => {
      const w = await db.get('workouts', btn.dataset.id);
      if (!w) return;
      const st = await db.get('students', w.studentId);
      openModal({
        title: w.name,
        size: 'lg',
        content: `
          <div class="flex items-center gap-md mb-md">
            <div class="avatar">${st?st.name[0]:'?'}</div>
            <div><strong>${st?st.name:'?'}</strong><div class="text-muted text-xs">${Calc.formatDate(w.date)} ${w.cycle?'· '+w.cycle:''}</div></div>
          </div>
          ${w.notes?`<p class="text-sm text-muted mb-md">${w.notes}</p>`:''}
          <div class="table-container">
            <table class="data-table"><thead><tr><th>#</th><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>Descanso</th><th>Método</th></tr></thead>
            <tbody>${(w.exercises||[]).map((e,i)=>`<tr><td>${i+1}</td><td>${e.name}</td><td>${e.sets}</td><td>${e.reps}</td><td>${e.load?e.load+'kg':'-'}</td><td>${e.rest?e.rest+'s':'-'}</td><td>${e.method||'-'}</td></tr>`).join('')}</tbody></table>
          </div>
        `
      });
    });
  });

  // PDF
  document.querySelectorAll('.pdf-workout').forEach(btn => {
    btn.addEventListener('click', async () => {
      const w = await db.get('workouts', btn.dataset.id);
      if (!w) return;
      const st = await db.get('students', w.studentId) || { name: 'Aluno', code: '---' };
      try {
        const doc = await generateWorkoutPDF(st, w, w.exercises);
        downloadPDF(doc, `Treino_${w.name.replace(/\s/g,'_')}_${st.code}.pdf`);
        notify.success('PDF gerado!');
      } catch(e) { notify.error('Erro ao gerar PDF: ' + e.message); }
    });
  });

  // Delete
  document.querySelectorAll('.delete-workout').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir este treino?')) {
        await db.delete('workouts', btn.dataset.id);
        notify.success('Treino excluído');
        navigateFn('/treinos');
      }
    });
  });

  // Edit
  document.querySelectorAll('.edit-workout').forEach(btn => {
    btn.addEventListener('click', async () => {
      const w = await db.get('workouts', btn.dataset.id);
      if (!w) return;
      const students = await db.getAll('students');
      const allEx = await db.getAll('exercises');
      openModal({
        title: 'Editar Treino',
        content: workoutFormHTML(students, w, allEx) + `<datalist id="exerciseList">${allEx.map(e=>`<option value="${e.name}">`).join('')}</datalist>`,
        size: 'xl',
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelEditWk', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', id: 'saveEditWk', onClick: async () => {
            const form = document.getElementById('workoutForm');
            const fd = new FormData(form);
            const data = { ...w, studentId: fd.get('studentId'), name: fd.get('name'), date: fd.get('date'), cycle: fd.get('cycle'), notes: fd.get('notes'), exercises: collectExercises() };
            await db.put('workouts', data);
            notify.success('Treino atualizado!');
            closeModal();
            navigateFn('/treinos');
          }}
        ]
      });
      setTimeout(() => { bindRemoveExercise(); }, 100);
    });
  });
}

function bindRemoveExercise() {
  document.querySelectorAll('.remove-exercise').forEach(btn => {
    btn.onclick = () => btn.closest('.exercise-row')?.remove();
  });
}
