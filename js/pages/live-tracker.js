// ========================================
// PERSONAL PRO Ã¢â‚¬â€ Live Tracker (v3)
// Timers conectados Ã‚Â· Design limpo Ã‚Â· PDF Ã‚Â· Excluir sessÃƒÂ£o
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { Timer, formatTime, formatTimeHMS } from '../components/timer.js';
import { notify } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

// Ã¢â€â‚¬Ã¢â€â‚¬ STATE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
};

function resetState() {
  if (state._uiInterval)  { clearInterval(state._uiInterval); state._uiInterval = null; }
  if (state.workoutTimer) { state.workoutTimer.stop(); state.workoutTimer = null; }
  if (state.restTimer)    { state.restTimer.stop();    state.restTimer = null; }
  if (state.workTimer)    { state.workTimer.stop();    state.workTimer = null; }
  state.session = null; state.exIdx = 0; state.setIdx = 0;
  state.setLog = []; state.workSec = 0; state.isResting = false; state.tempSets = {};
}

function totalVolume() {
  return state.setLog.reduce((t, s) => t + ((s.reps || 0) * (s.load || 0)), 0);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ RENDER SETUP Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export async function renderTracker() {
  const students = await db.getAll('students');
  const active   = students.filter(s => s.status === 'Ativo');
  const sessions = await db.getAll('sessions');

  if (!state.session) {
    const running = sessions.find(s => s.status === 'running');
    if (running) {
      state.session = running;
      state.setLog  = running.setLog || [];
      state.exIdx   = running.currentExIdx || 0;
      state.workSec = running.workSec || 0;
    }
  }

  if (state.session) return renderLiveView(students);

  const completed = sessions
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return `
    <div class="page-header">
      <div><h1>Treino ao Vivo</h1><p class="subtitle">Selecione aluno e treino para iniciar</p></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Iniciar SessÃƒÂ£o</span></div>
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
          Ã¢â€“Â¶ Iniciar Treino ao Vivo
        </button>
        <div id="macroBanner" style="display:none;margin-top:10px"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Check-in PrÃƒÂ©-Treino</span>
          <button class="btn btn-ghost btn-sm" id="genPreLinkBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Link para aluno
          </button>
        </div>
        <div id="preBioStatus" style="padding:12px;background:rgba(16,185,129,0.06);border-radius:8px;border:1px solid rgba(16,185,129,0.15);text-align:center">
          <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:6px">O check-in ÃƒÂ© preenchido pelo aluno via link</div>
          <div id="preBioLoaded" style="display:none">
            <div style="font-size:0.75rem;font-weight:600;color:var(--success);margin-bottom:6px">Ã¢Å“â€œ Dados do aluno carregados</div>
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
      <div class="card-header" style="justify-content:space-between">
        <span class="card-title">SessÃƒÂµes Recentes</span>
        <select id="filterRecentStudent" class="form-select form-select-sm" style="width:auto; max-width:200px">
          <option value="">Todos os alunos</option>
          ${active.map(s => `<option value="${s.id}">${s.name.split(' ')[0]}</option>`).join('')}
        </select>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>Aluno</th>
            <th>Treino</th>
            <th>Data</th>
            <th>DuraÃƒÂ§ÃƒÂ£o</th>
            <th>Volume</th>
            <th>SÃƒÂ©ries</th>
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
              <td style="text-align:center;color:${pse>8?'var(--danger)':pse>6?'var(--warning)':'var(--success)'}">
                <strong>${pse||'-'}</strong>
              </td>
              <td style="text-align:center;color:var(--text-muted);font-size:0.82rem">${carga||'-'}</td>
              <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:0.75rem;font-style:italic" title="${obsTitle}">
                ${allObs.length ? allObs[0].slice(0,30)+(allObs[0].length>30||allObs.length>1?'Ã¢â‚¬Â¦':'') : '-'}
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

// Ã¢â€â‚¬Ã¢â€â‚¬ RENDER LIVE VIEW Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function renderLiveView(students) {
  const s   = state.session;
  const st  = students.find(x => x.id === s.studentId);
  const exs = s.exercises || [];
  const ex  = exs[state.exIdx] || {};
  const totalSets = exs.reduce((sum, e) => sum + (parseInt(e.sets) || 3), 0);
  const doneSets  = state.setLog.length;
  const pct       = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const exSets    = parseInt(ex.sets) || 3;

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
          <button class="btn btn-danger btn-sm" id="endBtn">Finalizar</button>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:12px">
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">DURAÃƒâ€¡ÃƒÆ’O</div><div class="stat-value text-gradient" id="liveTotal" style="font-size:1.3rem">00:00</div></div>
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">TRABALHO</div><div class="stat-value" id="liveWork" style="font-size:1.3rem;color:var(--success)">00:00</div></div>
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">DESCANSO</div><div class="stat-value" id="liveRest" style="font-size:1.3rem;color:var(--warning)">00:00</div></div>
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">DENSIDADE</div><div class="stat-value" id="liveDens" style="font-size:1.3rem;color:var(--accent)">0.00</div></div>
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">VOLUME</div><div class="stat-value" id="liveVol" style="font-size:1.3rem;color:var(--primary)">${totalVolume()} kg</div></div>
      </div>

      <div class="progress-bar mb-xs" style="height:6px;border-radius:3px">
        <div class="progress-fill" style="width:${pct}%;border-radius:3px"></div>
      </div>
      <div class="text-center text-xs text-muted mb-md">${doneSets}/${totalSets} sÃƒÂ©ries Ã‚Â· ${pct}% concluÃƒÂ­do</div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">ExercÃƒÂ­cio ${state.exIdx + 1} / ${exs.length}</span>
            <div class="flex gap-xs">
              <button class="btn btn-ghost btn-sm" id="editExLiveBtn" title="Editar ExercÃƒÂ­cio" style="display:flex;align-items:center;justify-content:center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm" id="prevEx" ${state.exIdx === 0 ? 'disabled' : ''}>Ã¢â€ Â</button>
              <button class="btn btn-ghost btn-sm" id="nextEx" ${state.exIdx >= exs.length - 1 ? 'disabled' : ''}>Ã¢â€ â€™</button>
            </div>
          </div>

          <div style="margin-bottom:12px">
            <div style="font-size:1.15rem;font-weight:700;color:var(--primary);margin-bottom:4px">${ex.name || 'Ã¢â‚¬â€'}</div>
            <div class="flex gap-md text-sm text-muted" style="flex-wrap:wrap">
              <span>${exSets} sÃƒÂ©ries</span>
              <span>${ex.reps || '12'} reps</span>
              ${ex.load ? `<span style="color:var(--accent);font-weight:600">${ex.load}kg</span>` : ''}
              ${ex.oneRM ? `<span style="color:var(--text-muted);font-size:0.75rem">1RM: ${ex.oneRM}kg</span>` : ''}
              <span>${ex.rest || 60}s desc.</span>
              ${ex.method ? `<span class="badge badge-info" style="font-size:0.7rem">${ex.method}</span>` : ''}
            </div>
          </div>

          <div id="setArea" style="display:flex;flex-direction:column;gap:6px">
            ${Array.from({ length: exSets }, (_, i) => {
              const done     = state.setLog.find(l => l.exIdx === state.exIdx && l.setIdx === i);
              const isActive = !done && i === state.setIdx;
              const temp     = state.tempSets[state.exIdx]?.[i] || {};
              const repsVal  = done ? done.reps : (temp.reps !== undefined ? temp.reps : (String(ex.reps || '')).replace(/[^0-9]/g, '') || 12);
              const loadVal  = done ? done.load : (temp.load !== undefined ? temp.load : ex.load || '');
              const pseVal   = done ? done.pse  : (temp.pse !== undefined ? temp.pse : '');
              const rirVal   = done && done.rir != null ? done.rir : (temp.rir !== undefined ? temp.rir : '');
              return `
              <div class="set-row ${done ? 'set-done' : ''} ${isActive ? 'set-active' : ''}" data-si="${i}"
                style="display:flex;align-items:center;gap:7px;padding:8px;border-radius:8px;
                background:${isActive ? 'rgba(16,185,129,0.08)' : done ? 'rgba(16,185,129,0.04)' : 'var(--bg-page)'}">
                <span style="font-size:0.85rem;font-weight:700;min-width:18px;
                  color:${done ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)'}">${i + 1}</span>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center">
                  <span style="font-size:0.55rem;color:var(--text-muted)">Reps</span>
                  <input class="form-input set-reps" style="width:58px;text-align:center;padding:4px 5px;font-size:0.9rem;font-weight:600" type="number" placeholder="Ã¢â‚¬â€" value="${repsVal}" ${done ? 'disabled' : ''} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center">
                  <span style="font-size:0.55rem;color:var(--text-muted)">kg</span>
                  <input class="form-input set-load" style="width:66px;text-align:center;padding:4px 5px;font-size:0.9rem;font-weight:600" type="number" step="0.5" placeholder="Ã¢â‚¬â€" value="${loadVal}" ${done ? 'disabled' : ''} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center" title="PSE Ã¢â‚¬â€ PercepÃƒÂ§ÃƒÂ£o Subjetiva de EsforÃƒÂ§o (1=muito leve, 10=mÃƒÂ¡ximo)">
                  <span style="font-size:0.55rem;color:var(--warning)">PSE</span>
                  <input class="form-input set-pse" style="width:46px;text-align:center;padding:4px 5px;font-size:0.9rem;border-color:rgba(245,158,11,0.3)" type="number" min="1" max="10" placeholder="Ã¢â‚¬â€" value="${pseVal}" ${done ? 'disabled' : ''} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center" title="RIR Ã¢â‚¬â€ Reps in Reserve: quantas repetiÃƒÂ§ÃƒÂµes ainda sobravam no tanque (0=falha, 1=1 rep sobrando...)">
                  <span style="font-size:0.55rem;color:var(--accent);font-weight:600">RIR</span>
                  <input class="form-input set-rir" style="width:42px;text-align:center;padding:4px 5px;font-size:0.9rem;border-color:rgba(6,182,212,0.4)" type="number" min="0" max="10" placeholder="Ã¢â‚¬â€" value="${rirVal}" ${done ? 'disabled' : ''} />
                </div>
                ${done
                  ? `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;min-width:38px">
                      ${done.pse ? `<span style="font-size:0.6rem;color:var(--warning)">PSE ${done.pse}</span>` : ''}
                      <span class="badge badge-success" style="text-align:center;font-size:0.72rem;padding:2px 6px">Ã¢Å“â€œ</span>
                      ${done.rir != null ? `<span style="font-size:0.6rem;color:var(--accent)">RIR ${done.rir}</span>` : ''}
                    </div>`
                  : `<button class="btn btn-primary btn-sm do-set" data-i="${i}" style="min-width:36px;align-self:flex-end">Ã¢Å“â€œ</button>`}
              </div>`;
            }).join('')}
          </div>

          <div style="border-top:1px solid var(--border-color);margin-top:12px;padding-top:10px">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;letter-spacing:0.06em;text-transform:uppercase">Todos os exercÃƒÂ­cios</div>
            ${exs.map((e, i) => {
              const done = state.setLog.filter(l => l.exIdx === i).length >= (parseInt(e.sets) || 3);
              const isCur = i === state.exIdx;
              return `<div class="go-ex" data-g="${i}" style="
                display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:6px;cursor:pointer;
                background:${isCur ? 'rgba(16,185,129,0.08)' : 'transparent'};
                color:${done ? 'var(--success)' : isCur ? 'var(--primary)' : 'var(--text-secondary)'}">
                <span style="font-size:0.7rem;min-width:12px">${done ? 'Ã¢Å“â€œ' : isCur ? 'Ã¢â€”Â' : 'Ã¢â€”â€¹'}</span>
                <span style="font-size:0.82rem;font-weight:${isCur ? 600 : 400}">${e.name}</span>
                ${e.load ? `<span style="font-size:0.7rem;color:var(--text-muted);margin-left:auto">${e.load}kg</span>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Descanso</span>
            <div class="flex items-center gap-sm">
              <span id="restStateTag" style="font-size:0.72rem;font-weight:700;color:var(--success)">Ã¢â€“Â¶ TRABALHANDO</span>
              <label style="display:flex;align-items:center;gap:5px;font-size:0.82rem;cursor:pointer">
                <input type="checkbox" id="sndToggle" ${s.soundEnabled !== false ? 'checked' : ''} /> Som
              </label>
            </div>
          </div>

          <div style="text-align:center;padding:20px 0">
            <div id="restCount" style="font-size:3.5rem;font-weight:800;font-family:monospace;color:var(--accent);transition:color 0.3s">
              ${formatTime(parseInt(ex.rest) || 60)}
            </div>
            <div id="restLbl" style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">Pronto para descansar</div>
          </div>

          <div class="flex gap-sm" style="justify-content:center;margin-bottom:12px">
            <button class="btn btn-primary" id="goRest" style="min-width:140px">Ã¢â€“Â¶ Iniciar Descanso</button>
            <button class="btn btn-secondary btn-sm" id="rstRest">Ã¢â€ Âº Reset</button>
          </div>

          <div class="flex gap-xs" style="justify-content:center;flex-wrap:wrap;margin-bottom:16px">
            ${[30, 45, 60, 90, 120, 180].map(t => `
              <button class="btn btn-ghost btn-sm rp" data-t="${t}" style="font-size:0.75rem;padding:4px 8px">
                ${t >= 60 ? (t/60) + 'min' : t + 's'}
              </button>`).join('')}
          </div>

          <div style="border-top:1px solid var(--border-color);padding-top:12px">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">AnotaÃƒÂ§ÃƒÂµes</div>
            <textarea id="setNotes" class="form-textarea" rows="2" placeholder="ObservaÃƒÂ§ÃƒÂµes tÃƒÂ©cnicas..." style="font-size:0.82rem"></textarea>
          </div>

          ${s.preBiofeedback ? `
          <div style="border-top:1px solid var(--border-color);padding-top:10px;margin-top:10px">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">PrÃƒÂ©-treino do aluno</div>
            <div class="flex gap-md text-xs" style="flex-wrap:wrap">
              <span>Sono <strong style="color:${(s.preBiofeedback.sleep||0)<5?'var(--danger)':'var(--success)'}">${s.preBiofeedback.sleep||'-'}</strong></span>
              <span>TQR <strong>${(s.preBiofeedback.tqr ?? s.preBiofeedback.energy) || '-'}</strong></span>
              <span>Estresse <strong style="color:${(s.preBiofeedback.stress||0)>=7?'var(--warning)':'inherit'}">${s.preBiofeedback.stress||'-'}</strong></span>
              ${(s.preBiofeedback.pain||0)>=3?`<span>Dor <strong style="color:var(--warning)">${s.preBiofeedback.pain}</strong></span>`:''}
            </div>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ INIT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export function initTracker(navigateFn) {
  const sSel = document.getElementById('trkStudent');
  const wSel = document.getElementById('trkWorkout');
  const sBtn = document.getElementById('startBtn');

  // Filtro de sessÃƒÂµes recentes
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

  // Excluir sessÃƒÂ£o
  document.querySelectorAll('.delete-session').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Excluir esta sessÃƒÂ£o permanentemente?')) return;
      await db.delete('sessions', btn.dataset.id);
      notify.success('SessÃƒÂ£o excluÃƒÂ­da.');
      navigateFn('/tracker');
    });
  });

  // Ver sessÃƒÂ£o
  document.querySelectorAll('.view-session').forEach(btn => {
    btn.addEventListener('click', async () => {
      const session  = await db.get('sessions', btn.dataset.id);
      if (!session) return;
      const students = await db.getAll('students');
      const student  = students.find(x => x.id === session.studentId);
      showSessionSummary(buildSessionSummary(session, student), session, student, navigateFn);
    });
  });

  // Editar sessÃƒÂ£o
  document.querySelectorAll('.edit-session').forEach(btn => {
    btn.addEventListener('click', async () => {
      const session  = await db.get('sessions', btn.dataset.id);
      if (!session) return;
      const students = await db.getAll('students');
      const student  = students.find(x => x.id === session.studentId);
      const workouts = await db.getAll('workouts');

      // Montar linhas de exercÃƒÂ­cios editÃƒÂ¡veis
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
                  <label style="font-size:0.6rem;color:var(--text-muted);display:block">Carga (kg)</label>
                  <input type="number" class="form-input set-load" data-ei="${ei}" data-si="${si}"
                    value="${s.load||0}" min="0" step="0.5"
                    style="padding:5px 8px;font-size:0.85rem;text-align:center" />
                </div>
                <div>
                  <label style="font-size:0.6rem;color:var(--text-muted);display:block">PSE</label>
                  <input type="number" class="form-input set-pse" data-ei="${ei}" data-si="${si}"
                    value="${s.pse||''}" min="1" max="10" placeholder="Ã¢â‚¬â€"
                    style="padding:5px 8px;font-size:0.85rem;text-align:center" />
                </div>
                <div>
                  <label style="font-size:0.6rem;color:var(--text-muted);display:block">RIR</label>
                  <input type="number" class="form-input set-rir" data-ei="${ei}" data-si="${si}"
                    value="${s.rir!=null?s.rir:''}" min="0" max="10" placeholder="Ã¢â‚¬â€"
                    style="padding:5px 8px;font-size:0.85rem;text-align:center" />
                </div>
              </div>`).join('')}
          </div>`;
      }).join('');

      const pse      = session.postBiofeedback?.pse || '';
      const sessDate = session.date ? session.date.slice(0,10) : Calc.todayLocal();
      const wkOptions = workouts
        .filter(w => w.studentId === session.studentId)
        .map(w => `<option value="${w.id}" ${w.id===session.workoutId?'selected':''}>${w.name}</option>`)
        .join('');

      openModal({
        title: `Editar SessÃƒÂ£o Ã¢â‚¬â€ ${student?.name||'Aluno'}`,
        size: 'xl',
        content: `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
            <div class="form-group">
              <label class="form-label">Data</label>
              <input class="form-input" type="date" id="editSessDate" value="${sessDate}" />
            </div>
            <div class="form-group">
              <label class="form-label">Treino</label>
              <select class="form-select" id="editSessWorkout">
                <option value="">Ã¢â‚¬â€ manter atual Ã¢â‚¬â€</option>
                ${wkOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">PSE geral</label>
              <input class="form-input" type="number" id="editSessPse" value="${pse}" min="1" max="10" placeholder="1-10" />
            </div>
          </div>
          <div style="margin-bottom:8px">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">
              SÃƒÂ©ries por exercÃƒÂ­cio <span style="color:var(--accent);font-weight:400">(edite reps, carga, PSE e RIR)</span>
            </div>
            <div style="max-height:55vh;overflow-y:auto;padding-right:4px">
              ${exRows || '<p style="color:var(--text-muted);font-size:0.85rem">Nenhum exercÃƒÂ­cio registrado</p>'}
            </div>
          </div>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar alteraÃƒÂ§ÃƒÂµes', class: 'btn-primary', onClick: async () => {
            // Coletar ediÃƒÂ§ÃƒÂµes das sÃƒÂ©ries
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
              if (idx >= 0) newSetLog[idx] = { ...newSetLog[idx], load: parseFloat(inp.value)||0 };
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
            const newVol  = newSetLog.reduce((t,s) => t+((s.reps||0)*(s.load||0)), 0);
            const newSets = newSetLog.length;
            const pseParse = parseInt(document.getElementById('editSessPse')?.value)||session.postBiofeedback?.pse||0;
            const newDate  = document.getElementById('editSessDate')?.value || sessDate;
            const newWkId  = document.getElementById('editSessWorkout')?.value || session.workoutId;
            const newWk    = newWkId ? workouts.find(w=>w.id===newWkId) : null;

            const updated = {
              ...session,
              date:         newDate,
              workoutId:    newWkId || session.workoutId,
              workoutName:  newWk?.name || session.workoutName,
              setLog:       newSetLog,
              totalVolume:  Math.round(newVol),
              totalSets:    newSets,
              postBiofeedback: {
                ...(session.postBiofeedback||{}),
                pse: pseParse,
              },
            };

            await db.put('sessions', updated);
            notify.success('SessÃƒÂ£o atualizada!');
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
        wks.map(w => `<option value="${w.id}">${w.name}${w.phase ? ' Ã¢â‚¬â€ ' + w.phase : ''} (${Calc.formatDate(w.date)})</option>`).join('');
      // Verificar se aluno jÃƒÂ¡ fez check-in hoje
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

    // FunÃƒÂ§ÃƒÂ£o para verificar e exibir status do check-in do aluno
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
                  : m.daysLeft === 1 ? 'Encerra amanhÃƒÂ£'
                  : `${m.daysLeft} dias restantes`;
      banner.style.display = '';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
          background:${color}15;border:1px solid ${color}40;border-radius:8px">
          <span style="font-size:1.2rem">Ã¢ÂÂ°</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:0.88rem;color:${color}">Macrociclo encerrando Ã¢â‚¬â€ ${label}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${m.name||'Macrociclo'} Ã‚Â· ${m.totalWeeks} sem Ã‚Â· Planeje a reavaliaÃƒÂ§ÃƒÂ£o</div>
          </div>
          <a href="#/periodizacao" style="font-size:0.75rem;font-weight:600;color:${color};text-decoration:none">Ver Ã¢â€ â€™</a>
        </div>`;
    }

    async function checkPreBioStatus(sid) {
      // Usar getAllForStudent para pegar tambÃƒÂ©m formulÃƒÂ¡rios pÃƒÂºblicos
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
            ['MotivaÃƒÂ§ÃƒÂ£o',   todayPre.motivation,             false],
            todayPre.menstrualCycle ? ['Ciclo', 'Ã°Å¸â€Â´', false] : null,
          ];
          valuesEl.innerHTML = vals.filter(Boolean).map(([l,v,inv])=>`
            <span style="padding:3px 8px;border-radius:12px;background:var(--bg-page);border:1px solid var(--border-color);color:${
              v==null?'var(--text-muted)':inv?(v>=7?'var(--danger)':v>=5?'var(--warning)':'var(--success)'):(v<=3?'var(--danger)':v<=5?'var(--warning)':'var(--success)')
            }">
              ${l} <strong>${v??'Ã¢â‚¬â€'}</strong>
            </span>`).join('');
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

  document.getElementById('genPreLinkBtn')?.addEventListener('click', () => {
    const sid = sSel?.value;
    if (!sid) { notify.warning('Selecione um aluno primeiro'); return; }
    const url = `${window.location.origin}${window.location.pathname}#/form/pre/${sid}`;
    navigator.clipboard?.writeText(url);
    notify.success('Link prÃƒÂ©-treino copiado!');
    openModal({
      title: 'Link PrÃƒÂ©-Treino', size: 'sm',
      content: `<p class="text-muted text-sm mb-md">Envie para o aluno preencher:</p>
        <div style="display:flex;gap:8px">
          <input class="form-input" value="${url}" readonly onclick="this.select()" style="font-size:0.78rem;flex:1" />
          <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${url}');this.textContent='Ã¢Å“â€œ'">Copiar</button>
        </div>
        <a href="https://wa.me/?text=${encodeURIComponent('Check-in prÃƒÂ©-treino: ' + url)}" target="_blank" class="btn btn-secondary btn-sm mt-sm">WhatsApp</a>`,
      actions: [{ label: 'Fechar', class: 'btn-primary', onClick: () => closeModal() }]
    });
  });

  sBtn?.addEventListener('click', async () => {
    const wk = await db.get('workouts', wSel.value);
    if (!wk) return;
    const preBf = { sleep:5, tqr:5, energy:5, stress:5, pain:0 }; // defaults neutros
    // Carregar check-in do aluno via getAllForStudent (pega formulÃƒÂ¡rios pÃƒÂºblicos)
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
        sleep:  todayPre.sleep,
        tqr:    todayPre.tqr ?? todayPre.energy,
        energy: todayPre.tqr ?? todayPre.energy,
        stress: todayPre.stress,
        pain:   todayPre.pain,
      });
      notify.success('Dados prÃƒÂ©-treino do aluno carregados!');
    }
    const session = { studentId: wk.studentId, workoutId: wk.id, workoutName: wk.name, exercises: JSON.parse(JSON.stringify(wk.exercises || [])), date: Calc.nowISO(), startTime: Date.now(), status: 'running', soundEnabled: document.getElementById('trkSound')?.checked !== false, preBiofeedback: preBf, setLog: [] };
    const saved = await db.add('sessions', session);
    resetState();
    state.session = { ...session, id: saved.id };
    notify.success('SessÃƒÂ£o iniciada!');
    navigateFn('/tracker');
  });

  if (!state.session) return;

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
    state.workTimer.elapsed = state.workSec;
    if (!state.isResting) state.workTimer.start();
  }

  // UI loop
  const updateUI = () => {
    if (!state.session) return;
    const tot  = state.workoutTimer?.getElapsed() || 0;
    const work = state.workTimer?.getElapsed()   || 0;
    state.workSec = work;
    const t = document.getElementById('liveTotal');
    const w = document.getElementById('liveWork');
    const r = document.getElementById('liveRest');
    const d = document.getElementById('liveDens');
    const tag = document.getElementById('restStateTag');
    if (t) t.textContent = formatTime(tot);
    if (w) { w.textContent = formatTime(work); w.style.color = state.isResting ? 'var(--text-muted)' : 'var(--success)'; }
    if (r) { r.textContent = formatTime(Math.max(0, tot - work)); r.style.color = state.isResting ? 'var(--warning)' : 'var(--text-muted)'; }
    if (d) d.textContent = tot > 0 ? (work / tot).toFixed(2) : '0.00';
    if (tag) { tag.textContent = state.isResting ? 'Ã¢ÂÂ¸ DESCANSANDO' : 'Ã¢â€“Â¶ TRABALHANDO'; tag.style.color = state.isResting ? 'var(--warning)' : 'var(--success)'; }
  };
  state._uiInterval = setInterval(updateUI, 500);
  updateUI();

  // Rest timer Ã¢â‚¬â€ sÃƒÂ³ cria se nÃƒÂ£o existir ainda
  const curEx   = (state.session.exercises || [])[state.exIdx] || {};
  const restDur = parseInt(curEx.rest) || 60;
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
        if (b) b.textContent = 'Ã¢â€“Â¶ Iniciar Descanso';
        state.isResting = false;
        state.workTimer?.start();
        notify.success('Descanso finalizado!');
      }
    });
  } else {
    // JÃƒÂ¡ existe Ã¢â‚¬â€ apenas reconectar os callbacks ao novo DOM
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
      if (b) b.textContent = 'Ã¢â€“Â¶ Iniciar Descanso';
      state.isResting = false;
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
    if (b) b.textContent = state.restTimer.running ? 'Ã¢ÂÂ¸ Pausar Descanso' : 'Ã¢â€“Â¶ Iniciar Descanso';
  }

  document.getElementById('goRest')?.addEventListener('click', () => {
    state.restTimer.soundEnabled = document.getElementById('sndToggle')?.checked !== false;
    const btn = document.getElementById('goRest');
    if (state.restTimer.running) {
      state.restTimer.stop(); state.isResting = false; state.workTimer?.start();
      if (btn) btn.textContent = 'Ã¢â€“Â¶ Iniciar Descanso';
    } else {
      state.restTimer.reset(); state.restTimer.start();
      state.isResting = true; state.workTimer?.stop(); state.workSec = state.workTimer?.getElapsed() || 0;
      if (btn) btn.textContent = 'Ã¢ÂÂ¸ Pausar Descanso';
      const l = document.getElementById('restLbl');
      if (l) { l.textContent = 'Descansando...'; l.style.color = ''; }
    }
  });

  document.getElementById('rstRest')?.addEventListener('click', () => {
    state.restTimer.stop(); state.restTimer.reset();
    state.isResting = false; state.workTimer?.start();
    const c = document.getElementById('restCount');
    const l = document.getElementById('restLbl');
    const b = document.getElementById('goRest');
    if (c) { c.textContent = formatTime(state.restTimer.duration); c.style.color = 'var(--accent)'; }
    if (l) { l.textContent = 'Pronto para descansar'; l.style.color = ''; }
    if (b) b.textContent = 'Ã¢â€“Â¶ Iniciar Descanso';
  });

  document.querySelectorAll('.rp').forEach(b => b.addEventListener('click', () => {
    const t = parseInt(b.dataset.t);
    state.restTimer.stop(); state.restTimer.reset(); state.restTimer.setDuration(t);
    const c = document.getElementById('restCount');
    if (c) { c.textContent = formatTime(t); c.style.color = 'var(--accent)'; }
  }));

  document.getElementById('sndToggle')?.addEventListener('change', e => { state.restTimer.soundEnabled = e.target.checked; });

  // Modal de confirmaÃƒÂ§ÃƒÂ£o de sÃƒÂ©rie com PSE e RIR
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
    // Sempre iniciar o descanso apÃƒÂ³s uma sÃƒÂ©rie, mesmo sendo a ÃƒÂºltima
    state.restTimer.reset(); state.restTimer.start();
    state.isResting = true; state.workTimer?.stop();
    state.workSec = state.workTimer?.getElapsed() || 0;
    const c = document.getElementById('restCount');
    const l = document.getElementById('restLbl');
    const b2 = document.getElementById('goRest');
    if (c) { c.textContent = formatTime(state.restTimer.duration); c.style.color='var(--warning)'; }
    if (l) l.textContent = `Descansando apÃƒÂ³s sÃƒÂ©rie ${i+1}...`;
    if (b2) b2.textContent = 'Ã¢ÂÂ¸ Pausar Descanso';

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
            <div style="font-weight:700;font-size:1rem;color:#f1f5f9">SÃƒÂ©rie ${i+1} concluÃƒÂ­da</div>
            <div style="font-size:0.78rem;color:#64748b;margin-top:2px">${ex.name||'ExercÃƒÂ­cio'}</div>
          </div>
          <button id="closeSetModal" style="background:none;border:none;color:#64748b;font-size:1.2rem;cursor:pointer;padding:4px">Ã¢Å“â€¢</button>
        </div>

        <!-- Carga e Reps -->
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div style="flex:1">
            <label style="display:block;font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Reps Realizadas</label>
            <input id="modalSetReps" type="number" value="${reps||''}" style="width:100%;padding:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#e2e8f0;font-size:1rem;text-align:center" />
          </div>
          <div style="flex:1">
            <label style="display:block;font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Carga (kg)</label>
            <input id="modalSetLoad" type="number" step="0.5" value="${load||''}" style="width:100%;padding:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#e2e8f0;font-size:1rem;text-align:center" />
          </div>
        </div>

        <!-- PSE -->
        <div style="margin-bottom:16px">
          <div style="font-size:0.7rem;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">
            PSE Ã¢â‚¬â€ PercepÃƒÂ§ÃƒÂ£o de EsforÃƒÂ§o
          </div>
          <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:6px">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => {
              const color = n<=3?'#10b981':n<=5?'#22c55e':n<=7?'#f59e0b':n<=9?'#ef4444':'#dc2626';
              const labels = {1:'MÃƒÂ­nimo',2:'M. FÃƒÂ¡cil',3:'FÃƒÂ¡cil',4:'Moderado',5:'P. DifÃƒÂ­cil',6:'DifÃƒÂ­cil',7:'M. DifÃƒÂ­cil',8:'V. DifÃƒÂ­cil',9:'Extremo',10:'MÃƒÂ¡ximo'};
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
            RIR Ã¢â‚¬â€ Reps sobrando no tanque
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
          <input id="modalSetNotes" type="text" placeholder="ObservaÃƒÂ§ÃƒÂ£o (opcional)"
            style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.04);
            border:1px solid rgba(255,255,255,0.08);border-radius:8px;
            color:#e2e8f0;font-size:0.85rem;font-family:inherit" />
        </div>

        <button id="confirmSetBtn" style="
          width:100%;padding:14px;background:#10b981;color:#fff;border:none;
          border-radius:10px;font-size:0.95rem;font-weight:700;cursor:pointer;
          opacity:0.5;pointer-events:none;
        ">Confirmar sÃƒÂ©rie</button>
      </div>
    `;

    document.body.appendChild(modal);

    let selPse = 0, selRir = null;
    const pseLabels = {1:'Repouso',2:'Muito fÃƒÂ¡cil',3:'FÃƒÂ¡cil',4:'Moderado',5:'Um pouco difÃƒÂ­cil',6:'DifÃƒÂ­cil',7:'Muito difÃƒÂ­cil',8:'Muito difÃƒÂ­cil',9:'Extenuante',10:'MÃƒÂ¡ximo absoluto'};
    const rirLbls  = {0:'Falha Ã¢â‚¬â€ nÃƒÂ£o conseguiria mais nenhuma',1:'1 repetiÃƒÂ§ÃƒÂ£o sobrando',2:'2 repetiÃƒÂ§ÃƒÂµes sobrando',3:'3 repetiÃƒÂ§ÃƒÂµes sobrando',4:'4 repetiÃƒÂ§ÃƒÂµes sobrando',5:'5 ou mais sobrando'};

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
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

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
      const load  = parseFloat(row.querySelector('.set-load')?.value) || 0;

      if (rir === 0 && pse > 0 && pse < 7) {
        notify.warning('RIR 0 (falha) com PSE baixo Ã¢â‚¬â€ verifique os valores.');
      }

      const ex = (state.session?.exercises || [])[state.exIdx] || {};
      let rm1Estimated = null;
      if (load > 0 && reps > 0 && reps <= 12) {
        rm1Estimated = Math.round((load * (1 + reps / 30)) * 2) / 2;
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
        <span class="badge badge-success" style="text-align:center;font-size:0.72rem;padding:2px 6px">Ã¢Å“â€œ</span>
        ${rir != null ? `<span style="font-size:0.6rem;color:var(--accent)">RIR ${rir}</span>` : ''}
      `;
      btn.replaceWith(doneDiv);

      const exSets = parseInt(curEx.sets) || 3;

      const rirTxt = rir != null ? ` RIR ${rir}` : '';
      notify.info(`SÃƒÂ©rie ${i+1} Ã¢Å“â€œ Ã¢â‚¬â€ ${reps}Ãƒâ€”${load}kg PSE ${pse}${rirTxt}`);

      // AvanÃƒÂ§ar para prÃƒÂ³xima sÃƒÂ©rie
      state.setIdx = i + 1;
      const nr = document.querySelector(`[data-si="${i+1}"]`);
      if (nr) { nr.classList.add('set-active'); nr.style.background = 'rgba(16,185,129,0.08)'; }

      // Atualizar volume e progresso
      const volEl = document.getElementById('liveVol');
      if (volEl) volEl.textContent = totalVolume() + ' kg';
      const totalS = (state.session.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||3),0);
      const fill   = document.querySelector('.progress-fill');
      if (fill) fill.style.width = Math.round((state.setLog.length/totalS)*100)+'%';

      state.session.setLog = state.setLog;
      renderProgress();
  }

  // Completar sÃƒÂ©rie Ã¢â‚¬â€ abre modal
  document.querySelectorAll('.do-set').forEach(btn => {
    btn.addEventListener('click', () => showSetModal(btn));
  });

  // Navegar exercÃƒÂ­cios
  const refreshLive = async () => {
    // Clear existing UI interval to prevent accumulation
    if (state._uiInterval) { clearInterval(state._uiInterval); state._uiInterval = null; }
    const students = await db.getAll('students');
    const content  = document.getElementById('pageContent');
    if (content && state.session) { content.innerHTML = renderLiveView(students); initTracker(navigateFn); }
  };
  document.getElementById('prevEx')?.addEventListener('click', () => { if (state.exIdx > 0) { state.exIdx--; state.setIdx = 0; refreshLive(); } });
  document.getElementById('nextEx')?.addEventListener('click', () => { if (state.exIdx < (state.session.exercises||[]).length-1) { state.exIdx++; state.setIdx = 0; refreshLive(); } });
  document.querySelectorAll('.go-ex').forEach(el => el.addEventListener('click', () => { state.exIdx = parseInt(el.dataset.g); state.setIdx = 0; refreshLive(); }));

  document.getElementById('editExLiveBtn')?.addEventListener('click', () => {
    const curEx = state.session.exercises[state.exIdx];
    if (!curEx) return;
    openModal({
      title: 'Editar ExercÃƒÂ­cio', size: 'md',
      content: `
        <div class="form-group">
          <label class="form-label">Nome do ExercÃƒÂ­cio</label>
          <input class="form-input" id="editExLiveName" value="${curEx.name||''}" />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">SÃƒÂ©ries</label>
            <input class="form-input" type="number" id="editExLiveSets" value="${curEx.sets||3}" />
          </div>
          <div class="form-group">
            <label class="form-label">Reps</label>
            <input class="form-input" id="editExLiveReps" value="${curEx.reps||'12'}" />
          </div>
          <div class="form-group">
            <label class="form-label">Carga (kg)</label>
            <input class="form-input" type="number" step="0.5" id="editExLiveLoad" value="${curEx.load||''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Descanso (s)</label>
            <input class="form-input" type="number" id="editExLiveRest" value="${curEx.rest||60}" />
          </div>
        </div>
        <button id="delExLiveBtn" class="btn btn-danger btn-sm" style="margin-top:10px;width:100%;display:flex;align-items:center;justify-content:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          Excluir ExercÃƒÂ­cio
        </button>
      `,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        { label: 'Salvar', class: 'btn-primary', onClick: async () => {
            curEx.name = document.getElementById('editExLiveName').value;
            curEx.sets = parseInt(document.getElementById('editExLiveSets').value) || 3;
            curEx.reps = document.getElementById('editExLiveReps').value;
            curEx.load = parseFloat(document.getElementById('editExLiveLoad').value) || 0;
            curEx.rest = parseInt(document.getElementById('editExLiveRest').value) || 60;
            
            state.setLog = state.setLog.filter(s => !(s.exIdx === state.exIdx && s.setIdx >= curEx.sets));
            state.session.setLog = state.setLog;
            
            await db.put('sessions', state.session);
            closeModal();
            refreshLive();
          }
        }
      ]
    });

    document.getElementById('delExLiveBtn')?.addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja excluir este exercÃƒÂ­cio da sessÃƒÂ£o atual?')) {
        state.session.exercises.splice(state.exIdx, 1);
        
        state.setLog = state.setLog.filter(s => s.exIdx !== state.exIdx);
        state.setLog.forEach(s => { if (s.exIdx > state.exIdx) s.exIdx-- });
        state.session.setLog = state.setLog;
        
        if (state.exIdx >= state.session.exercises.length) state.exIdx = Math.max(0, state.session.exercises.length - 1);
        state.setIdx = 0;
        
        await db.put('sessions', state.session);
        closeModal();
        refreshLive();
      }
    });
  });

  // Finalizar
  document.getElementById('endBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Finalizar e salvar a sessÃƒÂ£o?')) return;
    if (state._uiInterval) { clearInterval(state._uiInterval); state._uiInterval = null; }
    if (state.workoutTimer) state.workoutTimer.stop();
    if (state.restTimer)    state.restTimer.stop();
    if (state.workTimer)    { state.workTimer.stop(); state.workSec = state.workTimer.getElapsed(); }
    const dur  = state.workoutTimer?.getElapsed() || 0;
    const vol  = totalVolume();
    const dens = dur > 0 ? state.workSec / dur : 0;

    openModal({
      title: 'Finalizar SessÃƒÂ£o', size: 'md',
      content: `
        <div style="display:flex;justify-content:center;gap:12px;margin-bottom:16px">
          ${[['DuraÃƒÂ§ÃƒÂ£o',Math.round(dur/60)+'min'],['Volume',vol+'kg'],['SÃƒÂ©ries',state.setLog.length]].map(([l,v])=>
            `<div style="text-align:center;padding:10px 14px;background:var(--bg-page);border-radius:8px">
              <div class="text-xs text-muted">${l}</div>
              <div style="font-size:1.2rem;font-weight:700;color:var(--primary)">${v}</div>
            </div>`).join('')}
        </div>
        <form id="postF">
          <div class="form-group">
            <div class="flex items-center justify-between mb-xs">
              <label class="form-label" style="margin:0">PSE Ã¢â‚¬â€ O quanto o treino foi puxado?</label>
              <span style="font-size:1.2rem;font-weight:700;color:var(--primary)" id="pseV">7</span>
            </div>
            <input name="pse" type="range" min="1" max="10" value="7" style="width:100%;accent-color:var(--primary)" oninput="document.getElementById('pseV').textContent=this.value" />
            <div class="flex justify-between text-xs text-muted"><span>1 Ã¢â‚¬â€ Muito leve</span><span>10 Ã¢â‚¬â€ MÃƒÂ¡ximo</span></div>
          </div>
          <div class="form-group">
            <div class="flex items-center justify-between mb-xs">
              <label class="form-label" style="margin:0">Como o aluno ficou apÃƒÂ³s o treino?</label>
              <span style="font-size:1.2rem;font-weight:700;color:var(--primary)" id="satV">8</span>
            </div>
            <input name="satisfaction" type="range" min="1" max="10" value="8" style="width:100%;accent-color:var(--primary)" oninput="document.getElementById('satV').textContent=this.value" />
            <div class="flex justify-between text-xs text-muted"><span>1 Ã¢â‚¬â€ PÃƒÂ©ssimo</span><span>10 Ã¢â‚¬â€ Excelente</span></div>
          </div>
          <div class="form-group">
            <label class="form-label">ObservaÃƒÂ§ÃƒÂµes</label>
            <textarea class="form-textarea" name="notes" rows="2" placeholder="Como foi o treino?"></textarea>
          </div>
          <div style="padding:8px 10px;background:rgba(37,211,102,0.07);border-radius:8px;border:1px solid rgba(37,211,102,0.2);font-size:0.75rem;color:var(--text-muted)">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#25d366" style="vertical-align:-1px;margin-right:4px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            O formulÃƒÂ¡rio pÃƒÂ³s-treino serÃƒÂ¡ enviado automaticamente ao aluno via WhatsApp ao salvar.
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

// Ã¢â€â‚¬Ã¢â€â‚¬ FINISH SESSION Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function finishSession(dur, vol, dens, post, navigateFn) {
  const s = state.session;
  if (!s) { notify.error('SessÃƒÂ£o nÃƒÂ£o encontrada'); return; }

  const sessionData = {
    ...s, status: 'completed', endTime: Date.now(),
    totalDuration: dur, totalVolume: vol, density: dens,
    workSeconds: state.workSec, restSeconds: Math.max(0, dur - state.workSec),
    setLog: [...state.setLog], totalSets: state.setLog.length,
    postBiofeedback: { pse: parseInt(post.pse)||7, satisfaction: parseInt(post.satisfaction)||8, notes: post.notes||'', submittedAt: Calc.nowISO() },
  };

  await db.put('sessions', sessionData);
  const bfId = 'bf_' + s.studentId + '_' + s.date.substring(0, 10);
  const existingBf = await db.get('biofeedback', bfId) || {};
  await db.add('biofeedback', {
    ...existingBf,
    id: bfId,
    studentId: s.studentId, date: s.date,
    ...s.preBiofeedback,
    pse: parseInt(post.pse)||7,
    duration: Math.round(dur/60),
    trainingLoad: Calc.cargaTreino(parseInt(post.pse)||7, Math.round(dur/60)),
    notes: post.notes, sessionId: s.id, formType: 'complete',
  });

  const students = await db.getAll('students');
  const student  = students.find(x => x.id === s.studentId);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Enviar formulÃƒÂ¡rio pÃƒÂ³s-treino automaticamente via WhatsApp Ã¢â€â‚¬
  if (student?.phone) {
    try {
      const settings  = await db.get('settings','trainer').catch(()=>({}));
      const base      = window.location.href.split('#')[0];
      const sessionId = sessionData.id || s.id;
      const postLink  = `${base}#/form/post/${sessionId}`;
      const nome      = student.name.split(' ')[0];
      const trainerName = settings?.trainerName || '';
      const msg = [
        `Ã°Å¸Ââ€¹Ã¯Â¸Â *Personal PRO*`,``,
        `ParabÃƒÂ©ns pelo treino, ${nome}! Ã°Å¸Å½â€°`,``,
        `Ã°Å¸â€œÅ  *Avalie como foi a sessÃƒÂ£o* (leva ~30 segundos):`,
        postLink,``,
        `Seu feedback ajuda a ajustar o prÃƒÂ³ximo treino. Ã°Å¸â€™Âª`,``,
        trainerName ? `_Personal: ${trainerName}_` : `_Personal PRO_`,
      ].join('\n');
      const num = student.phone.replace(/\D/g,'');
      const waNum = num.startsWith('55') ? num : '55'+num;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    } catch(_) {}
  }

  const summary = buildSessionSummary(sessionData, student);
  resetState();
  closeModal(() => { notify.success('SessÃƒÂ£o salva!'); showSessionSummary(summary, sessionData, student, navigateFn); });
}

