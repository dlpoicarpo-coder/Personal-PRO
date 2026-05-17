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
          <button class="btn btn-ghost btn-sm" id="genPreLinkBtn">Link para aluno</button>
        </div>
        <p class="text-xs text-muted mb-sm">Preencha ou gere link para o aluno responder</p>
        ${['sleep|Sono|Como dormiu?','mood|Disposição|Como está hoje?','energy|Energia|Nível de energia','stress|Estresse|Nível de estresse','pain|Dor|Sente alguma dor?'].map(f => {
          const [n, l, desc] = f.split('|');
          return `
          <div class="form-group" style="margin-bottom:10px">
            <div class="flex items-center justify-between">
              <label class="form-label" style="margin:0" title="${desc}">${l}</label>
              <span style="font-size:1.1rem;font-weight:700;color:var(--primary);min-width:20px;text-align:right" id="preVal_${n}">5</span>
            </div>
            <input type="range" min="1" max="10" value="5" id="pre_${n}" style="width:100%;accent-color:var(--primary)"
              oninput="document.getElementById('preVal_${n}').textContent=this.value" />
            <div class="flex justify-between text-xs text-muted" style="margin-top:2px"><span>1</span><span>10</span></div>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${completed.length ? `
    <div class="card mt-lg">
      <div class="card-header"><span class="card-title">Sessões Recentes</span></div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Aluno</th><th>Treino</th><th>Data</th><th>Duração</th><th>Volume</th><th>Séries</th><th>PSE</th><th></th></tr></thead>
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
              <td style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm view-session" data-id="${s.id}" title="Ver" style="padding:4px 6px;color:var(--accent)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
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
              const pseVal   = done ? done.pse : '';
              return `
              <div class="set-row ${done ? 'set-done' : ''} ${isActive ? 'set-active' : ''}" data-si="${i}"
                style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;
                background:${isActive ? 'rgba(16,185,129,0.08)' : done ? 'rgba(16,185,129,0.04)' : 'var(--bg-page)'}">
                <span style="font-size:0.85rem;font-weight:700;min-width:20px;
                  color:${done ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)'}">${i + 1}</span>
                <input class="form-input set-reps" style="width:62px;text-align:center;padding:4px 6px" type="number" placeholder="Reps" value="${repsVal}" ${done ? 'disabled' : ''} />
                <input class="form-input set-load" style="width:70px;text-align:center;padding:4px 6px" type="number" step="0.5" placeholder="kg" value="${loadVal}" ${done ? 'disabled' : ''} />
                <input class="form-input set-pse" style="width:52px;text-align:center;padding:4px 6px" type="number" min="1" max="10" placeholder="PSE" value="${pseVal}" ${done ? 'disabled' : ''} />
                ${done
                  ? `<span class="badge badge-success" style="min-width:32px;text-align:center">✓</span>`
                  : `<button class="btn btn-primary btn-sm do-set" data-i="${i}" style="min-width:36px">✓</button>`}
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
              <span>Disp <strong>${s.preBiofeedback.mood||'-'}</strong></span>
              <span>Energ <strong>${s.preBiofeedback.energy||'-'}</strong></span>
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

  if (sSel) {
    sSel.addEventListener('change', async () => {
      const sid = sSel.value;
      if (!sid) { wSel.disabled = true; wSel.innerHTML = '<option>Selecione o aluno primeiro</option>'; sBtn.disabled = true; return; }
      const wks = (await db.getAll('workouts'))
        .filter(w => w.studentId === sid)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      wSel.disabled = false;
      wSel.innerHTML = '<option value="">Selecione o treino</option>' +
        wks.map(w => `<option value="${w.id}">${w.name}${w.phase ? ' — ' + w.phase : ''} (${Calc.formatDate(w.date)})</option>`).join('');
    });
    wSel?.addEventListener('change', () => { sBtn.disabled = !wSel.value; });

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
    const preBf = {};
    ['sleep','mood','energy','stress','pain'].forEach(k => { preBf[k] = parseInt(document.getElementById(`pre_${k}`)?.value) || 5; });
    const allBf = await db.getAll('biofeedback');
    const todayPre = allBf.find(f => f.studentId === wk.studentId && f.formType === 'pre' && new Date(f.date).toDateString() === new Date().toDateString());
    if (todayPre) { Object.assign(preBf, { sleep: todayPre.sleep, mood: todayPre.mood, energy: todayPre.energy, stress: todayPre.stress, pain: todayPre.pain }); notify.success('Dados pré-treino do aluno carregados!'); }
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
      const reps = parseInt(row.querySelector('.set-reps')?.value) || 0;
      const load = parseFloat(row.querySelector('.set-load')?.value) || 0;
      const pse  = parseInt(row.querySelector('.set-pse')?.value) || 0;
      const notes = document.getElementById('setNotes')?.value || '';

      state.setLog.push({ exIdx: state.exIdx, setIdx: i, reps, load, pse, notes, time: Date.now() });

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
          <div style="border-top:1px solid var(--border-color);padding-top:8px">
            <button type="button" class="btn btn-ghost btn-sm" id="genPostLink" style="width:100%;font-size:0.8rem">Gerar link pós-treino para o aluno</button>
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

    setTimeout(() => {
      document.getElementById('genPostLink')?.addEventListener('click', async () => {
        if (!state.session) return;
        const url = `${window.location.origin}${window.location.pathname}#/form/post/${state.session.id}`;
        navigator.clipboard?.writeText(url);
        notify.success('Link pós-treino copiado!');
      });
    }, 200);
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
  const summary  = buildSessionSummary(sessionData, student);
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
  const durMin = Math.round((session.totalDuration||0)/60);
  const exs    = session.exercises||[];
  const setLog = session.setLog||[];

  const exRows = exs.map((ex,i) => {
    const sets = setLog.filter(l=>l.exIdx===i);
    if (!sets.length) return `<tr style="opacity:0.4"><td>${ex.name}</td><td colspan="4">Não realizado</td></tr>`;
    const maxLoad=Math.max(...sets.map(s=>s.load||0));
    const totalReps=sets.reduce((t,s)=>t+(s.reps||0),0);
    const vol=sets.reduce((t,s)=>t+((s.reps||0)*(s.load||0)),0);
    return `<tr><td><strong>${ex.name}</strong></td><td>${sets.length}</td><td>${totalReps}</td><td>${maxLoad}kg</td><td>${vol}kg</td></tr>`;
  }).join('');

  openModal({
    title: 'Resumo da Sessão', size: 'lg',
    content: `
      <div style="background:var(--bg-page);border-radius:10px;padding:16px;margin-bottom:16px">
        <div class="flex items-center gap-md mb-md">
          <div class="avatar">${student?.name?.[0]||'?'}</div>
          <div>
            <div style="font-weight:700;font-size:1.05rem">${student?.name||'Aluno'}</div>
            <div class="text-muted text-sm">${session.workoutName||'Treino'} · ${new Date(session.date).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${[['Duração',durMin+'min','var(--primary)'],['Volume',(session.totalVolume||0)+'kg','var(--primary)'],['Séries',String(session.totalSets||0),'var(--primary)'],['PSE',String(session.postBiofeedback?.pse||'-'),(session.postBiofeedback?.pse||7)>8?'var(--danger)':'var(--success)']].map(([l,v,c])=>`
            <div style="text-align:center;padding:10px;background:var(--bg-card);border-radius:8px">
              <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted)">${l}</div>
              <div style="font-size:1.3rem;font-weight:700;color:${c};margin-top:2px">${v}</div>
            </div>`).join('')}
        </div>
      </div>
      <table class="data-table" style="font-size:0.82rem">
        <thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga máx</th><th>Volume</th></tr></thead>
        <tbody>${exRows}</tbody>
      </table>
      ${session.postBiofeedback?.notes?`<p class="text-sm text-muted mt-md">Obs: ${session.postBiofeedback.notes}</p>`:''}
    `,
    actions: [
      { label: 'WhatsApp', class: 'btn-secondary', onClick: () => {
        const phone = student?.phone?.replace(/\D/g,'')||'';
        if (!phone) { notify.warning('Aluno sem telefone'); return; }
        window.open(`https://wa.me/${phone.startsWith('55')?phone:'55'+phone}?text=${encodeURIComponent(summaryText)}`, '_blank');
      }},
      { label: 'Copiar', class: 'btn-secondary', onClick: () => { navigator.clipboard?.writeText(summaryText); notify.success('Copiado!'); }},
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

    let bx=14;
    [[`Duração`,durMin+' min'],[`Volume`,(session.totalVolume||0)+' kg'],[`Séries`,String(session.totalSets||0)],[`PSE`,String(session.postBiofeedback?.pse||'-')],[`Densidade`,(session.density||0).toFixed(2)]].forEach(([l,v])=>{
      doc.setFillColor(...li); doc.roundedRect(bx,48,36,16,2,2,'F');
      doc.setTextColor(...mu); doc.setFontSize(6.5); doc.text(l.toUpperCase(),bx+18,53,{align:'center'});
      doc.setTextColor(...g); doc.setFontSize(11); doc.setFont('helvetica','bold');
      doc.text(v,bx+18,60,{align:'center'}); doc.setFont('helvetica','normal'); bx+=39;
    });

    let y=74;
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

    doc.setFillColor(...dk); doc.rect(0,287,210,10,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(7);
    doc.text('Personal PRO — Sistema Profissional de Personal Trainer',105,293,{align:'center'});
    doc.save(`sessao_${(student?.name||'aluno').replace(/\s/g,'_')}_${date.replace(/\//g,'-')}.pdf`);
    notify.success('PDF gerado!');
  } catch(err) { notify.error('Erro ao gerar PDF.'); console.error(err); }
}
