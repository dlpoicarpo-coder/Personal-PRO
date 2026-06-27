// ========================================
// PERSONAL PRO — Live Tracker (v3)
// Timers conectados · Design limpo · PDF · Excluir sessão
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { Timer, formatTime, formatTimeHMS } from '../components/timer.js';
import { notify } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { METHOD_PROGRESSIONS, METHOD_CARDIO_META, COMBINED_METHODS } from './workouts.js';

const isNumeric = (val) => {
  if (val === undefined || val === null || val === '') return true;
  const str = String(val).trim().replace(',', '.');
  return !isNaN(str) && !isNaN(parseFloat(str));
};

// ── STATE ────────────────────────────────────────────────────
const state = {
  session: null,
  workoutTimer: null,
  restTimer:    null,
  workTimer:    null,
  _uiInterval:  null,
  exIdx:    0,
  setIdx:   0,
  setLog:   [],
  workSec:  0,
  isResting: false,
  tempSets: {},
  autoSaveInterval: null,
  onVisibilityChange: null,
  onBeforeUnload: null,
};

function resetState() {
  if (state._uiInterval)  { clearInterval(state._uiInterval); state._uiInterval = null; }
  if (state.workoutTimer) { state.workoutTimer.stop(); state.workoutTimer = null; }
  if (state.restTimer)    { state.restTimer.stop();    state.restTimer = null; }
  if (state.workTimer)    { state.workTimer.stop();    state.workTimer = null; }
  
  // Limpar listeners do autosave
  if (state.autoSaveInterval) { clearInterval(state.autoSaveInterval); state.autoSaveInterval = null; }
  if (state.onVisibilityChange) {
    document.removeEventListener('visibilitychange', state.onVisibilityChange);
    state.onVisibilityChange = null;
  }
  if (state.onBeforeUnload) {
    window.removeEventListener('beforeunload', state.onBeforeUnload);
    state.onBeforeUnload = null;
  }

  state.session = null; state.exIdx = 0; state.setIdx = 0;
  state.setLog = []; state.workSec = 0; state.isResting = false; state.tempSets = {};
}

function totalVolume() {
  return state.setLog.reduce((t, s) => {
    const reps = parseFloat(s.reps) || 0;
    const loadStr = String(s.load || '').replace(',', '.');
    const load = isNaN(loadStr) || isNaN(parseFloat(loadStr)) ? 0 : parseFloat(loadStr);
    return t + (reps * load);
  }, 0);
}

function saveCurrentInputs() {
  document.querySelectorAll('.set-row:not(.set-done)').forEach(row => {
    const si = parseInt(row.dataset.si);
    const repsInp = row.querySelector('.set-reps');
    const loadInp = row.querySelector('.set-load');
    const pseInp  = row.querySelector('.set-pse');
    const rirInp  = row.querySelector('.set-rir');

    if (!state.tempSets[state.exIdx]) state.tempSets[state.exIdx] = {};
    const existing = state.tempSets[state.exIdx][si] || {};
    
    // Only update if input exists and has a value, otherwise keep existing
    if (repsInp && repsInp.value !== '') existing.reps = parseInt(repsInp.value);
    if (loadInp && loadInp.value !== '') existing.load = parseFloat(loadInp.value);
    if (pseInp && pseInp.value !== '') existing.pse = parseInt(pseInp.value);
    if (rirInp && rirInp.value !== '') existing.rir = parseInt(rirInp.value);
    
    state.tempSets[state.exIdx][si] = existing;
  });
}

