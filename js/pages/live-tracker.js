// ========================================
// PERSONAL PRO — Live Tracker (v3)
// Timers conectados · Design limpo · PDF · Excluir sessão
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { Timer, formatTime, formatTimeHMS } from '../components/timer.js';
import { notify } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

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
};

function resetState() {
  if (state._uiInterval)  { clearInterval(state._uiInterval); state._uiInterval = null; }
  if (state.workoutTimer) { state.workoutTimer.stop(); state.workoutTimer = null; }
  if (state.restTimer)    { state.restTimer.stop();    state.restTimer = null; }
  if (state.workTimer)    { state.workTimer.stop();    state.workTimer = null; }
  state.session = null; state.exIdx = 0; state.setIdx = 0;
  state.setLog = []; state.workSec = 0; state.isResting = false;
}

function totalVolume() {
  return state.setLog.reduce((t, s) => t + ((s.reps || 0) * (s.load || 0)), 0);
}

// ── RENDER SETUP ─────────────────────────────────────────────
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
      <div class="card-header"><span class="card-title">Sessões Recentes</span></div>
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
            return `<tr>
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
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">DURAÇÃO</div><div class="stat-value text-gradient" id="liveTotal" style="font-size:1.3rem">00:00</div></div>
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">TRABALHO</div><div class="stat-value" id="liveWork" style="font-size:1.3rem;color:var(--success)">00:00</div></div>
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">DESCANSO</div><div class="stat-value" id="liveRest" style="font-size:1.3rem;color:var(--warning)">00:00</div></div>
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">DENSIDADE</div><div class="stat-value" id="liveDens" style="font-size:1.3rem;color:var(--accent)">0.00</div></div>
        <div class="stat-card" style="text-align:center;padding:12px"><div class="stat-label">VOLUME</div><div class="stat-value" id="liveVol" style="font-size:1.3rem;color:var(--primary)">${totalVolume()} kg</div></div>
      </div>

      <div class="progress-bar mb-xs" style="height:6px;border-radius:3px">
        <div class="progress-fill" style="width:${pct}%;border-radius:3px"></div>
      </div>
      <div class="text-center text-xs text-muted mb-md">${doneSets}/${totalSets} séries · ${pct}% concluído</div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Exercício ${state.exIdx + 1} / ${exs.length}</span>
            <div class="flex gap-xs">
              <button class="btn btn-ghost btn-sm" id="prevEx" ${state.exIdx === 0 ? 'disabled' : ''}>←</button>
              <button class="btn btn-ghost btn-sm" id="nextEx" ${state.exIdx >= exs.length - 1 ? 'disabled' : ''}>→</button>
            </div>
          </div>

          <div style="margin-bottom:12px">
            <div style="font-size:1.15rem;font-weight:700;color:var(--primary);margin-bottom:4px">${ex.name || '—'}</div>
            <div class="flex gap-md text-sm text-muted" style="flex-wrap:wrap">
              <span>${exSets} séries</span>
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
              const repsVal  = done ? done.reps : (String(ex.reps || '')).replace(/[^0-9]/g, '') || 12;
              const loadVal  = done ? done.load : ex.load || '';
              const pseVal   = done ? done.pse  : '';
              const rirVal   = done && done.rir != null ? done.rir : '';
              return `
              <div class="set-row ${done ? 'set-done' : ''} ${isActive ? 'set-active' : ''}" data-si="${i}"
                style="display:flex;align-items:center;gap:7px;padding:8px;border-radius:8px;
                background:${isActive ? 'rgba(16,185,129,0.08)' : done ? 'rgba(16,185,129,0.04)' : 'var(--bg-page)'}">
                <span style="font-size:0.85rem;font-weight:700;min-width:18px;
                  color:${done ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)'}">${i + 1}</span>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center">
                  <span style="font-size:0.55rem;color:var(--text-muted)">Reps</span>
                  <input class="form-input set-reps" style="width:58px;text-align:center;padding:4px 5px;font-size:0.9rem;font-weight:600" type="number" placeholder="—" value="${repsVal}" ${done ? 'disabled' : ''} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center">
                  <span style="font-size:0.55rem;color:var(--text-muted)">kg</span>
                  <input class="form-input set-load" style="width:66px;text-align:center;padding:4px 5px;font-size:0.9rem;font-weight:600" type="number" step="0.5" placeholder="—" value="${loadVal}" ${done ? 'disabled' : ''} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center" title="PSE — Percepção Subjetiva de Esforço (1=muito leve, 10=máximo)">
                  <span style="font-size:0.55rem;color:var(--warning)">PSE</span>
                  <input class="form-input set-pse" style="width:46px;text-align:center;padding:4px 5px;font-size:0.9rem;border-color:rgba(245,158,11,0.3)" type="number" min="1" max="10" placeholder="—" value="${pseVal}" ${done ? 'disabled' : ''} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center" title="RIR — Reps in Reserve: quantas repetições ainda sobravam no tanque (0=falha, 1=1 rep sobrando...)">
                  <span style="font-size:0.55rem;color:var(--accent);font-weight:600">RIR</span>
                  <input class="form-input set-rir" style="width:42px;text-align:center;padding:4px 5px;font-size:0.9rem;border-color:rgba(6,182,212,0.4)" type="number" min="0" max="10" placeholder="—" value="${rirVal}" ${done ? 'disabled' : ''} />
                </div>
                ${done
                  ? `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;min-width:38px">
                      ${done.pse ? `<span style="font-size:0.6rem;color:var(--warning)">PSE ${done.pse}</span>` : ''}
                      <span class="badge badge-success" style="text-align:center;font-size:0.72rem;padding:2px 6px">✓</span>
                      ${done.rir != null ? `<span style="font-size:0.6rem;color:var(--accent)">RIR ${done.rir}</span>` : ''}
                    </div>`
                  : `<button class="btn btn-primary btn-sm do-set" data-i="${i}" style="min-width:36px;align-self:flex-end">✓</button>`}
              </div>`;
            }).join('')}
          </div>

          <div style="border-top:1px solid var(--border-color);margin-top:12px;padding-top:10px">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;letter-spacing:0.06em;text-transform:uppercase">Todos os exercícios</div>
            ${exs.map((e, i) => {
              const done = state.setLog.filter(l => l.exIdx === i).length >= (parseInt(e.sets) || 3);
              const isCur = i === state.exIdx;
              return `<div class="go-ex" data-g="${i}" style="
                display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:6px;cursor:pointer;
                background:${isCur ? 'rgba(16,185,129,0.08)' : 'transparent'};
                color:${done ? 'var(--success)' : isCur ? 'var(--primary)' : 'var(--text-secondary)'}">
                <span style="font-size:0.7rem;min-width:12px">${done ? '✓' : isCur ? '●' : '○'}</span>
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
              <span id="restStateTag" style="font-size:0.72rem;font-weight:700;color:var(--success)">▶ TRABALHANDO</span>
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
            <button class="btn btn-primary" id="goRest" style="min-width:140px">▶ Iniciar Descanso</button>
            <button class="btn btn-secondary btn-sm" id="rstRest">↺ Reset</button>
          </div>

          <div class="flex gap-xs" style="justify-content:center;flex-wrap:wrap;margin-bottom:16px">
            ${[30, 45, 60, 90, 120, 180].map(t => `
              <button class="btn btn-ghost btn-sm rp" data-t="${t}" style="font-size:0.75rem;padding:4px 8px">
                ${t >= 60 ? (t/60) + 'min' : t + 's'}
              </button>`).join('')}
          </div>

          <div style="border-top:1px solid var(--border-color);padding-top:12px">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Anotações</div>
            <textarea id="setNotes" class="form-textarea" rows="2" placeholder="Observações técnicas..." style="font-size:0.82rem"></textarea>
          </div>

          ${s.preBiofeedback ? `
          <div style="border-top:1px solid var(--border-color);padding-top:10px;margin-top:10px">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Pré-treino do aluno</div>
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

// ── INIT ─────────────────────────────────────────────────────
export function initTracker(navigateFn) {
  const sSel = document.getElementById('trkStudent');
  const wSel = document.getElementById('trkWorkout');
  const sBtn = document.getElementById('startBtn');

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
                  <label style="font-size:0.6rem;color:var(--text-muted);display:block">Carga (kg)</label>
                  <input type="number" class="form-input set-load" data-ei="${ei}" data-si="${si}"
                    value="${s.load||0}" min="0" step="0.5"
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
      const wkOptions = workouts
        .filter(w => w.studentId === session.studentId)
        .map(w => `<option value="${w.id}" ${w.id===session.workoutId?'selected':''}>${w.name}</option>`)
        .join('');

      openModal({
        title: `Editar Sessão — ${student?.name||'Aluno'}`,
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
                <option value="">— manter atual —</option>
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
            ['Alim. (24h)', todayPre.nutrition||null,         false],
            ['TQR',         (todayPre.tqr??todayPre.energy),  false],
            ['Mental',      todayPre.stress,                  true],
            ['Dor',         todayPre.pain,                    true],
            todayPre.menstrual ? ['Ciclo', '🔴', false] : null,
          ];
          valuesEl.innerHTML = vals.filter(Boolean).map(([l,v,inv])=>`
            <span style="padding:3px 8px;border-radius:12px;background:var(--bg-page);border:1px solid var(--border-color);color:${
              v==null?'var(--text-muted)':inv?(v>=7?'var(--danger)':v>=5?'var(--warning)':'var(--success)'):(v<=3?'var(--danger)':v<=5?'var(--warning)':'var(--success)')
            }">
              ${l} <strong>${v??'—'}</strong>
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
    const preBf = { sleep:5, tqr:5, energy:5, stress:5, pain:0 }; // defaults neutros
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
        sleep:  todayPre.sleep,
        tqr:    todayPre.tqr ?? todayPre.energy,
        energy: todayPre.tqr ?? todayPre.energy,
        stress: todayPre.stress,
        pain:   todayPre.pain,
      });
      notify.success('Dados pré-treino do aluno carregados!');
    }
    const session = { studentId: wk.studentId, workoutId: wk.id, workoutName: wk.name, exercises: JSON.parse(JSON.stringify(wk.exercises || [])), date: Calc.nowISO(), startTime: Date.now(), status: 'running', soundEnabled: document.getElementById('trkSound')?.checked !== false, preBiofeedback: preBf, setLog: [] };
    const saved = await db.add('sessions', session);
    resetState();
    state.session = { ...session, id: saved.id };
    notify.success('Sessão iniciada!');
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
    if (tag) { tag.textContent = state.isResting ? '⏸ DESCANSANDO' : '▶ TRABALHANDO'; tag.style.color = state.isResting ? 'var(--warning)' : 'var(--success)'; }
  };
  state._uiInterval = setInterval(updateUI, 500);
  updateUI();

  // Rest timer — só cria se não existir ainda
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
        if (b) b.textContent = '▶ Iniciar Descanso';
        state.isResting = false;
        state.workTimer?.start();
        notify.success('Descanso finalizado!');
      }
    });
  } else {
    // Já existe — apenas reconectar os callbacks ao novo DOM
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
      state.restTimer.stop(); state.isResting = false; state.workTimer?.start();
      if (btn) btn.textContent = '▶ Iniciar Descanso';
    } else {
      state.restTimer.reset(); state.restTimer.start();
      state.isResting = true; state.workTimer?.stop(); state.workSec = state.workTimer?.getElapsed() || 0;
      if (btn) btn.textContent = '⏸ Pausar Descanso';
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
    if (b) b.textContent = '▶ Iniciar Descanso';
  });

  document.querySelectorAll('.rp').forEach(b => b.addEventListener('click', () => {
    const t = parseInt(b.dataset.t);
    state.restTimer.stop(); state.restTimer.reset(); state.restTimer.setDuration(t);
    const c = document.getElementById('restCount');
    if (c) { c.textContent = formatTime(t); c.style.color = 'var(--accent)'; }
  }));

  document.getElementById('sndToggle')?.addEventListener('change', e => { state.restTimer.soundEnabled = e.target.checked; });

  // Completar série
  document.querySelectorAll('.do-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const i    = parseInt(btn.dataset.i);
      const row  = btn.closest('.set-row');
      const reps  = parseInt(row.querySelector('.set-reps')?.value) || 0;
      const load  = parseFloat(row.querySelector('.set-load')?.value) || 0;
      const pse   = parseInt(row.querySelector('.set-pse')?.value) || 0;
      const rirEl = row.querySelector('.set-rir');
      const rir   = rirEl?.value !== '' ? parseInt(rirEl.value) : null;
      const notes = document.getElementById('setNotes')?.value || '';

      // Validação: avisar se PSE ou RIR estão inconsistentes
      // RIR 0 com PSE < 8 é incomum — lembrete discreto
      if (rir === 0 && pse > 0 && pse < 7) {
        notify.warning('RIR 0 (falha) com PSE baixo — verifique os valores.');
      }

      // Estimativa de 1RM se tiver carga e reps
      const ex = (state.session?.exercises || [])[state.exIdx] || {};
      let rm1Estimated = null;
      if (load > 0 && reps > 0 && reps <= 12) {
        rm1Estimated = Math.round((load * (1 + reps / 30)) * 2) / 2; // Epley
      }

      state.setLog.push({ exIdx: state.exIdx, setIdx: i, reps, load, pse, rir, notes, rm1Estimated, time: Date.now() });

      row.classList.add('set-done'); row.classList.remove('set-active');
      row.style.background = 'rgba(16,185,129,0.04)';
      row.querySelectorAll('input').forEach(inp => inp.disabled = true);
      btn.replaceWith(Object.assign(document.createElement('span'), { className: 'badge badge-success', textContent: '✓', style: 'min-width:32px;text-align:center' }));

      const exSets = parseInt(curEx.sets) || 3;
      if (i + 1 < exSets) {
        state.setIdx = i + 1;
        const nr = document.querySelector(`[data-si="${i+1}"]`);
        if (nr) { nr.classList.add('set-active'); nr.style.background = 'rgba(16,185,129,0.08)'; }
      }

      const volEl = document.getElementById('liveVol');
      if (volEl) volEl.textContent = totalVolume() + ' kg';
      const totalS = (state.session.exercises||[]).reduce((s,e)=>s+(parseInt(e.sets)||3),0);
      const fill   = document.querySelector('.progress-fill');
      if (fill) fill.style.width = Math.round((state.setLog.length/totalS)*100)+'%';

      state.session.setLog = state.setLog;
      state.session.currentExIdx = state.exIdx;
      state.session.workSec = state.workSec;
      db.put('sessions', state.session);

      // Auto-iniciar descanso
      state.isResting = true; state.workTimer?.stop(); state.workSec = state.workTimer?.getElapsed() || 0;
      state.restTimer.reset(); state.restTimer.start();
      const rb = document.getElementById('goRest'); if (rb) rb.textContent = '⏸ Pausar Descanso';
      const rl = document.getElementById('restLbl'); if (rl) { rl.textContent = 'Descansando...'; rl.style.color = ''; }

      notify.info(`Série ${i+1} ✓ — ${reps}×${load}kg`);
    });
  });

  // Navegar exercícios
  const refreshLive = async () => {
    const students = await db.getAll('students');
    const content  = document.getElementById('pageContent');
    if (content && state.session) { content.innerHTML = renderLiveView(students); initTracker(navigateFn); }
  };
  document.getElementById('prevEx')?.addEventListener('click', () => { if (state.exIdx > 0) { state.exIdx--; state.setIdx = 0; refreshLive(); } });
  document.getElementById('nextEx')?.addEventListener('click', () => { if (state.exIdx < (state.session.exercises||[]).length-1) { state.exIdx++; state.setIdx = 0; refreshLive(); } });
  document.querySelectorAll('.go-ex').forEach(el => el.addEventListener('click', () => { state.exIdx = parseInt(el.dataset.g); state.setIdx = 0; refreshLive(); }));

  // Finalizar
  document.getElementById('endBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Finalizar e salvar a sessão?')) return;
    if (state._uiInterval) { clearInterval(state._uiInterval); state._uiInterval = null; }
    if (state.workoutTimer) state.workoutTimer.stop();
    if (state.restTimer)    state.restTimer.stop();
    if (state.workTimer)    { state.workTimer.stop(); state.workSec = state.workTimer.getElapsed(); }
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
            <div class="flex items-center justify-between mb-xs">
              <label class="form-label" style="margin:0">PSE — O quanto o treino foi puxado?</label>
              <span style="font-size:1.2rem;font-weight:700;color:var(--primary)" id="pseV">7</span>
            </div>
            <input name="pse" type="range" min="1" max="10" value="7" style="width:100%;accent-color:var(--primary)" oninput="document.getElementById('pseV').textContent=this.value" />
            <div class="flex justify-between text-xs text-muted"><span>1 — Muito leve</span><span>10 — Máximo</span></div>
          </div>
          <div class="form-group">
            <div class="flex items-center justify-between mb-xs">
              <label class="form-label" style="margin:0">Como o aluno ficou após o treino?</label>
              <span style="font-size:1.2rem;font-weight:700;color:var(--primary)" id="satV">8</span>
            </div>
            <input name="satisfaction" type="range" min="1" max="10" value="8" style="width:100%;accent-color:var(--primary)" oninput="document.getElementById('satV').textContent=this.value" />
            <div class="flex justify-between text-xs text-muted"><span>1 — Péssimo</span><span>10 — Excelente</span></div>
          </div>
          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea class="form-textarea" name="notes" rows="2" placeholder="Como foi o treino?"></textarea>
          </div>
          <div style="padding:8px 10px;background:rgba(37,211,102,0.07);border-radius:8px;border:1px solid rgba(37,211,102,0.2);font-size:0.75rem;color:var(--text-muted)">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#25d366" style="vertical-align:-1px;margin-right:4px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            O formulário pós-treino será enviado automaticamente ao aluno via WhatsApp ao salvar.
          </div>
        </form>`,
      actions: [
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
}

// ── FINISH SESSION ───────────────────────────────────────────
async function finishSession(dur, vol, dens, post, navigateFn) {
  const s = state.session;
  if (!s) { notify.error('Sessão não encontrada'); return; }

  const sessionData = {
    ...s, status: 'completed', endTime: Date.now(),
    totalDuration: dur, totalVolume: vol, density: dens,
    workSeconds: state.workSec, restSeconds: Math.max(0, dur - state.workSec),
    setLog: [...state.setLog], totalSets: state.setLog.length,
    postBiofeedback: { pse: parseInt(post.pse)||7, satisfaction: parseInt(post.satisfaction)||8, notes: post.notes||'', submittedAt: Calc.nowISO() },
  };

  await db.put('sessions', sessionData);
  await db.add('biofeedback', {
    studentId: s.studentId, date: s.date,
    ...s.preBiofeedback,
    pse: parseInt(post.pse)||7,
    duration: Math.round(dur/60),
    trainingLoad: Calc.cargaTreino(parseInt(post.pse)||7, Math.round(dur/60)),
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
      const postLink  = `${base}#/form/post/${sessionId}`;
      const nome      = student.name.split(' ')[0];
      const trainerName = settings?.trainerName || '';
      const msg = [
        `🏋️ *Personal PRO*`,``,
        `Parabéns pelo treino, ${nome}! 🎉`,``,
        `📊 *Avalie como foi a sessão* (leva ~30 segundos):`,
        postLink,``,
        `Seu feedback ajuda a ajustar o próximo treino. 💪`,``,
        trainerName ? `_Personal: ${trainerName}_` : `_Personal PRO_`,
      ].join('\n');
      const num = student.phone.replace(/\D/g,'');
      const waNum = num.startsWith('55') ? num : '55'+num;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    } catch(_) {}
  }

  const summary = buildSessionSummary(sessionData, student);
  resetState();
  closeModal(() => { notify.success('Sessão salva!'); showSessionSummary(summary, sessionData, student, navigateFn); });
}