// Ã¢â€â‚¬Ã¢â€â‚¬ BUILD SUMMARY Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function buildSessionSummary(session, student) {
  const durMin = Math.round((session.totalDuration || 0) / 60);
  const exSummary = (session.exercises||[]).map((ex, i) => {
    const sets = (session.setLog||[]).filter(l => l.exIdx === i);
    if (!sets.length) return null;
    return `${ex.name}: ${sets.length}x (${sets.reduce((t,s)=>t+(s.reps||0),0)} reps, ${Math.max(...sets.map(s=>s.load||0))}kg)`;
  }).filter(Boolean);

  return [`PERSONAL PRO Ã¢â‚¬â€ Resumo da SessÃƒÂ£o`,``,`Aluno: ${student?.name||'N/A'}`,`Treino: ${session.workoutName||'-'}`,`Data: ${new Date(session.date).toLocaleDateString('pt-BR')}`,`DuraÃƒÂ§ÃƒÂ£o: ${durMin} min`,`Volume: ${Math.round(session.totalVolume || 0)} kg`,`SÃƒÂ©ries: ${session.totalSets||0}`,`PSE: ${session.postBiofeedback?.pse||'-'}/10`,``,`--- ExercÃƒÂ­cios ---`,...exSummary,``,`Bom treino!`].join('\n');
}