// ── RENDER SETUP ─────────────────────────────────────────────
export async function renderTracker() {
  const students = await db.getAll('students');
  const active   = students.filter(s => s.status === 'Ativo');
  const sessions = await db.getAll('sessions');

  if (!state.session) {
    const running = sessions.find(s => s.status === 'running' && !s.isSolo && !(s.data && s.data.isSolo));
    if (running) {
      state.session  = running;
      state.setLog   = running.setLog || [];
      state.exIdx    = running.currentExIdx || 0;
      state.workSec  = running.workSec || 0;
      state.tempSets = running.tempSets || {};
      state.isResting = running.isResting || false;
      if (running.lastAutoSave) {
        console.log(`[Sessão recuperada] Último autosave: ${running.lastAutoSave}`);
      }
    }
  }

  if (state.session) return renderLiveView(students);

  const allSessions = sessions
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  // Enriquecer sessões com biofeedback do DB (preenche PSE/carga quando aluno preencheu o form depois)
  const allBiofeedback = await db.getAll('biofeedback');
  const completed = allSessions.map(s => {
    const dateStr = (s.date || '').substring(0, 10);
    const bfId = `bf_${s.studentId}_${dateStr}`;
    const bf = allBiofeedback.find(b => b.id === bfId || (b.studentId === s.studentId && (b.date || '').startsWith(dateStr)));
    if (!bf) return s;
    // Merge: biofeedback tem prioridade sobre session para campos pós-treino
    return {
      ...s,
      preBiofeedback: s.preBiofeedback || {
        sleep: bf.sleep, tqr: bf.tqr || bf.energy, stress: bf.stress,
        pain: bf.pain, painRegions: bf.painRegions, food: bf.food, motivation: bf.motivation,
        menstrual: bf.menstrual, mood: bf.mood, notes: bf.notes,
      },
      postBiofeedback: {
        ...(s.postBiofeedback || {}),
        pse: bf.pse || s.postBiofeedback?.pse,
        trainingLoad: bf.trainingLoad || s.postBiofeedback?.trainingLoad,
        tqrPost: bf.tqrPost || s.postBiofeedback?.tqrPost,
        feeling: bf.feeling || s.postBiofeedback?.feeling,
        notes: bf.postNotes || bf.notes || s.postBiofeedback?.notes,
        submittedByStudent: bf.submittedByStudent || s.postBiofeedback?.submittedByStudent,
        pendingStudentForm: !bf.pse, // só pendente se não tem PSE
      },
      trainingLoad: bf.trainingLoad || s.trainingLoad,
    };
  });

  return `
    <div class="page-header">
      <div><h1>Treino ao Vivo</h1><p class="subtitle">Selecione aluno e treino para iniciar</p></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Iniciar Sessão</span></div>
        <div class="form-group">
          <label class="form-label">Aluno *</label>
          <select class="form-select" id="trkStudent">
            <option value="">Selecione o aluno</option>
            ${active.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Treino *</label>
          <select class="form-select" id="trkWorkout" disabled>
            <option value="">Selecione o aluno primeiro</option>
          </select>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem">
            <input type="checkbox" id="trkSound" checked /> Bipe ao fim do descanso
          </label>
        </div>
        <button class="btn btn-primary" id="startBtn" disabled
          style="width:100%;padding:14px;font-size:1rem;margin-top:8px">
          ▶ Iniciar Treino ao Vivo
        </button>
        <div id="macroBanner" style="display:none;margin-top:10px"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Check-in Pré-Treino</span>
          <button class="btn btn-ghost btn-sm" id="genPreLinkBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Link para aluno
          </button>
        </div>
        <div id="preBioStatus" style="padding:12px;background:rgba(16,185,129,0.06);border-radius:8px;border:1px solid rgba(16,185,129,0.15);text-align:center">
          <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:6px">O check-in é preenchido pelo aluno via link</div>
          <div id="preBioLoaded" style="display:none">
            <div style="font-size:0.75rem;font-weight:600;color:var(--success);margin-bottom:6px">✓ Dados do aluno carregados</div>
            <div id="preBioValues" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:0.72rem"></div>
          </div>
          <div id="preBioEmpty">
            <div style="font-size:0.78rem;color:var(--text-muted)">Aguardando check-in do aluno</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:3px">Envie o link via WhatsApp para o aluno preencher antes de chegar</div>
          </div>
        </div>
      </div>
    </div>

    ${completed.length ? `
    <div class="card mt-lg">
      <div class="card-header" style="justify-content:space-between; gap: 10px; flex-wrap: wrap;">
        <span class="card-title">Sessões Recentes</span>
        <div style="display:flex; align-items:center; gap:8px">
          <select id="filterRecentStudent" class="form-select form-select-sm" style="width:auto; max-width:180px">
            <option value="">Todos os alunos</option>
            ${active.map(s => `<option value="${s.id}">${s.name.split(' ')[0]}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" id="viewFullHistoryBtn" style="white-space:nowrap; display:flex; align-items:center; gap:4px">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Histórico Completo
          </button>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>Aluno</th>
            <th>Treino</th>
            <th>Data</th>
            <th>Duração</th>
            <th>Volume</th>
            <th>Séries</th>
            <th>PSE</th>
            <th>Carga</th>
            <th>Obs.</th>
            <th style="width:90px;text-align:center"></th>
          </tr></thead>
          <tbody>${completed.map(s => {
            const st  = students.find(x => x.id === s.studentId);
            const pse = s.postBiofeedback?.pse || 0;
            const dur = s.totalDuration ? Math.round(s.totalDuration/60) : 0;
            const carga = s.trainingLoad || s.postBiofeedback?.trainingLoad || (pse && dur ? pse*dur : 0);
            const postNotes = s.postBiofeedback?.notes || '';
            const setNotes  = (s.setLog||[]).filter(x=>x.notes).map(x=>`S${x.setIdx+1}: ${x.notes}`);
            const allObs    = [postNotes, ...setNotes].filter(Boolean);
            const obsTitle  = allObs.join(' | ');
            return `<tr class="recent-session-row" data-sid="${s.studentId}">
              <td style="white-space:nowrap">${st?.name || '?'}</td>
              <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.workoutName || '-'}</td>
              <td style="white-space:nowrap">${Calc.formatDate(s.date)}</td>
              <td style="white-space:nowrap">${formatTimeHMS(s.totalDuration || 0)}</td>
              <td style="white-space:nowrap">${s.totalVolume ? Math.round(s.totalVolume) : '-'} kg</td>
              <td style="text-align:center">${s.totalSets || '-'}</td>
              <td style="text-align:center;color:${pse>8?'var(--danger)':pse>6?'var(--warning)':pse?'var(--success)':'var(--text-muted)'}">
                ${pse
                  ? `<strong>${pse}</strong>`
                  : `<span style="font-size:0.65rem;color:var(--text-muted);padding:2px 5px;background:var(--bg-page);border-radius:4px;border:1px solid var(--border-color)" title="Aguardando preenchimento do aluno">aguard.</span>`}
              </td>
              <td style="text-align:center;color:var(--text-muted);font-size:0.82rem">${carga||'-'}</td>
              <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:0.75rem;font-style:italic" title="${obsTitle}">
                ${allObs.length ? allObs[0].slice(0,30)+(allObs[0].length>30||allObs.length>1?'…':'') : '-'}
              </td>
              <td style="white-space:nowrap;text-align:right;padding-right:8px">
                <button class="btn btn-ghost btn-sm view-session" data-id="${s.id}" title="Ver"
                  style="padding:4px 6px;color:var(--accent);display:inline-flex;align-items:center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn btn-ghost btn-sm edit-session" data-id="${s.id}" title="Editar"
                  style="padding:4px 6px;color:var(--primary);display:inline-flex;align-items:center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-ghost btn-sm delete-session" data-id="${s.id}" title="Excluir"
                  style="padding:4px 6px;color:var(--danger);display:inline-flex;align-items:center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>` : ''}
  `;
}

// ── RENDER LIVE VIEW ─────────────────────────────────────────
function renderLiveView(students) {
  const s      = state.session;
  const st     = students.find(x => x.id === s.studentId);
  const exs    = s.exercises || [];
  const exs_all = exs; // alias para uso nos combined-method badges
  const ex     = exs[state.exIdx] || {};
  const totalSets = exs.reduce((sum, e) => {
    if (isCardioExercise(e)) {
      const segs = getCardioSegments(e);
      if (segs.length > 0) return sum + segs.length;
    }
    return sum + (parseInt(e.sets) || 3);
  }, 0);
  const doneSets  = state.setLog.length;
  const pct       = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const isExCardio = isCardioExercise(ex);
  const segments  = isExCardio ? getCardioSegments(ex) : [];
  const exSets    = (isExCardio && segments.length > 0) ? segments.length : (parseInt(ex.sets) || 3);

  // Garantir groupId para métodos combinados que foram salvos antes dessa feature
  // Atribuir dinamicamente se não existir
  (() => {
    let grpCounter = 0;
    for (let i = 0; i < exs.length; i++) {
      if (!COMBINED_METHODS?.has(exs[i].method)) continue;
      if (exs[i].groupId) continue;
      const gid = `grp_${++grpCounter}`;
      exs[i].groupId = gid;
      for (let j = i + 1; j < exs.length; j++) {
        if (exs[j].method === exs[i].method) exs[j].groupId = gid;
        else break;
      }
    }
  })();

  return `
    <div class="tracker-live">
      <div id="macroBanner" style="display:none;margin-bottom:10px"></div>
      <div class="tracker-header">
        <div class="flex items-center gap-md">
          <div class="avatar">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
          <div>
            <div style="font-weight:700;font-size:1.05rem">${st?.name || 'Aluno'}</div>
            <div class="text-muted text-sm">${s.workoutName || 'Treino'}</div>
          </div>
        </div>
        <div class="flex items-center gap-md">
          <div class="live-indicator"><span class="live-dot-anim"></span> AO VIVO</div>
        </div>
      </div>

      <div class="progress-bar mb-xs" style="height:6px;border-radius:3px">
        <div class="progress-fill" style="width:${pct}%;border-radius:3px"></div>
      </div>
      <div class="text-center text-xs text-muted mb-md">${doneSets}/${totalSets} séries · ${pct}% concluído</div>

      <!-- Painel de Métricas Superior (Stats Grid) -->
      <div class="stats-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:12px">
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          <div style="display:flex;align-items:center;gap:4px;font-size:0.58rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Total
          </div>
          <div id="liveTotal" style="font-size:1.35rem;font-weight:800;font-family:monospace;color:var(--primary);line-height:1">00:00</div>
        </div>
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          <div style="display:flex;align-items:center;gap:4px;font-size:0.58rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Trabalho
          </div>
          <div id="liveWork" style="font-size:1.35rem;font-weight:800;font-family:monospace;color:var(--success);line-height:1">00:00</div>
        </div>
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          <div style="display:flex;align-items:center;gap:4px;font-size:0.58rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/></svg>
            Descanso
          </div>
          <div id="liveRest" style="font-size:1.35rem;font-weight:800;font-family:monospace;color:var(--warning);line-height:1">00:00</div>
        </div>
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          <div style="display:flex;align-items:center;gap:4px;font-size:0.58rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
            Densidade
          </div>
          <div id="liveDens" style="font-size:1.35rem;font-weight:800;font-family:monospace;color:var(--accent);line-height:1">0.00</div>
        </div>
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          <div style="display:flex;align-items:center;gap:4px;font-size:0.58rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
            Volume
          </div>
          <div id="liveVol" style="font-size:1.35rem;font-weight:800;font-family:monospace;color:#eab308;line-height:1">${totalVolume()} kg</div>
        </div>
      </div>

      <!-- NOVO LAYOUT: 2 colunas -->
      <div style="display:grid;grid-template-columns:1fr 300px;gap:12px;align-items:start">

        <!-- ── COLUNA ESQUERDA: Exercício atual + Séries + Próximos ── -->
        <div style="display:flex;flex-direction:column;gap:10px">

          <!-- Card do exercício atual -->
          <div class="card" style="padding:14px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);background:var(--bg-page);padding:2px 8px;border-radius:6px;text-transform:uppercase">
                  Ex ${state.exIdx + 1}/${exs.length}
                </span>
                ${COMBINED_METHODS?.has(ex.method) ? (() => {
                  const grpExs = exs_all.filter(e => e.groupId && e.groupId === ex.groupId);
                  const pos    = grpExs.findIndex(e => e === ex);
                  const total  = grpExs.length;
                  const label  = total > 1 ? `${ex.method} (${pos + 1}/${total})` : ex.method;
                  return `<span style="font-size:0.62rem;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);display:inline-flex;align-items:center;gap:3px"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> ${label}</span>`;
                })() : ex.method ? `<span class="badge badge-info" style="font-size:0.65rem">${ex.method}</span>` : ''}
              </div>
              <div class="flex gap-xs">
                <button class="btn btn-ghost btn-sm" id="editExLiveBtn" title="Editar" style="padding:3px 6px">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="btn btn-ghost btn-sm" id="prevEx" ${state.exIdx === 0 ? 'disabled' : ''} style="padding:3px 8px">←</button>
                <button class="btn btn-ghost btn-sm" id="nextEx" ${state.exIdx >= exs.length - 1 ? 'disabled' : ''} style="padding:3px 8px">→</button>
              </div>
            </div>

            <!-- Nome + info -->
            <div style="font-size:1.2rem;font-weight:700;color:var(--primary);margin-bottom:4px">${ex.name || '—'}</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">
              <span>${exSets} séries</span>
              <span>${ex.reps || '12'} reps</span>
              ${ex.load ? `<span style="color:var(--accent);font-weight:600">${(isNumeric(ex.load) && ex.loadType !== 'time') ? ex.load + 'kg' : ex.load}</span>` : ''}
              ${ex.oneRM ? `<span style="color:var(--text-muted)">1RM: ${ex.oneRM}kg</span>` : ''}
              ${COMBINED_METHODS?.has(ex.method)
                ? `<span style="color:var(--warning);font-weight:600;display:inline-flex;align-items:center;gap:3px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg> sem descanso</span>`
                : `<span>${ex.rest || 60}s descanso</span>`}
              ${(() => {
                const cm = METHOD_CARDIO_META?.[ex.method];
                return cm ? `<span style="color:var(--accent);font-weight:600">${cm.fcPct[0]}-${cm.fcPct[1]}% FCmáx · RPE ${cm.rpe}</span>` : '';
              })()}
            </div>

            <!-- Orientações do professor -->
            ${ex.trainerNotes ? `
              <div style="padding:7px 10px;background:rgba(16,185,129,0.07);border-left:3px solid var(--success);border-radius:0 6px 6px 0;margin-bottom:10px">
                <div style="font-size:0.58rem;font-weight:700;color:var(--success);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">Orientações</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.5">${ex.trainerNotes}</div>
              </div>` : ''}
            ${(() => {
              if (!isExCardio) return '';
              const totalSec = segments.reduce((sum, seg) => sum + seg.duration, 0);
              const formatTimeLabel = (sec) => {
                const m = Math.floor(sec / 60);
                const s = Math.floor(sec % 60);
                return `${m}:${String(s).padStart(2, '0')}`;
              };
              const formatDurationText = (sec) => {
                const m = Math.floor(sec / 60);
                const s = Math.floor(sec % 60);
                if (s > 0) return `${m} min ${s}s`;
                return `${m} min`;
              };
              const getZoneColor = (intensity) => {
                if (intensity >= 90) return '#ef4444';
                if (intensity >= 83) return '#f97316';
                if (intensity >= 73) return '#eab308';
                if (intensity >= 63) return '#10b981';
                return '#3b82f6';
              };

              return `
                <div class="cardio-embedded-trainer" style="margin-top:10px;background:rgba(255,255,255,0.02);border-radius:12px;padding:12px;border:1px solid var(--border-color);margin-bottom:12px">
                  <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
                    <span>📊 Perfil do Ritmo (Cardio)</span>
                    <span style="font-size:0.65rem;color:var(--text-muted);font-weight:500;text-transform:none;letter-spacing:0">Duração: ${formatDurationText(totalSec)}</span>
                  </div>
                  <div style="position:relative;height:120px;width:100%;margin-bottom:8px;background:rgba(0,0,0,0.15);border-radius:8px;padding:4px">
                    <canvas id="cardioEmbedChart_trainer" style="width:100%;height:100%"></canvas>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:5px;max-height:120px;overflow-y:auto;padding-right:4px">
                    ${segments.map((seg, idx) => {
                      const timeLabel = `${formatTimeLabel(seg.start)} a ${formatTimeLabel(seg.end)}`;
                      const targetLabel = seg.load != null ? `${seg.load}` : `${seg.intensity}%`;
                      return `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.015);border-radius:6px;font-size:0.7rem;border-left:3px solid ${getZoneColor(seg.intensity)}">
                          <div style="display:flex;flex-direction:column;text-align:left">
                            <span style="font-weight:700;color:var(--text-main,#f1f5f9)">${seg.label}</span>
                            <span style="font-size:0.6rem;color:var(--text-muted)">⏱ ${timeLabel} (${formatTimeLabel(seg.duration)})</span>
                          </div>
                          <div style="font-weight:700;color:${getZoneColor(seg.intensity)}">
                            ${targetLabel}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            })()}

            <!-- Fase de periodização -->
            ${(() => {
              const wk = s.weekPlan;
              if (!wk) return '';
              const isDeload = wk.phase?.includes('Deload') || wk.phase?.includes('Recuper');
              const dupSess = wk.dupSessions;
              if (dupSess?.length) {
                return `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">${dupSess.map(ds => {
                  const c = ds.intensityPct >= 85 ? '#ef4444' : ds.type === 'DE' || ds.type === 'Z5' ? '#3b82f6' : '#f59e0b';
                  return `<span style="font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:8px;background:${c}20;color:${c};border:1px solid ${c}40">${ds.label} · ${ds.intensityPct}% · RPE ${ds.rpe}</span>`;
                }).join('')}</div>`;
              }
              if (!wk.phase || wk.phase === 'DUP') return '';
              const pc = isDeload ? '#3b82f6' : wk.intensityPct >= 85 ? '#ef4444' : wk.intensityPct >= 75 ? '#f97316' : wk.intensityPct >= 65 ? '#eab308' : '#22c55e';
              return `<div style="margin-bottom:8px"><span style="font-size:0.62rem;font-weight:700;padding:2px 8px;border-radius:8px;background:${pc}20;color:${pc};border:1px solid ${pc}40">${wk.phase} · ${wk.intensityPct}% · RPE ${wk.rpe || '—'}</span></div>`;
            })()}

            <!-- Séries -->
            <div id="setArea" style="display:flex;flex-direction:column;gap:5px">
              ${Array.from({ length: exSets }, (_, i) => {
                const done     = state.setLog.find(l => l.exIdx === state.exIdx && l.setIdx === i);
                const isActive = !done && i === state.setIdx;
                const temp     = state.tempSets[state.exIdx]?.[i] || {};
                let defaultReps = 10;
                let defaultLoad = ex.load || '';
                let setLabel = '';
                let badgeTop = `S${i + 1}`;
                let badgeBottom = '';

                if (isExCardio && segments.length > 0) {
                  const seg = segments[i];
                  badgeTop = `P${i + 1}`;
                  const zoneMatch = seg.label.match(/z\d/i);
                  badgeBottom = zoneMatch ? zoneMatch[0].toUpperCase() : seg.label.split(' ')[0];

                  defaultReps = Math.round(seg.duration / 60);
                  defaultLoad = seg.load != null ? seg.load : (seg.intensity ? Math.round(seg.intensity) : '');
                } else {
                  let progression = ex.seriesProgression;
                  if (!progression && ex.method && METHOD_PROGRESSIONS[ex.method]) {
                    const progDef = METHOD_PROGRESSIONS[ex.method];
                    const baseLoad = parseFloat(ex.load) || 0;
                    progression = progDef.series.map((s, si) => ({
                      set: si + 1, reps: s.reps,
                      load: baseLoad > 0 ? Math.round(baseLoad * s.loadPct * 2) / 2 : 0,
                      rest: s.rest != null ? s.rest : parseInt(ex.rest || 60),
                      label: s.label || `Série ${si + 1}`
                    }));
                  }
                  if (progression && progression[i]) {
                    const sp = progression[i];
                    if (sp.reps) { const m = String(sp.reps).match(/(\d+)/); defaultReps = m ? parseInt(m[1]) : 10; }
                    if (sp.load !== undefined) defaultLoad = sp.load;
                    if (sp.label) setLabel = sp.label;
                  } else {
                    defaultReps = (String(ex.reps || '')).replace(/[^0-9]/g, '') || 12;
                  }

                  const isClusterMethod = ex.method === 'Rest-Pause' || ex.method === 'Cluster';
                  if (isClusterMethod && setLabel) {
                    const clusterMatch = setLabel.match(/Cluster\s*(\d+)/i);
                    const cNum = clusterMatch ? clusterMatch[1] : '';
                    const isMini = setLabel.toLowerCase().includes('pausa');
                    const miniIdx = progression?.slice(0, i).filter(s => {
                      const lbl = s.label || '';
                      return lbl.match(new RegExp(`Cluster\\s*${cNum}`, 'i'));
                    }).length + 1;
                    badgeTop    = `C${cNum}`;
                    badgeBottom = isMini ? `P${miniIdx}` : `M${miniIdx || 1}`;
                  } else {
                    badgeTop    = `S${i + 1}`;
                    badgeBottom = setLabel || '';
                  }
                }

                const repsVal = done ? done.reps : (temp.reps !== undefined ? temp.reps : defaultReps);
                const loadVal = done ? done.load : (temp.load !== undefined ? temp.load : defaultLoad);
                const pseVal  = done ? done.pse  : (temp.pse  !== undefined ? temp.pse  : '');
                const rirVal  = done && done.rir != null ? done.rir : (temp.rir !== undefined ? temp.rir : '');
                const setColor = done ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)';

                return `
                <div class="set-row ${done ? 'set-done' : ''} ${isActive ? 'set-active' : ''}" data-si="${i}"
                  style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;
                  border:1px solid ${isActive ? 'rgba(16,185,129,0.35)' : done ? 'rgba(16,185,129,0.15)' : 'var(--border-color)'};
                  background:${isActive ? 'rgba(16,185,129,0.08)' : done ? 'rgba(16,185,129,0.04)' : 'var(--bg-page)'}">
                  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:36px;width:36px;height:36px;border-radius:8px;flex-shrink:0;
                    background:${done ? 'rgba(16,185,129,0.15)' : isActive ? 'rgba(16,185,129,0.12)' : 'var(--bg-card)'};
                    border:1px solid ${done ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--border-color)'}">
                    <span style="font-size:0.65rem;font-weight:800;color:${setColor};line-height:1">${badgeTop}</span>
                    ${badgeBottom ? `<span style="font-size:0.4rem;color:var(--text-muted);line-height:1;margin-top:1px;text-align:center;white-space:nowrap;overflow:hidden;max-width:34px">${badgeBottom}</span>` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;gap:2px;align-items:center;flex:1">
                    <span style="font-size:0.48rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em">${isExCardio ? 'Tempo' : 'Reps'}</span>
                    <input class="form-input set-reps" style="width:100%;min-width:44px;text-align:center;padding:5px 3px;font-size:0.9rem;font-weight:700;border-radius:7px" type="${isExCardio ? 'text' : 'number'}" placeholder="—" value="${repsVal}" ${done ? 'disabled' : ''} />
                  </div>
                  <div style="display:flex;flex-direction:column;gap:2px;align-items:center;flex:1.2">
                    <span style="font-size:0.48rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em">${ex.loadType === 'time' ? 'Zona' : ex.loadType === 'bodyweight' ? '+kg' : 'kg'}</span>
                    <input class="form-input set-load" style="width:100%;min-width:50px;text-align:center;padding:5px 3px;font-size:0.9rem;font-weight:700;border-radius:7px" type="${isExCardio ? 'text' : (isNumeric(ex.load) && ex.loadType !== 'time') ? 'number' : 'text'}" step="0.5" placeholder="—" value="${loadVal}" ${done ? 'disabled' : ''} />
                  </div>
                  <div style="display:flex;flex-direction:column;gap:2px;align-items:center;flex:0.85" title="PSE — Percepção Subjetiva de Esforço">
                    <span style="font-size:0.48rem;color:var(--warning);text-transform:uppercase;letter-spacing:0.06em;font-weight:700">PSE</span>
                    <input class="form-input set-pse" style="width:100%;min-width:36px;text-align:center;padding:5px 3px;font-size:0.9rem;border-color:rgba(245,158,11,0.35);border-radius:7px" type="number" min="1" max="10" placeholder="—" value="${pseVal}" ${done ? 'disabled' : ''} />
                  </div>
                  <div style="display:flex;flex-direction:column;gap:2px;align-items:center;flex:0.85" title="RIR — Reps sobrando">
                    <span style="font-size:0.48rem;color:var(--accent);text-transform:uppercase;letter-spacing:0.06em;font-weight:700">RIR</span>
                    <input class="form-input set-rir" style="width:100%;min-width:34px;text-align:center;padding:5px 3px;font-size:0.9rem;border-color:rgba(6,182,212,0.4);border-radius:7px" type="number" min="0" max="10" placeholder="—" value="${rirVal}" ${done ? 'disabled' : ''} />
                  </div>
                  ${done
                    ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:30px;flex-shrink:0">
                        ${done.pse ? `<span style="font-size:0.5rem;color:var(--warning);font-weight:600">P${done.pse}</span>` : ''}
                        <span style="background:var(--success);color:#fff;border-radius:6px;font-size:0.7rem;font-weight:700;width:28px;height:28px;display:flex;align-items:center;justify-content:center">✓</span>
                        ${done.rir != null ? `<span style="font-size:0.5rem;color:var(--accent);font-weight:600">R${done.rir}</span>` : ''}
                      </div>`
                    : `<button class="btn btn-primary btn-sm do-set" data-i="${i}" style="min-width:34px;width:34px;height:34px;padding:0;border-radius:8px;font-size:1rem;align-self:flex-end;flex-shrink:0">✓</button>`}
                </div>`;
              }).join('')}
            </div>
          </div>

          <!-- Próximos exercícios -->
          <div class="card" style="padding:10px 14px">
            <div style="font-size:0.65rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px">Todos os exercícios</div>
            ${exs.map((e, i) => {
              const done   = state.setLog.filter(l => l.exIdx === i).length >= (parseInt(e.sets) || 3);
              const isCur  = i === state.exIdx;
              const isCombo = COMBINED_METHODS?.has(e.method);
              return `<div class="go-ex" data-g="${i}" style="
                display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:6px;cursor:pointer;margin-bottom:2px;
                background:${isCur ? 'rgba(16,185,129,0.08)' : 'transparent'};
                color:${done ? 'var(--success)' : isCur ? 'var(--primary)' : 'var(--text-secondary)'}">
                <span style="font-size:0.7rem;min-width:14px">${done ? '✓' : isCur ? '●' : '○'}</span>
                <span style="font-size:0.8rem;font-weight:${isCur ? 600 : 400};flex:1">${e.name}</span>
                ${isCombo ? `<span style="font-size:0.58rem;color:#f59e0b;background:rgba(245,158,11,0.1);padding:1px 5px;border-radius:4px">${e.method.replace('Super-série ','SS ').replace('Série Gigante','GS')}</span>` : ''}
                ${e.load ? `<span style="font-size:0.68rem;color:var(--text-muted)">${isNumeric(e.load) ? e.load + 'kg' : e.load}</span>` : ''}
              </div>`;
            }).join('')}
            <button class="btn btn-ghost btn-sm" id="addExtraExBtn" style="width:100%;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:6px;color:var(--primary);border:1px dashed var(--primary);border-radius:6px;padding:6px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Adicionar Exercício Extra
            </button>
          </div>
        </div>

        <!-- ── COLUNA DIREITA: Descanso + Anotações ── -->
        <div style="display:flex;flex-direction:column;gap:10px;position:sticky;top:80px">

          <!-- Timer de descanso -->
          <div class="card" style="padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-size:0.62rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em">Descanso</span>
              <div style="display:flex;align-items:center;gap:8px">
                <span id="restStateTag" style="font-size:0.65rem;font-weight:700;color:var(--success)">▶ TRABALHANDO</span>
                <label style="display:flex;align-items:center;gap:4px;font-size:0.72rem;cursor:pointer;color:var(--text-muted)">
                  <input type="checkbox" id="sndToggle" ${s.soundEnabled !== false ? 'checked' : ''} /> Som
                </label>
              </div>
            </div>
            <div style="text-align:center;padding:12px 0 8px">
              <div id="restCount" style="font-size:3.2rem;font-weight:800;font-family:monospace;color:var(--accent);transition:color 0.3s;line-height:1">
                ${formatTime(parseInt(ex.rest) || 60)}
              </div>
              <div id="restLbl" style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">Pronto para descansar</div>
            </div>
            <div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px">
              <button class="btn btn-primary" id="goRest" style="flex:1;font-size:0.82rem">▶ Iniciar Descanso</button>
              <button class="btn btn-secondary btn-sm" id="rstRest" style="padding:6px 10px">↺</button>
            </div>
            <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">
              ${[15, 30, 45, 60, 90, 120, 180].map(t => `
                <button class="btn btn-ghost btn-sm rp" data-t="${t}" style="font-size:0.7rem;padding:3px 6px">
                  ${t >= 60 ? (t/60) + 'min' : t + 's'}
                </button>`).join('')}
            </div>
            ${s.preBiofeedback ? (() => {
              const bf = s.preBiofeedback;
              const sleepVal = bf.sleep ? `${Math.round(bf.sleep / 2)}/5` : '—';
              const foodVal = bf.food ? `${bf.food}/5` : '—';
              const motivationVal = bf.motivation ? `${Math.round(bf.motivation / 2)}/5` : '—';
              const stressVal = bf.stress ? `${bf.stress}/10` : '—';
              const tqrVal = (bf.tqr ?? bf.energy) ? `${bf.tqr ?? bf.energy}/10` : '—';
              
              // Humor: se não estiver explicitamente em bf.mood, calcula como média de sleep e tqr
              const computedMood = bf.mood ?? (bf.sleep && (bf.tqr ?? bf.energy) ? Math.round((bf.sleep + (bf.tqr ?? bf.energy)) / 2) : null);
              const moodVal = computedMood ? `${Math.round(computedMood / 2)}/5` : '—';

              let painVal = '—';
              if (bf.pain != null) {
                const p = parseInt(bf.pain) || 0;
                painVal = p > 8 ? '5/5' : p > 6 ? '4/5' : p > 4 ? '3/5' : p > 2 ? '2/5' : '1/5';
              }
              const painRegionsStr = bf.painRegions && bf.painRegions.length ? ` (${bf.painRegions.join(', ')})` : '';
              
              const isMenstrual = bf.menstrual === true || bf.menstrual === 'sim';
              
              return `
              <div style="border-top:1px solid var(--border-color);padding-top:10px;margin-top:10px;font-size:0.75rem;color:var(--text-secondary)">
                <div style="font-weight:700;font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Biofeedback Pré-Treino</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                  <div>Sono: <strong style="color:${(bf.sleep||0)<6?'var(--danger)':'var(--success)'}">${sleepVal}</strong></div>
                  <div>Alim.: <strong style="color:${(bf.food||0)<=2?'var(--danger)':'var(--success)'}">${foodVal}</strong></div>
                  <div>Motiv.: <strong style="color:${(bf.motivation||0)<6?'var(--danger)':'var(--success)'}">${motivationVal}</strong></div>
                  <div>Estresse: <strong style="color:${(bf.stress||0)>=7?'var(--danger)':'var(--success)'}">${stressVal}</strong></div>
                  <div>TQR: <strong style="color:${(bf.tqr||0)<5?'var(--danger)':'var(--success)'}">${tqrVal}</strong></div>
                  <div>Humor: <strong style="color:${(computedMood||0)<6?'var(--danger)':'var(--success)'}">${moodVal}</strong></div>
                  <div style="grid-column:span 2">Dor: <strong style="color:${(bf.pain||0)>=5?'var(--danger)':'var(--success)'}">${painVal}${painRegionsStr}</strong></div>
                  ${isMenstrual ? `<div style="grid-column:span 2;color:#ec4899">Ciclo Menstrual: <strong>Sim</strong></div>` : ''}
                </div>
              </div>`;
            })() : ''}
          </div>

          <!-- Anotações -->
          <div class="card" style="padding:12px">
            <div style="font-size:0.62rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Anotações</div>
            <textarea id="setNotes" class="form-textarea" rows="3" placeholder="Observações técnicas..." style="font-size:0.8rem;resize:none"></textarea>
          </div>

          <!-- Botão finalizar -->
          <button class="btn btn-danger" id="endBtn" style="width:100%">Finalizar Sessão</button>
        </div>

      </div>
    </div>
  `;
}

// ── INIT ─────────────────────────────────────────────────────
export function initTracker(navigateFn) {
  const sSel = document.getElementById('trkStudent');
  const wSel = document.getElementById('trkWorkout');
  const sBtn = document.getElementById('startBtn');

  // Filtro de sessões recentes
  const filterRecentSel = document.getElementById('filterRecentStudent');
  if (filterRecentSel) {
    filterRecentSel.addEventListener('change', (e) => {
      const selectedSid = e.target.value;
      document.querySelectorAll('.recent-session-row').forEach(row => {
        if (!selectedSid || row.dataset.sid === selectedSid) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Abrir Histórico Completo
  document.getElementById('viewFullHistoryBtn')?.addEventListener('click', async () => {
    const students = await db.getAll('students');
    const allSessions = await db.getAll('sessions');
    const allBiofeedback = await db.getAll('biofeedback');
    openFullHistoryModal(students, allSessions, allBiofeedback, navigateFn);
  });

  // Excluir sessão
  document.querySelectorAll('.delete-session').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Excluir esta sessão permanentemente?')) return;
      await db.delete('sessions', btn.dataset.id);
      notify.success('Sessão excluída.');
      navigateFn('/tracker');
    });
  });

  // Ver sessão
  document.querySelectorAll('.view-session').forEach(btn => {
    btn.addEventListener('click', async () => {
      const session  = await db.get('sessions', btn.dataset.id);
      if (!session) return;
      const students = await db.getAll('students');
      const student  = students.find(x => x.id === session.studentId);
      showSessionSummary(buildSessionSummary(session, student), session, student, navigateFn);
    });
  });

  // Editar sessão
  document.querySelectorAll('.edit-session').forEach(btn => {
    btn.addEventListener('click', async () => {
      const session  = await db.get('sessions', btn.dataset.id);
      if (!session) return;
      const students = await db.getAll('students');
      const student  = students.find(x => x.id === session.studentId);
      const workouts = await db.getAll('workouts');

      // Montar linhas de exercícios editáveis
      const exs    = session.exercises || [];
      const setLog = session.setLog    || [];

      const exRows = exs.map((ex, ei) => {
        const sets = setLog.filter(s => s.exIdx === ei);
        return `
          <div style="background:var(--bg-page);border-radius:8px;padding:10px;margin-bottom:8px" id="ex_${ei}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <div style="font-weight:700;font-size:0.88rem;color:var(--primary)">${ex.name}</div>
              ${ex.method ? `<span style="font-size:0.68rem;color:var(--accent)">${ex.method}</span>` : ''}
            </div>
            ${sets.map((s, si) => `
              <div style="display:grid;grid-template-columns:auto 1fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:5px" id="set_${ei}_${si}">
                <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600;min-width:20px">S${si+1}</span>
                <div>
                  <label style="font-size:0.6rem;color:var(--text-muted);display:block">Reps</label>
                  <input type="number" class="form-input set-reps" data-ei="${ei}" data-si="${si}"
                    value="${s.reps||0}" min="0" max="100"
                    style="padding:5px 8px;font-size:0.85rem;text-align:center" />
                </div>
                <div>
                  <label style="font-size:0.6rem;color:var(--text-muted);display:block">${ex.loadType === 'time' ? 'Intensidade' : (ex.loadType === 'bodyweight' ? 'Extra (kg)' : 'Carga (kg)')}</label>
                  <input type="${(isNumeric(ex.load) && ex.loadType !== 'time') ? 'number' : 'text'}" class="form-input set-load" data-ei="${ei}" data-si="${si}"
                    value="${s.load !== undefined ? s.load : 0}" ${(isNumeric(ex.load) && ex.loadType !== 'time') ? 'min="0" step="0.5"' : ''}
                    style="padding:5px 8px;font-size:0.85rem;text-align:center" />
                </div>
                <div>
                  <label style="font-size:0.6rem;color:var(--text-muted);display:block">PSE</label>
                  <input type="number" class="form-input set-pse" data-ei="${ei}" data-si="${si}"
                    value="${s.pse||''}" min="1" max="10" placeholder="—"
                    style="padding:5px 8px;font-size:0.85rem;text-align:center" />
                </div>
                <div>
                  <label style="font-size:0.6rem;color:var(--text-muted);display:block">RIR</label>
                  <input type="number" class="form-input set-rir" data-ei="${ei}" data-si="${si}"
                    value="${s.rir!=null?s.rir:''}" min="0" max="10" placeholder="—"
                    style="padding:5px 8px;font-size:0.85rem;text-align:center" />
                </div>
              </div>`).join('')}
          </div>`;
      }).join('');

      const pse      = session.postBiofeedback?.pse || '';
      const sessDate = session.date ? session.date.slice(0,10) : Calc.todayLocal();
      const durMin   = Math.round((session.totalDuration || 0) / 60);
      const wkOptions = workouts
        .filter(w => w.studentId === session.studentId)
        .map(w => `<option value="${w.id}" ${w.id===session.workoutId?'selected':''}>${w.name}</option>`)
        .join('');

      openModal({
        title: `Editar Sessão — ${student?.name||'Aluno'}`,
        size: 'xl',
        content: `
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:14px">
            <div class="form-group">
              <label class="form-label">Data</label>
              <input class="form-input" type="date" id="editSessDate" value="${sessDate}" />
            </div>
            <div class="form-group">
              <label class="form-label">Treino</label>
              <select class="form-select" id="editSessWorkout">
                <option value="">— manter atual —</option>
                ${wkOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">PSE geral</label>
              <input class="form-input" type="number" id="editSessPse" value="${pse}" min="1" max="10" placeholder="1-10" />
            </div>
            <div class="form-group">
              <label class="form-label">Duração (min)</label>
              <input class="form-input" type="number" id="editSessDuration" value="${durMin}" min="1" placeholder="min" />
            </div>
          </div>
          <div style="margin-bottom:8px">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">
              Séries por exercício <span style="color:var(--accent);font-weight:400">(edite reps, carga, PSE e RIR)</span>
            </div>
            <div style="max-height:55vh;overflow-y:auto;padding-right:4px">
              ${exRows || '<p style="color:var(--text-muted);font-size:0.85rem">Nenhum exercício registrado</p>'}
            </div>
          </div>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar alterações', class: 'btn-primary', onClick: async () => {
            // Coletar edições das séries
            const newSetLog = [...setLog];
            document.querySelectorAll('.set-reps').forEach(inp => {
              const ei = parseInt(inp.dataset.ei), si = parseInt(inp.dataset.si);
              const idx = newSetLog.findIndex(s => s.exIdx===ei && s.setIdx===si);
              if (idx >= 0) {
                newSetLog[idx] = { ...newSetLog[idx], reps: parseFloat(inp.value)||0 };
              }
            });
            document.querySelectorAll('.set-load').forEach(inp => {
              const ei = parseInt(inp.dataset.ei), si = parseInt(inp.dataset.si);
              const idx = newSetLog.findIndex(s => s.exIdx===ei && s.setIdx===si);
              if (idx >= 0) newSetLog[idx] = { ...newSetLog[idx], load: isNumeric(inp.value) ? parseFloat(inp.value) : inp.value };
            });
            document.querySelectorAll('.set-pse').forEach(inp => {
              const ei = parseInt(inp.dataset.ei), si = parseInt(inp.dataset.si);
              const idx = newSetLog.findIndex(s => s.exIdx===ei && s.setIdx===si);
              if (idx >= 0 && inp.value !== '') newSetLog[idx] = { ...newSetLog[idx], pse: parseInt(inp.value) };
            });
            document.querySelectorAll('.set-rir').forEach(inp => {
              const ei = parseInt(inp.dataset.ei), si = parseInt(inp.dataset.si);
              const idx = newSetLog.findIndex(s => s.exIdx===ei && s.setIdx===si);
              if (idx >= 0 && inp.value !== '') newSetLog[idx] = { ...newSetLog[idx], rir: parseInt(inp.value) };
            });

            // Recalcular totais
            const newVol  = newSetLog.reduce((t,s) => t+((s.reps||0)*(isNumeric(s.load) ? parseFloat(s.load) : 0)), 0);
            const newSets = newSetLog.length;
            const pseParse = parseInt(document.getElementById('editSessPse')?.value)||session.postBiofeedback?.pse||0;
            const newDate  = document.getElementById('editSessDate')?.value || sessDate;
            const newWkId  = document.getElementById('editSessWorkout')?.value || session.workoutId;
            const newWk    = newWkId ? workouts.find(w=>w.id===newWkId) : null;
            const newDurMin = parseInt(document.getElementById('editSessDuration')?.value) || durMin || 0;
            const newTotalDuration = newDurMin * 60;

            const updated = {
              ...session,
              date:         newDate,
              workoutId:    newWkId || session.workoutId,
              workoutName:  newWk?.name || session.workoutName,
              setLog:       newSetLog,
              totalVolume:  Math.round(newVol),
              totalSets:    newSets,
              totalDuration: newTotalDuration,
              workSeconds:  newTotalDuration,
              postBiofeedback: {
                ...(session.postBiofeedback||{}),
                pse: pseParse,
              },
            };

            await db.put('sessions', updated);

            // Sincronizar com tabela biofeedback
            try {
              const allBfs = await db.getAll('biofeedback');
              let bf = allBfs.find(b => b.sessionId === session.id);
              if (!bf) {
                const bfId = 'bf_' + session.studentId + '_' + session.date.substring(0, 10);
                bf = await db.get('biofeedback', bfId);
              }

              const trainingLoad = Calc.cargaTreino ? Calc.cargaTreino(pseParse, newDurMin) : (pseParse * newDurMin);

              if (bf) {
                const updatedBf = {
                  ...bf,
                  date: newDate,
                  pse: pseParse,
                  duration: newDurMin,
                  trainingLoad: trainingLoad,
                };
                const oldBfId = bf.id;
                const newBfId = 'bf_' + session.studentId + '_' + newDate.substring(0, 10);
                if (oldBfId !== newBfId) {
                  await db.delete('biofeedback', oldBfId);
                  updatedBf.id = newBfId;
                }
                await db.put('biofeedback', updatedBf);
              } else {
                const newBfId = 'bf_' + session.studentId + '_' + newDate.substring(0, 10);
                const newBf = {
                  id: newBfId,
                  studentId: session.studentId,
                  date: newDate,
                  pse: pseParse,
                  duration: newDurMin,
                  trainingLoad: trainingLoad,
                  sessionId: session.id,
                  formType: 'complete',
                  submittedAt: new Date().toISOString()
                };
                await db.put('biofeedback', newBf);
              }
            } catch (bfErr) {
              console.error('Erro ao sincronizar biofeedback na edição:', bfErr);
            }

            notify.success('Sessão atualizada!');
            closeModal();
            navigateFn('/tracker');
          }},
        ],
      });
    });
  });

  if (sSel) {
    sSel.addEventListener('change', async () => {
      const sid = sSel.value;
      if (!sid) {
        wSel.disabled = true;
        wSel.innerHTML = '<option>Selecione o aluno primeiro</option>';
        sBtn.disabled = true;
        resetPreBioStatus();
        return;
      }
      const wks = (await db.getAll('workouts'))
        .filter(w => w.studentId === sid)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      wSel.disabled = false;
      wSel.innerHTML = '<option value="">Selecione o treino</option>' +
        wks.map(w => `<option value="${w.id}">${w.name}${w.phase ? ' — ' + w.phase : ''} (${Calc.formatDate(w.date)})</option>`).join('');
      // Verificar se aluno já fez check-in hoje
      await checkPreBioStatus(sid);
      await checkMacroAlert(sid);
    });
    wSel?.addEventListener('change', async () => {
      sBtn.disabled = !wSel.value;
      if (wSel.value) {
        const wk = await db.get('workouts', wSel.value);
        if (wk?.studentId) await checkPreBioStatus(wk.studentId);
      }
    });

    // Função para verificar e exibir status do check-in do aluno
    // Alerta de macrociclo encerrando
    async function checkMacroAlert(sid) {
      if (!sid) return;
      const macros = await db.getAll('macrocycles');
      const now    = Date.now();
      const active = macros
        .filter(m => m.studentId === sid && m.status === 'active' && m.startDate && m.totalWeeks)
        .map(m => {
          const endMs    = new Date(m.startDate + 'T12:00:00').getTime() + m.totalWeeks * 7 * 86400000;
          const daysLeft = Math.ceil((endMs - now) / 86400000);
          return { ...m, daysLeft };
        })
        .filter(m => m.daysLeft >= 0 && m.daysLeft <= 7);

      const banner = document.getElementById('macroBanner');
      if (!banner) return;
      if (!active.length) { banner.style.display = 'none'; return; }

      const m = active[0];
      const color = m.daysLeft <= 1 ? '#ef4444' : m.daysLeft <= 3 ? '#f97316' : '#8b5cf6';
      const label = m.daysLeft === 0 ? 'Encerra hoje!'
                  : m.daysLeft === 1 ? 'Encerra amanhã'
                  : `${m.daysLeft} dias restantes`;
      banner.style.display = '';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
          background:${color}15;border:1px solid ${color}40;border-radius:8px">
          <span style="font-size:1.2rem">⏰</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:0.88rem;color:${color}">Macrociclo encerrando — ${label}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${m.name||'Macrociclo'} · ${m.totalWeeks} sem · Planeje a reavaliação</div>
          </div>
          <a href="#/periodizacao" style="font-size:0.75rem;font-weight:600;color:${color};text-decoration:none">Ver →</a>
        </div>`;
    }

    async function checkPreBioStatus(sid) {
      // Usar getAllForStudent para pegar também formulários públicos
      const allBf = await db.getAllForStudent('biofeedback', sid);
      // Data local YYYY-MM-DD (sem UTC offset)
      const _d = new Date();
      const todayStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
      const todayPre = allBf.find(f =>
        f.studentId === sid &&
        (f.formType === 'pre' || f.formType == null) && // formType null = registro antigo
        (f.date||'').slice(0,10) === todayStr
      );
      const statusEl  = document.getElementById('preBioStatus');
      const loadedEl  = document.getElementById('preBioLoaded');
      const emptyEl   = document.getElementById('preBioEmpty');
      const valuesEl  = document.getElementById('preBioValues');
      if (!statusEl) return;
      if (todayPre) {
        statusEl.style.borderColor = 'rgba(16,185,129,0.4)';
        statusEl.style.background  = 'rgba(16,185,129,0.08)';
        if (loadedEl) loadedEl.style.display = '';
        if (emptyEl)  emptyEl.style.display  = 'none';
        if (valuesEl) {
          const vals = [
            ['Sono',        todayPre.sleep,                  false],
            ['Alim. (24h)', todayPre.food||null,             false],
            ['TQR',         (todayPre.tqr??todayPre.energy),  false],
            ['Mental',      todayPre.stress,                  true],
            ['Dor',         todayPre.pain,                    true],
            ['Motivação',   todayPre.motivation,             false],
            todayPre.menstrualCycle ? ['Ciclo', '●', false] : null,
          ];
          valuesEl.innerHTML = vals.filter(Boolean).map(([l,v,inv])=>{
            let displayVal = v;
            if (v != null) {
              if (l === 'Sono') displayVal = `${Math.round(v / 2)}/5`;
              else if (l === 'Alim. (24h)') displayVal = `${v}/5`;
              else if (l === 'TQR') displayVal = `${v}/10`;
              else if (l === 'Mental') displayVal = `${v}/10`;
              else if (l === 'Dor') displayVal = `${v > 8 ? 5 : v > 6 ? 4 : v > 4 ? 3 : v > 2 ? 2 : 1}/5`;
              else if (l === 'Motivação') displayVal = `${Math.round(v / 2)}/5`;
            }
            return `
              <span style="padding:3px 8px;border-radius:12px;background:var(--bg-page);border:1px solid var(--border-color);color:${
                v==null?'var(--text-muted)':inv?(v>=7?'var(--danger)':v>=5?'var(--warning)':'var(--success)'):(v<=3?'var(--danger)':v<=5?'var(--warning)':'var(--success)')
              }">
                ${l} <strong>${displayVal??'—'}</strong>
              </span>`;
          }).join('');
        }
      } else {
        resetPreBioStatus();
      }
    }

    function resetPreBioStatus() {
      const statusEl = document.getElementById('preBioStatus');
      const loadedEl = document.getElementById('preBioLoaded');
      const emptyEl  = document.getElementById('preBioEmpty');
      if (statusEl) { statusEl.style.borderColor=''; statusEl.style.background=''; }
      if (loadedEl) loadedEl.style.display = 'none';
      if (emptyEl)  emptyEl.style.display  = '';
    }

    const autoData = sessionStorage.getItem('pp_autostart');
    if (autoData) {
      sessionStorage.removeItem('pp_autostart');
      try {
        const { studentId, workoutId } = JSON.parse(autoData);
        if (studentId) { sSel.value = studentId; sSel.dispatchEvent(new Event('change')); setTimeout(() => { if (workoutId) { wSel.value = workoutId; wSel.dispatchEvent(new Event('change')); } }, 300); }
      } catch(_) {}
    }
  }

  document.getElementById('genPreLinkBtn')?.addEventListener('click', async () => {
    const sid = sSel?.value;
    if (!sid) { notify.warning('Selecione um aluno primeiro'); return; }
    const students = await db.getAll('students');
    const st = students.find(x => x.id === sid) || {};
    const url = `${window.location.origin}${window.location.pathname}#/form/pre/${sid}?t=${st.trainerId||st.trainer_id||''}&n=${encodeURIComponent(st.name||'')}`;
    navigator.clipboard?.writeText(url);
    notify.success('Link pré-treino copiado!');
    openModal({
      title: 'Link Pré-Treino', size: 'sm',
      content: `<p class="text-muted text-sm mb-md">Envie para o aluno preencher:</p>
        <div style="display:flex;gap:8px">
          <input class="form-input" value="${url}" readonly onclick="this.select()" style="font-size:0.78rem;flex:1" />
          <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${url}');this.textContent='✓'">Copiar</button>
        </div>
        <a href="https://wa.me/?text=${encodeURIComponent('Check-in pré-treino: ' + url)}" target="_blank" class="btn btn-secondary btn-sm mt-sm">WhatsApp</a>`,
      actions: [{ label: 'Fechar', class: 'btn-primary', onClick: () => closeModal() }]
    });
  });

  sBtn?.addEventListener('click', async () => {
    const wk = await db.get('workouts', wSel.value);
    if (!wk) return;
    const preBf = { 
      sleep: 8, 
      food: 5, 
      motivation: 8, 
      stress: 5, 
      tqr: 5, 
      energy: 5, 
      pain: 0, 
      painRegions: [], 
      menstrual: false, 
      mood: 6,
      notes: ''
    }; // defaults neutros
    // Carregar check-in do aluno via getAllForStudent (pega formulários públicos)
    const _d2 = new Date();
    const todayStr2 = `${_d2.getFullYear()}-${String(_d2.getMonth()+1).padStart(2,'0')}-${String(_d2.getDate()).padStart(2,'0')}`;
    const allBf = await db.getAllForStudent('biofeedback', wk.studentId);
    const todayPre = allBf.find(f =>
      f.studentId === wk.studentId &&
      (f.formType === 'pre' || f.formType == null) &&
      (f.date||'').slice(0,10) === todayStr2
    );
    if (todayPre) {
      Object.assign(preBf, {
        sleep:       todayPre.sleep,
        food:        todayPre.food,
        motivation:  todayPre.motivation,
        stress:      todayPre.stress,
        tqr:         todayPre.tqr ?? todayPre.energy,
        energy:      todayPre.tqr ?? todayPre.energy,
        pain:        todayPre.pain,
        painRegions: todayPre.painRegions || [],
        menstrual:   todayPre.menstrual === true || todayPre.menstrual === 'sim',
        mood:        todayPre.mood ?? Math.round((todayPre.sleep + (todayPre.tqr ?? todayPre.energy)) / 2),
        notes:       todayPre.notes || '',
      });
      notify.success('Dados pré-treino do aluno carregados!');
    }
    const session = { studentId: wk.studentId, workoutId: wk.id, workoutName: wk.name, exercises: JSON.parse(JSON.stringify(wk.exercises || [])), date: Calc.nowISO(), startTime: Date.now(), status: 'running', soundEnabled: document.getElementById('trkSound')?.checked !== false, preBiofeedback: preBf, setLog: [], isResting: false, stateChangedAt: Date.now() };
    const saved = await db.add('sessions', session);
    resetState();
    state.session = { ...session, id: saved.id };
    notify.success('Sessão iniciada!');
    navigateFn('/tracker');
  });

  if (!state.session) return;

  // Recovery of work and rest timers
  {
    const curEx = (state.session.exercises || [])[state.exIdx] || {};
    const exs_all = state.session.exercises || [];
    const isCombinedEx = COMBINED_METHODS?.has(curEx.method);
    const nextEx = exs_all[state.exIdx + 1];
    const isLastOfGroup = !nextEx
      || (curEx.groupId ? nextEx.groupId !== curEx.groupId : (nextEx.method !== curEx.method || !COMBINED_METHODS?.has(nextEx.method)));
    let curRestDur = isCombinedEx && !isLastOfGroup ? 0 : (parseInt(curEx.rest) || 60);

    let progression = curEx.seriesProgression;
    if (!progression && curEx.method && METHOD_PROGRESSIONS[curEx.method]) {
      const progDef = METHOD_PROGRESSIONS[curEx.method];
      const baseLoad = parseFloat(curEx.load) || 0;
      progression = progDef.series.map((s, si) => ({
        set: si + 1,
        reps: s.reps,
        load: baseLoad > 0 ? Math.round(baseLoad * s.loadPct * 2) / 2 : 0,
        rest: (isCombinedEx && s.rest === 0) ? 0 : (s.rest != null ? s.rest : parseInt(curEx.rest || 60)),
        label: s.label || `Série ${si + 1}`
      }));
    }

    if (progression && progression[state.setIdx]) {
      const sRest = progression[state.setIdx].rest;
      if (sRest != null) curRestDur = parseInt(sRest);
      if (isCombinedEx && !isLastOfGroup) curRestDur = 0;
    }

    const now = Date.now();
    const stateChangedAt = state.session.stateChangedAt || state.session.startTime || now;
    const timePassed = Math.floor((now - stateChangedAt) / 1000);

    let workElapsed = 0;
    let restElapsed = 0;
    let runRestTimer = false;

    if (state.isResting) {
      const targetRest = state.session.restDuration || curRestDur;
      if (timePassed < targetRest) {
        restElapsed = timePassed;
        runRestTimer = true;
      } else {
        // Rest timer finished in background
        state.isResting = false;
        state.session.isResting = false;
        state.session.stateChangedAt = stateChangedAt + (targetRest * 1000);
        const extraSec = timePassed - targetRest;
        if (extraSec < 1800) {
          workElapsed = extraSec;
        }
        db.put('sessions', {
          ...state.session,
          isResting: false,
          stateChangedAt: state.session.stateChangedAt,
          workSec: state.workSec
        }).catch(e => console.warn('[recovery save] falhou:', e?.message));
      }
    } else {
      // User was working
      if (timePassed < 1800) {
        workElapsed = timePassed;
      }
    }

    // Total timer
    if (!state.workoutTimer) {
      const e0 = Math.floor((Date.now() - state.session.startTime) / 1000);
      state.workoutTimer = new Timer({ mode: 'stopwatch' });
      state.workoutTimer.elapsed = e0;
      state.workoutTimer.start();
    }

    // Work timer
    if (!state.workTimer) {
      state.workTimer = new Timer({ mode: 'stopwatch' });
      state.workTimer.elapsed = workElapsed;
      if (!state.isResting) state.workTimer.start();
    }

    // Rest timer (pre-initialize if active)
    if (runRestTimer && !state.restTimer) {
      const targetRest = state.session.restDuration || curRestDur;
      state.restTimer = new Timer({
        mode: 'countdown',
        duration: targetRest,
        soundEnabled: state.session.soundEnabled !== false
      });
      state.restTimer.elapsed = restElapsed;
      state.restTimer.start();
    }
  }

  // UI loop
  const updateUI = () => {
    if (!state.session) return;
    const tot  = state.workoutTimer?.getElapsed() || 0;
    // workSec acumulado: soma do tempo de trabalho de todas as séries anteriores
    // + tempo atual do workTimer (se estiver rodando)
    const currentWork = state.isResting ? 0 : (state.workTimer?.getElapsed() || 0);
    const totalWork = Math.min(tot, state.workSec + currentWork);
    const t = document.getElementById('liveTotal');
    const w = document.getElementById('liveWork');
    const r = document.getElementById('liveRest');
    const d = document.getElementById('liveDens');
    const tag = document.getElementById('restStateTag');
    if (t) t.textContent = formatTime(tot);
    if (w) { w.textContent = formatTime(totalWork); w.style.color = state.isResting ? 'var(--text-muted)' : 'var(--success)'; }
    if (r) { r.textContent = formatTime(Math.max(0, tot - totalWork)); r.style.color = state.isResting ? 'var(--warning)' : 'var(--text-muted)'; }
    if (d) d.textContent = tot > 0 ? (totalWork / tot).toFixed(2) : '0.00';
    if (tag) { tag.textContent = state.isResting ? '⏸ DESCANSANDO' : '▶ TRABALHANDO'; tag.style.color = state.isResting ? 'var(--warning)' : 'var(--success)'; }
  };
  state._uiInterval = setInterval(updateUI, 500);
  updateUI();

  // ── AUTOSAVE: persiste estado da sessão a cada 30s e ao minimizar ──
  async function autoSaveSession() {
    if (!state.session?.id) return;
    try {
      // Coletar tempSets atual dos inputs visíveis
      const currentTempSets = { ...state.tempSets };
      document.querySelectorAll('.set-row').forEach(row => {
        const si = parseInt(row.dataset.si);
        const ei = state.exIdx;
        const reps = row.querySelector('.set-reps')?.value;
        const load = row.querySelector('.set-load')?.value;
        const pse  = row.querySelector('.set-pse')?.value;
        const rir  = row.querySelector('.set-rir')?.value;
        if (!currentTempSets[ei]) currentTempSets[ei] = {};
        if (reps !== '') currentTempSets[ei][si] = { ...currentTempSets[ei][si], reps: parseInt(reps)||0 };
        if (load !== '') currentTempSets[ei][si] = { ...currentTempSets[ei][si], load: parseFloat(load)||0 };
        if (pse  !== '') currentTempSets[ei][si] = { ...currentTempSets[ei][si], pse:  parseInt(pse)||null };
        if (rir  !== '') currentTempSets[ei][si] = { ...currentTempSets[ei][si], rir:  parseInt(rir) };
      });

      await db.put('sessions', {
        ...state.session,
        setLog:        state.setLog,
        currentExIdx:  state.exIdx,
        workSec:       state.workSec,
        tempSets:      currentTempSets,
        lastAutoSave:  new Date().toISOString(),
        status: 'running',
        isResting:     state.isResting,
        stateChangedAt: state.session.stateChangedAt || state.session.startTime,
        restDuration:  state.session.restDuration || 0
      });
    } catch(e) {
      console.warn('[autosave] falhou:', e?.message);
    }
  }

  // Limpar listeners antigos antes de registrar novos (evita acúmulo)
  if (state.autoSaveInterval) clearInterval(state.autoSaveInterval);
  if (state.onVisibilityChange) document.removeEventListener('visibilitychange', state.onVisibilityChange);
  if (state.onBeforeUnload) window.removeEventListener('beforeunload', state.onBeforeUnload);

  state.autoSaveInterval = setInterval(autoSaveSession, 30000);

  // Salvar ao minimizar / trocar de aba
  state.onVisibilityChange = () => {
    if (document.hidden) autoSaveSession();
  };
  document.addEventListener('visibilitychange', state.onVisibilityChange);

  // Salvar ao fechar a aba (beforeunload)
  state.onBeforeUnload = () => autoSaveSession();
  window.addEventListener('beforeunload', state.onBeforeUnload);

  // Limpar listeners ao finalizar
  function cleanupAutoSave() {
    if (state.autoSaveInterval) { clearInterval(state.autoSaveInterval); state.autoSaveInterval = null; }
    if (state.onVisibilityChange) {
      document.removeEventListener('visibilitychange', state.onVisibilityChange);
      state.onVisibilityChange = null;
    }
    if (state.onBeforeUnload) {
      window.removeEventListener('beforeunload', state.onBeforeUnload);
      state.onBeforeUnload = null;
    }
  }
  const curEx   = (state.session.exercises || [])[state.exIdx] || {};
  const exs_all = state.session.exercises || [];

  // ── Lógica de descanso para métodos combinados ──────────────────────────
  // Bi-set/Tri-set/Super-série: descanso=0 no exercício atual (vai pro próximo imediatamente)
  // O descanso real dispara apenas no ÚLTIMO exercício do grupo
  const isCombinedEx  = COMBINED_METHODS?.has(curEx.method);
  const nextEx        = exs_all[state.exIdx + 1];
  // Usar groupId se disponível, fallback para método consecutivo
  const isLastOfGroup = !nextEx
    || (curEx.groupId ? nextEx.groupId !== curEx.groupId : (nextEx.method !== curEx.method || !COMBINED_METHODS?.has(nextEx.method)));
  // restDur efetivo: 0 se combinado e não é o último, senão usa o rest configurado
  let restDur = isCombinedEx && !isLastOfGroup ? 0 : (parseInt(curEx.rest) || 60);

  let progression = curEx.seriesProgression;
  if (!progression && curEx.method && METHOD_PROGRESSIONS[curEx.method]) {
    const progDef = METHOD_PROGRESSIONS[curEx.method];
    const baseLoad = parseFloat(curEx.load) || 0;
    progression = progDef.series.map((s, si) => ({
      set: si + 1,
      reps: s.reps,
      load: baseLoad > 0 ? Math.round(baseLoad * s.loadPct * 2) / 2 : 0,
      rest: (isCombinedEx && s.rest === 0) ? 0 : (s.rest != null ? s.rest : parseInt(curEx.rest || 60)),
      label: s.label || `Série ${si + 1}`
    }));
  }

  if (progression && progression[state.setIdx]) {
    const sRest = progression[state.setIdx].rest;
    if (sRest != null) restDur = parseInt(sRest);
    // Override: se combinado e não-último, forçar 0
    if (isCombinedEx && !isLastOfGroup) restDur = 0;
  }

  if (!state.restTimer) {
    // Criar pela primeira vez
    state.restTimer = new Timer({
      mode: 'countdown', duration: restDur,
      soundEnabled: state.session.soundEnabled !== false,
      onTick: (rem) => {
        const c = document.getElementById('restCount');
        const l = document.getElementById('restLbl');
        if (c) { c.textContent = formatTime(rem); c.style.color = rem<=5?'var(--danger)':rem<=15?'var(--warning)':'var(--accent)'; }
        if (l) l.textContent = 'Descansando...';
      },
      onComplete: () => {
        const c = document.getElementById('restCount');
        const l = document.getElementById('restLbl');
        const b = document.getElementById('goRest');
        if (c) { c.textContent = '00:00'; c.style.color = 'var(--primary)'; }
        if (l) { l.textContent = 'HORA DE TREINAR!'; l.style.color = 'var(--primary)'; }
        if (b) b.textContent = '▶ Iniciar Descanso';
        state.isResting = false;
        if (state.session) {
          state.session.isResting = false;
          state.session.stateChangedAt = Date.now();
        }
        autoSaveSession();
        state.workTimer?.start();
        notify.success('Descanso finalizado!');
      }
    });
  } else {
    // Já existe — apenas reconectar os callbacks ao novo DOM
    if (!state.restTimer.running) {
      state.restTimer.setDuration(restDur);
    }
    state.restTimer.onTick = (rem) => {
      const c = document.getElementById('restCount');
      const l = document.getElementById('restLbl');
      if (c) { c.textContent = formatTime(rem); c.style.color = rem<=5?'var(--danger)':rem<=15?'var(--warning)':'var(--accent)'; }
      if (l) l.textContent = 'Descansando...';
    };
    state.restTimer.onComplete = () => {
      const c = document.getElementById('restCount');
      const l = document.getElementById('restLbl');
      const b = document.getElementById('goRest');
      if (c) { c.textContent = '00:00'; c.style.color = 'var(--primary)'; }
      if (l) { l.textContent = 'HORA DE TREINAR!'; l.style.color = 'var(--primary)'; }
      if (b) b.textContent = '▶ Iniciar Descanso';
      state.isResting = false;
      if (state.session) {
        state.session.isResting = false;
        state.session.stateChangedAt = Date.now();
      }
      autoSaveSession();
      state.workTimer?.start();
      notify.success('Descanso finalizado!');
    };
    // Atualizar display com o tempo atual
    const c = document.getElementById('restCount');
    const b = document.getElementById('goRest');
    if (c) {
      const rem = state.restTimer.running ? state.restTimer.getRemaining?.() : state.restTimer.duration;
      if (rem != null) { c.textContent = formatTime(rem); }
    }
    if (b) b.textContent = state.restTimer.running ? '⏸ Pausar Descanso' : '▶ Iniciar Descanso';
  }

  document.getElementById('goRest')?.addEventListener('click', () => {
    state.restTimer.soundEnabled = document.getElementById('sndToggle')?.checked !== false;
    const btn = document.getElementById('goRest');
    if (state.restTimer.running) {
      state.restTimer.stop();
      state.isResting = false;
      if (state.session) {
        state.session.isResting = false;
        state.session.stateChangedAt = Date.now();
      }
      autoSaveSession();
      state.workTimer?.start();
      if (btn) btn.textContent = '▶ Iniciar Descanso';
    } else {
      state.restTimer.reset(); state.restTimer.start();
      state.isResting = true;
      // Acumular tempo de trabalho ANTES de parar e resetar o workTimer
      state.workSec = (state.workSec || 0) + (state.workTimer?.getElapsed() || 0);
      state.workTimer?.stop(); state.workTimer?.reset();
      if (state.session) {
        state.session.isResting = true;
        state.session.stateChangedAt = Date.now();
        state.session.restDuration = state.restTimer.duration;
      }
      autoSaveSession();
      if (btn) btn.textContent = '⏸ Pausar Descanso';
      const l = document.getElementById('restLbl');
      if (l) { l.textContent = 'Descansando...'; l.style.color = ''; }
    }
  });

  document.getElementById('rstRest')?.addEventListener('click', () => {
    state.restTimer.stop(); state.restTimer.reset();
    state.isResting = false;
    if (state.session) {
      state.session.isResting = false;
      state.session.stateChangedAt = Date.now();
    }
    autoSaveSession();
    state.workTimer?.start();
    const c = document.getElementById('restCount');
    const l = document.getElementById('restLbl');
    const b = document.getElementById('goRest');
    if (c) { c.textContent = formatTime(state.restTimer.duration); c.style.color = 'var(--accent)'; }
    if (l) { l.textContent = 'Pronto para descansar'; l.style.color = ''; }
    if (b) b.textContent = '▶ Iniciar Descanso';
  });

  document.querySelectorAll('.rp').forEach(b => b.addEventListener('click', () => {
    const t = parseInt(b.dataset.t);
    state.restTimer.stop(); state.restTimer.reset(); state.restTimer.setDuration(t);
    const c = document.getElementById('restCount');
    if (c) { c.textContent = formatTime(t); c.style.color = 'var(--accent)'; }
  }));

  document.getElementById('sndToggle')?.addEventListener('change', e => { state.restTimer.soundEnabled = e.target.checked; });

  // Modal de confirmação de série com PSE e RIR
  function showSetModal(btn) {
    const i    = parseInt(btn.dataset.i);
    const row  = btn.closest('.set-row');
    const reps = row.querySelector('.set-reps')?.value || '';
    const load = row.querySelector('.set-load')?.value || '';
    const ex   = (state.session?.exercises || [])[state.exIdx] || {};

    // Remover modal anterior se existir
    document.getElementById('setConfirmModal')?.remove();

    // Start rest timer immediately while the user fills the modal
    const exSets = parseInt(curEx?.sets || ex?.sets) || 3;
    
    let restDur = parseInt(ex.rest) || 60;
    let progression = ex.seriesProgression;
    if (!progression && ex.method && METHOD_PROGRESSIONS[ex.method]) {
      const progDef = METHOD_PROGRESSIONS[ex.method];
      const baseLoad = parseFloat(ex.load) || 0;
      progression = progDef.series.map((s, si) => ({
        set: si + 1,
        reps: s.reps,
        load: baseLoad > 0 ? Math.round(baseLoad * s.loadPct * 2) / 2 : 0,
        rest: s.rest != null ? s.rest : parseInt(ex.rest || 60),
        label: s.label || `Série ${si + 1}`
      }));
    }
    if (progression && progression[i]) {
      const sRest = progression[i].rest;
      if (sRest != null) restDur = parseInt(sRest);
    }

    state.restTimer.setDuration(restDur);
    // Sempre iniciar o descanso após uma série, mesmo sendo a última
    state.restTimer.reset(); state.restTimer.start();
    state.isResting = true;
    // Acumular tempo de trabalho ANTES de parar e resetar o workTimer
    state.workSec = (state.workSec || 0) + (state.workTimer?.getElapsed() || 0);
    state.workTimer?.stop(); state.workTimer?.reset();
    if (state.session) {
      state.session.isResting = true;
      state.session.stateChangedAt = Date.now();
      state.session.restDuration = restDur;
    }
    autoSaveSession();
    const c = document.getElementById('restCount');
    const l = document.getElementById('restLbl');
    const b2 = document.getElementById('goRest');
    if (c) { c.textContent = formatTime(state.restTimer.duration); c.style.color='var(--warning)'; }
    if (l) l.textContent = `Descansando após série ${i+1}...`;
    if (b2) b2.textContent = '⏸ Pausar Descanso';

    const modal = document.createElement('div');
    modal.id = 'setConfirmModal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      display:flex;align-items:flex-end;justify-content:center;
      background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
    `;
    modal.innerHTML = `
      <div style="
        background:#111827;border:1px solid rgba(255,255,255,0.1);
        border-radius:16px 16px 0 0;padding:20px 20px 32px;
        width:100%;max-width:440px;
        animation:slideUp 0.2s ease;
      ">
        <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div>
            <div style="font-weight:700;font-size:1rem;color:#f1f5f9">Série ${i+1} concluída</div>
            <div style="font-size:0.78rem;color:#64748b;margin-top:2px">${ex.name||'Exercício'}</div>
          </div>
          <button id="closeSetModal" style="background:none;border:none;color:#64748b;font-size:1.2rem;cursor:pointer;padding:4px">✕</button>
        </div>

        <!-- Carga e Reps -->
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div style="flex:1">
            <label style="display:block;font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Reps Realizadas</label>
            <input id="modalSetReps" type="number" value="${reps||''}" style="width:100%;padding:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#e2e8f0;font-size:1rem;text-align:center" />
          </div>
          <div style="flex:1">
            <label style="display:block;font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">${ex.loadType === 'time' ? 'Intensidade' : (ex.loadType === 'bodyweight' ? 'Extra (kg)' : 'Carga (kg)')}</label>
            <input id="modalSetLoad" type="${(isNumeric(ex.load) && ex.loadType !== 'time') ? 'number' : 'text'}" ${(isNumeric(ex.load) && ex.loadType !== 'time') ? 'step="0.5"' : ''} value="${load||''}" style="width:100%;padding:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#e2e8f0;font-size:1rem;text-align:center" />
          </div>
        </div>

        <!-- PSE -->
        <div style="margin-bottom:16px">
          <div style="font-size:0.7rem;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">
            PSE — Percepção de Esforço
          </div>
          <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:6px">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => {
              const color = n<=3?'#10b981':n<=5?'#22c55e':n<=7?'#f59e0b':n<=9?'#ef4444':'#dc2626';
              const labels = {1:'Mínimo',2:'M. Fácil',3:'Fácil',4:'Moderado',5:'P. Difícil',6:'Difícil',7:'M. Difícil',8:'V. Difícil',9:'Extremo',10:'Máximo'};
              return `<button class="pse-btn" data-v="${n}" style="
                padding:6px 2px;display:flex;flex-direction:column;align-items:center;
                background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                border-radius:8px;cursor:pointer;transition:all 0.1s;
              ">
                <span style="font-size:1rem;font-weight:700;color:${color}">${n}</span>
                <span style="font-size:0.55rem;color:#94a3b8;margin-top:2px;text-align:center;line-height:1.1">${labels[n]}</span>
              </button>`;
            }).join('')}
          </div>
          <div id="pseLabel" style="font-size:0.72rem;color:#94a3b8;margin-top:6px;min-height:16px;text-align:center;font-weight:600"></div>
        </div>

        <!-- RIR -->
        <div style="margin-bottom:20px">
          <div style="font-size:0.7rem;font-weight:700;color:#06b6d4;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">
            RIR — Reps sobrando no tanque
          </div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px">
            ${[0,1,2,3,4,5].map(n => {
              const labels = {0:'Falha Total',1:'1 rep',2:'2 reps',3:'3 reps',4:'4 reps',5:'5+ reps'};
              return `<button class="rir-btn" data-v="${n}" style="
                padding:6px 2px;display:flex;flex-direction:column;align-items:center;
                background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                border-radius:8px;cursor:pointer;transition:all 0.1s;
              ">
                <span style="font-size:1rem;font-weight:700;color:#06b6d4">${n}</span>
                <span style="font-size:0.55rem;color:#94a3b8;margin-top:2px">${labels[n]}</span>
              </button>`;
            }).join('')}
          </div>
          <div id="rirLabel" style="font-size:0.72rem;color:#94a3b8;margin-top:6px;min-height:16px;text-align:center;font-weight:600"></div>
        </div>

        <!-- Notas -->
        <div style="margin-bottom:16px">
          <input id="modalSetNotes" type="text" placeholder="Observação (opcional)"
            style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.04);
            border:1px solid rgba(255,255,255,0.08);border-radius:8px;
            color:#e2e8f0;font-size:0.85rem;font-family:inherit" />
        </div>

        <button id="confirmSetBtn" style="
          width:100%;padding:14px;background:#10b981;color:#fff;border:none;
          border-radius:10px;font-size:0.95rem;font-weight:700;cursor:pointer;
          opacity:0.5;pointer-events:none;
        ">Confirmar série</button>
      </div>
    `;

    document.body.appendChild(modal);

    let selPse = 0, selRir = null;
    const pseLabels = {1:'Repouso',2:'Muito fácil',3:'Fácil',4:'Moderado',5:'Um pouco difícil',6:'Difícil',7:'Muito difícil',8:'Muito difícil',9:'Extenuante',10:'Máximo absoluto'};
    const rirLbls  = {0:'Falha — não conseguiria mais nenhuma',1:'1 repetição sobrando',2:'2 repetições sobrando',3:'3 repetições sobrando',4:'4 repetições sobrando',5:'5 ou mais sobrando'};

    modal.querySelectorAll('.pse-btn').forEach(b => {
      b.addEventListener('click', () => {
        modal.querySelectorAll('.pse-btn').forEach(x => x.style.background='rgba(255,255,255,0.04)');
        b.style.background = 'rgba(245,158,11,0.2)';
        b.style.borderColor = 'rgba(245,158,11,0.6)';
        selPse = parseInt(b.dataset.v);
        document.getElementById('pseLabel').textContent = pseLabels[selPse]||'';
        updateConfirm();
      });
    });

    modal.querySelectorAll('.rir-btn').forEach(b => {
      b.addEventListener('click', () => {
        modal.querySelectorAll('.rir-btn').forEach(x => { x.style.background='rgba(255,255,255,0.04)'; x.style.borderColor='rgba(255,255,255,0.08)'; });
        b.style.background = 'rgba(6,182,212,0.15)';
        b.style.borderColor = 'rgba(6,182,212,0.5)';
        selRir = parseInt(b.dataset.v);
        document.getElementById('rirLabel').textContent = rirLbls[selRir]||'';
        updateConfirm();
      });
    });

    function updateConfirm() {
      const btn2 = document.getElementById('confirmSetBtn');
      if (selPse > 0) {
        btn2.style.opacity = '1'; btn2.style.pointerEvents = 'auto';
      }
    }

    document.getElementById('closeSetModal')?.addEventListener('click', () => modal.remove());
    let isMouseDownOnModal = false;
    modal.addEventListener('mousedown', e => { isMouseDownOnModal = (e.target === modal); });
    modal.addEventListener('mouseup', e => {
      if (isMouseDownOnModal && e.target === modal) modal.remove();
      isMouseDownOnModal = false;
    });

    document.getElementById('confirmSetBtn')?.addEventListener('click', () => {
      if (!selPse) return;
      const notes = document.getElementById('modalSetNotes')?.value || '';
      
      const modalReps = document.getElementById('modalSetReps')?.value;
      const modalLoad = document.getElementById('modalSetLoad')?.value;
      const repInp = row.querySelector('.set-reps');
      const loadInp = row.querySelector('.set-load');
      if (repInp && modalReps !== undefined) repInp.value = modalReps;
      if (loadInp && modalLoad !== undefined) loadInp.value = modalLoad;

      modal.remove();
      completeSet(btn, i, row, selPse, selRir, notes);
    });
  }

  function completeSet(btn, i, row, pse, rir, notes) {
      const reps  = parseInt(row.querySelector('.set-reps')?.value) || 0;
      const load  = row.querySelector('.set-load')?.value;
      const loadN = isNumeric(load) ? parseFloat(load) : 0;

      if (rir === 0 && pse > 0 && pse < 7) {
        notify.warning('RIR 0 (falha) com PSE baixo — verifique os valores.');
      }

      const ex = (state.session?.exercises || [])[state.exIdx] || {};
      let rm1Estimated = null;
      if (loadN > 0 && reps > 0 && reps <= 12) {
        rm1Estimated = Math.round((loadN * (1 + reps / 30)) * 2) / 2;
      }

      state.setLog.push({ exIdx: state.exIdx, setIdx: i, reps, load, pse, rir, notes, rm1Estimated, time: Date.now() });

      row.classList.add('set-done'); row.classList.remove('set-active');
      row.style.background = 'rgba(16,185,129,0.04)';
      
      const pseInp = row.querySelector('.set-pse');
      const rirInp = row.querySelector('.set-rir');
      if (pseInp) pseInp.value = pse;
      if (rirInp && rir != null) rirInp.value = rir;

      row.querySelectorAll('input').forEach(inp => inp.disabled = true);
      
      const doneDiv = document.createElement('div');
      doneDiv.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;min-width:38px';
      doneDiv.innerHTML = `
        ${pse ? `<span style="font-size:0.6rem;color:var(--warning)">PSE ${pse}</span>` : ''}
        <span class="badge badge-success" style="text-align:center;font-size:0.72rem;padding:2px 6px">✓</span>
        ${rir != null ? `<span style="font-size:0.6rem;color:var(--accent)">RIR ${rir}</span>` : ''}
      `;
      btn.replaceWith(doneDiv);

      const isCardio = isCardioExercise(curEx);
      const segs = isCardio ? getCardioSegments(curEx) : [];
      const exSets = (isCardio && segs.length > 0) ? segs.length : (parseInt(curEx.sets) || 3);

      const rirTxt = rir != null ? ` RIR ${rir}` : '';
      const loadDisplay = isNumeric(load) ? `${load}kg` : load;
      notify.info(`Série ${i+1} ✓ — ${reps}×${loadDisplay} PSE ${pse}${rirTxt}`);

      // Avançar para próxima série
      state.setIdx = i + 1;
      const nr = document.querySelector(`[data-si="${i+1}"]`);
      if (nr) { nr.classList.add('set-active'); nr.style.background = 'rgba(16,185,129,0.08)'; }

      // Atualizar volume e progresso
      const volEl = document.getElementById('liveVol');
      if (volEl) volEl.textContent = totalVolume() + ' kg';
      const totalS = (state.session.exercises||[]).reduce((s,e) => {
        if (isCardioExercise(e)) {
          const segs2 = getCardioSegments(e);
          if (segs2.length > 0) return s + segs2.length;
        }
        return s + (parseInt(e.sets)||3);
      }, 0);
      const fill   = document.querySelector('.progress-fill');
      if (fill) fill.style.width = Math.round((state.setLog.length/totalS)*100)+'%';

      state.session.setLog = state.setLog;
      renderProgress();
  }

  // Initialize embedded cardio chart if current exercise is cardio
  if (state.session) {
    const curEx = (state.session.exercises || [])[state.exIdx];
    if (curEx && isCardioExercise(curEx)) {
      initEmbeddedCardioChartTrainer('cardioEmbedChart_trainer', curEx);
    }
  }

  // Completar série — abre modal
  document.querySelectorAll('.do-set').forEach(btn => {
    btn.addEventListener('click', () => showSetModal(btn));
  });

  // Salvar entradas temporárias conforme o usuário digita
  document.querySelectorAll('.set-row:not(.set-done)').forEach(row => {
    const si = parseInt(row.dataset.si);
    const repsInp = row.querySelector('.set-reps');
    const loadInp = row.querySelector('.set-load');
    const pseInp  = row.querySelector('.set-pse');
    const rirInp  = row.querySelector('.set-rir');

    const updateTemp = () => {
      if (!state.tempSets[state.exIdx]) state.tempSets[state.exIdx] = {};
      const existing = state.tempSets[state.exIdx][si] || {};
      state.tempSets[state.exIdx][si] = {
        reps: repsInp?.value ? parseInt(repsInp.value) : existing.reps,
        load: loadInp?.value ? loadInp.value : existing.load,
        pse:  pseInp?.value  ? parseInt(pseInp.value)  : existing.pse,
        rir:  rirInp?.value  ? parseInt(rirInp.value)  : existing.rir,
      };
    };

    repsInp?.addEventListener('input', updateTemp);
    loadInp?.addEventListener('input', updateTemp);
    pseInp?.addEventListener('input', updateTemp);
    rirInp?.addEventListener('input', updateTemp);
  });

  // Navegar exercícios
  const refreshLive = async () => {
    if (state._uiInterval) { clearInterval(state._uiInterval); state._uiInterval = null; }
    const students = await db.getAll('students');
    const content  = document.getElementById('pageContent');
    if (content && state.session) { content.innerHTML = renderLiveView(students); initTracker(navigateFn); }
  };
  document.getElementById('prevEx')?.addEventListener('click', () => { saveCurrentInputs(); if (state.exIdx > 0) { state.exIdx--; state.setIdx = 0; refreshLive(); } });
  document.getElementById('nextEx')?.addEventListener('click', () => { saveCurrentInputs(); if (state.exIdx < (state.session.exercises||[]).length-1) { state.exIdx++; state.setIdx = 0; refreshLive(); } });
  document.querySelectorAll('.go-ex').forEach(el => el.addEventListener('click', () => { saveCurrentInputs(); state.exIdx = parseInt(el.dataset.g); state.setIdx = 0; refreshLive(); }));

  document.getElementById('editExLiveBtn')?.addEventListener('click', () => {
    saveCurrentInputs();
    const curEx = state.session.exercises[state.exIdx];
    if (!curEx) return;

    openModal({
      title: 'Editar Exercício', size: 'md',
      content: `
        <div class="form-group">
          <label class="form-label">Nome do Exercício</label>
          <input class="form-input" id="editExLiveName" value="${curEx.name||''}" />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Séries</label>
            <input class="form-input" type="number" id="editExLiveSets" value="${curEx.sets||3}" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label">Reps</label>
            <input class="form-input" id="editExLiveReps" value="${curEx.reps||'12'}" />
          </div>
          <div class="form-group">
            <label class="form-label">Carga / Zona</label>
            <input class="form-input" id="editExLiveLoad" value="${curEx.load||''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Descanso (s)</label>
            <input class="form-input" type="number" id="editExLiveRest" value="${curEx.rest||60}" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">1RM (kg)</label>
            <input class="form-input" type="number" id="editExLiveOneRM" value="${curEx.oneRM||''}" step="0.5" placeholder="opcional" />
          </div>
          <div class="form-group">
            <label class="form-label">Orientações para o aluno</label>
            <input class="form-input" id="editExLiveNotes" value="${curEx.trainerNotes||''}" placeholder="Ex: manter core ativado..." />
          </div>
        </div>
        <button id="delExLiveBtn" class="btn btn-danger btn-sm" style="margin-top:10px;width:100%;display:flex;align-items:center;justify-content:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Excluir Exercício da Sessão
        </button>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        { label: 'Salvar Alterações', class: 'btn-primary', onClick: async () => {
            curEx.name        = document.getElementById('editExLiveName')?.value || curEx.name;
            curEx.sets        = parseInt(document.getElementById('editExLiveSets')?.value) || 3;
            curEx.reps        = document.getElementById('editExLiveReps')?.value || curEx.reps;
            curEx.load        = document.getElementById('editExLiveLoad')?.value ?? curEx.load;
            curEx.rest        = parseInt(document.getElementById('editExLiveRest')?.value) || 60;
            curEx.trainerNotes = document.getElementById('editExLiveNotes')?.value || '';
            
            const oneRM = parseFloat(document.getElementById('editExLiveOneRM')?.value);
            if (!isNaN(oneRM) && oneRM > 0) {
              curEx.oneRM = oneRM;
            } else {
              delete curEx.oneRM;
            }

            // Remover séries além do novo número
            state.setLog = state.setLog.filter(s => !(s.exIdx === state.exIdx && s.setIdx >= curEx.sets));
            state.session.setLog = state.setLog;

            // Ajustar o setIdx ativo se ficou fora dos limites
            if (state.setIdx > curEx.sets) {
              state.setIdx = curEx.sets;
            }

            await db.put('sessions', state.session);
            notify.success('Exercício atualizado!');
            closeModal();
            refreshLive();
          }
        }
      ]
    });

    // delExLiveBtn existe no DOM imediatamente (openModal é síncrono)
    document.getElementById('delExLiveBtn')?.addEventListener('click', async () => {
      if (!confirm(`Excluir "${curEx.name}" da sessão atual?`)) return;

      state.session.exercises.splice(state.exIdx, 1);
      state.setLog = state.setLog.filter(s => s.exIdx !== state.exIdx);
      state.setLog.forEach(s => { if (s.exIdx > state.exIdx) s.exIdx--; });
      state.session.setLog = state.setLog;

      // Ajustar chaves no tempSets
      const newTempSets = {};
      Object.keys(state.tempSets || {}).forEach(keyStr => {
        const key = parseInt(keyStr);
        if (key < state.exIdx) {
          newTempSets[key] = state.tempSets[key];
        } else if (key > state.exIdx) {
          newTempSets[key - 1] = state.tempSets[key];
        }
      });
      state.tempSets = newTempSets;
      state.session.tempSets = state.tempSets;

      if (state.exIdx >= state.session.exercises.length) {
        state.exIdx = Math.max(0, state.session.exercises.length - 1);
      }
      state.setIdx = 0;

      await db.put('sessions', state.session);
      notify.success('Exercício excluído!');
      closeModal();
      refreshLive();
    });
  });

  // Adicionar Exercício Extra
  document.getElementById('addExtraExBtn')?.addEventListener('click', async () => {
    saveCurrentInputs();
    const allEx = await db.getAll('exercises');

    openModal({
      title: 'Adicionar Exercício Extra', size: 'md',
      content: `
        <div class="form-group">
          <label class="form-label">Nome do Exercício *</label>
          <input class="form-input" id="extraExName" placeholder="Selecione ou digite..." list="extraExDatalist" required />
          <datalist id="extraExDatalist">
            ${allEx.map(e => `<option value="${e.name}">`).join('')}
          </datalist>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Séries *</label>
            <input class="form-input" type="number" id="extraExSets" value="3" min="1" required />
          </div>
          <div class="form-group">
            <label class="form-label">Reps *</label>
            <input class="form-input" id="extraExReps" value="12" required />
          </div>
          <div class="form-group">
            <label class="form-label">Carga / Intensidade</label>
            <input class="form-input" id="extraExLoad" placeholder="kg ou zona" />
          </div>
          <div class="form-group">
            <label class="form-label">Descanso (s)</label>
            <input class="form-input" type="number" id="extraExRest" value="60" min="0" />
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Orientações do Personal</label>
            <input class="form-input" id="extraExNotes" placeholder="Ex: focar na fase excêntrica..." />
          </div>
        </div>
      `,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        { label: 'Adicionar', class: 'btn-primary', onClick: async () => {
            const name = document.getElementById('extraExName')?.value?.trim();
            if (!name) { notify.error('Nome do exercício é obrigatório'); return; }
            const sets = parseInt(document.getElementById('extraExSets')?.value) || 3;
            const reps = document.getElementById('extraExReps')?.value || '12';
            const load = document.getElementById('extraExLoad')?.value || '';
            const rest = parseInt(document.getElementById('extraExRest')?.value) || 60;
            const notes = document.getElementById('extraExNotes')?.value || '';

            const exObj = allEx.find(e => e.name.toLowerCase() === name.toLowerCase());
            const loadType = exObj?.loadType || 'weight';

            const newEx = {
              name,
              sets,
              reps,
              load,
              rest,
              loadType,
              trainerNotes: notes,
              isExtra: true
            };

            state.session.exercises = state.session.exercises || [];
            state.session.exercises.push(newEx);

            await db.put('sessions', state.session);
            notify.success('Exercício extra adicionado!');
            closeModal();
            
            state.exIdx = state.session.exercises.length - 1;
            state.setIdx = 0;
            refreshLive();
          }
        }
      ]
    });
  });

  // Finalizar
  document.getElementById('endBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Finalizar e salvar a sessão?')) return;
    if (state._uiInterval) { clearInterval(state._uiInterval); state._uiInterval = null; }
    if (state.workoutTimer) state.workoutTimer.stop();
    if (state.restTimer)    state.restTimer.stop();
    // Acumular tempo de trabalho restante antes de finalizar
    if (state.workTimer && !state.isResting) {
      state.workSec = (state.workSec || 0) + (state.workTimer.getElapsed() || 0);
    }
    if (state.workTimer)    state.workTimer.stop();
    const dur  = state.workoutTimer?.getElapsed() || 0;
    const vol  = totalVolume();
    const dens = dur > 0 ? state.workSec / dur : 0;

    openModal({
      title: 'Finalizar Sessão', size: 'md',
      content: `
        <div style="display:flex;justify-content:center;gap:12px;margin-bottom:16px">
          ${[['Duração',Math.round(dur/60)+'min'],['Volume',vol+'kg'],['Séries',state.setLog.length]].map(([l,v])=>
            `<div style="text-align:center;padding:10px 14px;background:var(--bg-page);border-radius:8px">
              <div class="text-xs text-muted">${l}</div>
              <div style="font-size:1.2rem;font-weight:700;color:var(--primary)">${v}</div>
            </div>`).join('')}
        </div>
        <form id="postF">
          <div class="form-group">
            <label class="form-label">Observações do professor</label>
            <textarea class="form-textarea" name="notes" rows="3" placeholder="Anotações técnicas, ajustes para o próximo treino..."></textarea>
          </div>
          <div style="padding:8px 10px;background:rgba(37,211,102,0.07);border-radius:8px;border:1px solid rgba(37,211,102,0.2);font-size:0.75rem;color:var(--text-muted)">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#25d366" style="vertical-align:-1px;margin-right:4px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            O formulário pós-treino (PSE, bem-estar) será enviado ao aluno via WhatsApp para ele responder.
          </div>
        </form>`,
      actions: [
        { label: 'Voltar e Editar', class: 'btn-ghost', onClick: () => {
          // Restart timers that endBtn had stopped
          if (state.workoutTimer && !state.workoutTimer.running) state.workoutTimer.start();
          if (state.workTimer   && !state.workTimer.running && !state.isResting) state.workTimer.start();
          if (!state._uiInterval) state._uiInterval = setInterval(updateUI, 500);
          closeModal();
        }},
        { label: 'Salvar e Finalizar', class: 'btn-primary', id: 'doSave', onClick: async () => {
          const btn = document.getElementById('doSave');
          if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
          try {
            const fd = new FormData(document.getElementById('postF'));
            await finishSession(dur, vol, dens, Object.fromEntries(fd), navigateFn);
          } catch (err) {
            notify.error('Erro ao salvar: ' + err.message);
            if (btn) { btn.disabled = false; btn.textContent = 'Salvar e Finalizar'; }
          }
        }}
      ]
    });
  });

