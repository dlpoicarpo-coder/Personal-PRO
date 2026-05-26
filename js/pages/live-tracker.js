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
          <thead><tr><th>Aluno</th><th>Treino</th><th>Data</th><th>Duração</th><th>Volume</th><th>Séries</th><th>PSE</th><th>Carga</th><th style="text-align:right;min-width:100px">Ações</th></tr></thead>
          <tbody>${completed.map(s => {
            const st = students.find(x => x.id === s.studentId);
            const pse = s.postBiofeedback?.pse || 0;
            return `<tr>
              <td>${st?.name || '?'}</td>
              <td>${s.workoutName || '-'}</td>
              <td>${Calc.formatDate(s.date)}</td>
              <td>${formatTimeHMS(s.totalDuration || 0)}</td>
              <td>${s.totalVolume ? Math.round(s.totalVolume) : '-'} kg</td>
              <td>${s.totalSets || '-'}</td>
              <td style="color:${pse>8?'var(--danger)':pse>6?'var(--warning)':'var(--success)'}"><strong>${pse||'-'}</strong></td>
              <td>${Math.round(pse * ((s.totalDuration || 0) / 60))}</td>
              <td style="display:flex;gap:4px;justify-content:flex-end">
                <button class="btn btn-ghost btn-sm view-session" data-id="${s.id}" title="Ver" style="padding:4px 6px;color:var(--accent)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn btn-ghost btn-sm edit-session-btn" data-id="${s.id}" title="Editar" style="padding:4px 6px;color:var(--text-muted)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-ghost btn-sm delete-session" data-id="${s.id}" title="Excluir" style="padding:4px 6px;color:var(--danger)">
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
              ${ex.load ? `<span style="color:var(--accent);font-weight:600">${ex.load}${ex.name.toLowerCase().match(/cardio|aeróbico|esteira|bike|hiit|corrida|elíptico|natação/) ? '' : 'kg'}</span>` : ''}
              ${ex.oneRM ? `<span style="color:var(--text-muted);font-size:0.75rem">1RM: ${ex.oneRM}kg</span>` : ''}
              <span>${ex.rest || 60}s desc.</span>
              ${ex.method ? `<span class="badge badge-info" style="font-size:0.7rem">${ex.method}</span>` : ''}
            </div>
          </div>

          <div id="setArea" style="display:flex;flex-direction:column;gap:6px">
            ${Array.from({ length: exSets }, (_, i) => {
              const isCardio = (ex.name || '').toLowerCase().match(/cardio|aeróbico|esteira|bike|hiit|corrida|elíptico|natação/);
              const done     = state.setLog.find(l => l.exIdx === state.exIdx && l.setIdx === i);
              const isActive = !done && i === state.setIdx;
              const repsVal  = done ? done.reps : (isCardio ? (String(ex.reps||'')) : (String(ex.reps || '')).replace(/[^0-9]/g, '') || 12);
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
                  <span style="font-size:0.55rem;color:var(--text-muted)">${isCardio ? 'Tempo/Reps' : 'Reps'}</span>
                  <input class="form-input set-reps" style="width:58px;text-align:center;padding:4px 5px;font-size:0.9rem;font-weight:600" type="${isCardio ? 'text' : 'number'}" placeholder="—" value="${repsVal}" ${done ? 'disabled' : ''} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center">
                  <span style="font-size:0.55rem;color:var(--text-muted)">${isCardio ? 'Intens.' : 'kg'}</span>
                  <input class="form-input set-load" style="width:66px;text-align:center;padding:4px 5px;font-size:0.9rem;font-weight:600" type="${isCardio ? 'text' : 'number'}" step="0.5" placeholder="—" value="${loadVal}" ${done ? 'disabled' : ''} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center" title="PSE (Percepção de Esforço)">
                  <span style="font-size:0.55rem;color:var(--warning)">PSE</span>
                  <span style="font-size:0.9rem;font-weight:600;color:var(--text-muted)">${pseVal || '—'}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;align-items:center" title="RIR (Reps na Reserva)">
                  <span style="font-size:0.55rem;color:var(--accent);font-weight:600">RIR</span>
                  <span style="font-size:0.9rem;font-weight:600;color:var(--text-muted)">${rirVal !== '' ? rirVal : '—'}</span>
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
  document.querySelectorAll('.edit-session-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const session = await db.get('sessions', btn.dataset.id);
      if (!session) return;
      const students = await db.getAll('students');
      const student  = students.find(x => x.id === session.studentId);
      editSessionSummaryModal(session, student, navigateFn);
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
    });
    wSel?.addEventListener('change', async () => {
      sBtn.disabled = !wSel.value;
      if (wSel.value) {
        const wk = await db.get('workouts', wSel.value);
        if (wk?.studentId) {
          await checkPreBioStatus(wk.studentId);
          
          if (wk.macrocycleId) {
            const macro = await db.get('macrocycles', wk.macrocycleId).catch(()=>null);
            if (macro && macro.endDate) {
              const diffDays = Math.ceil((new Date(macro.endDate) - new Date()) / (1000 * 60 * 60 * 24));
              if (diffDays >= 0 && diffDays <= 7) {
                notify.warning(`Atenção: Macrociclo deste treino encerra em ${diffDays} dia(s)!`);
              }
            }
          }
        }
      }
    });

    // Função para verificar e exibir status do check-in do aluno
    async function checkPreBioStatus(sid) {
      const allBf   = await db.getAll('biofeedback');
      const todayPre = allBf.find(f =>
        f.studentId === sid &&
        f.formType === 'pre' &&
        new Date(f.date).toDateString() === new Date().toDateString()
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
            ['Sono',     todayPre.sleep,                 false],
            ['TQR',      (todayPre.tqr??todayPre.energy), false],
            ['Estresse', todayPre.stress,               true],
            ['Dor',      todayPre.pain,                 true],
          ];
          if (todayPre.food != null) vals.push(['Alim.', todayPre.food, false]);
          if (todayPre.menstrualCycle) vals.push(['Ciclo', todayPre.menstrualCycle, false]);
          
          valuesEl.innerHTML = vals.map(([l,v,inv])=>`
            <span style="padding:3px 8px;border-radius:12px;background:var(--bg-page);border:1px solid var(--border-color);color:${
              v==null?'var(--text-muted)':(typeof v==='string'?'var(--primary)':(inv?(v>=7?'var(--danger)':v>=5?'var(--warning)':'var(--success)'):(v<=3?'var(--danger)':v<=5?'var(--warning)':'var(--success)')))
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
    const url = `${window.location.origin}${window.location.pathname}#/form/pre/${sid}?t=${session?.trainerId||session?.trainer_id||''}&n=${encodeURIComponent(session?.studentName||'')}`;
    navigator.clipboard?.writeText(url);
    notify.success('Link pré-treino copiado!');
    openModal({
      title: 'Link Pré-Treino', size: 'sm',
      preventBackdropClose: true,
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
    // Carregar check-in do aluno (formulário enviado pelo aluno via link)
    const allBf = await db.getAll('biofeedback');
    const todayPre = allBf.find(f =>
      f.studentId === wk.studentId &&
      f.formType === 'pre' &&
      new Date(f.date).toDateString() === new Date().toDateString()
    );
    if (todayPre) {
      Object.assign(preBf, {
        sleep:  todayPre.sleep,
        tqr:    todayPre.tqr ?? todayPre.energy,
        energy: todayPre.tqr ?? todayPre.energy,
        stress: todayPre.stress,
        pain:   todayPre.pain,
        food:   todayPre.food,
        menstrualCycle: todayPre.menstrualCycle,
      });
      notify.success('Dados pré-treino do aluno carregados!');
    }
    const session = { studentId: wk.studentId, workoutId: wk.id, workoutName: wk.name, exercises: JSON.parse(JSON.stringify(wk.exercises || [])), date: new Date().toISOString(), startTime: Date.now(), status: 'running', soundEnabled: document.getElementById('trkSound')?.checked !== false, preBiofeedback: preBf, setLog: [] };
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
      const repsStr = row.querySelector('.set-reps')?.value || '';
      const reps = parseInt(repsStr) || 0; // Se isCardio, pode não ser numero, mas mantemos o valor bruto
      const loadStr = row.querySelector('.set-load')?.value || '';
      const load = parseFloat(loadStr) || 0;
      const notes = document.getElementById('setNotes')?.value || '';
      
      const curEx = state.session?.exercises?.[state.exIdx] || {};
      const isCardio = (curEx.name || '').toLowerCase().match(/cardio|aeróbico|esteira|bike|hiit|corrida|elíptico|natação/);

      // Iniciar timer de descanso assim que abrir o modal (conforme solicitado)
      state.isResting = true; state.workTimer?.stop(); state.workSec = state.workTimer?.getElapsed() || 0;
      state.restTimer.reset(); state.restTimer.start();
      const rb = document.getElementById('goRest'); if (rb) rb.textContent = '⏸ Pausar Descanso';
      const rl = document.getElementById('restLbl'); if (rl) { rl.textContent = 'Descansando...'; rl.style.color = ''; }

      openModal({
        title: `Feedback da Série ${i + 1}`,
        size: 'sm',
        content: `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Reps Realizadas</label>
              <input type="${isCardio ? 'text' : 'number'}" id="modalReps" class="form-input" value="${isCardio ? repsStr : reps}">
            </div>
            <div class="form-group">
              <label class="form-label">Carga</label>
              <input type="${isCardio ? 'text' : 'number'}" step="0.5" id="modalLoad" class="form-input" value="${isCardio ? loadStr : load}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">PSE (Escala de Borg Modificada) *</label>
            <select class="form-select" id="modalPse" style="font-size:0.9rem">
              <option value="">Selecione o esforço</option>
              <option value="0">0 - Repouso / Nenhum esforço</option>
              <option value="1">1 - Muito fraco</option>
              <option value="2">2 - Fraco</option>
              <option value="3">3 - Moderado</option>
              <option value="4">4 - Um pouco forte</option>
              <option value="5">5 - Forte</option>
              <option value="6">6 - Forte +</option>
              <option value="7" selected>7 - Muito forte</option>
              <option value="8">8 - Muito forte +</option>
              <option value="9">9 - Quase máximo</option>
              <option value="10">10 - Esforço Máximo</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">RIR (Repetições na Reserva) *</label>
            <select class="form-select" id="modalRir" style="font-size:0.9rem">
              <option value="">Selecione</option>
              <option value="0">0 - Falha / Sem sobrar nada</option>
              <option value="1">1 - Sobrou 1 rep</option>
              <option value="2">2 - Sobraram 2 reps</option>
              <option value="3">3 - Sobraram 3 reps</option>
              <option value="4">4+ - Sobraram 4 ou mais</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Observações da Série</label>
            <textarea id="modalNotes" class="form-textarea" rows="2" placeholder="Observações específicas..."></textarea>
          </div>
          <button id="modalSaveSet" class="btn btn-primary" style="width:100%;padding:12px;font-size:1rem">Concluir Série</button>
        `,
        actions: []
      });

      document.getElementById('modalSaveSet').addEventListener('click', () => {
        const pse = parseInt(document.getElementById('modalPse').value);
        const rir = parseInt(document.getElementById('modalRir').value);
        if (isNaN(rir) && !isCardio) {
          notify.error('Por favor, preencha o RIR.');
          return;
        }
        closeModal();

        // Validação: avisar se PSE ou RIR estão inconsistentes
        if (rir === 0 && pse > 0 && pse < 7) {
          notify.warning('RIR 0 (falha) com PSE baixo — verifique os valores.');
        }

        let rm1Estimated = null;
        const modalReps = document.getElementById('modalReps');
        const modalLoad = document.getElementById('modalLoad');
        const finalReps = isCardio ? (modalReps ? modalReps.value : repsStr) : (modalReps ? parseInt(modalReps.value) : reps);
        const finalLoad = isCardio ? (modalLoad ? modalLoad.value : loadStr) : (modalLoad ? parseFloat(modalLoad.value) : load);
        const modalNotesInput = document.getElementById('modalNotes')?.value;
        const finalNotes = modalNotesInput ? (notes ? notes + ' | ' + modalNotesInput : modalNotesInput) : notes;

        if (finalLoad > 0 && finalReps > 0 && finalReps <= 12) {
          rm1Estimated = Math.round((finalLoad * (1 + finalReps / 30)) * 2) / 2; // Epley
        }

        state.setLog.push({ exIdx: state.exIdx, setIdx: i, reps: finalReps, load: finalLoad, pse, rir: isNaN(rir) ? null : rir, notes: finalNotes, rm1Estimated, time: Date.now() });

        row.classList.add('set-done'); row.classList.remove('set-active');
        row.style.background = 'rgba(16,185,129,0.04)';
        row.querySelectorAll('input').forEach(inp => inp.disabled = true);
        
        row.children[3].innerHTML = `<span style="font-size:0.55rem;color:var(--warning)">PSE</span><span style="font-size:0.9rem;font-weight:600;color:var(--text-muted)">${pse}</span>`;
        row.children[4].innerHTML = `<span style="font-size:0.55rem;color:var(--accent);font-weight:600">RIR</span><span style="font-size:0.9rem;font-weight:600;color:var(--text-muted)">${isNaN(rir)?'—':rir}</span>`;
        
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

        notify.info(`Série ${i+1} ✓ — ${finalReps}×${finalLoad}${isCardio?'':'kg'}`);
      });
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
      preventBackdropClose: true,
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
    postBiofeedback: { pse: parseInt(post.pse)||7, satisfaction: parseInt(post.satisfaction)||8, notes: post.notes||'', submittedAt: new Date().toISOString() },
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

// ── EDIT SUMMARY ─────────────────────────────────────────────
function editSessionSummaryModal(session, student, navigateFn) {
  closeModal(() => {
    openModal({
      title: 'Editar Resumo da Sessão', size: 'md',
      content: `
        <form id="editPostF">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Data</label>
              <input class="form-input" name="date" type="date" value="${session.date ? session.date.slice(0,10) : ''}" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Duração (min)</label>
              <input class="form-input" name="duration" type="number" value="${session.totalDuration ? Math.round(session.totalDuration/60) : 0}" />
            </div>
            <div class="form-group"><label class="form-label">Volume Total (kg)</label>
              <input class="form-input" name="volume" type="number" value="${session.totalVolume ? Math.round(session.totalVolume) : 0}" />
            </div>
          </div>
          <div class="form-group" style="margin-top:10px">
            <div class="flex items-center justify-between mb-xs">
              <label class="form-label" style="margin:0">PSE (Esforço)</label>
              <span style="font-size:1.2rem;font-weight:700;color:var(--primary)" id="editPseV">${session.postBiofeedback?.pse || 7}</span>
            </div>
            <input name="pse" type="range" min="1" max="10" value="${session.postBiofeedback?.pse || 7}" style="width:100%;accent-color:var(--primary)" oninput="document.getElementById('editPseV').textContent=this.value" />
          </div>
          <div class="form-group">
            <label class="form-label">Séries Realizadas</label>
            <div style="max-height: 250px; overflow-y: auto; padding-right: 4px; border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; background: var(--bg-page);">
              ${(session.setLog || []).map((s, i) => {
                 const exName = (session.exercises || [])[s.exIdx]?.name || 'Exercício';
                 return `<div class="flex items-center gap-xs mb-xs" style="font-size:0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
                    <div style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${exName}">${s.setNum} - ${exName}</div>
                    <div style="display:flex;gap:4px">
                      <input class="form-input form-sm" name="set_${i}_reps" type="number" value="${s.reps||0}" style="width:45px;padding:2px;text-align:center" title="Repetições" />
                      <input class="form-input form-sm" name="set_${i}_load" type="number" value="${s.load||0}" style="width:45px;padding:2px;text-align:center" title="Carga (kg)" />
                      <input class="form-input form-sm" name="set_${i}_rest" type="number" value="${s.restDuration||0}" style="width:55px;padding:2px;text-align:center" title="Descanso (s)" />
                    </div>
                 </div>`;
              }).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea class="form-textarea" name="notes" rows="2">${session.postBiofeedback?.notes || ''}</textarea>
          </div>
        </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => {
          closeModal();
          // Optionally reopen the view summary if needed, but since it could have been accessed from the list, just close.
          if (document.querySelector('.view-session')) window.location.reload(); 
        }},
        { label: 'Salvar', class: 'btn-primary', onClick: async () => {
          const fd = new FormData(document.getElementById('editPostF'));
          session.postBiofeedback = session.postBiofeedback || {};
          session.postBiofeedback.pse = parseInt(fd.get('pse'));
          session.postBiofeedback.notes = fd.get('notes');
          session.date = fd.get('date') ? new Date(fd.get('date') + 'T12:00:00').toISOString() : session.date;
          session.totalDuration = (parseInt(fd.get('duration')) || 0) * 60;
          
          let totalVol = 0;
          (session.setLog || []).forEach((s, i) => {
            s.reps = parseInt(fd.get(`set_${i}_reps`)) || 0;
            s.load = parseFloat(fd.get(`set_${i}_load`)) || 0;
            s.restDuration = parseInt(fd.get(`set_${i}_rest`)) || 0;
            totalVol += (s.reps * s.load);
          });
          
          session.totalVolume = totalVol > 0 ? totalVol : (parseInt(fd.get('volume')) || 0);

          await db.put('sessions', session);
          notify.success('Sessão atualizada!');
          closeModal(() => {
            window.location.reload();
          });
        }}
      ]
    });
  });
}

// ── SHOW SUMMARY ─────────────────────────────────────────────
function showSessionSummary(summaryText, session, student, navigateFn) {
  const durMin = Math.round((session.totalDuration||0)/60);
  const exs    = session.exercises||[];
  const setLog = session.setLog||[];
  const ini    = (student?.name||'?').split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();

  const pse = session.postBiofeedback?.pse || 7;
  const cargaTotal = Math.round(pse * durMin);
  const peso = student?.weight || session?.studentWeight || (session?.preBiofeedback?.peso) || 70;
  const kcalEst = Calc.caloriasAtividade(peso, durMin, 'musculacao');

  const exRows = exs.map((ex,i) => {
    const sets = setLog.filter(l=>l.exIdx===i);
    if (!sets.length) return `<tr style="opacity:0.4"><td colspan="7">${ex.name} — não realizado</td></tr>`;
    const maxLoad   = Math.max(...sets.map(s=>s.load||0));
    const totalReps = sets.reduce((t,s)=>t+(s.reps||0),0);
    const vol       = sets.reduce((t,s)=>t+((s.reps||0)*(s.load||0)),0);
    const avgPse    = sets.filter(s=>s.pse).length
      ? (sets.reduce((t,s)=>t+(s.pse||0),0)/sets.filter(s=>s.pse).length).toFixed(1) : '—';
    const avgRir    = sets.filter(s=>s.rir!=null).length
      ? (sets.reduce((t,s)=>t+(s.rir??0),0)/sets.filter(s=>s.rir!=null).length).toFixed(1) : '—';
    const rm1Est    = sets.find(s=>s.rm1Estimated)?.rm1Estimated;

    // Linhas de sub-séries
    const setDetail = sets.map(s=>
      `<div style="font-size:0.7rem;color:var(--text-muted);padding-left:8px">
        S${s.setIdx+1}: <strong style="color:var(--text-primary)">${s.reps}×${s.load}kg</strong>
        ${s.pse?`<span style="color:var(--warning)"> PSE ${s.pse}</span>`:''}
        ${s.rir!=null?`<span style="color:var(--accent)"> RIR ${s.rir}</span>`:''}
      </div>`).join('');

    return `
      <tr>
        <td>
          <strong style="font-size:0.85rem">${ex.name}</strong>
          ${ex.method?`<div style="font-size:0.68rem;color:var(--accent)">${ex.method}</div>`:''}
          <div id="setDetail_${i}" style="display:none">${setDetail}</div>
          <button onclick="const d=document.getElementById('setDetail_${i}');d.style.display=d.style.display==='none'?'':'none'"
            style="font-size:0.65rem;color:var(--primary);background:none;border:none;cursor:pointer;padding:1px 0">
            ▸ séries
          </button>
        </td>
        <td style="text-align:center">${sets.length}</td>
        <td style="text-align:center">${totalReps}</td>
        <td style="text-align:center;font-weight:600">${maxLoad}kg</td>
        <td style="text-align:center;color:var(--primary)">${vol}kg</td>
        <td style="text-align:center;color:var(--warning)">${avgPse}</td>
        <td style="text-align:center;color:var(--accent)">${avgRir}</td>
        ${rm1Est?`<td style="text-align:center;color:var(--success);font-weight:600">${rm1Est}kg</td>`:`<td style="text-align:center;color:var(--text-muted)">—</td>`}
      </tr>`;
  }).join('');

  openModal({
    title: 'Resumo da Sessão', size: 'xl',
    preventBackdropClose: true,
    content: `
      <div style="background:var(--bg-page);border-radius:10px;padding:16px;margin-bottom:16px">
        <div class="flex items-center gap-md mb-md">
          <div class="avatar">${ini}</div>
          <div>
            <div style="font-weight:700;font-size:1.05rem">${student?.name||'Aluno'}</div>
            <div class="text-muted text-sm">${session.workoutName||'Treino'} · ${new Date(session.date).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">
          ${[
            ['Duração',      durMin+' min',                           '#3b82f6', 'rgba(59,130,246,0.08)'],
            ['Volume',       Math.round(session.totalVolume||0)+' kg','#10b981', 'rgba(16,185,129,0.08)'],
            ['Carga Total',  String(cargaTotal),                      '#f59e0b', 'rgba(245,158,11,0.08)'],
            ['Séries',       String(session.totalSets||0),            '#8b5cf6', 'rgba(139,92,246,0.08)'],
            ['PSE Final',    String(session.postBiofeedback?.pse||'—'),
              (session.postBiofeedback?.pse||0)>8?'#ef4444':(session.postBiofeedback?.pse||0)>6?'#f59e0b':'#10b981',
              (session.postBiofeedback?.pse||0)>8?'rgba(239,68,68,0.08)':(session.postBiofeedback?.pse||0)>6?'rgba(245,158,11,0.08)':'rgba(16,185,129,0.08)'],
            ['Gasto Kcal',   kcalEst+' kcal',                         '#06b6d4', 'rgba(6,182,212,0.08)'],
          ].map(([l,v,c,bg])=>`
            <div style="text-align:center;padding:10px;background:${bg};border:1px solid ${c}33;border-radius:8px">
              <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted)">${l}</div>
              <div style="font-size:1.2rem;font-weight:700;color:${c};margin-top:2px">${v}</div>
            </div>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:6px;display:flex;gap:16px;font-size:0.68rem;color:var(--text-muted)">
        <span style="color:var(--warning)">■ PSE = Percepção de esforço (1-10)</span>
        <span style="color:var(--accent)">■ RIR = Reps in Reserve (0=falha, 3=3 reps sobrando)</span>
        <span style="color:var(--success)">■ 1RM = Estimativa Epley</span>
      </div>
      <div class="table-container">
        <table class="data-table" style="font-size:0.82rem">
          <thead><tr>
            <th>Exercício</th><th style="text-align:center">Séries</th><th style="text-align:center">Reps</th>
            <th style="text-align:center">Carga máx</th><th style="text-align:center">Volume</th>
            <th style="text-align:center;color:var(--warning)">PSE</th>
            <th style="text-align:center;color:var(--accent)">RIR</th>
            <th style="text-align:center;color:var(--success)">1RM Est.</th>
          </tr></thead>
          <tbody>${exRows}</tbody>
        </table>
      </div>
      ${session.postBiofeedback?.notes?`<p class="text-sm text-muted mt-md">Obs: ${session.postBiofeedback.notes}</p>`:''}
    `,
    actions: [
      { label: 'WhatsApp', class: 'btn-secondary', onClick: () => {
        const phone = student?.phone?.replace(/\D/g,'')||'';
        if (!phone) { notify.warning('Aluno sem telefone'); return; }
        window.open(`https://wa.me/${phone.startsWith('55')?phone:'55'+phone}?text=${encodeURIComponent(summaryText)}`, '_blank');
      }},
      { label: 'Copiar', class: 'btn-secondary', onClick: () => { navigator.clipboard?.writeText(summaryText); notify.success('Copiado!'); }},
      { label: 'Editar', class: 'btn-secondary', onClick: () => editSessionSummaryModal(session, student, navigateFn) },
      { label: 'PDF', class: 'btn-secondary', onClick: () => generateSessionPDF(session, student) },
      { label: 'Fechar', class: 'btn-primary', onClick: () => { closeModal(); navigateFn('/tracker'); }},
    ]
  });
}

// ── PDF ──────────────────────────────────────────────────────
function generateSessionPDF(session, student) {
  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { notify.error('jsPDF não disponível'); return; }
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const g=[16,185,129], dk=[15,23,42], mu=[100,116,139], li=[241,245,249];
    const durMin=Math.round((session.totalDuration||0)/60);
    const exs=session.exercises||[], setLog=session.setLog||[];
    const date=new Date(session.date).toLocaleDateString('pt-BR');

    doc.setFillColor(...g); doc.rect(0,0,210,26,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('Personal PRO',14,11);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('Relatório de Sessão',14,19);
    doc.text(date,196,11,{align:'right'});

    doc.setTextColor(...dk); doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text(student?.name||'Aluno',14,36);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.setTextColor(...mu);
    doc.text(session.workoutName||'Treino',14,42);

    const pse = session.postBiofeedback?.pse || 7;
    const cargaTotal = Math.round(pse * durMin);
    const peso = student?.weight || session?.studentWeight || (session?.preBiofeedback?.peso) || 70;
    const kcalEst = Calc.caloriasAtividade(peso, durMin, 'musculacao');

    const densidade = session.density ? session.density.toFixed(2) : '0.00';
    const cards = [
      { label: 'DURAÇÃO', value: durMin + 'm', bg: [239, 246, 255], accent: [59, 130, 246] },
      { label: 'VOLUME', value: (session.totalVolume || 0) + 'kg', bg: [240, 253, 248], accent: [16, 185, 129] },
      { label: 'CARGA TOT.', value: String(cargaTotal), bg: [254, 243, 199], accent: [245, 158, 11] },
      { label: 'SÉRIES', value: String(session.totalSets || 0), bg: [245, 243, 255], accent: [139, 92, 246] },
      { label: 'DENSIDADE', value: densidade, bg: [254, 242, 242], accent: [220, 38, 38] },
      { label: 'PSE', value: String(session.postBiofeedback?.pse || '-'), bg: [254, 226, 226], accent: [239, 68, 68] },
      { label: 'KCAL', value: String(kcalEst), bg: [224, 242, 254], accent: [2, 132, 199] },
    ];

    let bx = 14;
    let by = 48;
    cards.forEach((card, idx) => {
      if (idx > 0 && idx % 4 === 0) {
        bx = 14;
        by += 20;
      }
      doc.setFillColor(...card.bg);
      doc.roundedRect(bx, by, 42.5, 16, 2, 2, 'F');
      
      doc.setTextColor(100, 116, 139); // Slate-500 for secondary label
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text(card.label, bx + 21.25, by + 5, { align: 'center' });
      
      doc.setTextColor(...card.accent);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, bx + 21.25, by + 12, { align: 'center' });
      
      bx += 46.5; 
    });

    let y = (cards.length > 4) ? 92 : 74;
    doc.setTextColor(...dk); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Exercícios Realizados',14,y); y+=5;
    doc.setFillColor(...g); doc.rect(14,y,182,6.5,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(7.5);
    [['Exercício',14],['Séries',94],['Reps',114],['Carga máx',134],['Volume',162]].forEach(([h,x])=>doc.text(h,x+1,y+4.5));
    y+=6.5;

    exs.forEach((ex,i)=>{
      const sets=setLog.filter(l=>l.exIdx===i);
      if(!sets.length) return;
      const maxLoad=Math.max(...sets.map(s=>s.load||0));
      const totalReps=sets.reduce((t,s)=>t+(s.reps||0),0);
      const vol=sets.reduce((t,s)=>t+((s.reps||0)*(s.load||0)),0);
      doc.setFillColor(i%2===0?248:255,i%2===0?250:255,i%2===0?252:255);
      doc.rect(14,y,182,6.5,'F');
      doc.setTextColor(...dk); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
      doc.text(ex.name||'-',15,y+4.5);
      doc.text(String(sets.length),95,y+4.5);
      doc.text(String(totalReps),115,y+4.5);
      doc.text(maxLoad+'kg',135,y+4.5);
      doc.text(vol+'kg',163,y+4.5);
      y+=6.5; if(y>272){doc.addPage();y=20;}
    });

    if (session.postBiofeedback?.notes) {
      y += 5;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setTextColor(...dk); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      const splitNotes = doc.splitTextToSize(session.postBiofeedback.notes, 180);
      doc.text(splitNotes, 14, y);
      y += splitNotes.length * 4;
    }

    doc.setFillColor(...dk); doc.rect(0,287,210,10,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(7);
    doc.text('Personal PRO — Sistema Profissional de Personal Trainer',105,293,{align:'center'});
    doc.save(`sessao_${(student?.name||'aluno').replace(/\s/g,'_')}_${date.replace(/\//g,'-')}.pdf`);
    notify.success('PDF gerado!');
  } catch(err) { notify.error('Erro ao gerar PDF.'); console.error(err); }
}

