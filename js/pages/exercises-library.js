// ========================================
// PERSONAL PRO — Exercises & Templates Library
// ========================================
import db from '../db.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { BUILT_IN_TEMPLATES, getTemplatesByCategory } from '../utils/workout-templates.js';

const MUSCLE_GROUPS = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha', 'Abdômen', 'Core', 'Cardio', 'Full Body'];
const CATEGORIES = ['Musculação', 'Funcional', 'Calistenia', 'Cardio', 'Mobilidade', 'Aquecimento'];

export async function renderExercisesLibrary() {
  const exercises = await db.getAll('exercises');
  const grouped = {};
  exercises.forEach(ex => { const g = ex.muscleGroup || 'Outros'; if (!grouped[g]) grouped[g] = []; grouped[g].push(ex); });

  // Custom templates from DB
  const customTemplates = (await db.getAll('cycles')).filter(c => c.isTemplate);
  const builtInGrouped = getTemplatesByCategory();

  return `
    <div class="page-header"><div><h1>Biblioteca</h1><p class="subtitle">Exercícios e modelos de treino</p></div></div>

    <div class="tabs" id="libTabs">
      <button class="tab active" data-tab="exercises">Exercícios (${exercises.length})</button>
      <button class="tab" data-tab="templates">Modelos de Treino</button>
      <button class="tab" data-tab="custom">Meus Modelos</button>
    </div>

    <!-- TAB: Exercises -->
    <div id="tabExercises" class="lib-tab-content">
      <div class="card mb-md"><div class="flex gap-md items-center">
        <input class="form-input" id="exSearch" placeholder="Buscar exercício..." style="flex:1" />
        <select class="form-select" id="exFilterGroup" style="width:auto"><option value="">Todos os grupos</option>${MUSCLE_GROUPS.map(g => `<option>${g}</option>`).join('')}</select>
        <button class="btn btn-primary" id="addExerciseBtn">+ Novo Exercício</button>
      </div></div>
      <div id="exercisesList">${Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, exs]) => `
        <div class="card mb-md exercise-group" data-group="${group}">
          <div class="card-header"><span class="card-title">${group} <span class="badge badge-info">${exs.length}</span></span></div>
          <div class="exercise-grid">${exs.sort((a, b) => a.name.localeCompare(b.name)).map(ex => `
            <div class="exercise-item" data-name="${ex.name.toLowerCase()}" data-group="${ex.muscleGroup}">
              <div class="flex items-center justify-between">
                <strong class="text-sm">${ex.name}</strong>
                <div class="flex gap-sm">
                  ${ex.videoUrl ? `<a href="${ex.videoUrl}" target="_blank" class="btn btn-ghost btn-sm" title="Vídeo">▶</a>` : ''}
                  <button class="btn btn-ghost btn-sm edit-exercise" data-id="${ex.id}" title="Editar">✏️</button>
                  <button class="btn btn-ghost btn-sm delete-exercise" data-id="${ex.id}" style="color:var(--danger)" title="Excluir">✕</button>
                </div>
              </div>
              <div class="text-xs text-muted">${ex.equipment || '-'} · ${ex.category || '-'}</div>
            </div>
          `).join('')}</div>
        </div>
      `).join('')}</div>
    </div>

    <!-- TAB: Built-in Templates -->
    <div id="tabTemplates" class="lib-tab-content" style="display:none">
      <p class="text-muted mb-lg">Modelos prontos de treino que você pode aplicar diretamente a um aluno. Selecione e personalize as cargas.</p>
      ${Object.entries(builtInGrouped).map(([cat, tpls]) => `
        <div class="mb-lg">
          <h3 class="mb-md" style="color:var(--primary)">${cat}</h3>
          <div class="template-grid">${tpls.map(t => `
            <div class="card template-card" data-tpl="${t.id}">
              <div class="flex items-center justify-between mb-sm">
                <h4 style="margin:0;font-size:0.95rem">${t.name}</h4>
                <span class="badge badge-info">${t.daysPerWeek}x/sem</span>
              </div>
              <div class="badge badge-success mb-sm">${t.goal}</div>
              <p class="text-xs text-muted mb-md" style="line-height:1.5">${t.description}</p>
              <div class="text-xs text-muted mb-sm">${t.workouts.length} treino(s):</div>
              ${t.workouts.map(w => `<div class="text-xs" style="padding:2px 0;color:var(--text-secondary)">• ${w.name} <span class="text-muted">(${w.exercises.length} ex.)</span></div>`).join('')}
              <div class="flex gap-sm mt-md">
                <button class="btn btn-primary btn-sm apply-template" data-tpl="${t.id}" style="flex:1">Aplicar a Aluno</button>
                <button class="btn btn-secondary btn-sm view-template" data-tpl="${t.id}">Ver</button>
              </div>
            </div>
          `).join('')}</div>
        </div>
      `).join('')}
    </div>

    <!-- TAB: Custom Templates -->
    <div id="tabCustom" class="lib-tab-content" style="display:none">
      <div class="flex items-center justify-between mb-lg">
        <p class="text-muted">Crie seus próprios modelos de treino reutilizáveis.</p>
        <button class="btn btn-primary" id="addCustomTplBtn">+ Novo Modelo</button>
      </div>
      ${customTemplates.length ? customTemplates.map(t => `
        <div class="card mb-md">
          <div class="card-header">
            <span class="card-title">${t.name} <span class="badge badge-info">${t.goal || 'Geral'}</span></span>
            <div class="flex gap-sm">
              <button class="btn btn-primary btn-sm apply-custom-tpl" data-id="${t.id}">Aplicar</button>
              <button class="btn btn-secondary btn-sm edit-custom-tpl" data-id="${t.id}">Editar</button>
              <button class="btn btn-ghost btn-sm delete-custom-tpl" data-id="${t.id}" style="color:var(--danger)">✕</button>
            </div>
          </div>
          <p class="text-xs text-muted">${t.description || ''}</p>
          ${(t.workouts || []).map(w => `<div class="text-xs mt-xs" style="color:var(--text-secondary)">• ${w.name} (${(w.exercises || []).length} exercícios)</div>`).join('')}
        </div>
      `).join('') : `<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Nenhum modelo personalizado</h3><p>Crie modelos de treino reutilizáveis</p></div>`}
    </div>
  `;
}