// Ã¢â€â‚¬Ã¢â€â‚¬ SHOW SUMMARY Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function showSessionSummary(summaryText, session, student, navigateFn) {
  const durMin  = Math.round((session.totalDuration||0)/60);
  const exs     = session.exercises||[];
  const setLog  = session.setLog||[];
  const vol     = Math.round(session.totalVolume||0);
  const ini     = (student?.name||'?').split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();

  // Gasto calÃƒÂ³rico estimado (MET musculaÃƒÂ§ÃƒÂ£o 5.0 Ã‚Â· CompÃƒÂªndio ACSM 2011)
  const peso    = student?.weight || session.preBiofeedback?.peso || null;
  const kcalEst = peso && durMin ? Calc.caloriasAtividade(peso, durMin, 'musculacao') : null;

  // PSE / Densidade
  const pse    = session.postBiofeedback?.pse || 'Ã¢â‚¬â€';
  const densModal = (vol && durMin) ? Math.round(vol / durMin) + ' kg/m' : 'Ã¢â‚¬â€';
  const pseC   = typeof pse==='number'?(pse>=9?'var(--danger)':pse>=7?'var(--warning)':'var(--success)'):'inherit';

  // Linha por exercÃƒÂ­cio
  const exRows = exs.map((ex,i) => {
    const sets    = setLog.filter(l=>l.exIdx===i);
    if (!sets.length) return `<tr style="opacity:0.35"><td colspan="8" style="font-size:0.78rem">${ex.name} Ã¢â‚¬â€ nÃƒÂ£o realizado</td></tr>`;
    const maxLoad   = Math.max(...sets.map(s=>s.load||0));
    const totalReps = sets.reduce((t,s)=>t+(s.reps||0),0);
    const exVol     = sets.reduce((t,s)=>t+((s.reps||0)*(s.load||0)),0);
    const avgPse    = sets.filter(s=>s.pse).length ? (sets.reduce((t,s)=>t+(s.pse||0),0)/sets.filter(s=>s.pse).length).toFixed(1) : 'Ã¢â‚¬â€';
    const avgRir    = sets.filter(s=>s.rir!=null).length ? (sets.reduce((t,s)=>t+(s.rir??0),0)/sets.filter(s=>s.rir!=null).length).toFixed(1) : 'Ã¢â‚¬â€';
    const rm1Est    = sets.find(s=>s.rm1Estimated)?.rm1Estimated;
    const pseColor  = parseFloat(avgPse)>8?'var(--danger)':parseFloat(avgPse)>6?'var(--warning)':'var(--success)';
    const detail    = sets.map(s=>`<div style="font-size:0.68rem;color:var(--text-muted);padding:2px 8px">S${s.setIdx+1}: <strong style="color:var(--text-primary)">${s.reps}Ãƒâ€”${s.load}kg</strong>${s.pse?` <span style="color:var(--warning)">PSE ${s.pse}</span>`:''}${s.rir!=null?` <span style="color:var(--accent)">RIR ${s.rir}</span>`:''}${s.rm1Estimated?` <span style="color:var(--success)">~${s.rm1Estimated}kg</span>`:''}${s.notes?` <span style="color:var(--text-muted);font-style:italic">"${s.notes}"</span>`:''}</div>`).join('');
    return `<tr>
      <td>
        <div style="font-weight:600;font-size:0.85rem">${ex.name}</div>
        ${ex.method?`<div style="font-size:0.68rem;color:var(--accent)">${ex.method}</div>`:''}
        <button onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'" style="font-size:0.62rem;color:var(--primary);background:none;border:none;cursor:pointer">Ã¢â€“Â¸ sÃƒÂ©ries</button>
        <div style="display:none">${detail}</div>
      </td>
      <td style="text-align:center">${sets.length}</td>
      <td style="text-align:center">${totalReps}</td>
      <td style="text-align:center;font-weight:600">${maxLoad}kg</td>
      <td style="text-align:center;color:var(--primary);font-weight:600">${exVol}kg</td>
      <td style="text-align:center;color:${pseColor};font-weight:600">${avgPse}</td>
      <td style="text-align:center;color:var(--accent)">${avgRir}</td>
      <td style="text-align:center;color:var(--success);font-weight:600">${rm1Est?rm1Est+'kg':'Ã¢â‚¬â€'}</td>
    </tr>`;
  }).join('');

  openModal({
    title: 'Resumo da SessÃƒÂ£o', size: 'xl',
    content: `
      <div style="background:var(--bg-page);border-radius:10px;padding:16px;margin-bottom:14px">
        <div class="flex items-center gap-md mb-md">
          <div class="avatar">${ini}</div>
          <div>
            <div style="font-weight:700;font-size:1.05rem">${student?.name||'Aluno'}</div>
            <div class="text-muted text-sm">${session.workoutName||'Treino'} Ã‚Â· ${new Date(session.date).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:7px">
          ${[['DuraÃƒÂ§ÃƒÂ£o',durMin+'min','var(--primary)'],['Volume',vol.toLocaleString('pt-BR')+'kg','var(--primary)'],['SÃƒÂ©ries',String(session.totalSets||0),'var(--primary)'],['PSE',String(pse)+'/10',pseC],['Densid.',densModal,'var(--accent)'],['Kcal est.',kcalEst?kcalEst+'kcal':'Ã¢â‚¬â€','var(--warning)']].map(([l,v,c])=>`
            <div style="text-align:center;padding:9px 5px;background:var(--bg-card);border-radius:8px">
              <div style="font-size:0.56rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:3px">${l}</div>
              <div style="font-size:1.05rem;font-weight:800;color:${c}">${v}</div>
            </div>`).join('')}
        </div>
        ${kcalEst?`<div style="margin-top:8px;padding:6px 10px;background:rgba(245,158,11,0.06);border-radius:6px;font-size:0.68rem;color:var(--text-muted)">MET 5.0 (musculaÃƒÂ§ÃƒÂ£o) Ã‚Â· ACSM Compendium (Ainsworth et al. 2011)${peso?' Ã‚Â· Peso: '+peso+'kg':''}</div>`:''}
      </div>
      ${session.preBiofeedback||session.postBiofeedback?`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        ${session.preBiofeedback?`<div style="padding:10px 12px;background:var(--bg-page);border-radius:8px">
          <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:5px">Check-in PrÃƒÂ©</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:0.78rem">
            <span>Sono <strong>${session.preBiofeedback.sleep||'Ã¢â‚¬â€'}/10</strong></span>
            <span>TQR <strong>${(session.preBiofeedback.tqr??session.preBiofeedback.energy)||'Ã¢â‚¬â€'}/10</strong></span>
            <span>Est. Mental <strong>${session.preBiofeedback.stress||'Ã¢â‚¬â€'}/10</strong></span>
            ${(session.preBiofeedback.pain||0)>=3?`<span style="color:var(--warning)">Dor <strong>${session.preBiofeedback.pain}/10</strong></span>`:''}
          </div>
        </div>`:''}
        ${session.postBiofeedback?`<div style="padding:10px 12px;background:var(--bg-page);border-radius:8px">
          <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:5px">Check-in PÃƒÂ³s</div>
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
          <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent);margin-bottom:8px">Ã°Å¸â€œÂ ObservaÃƒÂ§ÃƒÂµes do Treino</div>
          ${Object.entries(byEx).map(([ex,notes])=>`
            <div style="margin-bottom:5px">
              <div style="font-size:0.8rem;font-weight:600;color:var(--text-secondary)">${ex}</div>
              ${notes.map(n=>`<div style="font-size:0.75rem;color:var(--text-muted);padding-left:8px;font-style:italic">Ã‚Â· ${n}</div>`).join('')}
            </div>`).join('')}
        </div>`;
      })()}

      <div style="margin-bottom:6px;display:flex;gap:14px;font-size:0.67rem;color:var(--text-muted);flex-wrap:wrap">
        <span style="color:var(--warning)">Ã¢â€“Â  PSE Ã¢â‚¬â€ esforÃƒÂ§o percebido</span>
        <span style="color:var(--accent)">Ã¢â€“Â  RIR Ã¢â‚¬â€ reps no tanque</span>
        <span style="color:var(--success)">Ã¢â€“Â  1RM Ã¢â‚¬â€ estimativa Epley</span>
      </div>
      <div class="table-container">
        <table class="data-table" style="font-size:0.82rem">
          <thead><tr>
            <th>ExercÃƒÂ­cio</th>
            <th style="text-align:center">SÃƒÂ©ries</th>
            <th style="text-align:center">Reps</th>
            <th style="text-align:center">Carga mÃƒÂ¡x</th>
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