// ── FINISH SESSION ───────────────────────────────────────────
async function finishSession(dur, vol, dens, post, navigateFn) {
  const s = state.session;
  if (!s) { notify.error('Sessão não encontrada'); return; }

  // Limpar listeners do autosave imediatamente para evitar que visibilitychange salve status 'running' de novo
  if (state.autoSaveInterval) { clearInterval(state.autoSaveInterval); state.autoSaveInterval = null; }
  if (state.onVisibilityChange) {
    document.removeEventListener('visibilitychange', state.onVisibilityChange);
    state.onVisibilityChange = null;
  }
  if (state.onBeforeUnload) {
    window.removeEventListener('beforeunload', state.onBeforeUnload);
    state.onBeforeUnload = null;
  }

  const sessionData = {
    ...s, status: 'completed', endTime: Date.now(),
    totalDuration: dur, totalVolume: vol, density: dens,
    workSeconds: state.workSec, restSeconds: Math.max(0, dur - state.workSec),
    setLog: [...state.setLog], totalSets: state.setLog.length,
    trainerNotes: post.notes || '',
    // PSE e satisfação são preenchidos pelo aluno via formulário pós-treino
    postBiofeedback: { ...(s.postBiofeedback || {}), notes: post.notes || '', pendingStudentForm: true },
  };

  await db.put('sessions', sessionData);
  // Limpar autosave após finalizar
  if (typeof cleanupAutoSave === 'function') try { cleanupAutoSave(); } catch(_) {}
  const bfId = 'bf_' + s.studentId + '_' + s.date.substring(0, 10);
  const existingBf = await db.get('biofeedback', bfId) || {};
  // Usar db.put (upsert) em vez de db.add para evitar falha silenciosa
  // quando já existe um registro de check-in pré-treino com o mesmo ID
  await db.put('biofeedback', {
    ...existingBf,
    id: bfId,
    studentId: s.studentId, date: s.date,
    ...s.preBiofeedback,
    duration: Math.round(dur/60),
    trainingLoad: null, // será calculado após aluno preencher PSE no formulário pós-treino
    notes: post.notes, sessionId: s.id, formType: 'complete',
  });

  const students = await db.getAll('students');
  const student  = students.find(x => x.id === s.studentId);

  // ── Enviar formulário pós-treino automaticamente via WhatsApp ─
  if (student?.phone) {
    try {
      const settings  = await db.get('settings','trainer').catch(()=>({}));
      const base      = window.location.href.split('#')[0];
      const sessionId = sessionData.id || s.id;
      const postLink  = `${base}#/form/post/${sessionId}?t=${student?.trainerId||student?.trainer_id||''}`;
      const nome      = student.name.split(' ')[0];
      const trainerName = settings?.trainerName || '';
      const msg = [
        ` *Personal PRO*`,``,
        `Parabéns pelo treino, ${nome}! 🎉`,``,
        `📊 *Avalie como foi a sessão* (leva ~30 segundos):`,
        postLink,``,
        `Seu feedback ajuda a ajustar o próximo treino. `,``,
        trainerName ? `_Personal: ${trainerName}_` : `_Personal PRO_`,
      ].join('\n');
      const num = student.phone.replace(/\D/g,'');
      const waNum = num.startsWith('55') ? num : '55'+num;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    } catch(_) {}
  }

  const summary = buildSessionSummary(sessionData, student);
  resetState();
  closeModal(() => { 
    if (navigator.onLine) {
      notify.success('Sessão salva com sucesso!');
    } else {
      notify.warning('Sessão salva localmente! Conecte-se à internet para sincronizar a avaliação do aluno.');
    }
    showSessionSummary(summary, sessionData, student, navigateFn); 
  });
}