function exerciseFormHTML(ex = {}) {
  return `<form id="exForm">
    <div class="form-group"><label class="form-label">Nome *</label><input class="form-input" name="name" value="${ex.name || ''}" required /></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Grupo Muscular</label><select class="form-select" name="muscleGroup">${MUSCLE_GROUPS.map(g => `<option ${ex.muscleGroup === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Categoria</label><select class="form-select" name="category">${CATEGORIES.map(c => `<option ${ex.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Equipamento</label><input class="form-input" name="equipment" value="${ex.equipment || ''}" placeholder="Ex: Barra, Halteres, Máquina" /></div>
    <div class="form-group"><label class="form-label">Link do Vídeo (YouTube)</label><input class="form-input" name="videoUrl" value="${ex.videoUrl || ''}" placeholder="https://youtube.com/watch?v=..." /></div>
    <div class="form-group"><label class="form-label">Notas</label><textarea class="form-textarea" name="notes" rows="2">${ex.notes || ''}</textarea></div>
  </form>`;
}

export function initExercisesLibrary(navigateFn) {
  // Tab switching
  document.querySelectorAll('#libTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#libTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.lib-tab-content').forEach(c => c.style.display = 'none');
      const target = tab.dataset.tab;
      if (target === 'exercises') document.getElementById('tabExercises').style.display = '';
      else if (target === 'templates') document.getElementById('tabTemplates').style.display = '';
      else if (target === 'custom') document.getElementById('tabCustom').style.display = '';
    });
  });

  // Search & filter exercises
  document.getElementById('exSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.exercise-item').forEach(el => { el.style.display = el.dataset.name.includes(q) ? '' : 'none'; });
  });
  document.getElementById('exFilterGroup')?.addEventListener('change', (e) => {
    const g = e.target.value;
    document.querySelectorAll('.exercise-group').forEach(el => { el.style.display = (!g || el.dataset.group === g) ? '' : 'none'; });
  });

  // Add exercise
  document.getElementById('addExerciseBtn')?.addEventListener('click', () => {
    openModal({
      title: '+ Novo Exercício', size: 'md', content: exerciseFormHTML(),
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', id: 'cancelEx', onClick: () => closeModal() },
        {
          label: 'Salvar', class: 'btn-primary', id: 'saveEx', onClick: async () => {
            const fd = new FormData(document.getElementById('exForm'));
            const d = Object.fromEntries(fd);
            if (!d.name) { notify.error('Nome obrigatório'); return; }
            await db.add('exercises', d); notify.success('Exercício adicionado!'); closeModal(); navigateFn('/exercicios');
          }
        }
      ]
    });
  });

  // Edit exercise
  document.querySelectorAll('.edit-exercise').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ex = await db.get('exercises', btn.dataset.id);
      if (!ex) return;
      openModal({
        title: 'Editar Exercício', size: 'md', content: exerciseFormHTML(ex),
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelExE', onClick: () => closeModal() },
          {
            label: 'Salvar', class: 'btn-primary', id: 'saveExE', onClick: async () => {
              const fd = new FormData(document.getElementById('exForm'));
              const d = { ...ex, ...Object.fromEntries(fd) };
              await db.put('exercises', d); notify.success('Atualizado!'); closeModal(); navigateFn('/exercicios');
            }
          }
        ]
      });
    });
  });

  // Delete exercise
  document.querySelectorAll('.delete-exercise').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir exercício?')) { await db.delete('exercises', btn.dataset.id); navigateFn('/exercicios'); }
    });
  });

  // View built-in template details
  document.querySelectorAll('.view-template').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = BUILT_IN_TEMPLATES.find(t => t.id === btn.dataset.tpl);
      if (!tpl) return;
      openModal({
        title: tpl.name, size: 'lg',
        content: `
          <div class="mb-md"><span class="badge badge-success">${tpl.goal}</span> <span class="badge badge-info">${tpl.daysPerWeek}x/semana</span></div>
          <p class="text-sm text-muted mb-lg">${tpl.description}</p>
          ${tpl.workouts.map(w => `
            <div class="card mb-md">
              <div class="card-header"><span class="card-title">${w.name}</span></div>
              <div class="table-container"><table class="data-table"><thead><tr><th>#</th><th>Exercício</th><th>Séries</th><th>Reps</th><th>Descanso</th><th>Método</th></tr></thead>
              <tbody>${w.exercises.map((e, i) => `<tr><td>${i + 1}</td><td>${e.name}</td><td>${e.sets}</td><td>${e.reps}</td><td>${e.rest ? e.rest + 's' : '-'}</td><td>${e.method || '-'}</td></tr>`).join('')}</tbody></table></div>
            </div>
          `).join('')}
        `
      });
    });
  });

  // Apply built-in template to student
  document.querySelectorAll('.apply-template').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tpl = BUILT_IN_TEMPLATES.find(t => t.id === btn.dataset.tpl);
      if (!tpl) return;
      await showApplyTemplateModal(tpl, navigateFn);
    });
  });

  // Apply custom template
  document.querySelectorAll('.apply-custom-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tpl = await db.get('cycles', btn.dataset.id);
      if (!tpl) return;
      await showApplyTemplateModal(tpl, navigateFn);
    });
  });

  // Edit custom template
  document.querySelectorAll('.edit-custom-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tpl = await db.get('cycles', btn.dataset.id);
      if (!tpl) return;
      const allExercises = await db.getAll('exercises');
      let workoutCount = (tpl.workouts || []).length;

      // Montar HTML dos treinos existentes
      const workoutsHTML = (tpl.workouts || []).map((w, wi) => `
        <div class="card mb-md tpl-workout" data-wi="${wi}">
          <div class="flex items-center justify-between mb-sm">
            <div class="form-group" style="flex:1;margin-bottom:0">
              <label class="form-label">Nome do Treino</label>
              <input class="form-input" name="wk_name_${wi}" value="${w.name || ''}" placeholder="Ex: Treino A" />
            </div>
            <button type="button" class="btn btn-ghost btn-sm rm-tpl-workout" style="color:var(--danger);margin-left:8px;margin-top:20px">✕ Remover treino</button>
          </div>
          <div class="tpl-exercises" data-wi="${wi}">
            ${(w.exercises || []).map((ex, ei) => `
              <div class="flex items-center gap-sm mb-sm tpl-ex-row" data-ei="${ei}">
                <input class="form-input" name="wk_${wi}_ex_${ei}" list="tplExListEdit" value="${ex.name || ''}" placeholder="Exercício" style="flex:2" />
                <input class="form-input" name="wk_${wi}_sets_${ei}" type="number" value="${ex.sets || 3}" min="1" style="width:60px" title="Séries" />
                <input class="form-input" name="wk_${wi}_reps_${ei}" value="${ex.reps || '12'}" style="width:70px" title="Reps" />
                <input class="form-input" name="wk_${wi}_rest_${ei}" value="${ex.rest || '60'}" style="width:60px" title="Descanso (s)" />
                <input class="form-input" name="wk_${wi}_method_${ei}" value="${ex.method || ''}" style="width:80px" placeholder="Método" />
                <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger)">✕</button>
              </div>`).join('')}
          </div>
          <button type="button" class="btn btn-ghost btn-sm add-tpl-ex" data-wi="${wi}">+ Exercício</button>
        </div>`).join('');

      openModal({
        title: `Editar: ${tpl.name}`, size: 'xl',
        content: `<form id="editTplForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nome do Modelo *</label>
              <input class="form-input" name="name" value="${tpl.name || ''}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Objetivo</label>
              <select class="form-select" name="goal">
                ${['Hipertrofia','Força','Condicionamento','Saúde','Performance'].map(g => `<option ${tpl.goal === g ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-textarea" name="description" rows="2">${tpl.description || ''}</textarea>
          </div>
          <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:16px">
            <div class="flex items-center justify-between mb-md">
              <h4>Treinos do Modelo</h4>
              <button type="button" class="btn btn-secondary btn-sm" id="addTplWorkoutEdit">+ Treino</button>
            </div>
            <div id="tplWorkoutsEdit">${workoutsHTML}</div>
          </div>
          <datalist id="tplExListEdit">${allExercises.map(e => `<option value="${e.name}">`).join('')}</datalist>
        </form>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelEditTpl', onClick: () => closeModal() },
          {
            label: 'Salvar Alterações', class: 'btn-primary', id: 'saveEditTpl', onClick: async () => {
              const fd = new FormData(document.getElementById('editTplForm'));
              const name = fd.get('name');
              if (!name) { notify.error('Nome obrigatório'); return; }

              const workouts = [];
              document.querySelectorAll('#tplWorkoutsEdit .tpl-workout').forEach(wkEl => {
                const wi = wkEl.dataset.wi;
                const wkName = fd.get(`wk_name_${wi}`) || `Treino ${parseInt(wi) + 1}`;
                const exercises = [];
                wkEl.querySelectorAll('.tpl-ex-row').forEach(exEl => {
                  const ei = exEl.dataset.ei;
                  const exName = fd.get(`wk_${wi}_ex_${ei}`);
                  if (exName) {
                    exercises.push({
                      name: exName,
                      sets: parseInt(fd.get(`wk_${wi}_sets_${ei}`)) || 3,
                      reps: fd.get(`wk_${wi}_reps_${ei}`) || '12',
                      rest: fd.get(`wk_${wi}_rest_${ei}`) || '60',
                      method: fd.get(`wk_${wi}_method_${ei}`) || '',
                      load: '',
                    });
                  }
                });
                if (exercises.length) workouts.push({ name: wkName, exercises });
              });

              await db.put('cycles', {
                ...tpl,
                name, goal: fd.get('goal'), description: fd.get('description'),
                isTemplate: true, workouts, daysPerWeek: workouts.length,
              });
              notify.success('Modelo atualizado!');
              closeModal();
              navigateFn('/exercicios');
            }
          }
        ]
      });

      // Bind eventos do modal de edição
      setTimeout(() => {
        // Remover treino
        document.querySelectorAll('#tplWorkoutsEdit .rm-tpl-workout').forEach(b => {
          b.onclick = () => b.closest('.tpl-workout')?.remove();
        });

        // Adicionar treino
        document.getElementById('addTplWorkoutEdit')?.addEventListener('click', () => {
          const wi = workoutCount++;
          document.getElementById('tplWorkoutsEdit').insertAdjacentHTML('beforeend', `
            <div class="card mb-md tpl-workout" data-wi="${wi}">
              <div class="flex items-center justify-between mb-sm">
                <div class="form-group" style="flex:1;margin-bottom:0">
                  <label class="form-label">Nome do Treino</label>
                  <input class="form-input" name="wk_name_${wi}" placeholder="Ex: Treino ${String.fromCharCode(65 + wi)}" />
                </div>
                <button type="button" class="btn btn-ghost btn-sm rm-tpl-workout" style="color:var(--danger);margin-left:8px;margin-top:20px">✕ Remover treino</button>
              </div>
              <div class="tpl-exercises" data-wi="${wi}">
                <div class="flex items-center gap-sm mb-sm tpl-ex-row" data-ei="0">
                  <input class="form-input" name="wk_${wi}_ex_0" list="tplExListEdit" placeholder="Exercício" style="flex:2" />
                  <input class="form-input" name="wk_${wi}_sets_0" type="number" value="3" min="1" style="width:60px" />
                  <input class="form-input" name="wk_${wi}_reps_0" value="12" style="width:70px" />
                  <input class="form-input" name="wk_${wi}_rest_0" value="60" style="width:60px" />
                  <input class="form-input" name="wk_${wi}_method_0" value="" style="width:80px" placeholder="Método" />
                  <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger)">✕</button>
                </div>
              </div>
              <button type="button" class="btn btn-ghost btn-sm add-tpl-ex" data-wi="${wi}">+ Exercício</button>
            </div>`);

          // Rebind eventos
          document.querySelectorAll('#tplWorkoutsEdit .rm-tpl-workout').forEach(b => {
            b.onclick = () => b.closest('.tpl-workout')?.remove();
          });
          bindTplEventsEdit();
        });

        bindTplEventsEdit();
      }, 100);
    });
  });

  // Delete custom template
  document.querySelectorAll('.delete-custom-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir modelo?')) { await db.delete('cycles', btn.dataset.id); navigateFn('/exercicios'); }
    });
  });

  // Create custom template
  document.getElementById('addCustomTplBtn')?.addEventListener('click', async () => {
    const allExercises = await db.getAll('exercises');
    let workoutCount = 1;

    openModal({
      title: '+ Novo Modelo de Treino', size: 'xl',
      content: `<form id="customTplForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nome do Modelo *</label><input class="form-input" name="name" placeholder="Ex: Meu ABC Hipertrofia" required /></div>
          <div class="form-group"><label class="form-label">Objetivo</label><select class="form-select" name="goal"><option>Hipertrofia</option><option>Força</option><option>Condicionamento</option><option>Saúde</option><option>Performance</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-textarea" name="description" rows="2" placeholder="Descrição do modelo..."></textarea></div>
        <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:16px">
          <div class="flex items-center justify-between mb-md">
            <h4>Treinos do Modelo</h4>
            <button type="button" class="btn btn-secondary btn-sm" id="addTplWorkout">+ Treino</button>
          </div>
          <div id="tplWorkouts">
            <div class="card mb-md tpl-workout" data-wi="0">
              <div class="form-group"><label class="form-label">Nome do Treino</label><input class="form-input" name="wk_name_0" placeholder="Ex: Treino A - Superior" /></div>
              <div class="tpl-exercises" data-wi="0">
                <div class="flex items-center gap-sm mb-sm tpl-ex-row" data-ei="0">
                  <input class="form-input" name="wk_0_ex_0" list="tplExList" placeholder="Nome do exercício" style="flex:2" />
                  <input class="form-input" name="wk_0_sets_0" type="number" value="3" min="1" style="width:60px" title="Séries" />
                  <input class="form-input" name="wk_0_reps_0" value="12" style="width:70px" title="Reps" />
                  <input class="form-input" name="wk_0_rest_0" value="60" style="width:60px" title="Descanso (s)" />
                  <input class="form-input" name="wk_0_method_0" value="" style="width:80px" placeholder="Método" />
                  <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger)">✕</button>
                </div>
              </div>
              <button type="button" class="btn btn-ghost btn-sm add-tpl-ex" data-wi="0">+ Exercício</button>
            </div>
          </div>
        </div>
        <datalist id="tplExList">${allExercises.map(e => `<option value="${e.name}">`).join('')}</datalist>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', id: 'cancelTpl', onClick: () => closeModal() },
        {
          label: 'Salvar Modelo', class: 'btn-primary', id: 'saveTpl', onClick: async () => {
            const fd = new FormData(document.getElementById('customTplForm'));
            const name = fd.get('name');
            if (!name) { notify.error('Nome obrigatório'); return; }

            const workouts = [];
            document.querySelectorAll('.tpl-workout').forEach(wkEl => {
              const wi = wkEl.dataset.wi;
              const wkName = fd.get(`wk_name_${wi}`) || `Treino ${parseInt(wi) + 1}`;
              const exercises = [];
              wkEl.querySelectorAll('.tpl-ex-row').forEach(exEl => {
                const ei = exEl.dataset.ei;
                const exName = fd.get(`wk_${wi}_ex_${ei}`);
                if (exName) {
                  exercises.push({
                    name: exName,
                    sets: parseInt(fd.get(`wk_${wi}_sets_${ei}`)) || 3,
                    reps: fd.get(`wk_${wi}_reps_${ei}`) || '12',
                    rest: fd.get(`wk_${wi}_rest_${ei}`) || '60',
                    method: fd.get(`wk_${wi}_method_${ei}`) || '',
                    load: '',
                  });
                }
              });
              if (exercises.length) workouts.push({ name: wkName, exercises });
            });

            await db.add('cycles', {
              name, goal: fd.get('goal'), description: fd.get('description'),
              isTemplate: true, workouts, daysPerWeek: workouts.length,
            });
            notify.success('Modelo salvo!');
            closeModal();
            navigateFn('/exercicios');
          }
        }
      ]
    });

    // Bind add workout / add exercise inside modal
    setTimeout(() => {
      document.getElementById('addTplWorkout')?.addEventListener('click', () => {
        const wi = workoutCount++;
        document.getElementById('tplWorkouts').insertAdjacentHTML('beforeend', `
          <div class="card mb-md tpl-workout" data-wi="${wi}">
            <div class="form-group"><label class="form-label">Nome do Treino</label><input class="form-input" name="wk_name_${wi}" placeholder="Ex: Treino B" /></div>
            <div class="tpl-exercises" data-wi="${wi}">
              <div class="flex items-center gap-sm mb-sm tpl-ex-row" data-ei="0">
                <input class="form-input" name="wk_${wi}_ex_0" list="tplExList" placeholder="Exercício" style="flex:2" />
                <input class="form-input" name="wk_${wi}_sets_0" type="number" value="3" min="1" style="width:60px" />
                <input class="form-input" name="wk_${wi}_reps_0" value="12" style="width:70px" />
                <input class="form-input" name="wk_${wi}_rest_0" value="60" style="width:60px" />
                <input class="form-input" name="wk_${wi}_method_0" value="" style="width:80px" placeholder="Método" />
                <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger)">✕</button>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm add-tpl-ex" data-wi="${wi}">+ Exercício</button>
          </div>
        `);
        bindTplEvents();
      });
      bindTplEvents();
    }, 100);
  });
}

function bindTplEvents() {
  document.querySelectorAll('.add-tpl-ex').forEach(btn => {
    btn.onclick = () => {
      const wi = btn.dataset.wi;
      const container = btn.previousElementSibling;
      const ei = container.querySelectorAll('.tpl-ex-row').length;
      container.insertAdjacentHTML('beforeend', `
        <div class="flex items-center gap-sm mb-sm tpl-ex-row" data-ei="${ei}">
          <input class="form-input" name="wk_${wi}_ex_${ei}" list="tplExList" placeholder="Exercício" style="flex:2" />
          <input class="form-input" name="wk_${wi}_sets_${ei}" type="number" value="3" min="1" style="width:60px" />
          <input class="form-input" name="wk_${wi}_reps_${ei}" value="12" style="width:70px" />
          <input class="form-input" name="wk_${wi}_rest_${ei}" value="60" style="width:60px" />
          <input class="form-input" name="wk_${wi}_method_${ei}" value="" style="width:80px" placeholder="Método" />
          <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger)">✕</button>
        </div>
      `);
      bindRemoveTplEx();
    };
  });
  bindRemoveTplEx();
}

function bindRemoveTplEx() {
  document.querySelectorAll('.rm-tpl-ex').forEach(btn => {
    btn.onclick = () => btn.closest('.tpl-ex-row')?.remove();
  });
}

function bindTplEventsEdit() {
  document.querySelectorAll('#tplWorkoutsEdit .add-tpl-ex').forEach(btn => {
    btn.onclick = () => {
      const wi = btn.dataset.wi;
      const container = btn.previousElementSibling;
      const ei = container.querySelectorAll('.tpl-ex-row').length;
      container.insertAdjacentHTML('beforeend', `
        <div class="flex items-center gap-sm mb-sm tpl-ex-row" data-ei="${ei}">
          <input class="form-input" name="wk_${wi}_ex_${ei}" list="tplExListEdit" placeholder="Exercício" style="flex:2" />
          <input class="form-input" name="wk_${wi}_sets_${ei}" type="number" value="3" min="1" style="width:60px" />
          <input class="form-input" name="wk_${wi}_reps_${ei}" value="12" style="width:70px" />
          <input class="form-input" name="wk_${wi}_rest_${ei}" value="60" style="width:60px" />
          <input class="form-input" name="wk_${wi}_method_${ei}" value="" style="width:80px" placeholder="Método" />
          <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger)">✕</button>
        </div>`);
      document.querySelectorAll('#tplWorkoutsEdit .rm-tpl-ex').forEach(b => {
        b.onclick = () => b.closest('.tpl-ex-row')?.remove();
      });
    };
  });
  document.querySelectorAll('#tplWorkoutsEdit .rm-tpl-ex').forEach(b => {
    b.onclick = () => b.closest('.tpl-ex-row')?.remove();
  });
}

async function showApplyTemplateModal(tpl, navigateFn) {
  const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
  openModal({
    title: `Aplicar: ${tpl.name}`, size: 'md',
    content: `<form id="applyTplForm">
      <div class="form-group"><label class="form-label">Aluno *</label>
        <select class="form-select" name="studentId" required>
          <option value="">Selecione</option>
          ${students.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Nome do Ciclo</label>
        <input class="form-input" name="cycle" value="${tpl.name}" />
      </div>
      <div class="form-group"><label class="form-label">Data de Início</label>
        <input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" />
      </div>
      <p class="text-muted text-sm mt-md">${(tpl.workouts || []).length} treino(s) serão criados para o aluno selecionado.</p>
    </form>`,
    actions: [
      { label: 'Cancelar', class: 'btn-secondary', id: 'cancelApply', onClick: () => closeModal() },
      {
        label: 'Criar Treinos', class: 'btn-primary', id: 'doApply', onClick: async () => {
          const fd = new FormData(document.getElementById('applyTplForm'));
          const studentId = fd.get('studentId');
          const cycle = fd.get('cycle');
          const date = fd.get('date');
          if (!studentId) { notify.error('Selecione um aluno'); return; }

          let count = 0;
          for (const w of (tpl.workouts || [])) {
            await db.add('workouts', {
              studentId, name: w.name, date, cycle,
              exercises: (w.exercises || []).map(e => ({ ...e })),
            });
            count++;
          }
          notify.success(`${count} treino(s) criado(s) para o aluno!`);
          closeModal();
          navigateFn('/treinos');
        }
      }
    ]
  });
}
