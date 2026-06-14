// ========================================
// PERSONAL PRO — Exercises Library (v2)
// Busca avançada · LoadType · Métodos · Cardio · Meus Modelos
// ========================================
import db from '../db.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { BUILT_IN_TEMPLATES, getTemplatesByCategory } from '../utils/workout-templates.js';
import { METHOD_PROGRESSIONS } from './workouts.js';
import { isAdmin } from '../utils/roles.js';

// ── Proteção admin/personal ───────────────────────────────────
// is_default=true  → somente admin edita/exclui
// personal trainer → só visualiza os itens padrão

function canEdit(item, adminMode)   { return item.is_default ? adminMode : true; }
function canDelete(item, adminMode) { return item.is_default ? adminMode : true; }

function defaultBadge(adminMode) {
  return '<span class="badge" style="background:rgba(239,68,68,0.12);color:var(--danger);font-size:0.6rem;padding:1px 6px;margin-left:4px">Admin</span>';
}


const MUSCLE_GROUPS = [
  'Peito','Costas','Ombros','Bíceps','Tríceps','Antebraço',
  'Quadríceps','Posterior','Glúteos','Panturrilha','Abdômen','Core',
  'Cardio','Corpo Inteiro','Mobilidade',
];
const CATEGORIES  = ['Musculação','Funcional','Calistenia','Cardio','Mobilidade','Aquecimento','Reabilitação'];
const LOAD_LABELS = { weight: 'Peso (kg)', bodyweight: 'Peso Corporal', time: 'Tempo/Int.' };
const LOAD_COLORS = { weight: 'var(--accent)', bodyweight: 'var(--success)', time: 'var(--warning)' };

const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DEL  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
const ICON_PLAY = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const ICON_IMG  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