// ── BUILD SUMMARY ────────────────────────────────────────────
function buildSessionSummary(session, student) {
  const durMin = Math.round((session.totalDuration || 0) / 60);
  const exSummary = (session.exercises||[]).map((ex, i) => {
    const sets = (session.setLog||[]).filter(l => l.exIdx === i);
    if (!sets.length) return null;
    const hasNonNumeric = sets.some(s => {
      const str = String(s.load || '').trim().replace(',', '.');
      return str !== '' && (isNaN(str) || isNaN(parseFloat(str)));
    });
    let loadStr = '';
    if (hasNonNumeric) {
      const uniqueNonNumeric = [...new Set(sets.map(s => String(s.load || '').trim()).filter(Boolean))];
      loadStr = uniqueNonNumeric.length ? `, ${uniqueNonNumeric.join(', ')}` : '';
    } else {
      const maxL = Math.max(...sets.map(s => parseFloat(String(s.load || 0).replace(',', '.')) || 0));
      loadStr = maxL > 0 ? `, ${maxL}kg` : '';
    }
    return `${ex.name}: ${sets.length}x (${sets.reduce((t,s)=>t+(s.reps||0),0)} reps${loadStr})`;
  }).filter(Boolean);

  return [`PERSONAL PRO — Resumo da Sessão`,``,`Aluno: ${student?.name||'N/A'}`,`Treino: ${session.workoutName||'-'}`,`Data: ${(session.date.includes('T') ? new Date(session.date) : new Date(session.date + 'T12:00')).toLocaleDateString('pt-BR')}`,`Duração: ${durMin} min`,`Volume: ${Math.round(session.totalVolume || 0)} kg`,`Séries: ${session.totalSets||0}`,`PSE: ${session.postBiofeedback?.pse||'-'}/10`,``,`--- Exercícios ---`,...exSummary,``,`Bom treino!`].join('\n');
}