// ── BUILD SUMMARY ────────────────────────────────────────────
function buildSessionSummary(session, student) {
  const durMin = Math.round((session.totalDuration || 0) / 60);
  const exSummary = (session.exercises||[]).map((ex, i) => {
    const sets = (session.setLog||[]).filter(l => l.exIdx === i);
    if (!sets.length) return null;
    return `${ex.name}: ${sets.length}x (${sets.reduce((t,s)=>t+(s.reps||0),0)} reps, ${Math.max(...sets.map(s=>s.load||0))}kg)`;
  }).filter(Boolean);

  return [`PERSONAL PRO — Resumo da Sessão`,``,`Aluno: ${student?.name||'N/A'}`,`Treino: ${session.workoutName||'-'}`,`Data: ${new Date(session.date).toLocaleDateString('pt-BR')}`,`Duração: ${durMin} min`,`Volume: ${Math.round(session.totalVolume || 0)} kg`,`Séries: ${session.totalSets||0}`,`PSE: ${session.postBiofeedback?.pse||'-'}/10`,``,`--- Exercícios ---`,...exSummary,``,`Bom treino!`].join('\n');
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
    const maxLoad   = Math.max(...sets.map(s=>s.load||0));
    const totalReps = sets.reduce((t,s)=>t+(s.reps||0),0);
    const exVol     = sets.reduce((t,s)=>t+((s.reps||0)*(s.load||0)),0);
    const avgPse    = sets.filter(s=>s.pse).length ? (sets.reduce((t,s)=>t+(s.pse||0),0)/sets.filter(s=>s.pse).length).toFixed(1) : '—';
    const avgRir    = sets.filter(s=>s.rir!=null).length ? (sets.reduce((t,s)=>t+(s.rir??0),0)/sets.filter(s=>s.rir!=null).length).toFixed(1) : '—';
    const rm1Est    = sets.find(s=>s.rm1Estimated)?.rm1Estimated;
    const pseColor  = parseFloat(avgPse)>8?'var(--danger)':parseFloat(avgPse)>6?'var(--warning)':'var(--success)';
    const detail    = sets.map(s=>`<div style="font-size:0.68rem;color:var(--text-muted);padding:2px 8px">S${s.setIdx+1}: <strong style="color:var(--text-primary)">${s.reps}×${s.load}kg</strong>${s.pse?` <span style="color:var(--warning)">PSE ${s.pse}</span>`:''}${s.rir!=null?` <span style="color:var(--accent)">RIR ${s.rir}</span>`:''}${s.rm1Estimated?` <span style="color:var(--success)">~${s.rm1Estimated}kg</span>`:''}${s.notes?` <span style="color:var(--text-muted);font-style:italic">"${s.notes}"</span>`:''}</div>`).join('');
    return `<tr>
      <td>
        <div style="font-weight:600;font-size:0.85rem">${ex.name}</div>
        ${ex.method?`<div style="font-size:0.68rem;color:var(--accent)">${ex.method}</div>`:''}
        <button onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'" style="font-size:0.62rem;color:var(--primary);background:none;border:none;cursor:pointer">▸ séries</button>
        <div style="display:none">${detail}</div>
      </td>
      <td style="text-align:center">${sets.length}</td>
      <td style="text-align:center">${totalReps}</td>
      <td style="text-align:center;font-weight:600">${maxLoad}kg</td>
      <td style="text-align:center;color:var(--primary);font-weight:600">${exVol}kg</td>
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
            <div class="text-muted text-sm">${session.workoutName||'Treino'} · ${new Date(session.date).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
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
            <span>Sono <strong>${session.preBiofeedback.sleep||'—'}/10</strong></span>
            <span>TQR <strong>${(session.preBiofeedback.tqr??session.preBiofeedback.energy)||'—'}/10</strong></span>
            <span>Est. Mental <strong>${session.preBiofeedback.stress||'—'}/10</strong></span>
            ${(session.preBiofeedback.pain||0)>=3?`<span style="color:var(--warning)">Dor <strong>${session.preBiofeedback.pain}/10</strong></span>`:''}
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

function generateSessionPDF(session, student) {
  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { notify.error('jsPDF não disponível'); return; }
    const doc    = new jsPDF({ unit:'mm', format:'a4' });
    const G      = [16,185,129], DK=[15,23,42], MU=[100,116,139], LI=[241,245,249], WA=[245,158,11], AC=[6,182,212];
    const durMin = Math.round((session.totalDuration||0)/60);
    const vol    = Math.round(session.totalVolume||0);
    const exs    = session.exercises||[], setLog = session.setLog||[];
    const date   = new Date(session.date).toLocaleDateString('pt-BR');
    const dateL  = new Date(session.date).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
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
        pre.sleep?`Sono ${pre.sleep}/10`:'',
        pre.tqr!=null?`TQR ${pre.tqr??pre.energy}/10`:'',
        pre.stress?`Est.Mental ${pre.stress}/10`:'',
        (pre.pain||0)>=3?`Dor ${pre.pain}/10`:'',
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
      const maxLoad=Math.max(...sets.map(s=>s.load||0));
      const tReps=sets.reduce((t,s)=>t+(s.reps||0),0);
      const exVol=sets.reduce((t,s)=>t+((s.reps||0)*(s.load||0)),0);
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
      doc.text(maxLoad+'kg',111,y+5);
      doc.setTextColor(...G); doc.setFont('helvetica','bold'); doc.text(exVol+'kg',127,y+5);
      const pc=parseFloat(avgPse);
      doc.setTextColor(pc>8?220:pc>6?200:16,pc>8?50:pc>6?120:185,pc>8?50:pc>6?20:129);
      doc.text(String(avgPse),143,y+5);
      doc.setTextColor(...AC); doc.setFont('helvetica','normal'); doc.text(String(avgRir),155,y+5);
      doc.setTextColor(...G); doc.text(rm1?rm1+'kg':'—',167,y+5);
      y+=rowH;
      // Sub-séries só se tiver notas (economiza espaço)
      const setsWithNotes = sets.filter(s=>s.notes);
      if (setsWithNotes.length) {
        setsWithNotes.forEach(s=>{
          if(y>270){doc.addPage();y=20;}
          doc.setFillColor(250,252,255); doc.rect(18,y,178,4.5,'F');
          doc.setTextColor(...MU); doc.setFontSize(5.5); doc.setFont('helvetica','italic');
          doc.text(`S${s.setIdx+1} (${s.reps}×${s.load}kg): ${s.notes}`,22,y+3.2);
          y+=4.5;
        });
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