export async function renderExercisesLibrary() {
  const [exercises, methods, customTplsRaw, adminMode] = await Promise.all([
    db.getAll('exercises'),
    db.getAll('methods'),
    db.getAll('cycles'),
    isAdmin(),
  ]);
  const customTpls     = customTplsRaw.filter(c => c.isTemplate);
  const builtInGrouped = getTemplatesByCategory();

  // Agrupar exercícios por grupo muscular
  const grouped = {};
  exercises.forEach(ex => {
    const g = ex.muscleGroup || 'Outros';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(ex);
  });

  // Stats por loadType
  const byLoad = {
    weight:     exercises.filter(e => (e.loadType||'weight') === 'weight').length,
    bodyweight: exercises.filter(e => e.loadType === 'bodyweight').length,
    time:       exercises.filter(e => e.loadType === 'time').length,
  };

  // Agrupar métodos por categoria
  const methodsByCat = {};
  methods.forEach(m => {
    const c = m.category || 'Geral';
    if (!methodsByCat[c]) methodsByCat[c] = [];
    methodsByCat[c].push(m);
  });

  return `
    <div class="page-header">
      <div>
        <h1>Biblioteca</h1>
        <p class="subtitle">${exercises.length} exercícios · ${methods.length} métodos · ${customTpls.length} modelos personalizados</p>
      </div>
    </div>

    <div class="tabs" id="libTabs">
      <button class="tab active" data-tab="exercises">Exercícios (${exercises.length})</button>
      <button class="tab" data-tab="methods">Métodos (${methods.length})</button>
      <button class="tab" data-tab="templates">Modelos Prontos</button>
      <button class="tab" data-tab="custom">Meus Modelos (${customTpls.length})</button>
    </div>

    <!-- ── EXERCÍCIOS ── -->
    <div id="tabExercises" class="lib-tab-content">
      <div class="card mb-md">
        <div class="flex gap-sm items-center" style="flex-wrap:wrap">
          <div style="position:relative;flex:1;min-width:180px">
            <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text-muted)" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="form-input" id="exSearch" placeholder="Buscar exercício..." style="padding-left:32px" />
          </div>
          <select class="form-select" id="exFilterGroup" style="width:auto">
            <option value="">Todos os grupos</option>
            ${MUSCLE_GROUPS.map(g=>`<option>${g}</option>`).join('')}
          </select>
          <select class="form-select" id="exFilterLoad" style="width:auto">
            <option value="">Todos os tipos</option>
            <option value="weight">Peso (${byLoad.weight})</option>
            <option value="bodyweight">P. Corporal (${byLoad.bodyweight})</option>
            <option value="time">Tempo/Int. (${byLoad.time})</option>
          </select>
          <select class="form-select" id="exFilterCat" style="width:auto">
            <option value="">Todas as categorias</option>
            ${CATEGORIES.map(c=>`<option>${c}</option>`).join('')}
          </select>
          ${adminMode ? `<button class="btn btn-secondary btn-sm" id="dedupBtn">Limpar Duplicados</button>` : ''}
          <button class="btn btn-primary btn-sm" id="addExerciseBtn">+ Novo Exercício</button>
        </div>
        <div class="flex gap-sm mt-sm" style="flex-wrap:wrap;align-items:center">
          ${Object.entries(LOAD_LABELS).map(([k,l])=>`
            <span style="font-size:0.7rem;padding:2px 9px;border-radius:20px;background:${LOAD_COLORS[k]}20;color:${LOAD_COLORS[k]};border:1px solid ${LOAD_COLORS[k]}40">
              ${l}: ${byLoad[k]||0}
            </span>`).join('')}
          <span class="text-xs text-muted" style="margin-left:auto">Total: ${exercises.length}</span>
        </div>
      </div>

      <div id="exercisesList">
        ${Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([group, exs])=>`
          <div class="card mb-md exercise-group" data-group="${group}">
            <div class="card-header">
              <span class="card-title">${group} <span class="badge badge-info">${exs.length}</span></span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:8px">
              ${exs.sort((a,b)=>a.name.localeCompare(b.name)).map(ex=>{
                const lt = ex.loadType || 'weight';
                return `
                <div class="exercise-item" data-name="${ex.name.toLowerCase()}" data-group="${ex.muscleGroup||''}" data-load="${lt}" data-cat="${ex.category||''}"
                  style="padding:8px 10px;background:var(--bg-page);border-radius:8px;border:1px solid var(--border-color)">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px">
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600;font-size:0.85rem;margin-bottom:2px">${ex.name}${ex.is_default ? defaultBadge(adminMode) : ''}</div>
                      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
                        <span style="font-size:0.63rem;color:var(--text-muted)">${ex.equipment||'-'}</span>
                        <span style="font-size:0.63rem;color:${LOAD_COLORS[lt]};font-weight:600">${LOAD_LABELS[lt]}</span>
                        ${ex.defaultReps?`<span style="font-size:0.63rem;color:var(--text-muted)">${ex.defaultReps}</span>`:''}
                      </div>
                      ${ex.description?`<div style="font-size:0.67rem;color:var(--text-muted);margin-top:3px;line-height:1.3">${ex.description.slice(0,75)}${ex.description.length>75?'…':''}</div>`:''}
                    </div>
                    <div style="display:flex;gap:2px;flex-shrink:0">
                      ${ex.videoUrl?`<a href="${ex.videoUrl}" target="_blank" class="btn btn-ghost btn-sm" style="padding:3px 5px;color:var(--danger)" title="Ver vídeo">${ICON_PLAY}</a>`:''}
                      ${ex.imageUrl?`<a href="${ex.imageUrl}" target="_blank" class="btn btn-ghost btn-sm" style="padding:3px 5px;color:var(--success)" title="Ver imagem">${ICON_IMG}</a>`:''}
                      <button class="btn btn-ghost btn-sm edit-exercise" data-id="${ex.id}" style="padding:3px 5px;color:var(--text-muted)" ${!canEdit(ex,adminMode)?'style="display:none"':''}>${canEdit(ex,adminMode) ? ICON_EDIT : ''}</button>
                      <button class="btn btn-ghost btn-sm delete-exercise" data-id="${ex.id}" style="padding:3px 5px;color:var(--danger)" ${!canDelete(ex,adminMode)?'style="display:none"':''}>${canDelete(ex,adminMode) ? ICON_DEL : ''}</button>
                    </div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- ── MÉTODOS ── -->
    <div id="tabMethods" class="lib-tab-content" style="display:none">
      <div class="card mb-md">
        <div class="flex gap-sm items-center">
          <div style="position:relative;flex:1">
            <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text-muted)" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="form-input" id="methodSearch" placeholder="Buscar método de treinamento..." style="padding-left:32px" />
          </div>
          <button class="btn btn-primary btn-sm" id="addMethodBtn">+ Novo Método</button>
        </div>
      </div>
      ${Object.entries(methodsByCat).sort(([a],[b])=>a.localeCompare(b)).map(([cat, ms])=>`
        <div class="card mb-md">
          <div class="card-header">
            <span class="card-title" style="color:var(--primary)">${cat}</span>
            <span class="badge badge-info">${ms.length}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px">
            ${ms.map(m=>`
              <div class="method-item" data-name="${m.name.toLowerCase()}"
                style="padding:10px 12px;background:var(--bg-page);border-radius:8px;border:1px solid var(--border-color);${m.is_default&&!adminMode?'border-left:3px solid rgba(99,102,241,0.3)':''}${m.is_default&&adminMode?'border-left:3px solid rgba(239,68,68,0.3)':''}">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
                  <div style="font-weight:700;font-size:0.88rem;color:var(--primary)">${m.name}</div>
                  <div style="display:flex;align-items:center;gap:4px">
                    ${m.is_default ? defaultBadge(adminMode) : ''}
                    ${m.is_default && !adminMode
                      ? `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="opacity:0.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                      : ''}
                    ${m.is_default && adminMode
                      ? `<button class="btn btn-ghost btn-sm edit-method" data-id="${m.id}" style="padding:2px 4px;color:var(--text-muted)">${ICON_EDIT}</button>
                         <button class="btn btn-ghost btn-sm delete-method" data-id="${m.id}" style="padding:2px 4px;color:var(--danger)">${ICON_DEL}</button>`
                      : !m.is_default
                        ? `<button class="btn btn-ghost btn-sm edit-method" data-id="${m.id}" style="padding:2px 4px;color:var(--text-muted)">${ICON_EDIT}</button>
                           <button class="btn btn-ghost btn-sm delete-method" data-id="${m.id}" style="padding:2px 4px;color:var(--danger)">${ICON_DEL}</button>`
                        : ''}
                  </div>
                </div>
                <div style="font-size:0.74rem;color:var(--text-secondary);line-height:1.45;margin-bottom:7px">${m.description||''}</div>
                <div style="display:flex;gap:12px;flex-wrap:wrap">
                  ${m.sets?`<span style="font-size:0.68rem"><span style="color:var(--text-muted)">Séries:</span> <strong>${m.sets}</strong></span>`:''}
                  ${m.repsHint?`<span style="font-size:0.68rem"><span style="color:var(--text-muted)">Reps:</span> <strong>${m.repsHint}</strong></span>`:''}
                  ${m.restHint?`<span style="font-size:0.68rem"><span style="color:var(--text-muted)">Descanso:</span> <strong>${m.restHint}</strong></span>`:''}
                </div>
              </div>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- ── MODELOS PRONTOS ── -->
    <div id="tabTemplates" class="lib-tab-content" style="display:none">
      <div class="flex items-center justify-between mb-md">
        <p class="text-muted text-sm">Modelos científicos prontos para aplicar diretamente a qualquer aluno.</p>
        ${adminMode ? `<span class="badge" style="background:rgba(239,68,68,0.12);color:var(--danger)">Modo Admin — edição liberada</span>` : `<span class="badge" style="background:rgba(99,102,241,0.12);color:#6366f1">Somente leitura — apenas admin edita</span>`}
      </div>
      ${Object.entries(builtInGrouped).map(([cat, tpls])=>`
        <div class="mb-lg">
          <h3 class="mb-md" style="color:var(--primary)">${cat}</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px">
            ${tpls.map(t=>`
              <div class="card" style="display:flex;flex-direction:column;${!adminMode?'border-left:3px solid rgba(99,102,241,0.25)':'border-left:3px solid rgba(239,68,68,0.3)'}">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">
                  <h4 style="margin:0;font-size:0.92rem">${t.name}</h4>
                  <div style="display:flex;gap:4px;align-items:center">
                    <span class="badge badge-info">${t.daysPerWeek}x/sem</span>
                    ${adminMode
                      ? `<span class="badge" style="background:rgba(239,68,68,0.12);color:var(--danger);font-size:0.6rem">Admin</span>`
                      : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="opacity:0.6" title="Somente admin pode editar"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                    }
                  </div>
                </div>
                <span class="badge badge-success" style="width:fit-content;margin-bottom:8px">${t.goal}</span>
                <p class="text-xs text-muted mb-sm" style="line-height:1.5;flex:1">${t.description}</p>
                <div style="border-top:1px solid var(--border-color);padding-top:8px;margin-bottom:10px">
                  ${(t.workouts||[]).map(w=>`
                    <div style="font-size:0.75rem;padding:2px 0;color:var(--text-secondary)">
                      <strong>${w.name}</strong> <span style="color:var(--text-muted)">(${(w.exercises||[]).length} ex.)</span>
                    </div>`).join('')}
                </div>
                <div class="flex gap-sm">
                  <button class="btn btn-primary btn-sm apply-template" data-tpl="${t.id}" style="flex:1">Aplicar a Aluno</button>
                  <button class="btn btn-secondary btn-sm view-template" data-tpl="${t.id}">Ver</button>
                  ${adminMode ? `<button class="btn btn-ghost btn-sm edit-builtin-tpl" data-tpl="${t.id}" style="padding:4px 6px;color:var(--text-muted)" title="Editar (admin)">${ICON_EDIT}</button>` : ''}
                </div>
              </div>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- ── MEUS MODELOS ── -->
    <div id="tabCustom" class="lib-tab-content" style="display:none">
      <div class="flex items-center justify-between mb-md">
        <p class="text-muted text-sm">Modelos reutilizáveis criados por você.</p>
        <button class="btn btn-primary btn-sm" id="addCustomTplBtn">+ Novo Modelo</button>
      </div>
      ${customTpls.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
          ${customTpls.map(t=>`
            <div class="card">
              <div class="card-header">
                <div>
                  <div style="font-weight:700">${t.name}</div>
                  ${t.goal?`<span class="badge badge-info" style="margin-top:3px">${t.goal}</span>`:''}
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  <button class="btn btn-primary btn-sm apply-custom-tpl" data-id="${t.id}" style="padding:4px 8px;font-size:0.75rem">Aplicar</button>
                  <button class="btn btn-secondary btn-sm view-custom-tpl" data-id="${t.id}" style="padding:4px 8px;font-size:0.75rem">Ver</button>
                  <button class="btn btn-ghost btn-sm edit-custom-tpl" data-id="${t.id}" style="padding:4px 6px;color:var(--text-muted)" title="Editar">${ICON_EDIT}</button>
                  <button class="btn btn-ghost btn-sm delete-custom-tpl" data-id="${t.id}" style="color:var(--danger);padding:4px 6px" title="Excluir">${t.is_default ? "" : ICON_DEL}</button>
                </div>
              </div>
              ${t.description?`<p class="text-xs text-muted mb-sm">${t.description}</p>`:''}
              <div style="border-top:1px solid var(--border-color);padding-top:8px">
                ${(t.workouts||[]).map(w=>`
                  <div style="font-size:0.78rem;padding:2px 0;color:var(--text-secondary)">
                    <strong>${w.name}</strong> <span style="color:var(--text-muted)">(${(w.exercises||[]).length} ex.)</span>
                  </div>`).join('')}
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="empty-state">
          <div class="empty-icon">—</div>
          <h3>Nenhum modelo personalizado</h3>
          <p>Crie modelos de treino reutilizáveis para seus alunos</p>
          <button class="btn btn-primary mt-sm" id="addCustomTplBtnEmpty">+ Criar Primeiro Modelo</button>
        </div>`}
    </div>
  `;
}

function exerciseFormHTML(ex = {}) {
  return `<form id="exForm">
    <div class="form-group"><label class="form-label">Nome *</label>
      <input class="form-input" name="name" value="${ex.name||''}" required placeholder="Ex: Supino Reto com Barra" />
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Grupo Muscular</label>
        <select class="form-select" name="muscleGroup">
          ${MUSCLE_GROUPS.map(g=>`<option ${ex.muscleGroup===g?'selected':''}>${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Categoria</label>
        <select class="form-select" name="category">
          ${CATEGORIES.map(c=>`<option ${ex.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Tipo de Carga</label>
        <select class="form-select" name="loadType">
          <option value="weight"     ${(ex.loadType||'weight')==='weight'?'selected':''}>Peso (kg)</option>
          <option value="bodyweight" ${ex.loadType==='bodyweight'?'selected':''}>Peso Corporal</option>
          <option value="time"       ${ex.loadType==='time'?'selected':''}>Tempo / Intensidade</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Reps/Tempo padrão</label>
        <input class="form-input" name="defaultReps" value="${ex.defaultReps||''}" placeholder="Ex: 12 ou 30s" />
      </div>
    </div>
    <div class="form-group"><label class="form-label">Equipamento</label>
      <input class="form-input" name="equipment" value="${ex.equipment||''}" placeholder="Ex: Barra, Halteres, Máquina" />
    </div>
    <div class="form-group"><label class="form-label">Descrição / Execução</label>
      <textarea class="form-textarea" name="description" rows="2">${ex.description||''}</textarea>
    </div>
    <div class="form-group"><label class="form-label">Link do Vídeo (YouTube)</label>
      <input class="form-input" name="videoUrl" value="${ex.videoUrl||''}" placeholder="https://youtube.com/watch?v=..." />
    </div>
    <div class="form-group"><label class="form-label">Link da Imagem (URL)</label>
      <input class="form-input" name="imageUrl" value="${ex.imageUrl||''}" placeholder="https://..." />
    </div>
  </form>`;
}

export function initExercisesLibrary(navigateFn) {
  // Restore tab
  const savedTab = sessionStorage.getItem('pp_lib_active_tab') || 'exercises';
  const activeTabBtn = document.querySelector(`#libTabs .tab[data-tab="${savedTab}"]`);
  if (activeTabBtn) {
    document.querySelectorAll('#libTabs .tab').forEach(t => t.classList.remove('active'));
    activeTabBtn.classList.add('active');
    document.querySelectorAll('.lib-tab-content').forEach(c => c.style.display = 'none');
    const map = { exercises:'tabExercises', methods:'tabMethods', templates:'tabTemplates', custom:'tabCustom' };
    const el = document.getElementById(map[savedTab]);
    if (el) el.style.display = '';
  }

  // Restore filters
  const savedSearch = sessionStorage.getItem('pp_lib_ex_search') || '';
  const savedGroup = sessionStorage.getItem('pp_lib_ex_group') || '';
  const savedLoad = sessionStorage.getItem('pp_lib_ex_load') || '';
  const savedCat = sessionStorage.getItem('pp_lib_ex_cat') || '';

  const exSearchEl = document.getElementById('exSearch');
  if (exSearchEl) exSearchEl.value = savedSearch;
  const exGroupEl = document.getElementById('exFilterGroup');
  if (exGroupEl) exGroupEl.value = savedGroup;
  const exLoadEl = document.getElementById('exFilterLoad');
  if (exLoadEl) exLoadEl.value = savedLoad;
  const exCatEl = document.getElementById('exFilterCat');
  if (exCatEl) exCatEl.value = savedCat;

  // Tabs
  document.querySelectorAll('#libTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#libTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.lib-tab-content').forEach(c => c.style.display = 'none');
      const map = { exercises:'tabExercises', methods:'tabMethods', templates:'tabTemplates', custom:'tabCustom' };
      const el = document.getElementById(map[tab.dataset.tab]);
      if (el) el.style.display = '';
      sessionStorage.setItem('pp_lib_active_tab', tab.dataset.tab);
    });
  });

  // Filtros exercícios
  const filter = () => {
    const q  = document.getElementById('exSearch')?.value.toLowerCase()||'';
    const g  = document.getElementById('exFilterGroup')?.value||'';
    const lt = document.getElementById('exFilterLoad')?.value||'';
    const ct = document.getElementById('exFilterCat')?.value||'';
    
    // Save to sessionStorage
    sessionStorage.setItem('pp_lib_ex_search', document.getElementById('exSearch')?.value || '');
    sessionStorage.setItem('pp_lib_ex_group', g);
    sessionStorage.setItem('pp_lib_ex_load', lt);
    sessionStorage.setItem('pp_lib_ex_cat', ct);

    const vis = new Set();
    document.querySelectorAll('.exercise-item').forEach(el => {
      const m = (!q||el.dataset.name.includes(q))&&(!g||el.dataset.group===g)&&(!lt||el.dataset.load===lt)&&(!ct||el.dataset.cat===ct);
      el.style.display = m ? '' : 'none';
      if (m) vis.add(el.closest('.exercise-group')?.dataset.group);
    });
    document.querySelectorAll('.exercise-group').forEach(el => {
      el.style.display = vis.has(el.dataset.group) ? '' : 'none';
    });
  };
  ['exSearch','exFilterGroup','exFilterLoad','exFilterCat'].forEach(id => {
    document.getElementById(id)?.addEventListener(id==='exSearch'?'input':'change', filter);
  });
  
  // Apply filters on load
  filter();

  // Busca métodos
  document.getElementById('methodSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.method-item').forEach(el => { el.style.display = el.dataset.name.includes(q)?'':'none'; });
  });

  // Adicionar método
  document.getElementById('addMethodBtn')?.addEventListener('click', () => {
    openModal({
      title: '+ Novo Método de Treinamento', size: 'md',
      preventBackdropClose: true,
      content: `<form id="methodForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nome *</label>
            <input class="form-input" name="name" required placeholder="Ex: Cluster Avançado" />
          </div>
          <div class="form-group"><label class="form-label">Categoria</label>
            <select class="form-select" name="category">
              <option>Hipertrofia</option><option>Força</option><option>Cardio</option>
              <option>Resistência</option><option>Funcional</option><option>Geral</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Descrição / Como executar *</label>
          <textarea class="form-textarea" name="description" rows="3" required
            placeholder="Explique como o método funciona e quando usar..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Séries recomendadas</label>
            <input class="form-input" name="sets" placeholder="Ex: 3-4 ou 7" />
          </div>
          <div class="form-group"><label class="form-label">Reps / Tempo recomendado</label>
            <input class="form-input" name="repsHint" placeholder="Ex: 8-12 ou 20s esforço" />
          </div>
          <div class="form-group"><label class="form-label">Descanso recomendado</label>
            <input class="form-input" name="restHint" placeholder="Ex: 90-120s" />
          </div>
        </div>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        { label: 'Salvar Método', class: 'btn-primary', onClick: async () => {
          const fd = new FormData(document.getElementById('methodForm'));
          const d  = Object.fromEntries(fd);
          if (!d.name || !d.description) { notify.error('Nome e descrição são obrigatórios'); return; }
          await db.add('methods', d);
          notify.success('Método criado!');
          closeModal();
          navigateFn('/exercicios');
        }}
      ]
    });
  });

  const openAddEx = () => openModal({
    title: '+ Novo Exercício', size: 'md',
    preventBackdropClose: true,
    content: exerciseFormHTML(),
    actions: [
      { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
      { label: 'Salvar', class: 'btn-primary', onClick: async () => {
        const fd = new FormData(document.getElementById('exForm'));
        const d = Object.fromEntries(fd);
        if (!d.name) { notify.error('Nome obrigatório'); return; }
        const allEx = await db.getAll('exercises');
        const cleanName = d.name.toLowerCase().trim();
        if (allEx.some(ex => ex.name.toLowerCase().trim() === cleanName)) {
          notify.error('Já existe um exercício com este nome nesta biblioteca.');
          return;
        }
        await db.add('exercises', d);
        notify.success('Exercício criado!');
        closeModal(); navigateFn('/exercicios');
      }}
    ]
  });
  document.getElementById('addExerciseBtn')?.addEventListener('click', openAddEx);

  document.getElementById('dedupBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Isto removerá exercícios com nomes idênticos mantendo apenas um. Continuar?')) return;
    const allEx = await db.getAll('exercises');
    const seen = new Set();
    let count = 0;
    for (const ex of allEx) {
      const name = ex.name.toLowerCase().trim();
      if (seen.has(name)) {
        await db.delete('exercises', ex.id);
        count++;
      } else {
        seen.add(name);
      }
    }
    if (count > 0) {
      notify.success(`${count} exercícios duplicados removidos!`);
      navigateFn('/exercicios');
    } else {
      notify.success('Nenhum exercício duplicado encontrado.');
    }
  });

  // Editar exercício
  document.querySelectorAll('.edit-exercise').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ex = await db.get('exercises', btn.dataset.id);
      if (!ex) return;
      const _adminMode = await isAdmin();
      if (ex.is_default && !_adminMode) { notify.warning('Apenas admins podem editar exercícios padrão.'); return; }
      if (!ex) return;
      openModal({
        title: 'Editar Exercício', size: 'md',
        preventBackdropClose: true,
        content: exerciseFormHTML(ex),
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('exForm'));
            const d = Object.fromEntries(fd);
            if (!d.name) { notify.error('Nome obrigatório'); return; }
            const allEx = await db.getAll('exercises');
            const cleanName = d.name.toLowerCase().trim();
            if (allEx.some(otherEx => otherEx.id !== ex.id && otherEx.name.toLowerCase().trim() === cleanName)) {
              notify.error('Já existe outro exercício com este nome nesta biblioteca.');
              return;
            }
            await db.put('exercises', { ...ex, ...d });
            notify.success('Atualizado!'); closeModal(); navigateFn('/exercicios');
          }}
        ]
      });
    });
  });

  // Excluir exercício
  document.querySelectorAll('.delete-exercise').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ex = await db.get('exercises', btn.dataset.id);
      if (!ex) return;
      const _adminMode = await isAdmin();
      if (ex.is_default && !_adminMode) { notify.warning('Apenas admins podem excluir exercícios padrão.'); return; }
      if (!window.confirm('Excluir ' + ex.name + '?' + (ex.is_default ? ' Este exercício é PADRÃO — sumirá para todos.' : ''))) return;
      await db.delete('exercises', btn.dataset.id);
      notify.success('Excluído.'); navigateFn('/exercicios');
      notify.success('Excluído.'); navigateFn('/exercicios');
    });
  });


  // Excluir método — com verificação admin
  document.querySelectorAll('.delete-method').forEach(btn => {
    btn.addEventListener('click', async () => {
      const m = await db.get('methods', btn.dataset.id);
      if (!m) return;
      const _am = await isAdmin();
      if (m.is_default && !_am) { notify.warning('Apenas admins podem excluir métodos padrão.'); return; }
      if (!window.confirm(`Excluir método "${m.name}"?`)) return;
      await db.delete('methods', btn.dataset.id);
      notify.success('Método excluído.'); navigateFn('/exercicios');
    });
  });

  // Ver modelo pronto
  document.querySelectorAll('.view-template').forEach(btn => {
    btn.addEventListener('click', () => {
      const all = getTemplatesByCategory(); let tpl;
      for (const ts of Object.values(all)) { tpl = ts.find(t=>t.id===btn.dataset.tpl); if (tpl) break; }
      if (!tpl) return;
      openModal({
        title: tpl.name, size: 'lg',
        content: `
          <div class="flex gap-sm mb-md"><span class="badge badge-success">${tpl.goal}</span><span class="badge badge-info">${tpl.daysPerWeek}x/semana</span></div>
          <p class="text-sm text-muted mb-lg">${tpl.description}</p>
          ${(tpl.workouts||[]).map(w=>`
            <div style="margin-bottom:16px">
              <h4 style="margin-bottom:8px;color:var(--primary)">${w.name}</h4>
              <table class="data-table" style="font-size:0.8rem">
                <thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Desc.</th><th>Método</th></tr></thead>
                <tbody>${(w.exercises||[]).map(e=>`<tr><td>${e.name}</td><td>${e.sets||3}</td><td>${e.reps||'12'}</td><td>${e.rest||'60'}s</td><td>${e.method||'-'}</td></tr>`).join('')}</tbody>
              </table>
            </div>`).join('')}`,
        actions: [
          { label: 'Fechar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Aplicar a Aluno', class: 'btn-primary', onClick: () => { closeModal(); showApplyTemplateModal(tpl, navigateFn); }}
        ]
      });
    });
  });

  // Aplicar modelo pronto
  document.querySelectorAll('.apply-template').forEach(btn => {
    btn.addEventListener('click', () => {
      const all = getTemplatesByCategory(); let tpl;
      for (const ts of Object.values(all)) { tpl = ts.find(t=>t.id===btn.dataset.tpl); if (tpl) break; }
      if (tpl) showApplyTemplateModal(tpl, navigateFn);
    });
  });

  // Aplicar meu modelo
  document.querySelectorAll('.apply-custom-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      const t = await db.get('cycles', btn.dataset.id);
      if (t) showApplyTemplateModal(t, navigateFn);
    });
  });

  // Excluir meu modelo
  document.querySelectorAll('.delete-custom-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Excluir este modelo?')) return;
      await db.delete('cycles', btn.dataset.id);
      notify.success('Modelo excluído.'); navigateFn('/exercicios');
    });
  });

  // Ver meu modelo personalizado
  document.querySelectorAll('.view-custom-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tpl = await db.get('cycles', btn.dataset.id);
      if (!tpl) return;
      openModal({
        title: tpl.name, size: 'lg',
        content: `
          <div class="flex gap-sm mb-md">${tpl.goal?`<span class="badge badge-success">${tpl.goal}</span>`:''}</div>
          ${tpl.description?`<p class="text-sm text-muted mb-lg">${tpl.description}</p>`:''}
          ${(tpl.workouts||[]).map(w=>`
            <div style="margin-bottom:16px">
              <h4 style="margin-bottom:8px;color:var(--primary)">${w.name}</h4>
              <div class="table-container">
                <table class="data-table" style="font-size:0.8rem">
                  <thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Desc.</th><th>Método</th></tr></thead>
                  <tbody>${(w.exercises||[]).map(e=>`<tr><td>${e.name}</td><td>${e.sets||3}</td><td>${e.reps||'12'}</td><td>${e.rest||'60'}s</td><td>${e.method||'-'}</td></tr>`).join('')}</tbody>
                </table>
              </div>
            </div>`).join('')}`,
        actions: [
          { label: 'Fechar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Aplicar a Aluno', class: 'btn-primary', onClick: () => { closeModal(); showApplyTemplateModal(tpl, navigateFn); }}
        ]
      });
    });
  });

  // Editar meu modelo personalizado
  document.querySelectorAll('.edit-custom-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tpl = await db.get('cycles', btn.dataset.id);
      if (!tpl) return;
      const allEx  = await db.getAll('exercises');
      const allMet = await db.getAll('methods');
      let wkCount  = tpl.workouts ? tpl.workouts.length : 0;
      
      const workoutsHTML = tpl.workouts && tpl.workouts.length
        ? tpl.workouts.map((w, wi) => buildTplWorkoutHTML(wi, allMet, w)).join('')
        : buildTplWorkoutHTML(0, allMet);

      openModal({
        title: 'Editar Modelo de Treino', size: 'xl',
        preventBackdropClose: true,
        content: `<form id="editCustomTplForm">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Nome do Modelo *</label>
              <input class="form-input" name="name" value="${tpl.name}" required placeholder="Ex: Full Body 3x/sem Hipertrofia" />
            </div>
            <div class="form-group"><label class="form-label">Objetivo</label>
              <select class="form-select" name="goal">
                ${['Hipertrofia','Força','Emagrecimento','Condicionamento','Resistência','Performance','Reabilitação','Funcional']
                  .map(g => `<option ${tpl.goal===g?'selected':''}>${g}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Descrição</label>
            <textarea class="form-textarea" name="description" rows="2" placeholder="Para quem é indicado, observações...">${tpl.description||''}</textarea>
          </div>
          <div id="tplWorkoutsEdit">
            ${workoutsHTML}
          </div>
          <button type="button" class="btn btn-secondary btn-sm mt-sm" id="addTplWorkoutEdit">+ Adicionar Treino</button>
          <datalist id="tplExList">${allEx.map(e=>`<option value="${e.name}">`).join('')}</datalist>
        </form>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar Alterações', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('editCustomTplForm'));
            const name = fd.get('name');
            if (!name) { notify.error('Nome obrigatório'); return; }
            const workouts = [];
            document.querySelectorAll('#tplWorkoutsEdit .tpl-workout').forEach(wkEl => {
              const wi = wkEl.dataset.wi;
              const exercises = [];
              wkEl.querySelectorAll('.tpl-ex-row').forEach(exEl => {
                const ei = exEl.dataset.ei;
                const n  = fd.get(`wk_${wi}_ex_${ei}`);
                if (n) exercises.push({
                  name: n, sets: parseInt(fd.get(`wk_${wi}_sets_${ei}`))||3,
                  reps: fd.get(`wk_${wi}_reps_${ei}`)||'12',
                  rest: fd.get(`wk_${wi}_rest_${ei}`)||'60',
                  method: fd.get(`wk_${wi}_method_${ei}`)||'', load:'',
                });
              });
              const wn = fd.get(`wk_name_${wi}`) || `Treino ${parseInt(wi)+1}`;
              if (exercises.length) workouts.push({ name: wn, exercises });
            });
            await db.put('cycles', { ...tpl, name, goal: fd.get('goal'), description: fd.get('description'), workouts, daysPerWeek: workouts.length });
            notify.success('Modelo atualizado!'); closeModal(); navigateFn('/exercicios');
          }}
        ]
      });

      setTimeout(() => {
        document.getElementById('addTplWorkoutEdit')?.addEventListener('click', () => {
          document.getElementById('tplWorkoutsEdit').insertAdjacentHTML('beforeend', buildTplWorkoutHTML(wkCount++, allMet));
          bindTplEventsEdit(allMet);
        });
        bindTplEventsEdit(allMet);
      }, 100);
    });
  });

  // Helper bindings for editing
  function bindTplEventsEdit(allMethods = []) {
    document.querySelectorAll('#tplWorkoutsEdit .add-tpl-ex').forEach(btn => {
      btn.onclick = () => {
        const wi  = btn.dataset.wi;
        const cnt = document.querySelector(`#tplWorkoutsEdit .tpl-exercises[data-wi="${wi}"]`);
        if (!cnt) return;
        const ei  = cnt.querySelectorAll('.tpl-ex-row').length;
        cnt.insertAdjacentHTML('beforeend', buildTplExRowHTML(wi, ei, allMethods));
        bindRemoveTplExEdit();
        bindMethodAutoFill(cnt.lastElementChild);
      };
    });
    document.querySelectorAll('#tplWorkoutsEdit .rm-tpl-workout').forEach(btn => {
      btn.onclick = () => btn.closest('.tpl-workout')?.remove();
    });
    bindRemoveTplExEdit();
    document.querySelectorAll('#tplWorkoutsEdit .tpl-ex-row').forEach(row => bindMethodAutoFill(row));
  }

  function bindRemoveTplExEdit() {
    document.querySelectorAll('#tplWorkoutsEdit .rm-tpl-ex').forEach(btn => {
      btn.onclick = () => btn.closest('.tpl-ex-row')?.remove();
    });
  }

  // Novo modelo personalizado
  const openCustomTpl = async () => {
    const allEx  = await db.getAll('exercises');
    const allMet = await db.getAll('methods');
    let wkCount  = 1;
    openModal({
      title: '+ Novo Modelo de Treino', size: 'xl',
      preventBackdropClose: true,
      content: `<form id="customTplForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nome do Modelo *</label>
            <input class="form-input" name="name" required placeholder="Ex: Full Body 3x/sem Hipertrofia" />
          </div>
          <div class="form-group"><label class="form-label">Objetivo</label>
            <select class="form-select" name="goal">
              <option>Hipertrofia</option><option>Força</option><option>Emagrecimento</option>
              <option>Condicionamento</option><option>Resistência</option><option>Performance</option>
              <option>Reabilitação</option><option>Funcional</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Descrição</label>
          <textarea class="form-textarea" name="description" rows="2" placeholder="Para quem é indicado, observações..."></textarea>
        </div>
        <div id="tplWorkouts">
          ${buildTplWorkoutHTML(0, allMet)}
        </div>
        <button type="button" class="btn btn-secondary btn-sm mt-sm" id="addTplWorkout">+ Adicionar Treino</button>
        <datalist id="tplExList">${allEx.map(e=>`<option value="${e.name}">`).join('')}</datalist>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        { label: 'Salvar Modelo', class: 'btn-primary', onClick: async () => {
          const fd = new FormData(document.getElementById('customTplForm'));
          const name = fd.get('name');
          if (!name) { notify.error('Nome obrigatório'); return; }
          const workouts = [];
          document.querySelectorAll('.tpl-workout').forEach(wkEl => {
            const wi = wkEl.dataset.wi;
            const exercises = [];
            wkEl.querySelectorAll('.tpl-ex-row').forEach(exEl => {
              const ei = exEl.dataset.ei;
              const n  = fd.get(`wk_${wi}_ex_${ei}`);
              if (n) exercises.push({
                name: n, sets: parseInt(fd.get(`wk_${wi}_sets_${ei}`))||3,
                reps: fd.get(`wk_${wi}_reps_${ei}`)||'12',
                rest: fd.get(`wk_${wi}_rest_${ei}`)||'60',
                method: fd.get(`wk_${wi}_method_${ei}`)||'', load:'',
              });
            });
            const wn = fd.get(`wk_name_${wi}`) || `Treino ${parseInt(wi)+1}`;
            if (exercises.length) workouts.push({ name: wn, exercises });
          });
          await db.add('cycles', { name, goal: fd.get('goal'), description: fd.get('description'), isTemplate: true, workouts, daysPerWeek: workouts.length });
          notify.success('Modelo salvo!'); closeModal(); navigateFn('/exercicios');
        }}
      ]
    });
    setTimeout(() => {
      document.getElementById('addTplWorkout')?.addEventListener('click', () => {
        document.getElementById('tplWorkouts').insertAdjacentHTML('beforeend', buildTplWorkoutHTML(wkCount++, allMet));
        bindTplEvents(allMet);
      });
      bindTplEvents(allMet);
    }, 100);
  };
  document.getElementById('addCustomTplBtn')?.addEventListener('click', openCustomTpl);
  document.getElementById('addCustomTplBtnEmpty')?.addEventListener('click', openCustomTpl);
}

function buildTplWorkoutHTML(wi, allMethods = [], wk = null) {
  const nameVal = wk ? wk.name : '';
  const exercisesHTML = wk && wk.exercises && wk.exercises.length
    ? wk.exercises.map((e, ei) => buildTplExRowHTML(wi, ei, allMethods, e)).join('')
    : buildTplExRowHTML(wi, 0, allMethods);
  
  return `
    <div class="card mb-md tpl-workout" data-wi="${wi}" style="border:1px solid var(--border-active)">
      <div class="card-header">
        <input class="form-input" name="wk_name_${wi}" value="${nameVal}" placeholder="Nome do Treino (ex: Treino A — Peito/Tríceps)" style="font-weight:600;flex:1" />
        <button type="button" class="btn btn-ghost btn-sm rm-tpl-workout" style="color:var(--danger);margin-left:8px;white-space:nowrap">Remover</button>
      </div>
      <div class="tpl-exercises" data-wi="${wi}">
        ${exercisesHTML}
      </div>
      <button type="button" class="btn btn-ghost btn-sm add-tpl-ex mt-xs" data-wi="${wi}">+ Exercício</button>
    </div>`;
}

function buildTplExRowHTML(wi, ei, allMethods = [], ex = null) {
  const nameVal = ex ? ex.name : '';
  const setsVal = ex && ex.sets !== undefined ? ex.sets : 3;
  const repsVal = ex && ex.reps !== undefined ? ex.reps : '12';
  const restVal = ex && ex.rest !== undefined ? ex.rest : '60';
  const methodVal = ex ? ex.method : '';
  
  return `
    <div class="flex items-center gap-xs mb-xs tpl-ex-row" data-ei="${ei}" style="flex-wrap:wrap">
      <input class="form-input" name="wk_${wi}_ex_${ei}" value="${nameVal}" list="tplExList" placeholder="Exercício" style="flex:2;min-width:150px;font-size:0.82rem" />
      <input class="form-input" name="wk_${wi}_sets_${ei}" type="number" value="${setsVal}" min="1" style="width:52px;text-align:center;font-size:0.82rem" title="Séries" />
      <input class="form-input" name="wk_${wi}_reps_${ei}" value="${repsVal}" style="width:60px;text-align:center;font-size:0.82rem" title="Reps/Tempo" />
      <input class="form-input" name="wk_${wi}_rest_${ei}" value="${restVal}" style="width:52px;text-align:center;font-size:0.82rem" title="Descanso (s)" />
      <select class="form-select" name="wk_${wi}_method_${ei}" style="width:150px;font-size:0.75rem">
        <option value="">— Método —</option>
        ${allMethods.map(m=>`<option value="${m.name}" ${methodVal===m.name?'selected':''} data-sets="${m.sets||''}" data-reps="${m.repsHint||''}" data-rest="${m.restHint||''}" data-desc="${m.description||''}">${m.name}</option>`).join('')}
      </select>
      <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger);padding:4px 5px">✕</button>
    </div>`;
}

function bindTplEvents(allMethods = []) {
  document.querySelectorAll('.add-tpl-ex').forEach(btn => {
    btn.onclick = () => {
      const wi  = btn.dataset.wi;
      const cnt = document.querySelector(`.tpl-exercises[data-wi="${wi}"]`);
      if (!cnt) return;
      const ei  = cnt.querySelectorAll('.tpl-ex-row').length;
      cnt.insertAdjacentHTML('beforeend', buildTplExRowHTML(wi, ei, allMethods));
      bindRemoveTplEx();
      bindMethodAutoFill(cnt.lastElementChild);
    };
  });
  document.querySelectorAll('.rm-tpl-workout').forEach(btn => {
    btn.onclick = () => btn.closest('.tpl-workout')?.remove();
  });
  bindRemoveTplEx();
  document.querySelectorAll('#tplWorkouts .tpl-ex-row').forEach(row => bindMethodAutoFill(row));
}

function bindRemoveTplEx() {
  document.querySelectorAll('.rm-tpl-ex').forEach(btn => {
    btn.onclick = () => btn.closest('.tpl-ex-row')?.remove();
  });
}

async function showApplyTemplateModal(tpl, navigateFn) {
  const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
  openModal({
    title: `Aplicar: ${tpl.name}`, size: 'md',
    preventBackdropClose: true,
    content: `<form id="applyTplForm">
      <div class="form-group"><label class="form-label">Aluno *</label>
        <select class="form-select" name="studentId" required>
          <option value="">Selecione</option>
          ${students.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Nome do Ciclo</label>
        <input class="form-input" name="cycle" value="${tpl.name}" />
      </div>
      <div class="form-group"><label class="form-label">Data de Início</label>
        <input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      <div style="padding:10px;background:var(--bg-page);border-radius:8px;font-size:0.82rem;color:var(--text-muted)">
        ${(tpl.workouts||[]).length} treino(s) serão criados para o aluno.
      </div>
    </form>`,
    actions: [
      { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
      { label: 'Criar Treinos', class: 'btn-primary', onClick: async () => {
        const fd  = new FormData(document.getElementById('applyTplForm'));
        const sid = fd.get('studentId');
        if (!sid) { notify.error('Selecione um aluno'); return; }
        const cycle = fd.get('cycle'), date = fd.get('date');
        let count = 0;
        for (const w of (tpl.workouts||[])) {
          await db.add('workouts', { studentId: sid, name: w.name, date, cycle, exercises: (w.exercises||[]).map(e=>({...e})) });
          count++;
        }
        notify.success(`${count} treino(s) criado(s)!`);
        closeModal(); navigateFn('/treinos');
      }}
    ]
  });
}

function bindMethodAutoFill(row) {
  const methodSelect = row.querySelector('select[name*="_method_"]');
  if (!methodSelect) return;
  methodSelect.addEventListener('change', () => {
    const opt = methodSelect.selectedOptions[0];
    const methodName = opt?.value || '';

    // Remove previous panels/tips
    row.querySelectorAll('.method-series-panel').forEach(p => p.remove());
    row.querySelectorAll('.method-tip').forEach(p => p.remove());

    const setsEl = row.querySelector('input[name*="_sets_"]');
    const repsEl = row.querySelector('input[name*="_reps_"]');
    const restEl = row.querySelector('input[name*="_rest_"]');

    if (!methodName) {
      return;
    }

    const sets = opt?.dataset.sets;
    const reps = opt?.dataset.reps;
    const rest = opt?.dataset.rest;

    if (sets && setsEl) setsEl.value = sets.replace(/[^0-9]/g, '') || '3';
    if (reps && repsEl) repsEl.value = reps;
    if (rest && restEl) {
      const match = rest.match(/(\d+)/);
      if (match) restEl.value = match[1];
    }

    // ── Verificar se o método tem progressão definida ────────
    const progression = METHOD_PROGRESSIONS[methodName];
    if (!progression) {
      const desc = opt?.dataset.desc;
      if (desc) {
        const tip = document.createElement('div');
        tip.className = 'method-tip';
        tip.style.cssText = 'font-size:0.72rem;color:var(--accent);margin-top:4px;width:100%;padding:6px 8px;background:rgba(6,182,212,0.07);border-radius:6px;border-left:2px solid var(--accent)';
        tip.innerHTML = `<strong>${methodName}</strong> — ${desc}`;
        row.appendChild(tip);
      }
      return;
    }

    // Atualizar contador de séries
    if (setsEl) setsEl.value = progression.series.length;

    // Criar painel de visualização das sub-séries do método
    const panel = document.createElement('div');
    panel.className = 'method-series-panel';
    panel.style.cssText = 'width:100%;margin-top:6px;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:8px 10px';

    const seriesHeader = `
      <div style="margin-bottom:6px">
        <span style="font-size:0.75rem;font-weight:700;color:var(--primary)">${methodName}</span>
        <span style="font-size:0.65rem;color:var(--text-muted);margin-left:6px">${progression.desc}</span>
      </div>`;

    const seriesLegend = `
      <div style="display:grid;grid-template-columns:100px 72px 72px;gap:6px;margin-bottom:4px;border-bottom:1px solid rgba(148,163,184,0.1);padding-bottom:2px">
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Série</div>
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Intensidade</div>
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Reps</div>
      </div>`;

    const seriesHTML = progression.series.map((s, si) => {
      return `
        <div style="display:grid;grid-template-columns:100px 72px 72px;gap:6px;align-items:center;padding:3px 0;border-bottom:1px solid rgba(148,163,184,0.05)">
          <div style="font-size:0.7rem;font-weight:600;color:var(--text-secondary)">${s.label}</div>
          <div style="font-size:0.72rem;color:var(--primary);font-weight:600">${Math.round(s.loadPct * 100)}% 1RM</div>
          <div style="font-size:0.72rem;color:var(--text-muted);font-weight:600">${s.reps}</div>
        </div>`;
    }).join('');

    panel.innerHTML = seriesHeader + seriesLegend + seriesHTML;
    row.appendChild(panel);
  });
}