// ── SHOW SUMMARY ─────────────────────────────────────────────
function showSessionSummary(summaryText, session, student, navigateFn) {
  const durMin  = Math.round((session.totalDuration||0)/60);
  const exs     = session.exercises||[];
  const setLog  = session.setLog||[];
  const vol     = Math.round(session.totalVolume||0);
  const ini     = (student?.name||'?').split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();

  // Gasto calórico estimado (MET musculação 5.0 · Compêndio ACSM 2011)
  const peso    = student?.weight || session.preBiofeedback?.peso || null;
  const kcalEst = peso && durMin ? Calc.caloriasAtividade(peso, durMin, 'musculacao') : null;

  // PSE / Densidade
  const pse    = session.postBiofeedback?.pse || '—';
  const densModal = (vol && durMin) ? Math.round(vol / durMin) + ' kg/m' : '—';
  const pseC   = typeof pse==='number'?(pse>=9?'var(--danger)':pse>=7?'var(--warning)':'var(--success)'):'inherit';

  // Linha por exercício
  const exRows = exs.map((ex,i) => {
    const sets    = setLog.filter(l=>l.exIdx===i);
    if (!sets.length) return `<tr style="opacity:0.35"><td colspan="8" style="font-size:0.78rem">${ex.name} — não realizado</td></tr>`;
    const hasNonNumeric = sets.some(s => {
      const str = String(s.load || '').trim().replace(',', '.');
      return str !== '' && (isNaN(str) || isNaN(parseFloat(str)));
    });

    let maxLoadDisplay = '';
    if (hasNonNumeric) {
      const uniqueNonNumeric = [...new Set(sets.map(s => String(s.load || '').trim()).filter(Boolean))];
      maxLoadDisplay = uniqueNonNumeric.join(', ') || '—';
    } else {
      const numericLoads = sets.map(s => parseFloat(String(s.load || 0).replace(',', '.')) || 0);
      const maxL = Math.max(...numericLoads);
      maxLoadDisplay = maxL > 0 ? `${maxL}kg` : '—';
    }

    const totalReps = sets.reduce((t, s) => t + (s.reps || 0), 0);
    
    let exVolDisplay = '—';
    if (!hasNonNumeric) {
      const exVol = sets.reduce((t, s) => {
        const loadVal = parseFloat(String(s.load || 0).replace(',', '.'));
        return t + ((s.reps || 0) * (isNaN(loadVal) ? 0 : loadVal));
      }, 0);
      if (exVol > 0) exVolDisplay = `${exVol}kg`;
    }

    const avgPse    = sets.filter(s=>s.pse).length ? (sets.reduce((t,s)=>t+(s.pse||0),0)/sets.filter(s=>s.pse).length).toFixed(1) : '—';
    const avgRir    = sets.filter(s=>s.rir!=null).length ? (sets.reduce((t,s)=>t+(s.rir??0),0)/sets.filter(s=>s.rir!=null).length).toFixed(1) : '—';
    const rm1Est    = sets.find(s=>s.rm1Estimated)?.rm1Estimated;
    const pseColor  = parseFloat(avgPse)>8?'var(--danger)':parseFloat(avgPse)>6?'var(--warning)':'var(--success)';
    
    const detail    = sets.map(s=> {
      const loadDisplay = isNumeric(s.load) ? `${s.load}kg` : s.load;
      return `<div style="font-size:0.68rem;color:var(--text-muted);padding:2px 8px">S${s.setIdx+1}: <strong style="color:var(--text-primary)">${s.reps}×${loadDisplay}</strong>${s.pse?` <span style="color:var(--warning)">PSE ${s.pse}</span>`:''}${s.rir!=null?` <span style="color:var(--accent)">RIR ${s.rir}</span>`:''}${s.rm1Estimated?` <span style="color:var(--success)">~${s.rm1Estimated}kg</span>`:''}${s.notes?` <span style="color:var(--text-muted);font-style:italic">"${s.notes}"</span>`:''}</div>`;
    }).join('');

    return `<tr>
      <td>
        <div style="font-weight:600;font-size:0.85rem">${ex.name}</div>
        ${ex.method?`<div style="font-size:0.68rem;color:var(--accent)">${ex.method}</div>`:''}
        <button onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'" style="font-size:0.62rem;color:var(--primary);background:none;border:none;cursor:pointer">▸ séries</button>
        <div style="display:none">${detail}</div>
      </td>
      <td style="text-align:center">${sets.length}</td>
      <td style="text-align:center">${totalReps}</td>
      <td style="text-align:center;font-weight:600">${maxLoadDisplay}</td>
      <td style="text-align:center;color:var(--primary);font-weight:600">${exVolDisplay}</td>
      <td style="text-align:center;color:${pseColor};font-weight:600">${avgPse}</td>
      <td style="text-align:center;color:var(--accent)">${avgRir}</td>
      <td style="text-align:center;color:var(--success);font-weight:600">${rm1Est?rm1Est+'kg':'—'}</td>
    </tr>`;
  }).join('');

  openModal({
    title: 'Resumo da Sessão', size: 'xl',
    content: `
      <div style="background:var(--bg-page);border-radius:10px;padding:16px;margin-bottom:14px">
        <div class="flex items-center gap-md mb-md">
          <div class="avatar">${ini}</div>
          <div>
            <div style="font-weight:700;font-size:1.05rem">${student?.name||'Aluno'}</div>
            <div class="text-muted text-sm">${session.workoutName||'Treino'} · ${(session.date.includes('T') ? new Date(session.date) : new Date(session.date + 'T12:00')).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:7px">
          ${[['Duração',durMin+'min','var(--primary)'],['Volume',vol.toLocaleString('pt-BR')+'kg','var(--primary)'],['Séries',String(session.totalSets||0),'var(--primary)'],['PSE',String(pse)+'/10',pseC],['Densid.',densModal,'var(--accent)'],['Kcal est.',kcalEst?kcalEst+'kcal':'—','var(--warning)']].map(([l,v,c])=>`
            <div style="text-align:center;padding:9px 5px;background:var(--bg-card);border-radius:8px">
              <div style="font-size:0.56rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:3px">${l}</div>
              <div style="font-size:1.05rem;font-weight:800;color:${c}">${v}</div>
            </div>`).join('')}
        </div>
        ${kcalEst?`<div style="margin-top:8px;padding:6px 10px;background:rgba(245,158,11,0.06);border-radius:6px;font-size:0.68rem;color:var(--text-muted)">MET 5.0 (musculação) · ACSM Compendium (Ainsworth et al. 2011)${peso?' · Peso: '+peso+'kg':''}</div>`:''}
      </div>
      ${session.preBiofeedback||session.postBiofeedback?`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        ${session.preBiofeedback?`<div style="padding:10px 12px;background:var(--bg-page);border-radius:8px">
          <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:5px">Check-in Pré</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:0.78rem">
            <span>Sono <strong>${session.preBiofeedback.sleep ? `${Math.round(session.preBiofeedback.sleep / 2)}/5` : '—'}</strong></span>
            <span>Alim. <strong>${session.preBiofeedback.food ? `${session.preBiofeedback.food}/5` : '—'}</strong></span>
            <span>Motiv. <strong>${session.preBiofeedback.motivation ? `${Math.round(session.preBiofeedback.motivation / 2)}/5` : '—'}</strong></span>
            <span>TQR <strong>${(session.preBiofeedback.tqr??session.preBiofeedback.energy)||'—'}/10</strong></span>
            <span>Estresse <strong>${session.preBiofeedback.stress||'—'}/10</strong></span>
            <span>Humor <strong>${session.preBiofeedback.mood ? `${Math.round(session.preBiofeedback.mood / 2)}/5` : (session.preBiofeedback.sleep && (session.preBiofeedback.tqr??session.preBiofeedback.energy) ? `${Math.round(Math.round((session.preBiofeedback.sleep + (session.preBiofeedback.tqr??session.preBiofeedback.energy))/2)/2)}/5` : '—')}</strong></span>
            <span>Dor <strong>${session.preBiofeedback.pain != null ? `${session.preBiofeedback.pain > 8 ? 5 : session.preBiofeedback.pain > 6 ? 4 : session.preBiofeedback.pain > 4 ? 3 : session.preBiofeedback.pain > 2 ? 2 : 1}/5` : '—'}${session.preBiofeedback.painRegions?.length ? ` (${session.preBiofeedback.painRegions.join(', ')})` : ''}</strong></span>
            ${session.preBiofeedback.menstrual === true || session.preBiofeedback.menstrual === 'sim' ? `<span>Ciclo <strong>Sim</strong></span>` : ''}
          </div>
        </div>`:''}
        ${session.postBiofeedback?`<div style="padding:10px 12px;background:var(--bg-page);border-radius:8px">
          <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:5px">Check-in Pós</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:0.78rem">
            <span>PSE <strong style="color:${pseC}">${pse}/10</strong></span>
            <span>Densid. <strong>${densModal}</strong></span>
            ${session.postBiofeedback.notes?`<span style="color:var(--text-muted);font-style:italic">"${session.postBiofeedback.notes}"</span>`:''}
          </div>
        </div>`:''}
      </div>`:''
      }

      ${(()=>{
        const allNotes = (session.setLog||[]).filter(s=>s.notes);
        if (!allNotes.length) return '';
        const byEx = {};
        allNotes.forEach(s=>{
          const ex = (session.exercises||[])[s.exIdx];
          const key = ex?.name||`Ex ${s.exIdx+1}`;
          if (!byEx[key]) byEx[key] = [];
          byEx[key].push(`S${s.setIdx+1}: ${s.notes}`);
        });
        return `<div style="margin-bottom:12px;padding:12px 14px;background:rgba(6,182,212,0.05);border:1px solid rgba(6,182,212,0.15);border-radius:8px">
          <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent);margin-bottom:8px">📝 Observações do Treino</div>
          ${Object.entries(byEx).map(([ex,notes])=>`
            <div style="margin-bottom:5px">
              <div style="font-size:0.8rem;font-weight:600;color:var(--text-secondary)">${ex}</div>
              ${notes.map(n=>`<div style="font-size:0.75rem;color:var(--text-muted);padding-left:8px;font-style:italic">· ${n}</div>`).join('')}
            </div>`).join('')}
        </div>`;
      })()}

      <div style="margin-bottom:6px;display:flex;gap:14px;font-size:0.67rem;color:var(--text-muted);flex-wrap:wrap">
        <span style="color:var(--warning)">■ PSE — esforço percebido</span>
        <span style="color:var(--accent)">■ RIR — reps no tanque</span>
        <span style="color:var(--success)">■ 1RM — estimativa Epley</span>
      </div>
      <div class="table-container">
        <table class="data-table" style="font-size:0.82rem">
          <thead><tr>
            <th>Exercício</th>
            <th style="text-align:center">Séries</th>
            <th style="text-align:center">Reps</th>
            <th style="text-align:center">Carga máx</th>
            <th style="text-align:center">Volume</th>
            <th style="text-align:center;color:var(--warning)">PSE</th>
            <th style="text-align:center;color:var(--accent)">RIR</th>
            <th style="text-align:center;color:var(--success)">1RM</th>
          </tr></thead>
          <tbody>${exRows}</tbody>
        </table>
      </div>
    `,
    actions: [
      { label: 'WhatsApp', class: 'btn-secondary', onClick: () => {
        const phone = student?.phone?.replace(/\D/g,'')||'';        if (!phone) { notify.warning('Aluno sem telefone'); return; }
        window.open(`https://wa.me/${phone.startsWith('55')?phone:'55'+phone}?text=${encodeURIComponent(summaryText)}`, '_blank');
      }},
      { label: 'Copiar', class: 'btn-secondary', onClick: () => { navigator.clipboard?.writeText(summaryText); notify.success('Copiado!'); }},
      { label: 'PDF', class: 'btn-secondary', onClick: () => generateSessionPDF(session, student) },
      { label: 'Fechar', class: 'btn-primary', onClick: () => { closeModal(); navigateFn('/tracker'); }},
    ]
  });
}