function generateSessionPDF(session, student) {
  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { notify.error('jsPDF nÃƒÂ£o disponÃƒÂ­vel'); return; }
    const doc    = new jsPDF({ unit:'mm', format:'a4' });
    const G      = [16,185,129], DK=[15,23,42], MU=[100,116,139], LI=[241,245,249], WA=[245,158,11], AC=[6,182,212];
    const durMin = Math.round((session.totalDuration||0)/60);
    const vol    = Math.round(session.totalVolume||0);
    const exs    = session.exercises||[], setLog = session.setLog||[];
    const date   = new Date(session.date).toLocaleDateString('pt-BR');
    const dateL  = new Date(session.date).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const peso   = student?.weight || session.preBiofeedback?.peso || null;
    const kcal   = peso && durMin ? Calc.caloriasAtividade(peso, durMin, 'musculacao') : null;
    const pse    = session.postBiofeedback?.pse || 'Ã¢â‚¬â€';
    const densVal= (vol && durMin) ? Math.round(vol/durMin) : 0;

    // CabeÃƒÂ§alho compacto
    doc.setFillColor(...G); doc.rect(0,0,210,22,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.text('Personal PRO',14,10);
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text('RelatÃƒÂ³rio de SessÃƒÂ£o Ã‚Â· '+dateL,14,17);
    doc.text(student?.name||'Aluno',196,10,{align:'right'});
    doc.text(session.workoutName||'Treino',196,17,{align:'right'});

    // Stats Ã¢â‚¬â€ 2 linhas de 4 cards (mais legÃƒÂ­vel)
    let y=28;
    const dens       = vol && durMin ? Math.round(vol/durMin) : 0;
    const cargaSess  = session.trainingLoad || session.postBiofeedback?.trainingLoad
                     || (pse && durMin ? pse * durMin : 0);
    const stats1 = [
      ['DuraÃƒÂ§ÃƒÂ£o',  durMin+'min',                     G],
      ['Volume',   vol.toLocaleString('pt-BR')+'kg', G],
      ['SÃƒÂ©ries',   String(session.totalSets||0),      G],
      ['PSE',      String(pse)+'/10',                 WA],
    ];
    const stats2 = [
      ['Carga',    cargaSess ? cargaSess+' u.a.' : 'Ã¢â‚¬â€', AC],
      ['Densid.',  dens ? dens+' kg/m' : 'Ã¢â‚¬â€',           AC],
      ['Kcal est.',kcal ? kcal+' kcal' : 'Ã¢â‚¬â€',           WA],
      ['TQR entr.',String((session.preBiofeedback?.tqr??session.preBiofeedback?.energy)||'Ã¢â‚¬â€')+'/10', G],
    ];
    const sw = 43; // 4 cards Ãƒâ€” 43mm + 3 gaps Ãƒâ€” 2mm = 178mm (cabe em 182mm)
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

    // Nota calÃƒÂ³rica + biofeedback prÃƒÂ© Ã¢â‚¬â€ numa linha
    if (session.preBiofeedback || kcal) {
      const pre=session.preBiofeedback||{};
      doc.setFillColor(240,253,244); doc.roundedRect(14,y,182,9,1.5,1.5,'F');
      doc.setFillColor(...G); doc.rect(14,y,2,9,'F');
      doc.setTextColor(...G); doc.setFontSize(5.5); doc.setFont('helvetica','bold'); doc.text('CHECK-IN PRÃƒâ€°',17,y+3.5);
      doc.setFont('helvetica','normal'); doc.setTextColor(...MU); doc.setFontSize(6.5);
      const preInfo = [
        pre.sleep?`Sono ${pre.sleep}/10`:'',
        pre.tqr!=null?`TQR ${pre.tqr??pre.energy}/10`:'',
        pre.stress?`Est.Mental ${pre.stress}/10`:'',
        (pre.pain||0)>=3?`Dor ${pre.pain}/10`:'',
        kcal?`Kcal est. ${kcal}`:'',
      ].filter(Boolean).join('  Ã‚Â·  ');
      doc.text(preInfo||'Ã¢â‚¬â€',63,y+5.5);
      y+=13;
    }

    // Tabela exercÃƒÂ­cios
    y+=2;
    doc.setTextColor(...DK); doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.text('ExercÃƒÂ­cios Realizados',14,y); y+=5;
    doc.setFillColor(...G); doc.rect(14,y,182,7,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont('helvetica','bold');
    [['ExercÃƒÂ­cio',14],['S',88],['Reps',98],['MÃƒÂ¡x',110],['Vol',126],['PSE',142],['RIR',154],['1RM',166]].forEach(([h,x])=>doc.text(h,x+1,y+4.8));
    y+=7;

    exs.forEach((ex,i)=>{
      const sets=setLog.filter(l=>l.exIdx===i);
      if(!sets.length) return;
      const maxLoad=Math.max(...sets.map(s=>s.load||0));
      const tReps=sets.reduce((t,s)=>t+(s.reps||0),0);
      const exVol=sets.reduce((t,s)=>t+((s.reps||0)*(s.load||0)),0);
      const avgPse=sets.filter(s=>s.pse).length?(sets.reduce((t,s)=>t+(s.pse||0),0)/sets.filter(s=>s.pse).length).toFixed(1):'Ã¢â‚¬â€';
      const avgRir=sets.filter(s=>s.rir!=null).length?(sets.reduce((t,s)=>t+(s.rir??0),0)/sets.filter(s=>s.rir!=null).length).toFixed(1):'Ã¢â‚¬â€';
      const rm1=sets.find(s=>s.rm1Estimated)?.rm1Estimated;
      const rowH=ex.method?10:8;
      if(y>265){doc.addPage();y=20;}
      doc.setFillColor(i%2===0?248:255,i%2===0?250:255,i%2===0?252:255); doc.rect(14,y,182,rowH,'F');
      doc.setTextColor(...DK); doc.setFontSize(7.5); doc.setFont('helvetica','bold'); doc.text(ex.name||'Ã¢â‚¬â€',15,y+5);
      if(ex.method){doc.setFontSize(6);doc.setFont('helvetica','normal');doc.setTextColor(...AC);doc.text(ex.method,15,y+8.5);}
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...DK);
      doc.text(String(sets.length),89,y+5);
      doc.text(String(tReps),99,y+5);
      doc.text(maxLoad+'kg',111,y+5);
      doc.setTextColor(...G); doc.setFont('helvetica','bold'); doc.text(exVol+'kg',127,y+5);
      const pc=parseFloat(avgPse);
      doc.setTextColor(pc>8?220:pc>6?200:16,pc>8?50:pc>6?120:185,pc>8?50:pc>6?20:129);
      doc.text(String(avgPse),143,y+5);
      doc.setTextColor(...AC); doc.setFont('helvetica','normal'); doc.text(String(avgRir),155,y+5);
      doc.setTextColor(...G); doc.text(rm1?rm1+'kg':'Ã¢â‚¬â€',167,y+5);
      y+=rowH;
      // Sub-sÃƒÂ©ries sÃƒÂ³ se tiver notas (economiza espaÃƒÂ§o)
      const setsWithNotes = sets.filter(s=>s.notes);
      if (setsWithNotes.length) {
        setsWithNotes.forEach(s=>{
          if(y>270){doc.addPage();y=20;}
          doc.setFillColor(250,252,255); doc.rect(18,y,178,4.5,'F');
          doc.setTextColor(...MU); doc.setFontSize(5.5); doc.setFont('helvetica','italic');
          doc.text(`S${s.setIdx+1} (${s.reps}Ãƒâ€”${s.load}kg): ${s.notes}`,22,y+3.2);
          y+=4.5;
        });
      }
      y+=1;
    });

    // Ã¢â€â‚¬Ã¢â€â‚¬ Bloco de observaÃƒÂ§ÃƒÂµes compacto Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const allNotes = setLog.filter(s=>s.notes);
    const postNotes = session.postBiofeedback?.notes;

    if (allNotes.length > 0 || postNotes) {
      if(y>255){doc.addPage();y=20;}
      y+=4;

      // Agrupar por exercÃƒÂ­cio primeiro para calcular altura real
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
      doc.text('OBSERVAÃƒâ€¡Ãƒâ€¢ES DO TREINO',17,y+5);
      let ny = y+9.5;

      Object.entries(byEx).forEach(([exName, notes])=>{
        if(ny>272){doc.addPage();ny=20;}
        doc.setTextColor(...DK); doc.setFontSize(6); doc.setFont('helvetica','bold');
        const labelW = doc.getTextWidth(exName+': ');
        doc.text(exName+':',17,ny);
        doc.setFont('helvetica','normal'); doc.setTextColor(...MU);
        // Wrap longo em mÃƒÂºltiplas notas
        const notesText = notes.join('  Ã‚Â·  ');
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
        const lw = doc.getTextWidth('PÃƒÂ³s-treino: ');
        doc.text('PÃƒÂ³s-treino:',17,ny);
        doc.setFont('helvetica','normal'); doc.setTextColor(...MU);
        doc.text(postNotes,17+lw,ny);
        ny+=5.5;
      }
      y = ny + 4;
    }

    // RodapÃƒÂ© em todas as pÃƒÂ¡ginas
    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++){
      doc.setPage(p);
      doc.setFillColor(...DK); doc.rect(0,287,210,10,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
      doc.text('Personal PRO Ã¢â‚¬â€ Sistema Profissional de Personal Trainer',105,293,{align:'center'});
      doc.text(`PÃƒÂ¡g ${p}/${pages}`,196,293);
    }

    doc.save(`sessao_${(student?.name||'aluno').replace(/\s/g,'_')}_${date.replace(/\//g,'-')}.pdf`);
    notify.success('PDF gerado!');
  } catch(err){ console.error(err); notify.error('Erro ao gerar PDF.'); }
}

}


