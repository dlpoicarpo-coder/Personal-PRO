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

export function getWorkoutWeek(workout) {
  if (workout.week) return `Semana ${workout.week}`;
  const match = (workout.name || '').match(/\b(?:sem|semana|sem\.|s|w|week)\s*(\d+)\b/i);
  if (match) {
    return `Semana ${match[1]}`;
  }
  return 'Sem semana';
}

export function getWorkoutBaseName(name) {
  if (!name) return '';
  return name
    .replace(/\s*[-—_:\(]?\s*\b(?:sem|semana|sem\.|s|w|week)\s*\d+\b\)?/gi, '')
    .trim();
}

export async function renderWorkouts() {
  const students  = await db.getAll('students');
  const workouts  = await db.getAll('workouts');
  const macros    = await db.getAll('macrocycles');
  const sessions  = await db.getAll('sessions');
  const activeStudents = students.filter(s => s.status === 'Ativo');
  workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Retrieve stored states
  const storedStudent = sessionStorage.getItem('pp_workout_student_filter') || 'all';
  const storedCycle = sessionStorage.getItem('pp_workout_cycle_filter') || '';
  const storedWeek = sessionStorage.getItem('pp_workout_week_filter') || '';
  const storedBaseName = sessionStorage.getItem('pp_workout_basename_filter') || '';
  const storedSearch = sessionStorage.getItem('pp_workout_search_filter') || '';

  // Extrair semanas e nomes base únicos
  const weeksSet = new Set();
  const baseNamesSet = new Set();
  workouts.forEach(w => {
    weeksSet.add(getWorkoutWeek(w));
    baseNamesSet.add(getWorkoutBaseName(w.name));
  });

  const weeksArr = [...weeksSet].sort((a, b) => {
    if (a === 'Sem semana') return 1;
    if (b === 'Sem semana') return -1;
    const aNum = parseInt(a.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.replace(/\D/g, '')) || 0;
    return aNum - bNum;
  });
  const baseNamesArr = [...baseNamesSet].sort();

  // Stats rápidas
  const withStudent = workouts.filter(w => w.studentId);
  const fromMacro   = workouts.filter(w => w.macrocycleId);
  const manual      = withStudent.length - fromMacro.length;

  const cycleOptions = macros.map(m => {
    const st = students.find(s => s.id === m.studentId);
    const selected = (storedCycle === m.id || (storedCycle === 'active_match' && m.status === 'active')) ? 'selected' : '';
    return `<option value="${m.id}" data-student="${m.studentId}" ${selected}>${st ? st.name.split(' ')[0] : '?'} — ${m.name}</option>`;
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
        <input type="text" id="workoutSearch" class="form-input" value="${storedSearch}" placeholder="Buscar..." style="padding-left:28px;font-size:0.82rem" />
      </div>
      <div class="tabs" id="workoutTabs" style="margin-bottom:0">
        <button class="tab ${storedStudent === 'all' ? 'active' : ''}" data-filter="all">Todos</button>
        ${activeStudents.map(s => `<button class="tab ${storedStudent === s.id ? 'active' : ''}" data-filter="${s.id}">${s.name.split(' ')[0]}</button>`).join('')}
      </div>
      <select class="form-select" id="workoutCycleFilter" style="min-width:200px">
        <option value="">Todos os ciclos</option>
        <option value="active" ${storedCycle === 'active_match' ? 'selected' : ''}>Apenas ciclo ativo</option>
        ${cycleOptions}
      </select>
      <select class="form-select" id="workoutWeekFilter" style="min-width:140px">
        <option value="">Todas as semanas</option>
        ${weeksArr.map(wk => `<option value="${wk}" ${storedWeek === wk ? 'selected' : ''}>${wk}</option>`).join('')}
      </select>
      <select class="form-select" id="workoutBaseNameFilter" style="min-width:160px">
        <option value="">Todos os treinos (Nome)</option>
        ${baseNamesArr.map(bn => `<option value="${bn}" ${storedBaseName === bn ? 'selected' : ''}>${bn}</option>`).join('')}
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
                const doneSessions = sessions.filter(s => {
                  if (s.status !== 'completed') return false;
                  if (s.studentId !== w.studentId) return false;
                  const sw = workouts.find(xw => xw.id === s.workoutId);
                  if (!sw) return false;
                  return sw.name === w.name && sw.macrocycleId === w.macrocycleId;
                });
                const isRealizado = doneSessions.length > 0;
                const isDeload = w.isDeload;
                const intensityColor = !w.intensityPct ? '' :
                  w.intensityPct >= 85 ? 'var(--danger)' :
                  w.intensityPct >= 75 ? 'var(--warning)' :
                  w.intensityPct >= 65 ? 'var(--accent)' : 'var(--success)';
                const weekStr = getWorkoutWeek(w);
                const baseNameStr = getWorkoutBaseName(w.name);
                return `<tr data-student="${w.studentId}" data-macroid="${w.macrocycleId || ''}" data-name="${(w.name||'').toLowerCase()}" data-week="${weekStr}" data-basename="${baseNameStr}">
                  <td>
                    <div class="flex items-center gap-sm">
                      <div class="avatar avatar-sm" style="width:26px;height:26px;font-size:0.7rem">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                      <span style="font-size:0.85rem">${st?.name || '?'}</span>
                    </div>
                  </td>
                  <td>
                    <div style="font-weight:600;font-size:0.88rem;display:flex;align-items:center;gap:4px">
                      ${w.name || 'Treino'}
                      ${isRealizado ? `<span class="badge badge-success" style="font-size:0.6rem;padding:2px 6px;text-transform:none">✓ Realizado (${doneSessions.length})</span>` : ''}
                    </div>
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

// ── DEFINIÇÃO DE PROGRESSÃO POR MÉTODO ───────────────────────
// Métodos que geram múltiplas sub-séries com reps/carga diferente por série
export const METHOD_PROGRESSIONS = {
  'Pirâmide Crescente': {
    desc: 'Carga aumenta a cada série, reps diminuem',
    series: [
      { reps: '12-15', loadPct: 0.60, label: 'S1 — Leve' },
      { reps: '10-12', loadPct: 0.70, label: 'S2 — Moderada' },
      { reps: '8-10',  loadPct: 0.80, label: 'S3 — Pesada' },
      { reps: '6-8',   loadPct: 0.90, label: 'S4 — Muito Pesada' },
    ]
  },
  'Pirâmide Decrescente': {
    desc: 'Inicia pesado e reduz carga a cada série',
    series: [
      { reps: '6-8',   loadPct: 0.90, label: 'S1 — Máximo' },
      { reps: '8-10',  loadPct: 0.80, label: 'S2 — Pesada' },
      { reps: '10-12', loadPct: 0.70, label: 'S3 — Moderada' },
      { reps: '12-15', loadPct: 0.60, label: 'S4 — Leve' },
    ]
  },
  'Pirâmide Dupla': {
    desc: 'Crescente depois decrescente — máximo volume',
    series: [
      { reps: '15',    loadPct: 0.55, label: 'S1 — Base' },
      { reps: '12',    loadPct: 0.65, label: 'S2 — Leve' },
      { reps: '10',    loadPct: 0.75, label: 'S3 — Moderada' },
      { reps: '8',     loadPct: 0.85, label: 'S4 — Pico ↑' },
      { reps: '10',    loadPct: 0.75, label: 'S5 — Moderada' },
      { reps: '12',    loadPct: 0.65, label: 'S6 — Leve' },
      { reps: '15',    loadPct: 0.55, label: 'S7 — Base ↓' },
    ]
  },
  'Pirâmide Completa': {
    desc: 'Pirâmide dupla com pico duplo — volume e intensidade máximos',
    series: [
      { reps: '20',    loadPct: 0.50, label: 'S1 — Aquecimento' },
      { reps: '15',    loadPct: 0.60, label: 'S2 — Base' },
      { reps: '12',    loadPct: 0.68, label: 'S3 — Leve' },
      { reps: '10',    loadPct: 0.75, label: 'S4 — Moderada' },
      { reps: '8',     loadPct: 0.82, label: 'S5 — Pesada' },
      { reps: '6',     loadPct: 0.88, label: 'S6 — Pico ↑' },
      { reps: '8',     loadPct: 0.82, label: 'S7 — Pesada' },
      { reps: '10',    loadPct: 0.75, label: 'S8 — Moderada' },
      { reps: '12',    loadPct: 0.68, label: 'S9 — Leve' },
      { reps: '15',    loadPct: 0.60, label: 'S10 — Base ↓' },
    ]
  },
  'Drop-set': {
    desc: '75% 1RM até falha → -20% sem pausa → -20% sem pausa. 2-3min descanso após cada drop-set completo.',
    series: [
      // Série 1
      { reps: 'até falha', loadPct: 0.75, label: 'S1 — Principal',   rest: 5   },
      { reps: 'até falha', loadPct: 0.60, label: 'S1 — Drop 1 -20%', rest: 5   },
      { reps: 'até falha', loadPct: 0.48, label: 'S1 — Drop 2 -20%', rest: 120 },
      // Série 2
      { reps: 'até falha', loadPct: 0.75, label: 'S2 — Principal',   rest: 5   },
      { reps: 'até falha', loadPct: 0.60, label: 'S2 — Drop 1 -20%', rest: 5   },
      { reps: 'até falha', loadPct: 0.48, label: 'S2 — Drop 2 -20%', rest: 120 },
      // Série 3
      { reps: 'até falha', loadPct: 0.75, label: 'S3 — Principal',   rest: 5   },
      { reps: 'até falha', loadPct: 0.60, label: 'S3 — Drop 1 -20%', rest: 5   },
      { reps: 'até falha', loadPct: 0.48, label: 'S3 — Drop 2 -20%', rest: 0   },
    ]
  },
  'Stripping': {
    desc: 'Drop-set com barra — remover anilhas sem parar. 4 reduções de -15 a -25% por série.',
    series: [
      { reps: 'até falha', loadPct: 0.80, label: 'Carga máx.',     rest: 5  },
      { reps: 'até falha', loadPct: 0.62, label: 'Strip 1 (-22%)', rest: 5  },
      { reps: 'até falha', loadPct: 0.48, label: 'Strip 2 (-22%)', rest: 5  },
      { reps: 'até falha', loadPct: 0.37, label: 'Strip 3 (-22%)', rest: 0  },
    ]
  },
  'Rest-Pause': {
    desc: '80-85% 1RM até a falha, pausa 20s intra-série, pausa 2-3min entre clusters. Repete 2-3 clusters.',
    series: [
      // Cluster 1
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 1 — Série',   rest: 20  },
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 1 — Pausa 20s', rest: 20  },
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 1 — Pausa 20s', rest: 150 },
      // Cluster 2
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 2 — Série',   rest: 20  },
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 2 — Pausa 20s', rest: 20  },
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 2 — Pausa 20s', rest: 150 },
      // Cluster 3 (opcional — avançados)
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 3 — Série',   rest: 20  },
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 3 — Pausa 20s', rest: 20  },
      { reps: 'até falha', loadPct: 0.82, label: 'Cluster 3 — Pausa 20s', rest: 0   },
    ]
  },
  'Cluster': {
    desc: '2-3 reps, pausa 10-15s, repetir 5x. Força máxima com 85-95% 1RM.',
    series: [
      { reps: '2-3', loadPct: 0.88, label: 'Cluster 1', rest: 12 },
      { reps: '2-3', loadPct: 0.88, label: 'Cluster 2', rest: 12 },
      { reps: '2-3', loadPct: 0.88, label: 'Cluster 3', rest: 12 },
      { reps: '2-3', loadPct: 0.88, label: 'Cluster 4', rest: 12 },
      { reps: '2-3', loadPct: 0.88, label: 'Cluster 5', rest: 12 },
    ]
  },
  'FST-7': {
    desc: '7 séries do isolador com 30-45s descanso. Alta congestão.',
    series: Array.from({length:7}, (_,i) => ({ reps:'12-15', loadPct:0.65, label:`Série ${i+1}`, rest:40 }))
  },

  // ── MÉTODOS SEM VARIAÇÃO DE CARGA POR SÉRIE ───────────────────────────────
  // Usam carga constante — loadPct 1.0 em todas as séries
  'Unilateral': {
    desc: 'Executa de um lado de cada vez. Mesmo 1RM para cada lado.',
    series: [
      { reps:'10-12', loadPct:0.70, label:'Lado D — S1', rest:60 },
      { reps:'10-12', loadPct:0.70, label:'Lado E — S1', rest:60 },
      { reps:'10-12', loadPct:0.70, label:'Lado D — S2', rest:60 },
      { reps:'10-12', loadPct:0.70, label:'Lado E — S2', rest:60 },
    ]
  },
  'Excêntrico Acentuado': {
    desc: '4-6s na descida. Carga 70-80% 1RM. Máximo dano muscular.',
    series: [
      { reps:'6-8', loadPct:0.75, label:'S1 — 4s excêntrico', rest:120 },
      { reps:'6-8', loadPct:0.75, label:'S2 — 4s excêntrico', rest:120 },
      { reps:'6-8', loadPct:0.75, label:'S3 — 4s excêntrico', rest:120 },
      { reps:'6-8', loadPct:0.75, label:'S4 — 4s excêntrico', rest:120 },
    ]
  },
  'Isometria': {
    desc: 'Sustentação estática. Carga moderada. 30-60s por posição.',
    series: [
      { reps:'45s', loadPct:0.50, label:'S1 — 45s sustentação', rest:90 },
      { reps:'45s', loadPct:0.50, label:'S2 — 45s sustentação', rest:90 },
      { reps:'45s', loadPct:0.50, label:'S3 — 45s sustentação', rest:90 },
    ]
  },
  '21s': {
    desc: '7 parcial baixo + 7 parcial cima + 7 completas. Carga ~50-55% 1RM.',
    series: [
      { reps:'21 (7+7+7)', loadPct:0.52, label:'S1 — 21s', rest:90 },
      { reps:'21 (7+7+7)', loadPct:0.52, label:'S2 — 21s', rest:90 },
      { reps:'21 (7+7+7)', loadPct:0.52, label:'S3 — 21s', rest:90 },
    ]
  },
  'Pré-exaustão': {
    desc: 'Isolamento (~65%) → composto (~75%) sem descanso. Fadiga o músculo-alvo primeiro.',
    series: [
      { reps:'12', loadPct:0.65, label:'Isolamento',  rest:0   },
      { reps:'8-10', loadPct:0.75, label:'Composto',  rest:120 },
      { reps:'12', loadPct:0.65, label:'Isolamento',  rest:0   },
      { reps:'8-10', loadPct:0.75, label:'Composto',  rest:120 },
      { reps:'12', loadPct:0.65, label:'Isolamento',  rest:0   },
      { reps:'8-10', loadPct:0.75, label:'Composto',  rest:120 },
    ]
  },
  'Super-série Agonista': {
    desc: '2 exercícios do mesmo grupo sem pausa. Informe a carga de cada exercício separadamente.',
    series: [
      { reps:'10-12', loadPct:0.70, label:'Ex A — S1', rest:0   },
      { reps:'10-12', loadPct:0.68, label:'Ex B — S1', rest:90  },
      { reps:'10-12', loadPct:0.70, label:'Ex A — S2', rest:0   },
      { reps:'10-12', loadPct:0.68, label:'Ex B — S2', rest:90  },
      { reps:'10-12', loadPct:0.70, label:'Ex A — S3', rest:0   },
      { reps:'10-12', loadPct:0.68, label:'Ex B — S3', rest:90  },
    ]
  },
  'Super-série Antagonista': {
    desc: 'Grupos opostos alternados sem pausa. Ex: Rosca + Tríceps.',
    series: [
      { reps:'10-12', loadPct:0.70, label:'Agonista S1',   rest:0   },
      { reps:'10-12', loadPct:0.70, label:'Antagonista S1',rest:60  },
      { reps:'10-12', loadPct:0.70, label:'Agonista S2',   rest:0   },
      { reps:'10-12', loadPct:0.70, label:'Antagonista S2',rest:60  },
      { reps:'10-12', loadPct:0.70, label:'Agonista S3',   rest:0   },
      { reps:'10-12', loadPct:0.70, label:'Antagonista S3',rest:60  },
    ]
  },
  'Bi-set': {
    desc: 'Dois exercícios para o mesmo músculo sem pausa.',
    series: [
      { reps:'10', loadPct:0.72, label:'Ex A — S1', rest:0   },
      { reps:'10', loadPct:0.68, label:'Ex B — S1', rest:90  },
      { reps:'10', loadPct:0.72, label:'Ex A — S2', rest:0   },
      { reps:'10', loadPct:0.68, label:'Ex B — S2', rest:90  },
      { reps:'10', loadPct:0.72, label:'Ex A — S3', rest:0   },
      { reps:'10', loadPct:0.68, label:'Ex B — S3', rest:90  },
    ]
  },
  'Tri-set': {
    desc: '3 exercícios consecutivos sem descanso. Alto estímulo metabólico.',
    series: [
      { reps:'10-12', loadPct:0.68, label:'Ex 1 — S1', rest:0   },
      { reps:'10-12', loadPct:0.65, label:'Ex 2 — S1', rest:0   },
      { reps:'10-12', loadPct:0.62, label:'Ex 3 — S1', rest:120 },
      { reps:'10-12', loadPct:0.68, label:'Ex 1 — S2', rest:0   },
      { reps:'10-12', loadPct:0.65, label:'Ex 2 — S2', rest:0   },
      { reps:'10-12', loadPct:0.62, label:'Ex 3 — S2', rest:120 },
      { reps:'10-12', loadPct:0.68, label:'Ex 1 — S3', rest:0   },
      { reps:'10-12', loadPct:0.65, label:'Ex 2 — S3', rest:0   },
      { reps:'10-12', loadPct:0.62, label:'Ex 3 — S3', rest:120 },
    ]
  },
  'Série Gigante': {
    desc: '4 exercícios consecutivos. Reduzir cargas (~60-65% 1RM). Alto volume.',
    series: [
      { reps:'10-15', loadPct:0.62, label:'Ex 1', rest:0   },
      { reps:'10-15', loadPct:0.60, label:'Ex 2', rest:0   },
      { reps:'10-15', loadPct:0.60, label:'Ex 3', rest:0   },
      { reps:'10-15', loadPct:0.58, label:'Ex 4', rest:180 },
      { reps:'10-15', loadPct:0.62, label:'Ex 1', rest:0   },
      { reps:'10-15', loadPct:0.60, label:'Ex 2', rest:0   },
      { reps:'10-15', loadPct:0.60, label:'Ex 3', rest:0   },
      { reps:'10-15', loadPct:0.58, label:'Ex 4', rest:180 },
    ]
  },
};

// ── METADADOS DE CARDIO (FC Alvo, duração, zonas) ─────────────────────────────
// Usado na seleção de carga da periodização para métodos de cardio
export const METHOD_CARDIO_META = {
  'Zona 1 (Z1)':            { fcPct:[50,65], durationMin:[20,60],  rpe:'2-3', note:'Recuperação ativa. Conversa fácil.' },
  'Zona 2 (Z2)':            { fcPct:[65,75], durationMin:[30,90],  rpe:'3-4', note:'Base aeróbica. Frase completa possível.' },
  'Zona 3 (Z3)':            { fcPct:[75,80], durationMin:[20,40],  rpe:'5-6', note:'Limiar aeróbico inferior. Difícil conversar.' },
  'Zona 4 (Z4) — Limiar':   { fcPct:[80,90], durationMin:[10,20],  rpe:'7-8', note:'OBLA. Apenas palavras soltas.' },
  'Zona 5 (Z5) — VO2max':   { fcPct:[90,100],durationMin:[3,8],    rpe:'9-10',note:'Máximo esforço. Intervalos curtos.' },
  'Tabata':                  { fcPct:[85,100],durationMin:[4,12],   rpe:'9-10',note:'20s esforço / 10s repouso × 8 rounds.' },
  'HIIT 1:2':                { fcPct:[85,95], durationMin:[12,20],  rpe:'8-9', note:'30s esforço / 60s recuperação. 8-12 rounds.' },
  'HIIT 1:1':                { fcPct:[85,95], durationMin:[12,20],  rpe:'8-9', note:'30s esforço / 30s recuperação. Mais intenso.' },
  'SIT (Sprint Interval Training)': { fcPct:[95,100],durationMin:[5,15], rpe:'10', note:'10-30s máximos. 2-4min recuperação.' },
  'Série de Repetição (VO2max)': { fcPct:[90,100],durationMin:[12,30], rpe:'9-10',note:'3-5min a 95% VO2max. Igual ao esforço.' },
  'Steady State':            { fcPct:[65,80], durationMin:[20,60],  rpe:'4-6', note:'Ritmo constante. Zona 2-3.' },
  'Progressivo':             { fcPct:[60,90], durationMin:[20,60],  rpe:'3-8', note:'+0.5km/h a cada 5min. Cobre Z2→Z4.' },
};

function exerciseRowHTML(index, ex = {}, allExercises = [], allMethods = []) {
  const loadType = ex.loadType || 'weight';
  const isTime   = loadType === 'time';
  const isBW     = loadType === 'bodyweight';

  const progression = ex.method ? METHOD_PROGRESSIONS[ex.method] : null;
  const isCombined  = COMBINED_METHODS.has(ex.method || '');
  let methodPanelHTML = '';

  if (progression && !isCombined) {
    // Métodos NÃO combinados: mostrar painel de séries com % 1RM normalmente
    const baseLoad = parseFloat(ex.load) || 0;
    const restElVal = ex.rest || '60';
    const isClusterMethod = ex.method === 'Rest-Pause' || ex.method === 'Cluster';

    const seriesHTML = progression.series.map((s, si) => {
      const savedSerie = ex.seriesProgression?.[si];
      // Para linhas extras (clusters 2 e 3 sem save), propagar a carga da série 0
      const baseLoadFallback = ex.seriesProgression?.[0]?.load || baseLoad;
      const loadVal = savedSerie?.load != null
        ? savedSerie.load
        : (baseLoadFallback > 0 && !isTime ? Math.round(baseLoadFallback * s.loadPct * 2) / 2 : '');
      const restVal = savedSerie?.rest != null ? savedSerie.rest : (s.rest != null ? s.rest : restElVal);

      // Separador entre clusters
      const prevLabel = si > 0 ? (progression.series[si-1].label || '') : '';
      const curLabel  = s.label || '';
      const isNewCluster = isClusterMethod && si > 0 && (() => {
        const pm = prevLabel.match(/Cluster\s*(\d+)/i);
        const cm = curLabel.match(/Cluster\s*(\d+)/i);
        return pm && cm && pm[1] !== cm[1];
      })();

      return `
        ${isNewCluster ? `<div style="grid-column:1/-1;height:1px;background:rgba(245,158,11,0.2);margin:3px 0"></div>` : ''}
        <div style="display:grid;grid-template-columns:100px 1fr 72px 72px 56px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(148,163,184,0.08)" data-serie="${si}">
          <div style="font-size:0.7rem;font-weight:600;color:${isClusterMethod && curLabel.toLowerCase().includes('pausa') ? 'var(--warning)' : 'var(--text-secondary)'}">${s.label}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${s.reps}</div>
          <div>
            <input type="number" step="0.5" value="${loadVal}" placeholder="${isTime?'km/h':'kg'}"
              class="form-input serie-load" data-serie="${si}" data-index="${index}"
              style="width:100%;padding:3px 6px;font-size:0.82rem;text-align:center;font-weight:600;${loadVal?`color:var(--primary)`:''}"/>
          </div>
          <div style="font-size:0.72rem;color:var(--primary);font-weight:600;text-align:center">
            ${isTime ? s.reps : `${s.reps} reps`}
          </div>
          <div>
            <input type="number" value="${restVal}"
              class="form-input serie-rest" data-serie="${si}"
              style="width:100%;padding:3px 6px;font-size:0.78rem;text-align:center;color:${restVal==0?'var(--accent)':'var(--text-muted)'}"
              placeholder="s" title="Descanso (s)"/>
          </div>
        </div>`;
    }).join('');

    methodPanelHTML = `
      <div class="method-series-panel" style="grid-column:1/-1;margin-top:6px;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:10px 12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <span style="font-size:0.75rem;font-weight:700;color:var(--primary)">${ex.method}</span>
            <span style="font-size:0.65rem;color:var(--text-muted);margin-left:6px">${progression.desc}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:0.65rem;color:var(--text-muted)">Carga base (kg):</span>
            <input type="number" step="0.5" value="${baseLoad||''}" placeholder="kg"
              class="form-input method-base-load" data-index="${index}"
              style="width:64px;padding:3px 6px;font-size:0.78rem;text-align:center" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:100px 1fr 72px 72px 56px;gap:6px;margin-bottom:4px">
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">${isClusterMethod ? 'Mini-série' : 'Série'}</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Descrição</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Carga</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Reps</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Desc.(s)</div>
        </div>
        ${seriesHTML}
      </div>
    `;
  } else if (isCombined) {
    // Métodos combinados: banner de pareamento — sem painel de séries individual
    const COMBINED_LABELS = {
      'Bi-set':                  'Execute este exercício imediatamente em sequência com o próximo da lista. Descanse apenas após completar o par.',
      'Super-série Agonista':    'Mesmo grupo muscular, sem pausa entre os dois. Descanse após o segundo exercício do par.',
      'Super-série Antagonista': 'Grupos opostos (ex: Bíceps → Tríceps) sem pausa. Descanse após o segundo.',
      'Tri-set':                 '3 exercícios consecutivos sem pausa. Descanse apenas após o terceiro.',
      'Série Gigante':           '4+ exercícios sem pausa, cargas reduzidas (~60%). Descanse após o último do grupo.',
      'Pré-exaustão':            'Isolamento executado antes do composto, sem pausa. O isolamento fatiga o músculo-alvo primeiro.',
    };
    const desc = COMBINED_LABELS[ex.method] || `Execute em sequência com o exercício adjacente. Descanse apenas após o grupo completo.`;
    methodPanelHTML = `
      <div style="grid-column:1/-1;margin-top:4px;padding:8px 10px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25);border-radius:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:0.72rem;font-weight:700;color:#f59e0b">🔗 ${ex.method}</span>
          <span style="font-size:0.65rem;color:var(--text-muted);background:rgba(245,158,11,0.12);padding:1px 6px;border-radius:8px">Descanso pós-par: ${ex.rest || 90}s</span>
        </div>
        <div style="font-size:0.68rem;color:var(--text-muted);line-height:1.4">${desc}</div>
        <div style="font-size:0.65rem;color:var(--accent);margin-top:4px">
          Certifique-se de que o exercício parceiro também está marcado com o mesmo método e logo abaixo na lista.
        </div>
      </div>`;
  } else if (ex.method) {
    const methodOpt = allMethods.find(m => m.name === ex.method);
    const desc = methodOpt?.description;
    if (desc) {
      methodPanelHTML = `
        <div class="method-tip" style="font-size:0.72rem;color:var(--accent);margin-top:4px;grid-column:1/-1;padding:6px 8px;background:rgba(6,182,212,0.07);border-radius:6px;border-left:2px solid var(--accent)">
          <strong>${ex.method}</strong> — ${desc}
        </div>`;
    }
  }

  return `
    <div class="exercise-row" style="
      display:grid;grid-template-columns:2fr 50px 60px 68px 55px 90px 135px 28px;
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
        <select class="form-select" name="ex_rest_${index}" style="font-size:0.78rem;padding:4px 6px">
          <option value="0"   ${ex.rest=='0'?'selected':''}>0 (par)</option>
          <option value="15"  ${ex.rest=='15'?'selected':''}>15</option>
          <option value="30"  ${ex.rest=='30'?'selected':''}>30</option>
          <option value="45"  ${ex.rest=='45'?'selected':''}>45</option>
          <option value="60"  ${(!ex.rest || ex.rest=='60')?'selected':''}>60</option>
          <option value="90"  ${ex.rest=='90'?'selected':''}>90</option>
          <option value="120" ${ex.rest=='120'?'selected':''}>120</option>
          <option value="150" ${ex.rest=='150'?'selected':''}>150</option>
          <option value="180" ${ex.rest=='180'?'selected':''}>180</option>
        </select>
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
          ${(() => {
            const groups = {};
            allMethods.forEach(m => {
              const cat = m.category || 'Geral';
              if (!groups[cat]) groups[cat] = [];
              groups[cat].push(m);
            });
            const ORDER = ['Hipertrofia','Força','Geral','Cardio','Resistência','Potência'];
            const sorted = [...ORDER.filter(c => groups[c]), ...Object.keys(groups).filter(c => !ORDER.includes(c))];
            return sorted.map(cat => `
              <optgroup label="${cat}">
                ${groups[cat].map(m => `<option value="${m.name}" ${ex.method===m.name?'selected':''}
                  data-sets="${m.sets||''}" data-reps="${m.repsHint||''}" data-rest="${m.restHint||''}"
                  data-desc="${m.description||''}">${m.name}</option>`).join('')}
              </optgroup>`).join('');
          })()}
        </select>
      </div>
      <button type="button" class="btn btn-ghost btn-icon remove-exercise" data-index="${index}"
        style="color:var(--danger);padding:4px;align-self:flex-end;margin-bottom:2px" title="Remover">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
      ${methodPanelHTML}
      <!-- Observações do personal para este exercício -->
      <div style="grid-column:1/-1;margin-top:4px">
        <input class="form-input ex-notes-input" name="ex_notes_${index}"
          value="${ex.trainerNotes || ex.notes || ''}"
          placeholder="📝 Orientações técnicas para o aluno (ex: manter core ativado, cotovelo para dentro...)"
          style="font-size:0.75rem;color:var(--text-muted);background:rgba(16,185,129,0.03);border-color:rgba(16,185,129,0.15)" />
      </div>
    </div>`;
}

// Métodos combinados — descanso é compartilhado pós-último exercício do par
export const COMBINED_METHODS = new Set([
  'Bi-set','Super-série Agonista','Super-série Antagonista',
  'Tri-set','Série Gigante','Pré-exaustão'
]);

function collectExercises() {
  const rows = document.querySelectorAll('.exercise-row');
  const exercises = [];
  rows.forEach(row => {
    const i    = row.dataset.index;
    const name = document.querySelector(`[name="ex_name_${i}"]`)?.value;
    if (!name) return;

    const method      = document.querySelector(`[name="ex_method_${i}"]`)?.value || '';
    const loadType    = document.querySelector(`[name="ex_loadtype_${i}"]`)?.value || 'weight';
    const trainerNotes = document.querySelector(`[name="ex_notes_${i}"]`)?.value?.trim() || '';
    const isCombined  = COMBINED_METHODS.has(method);
    const seriesPanel = row.querySelector('.method-series-panel');

    if (seriesPanel && METHOD_PROGRESSIONS[method]) {
      const serieRows  = seriesPanel.querySelectorAll('div[data-serie]');
      const progression = METHOD_PROGRESSIONS[method];
      const serieLogs  = [];
      serieRows.forEach((sr, si) => {
        const loadEl = sr.querySelector('.serie-load');
        const restEl = sr.querySelector('.serie-rest');
        const s      = progression.series[si];
        serieLogs.push({
          set:   si + 1,
          reps:  s?.reps || '—',
          load:  parseFloat(loadEl?.value) || 0,
          rest:  parseInt(restEl?.value)  || 60,
          label: s?.label || `Série ${si+1}`,
        });
      });
      exercises.push({
        name, method, loadType, trainerNotes,
        isCombined,
        sets:              serieLogs.length,
        reps:              serieLogs.map(s=>s.reps).join('→'),
        load:              serieLogs[0]?.load || '',
        rest:              serieLogs[0]?.rest || 60,
        seriesProgression: serieLogs,
      });
    } else {
      exercises.push({
        name, method, loadType, trainerNotes,
        isCombined,
        sets:     parseInt(document.querySelector(`[name="ex_sets_${i}"]`)?.value) || 3,
        reps:     document.querySelector(`[name="ex_reps_${i}"]`)?.value || '12',
        load:     document.querySelector(`[name="ex_load_${i}"]`)?.value || '',
        rest:     document.querySelector(`[name="ex_rest_${i}"]`)?.value || '60',
      });
    }
  });
  // Atribuir groupId compartilhado para exercícios consecutivos com mesmo método combinado
  let groupCounter = 0;
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    if (!COMBINED_METHODS.has(ex.method || '')) continue;
    if (ex.groupId) continue; // já atribuído
    // Agrupar todos os consecutivos com mesmo método
    const groupId = `grp_${++groupCounter}`;
    ex.groupId = groupId;
    for (let j = i + 1; j < exercises.length; j++) {
      if (exercises[j].method === ex.method) {
        exercises[j].groupId = groupId;
      } else {
        break; // para na primeira quebra de sequência
      }
    }
  }

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
      preventBackdropClose: true,
      content: workoutFormHTML(students, {}, allEx, allMethods) +
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
    sessionStorage.setItem('pp_workout_search_filter', e.target.value);
    applyFilters();
  });

  // Filtro por aluno
  let activeStudentFilter = sessionStorage.getItem('pp_workout_student_filter') || 'all';
  let activeCycleFilter   = sessionStorage.getItem('pp_workout_cycle_filter') || '';
  let activeWeekFilter    = sessionStorage.getItem('pp_workout_week_filter') || '';
  let activeBaseNameFilter = sessionStorage.getItem('pp_workout_basename_filter') || '';

  function applyFilters() {
    const q = document.getElementById('workoutSearch')?.value.toLowerCase() || '';
    document.querySelectorAll('#workoutsList tbody tr').forEach(row => {
      const matchStudent = activeStudentFilter === 'all' || row.dataset.student === activeStudentFilter;
      const matchCycle   = !activeCycleFilter || row.dataset.macro === activeCycleFilter || row.dataset.macro === 'active_match';
      const matchSearch  = !q || (row.dataset.name || '').includes(q);
      const matchWeek    = !activeWeekFilter || row.dataset.week === activeWeekFilter;
      const matchBaseName= !activeBaseNameFilter || row.dataset.basename === activeBaseNameFilter;
      row.style.display  = matchStudent && matchCycle && matchSearch && matchWeek && matchBaseName ? '' : 'none';
    });
  }

  document.querySelectorAll('#workoutTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#workoutTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeStudentFilter = tab.dataset.filter;
      sessionStorage.setItem('pp_workout_student_filter', activeStudentFilter);
      applyFilters();
    });
  });

  document.getElementById('workoutCycleFilter')?.addEventListener('change', async e => {
    try {
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
      sessionStorage.setItem('pp_workout_cycle_filter', activeCycleFilter);
      applyFilters();
    } catch (err) {
      console.error(err);
      notify?.error('Erro ao filtrar ciclos');
    }
  });

  document.getElementById('workoutWeekFilter')?.addEventListener('change', e => {
    activeWeekFilter = e.target.value;
    sessionStorage.setItem('pp_workout_week_filter', activeWeekFilter);
    applyFilters();
  });

  document.getElementById('workoutBaseNameFilter')?.addEventListener('change', e => {
    activeBaseNameFilter = e.target.value;
    sessionStorage.setItem('pp_workout_basename_filter', activeBaseNameFilter);
    applyFilters();
  });

  // Initialize data-macro on load for cycle filter
  const initCycleDataset = async () => {
    const cycleVal = document.getElementById('workoutCycleFilter')?.value || '';
    if (cycleVal === 'active') {
      const macros = await db.getAll('macrocycles');
      const ids = new Set(macros.filter(m => m.status === 'active').map(m => m.id));
      document.querySelectorAll('#workoutsList tbody tr').forEach(row => {
        row.dataset.macro = ids.has(row.dataset.macroid) ? 'active_match' : '';
      });
    } else {
      document.querySelectorAll('#workoutsList tbody tr').forEach(row => {
        row.dataset.macro = cycleVal ? (row.dataset.macroid === cycleVal ? cycleVal : '') : '';
      });
    }
    applyFilters();
  };
  initCycleDataset();

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
      const allWorkouts = await db.getAll('workouts');
      
      const cleanWorkoutName = (name) => {
        if (!name) return '';
        return name
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\bsem(ana)?\s*\d+\b/g, '')
          .replace(/\bsem\.\s*\d+\b/g, '')
          .replace(/[-—_]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const targetCleanName = cleanWorkoutName(w.name);

      const doneSessions = (await db.getAll('sessions')).filter(s => {
        if (s.status !== 'completed') return false;
        if (s.studentId !== w.studentId) return false;
        
        const sw = allWorkouts.find(xw => xw.id === s.workoutId);
        const sessionWorkoutName = sw ? sw.name : s.workoutName || '';
        if (!sessionWorkoutName) return false;

        const cleanSessName = cleanWorkoutName(sessionWorkoutName);
        return cleanSessName === targetCleanName || cleanSessName.includes(targetCleanName) || targetCleanName.includes(cleanSessName);
      });

      // Ordenar do mais recente para o mais antigo (data decrescente)
      doneSessions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

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
          
          <h4 class="mb-xs">Treino Prescrito</h4>
          <div class="table-container mb-lg">
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

          ${doneSessions.length ? `
            <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:16px">
              <h4 class="mb-sm" style="color:var(--success)">📊 Histórico de Realizações</h4>
              <div style="display:flex;flex-direction:column;gap:14px">
                ${doneSessions.map((se, si) => {
                  const setLog = se.setLog || [];
                  const sessionWorkout = allWorkouts.find(xw => xw.id === se.workoutId);
                  const displaySessionName = sessionWorkout ? sessionWorkout.name : se.workoutName || w.name;
                  const durMin = se.totalDuration ? Math.round(se.totalDuration / 60) : null;
                  const density = (se.totalVolume && durMin) ? Math.round(se.totalVolume / durMin) : null;
                  const pse = se.postBiofeedback?.pse;
                  const postNotes = se.postBiofeedback?.notes || se.trainerNotes || '';

                  return `
                  <div style="background:var(--bg-page);border:1px solid var(--border-color);border-radius:10px;overflow:hidden">

                    <!-- Header da sessão -->
                    <div style="padding:10px 14px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                      <div style="display:flex;align-items:center;gap:8px">
                        <span class="badge badge-success" style="font-size:0.65rem">Realizado</span>
                        <strong style="font-size:0.82rem">${displaySessionName}</strong>
                      </div>
                      <span style="font-size:0.75rem;color:var(--text-muted)">${Calc.formatDate(se.date || se.createdAt)} · Volume: <strong style="color:var(--primary)">${se.totalVolume || 0}kg</strong></span>
                    </div>

                    <!-- Check-in Pós -->
                    ${(pse || density || postNotes) ? `
                    <div style="padding:8px 14px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border-color);display:flex;flex-wrap:wrap;gap:12px;align-items:center">
                      <span style="font-size:0.7rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Check-in Pós</span>
                      ${pse ? `<span style="font-size:0.8rem">PSE <strong style="color:var(--warning)">${pse}/10</strong></span>` : ''}
                      ${density ? `<span style="font-size:0.8rem">Densid. <strong style="color:var(--accent)">${density} kg/m</strong></span>` : ''}
                      ${durMin ? `<span style="font-size:0.8rem">Dur. <strong>${durMin} min</strong></span>` : ''}
                      ${postNotes ? `<span style="font-size:0.75rem;color:var(--text-muted);font-style:italic;flex-basis:100%">"${postNotes}"</span>` : ''}
                    </div>` : ''}

                    <!-- Tabela de exercícios -->
                    <div style="padding:10px 14px">
                      <!-- Legenda -->
                      <div style="display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap">
                        <span style="font-size:0.62rem;color:var(--warning)">■ PSE — esforço percebido</span>
                        <span style="font-size:0.62rem;color:var(--accent)">■ RIR — reps no tanque</span>
                        <span style="font-size:0.62rem;color:var(--text-muted)">■ 1RM — estimativa Epley</span>
                      </div>

                      <table style="width:100%;border-collapse:collapse;font-size:0.75rem">
                        <thead>
                          <tr style="border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.06em">
                            <th style="padding:5px 6px;text-align:left;font-weight:600">Exercício</th>
                            <th style="padding:5px 6px;text-align:center;font-weight:600">Séries</th>
                            <th style="padding:5px 6px;text-align:center;font-weight:600">Reps</th>
                            <th style="padding:5px 6px;text-align:center;font-weight:600">Carga Máx</th>
                            <th style="padding:5px 6px;text-align:center;font-weight:600">Volume</th>
                            <th style="padding:5px 6px;text-align:center;font-weight:600;color:var(--warning)">PSE</th>
                            <th style="padding:5px 6px;text-align:center;font-weight:600;color:var(--accent)">RIR</th>
                            <th style="padding:5px 6px;text-align:center;font-weight:600;color:var(--text-muted)">1RM</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${(w.exercises||[]).map(ex => {
                            const exSets = setLog.filter(s => s.exName === ex.name || (w.exercises[s.exIdx]?.name === ex.name));
                            const realSets = exSets.length;
                            const maxLoad = realSets ? Math.max(...exSets.map(s => s.load || 0)) : null;
                            const totalVol = realSets ? exSets.reduce((sum, s) => sum + ((s.load || 0) * (s.reps || 0)), 0) : 0;
                            const totalReps = realSets ? exSets.reduce((sum, s) => sum + (s.reps || 0), 0) : 0;
                            const avgPse = realSets ? (exSets.reduce((sum, s) => sum + (s.pse || 0), 0) / exSets.filter(s => s.pse).length || 0) : 0;
                            const avgRir = realSets ? (exSets.reduce((sum, s) => sum + (s.rir ?? 0), 0) / exSets.filter(s => s.rir != null).length || 0) : 0;
                            // 1RM Epley: w × (1 + reps/30) — usar série com maior carga
                            const bestSet = exSets.reduce((best, s) => (!best || (s.load||0) > (best.load||0)) ? s : best, null);
                            const oneRM = (bestSet && bestSet.load > 0 && bestSet.reps > 0) ? Math.round(bestSet.load * (1 + bestSet.reps / 30)) : null;

                            const methodLabel = ex.method ? `<div style="font-size:0.62rem;color:var(--primary);margin-top:1px">${ex.method}</div>` : '';
                            const setsExpanded = realSets ? `
                              <div style="margin-top:5px;display:flex;flex-direction:column;gap:2px">
                                ${exSets.map((s, idx) => {
                                  const pseColor = !s.pse ? 'var(--text-muted)' : s.pse >= 8 ? 'var(--danger)' : s.pse >= 6 ? 'var(--warning)' : 'var(--success)';
                                  const rirColor = s.rir == null ? 'var(--text-muted)' : s.rir <= 1 ? 'var(--danger)' : s.rir <= 3 ? 'var(--warning)' : 'var(--success)';
                                  return `<span style="font-size:0.67rem;color:var(--text-muted)">
                                    · <strong style="color:var(--text-primary)">S${s.setIdx != null ? s.setIdx + 1 : idx + 1}:</strong>
                                    <strong>${s.reps || 0}×${s.load || 0}kg</strong>
                                    ${s.pse ? `<span style="color:${pseColor};font-weight:600"> PSE ${s.pse}</span>` : ''}
                                    ${s.rir != null ? `<span style="color:${rirColor};font-weight:600"> RIR ${s.rir}</span>` : ''}
                                  </span>`;
                                }).join('')}
                              </div>` : '';

                            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
                              <td style="padding:7px 6px;vertical-align:top">
                                <strong style="font-size:0.78rem">${ex.name}</strong>
                                ${methodLabel}
                                ${setsExpanded}
                              </td>
                              <td style="padding:7px 6px;text-align:center;vertical-align:top">${realSets || '—'}</td>
                              <td style="padding:7px 6px;text-align:center;vertical-align:top">${totalReps || '—'}</td>
                              <td style="padding:7px 6px;text-align:center;vertical-align:top;font-weight:700;color:var(--primary)">${maxLoad ? maxLoad + 'kg' : '—'}</td>
                              <td style="padding:7px 6px;text-align:center;vertical-align:top;color:var(--success);font-weight:600">${totalVol ? totalVol + 'kg' : '—'}</td>
                              <td style="padding:7px 6px;text-align:center;vertical-align:top;color:var(--warning);font-weight:700">${avgPse ? avgPse.toFixed(1) : '—'}</td>
                              <td style="padding:7px 6px;text-align:center;vertical-align:top;color:var(--accent);font-weight:700">${(avgRir || avgRir === 0) && exSets.some(s => s.rir != null) ? avgRir.toFixed(1) : '—'}</td>
                              <td style="padding:7px 6px;text-align:center;vertical-align:top;color:var(--text-muted);font-weight:600">${oneRM ? oneRM + 'kg' : '—'}</td>
                            </tr>`;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>` : `<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px"><p class="text-xs text-muted">Nenhuma sessão executada deste treino ainda. Inicie o Treino ao Vivo para registrar as cargas reais praticadas.</p></div>`}
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

      // Find last completed session for this workout using normalized name comparisons
      const cleanWorkoutName = (name) => {
        if (!name) return '';
        return name
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\bsem(ana)?\s*\d+\b/g, '')
          .replace(/\bsem\.\s*\d+\b/g, '')
          .replace(/[-—_]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const targetCleanName = cleanWorkoutName(w.name);
      const allSessions = await db.getAll('sessions');
      const allWorkouts = await db.getAll('workouts');
      const lastSession = allSessions
        .filter(s => {
          if (s.status !== 'completed' || s.studentId !== w.studentId) return false;
          // Tenta obter o nome do treino via workoutId primeiro, depois workoutName
          const linkedWorkout = allWorkouts.find(xw => xw.id === s.workoutId);
          const sessionWorkoutName = linkedWorkout ? linkedWorkout.name : (s.workoutName || '');
          if (!sessionWorkoutName) return false;
          const cleanSessName = cleanWorkoutName(sessionWorkoutName);
          return cleanSessName === targetCleanName || cleanSessName.includes(targetCleanName) || targetCleanName.includes(cleanSessName);
        })
        .sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))[0];

      let lastSessionBanner = '';
      if (lastSession) {
        const durMin = Math.round((lastSession.totalDuration || 0) / 60);
        const lsPse = lastSession.postBiofeedback?.pse;
        const pseColor = lsPse ? (lsPse >= 9 ? 'var(--danger)' : lsPse >= 7 ? 'var(--warning)' : 'var(--success)') : 'var(--text-muted)';
        const exDetails = (lastSession.exercises || []).map((e, i) => {
          const sets = (lastSession.setLog || []).filter(l => l.exIdx === i);
          if (!sets.length) return `
            <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:10px 12px;opacity:0.5">
              <div style="font-weight:600;font-size:0.82rem;color:var(--text-secondary)">${e.name}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">Não realizado</div>
            </div>`;
          const maxLoad = Math.max(...sets.map(s => s.load || 0));
          const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0);
          const totalVol = sets.reduce((t, s) => t + ((s.reps || 0) * (s.load || 0)), 0);
          const avgPse = sets.filter(s => s.pse).length
            ? (sets.reduce((t, s) => t + (s.pse || 0), 0) / sets.filter(s => s.pse).length).toFixed(1)
            : null;
          const setsHTML = sets.map(s => {
            const pColor = s.pse ? (s.pse >= 9 ? 'var(--danger)' : s.pse >= 7 ? 'var(--warning)' : 'var(--success)') : '';
            return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(148,163,184,0.08);font-size:0.72rem">
              <span style="min-width:24px;color:var(--text-muted);font-weight:600">S${s.setIdx != null ? s.setIdx + 1 : '?'}</span>
              <span style="font-weight:700;color:var(--text-primary)">${s.reps || 0} × ${s.load || 0}kg</span>
              ${s.pse ? `<span style="color:${pColor};font-size:0.68rem;font-weight:600">PSE ${s.pse}</span>` : ''}
              ${s.rir != null ? `<span style="color:var(--accent);font-size:0.68rem">RIR ${s.rir}</span>` : ''}
              ${s.rm1Estimated ? `<span style="color:var(--success);font-size:0.65rem">~${s.rm1Estimated}kg</span>` : ''}
              ${s.notes ? `<span style="color:var(--text-muted);font-style:italic;font-size:0.65rem">"${s.notes}"</span>` : ''}
            </div>`;
          }).join('');
          return `
            <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:10px 12px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div style="font-weight:600;font-size:0.82rem;color:var(--text-primary)">${e.name}</div>
                <div style="display:flex;gap:8px;font-size:0.7rem;color:var(--text-muted)">
                  <span>${sets.length} sér.</span>
                  <span>${totalReps} reps</span>
                  <span style="color:var(--primary);font-weight:600">Máx: ${maxLoad}kg</span>
                  <span style="color:var(--accent)">${totalVol}kg vol.</span>
                  ${avgPse ? `<span style="color:var(--warning)">PSE ${avgPse}</span>` : ''}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:0">${setsHTML}</div>
            </div>`;
        }).join('');

        lastSessionBanner = `
          <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;margin-bottom:16px;overflow:hidden">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:pointer;user-select:none" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none';this.querySelector('.ls-chevron').style.transform=d.style.display==='none'?'':'rotate(180deg)'">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:0.85rem;font-weight:700;color:var(--success)">📊 Último treino: ${new Date(lastSession.date).toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' })}</span>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <span style="font-size:0.72rem;background:var(--bg-card);padding:2px 8px;border-radius:10px;border:1px solid var(--border-color)">⏱ ${durMin}min</span>
                  <span style="font-size:0.72rem;background:var(--bg-card);padding:2px 8px;border-radius:10px;border:1px solid var(--border-color)">🏋️ ${lastSession.totalVolume || 0}kg</span>
                  <span style="font-size:0.72rem;background:var(--bg-card);padding:2px 8px;border-radius:10px;border:1px solid var(--border-color)">📊 ${lastSession.totalSets || 0} séries</span>
                  ${lsPse ? `<span style="font-size:0.72rem;background:var(--bg-card);padding:2px 8px;border-radius:10px;border:1px solid var(--border-color);color:${pseColor}">PSE ${lsPse}/10</span>` : ''}
                </div>
              </div>
              <svg class="ls-chevron" style="transition:transform 0.2s;color:var(--text-muted)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div style="padding:0 14px 14px;border-top:1px solid rgba(16,185,129,0.15)">
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">${exDetails}</div>
            </div>
          </div>
        `;
      }

      openModal({
        title: 'Editar Treino', size: 'xl',
        content: lastSessionBanner + workoutFormHTML(students, w, allEx, allMethods) + `<datalist id="exerciseList">${allEx.map(e=>`<option value="${e.name}">`).join('')}</datalist>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', onClick: async (e) => {
            const saveBtn = e?.target;
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Salvando...'; }
            try {
              const fd   = new FormData(document.getElementById('workoutForm'));
              const data = { ...w,
                studentId: fd.get('studentId'),
                name:      fd.get('name'),
                date:      fd.get('date'),
                cycle:     fd.get('cycle'),
                notes:     fd.get('notes'),
                exercises: collectExercises(),
              };
              if (!data.studentId || !data.name) {
                notify.error('Aluno e nome são obrigatórios');
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
                return;
              }
              await db.put('workouts', data);
              notify.success('Treino atualizado!');
              closeModal();
              navigateFn('/treinos');
            } catch(err) {
              console.error('Workout save error:', err);
              notify.error('Erro ao salvar: ' + (err?.message || 'tente novamente'));
              if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
            }
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
    btn.onclick = () => {
      const row = btn.closest('.exercise-row');
      // Remover também o conector logo após a linha
      const next = row?.nextElementSibling;
      if (next?.classList.contains('combined-connector')) next.remove();
      row?.remove();
      refreshCombinedVisuals();
    };
  });
}

function bindExerciseRowHandlers(allExercises, allMethods) {
  bindRemoveExercise();
  // Atualizar visual de combinados ao carregar
  refreshCombinedVisuals();

  // ── Auto-preenchimento ao selecionar MÉTODO ─────────────────
  document.querySelectorAll('.ex-method').forEach(sel => {
    sel.addEventListener('change', () => {
      const opt      = sel.selectedOptions[0];
      const i        = sel.dataset.index;
      const row      = sel.closest('.exercise-row');
      const methodName = opt?.value || '';

      // Remover painel de sub-séries anterior
      row?.querySelectorAll('.method-series-panel').forEach(p => p.remove());
      row?.querySelectorAll('.method-tip').forEach(p => p.remove());

      if (!methodName) {
        // Limpar indicação de método
        const setsEl = document.querySelector(`[name="ex_sets_${i}"]`);
        const repsEl = document.querySelector(`[name="ex_reps_${i}"]`);
        const loadEl = document.querySelector(`[name="ex_load_${i}"]`);
        if (setsEl) setsEl.closest('div').style.opacity = '';
        if (repsEl) repsEl.closest('div').style.opacity = '';
        if (loadEl) loadEl.closest('div').style.opacity = '';
        return;
      }

      // Preencher séries/reps/descanso padrão
      const setsEl = document.querySelector(`[name="ex_sets_${i}"]`);
      const repsEl = document.querySelector(`[name="ex_reps_${i}"]`);
      const restEl = document.querySelector(`[name="ex_rest_${i}"]`);
      const sets   = opt?.dataset.sets;
      const reps   = opt?.dataset.reps;
      const rest   = opt?.dataset.rest;

      if (sets && setsEl) setsEl.value = sets.replace(/[^0-9]/g, '') || '3';
      if (reps && repsEl) repsEl.value = reps;
      if (rest && restEl) {
        const match = rest.match(/(\d+)/);
        if (match) restEl.value = match[1];
      }

      // ── Verificar se o método tem progressão definida ────────
      const isCombinedMethod = COMBINED_METHODS.has(methodName);
      const progression = !isCombinedMethod ? METHOD_PROGRESSIONS[methodName] : null;

      // ── MÉTODO COMBINADO: banner + auto-adicionar exercício par ──
      if (isCombinedMethod) {
        // Remover qualquer painel antigo
        row?.querySelectorAll('.method-series-panel,.method-tip,.combined-banner').forEach(p => p.remove());

        // Forçar descanso = 0 neste exercício
        if (restEl) restEl.value = '0';

        // Banner visual
        const COMBINED_DESC = {
          'Bi-set': 'Execute com o próximo exercício sem descanso. Descanse apenas após completar o par.',
          'Super-série Agonista': 'Mesmo grupo muscular em sequência sem pausa. Descanse após o par.',
          'Super-série Antagonista': 'Grupos opostos (ex: Bíceps → Tríceps) sem pausa. Descanse após o par.',
          'Tri-set': '3 exercícios consecutivos sem pausa. Descanse após o terceiro.',
          'Série Gigante': '4+ exercícios consecutivos sem pausa. Cargas reduzidas ~60%. Descanse após o último.',
          'Pré-exaustão': 'Isolamento → Composto sem pausa. Fatiga o músculo-alvo primeiro.',
        };
        const banner = document.createElement('div');
        banner.className = 'combined-banner';
        banner.style.cssText = 'grid-column:1/-1;margin-top:4px;padding:8px 12px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.3);border-radius:8px';
        banner.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div>
              <span style="font-size:0.72rem;font-weight:700;color:#f59e0b">🔗 ${methodName}</span>
              <span style="font-size:0.68rem;color:var(--text-muted);margin-left:8px">${COMBINED_DESC[methodName] || ''}</span>
            </div>
            <button type="button" class="btn-add-pair btn btn-ghost btn-sm" style="color:#f59e0b;border-color:rgba(245,158,11,0.35);font-size:0.7rem;white-space:nowrap;flex-shrink:0">
              + Adicionar par
            </button>
          </div>`;
        row?.appendChild(banner);

        // Ao clicar "+ Adicionar par" — inserir novo exercício com mesmo método logo abaixo
        banner.querySelector('.btn-add-pair')?.addEventListener('click', () => {
          const container = document.getElementById('exerciseRows');
          if (!container) return;

          // Determinar quantas linhas de par já existem abaixo com o mesmo método
          const rows = Array.from(container.querySelectorAll('.exercise-row'));
          const curIdx = rows.indexOf(row);

          // Novo índice
          const exIndex = rows.length;
          const newHTML = exerciseRowHTML(exIndex, { method: methodName, rest: '0' }, allExercises, allMethods);

          // Inserir após o último exercício do mesmo grupo consecutivo
          let insertAfter = row;
          for (let j = curIdx + 1; j < rows.length; j++) {
            const m = rows[j].querySelector('.ex-method')?.value;
            if (m === methodName) insertAfter = rows[j];
            else break;
          }
          insertAfter.insertAdjacentHTML('afterend', newHTML);
          bindExerciseRowHandlers(allExercises, allMethods);
          refreshCombinedVisuals();
        });

        refreshCombinedVisuals();
        return;
      }

      if (!progression) {
        // Método simples — apenas dica de descrição
        const desc = opt?.dataset.desc;
        if (desc) {
          const tip = document.createElement('div');
          tip.className = 'method-tip';
          tip.style.cssText = 'font-size:0.72rem;color:var(--accent);margin-top:4px;grid-column:1/-1;padding:6px 8px;background:rgba(6,182,212,0.07);border-radius:6px;border-left:2px solid var(--accent)';
          tip.innerHTML = `<strong>${methodName}</strong> — ${desc}`;
          row?.appendChild(tip);
        }
        return;
      }
      const baseLoad = parseFloat(document.querySelector(`[name="ex_load_${i}"]`)?.value) || 0;
      const loadType = document.querySelector(`[name="ex_loadtype_${i}"]`)?.value || 'weight';
      const isTime   = loadType === 'time';

      // Atualizar contador de séries
      if (setsEl) setsEl.value = progression.series.length;

      // Criar painel
      const panel = document.createElement('div');
      panel.className = 'method-series-panel';
      panel.style.cssText = 'grid-column:1/-1;margin-top:6px;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:10px 12px';

      const seriesHeader = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <span style="font-size:0.75rem;font-weight:700;color:var(--primary)">${methodName}</span>
            <span style="font-size:0.65rem;color:var(--text-muted);margin-left:6px">${progression.desc}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:0.65rem;color:var(--text-muted)">Carga base (kg):</span>
            <input type="number" step="0.5" value="${baseLoad||''}" placeholder="kg"
              class="form-input method-base-load" data-index="${i}"
              style="width:64px;padding:3px 6px;font-size:0.78rem;text-align:center" />
          </div>
        </div>`;

      const isClusterMethod = methodName === 'Rest-Pause' || methodName === 'Cluster';

      const seriesHTML = progression.series.map((s, si) => {
        const calcLoad = baseLoad > 0 && !isTime
          ? Math.round(baseLoad * s.loadPct * 2) / 2
          : '';
        const restVal  = s.rest != null ? s.rest : (restEl?.value || '60');
        const restDisplay = restVal == 0 ? '—' : restVal >= 60 ? `${Math.round(restVal/60)}min${restVal%60?restVal%60+'s':''}` : `${restVal}s`;

        // Separador visual entre clusters
        const prevLabel = si > 0 ? (progression.series[si-1].label || '') : '';
        const curLabel  = s.label || '';
        const isNewCluster = isClusterMethod && si > 0 && (() => {
          const pm = prevLabel.match(/Cluster\s*(\d+)/i);
          const cm = curLabel.match(/Cluster\s*(\d+)/i);
          return pm && cm && pm[1] !== cm[1];
        })();

        return `
          ${isNewCluster ? `<div style="grid-column:1/-1;height:1px;background:rgba(245,158,11,0.2);margin:3px 0" title="Próximo cluster — 2-3min descanso"></div>` : ''}
          <div style="display:grid;grid-template-columns:100px 1fr 72px 72px 56px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(148,163,184,0.08)" data-serie="${si}">
            <div style="font-size:0.7rem;font-weight:600;color:${isClusterMethod && curLabel.toLowerCase().includes('pausa') ? 'var(--warning)' : 'var(--text-secondary)'}">${s.label}</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">${s.reps}</div>
            <div>
              <input type="number" step="0.5" value="${calcLoad}" placeholder="${isTime?'km/h':'kg'}"
                class="form-input serie-load" data-serie="${si}" data-index="${i}"
                style="width:100%;padding:3px 6px;font-size:0.82rem;text-align:center;font-weight:600;${calcLoad?`color:var(--primary)`:''}"/>
            </div>
            <div style="font-size:0.72rem;color:var(--primary);font-weight:600;text-align:center">
              ${isTime ? s.reps : `${s.reps} reps`}
            </div>
            <div title="${isClusterMethod && curLabel.toLowerCase().includes('pausa') ? 'Pausa intra-série (20s). Entre clusters: 2-3min.' : ''}">
              <input type="number" value="${restVal}"
                class="form-input serie-rest" data-serie="${si}"
                style="width:100%;padding:3px 6px;font-size:0.78rem;text-align:center;color:${restVal==0?'var(--accent)':'var(--text-muted)'}"
                placeholder="s" title="Descanso (s)"/>
            </div>
          </div>`;
      }).join('');

      const seriesLegend = `
        <div style="display:grid;grid-template-columns:100px 1fr 72px 72px 56px;gap:6px;margin-bottom:4px">
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">${isClusterMethod ? 'Mini-série' : 'Série'}</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Descrição</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Carga</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Reps</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Desc.(s)</div>
        </div>`;

      panel.innerHTML = seriesHeader + seriesLegend + seriesHTML;
      row?.appendChild(panel);

      // ── Recalcular cargas quando carga base muda ─────────────
      panel.querySelector('.method-base-load')?.addEventListener('input', e => {
        const newBase = parseFloat(e.target.value) || 0;
        // Atualizar campo principal de carga
        const mainLoad = document.querySelector(`[name="ex_load_${i}"]`);
        if (mainLoad && newBase) mainLoad.value = newBase;
        panel.querySelectorAll('.serie-load').forEach((inp, si) => {
          const s = progression.series[si];
          if (s && newBase > 0 && !isTime) {
            const calc = Math.round(newBase * s.loadPct * 2) / 2;
            inp.value = calc;
            inp.style.color = 'var(--primary)';
          }
        });
      });

      // Sincronizar carga base se já preenchida
      const mainLoadEl = document.querySelector(`[name="ex_load_${i}"]`);
      if (mainLoadEl) {
        mainLoadEl.addEventListener('input', e => {
          const newBase = parseFloat(e.target.value) || 0;
          const baseInp = panel.querySelector('.method-base-load');
          if (baseInp) baseInp.value = newBase || '';
          panel.querySelectorAll('.serie-load').forEach((inp, si) => {
            const s = progression.series[si];
            if (s && newBase > 0 && !isTime) {
              inp.value = Math.round(newBase * s.loadPct * 2) / 2;
              inp.style.color = 'var(--primary)';
            }
          });
        });
      }
    });
  });

  // ── Auto-preencher tipo de carga ao selecionar exercício ────
  document.querySelectorAll('.ex-name-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const ex = allExercises.find(e => e.name.toLowerCase() === inp.value.toLowerCase());
      if (!ex) return;
      const i     = inp.dataset.index;
      const ltSel = document.querySelector(`[name="ex_loadtype_${i}"]`);
      const repsEl= document.querySelector(`[name="ex_reps_${i}"]`);
      const lbl   = document.getElementById(`loadLbl_${i}`);
      if (ex.loadType && ltSel) ltSel.value = ex.loadType;
      if (ex.defaultReps && repsEl && (!repsEl.value || repsEl.value === '12')) repsEl.value = ex.defaultReps;
      if (lbl) lbl.textContent = ex.loadType === 'time' ? 'Intensidade' : ex.loadType === 'bodyweight' ? 'Extra (kg)' : 'Carga (kg)';
    });
  });

  // ── Atualizar label ao mudar tipo de carga ──────────────────
  document.querySelectorAll('.ex-loadtype').forEach(sel => {
    sel.addEventListener('change', () => {
      const i   = sel.dataset.index;
      const lbl = document.getElementById(`loadLbl_${i}`);
      const lt  = sel.value;
      if (lbl) lbl.textContent = lt === 'time' ? 'Intensidade' : lt === 'bodyweight' ? 'Extra (kg)' : 'Carga (kg)';
      const loadEl = document.querySelector(`[name="ex_load_${i}"]`);
      if (loadEl) loadEl.placeholder = lt === 'time' ? 'km/h/W' : lt === 'bodyweight' ? '+kg' : 'kg';
    });
  });

  // ── Sincronizar painéis de métodos pré-existentes (na edição) ──
  document.querySelectorAll('.method-series-panel').forEach(panel => {
    const row = panel.closest('.exercise-row');
    const i = row.dataset.index;
    const methodName = row.querySelector('.ex-method')?.value;
    const progression = METHOD_PROGRESSIONS[methodName];
    if (!progression) return;

    const isTime = row.querySelector('.ex-loadtype')?.value === 'time';

    panel.querySelector('.method-base-load')?.addEventListener('input', e => {
      const newBase = parseFloat(e.target.value) || 0;
      const mainLoad = document.querySelector(`[name="ex_load_${i}"]`);
      if (mainLoad && newBase) mainLoad.value = newBase;
      panel.querySelectorAll('.serie-load').forEach((inp, si) => {
        const s = progression.series[si];
        if (s && newBase > 0 && !isTime) {
          const calc = Math.round(newBase * s.loadPct * 2) / 2;
          inp.value = calc;
          inp.style.color = 'var(--primary)';
        }
      });
    });

    const mainLoadEl = document.querySelector(`[name="ex_load_${i}"]`);
    if (mainLoadEl) {
      mainLoadEl.addEventListener('input', e => {
        const newBase = parseFloat(e.target.value) || 0;
        const baseInp = panel.querySelector('.method-base-load');
        if (baseInp) baseInp.value = newBase || '';
        panel.querySelectorAll('.serie-load').forEach((inp, si) => {
          const s = progression.series[si];
          if (s && newBase > 0 && !isTime) {
            inp.value = Math.round(newBase * s.loadPct * 2) / 2;
            inp.style.color = 'var(--primary)';
          }
        });
      });
    }
  });
}

// ── Atualizar visual de pares combinados na lista de exercícios ──
function refreshCombinedVisuals() {
  const container = document.getElementById('exerciseRows');
  if (!container) return;

  // Remover conectores antigos
  container.querySelectorAll('.combined-connector').forEach(el => el.remove());

  const rows = Array.from(container.querySelectorAll('.exercise-row'));

  rows.forEach((row, idx) => {
    const method = row.querySelector('.ex-method')?.value;
    if (!COMBINED_METHODS.has(method)) {
      row.style.borderLeft = '';
      row.style.background = '';
      row.style.marginBottom = '';
      return;
    }

    const prevMethod = rows[idx - 1]?.querySelector('.ex-method')?.value;
    const nextMethod = rows[idx + 1]?.querySelector('.ex-method')?.value;
    const isLast = nextMethod !== method;

    // Borda laranja esquerda em todo o grupo
    row.style.borderLeft = '3px solid rgba(245,158,11,0.55)';
    row.style.background = 'rgba(245,158,11,0.025)';
    row.style.marginBottom = isLast ? '10px' : '0';
    row.style.borderRadius = prevMethod !== method
      ? '8px 8px 0 0' : isLast ? '0 0 8px 8px' : '0';

    // Conector "→ sem descanso" entre exercícios do grupo
    if (!isLast) {
      const connector = document.createElement('div');
      connector.className = 'combined-connector';
      connector.style.cssText = [
        'display:flex', 'align-items:center', 'gap:6px',
        'padding:3px 14px',
        'background:rgba(245,158,11,0.08)',
        'border-left:3px solid rgba(245,158,11,0.55)',
        'font-size:0.68rem', 'font-weight:700', 'color:#f59e0b',
        'margin:0', 'line-height:1.8'
      ].join(';');
      connector.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="3">
          <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
        </svg>
        sem descanso → continuar`;
      row.insertAdjacentElement('afterend', connector);
    }
  });
}
