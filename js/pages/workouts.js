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
    desc: 'Executa até a falha, reduz carga ~20% e continua sem descanso',
    series: [
      { reps: '8-10',  loadPct: 1.00, label: 'Set Principal', rest: 0 },
      { reps: '8-10',  loadPct: 0.80, label: 'Drop 1 (-20%)', rest: 0 },
      { reps: '8-10',  loadPct: 0.64, label: 'Drop 2 (-20%)', rest: 0 },
    ]
  },
  'Stripping': {
    desc: 'Drop-set com barra — remover anilhas sem parar',
    series: [
      { reps: 'até falha', loadPct: 1.00, label: 'Carga máxima',  rest: 0 },
      { reps: 'até falha', loadPct: 0.75, label: '-25% carga',    rest: 0 },
      { reps: 'até falha', loadPct: 0.55, label: '-25% carga',    rest: 0 },
      { reps: 'até falha', loadPct: 0.40, label: '-25% carga',    rest: 0 },
    ]
  },
  'Rest-Pause': {
    desc: 'Até a falha, pausa 15-20s, continua até nova falha',
    series: [
      { reps: 'até falha', loadPct: 1.00, label: 'Série principal', rest: 0  },
      { reps: 'até falha', loadPct: 1.00, label: 'Pausa 15-20s →', rest: 15 },
      { reps: 'até falha', loadPct: 1.00, label: 'Pausa 15-20s →', rest: 15 },
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
};

export const METHOD_COLORS = {
  'Cardio / Endurance': { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', text: '#10b981' },
  'Hipertrofia': { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)', text: '#8b5cf6' },
  'Força / Potência': { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
  'Resistência / RML': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
  'Mobilidade / Flexibilidade': { bg: 'rgba(2,132,199,0.08)', border: 'rgba(2,132,199,0.3)', text: '#0284c7' },
  'Core / Estabilização': { bg: 'rgba(219,39,119,0.08)', border: 'rgba(219,39,119,0.3)', text: '#db2777' },
  'Regenerativo / Recovery': { bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.3)', text: '#0d9488' },
  'Aquecimento / Preparação': { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', text: '#f97316' },
  'Calistenia / Ginástica': { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)', text: '#6366f1' },
  'LPO / Levantamento Olímpico': { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.3)', text: '#eab308' },
  'Coordenação / Agilidade': { bg: 'rgba(132,204,22,0.08)', border: 'rgba(132,204,22,0.3)', text: '#84cc16' },
  'Reabilitação / Preventivo': { bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.3)', text: '#f43f5e' },
  'Geral': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.3)', text: '#64748b' }
};

function exerciseRowHTML(index, ex = {}, allExercises = [], allMethods = []) {
  const loadType = ex.loadType || 'weight';
  const isBW     = ex.loadType === 'bodyweight';

  const selectedMethodOpt = allMethods.find(m => m.name === ex.method);
  const methodCategory = selectedMethodOpt?.category || 'Geral';
  const colors = METHOD_COLORS[methodCategory] || METHOD_COLORS['Geral'];
  const isCardioMethod = methodCategory === 'Cardio / Endurance';
  const isTime   = loadType === 'time' || isCardioMethod;

  const progression = ex.method ? METHOD_PROGRESSIONS[ex.method] : null;
  let methodPanelHTML = '';
  if (progression) {
    const baseLoad = parseFloat(ex.load) || 0;
    const restElVal = ex.rest || '60';

    const seriesHTML = progression.series.map((s, si) => {
      const savedSerie = ex.seriesProgression && ex.seriesProgression[si];
      const loadVal = savedSerie ? savedSerie.load : (baseLoad > 0 && !isTime ? Math.round(baseLoad * s.loadPct * 2) / 2 : '');
      const restVal = savedSerie ? savedSerie.rest : (s.rest != null ? s.rest : restElVal);
      return `
        <div style="display:grid;grid-template-columns:80px 1fr 72px 72px 56px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(148,163,184,0.1)" data-serie="${si}">
          <div style="font-size:0.7rem;font-weight:600;color:var(--text-secondary)">${s.label}</div>
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
              style="width:100%;padding:3px 6px;font-size:0.78rem;text-align:center;color:var(--text-muted)"
              placeholder="s" title="Descanso (s)"/>
          </div>
        </div>`;
    }).join('');

    methodPanelHTML = `
      <div class="method-series-panel" style="grid-column:1/-1;margin-top:6px;background:${colors.bg};border:1px solid ${colors.border};border-radius:8px;padding:10px 12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <span style="font-size:0.6rem;text-transform:uppercase;font-weight:800;color:${colors.text};background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;margin-right:6px;border:1px solid ${colors.border}">${methodCategory}</span>
            <span style="font-size:0.75rem;font-weight:700;color:${colors.text}">${ex.method}</span>
            <span style="font-size:0.65rem;color:var(--text-muted);margin-left:6px">${progression.desc}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:0.65rem;color:var(--text-muted)">Carga base (kg):</span>
            <input type="number" step="0.5" value="${baseLoad||''}" placeholder="kg"
              class="form-input method-base-load" data-index="${index}"
              style="width:64px;padding:3px 6px;font-size:0.78rem;text-align:center" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:80px 1fr 72px 72px 56px;gap:6px;margin-bottom:4px">
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Série</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Descrição</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Carga</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Reps</div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Desc.(s)</div>
        </div>
        ${seriesHTML}
      </div>
    `;
  } else if (ex.method) {
    const desc = selectedMethodOpt?.description;
    if (desc) {
      methodPanelHTML = `
        <div class="method-tip" style="font-size:0.72rem;color:${colors.text};margin-top:4px;grid-column:1/-1;padding:6px 8px;background:${colors.bg};border-radius:6px;border-left:3px solid ${colors.text};display:flex;align-items:center;gap:6px;border:1px solid ${colors.border};border-left-width:3px">
          <span style="font-size:0.6rem;text-transform:uppercase;font-weight:800;background:rgba(255,255,255,0.05);padding:1px 4px;border-radius:3px;color:${colors.text};border:1px solid ${colors.border}">${methodCategory}</span>
          <strong>${ex.method}</strong> — ${desc}
        </div>`;
    }
  }

  // Sort and group methods by category
  const categoryOrder = [
    'Hipertrofia',
    'Força / Potência',
    'Resistência / RML',
    'Cardio / Endurance',
    'Mobilidade / Flexibilidade',
    'Core / Estabilização',
    'Regenerativo / Recovery',
    'Aquecimento / Preparação',
    'Calistenia / Ginástica',
    'LPO / Levantamento Olímpico',
    'Coordenação / Agilidade',
    'Reabilitação / Preventivo',
    'Geral'
  ];
  const sortedMethods = [...allMethods].sort((a, b) => {
    const catA = a.category || 'Geral';
    const catB = b.category || 'Geral';
    const idxA = categoryOrder.indexOf(catA);
    const idxB = categoryOrder.indexOf(catB);
    const orderA = idxA !== -1 ? idxA : 99;
    const orderB = idxB !== -1 ? idxB : 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

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
        <label class="form-label" style="font-size:0.65rem;margin-bottom:2px;opacity:0.65" id="repsLbl_${index}">
          ${isTime ? 'Duração' : 'Reps/Tempo'}
        </label>
        <input class="form-input" name="ex_reps_${index}" value="${ex.reps || ex.defaultReps || (isTime ? '20min' : '12')}"
          placeholder="${isTime ? '20min / 30s' : '12'}" style="text-align:center;font-size:0.82rem;padding:4px 6px" />
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
          <option value="15" ${ex.rest=='15'?'selected':''}>15</option>
          <option value="30" ${ex.rest=='30'?'selected':''}>30</option>
          <option value="45" ${ex.rest=='45'?'selected':''}>45</option>
          <option value="60" ${(!ex.rest || ex.rest=='60')?'selected':''}>60</option>
          <option value="90" ${ex.rest=='90'?'selected':''}>90</option>
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
          ${sortedMethods.map(m => `<option value="${m.name}" ${ex.method===m.name?'selected':''}
            data-sets="${m.sets||''}" data-reps="${m.repsHint||''}" data-rest="${m.restHint||''}"
            data-desc="${m.description||''}" data-category="${m.category||'Geral'}">[${m.category||'Geral'}] ${m.name}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="btn btn-ghost btn-icon remove-exercise" data-index="${index}"
        style="color:var(--danger);padding:4px;align-self:flex-end;margin-bottom:2px" title="Remover">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
      ${methodPanelHTML}
    </div>`;
}

function collectExercises() {
  const rows = document.querySelectorAll('.exercise-row');
  const exercises = [];
  rows.forEach(row => {
    const i    = row.dataset.index;
    const name = document.querySelector(`[name="ex_name_${i}"]`)?.value;
    if (!name) return;

    const method   = document.querySelector(`[name="ex_method_${i}"]`)?.value || '';
    const loadType = document.querySelector(`[name="ex_loadtype_${i}"]`)?.value || 'weight';
    const seriesPanel = row.querySelector('.method-series-panel');

    // Se tem painel de sub-séries progressivas, salvar cada série individualmente
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
        name, method, loadType,
        sets:              serieLogs.length,
        reps:              serieLogs.map(s=>s.reps).join('→'),
        load:              serieLogs[0]?.load || '',
        rest:              serieLogs[0]?.rest || 60,
        seriesProgression: serieLogs,
      });
    } else {
      exercises.push({
        name, method, loadType,
        sets:     parseInt(document.querySelector(`[name="ex_sets_${i}"]`)?.value) || 3,
        reps:     document.querySelector(`[name="ex_reps_${i}"]`)?.value || '12',
        load:     document.querySelector(`[name="ex_load_${i}"]`)?.value || '',
        rest:     document.querySelector(`[name="ex_rest_${i}"]`)?.value || '60',
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
              <h4 class="mb-sm" style="color:var(--success)">📊 Evolução & Histórico de Realizações</h4>
              <p class="text-xs text-muted mb-md">Comparações entre o treino prescrito (teórico) e o executado pelo aluno.</p>
              <div style="display:flex;flex-direction:column;gap:12px">
                ${doneSessions.map((se, si) => {
                  const setLog = se.setLog || [];
                  const sessionWorkout = allWorkouts.find(xw => xw.id === se.workoutId);
                  const displaySessionName = sessionWorkout ? sessionWorkout.name : se.workoutName || w.name;
                  return `
                    <div style="background:var(--bg-page);border:1px solid var(--border-color);border-radius:8px;padding:12px">
                      <div class="flex justify-between items-center mb-xs" style="flex-wrap:wrap;gap:6px">
                        <div>
                          <span class="badge badge-success" style="font-size:0.7rem;text-transform:none">Realizado</span>
                          <strong style="font-size:0.8rem;margin-left:6px">${displaySessionName}</strong>
                        </div>
                        <span style="font-size:0.78rem;color:var(--text-muted)">${Calc.formatDate(se.date || se.createdAt)} · Volume Total: <strong style="color:var(--primary)">${se.totalVolume || 0}kg</strong></span>
                      </div>
                      ${se.postBiofeedback?.pse ? `
                        <div class="text-xs text-muted mb-sm" style="background:rgba(255,255,255,0.03);padding:6px 8px;border-radius:4px">
                          Esforço (PSE): <strong style="color:var(--warning)">${se.postBiofeedback.pse}/10</strong> · 
                          Recuperação (TQR): <strong>${se.postBiofeedback.tqrPost || '-'}</strong> · 
                          Duração: <strong>${se.totalDuration ? Math.round(se.totalDuration/60) : '-'} min</strong>
                        </div>` : ''}
                      
                      <!-- Tabela de comparação -->
                      <div class="table-container">
                        <table class="data-table" style="font-size:0.75rem;width:100%">
                          <thead><tr><th>Exercício</th><th>Séries Prescritas</th><th>Realizadas</th><th>Carga Prescrita</th><th>Carga Média Real</th></tr></thead>
                          <tbody>
                            ${(w.exercises||[]).map(ex => {
                              // Tentar dar match nas séries feitas para este exercício
                              const exSets = setLog.filter(s => s.exName === ex.name || (w.exercises[s.exIdx] && w.exercises[s.exIdx].name === ex.name));
                              const realSets = exSets.length;
                              const avgRealLoad = realSets ? Math.round(exSets.reduce((sum, s) => sum + (s.load || 0), 0) / realSets * 10) / 10 : '-';
                              
                              const setsDetailsHTML = realSets ? `
                                <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">
                                  ${exSets.map((s, idx) => `
                                    <span style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:4px;padding:2px 5px;white-space:nowrap">
                                      <strong>S${s.setIdx != null ? s.setIdx + 1 : idx + 1}:</strong> ${s.reps || 0} reps × ${s.load || 0}kg ${ex.rest ? ` <span style="color:var(--text-muted);font-size:0.62rem">(${ex.rest}s)</span>` : ''}
                                    </span>
                                  `).join('')}
                                </div>
                              ` : '';

                              return `<tr>
                                <td>
                                  <strong>${ex.name}</strong>
                                  ${setsDetailsHTML}
                                </td>
                                <td>${ex.sets}</td>
                                <td style="font-weight:700;color:${realSets >= ex.sets ? 'var(--success)' : 'var(--text-muted)'}">${realSets || '0'}</td>
                                <td>${ex.load ? ex.load + 'kg' : '-'}</td>
                                <td style="color:var(--primary);font-weight:700">${avgRealLoad ? avgRealLoad + 'kg' : '-'}</td>
                              </tr>`;
                            }).join('')}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  `;
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
    btn.onclick = () => btn.closest('.exercise-row')?.remove();
  });
}

function bindExerciseRowHandlers(allExercises, allMethods) {
  bindRemoveExercise();

  // ── Auto-preenchimento ao selecionar MÉTODO ─────────────────
  document.querySelectorAll('.ex-method').forEach(sel => {
    sel.addEventListener('change', () => {
      const opt      = sel.selectedOptions[0];
      const i        = sel.dataset.index;
      const row      = sel.closest('.exercise-row');
      const methodName = opt?.value || '';
      const category   = opt?.dataset.category || 'Geral';
      const isCardioMethod = category === 'Cardio / Endurance';

      // Remover painel de sub-séries anterior
      row?.querySelectorAll('.method-series-panel').forEach(p => p.remove());
      row?.querySelectorAll('.method-tip').forEach(p => p.remove());

      const repsLbl = document.getElementById(`repsLbl_${i}`);
      const loadLbl = document.getElementById(`loadLbl_${i}`);
      const repsEl = document.querySelector(`[name="ex_reps_${i}"]`);
      const loadEl = document.querySelector(`[name="ex_load_${i}"]`);
      const ltSel = document.querySelector(`[name="ex_loadtype_${i}"]`);

      if (isCardioMethod) {
        if (ltSel) ltSel.value = 'time';
        if (repsLbl) repsLbl.textContent = 'Duração';
        if (loadLbl) loadLbl.textContent = 'Intensidade';
        if (loadEl) loadEl.placeholder = 'km/h/W';
      } else {
        const currentLt = ltSel?.value || 'weight';
        if (repsLbl) repsLbl.textContent = currentLt === 'time' ? 'Duração' : 'Reps/Tempo';
        if (loadLbl) loadLbl.textContent = currentLt === 'time' ? 'Intensidade' : currentLt === 'bodyweight' ? 'Extra (kg)' : 'Carga (kg)';
        if (loadEl) loadEl.placeholder = currentLt === 'time' ? 'km/h/W' : currentLt === 'bodyweight' ? '+kg' : 'kg';
      }

      if (!methodName) {
        // Limpar indicação de método
        const setsEl = document.querySelector(`[name="ex_sets_${i}"]`);
        if (setsEl) setsEl.closest('div').style.opacity = '';
        if (repsEl) repsEl.closest('div').style.opacity = '';
        if (loadEl) loadEl.closest('div').style.opacity = '';
        return;
      }

      // Preencher séries/reps/descanso padrão
      const setsEl = document.querySelector(`[name="ex_sets_${i}"]`);
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
      const progression = METHOD_PROGRESSIONS[methodName];
      if (!progression) {
        // Método simples — apenas dica de descrição
        const desc = opt?.dataset.desc;
        if (desc) {
          const colors = METHOD_COLORS[category] || METHOD_COLORS['Geral'];
          const tip = document.createElement('div');
          tip.className = 'method-tip';
          tip.style.cssText = `font-size:0.72rem;color:${colors.text};margin-top:4px;grid-column:1/-1;padding:6px 8px;background:${colors.bg};border-radius:6px;border-left:3px solid ${colors.text};display:flex;align-items:center;gap:6px;border:1px solid ${colors.border};border-left-width:3px`;
          tip.innerHTML = `<span style="font-size:0.6rem;text-transform:uppercase;font-weight:800;background:rgba(255,255,255,0.05);padding:1px 4px;border-radius:3px;color:${colors.text};border:1px solid ${colors.border}">${category}</span> <strong>${methodName}</strong> — ${desc}`;
          row?.appendChild(tip);
        }
        return;
      }

      // ── MÉTODO COM PROGRESSÃO — gerar painel de sub-séries ───
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

      const seriesHTML = progression.series.map((s, si) => {
        const calcLoad = baseLoad > 0 && !isTime
          ? Math.round(baseLoad * s.loadPct * 2) / 2
          : '';
        const restVal  = s.rest != null ? s.rest : (restEl?.value || '60');
        return `
          <div style="display:grid;grid-template-columns:80px 1fr 72px 72px 56px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(148,163,184,0.1)" data-serie="${si}">
            <div style="font-size:0.7rem;font-weight:600;color:var(--text-secondary)">${s.label}</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">${s.reps}</div>
            <div>
              <input type="number" step="0.5" value="${calcLoad}" placeholder="${isTime?'km/h':'kg'}"
                class="form-input serie-load" data-serie="${si}" data-index="${i}"
                style="width:100%;padding:3px 6px;font-size:0.82rem;text-align:center;font-weight:600;${calcLoad?`color:var(--primary)`:''}"/>
            </div>
            <div style="font-size:0.72rem;color:var(--primary);font-weight:600;text-align:center">
              ${isTime ? s.reps : `${s.reps} reps`}
            </div>
            <div>
              <input type="number" value="${restVal}"
                class="form-input serie-rest" data-serie="${si}"
                style="width:100%;padding:3px 6px;font-size:0.78rem;text-align:center;color:var(--text-muted)"
                placeholder="s" title="Descanso (s)"/>
            </div>
          </div>`;
      }).join('');

      const seriesLegend = `
        <div style="display:grid;grid-template-columns:80px 1fr 72px 72px 56px;gap:6px;margin-bottom:4px">
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Série</div>
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