function openFullHistoryModal(students, allSessions, allBiofeedback, navigateFn) {
  const completed = allSessions
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(s => {
      const dateStr = (s.date || '').substring(0, 10);
      const bfId = `bf_${s.studentId}_${dateStr}`;
      const bf = allBiofeedback.find(b => b.id === bfId || (b.studentId === s.studentId && (b.date || '').startsWith(dateStr)));
      if (!bf) return s;
      return {
        ...s,
        preBiofeedback: s.preBiofeedback || {
          sleep: bf.sleep, tqr: bf.tqr || bf.energy, stress: bf.stress,
          motivation: bf.motivation, pain: bf.pain, mood: bf.mood, humor: bf.humor
        },
        postBiofeedback: s.postBiofeedback || {
          pse: bf.pse, notes: bf.notes, submittedByStudent: bf.submittedByStudent
        }
      };
    });

  const contentHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; max-height: 80vh;">
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; border:1px solid var(--border-color)">
        <div style="flex:1; min-width:180px">
          <input type="text" id="historyModalSearch" class="form-input form-input-sm" placeholder="Buscar aluno ou treino..." style="width:100%; font-size:0.8rem; padding:4px 8px" />
        </div>
        <div style="width:160px">
          <select id="historyModalStudent" class="form-select form-select-sm" style="width:100%; font-size:0.8rem; padding:4px 8px">
            <option value="">Todos os alunos</option>
            ${students.filter(s => s.status === 'Ativo').map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; gap:4px; align-items:center">
          <input type="date" id="historyModalDateStart" class="form-input form-input-sm" style="width:125px; font-size:0.8rem; padding:4px 8px" title="Data inicial" />
          <span style="color:var(--text-muted); font-size:0.8rem">a</span>
          <input type="date" id="historyModalDateEnd" class="form-input form-input-sm" style="width:125px; font-size:0.8rem; padding:4px 8px" title="Data final" />
        </div>
      </div>

      <div class="table-container" style="overflow-y:auto; max-height:380px; border:1px solid var(--border-color); border-radius:8px">
        <table class="data-table" style="width:100%; font-size:0.82rem">
          <thead><tr>
            <th>Aluno</th>
            <th>Treino</th>
            <th>Data</th>
            <th>Duração</th>
            <th>Volume</th>
            <th>Séries</th>
            <th>PSE</th>
            <th>Carga</th>
            <th>Obs.</th>
            <th style="width:110px; text-align:center">Ações</th>
          </tr></thead>
          <tbody id="historyModalTableBody">
          </tbody>
        </table>
      </div>
    </div>
  `;

  openModal({
    title: 'Histórico de Treinos Realizados',
    content: contentHTML,
    size: 'xl',
    preventBackdropClose: true
  });

  const tbody = document.getElementById('historyModalTableBody');
  const searchInp = document.getElementById('historyModalSearch');
  const studentSel = document.getElementById('historyModalStudent');
  const startInp = document.getElementById('historyModalDateStart');
  const endInp = document.getElementById('historyModalDateEnd');

  function renderRows() {
    const q = searchInp.value.toLowerCase().trim();
    const sid = studentSel.value;
    const start = startInp.value;
    const end = endInp.value;

    const filtered = completed.filter(s => {
      const st = students.find(x => x.id === s.studentId);
      if (sid && s.studentId !== sid) return false;
      if (q && !(st?.name?.toLowerCase().includes(q) || s.workoutName?.toLowerCase().includes(q))) return false;
      if (start && s.date < start) return false;
      if (end && s.date.substring(0,10) > end) return false;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:20px">Nenhum treino realizado encontrado com estes filtros</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const st = students.find(x => x.id === s.studentId);
      const pse = s.postBiofeedback?.pse || 0;
      const dur = s.totalDuration ? Math.round(s.totalDuration/60) : 0;
      const carga = s.trainingLoad || s.postBiofeedback?.trainingLoad || (pse && dur ? pse*dur : 0);
      const postNotes = s.postBiofeedback?.notes || '';
      const setNotes  = (s.setLog||[]).filter(x=>x.notes).map(x=>`S${x.setIdx+1}: ${x.notes}`);
      const allObs    = [postNotes, ...setNotes].filter(Boolean);
      const obsTitle  = allObs.join(' | ');

      return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <td style="white-space:nowrap">${st?.name || '?'}</td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.workoutName || '-'}</td>
          <td style="white-space:nowrap">${Calc.formatDate(s.date)}</td>
          <td style="white-space:nowrap">${formatTimeHMS(s.totalDuration || 0)}</td>
          <td style="white-space:nowrap">${s.totalVolume ? Math.round(s.totalVolume) : '-'} kg</td>
          <td style="text-align:center">${s.totalSets || '-'}</td>
          <td style="text-align:center;color:${pse>8?'var(--danger)':pse>6?'var(--warning)':pse?'var(--success)':'var(--text-muted)'}">
            <strong>${pse || '—'}</strong>
          </td>
          <td style="text-align:center;color:var(--text-muted);font-size:0.82rem">${carga||'-'}</td>
          <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:0.75rem;font-style:italic" title="${obsTitle}">
            ${allObs.length ? allObs[0].slice(0,30)+(allObs[0].length>30||allObs.length>1?'…':'') : '-'}
          </td>
          <td style="white-space:nowrap;text-align:right">
            <button class="btn btn-ghost btn-sm view-session-modal" data-id="${s.id}" title="Ver detalhes"
              style="padding:3px 5px;color:var(--accent);display:inline-flex;align-items:center">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm pdf-session-modal" data-id="${s.id}" title="Exportar PDF"
              style="padding:3px 5px;color:var(--primary);display:inline-flex;align-items:center">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm delete-session-modal" data-id="${s.id}" title="Excluir"
              style="padding:3px 5px;color:var(--danger);display:inline-flex;align-items:center">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.view-session-modal').forEach(btn => {
      btn.onclick = async () => {
        const session = completed.find(x => x.id === btn.dataset.id);
        if (!session) return;
        const student = students.find(x => x.id === session.studentId);
        showSessionSummary(buildSessionSummary(session, student), session, student, navigateFn);
      };
    });

    tbody.querySelectorAll('.pdf-session-modal').forEach(btn => {
      btn.onclick = async () => {
        const session = completed.find(x => x.id === btn.dataset.id);
        if (!session) return;
        const student = students.find(x => x.id === session.studentId);
        generateSessionPDF(session, student);
      };
    });

    tbody.querySelectorAll('.delete-session-modal').forEach(btn => {
      btn.onclick = async () => {
        if (!window.confirm('Excluir esta sessão permanentemente do histórico?')) return;
        await db.delete('sessions', btn.dataset.id);
        notify.success('Sessão excluída.');
        closeModal();
        navigateFn('/tracker');
      };
    });
  }

  searchInp.oninput = renderRows;
  studentSel.onchange = renderRows;
  startInp.onchange = renderRows;
  endInp.onchange = renderRows;

  renderRows();
}

function generateSessionPDF(session, student) {
  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { notify.error('jsPDF não disponível'); return; }
    const doc    = new jsPDF({ unit:'mm', format:'a4' });
    const G      = [16,185,129], DK=[15,23,42], MU=[100,116,139], LI=[241,245,249], WA=[245,158,11], AC=[6,182,212];
    const durMin = Math.round((session.totalDuration||0)/60);
    const vol    = Math.round(session.totalVolume||0);
    const exs    = session.exercises||[], setLog = session.setLog||[];
    const dateObj = session.date.includes('T') ? new Date(session.date) : new Date(session.date + 'T12:00');
    const date   = dateObj.toLocaleDateString('pt-BR');
    const dateL  = dateObj.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const peso   = student?.weight || session.preBiofeedback?.peso || null;
    const kcal   = peso && durMin ? Calc.caloriasAtividade(peso, durMin, 'musculacao') : null;
    const pse    = session.postBiofeedback?.pse || '—';
    const densVal= (vol && durMin) ? Math.round(vol/durMin) : 0;

    // Cabeçalho compacto
    doc.setFillColor(...G); doc.rect(0,0,210,22,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.text('Personal PRO',14,10);
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text('Relatório de Sessão · '+dateL,14,17);
    doc.text(student?.name||'Aluno',196,10,{align:'right'});
    doc.text(session.workoutName||'Treino',196,17,{align:'right'});

    // Stats — 2 linhas de 4 cards (mais legível)
    let y=28;
    const dens       = vol && durMin ? Math.round(vol/durMin) : 0;
    const cargaSess  = session.trainingLoad || session.postBiofeedback?.trainingLoad
                     || (pse && durMin ? pse * durMin : 0);
    const stats1 = [
      ['Duração',  durMin+'min',                     G],
      ['Volume',   vol.toLocaleString('pt-BR')+'kg', G],
      ['Séries',   String(session.totalSets||0),      G],
      ['PSE',      String(pse)+'/10',                 WA],
    ];
    const stats2 = [
      ['Carga',    cargaSess ? cargaSess+' u.a.' : '—', AC],
      ['Densid.',  dens ? dens+' kg/m' : '—',           AC],
      ['Kcal est.',kcal ? kcal+' kcal' : '—',           WA],
      ['TQR entr.',String((session.preBiofeedback?.tqr??session.preBiofeedback?.energy)||'—')+'/10', G],
    ];
    const sw = 43; // 4 cards × 43mm + 3 gaps × 2mm = 178mm (cabe em 182mm)
    [stats1, stats2].forEach((row, ri) => {
      row.forEach(([l,v,c], i) => {
        const x  = 14 + i*(sw+2);
        const yy = y + ri*20;
        doc.setFillColor(...LI); doc.roundedRect(x,yy,sw,17,2,2,'F');
        doc.setTextColor(...MU); doc.setFontSize(6.2); doc.text(l.toUpperCase(),x+sw/2,yy+5.5,{align:'center'});
        doc.setTextColor(...c); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text(v,x+sw/2,yy+13,{align:'center'});
        doc.setFont('helvetica','normal');
      });
    });
    y+=44;

    // Nota calórica + biofeedback pré — numa linha
    if (session.preBiofeedback || kcal) {
      const pre=session.preBiofeedback||{};
      doc.setFillColor(240,253,244); doc.roundedRect(14,y,182,9,1.5,1.5,'F');
      doc.setFillColor(...G); doc.rect(14,y,2,9,'F');
      doc.setTextColor(...G); doc.setFontSize(5.5); doc.setFont('helvetica','bold'); doc.text('CHECK-IN PRÉ',17,y+3.5);
      doc.setFont('helvetica','normal'); doc.setTextColor(...MU); doc.setFontSize(6.5);
      const preInfo = [
        pre.sleep?`Sono ${Math.round(pre.sleep/2)}/5`:'',
        pre.tqr!=null?`TQR ${pre.tqr??pre.energy}/10`:'',
        pre.stress?`Est.Mental ${pre.stress}/10`:'',
        (pre.pain||0)>=3?`Dor ${pre.pain > 8 ? 5 : pre.pain > 6 ? 4 : pre.pain > 4 ? 3 : pre.pain > 2 ? 2 : 1}/5`:'',
        kcal?`Kcal est. ${kcal}`:'',
      ].filter(Boolean).join('  ·  ');
      doc.text(preInfo||'—',63,y+5.5);
      y+=13;
    }

    // Tabela exercícios
    y+=2;
    doc.setTextColor(...DK); doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.text('Exercícios Realizados',14,y); y+=5;
    doc.setFillColor(...G); doc.rect(14,y,182,7,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont('helvetica','bold');
    [['Exercício',14],['S',88],['Reps',98],['Máx',110],['Vol',126],['PSE',142],['RIR',154],['1RM',166]].forEach(([h,x])=>doc.text(h,x+1,y+4.8));
    y+=7;

    exs.forEach((ex,i)=>{
      const sets=setLog.filter(l=>l.exIdx===i);
      if(!sets.length) return;
      
      const hasNonNumeric = sets.some(s => {
        const str = String(s.load || '').trim().replace(',', '.');
        return str !== '' && (isNaN(str) || isNaN(parseFloat(str)));
      });

      let maxLoadDisplay = '';
      if (hasNonNumeric) {
        const uniqueNonNumeric = [...new Set(sets.map(s => String(s.load || '').trim()).filter(Boolean))];
        maxLoadDisplay = uniqueNonNumeric.join(', ') || '—';
      } else {
        const numericLoads = sets.map(s => parseFloat(String(s.load || 0).replace(',', '.')) || 0);
        const maxL = Math.max(...numericLoads);
        maxLoadDisplay = maxL > 0 ? `${maxL}kg` : '—';
      }

      const tReps=sets.reduce((t,s)=>t+(s.reps||0),0);
      
      let exVolDisplay = '—';
      if (!hasNonNumeric) {
        const exVol = sets.reduce((t, s) => {
          const loadVal = parseFloat(String(s.load || 0).replace(',', '.'));
          return t + ((s.reps || 0) * (isNaN(loadVal) ? 0 : loadVal));
        }, 0);
        if (exVol > 0) exVolDisplay = `${exVol}kg`;
      }

      const avgPse=sets.filter(s=>s.pse).length?(sets.reduce((t,s)=>t+(s.pse||0),0)/sets.filter(s=>s.pse).length).toFixed(1):'—';
      const avgRir=sets.filter(s=>s.rir!=null).length?(sets.reduce((t,s)=>t+(s.rir??0),0)/sets.filter(s=>s.rir!=null).length).toFixed(1):'—';
      const rm1=sets.find(s=>s.rm1Estimated)?.rm1Estimated;
      const rowH=ex.method?10:8;
      if(y>265){doc.addPage();y=20;}
      doc.setFillColor(i%2===0?248:255,i%2===0?250:255,i%2===0?252:255); doc.rect(14,y,182,rowH,'F');
      doc.setTextColor(...DK); doc.setFontSize(7.5); doc.setFont('helvetica','bold'); doc.text(ex.name||'—',15,y+5);
      if(ex.method){doc.setFontSize(6);doc.setFont('helvetica','normal');doc.setTextColor(...AC);doc.text(ex.method,15,y+8.5);}
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...DK);
      doc.text(String(sets.length),89,y+5);
      doc.text(String(tReps),99,y+5);
      doc.text(maxLoadDisplay,111,y+5);
      doc.setTextColor(...G); doc.setFont('helvetica','bold'); doc.text(exVolDisplay,127,y+5);
      const pc=parseFloat(avgPse);
      doc.setTextColor(pc>8?220:pc>6?200:16,pc>8?50:pc>6?120:185,pc>8?50:pc>6?20:129);
      doc.text(String(avgPse),143,y+5);
      doc.setTextColor(...AC); doc.setFont('helvetica','normal'); doc.text(String(avgRir),155,y+5);
      doc.setTextColor(...G); doc.text(rm1?rm1+'kg':'—',167,y+5);
      y+=rowH;
      // Detalhamento de todas as séries realizadas
      if (sets.length > 0) {
        const realizedText = `Séries:  ${sets.map(s => {
          const loadDisplay = isNumeric(s.load) ? `${s.load}kg` : s.load;
          let details = `${s.reps}×${loadDisplay}`;
          const extra = [];
          if (s.pse != null) extra.push(`PSE ${s.pse}`);
          if (s.rir != null) extra.push(`RIR ${s.rir}`);
          if (s.notes) extra.push(`Obs: ${s.notes}`);
          if (extra.length > 0) {
            details += ` (${extra.join(', ')})`;
          }
          return `S${s.setIdx + 1}: ${details}`;
        }).join('   ·   ')}`;

        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(...MU);
        const linesReal = doc.splitTextToSize(realizedText, 178);
        const blockH = linesReal.length * 3.5 + 1.5;
        if (y + blockH > 275) { doc.addPage(); y = 20; }
        doc.setFillColor(250, 252, 255); doc.rect(14, y, 182, blockH, 'F');
        linesReal.forEach((line, li) => {
          doc.text(line, 16, y + 3.2 + li * 3.5);
        });
        y += blockH;
      }
      y+=1;
    });

    // ── Bloco de observações compacto ──────────────────────
    const allNotes = setLog.filter(s=>s.notes);
    const postNotes = session.postBiofeedback?.notes;

    if (allNotes.length > 0 || postNotes) {
      if(y>255){doc.addPage();y=20;}
      y+=4;

      // Agrupar por exercício primeiro para calcular altura real
      const byEx = {};
      allNotes.forEach(s=>{
        const ex  = exs[s.exIdx];
        const key = ex?.name || `Ex ${s.exIdx+1}`;
        if(!byEx[key]) byEx[key]=[];
        byEx[key].push(`S${s.setIdx+1}: ${s.notes}`);
      });

      const numLines = Object.keys(byEx).length + (postNotes ? 1 : 0);
      const notesH   = numLines * 5.5 + 11;

      doc.setFillColor(240,249,255); doc.roundedRect(14,y,182,notesH,1.5,1.5,'F');
      doc.setFillColor(...AC); doc.rect(14,y,2,notesH,'F');
      doc.setTextColor(...AC); doc.setFontSize(6.2); doc.setFont('helvetica','bold');
      doc.text('OBSERVAÇÕES DO TREINO',17,y+5);
      let ny = y+9.5;

      Object.entries(byEx).forEach(([exName, notes])=>{
        if(ny>272){doc.addPage();ny=20;}
        doc.setTextColor(...DK); doc.setFontSize(6); doc.setFont('helvetica','bold');
        const labelW = doc.getTextWidth(exName+': ');
        doc.text(exName+':',17,ny);
        doc.setFont('helvetica','normal'); doc.setTextColor(...MU);
        // Wrap longo em múltiplas notas
        const notesText = notes.join('  ·  ');
        const maxW = 182 - labelW - 5;
        if (doc.getTextWidth(notesText) > maxW) {
          doc.text(notesText.slice(0, Math.floor(notesText.length * maxW / doc.getTextWidth(notesText))), 17+labelW, ny);
        } else {
          doc.text(notesText, 17+labelW, ny);
        }
        ny+=5.5;
      });

      if(postNotes){
        if(ny>272){doc.addPage();ny=20;}
        doc.setTextColor(...DK); doc.setFontSize(6); doc.setFont('helvetica','bold');
        const lw = doc.getTextWidth('Pós-treino: ');
        doc.text('Pós-treino:',17,ny);
        doc.setFont('helvetica','normal'); doc.setTextColor(...MU);
        doc.text(postNotes,17+lw,ny);
        ny+=5.5;
      }
      y = ny + 4;
    }

    // Rodapé em todas as páginas
    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++){
      doc.setPage(p);
      doc.setFillColor(...DK); doc.rect(0,287,210,10,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
      doc.text('Personal PRO — Sistema Profissional de Personal Trainer',105,293,{align:'center'});
      doc.text(`Pág ${p}/${pages}`,196,293);
    }

    doc.save(`sessao_${(student?.name||'aluno').replace(/\s/g,'_')}_${date.replace(/\//g,'-')}.pdf`);
    notify.success('PDF gerado!');
  } catch(err){ console.error(err); notify.error('Erro ao gerar PDF.'); }
}

function isCardioExercise(ex) {
  if (!ex) return false;
  const name = String(ex.name || '').toLowerCase();
  const cat = String(ex.category || '').toLowerCase();
  const muscle = String(ex.muscleGroup || ex.muscle || '').toLowerCase();
  return (
    ex.loadType === 'time' ||
    cat.includes('cardio') ||
    muscle.includes('cardio') ||
    name.includes('esteira') ||
    name.includes('corrida') ||
    name.includes('hiit') ||
    name.includes('tabata') ||
    name.includes('bike') ||
    name.includes('bicicleta') ||
    name.includes('aerob') ||
    name.includes('caminh') ||
    name.includes('pedal') ||
    name.includes('fartlek') ||
    name.includes('remo erg') ||
    name.includes('spinning') ||
    name.includes('pular corda')
  );
}

function isSpeedPowerCardio(ex) {
  if (!ex) return false;
  const baseLoadStr = String(ex.load || '').toLowerCase();
  if (baseLoadStr.includes('km/h') || baseLoadStr.includes('kmh') || baseLoadStr.includes('watt') || baseLoadStr.includes('level') || baseLoadStr.includes('bpm')) {
    return true;
  }
  if (ex.seriesProgression) {
    const hasNumericLoad = ex.seriesProgression.some(sp => {
      const val = parseFloat(String(sp.load || '').replace(',', '.'));
      return !isNaN(val) && val > 0;
    });
    if (hasNumericLoad) return true;
  }
  return false;
}

function getCardioSegments(ex) {
  const segments = [];
  const reps = ex.reps || ex.defaultReps || '20 min';
  const method = ex.method || '';

  const parseDuration = (val, hasMinutesDefault = false) => {
    if (!val) return 60;
    const str = String(val).toLowerCase().trim();
    const match = str.match(/([\d.,]+)\s*(min|m|s|seg|segundos|seconds)?/);
    if (!match) return 60;
    const num = parseFloat(match[1].replace(',', '.'));
    if (isNaN(num)) return 60;
    const unit = match[2];
    if (unit === 'min' || unit === 'm') {
      return num * 60;
    }
    if (unit === 's' || unit === 'seg' || unit === 'segundos' || unit === 'seconds') {
      return num;
    }
    if (hasMinutesDefault) return num * 60;
    return num <= 15 ? num * 60 : num;
  };

  const parseIntensity = (loadVal, labelText) => {
    const loadNum = parseFloat(String(loadVal || '').replace(',', '.'));
    if (!isNaN(loadNum) && loadNum > 0) {
      return loadNum;
    }
    const lbl = String(labelText).toLowerCase();
    if (lbl.includes('z5') || lbl.includes('sprint') || lbl.includes('tiro') || lbl.includes('all-out') || lbl.includes('máximo') || lbl.includes('muito pesada') || lbl.includes('vo2max')) {
      return 95.0;
    }
    if (lbl.includes('z4') || lbl.includes('limiar') || lbl.includes('pesada')) {
      return 88.5;
    }
    if (lbl.includes('z3') || lbl.includes('cinzenta') || lbl.includes('moderada')) {
      return 81.0;
    }
    if (lbl.includes('z2') || lbl.includes('base') || lbl.includes('leve')) {
      return 70.0;
    }
    if (lbl.includes('z1') || lbl.includes('aquecimento') || lbl.includes('desaquecimento') || lbl.includes('recuperação') || lbl.includes('cool down')) {
      return 57.5;
    }
    return 70.0;
  };

  // 1. Check if reps contains percentage splits (e.g. "80% Z2 / 20% Z5")
  const pctPattern = /(\d+)\s*%\s*(?:em\s+|de\s+|da\s+)?(z\d|zona\s*\d|sprint|recup|tiro|aquec|desaquec|tf|val|alta|baixa|moderada)/gi;
  const pctMatches = [...reps.matchAll(pctPattern)];

  if (pctMatches.length > 0) {
    let totalSec = 0;
    const durationMatch = reps.match(/(\d+)\s*(?:min|m|s|seg|segundos|seconds)(?!\s*%)/i);
    if (durationMatch) {
      totalSec = parseDuration(durationMatch[0], true);
    } else {
      const firstNumMatch = reps.match(/(\d+)/);
      const firstNum = firstNumMatch ? parseFloat(firstNumMatch[1]) : 40;
      totalSec = firstNum * 60;
    }

    let cumulative = 0;
    pctMatches.forEach((m, idx) => {
      const pct = parseFloat(m[1]) / 100;
      const zoneLabel = m[2];
      const duration = totalSec * pct;
      const intensity = parseIntensity(null, zoneLabel);
      segments.push({
        label: `${zoneLabel.toUpperCase()} (${Math.round(pct * 100)}%)`,
        duration,
        intensity,
        load: null,
        start: cumulative,
        end: cumulative + duration
      });
      cumulative += duration;
    });
    return segments;
  }

  // 2. If custom seriesProgression exists, use it
  if (ex.seriesProgression && ex.seriesProgression.length > 0) {
    let cumulative = 0;
    ex.seriesProgression.forEach((sp, idx) => {
      const duration = parseDuration(sp.reps);
      const intensity = parseIntensity(sp.load, sp.label || `Série ${idx+1}`);
      const label = sp.label || `Série ${idx+1}`;
      segments.push({
        label,
        duration,
        intensity,
        load: sp.load || null,
        start: cumulative,
        end: cumulative + duration
      });
      cumulative += duration;
    });
    return segments;
  }

  // 3. Check method for standard templates
  let cumulative = 0;
  if (method === 'Tabata') {
    segments.push({ label: 'Aquecimento (Z1)', duration: 300, intensity: 57.5, start: 0, end: 300 });
    cumulative = 300;
    for (let r = 1; r <= 8; r++) {
      segments.push({ label: `Sprint R${r} (Z5)`, duration: 20, intensity: 95.0, start: cumulative, end: cumulative + 20 });
      cumulative += 20;
      segments.push({ label: `Recuperação R${r} (Z1)`, duration: 10, intensity: 57.5, start: cumulative, end: cumulative + 10 });
      cumulative += 10;
    }
    segments.push({ label: 'Desaquecimento (Z1)', duration: 300, intensity: 57.5, start: cumulative, end: cumulative + 300 });
  } else if (method === 'HIIT 1:1') {
    segments.push({ label: 'Aquecimento (Z1)', duration: 300, intensity: 57.5, start: 0, end: 300 });
    cumulative = 300;
    for (let r = 1; r <= 10; r++) {
      segments.push({ label: `Esforço R${r} (Z4/Z5)`, duration: 30, intensity: 90.0, start: cumulative, end: cumulative + 30 });
      cumulative += 30;
      segments.push({ label: `Recuperação R${r} (Z1)`, duration: 30, intensity: 57.5, start: cumulative, end: cumulative + 30 });
      cumulative += 30;
    }
    segments.push({ label: 'Desaquecimento (Z1)', duration: 300, intensity: 57.5, start: cumulative, end: cumulative + 300 });
  } else if (method === 'HIIT 1:2') {
    segments.push({ label: 'Aquecimento (Z1)', duration: 300, intensity: 57.5, start: 0, end: 300 });
    cumulative = 300;
    for (let r = 1; r <= 8; r++) {
      segments.push({ label: `Esforço R${r} (Z4/Z5)`, duration: 30, intensity: 90.0, start: cumulative, end: cumulative + 30 });
      cumulative += 30;
      segments.push({ label: `Recuperação R${r} (Z1)`, duration: 60, intensity: 57.5, start: cumulative, end: cumulative + 60 });
      cumulative += 60;
    }
    segments.push({ label: 'Desaquecimento (Z1)', duration: 300, intensity: 57.5, start: cumulative, end: cumulative + 300 });
  } else {
    const totalSec = parseDuration(reps, true);
    let intensity = 70.0;
    if (method.includes('Z1')) intensity = 57.5;
    else if (method.includes('Z2')) intensity = 70.0;
    else if (method.includes('Z3')) intensity = 81.0;
    else if (method.includes('Z4')) intensity = 88.5;
    else if (method.includes('Z5')) intensity = 95.0;
    
    segments.push({
      label: method || ex.name || 'Cardio',
      duration: totalSec,
      intensity,
      start: 0,
      end: totalSec
    });
  }

  // 4. Fallback for Polarized method if it was parsed as a single continuous block
  if (segments.length === 1 && (method.toLowerCase().includes('polarized') || method.toLowerCase().includes('polarizado') || ex.name.toLowerCase().includes('polarizado') || reps.toLowerCase().includes('polarizado'))) {
    const totalSec = segments[0].duration;
    segments.length = 0; // clear
    const z2Sec = totalSec * 0.8;
    const z5Sec = totalSec * 0.2;
    segments.push({
      label: 'Zona 2 (Z2) - 80%',
      duration: z2Sec,
      intensity: 70.0,
      load: null,
      start: 0,
      end: z2Sec
    });
    segments.push({
      label: 'Zona 5 (Z5) - 20%',
      duration: z5Sec,
      intensity: 95.0,
      load: null,
      start: z2Sec,
      end: totalSec
    });
  }

  return segments;
}

function initEmbeddedCardioChartTrainer(canvasId, ex) {
  if (typeof Chart === 'undefined') return;
  setTimeout(() => {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const segments = getCardioSegments(ex);
    const isTimeSpeed = isSpeedPowerCardio(ex);
    const dataPoints = [];
    segments.forEach(seg => {
      dataPoints.push({ x: seg.start / 60, y: seg.intensity });
      dataPoints.push({ x: seg.end / 60, y: seg.intensity });
    });

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Intensidade',
          data: dataPoints,
          borderColor: '#06b6d4',
          borderWidth: 2,
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (context) => {
                const minutes = context[0].parsed.x;
                const m = Math.floor(minutes);
                const s = Math.round((minutes % 1) * 60);
                return `Tempo: ${m}:${String(s).padStart(2, '0')}`;
              },
              label: (context) => {
                const val = context.parsed.y;
                return isTimeSpeed ? `Carga: ${val}` : `Intensidade: ${val}% FC Máx`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            ticks: { color: '#94a3b8', font: { size: 7 } },
            grid: { color: 'rgba(255,255,255,0.03)' }
          },
          y: {
            ticks: { color: '#94a3b8', font: { size: 7 } },
            grid: { color: 'rgba(255,255,255,0.03)' },
            suggestedMin: isTimeSpeed ? 0 : 50,
            suggestedMax: isTimeSpeed ? undefined : 100
          }
        }
      }
    });
  }, 100);
}

}
