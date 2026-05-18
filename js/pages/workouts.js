// ========================================
// PERSONAL PRO — Workouts Page
// ========================================

import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { generateWorkoutPDF, downloadPDF } from '../utils/pdf-generator.js';

const ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_PDF = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DEL = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
const ICON_PLAY = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

export async function renderWorkouts() {
  const students  = await db.getAll('students');
  const workouts  = await db.getAll('workouts');
  const macros    = await db.getAll('macrocycles');
  const activeStudents = students.filter(s => s.status === 'Ativo');
  workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Stats rápidas
  const withStudent = workouts.filter(w => w.studentId);
  const fromMacro   = workouts.filter(w => w.macrocycleId);
  const manual      = withStudent.length - fromMacro.length;

  const cycleOptions = macros.map(m => {
    const st = students.find(s => s.id === m.studentId);
    return `<option value="${m.id}" data-student="${m.studentId}">${st ? st.name.split(' ')[0] : '?'} — ${m.name}</option>`;
  }).join('');

  return `
    <div class="page-header">
      <div>
        <h1>Prescrição de Treinos</h1>
        <p class="subtitle">${workouts.length} treino(s) registrado(s)</p>
      </div>
      <button class="btn btn-primary" id="addWorkoutBtn">+ Novo Treino</button>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">TOTAL</div>
        <div class="stat-value text-gradient">${workouts.length}</div>
        <div class="stat-change">treinos cadastrados</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">DE MACROCICLOS</div>
        <div class="stat-value" style="color:var(--primary)">${fromMacro.length}</div>
        <div class="stat-change">gerados automaticamente</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">MANUAIS</div>
        <div class="stat-value" style="color:var(--accent)">${manual}</div>
        <div class="stat-change">criados pelo personal</div>
      </div>
    </div>

    <div class="flex gap-sm mb-md" style="flex-wrap:wrap;align-items:center">
      <div style="position:relative;width:180px">
        <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text-muted)" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="workoutSearch" class="form-input" placeholder="Buscar..." style="padding-left:28px;font-size:0.82rem" />
      </div>
      <div class="tabs" id="workoutTabs" style="margin-bottom:0">
        <button class="tab active" data-filter="all">Todos</button>
        ${activeStudents.map(s => `<button class="tab" data-filter="${s.id}">${s.name.split(' ')[0]}</button>`).join('')}
      </div>
      <select class="form-select" id="workoutCycleFilter" style="min-width:200px">
        <option value="">Todos os ciclos</option>
        <option value="active">Apenas ciclo ativo</option>
        ${cycleOptions}
      </select>
    </div>

    <div id="workoutsList">
      ${workouts.length ? `
        <div class="table-container">
          <table class="data-table">
            <thead><tr>
              <th>Aluno</th><th>Treino</th><th>Data</th><th>Fase</th><th>Exercícios</th><th>Semana</th><th></th>
            </tr></thead>
            <tbody>
              ${workouts.map(w => {
                const st = students.find(s => s.id === w.studentId);
                const macro = macros.find(m => m.id === w.macrocycleId);
                const isDeload = w.isDeload;
                const intensityColor = !w.intensityPct ? '' :
                  w.intensityPct >= 85 ? 'var(--danger)' :
                  w.intensityPct >= 75 ? 'var(--warning)' :
                  w.intensityPct >= 65 ? 'var(--accent)' : 'var(--success)';
                return `<tr data-student="${w.studentId}" data-macroid="${w.macrocycleId || ''}" data-name="${(w.name||'').toLowerCase()}">
                  <td>
                    <div class="flex items-center gap-sm">
                      <div class="avatar avatar-sm" style="width:26px;height:26px;font-size:0.7rem">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                      <span style="font-size:0.85rem">${st?.name || '?'}</span>
                    </div>
                  </td>
                  <td>
                    <div style="font-weight:600;font-size:0.88rem">${w.name || 'Treino'}</div>
                    ${w.cycle ? `<div class="text-xs text-muted">${w.cycle}</div>` : ''}
                    ${macro ? `<div class="text-xs" style="color:var(--primary)">${macro.name}</div>` : ''}
                  </td>
                  <td style="font-size:0.82rem">${Calc.formatDate(w.date)}</td>
                  <td>
                    ${isDeload
                      ? `<span class="badge" style="background:rgba(59,130,246,0.15);color:#3b82f6">Deload</span>`
                      : w.phase
                        ? `<span class="badge badge-info" style="font-size:0.7rem">${w.phase}</span>`
                        : '<span class="text-muted text-xs">—</span>'}
                  </td>
                  <td>
                    <span class="badge badge-info">${(w.exercises||[]).length}</span>
                  </td>
                  <td>
                    ${w.intensityPct
                      ? `<span style="font-size:0.82rem;font-weight:700;color:${intensityColor}">${w.intensityPct}%</span>`
                      : '<span class="text-muted text-xs">—</span>'}
                  </td>
                  <td>
                    <div style="display:flex;gap:4px;align-items:center">
                      <button class="btn btn-ghost btn-sm start-workout" data-id="${w.id}" data-student="${w.studentId}" title="Iniciar treino" style="padding:4px 8px;color:var(--primary)">${ICON_PLAY}</button>
                      <button class="btn btn-ghost btn-sm view-workout" data-id="${w.id}" title="Ver" style="padding:4px 6px;color:var(--accent)">${ICON_EYE}</button>
                      <button class="btn btn-ghost btn-sm pdf-workout" data-id="${w.id}" title="PDF" style="padding:4px 6px;color:var(--text-muted)">${ICON_PDF}</button>
                      <button class="btn btn-ghost btn-sm edit-workout" data-id="${w.id}" title="Editar" style="padding:4px 6px;color:var(--text-muted)">${ICON_EDIT}</button>
                      <button class="btn btn-ghost btn-sm delete-workout" data-id="${w.id}" title="Excluir" style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">—</div>
          <h3>Nenhum treino criado</h3>
          <p>Crie o primeiro treino ou gere via Periodização</p>
          <button class="btn btn-primary mt-sm" id="addWorkoutBtnEmpty">+ Novo Treino</button>
        </div>
      `}
    </div>
  `;
}

function workoutFormHTML(students, workout = {}, allExercises = [], allMethods = []) {
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
          ${exList.map((ex, i) => exerciseRowHTML(i, ex, allExercises, allMethods)).join('')}
        </div>
      </div>
    </form>
  `;
}

function exerciseRowHTML(index, ex = {}, allExercises = [], allMethods = []) {
  const loadType = ex.loadType || 'weight';
  const isTime   = loadType === 'time';
  const isBW     = loadType === 'bodyweight';
  return `
    <div class="exercise-row" style="
      display:grid;grid-template-columns:2fr 56px 68px 72px 60px 100px 90px 28px;
      gap:5px;align-items:end;padding:8px 10px;border-radius:8px;
      background:var(--bg-page);margin-bottom:6px" data-index="${index}">
      <div>
        <label class="form-label" style="font-size:0.65rem;margin-bottom:2px;opacity:0.65">Exercício</label>
        <input class="form-input ex-name-input" name="ex_name_${index}" list="exerciseList" value="${ex.name||''}"
          placeholder="Nome" style="font-size:0.82rem" data-index="${index}" />
      </div>
      <div>
        <label class="form-label" style="font-size:0.65rem;margin-bottom:2px;opacity:0.65">Séries</label>
        <input class="form-input" name="ex_sets_${index}" type="number" value="${ex.sets||3}" min="1"
          style="text-align:center;font-size:0.82rem;padding:4px 6px" />
      </div>
      <div>
        <label class="form-label" style="font-size:0.65rem;margin-bottom:2px;opacity:0.65">Reps/Tempo</label>
        <input class="form-input" name="ex_reps_${index}" value="${ex.reps || ex.defaultReps || '12'}"
          placeholder="12" style="text-align:center;font-size:0.82rem;padding:4px 6px" />
      </div>
      <div>
        <label class="form-label" style="font-size:0.65rem;margin-bottom:2px;opacity:0.65" id="loadLbl_${index}">
          ${isTime ? 'Intensidade' : isBW ? 'Extra (kg)' : 'Carga (kg)'}
        </label>
        <input class="form-input" name="ex_load_${index}" value="${ex.load||''}"
          placeholder="${isTime ? 'km/h/W' : isBW ? '+kg' : 'kg'}"
          style="text-align:center;font-size:0.82rem;padding:4px 6px" />
      </div>
      <div>
        <label class="form-label" style="font-size:0.65rem;margin-bottom:2px;opacity:0.65">Desc.(s)</label>
        <input class="form-input" name="ex_rest_${index}" value="${ex.rest||'60'}"
          style="text-align:center;font-size:0.82rem;padding:4px 6px" />
      </div>
      <div>
        <label class="form-label" style="font-size:0.65rem;margin-bottom:2px;opacity:0.65">Tipo carga</label>
        <select class="form-select ex-loadtype" name="ex_loadtype_${index}" data-index="${index}"
          style="font-size:0.78rem;padding:4px 6px">
          <option value="weight"     ${loadType==='weight'?'selected':''}>Peso (kg)</option>
          <option value="bodyweight" ${loadType==='bodyweight'?'selected':''}>P.Corporal</option>
          <option value="time"       ${loadType==='time'?'selected':''}>Tempo/Int.</option>
        </select>
      </div>
      <div>
        <label class="form-label" style="font-size:0.65rem;margin-bottom:2px;opacity:0.65">Método</label>
        <select class="form-select ex-method" name="ex_method_${index}" data-index="${index}"
          style="font-size:0.78rem;padding:4px 6px">
          <option value="">— Nenhum —</option>
          ${allMethods.map(m => `<option value="${m.name}" ${ex.method===m.name?'selected':''}
            data-sets="${m.sets||''}" data-reps="${m.repsHint||''}" data-rest="${m.restHint||''}"
            data-desc="${m.description||''}">${m.name}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="btn btn-ghost btn-icon remove-exercise" data-index="${index}"
        style="color:var(--danger);padding:4px;align-self:flex-end;margin-bottom:2px" title="Remover">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>`;
}

function collectExercises() {
  const rows = document.querySelectorAll('.exercise-row');
  const exercises = [];
  rows.forEach(row => {
    const i = row.dataset.index;
    const name = document.querySelector(`[name="ex_name_${i}"]`)?.value;
    if (name) {
      exercises.push({
        name,
        sets:     parseInt(document.querySelector(`[name="ex_sets_${i}"]`)?.value) || 3,
        reps:     document.querySelector(`[name="ex_reps_${i}"]`)?.value || '12',
        load:     document.querySelector(`[name="ex_load_${i}"]`)?.value || '',
        rest:     document.querySelector(`[name="ex_rest_${i}"]`)?.value || '60',
        method:   document.querySelector(`[name="ex_method_${i}"]`)?.value || '',
        loadType: document.querySelector(`[name="ex_loadtype_${i}"]`)?.value || 'weight',
      });
    }
  });
  return exercises;
}

export function initWorkouts(navigateFn) {
  const openAddModal = async () => {
    const students  = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    const allEx     = await db.getAll('exercises');
    const allMethods= await db.getAll('methods');
    let exIndex     = 1;

    openModal({
      title: '+ Novo Treino', size: 'xl',
      content: workoutFormHTML(students, {}, allEx) +
        `<datalist id="exerciseList">${allEx.map(e => `<option value="${e.name}">`).join('')}</datalist>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        { label: 'Salvar Treino', class: 'btn-primary', onClick: async () => {
          const fd = new FormData(document.getElementById('workoutForm'));
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

    // Substituir primeira linha com métodos
    setTimeout(() => {
      const firstRow = document.querySelector('.exercise-row');
      if (firstRow) {
        firstRow.outerHTML = exerciseRowHTML(0, {}, allEx, allMethods);
      }
      document.getElementById('addExerciseRow')?.addEventListener('click', () => {
        const container = document.getElementById('exerciseRows');
        container.insertAdjacentHTML('beforeend', exerciseRowHTML(exIndex++, {}, allEx, allMethods));
        bindExerciseRowHandlers(allEx, allMethods);
      });
      bindExerciseRowHandlers(allEx, allMethods);
    }, 100);
  };

  document.getElementById('addWorkoutBtn')?.addEventListener('click', openAddModal);
  document.getElementById('addWorkoutBtnEmpty')?.addEventListener('click', openAddModal);

  // Busca
  document.getElementById('workoutSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#workoutsList tbody tr').forEach(row => {
      const name = row.dataset.name || '';
      row.style.display = name.includes(q) ? '' : 'none';
    });
  });

  // Filtro por aluno
  let activeStudentFilter = 'all';
  let activeCycleFilter   = '';

  function applyFilters() {
    const q = document.getElementById('workoutSearch')?.value.toLowerCase() || '';
    document.querySelectorAll('#workoutsList tbody tr').forEach(row => {
      const matchStudent = activeStudentFilter === 'all' || row.dataset.student === activeStudentFilter;
      const matchCycle   = !activeCycleFilter || row.dataset.macro === activeCycleFilter || row.dataset.macro === 'active_match';
      const matchSearch  = !q || (row.dataset.name || '').includes(q);
      row.style.display  = matchStudent && matchCycle && matchSearch ? '' : 'none';
    });
  }

  document.querySelectorAll('#workoutTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#workoutTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeStudentFilter = tab.dataset.filter;
      applyFilters();
    });
  });

  document.getElementById('workoutCycleFilter')?.addEventListener('change', async e => {
    const val = e.target.value;
    if (val === 'active') {
      const macros = await db.getAll('macrocycles');
      const ids = new Set(macros.filter(m => m.status === 'active').map(m => m.id));
      document.querySelectorAll('#workoutsList tbody tr').forEach(row => {
        row.dataset.macro = ids.has(row.dataset.macroid) ? 'active_match' : '';
      });
      activeCycleFilter = 'active_match';
    } else {
      document.querySelectorAll('#workoutsList tbody tr').forEach(row => {
        row.dataset.macro = val ? (row.dataset.macroid === val ? val : '') : val;
      });
      activeCycleFilter = val;
    }
    applyFilters();
  });

  // Iniciar treino direto
  document.querySelectorAll('.start-workout').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionStorage.setItem('pp_autostart', JSON.stringify({
        studentId: btn.dataset.student,
        workoutId: btn.dataset.id,
      }));
      navigateFn('/tracker');
    });
  });

  // Visualizar
  document.querySelectorAll('.view-workout').forEach(btn => {
    btn.addEventListener('click', async () => {
      const w  = await db.get('workouts', btn.dataset.id);
      if (!w) return;
      const st = await db.get('students', w.studentId);
      const macro = w.macrocycleId ? await db.get('macrocycles', w.macrocycleId) : null;
      openModal({
        title: w.name, size: 'lg',
        content: `
          <div class="flex items-center gap-md mb-md">
            <div class="avatar">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
            <div>
              <div style="font-weight:700">${st?.name || '?'}</div>
              <div class="text-muted text-xs">
                ${Calc.formatDate(w.date)}
                ${w.cycle ? ' · ' + w.cycle : ''}
                ${macro ? ' · ' + macro.name : ''}
                ${w.phase ? ' · ' + w.phase : ''}
              </div>
            </div>
            ${w.intensityPct ? `<span class="badge badge-info" style="margin-left:auto">${w.intensityPct}% 1RM</span>` : ''}
          </div>
          ${w.notes ? `<p class="text-sm text-muted mb-md">${w.notes}</p>` : ''}
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>#</th><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>Desc.</th><th>Método</th><th>Tipo</th></tr></thead>
              <tbody>
                ${(w.exercises||[]).map((e, i) => {
                  const isTime = e.loadType === 'time';
                  const isBW   = e.loadType === 'bodyweight';
                  const loadDisplay = isTime ? (e.load ? e.load + 's' : '-') : isBW ? (e.load ? '+' + e.load + 'kg' : 'PC') : (e.load ? e.load + 'kg' : '-');
                  const typeLabel   = isTime ? 'Tempo' : isBW ? 'P.Corporal' : 'Peso';
                  const typeColor   = isTime ? 'var(--accent)' : isBW ? 'var(--success)' : 'var(--text-muted)';
                  return `<tr>
                    <td style="color:var(--text-muted)">${i+1}</td>
                    <td><strong>${e.name}</strong></td>
                    <td style="text-align:center">${e.sets}</td>
                    <td style="text-align:center">${e.reps}</td>
                    <td style="text-align:center;color:var(--primary);font-weight:600">${loadDisplay}</td>
                    <td style="text-align:center">${e.rest ? e.rest + 's' : '-'}</td>
                    <td>${e.method || '-'}</td>
                    <td><span style="font-size:0.72rem;color:${typeColor}">${typeLabel}</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
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
      const trainerSettings = await db.get('settings', 'trainer') || {};
      w._trainerName = trainerSettings.trainerName || '';
      w._trainerCref = trainerSettings.cref || '';
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
      const w      = await db.get('workouts', btn.dataset.id);
      if (!w) return;
      const students   = await db.getAll('students');
      const allEx      = await db.getAll('exercises');
      const allMethods = await db.getAll('methods');   // ← carrega métodos
      let exIndex      = (w.exercises || []).length;

      openModal({
        title: 'Editar Treino', size: 'xl',
        content: workoutFormHTML(students, w, allEx, allMethods) + `<datalist id="exerciseList">${allEx.map(e=>`<option value="${e.name}">`).join('')}</datalist>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd   = new FormData(document.getElementById('workoutForm'));
            const data = { ...w, studentId: fd.get('studentId'), name: fd.get('name'), date: fd.get('date'), cycle: fd.get('cycle'), notes: fd.get('notes'), exercises: collectExercises() };
            await db.put('workouts', data);
            notify.success('Treino atualizado!');
            closeModal();
            navigateFn('/treinos');
          }}
        ]
      });

      setTimeout(() => {
        document.getElementById('addExerciseRow')?.addEventListener('click', () => {
          document.getElementById('exerciseRows').insertAdjacentHTML('beforeend', exerciseRowHTML(exIndex++, {}, allEx, allMethods));
          bindExerciseRowHandlers(allEx, allMethods);
          bindRemoveExercise();
        });
        bindExerciseRowHandlers(allEx, allMethods);
        bindRemoveExercise();
      }, 100);
    });
  });
} // fim initWorkouts

function bindRemoveExercise() {
  document.querySelectorAll('.remove-exercise').forEach(btn => {
    btn.onclick = () => btn.closest('.exercise-row')?.remove();
  });
}

function bindExerciseRowHandlers(allExercises, allMethods) {
  bindRemoveExercise();

  // Auto-preenchimento ao selecionar método
  document.querySelectorAll('.ex-method').forEach(sel => {
    sel.addEventListener('change', () => {
      const opt = sel.selectedOptions[0];
      if (!opt || !opt.value) return;
      const i = sel.dataset.index;
      const setsEl = document.querySelector(`[name="ex_sets_${i}"]`);
      const repsEl = document.querySelector(`[name="ex_reps_${i}"]`);
      const restEl = document.querySelector(`[name="ex_rest_${i}"]`);
      const sets = opt.dataset.sets;
      const reps = opt.dataset.reps;
      const rest = opt.dataset.rest;
      if (sets && setsEl && !setsEl.value) setsEl.value = sets.replace(/[^0-9]/g,'') || 3;
      if (reps && repsEl) repsEl.value = reps;
      if (rest && restEl) {
        // Extrair primeiro número de "90s" ou "90-120s"
        const match = rest.match(/(\d+)/);
        if (match) restEl.value = match[1];
      }
      // Tooltip com descrição do método
      const desc = opt.dataset.desc;
      if (desc) {
        const row = sel.closest('.exercise-row');
        let tip = row?.querySelector('.method-tip');
        if (!tip) {
          tip = document.createElement('div');
          tip.className = 'method-tip';
          tip.style.cssText = 'font-size:0.7rem;color:var(--accent);margin-top:3px;grid-column:1/-1;padding:4px 6px;background:rgba(6,182,212,0.07);border-radius:4px';
          row?.appendChild(tip);
        }
        tip.textContent = '💡 ' + desc;
      }
    });
  });

  // Auto-preencher tipo de carga ao selecionar exercício
  document.querySelectorAll('.ex-name-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const ex = allExercises.find(e => e.name.toLowerCase() === inp.value.toLowerCase());
      if (!ex) return;
      const i = inp.dataset.index;
      const ltSel = document.querySelector(`[name="ex_loadtype_${i}"]`);
      const repsEl = document.querySelector(`[name="ex_reps_${i}"]`);
      const lbl    = document.getElementById(`loadLbl_${i}`);
      if (ex.loadType && ltSel) ltSel.value = ex.loadType;
      if (ex.defaultReps && repsEl && (!repsEl.value || repsEl.value === '12')) repsEl.value = ex.defaultReps;
      if (lbl) lbl.textContent = ex.loadType === 'time' ? 'Intensidade' : ex.loadType === 'bodyweight' ? 'Extra (kg)' : 'Carga (kg)';
    });
  });

  // Atualizar label ao mudar tipo de carga
  document.querySelectorAll('.ex-loadtype').forEach(sel => {
    sel.addEventListener('change', () => {
      const i = sel.dataset.index;
      const lbl = document.getElementById(`loadLbl_${i}`);
      if (lbl) lbl.textContent = sel.value === 'time' ? 'Intensidade' : sel.value === 'bodyweight' ? 'Extra (kg)' : 'Carga (kg)';
    });
  });
}
