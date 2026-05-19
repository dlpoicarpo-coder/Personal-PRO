// ========================================
// PERSONAL PRO — Live Tracker Page (v2)
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { Timer, formatTime, formatTimeHMS } from '../components/timer.js';
import { notify } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

// Persistent state across re-renders
const state = {
  session: null,
  workoutTimer: null,
  restTimer: null,
  exIdx: 0,
  setIdx: 0,
  setLog: [],
  workSec: 0,
};

function resetState() {
  if (state.workoutTimer) { state.workoutTimer.stop(); state.workoutTimer = null; }
  if (state.restTimer) { state.restTimer.stop(); state.restTimer = null; }
  state.session = null; state.exIdx = 0; state.setIdx = 0;
  state.setLog = []; state.workSec = 0;
}

function totalVolume() {
  return state.setLog.reduce((t, s) => t + ((s.reps || 0) * (s.load || 0)), 0);
}

// ======================== RENDER ========================

export async function renderTracker() {
  const students = await db.getAll('students');
  const active = students.filter(s => s.status === 'Ativo');
  const sessions = await db.getAll('sessions');

  // Check if there's a running session we need to resume
  if (!state.session) {
    const running = sessions.find(s => s.status === 'running');
    if (running) {
      state.session = running;
      state.setLog = running.setLog || [];
      state.exIdx = running.currentExIdx || 0;
    }
  }

  // ACTIVE SESSION VIEW
  if (state.session) {
    return renderLiveView(students);
  }

  // SETUP VIEW
  const completed = sessions.filter(s => s.status === 'completed').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  return `
    <div class="page-header"><div><h1>Treino ao Vivo</h1><p class="subtitle">Selecione um aluno e treino para iniciar a sessão</p></div></div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">▶ Iniciar Sessão</span></div>
        <div class="form-group"><label class="form-label">Aluno *</label>
          <select class="form-select" id="trkStudent"><option value="">Selecione o aluno</option>${active.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Treino *</label>
          <select class="form-select" id="trkWorkout" disabled><option value="">Selecione o aluno primeiro</option></select>
        </div>
        <div class="form-group">
          <label class="flex items-center gap-sm"><input type="checkbox" id="trkSound" checked /> Bipe ao fim do descanso</label>
        </div>
        <button class="btn btn-primary" id="startBtn" disabled style="width:100%;margin-top:12px;padding:14px">Iniciar Treino ao Vivo</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Pré-Treino (preenchido pelo personal)</span></div>
        <p class="text-muted text-sm mb-md">Ou peça ao aluno para preencher pelo link abaixo</p>
        ${['sleep|Sono','mood|Humor','energy|Disposição','stress|Estresse','pain|Dor'].map(f => {
          const [n, l] = f.split('|');
          return `<div class="form-group" style="margin-bottom:8px"><div class="flex items-center justify-between"><label class="form-label" style="margin:0">${l}</label><span class="text-gradient" style="font-weight:700" id="preVal_${n}">5</span></div><input type="range" min="1" max="10" value="5" id="pre_${n}" style="width:100%" oninput="document.getElementById('preVal_${n}').textContent=this.value" /></div>`;
        }).join('')}
        <button class="btn btn-secondary btn-sm mt-md" id="genPreLinkBtn" style="width:100%">Gerar link para o aluno preencher</button>
      </div>
    </div>
    ${completed.length ? `
    <div class="card mt-lg"><div class="card-header"><span class="card-title">Sessões Recentes</span></div>
      <div class="table-container"><table class="data-table"><thead><tr><th>Aluno</th><th>Treino</th><th>Data</th><th>Duração</th><th>Densidade</th><th>Volume</th><th>PSE</th></tr></thead>
      <tbody>${completed.map(s => {
        const st = students.find(x => x.id === s.studentId);
        return `<tr><td>${st ? st.name : '?'}</td><td>${s.workoutName || '-'}</td><td>${Calc.formatDate(s.date)}</td><td>${formatTimeHMS(s.totalDuration || 0)}</td><td>${s.density ? s.density.toFixed(2) : '-'}</td><td>${s.totalVolume || '-'} kg</td><td>${s.postBiofeedback?.pse || '-'}</td></tr>`;
      }).join('')}</tbody></table></div>
    </div>` : ''}
  `;
}

function renderLiveView(students) {
  const s = state.session;
  const st = students.find(x => x.id === s.studentId);
  const exs = s.exercises || [];
  const ex = exs[state.exIdx] || {};
  const totalSets = exs.reduce((sum, e) => sum + (parseInt(e.sets) || 3), 0);
  const doneSets = state.setLog.length;
  const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const exSets = parseInt(ex.sets) || 3;

  return `
    <div class="tracker-live">
      <div class="tracker-header">
        <div class="flex items-center gap-md">
          <div class="avatar">${st ? st.name[0] : '?'}</div>
          <div><h2 style="margin:0">${st ? st.name : 'Aluno'}</h2><div class="text-muted text-sm">${s.workoutName || 'Treino'}</div></div>
        </div>
        <div class="flex items-center gap-md">
          <div class="live-indicator"><span class="live-dot-anim"></span> AO VIVO</div>
          <button class="btn btn-danger btn-sm" id="endBtn">Finalizar</button>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
        <div class="stat-card" style="text-align:center"><div class="stat-label">DURAÇÃO</div><div class="stat-value text-gradient" id="liveTotal">00:00</div></div>
        <div class="stat-card" style="text-align:center"><div class="stat-label">TRABALHO</div><div class="stat-value" id="liveWork" style="color:var(--success)">${formatTime(state.workSec)}</div></div>
        <div class="stat-card" style="text-align:center"><div class="stat-label">DESCANSO</div><div class="stat-value" id="liveRest" style="color:var(--warning)">00:00</div></div>
        <div class="stat-card" style="text-align:center"><div class="stat-label">DENSIDADE</div><div class="stat-value" id="liveDens" style="color:var(--accent)">0.00</div></div>
        <div class="stat-card" style="text-align:center"><div class="stat-label">VOLUME</div><div class="stat-value" id="liveVol" style="color:var(--primary)">${totalVolume()} kg</div></div>
      </div>

      <div class="progress-bar mb-md" style="height:8px"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="text-center text-muted text-sm mb-lg">${doneSets}/${totalSets} séries · ${pct}%</div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Exercício ${state.exIdx + 1}/${exs.length}</span>
            <div class="flex gap-sm">
              <button class="btn btn-ghost btn-sm" id="prevEx" ${state.exIdx === 0 ? 'disabled' : ''}>←</button>
              <button class="btn btn-ghost btn-sm" id="nextEx" ${state.exIdx >= exs.length - 1 ? 'disabled' : ''}>→</button>
            </div>
          </div>
          <h3 class="text-gradient" style="font-size:1.2rem;margin:8px 0">${ex.name || '—'}</h3>
          <div class="flex gap-md text-sm text-muted mb-md">
            <span>${exSets} séries</span><span>${ex.reps || '12'} reps</span>
            <span>${ex.load ? ex.load + 'kg' : '—'}</span><span>${ex.rest || 60}s desc.</span>
            ${ex.method ? `<span>${ex.method}</span>` : ''}
          </div>
          <div id="setArea">
            ${Array.from({ length: exSets }, (_, i) => {
              const done = state.setLog.find(l => l.exIdx === state.exIdx && l.setIdx === i);
              const isActive = !done && i === state.setIdx;
              const repsVal = done ? done.reps : (ex.reps || '').replace(/[^0-9]/g, '') || 12;
              const loadVal = done ? done.load : ex.load || '';
              return `<div class="set-row ${done ? 'set-done' : ''} ${isActive ? 'set-active' : ''}" data-si="${i}">
                <span class="set-num">${i + 1}</span>
                <input class="form-input set-reps" style="width:65px" type="number" placeholder="Reps" value="${repsVal}" ${done ? 'disabled' : ''} />
                <input class="form-input set-load" style="width:75px" type="number" step="0.5" placeholder="kg" value="${loadVal}" ${done ? 'disabled' : ''} />
                <input class="form-input set-pse" style="width:55px" type="number" min="1" max="10" placeholder="PSE" value="${done ? done.pse : ''}" ${done ? 'disabled' : ''} />
                ${done ? '<span class="badge badge-success">✓</span>' : `<button class="btn btn-primary btn-sm do-set" data-i="${i}">✓</button>`}
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Descanso</span>
            <label class="flex items-center gap-sm text-sm"><input type="checkbox" id="sndToggle" ${s.soundEnabled !== false ? 'checked' : ''} /> Som</label>
          </div>
          <div class="timer-display">
            <div class="timer-value" id="restCount">${formatTime(parseInt(ex.rest) || 60)}</div>
            <div class="timer-label text-muted" id="restLbl">Pronto</div>
          </div>
          <div class="flex gap-sm" style="justify-content:center">
            <button class="btn btn-primary" id="goRest">▶ Descanso</button>
            <button class="btn btn-secondary" id="rstRest">↺</button>
          </div>
          <div class="flex gap-sm mt-md" style="justify-content:center;flex-wrap:wrap">
            ${[30, 45, 60, 90, 120].map(t => `<button class="btn btn-ghost btn-sm rp" data-t="${t}">${t}s</button>`).join('')}
          </div>
          <hr style="border-color:var(--border-color);margin:16px 0">
          <h4 class="mb-sm text-sm">Lista de Exercícios</h4>
          ${exs.map((e, i) => {
            const exDone = state.setLog.filter(l => l.exIdx === i).length >= (parseInt(e.sets) || 3);
            return `<div class="flex items-center gap-sm go-ex" data-g="${i}" style="padding:5px 0;cursor:pointer;${i === state.exIdx ? 'color:var(--primary);font-weight:600' : 'color:var(--text-secondary)'}">
              <span style="font-size:0.75rem">${exDone ? '✓' : i === state.exIdx ? '●' : '○'}</span>
              <span class="text-sm">${e.name}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ======================== INIT ========================

export function initTracker(navigateFn) {
  // --- SETUP MODE ---
  const sSel = document.getElementById('trkStudent');
  const wSel = document.getElementById('trkWorkout');
  const sBtn = document.getElementById('startBtn');

  if (sSel) {
    sSel.addEventListener('change', async () => {
      const sid = sSel.value;
      if (!sid) { wSel.disabled = true; wSel.innerHTML = '<option value="">Selecione o aluno</option>'; sBtn.disabled = true; return; }
      const wks = (await db.getAll('workouts')).filter(w => w.studentId === sid).sort((a, b) => new Date(b.date) - new Date(a.date));
      wSel.disabled = false;
      wSel.innerHTML = '<option value="">Selecione</option>' + wks.map(w => `<option value="${w.id}">${w.name} (${Calc.formatDate(w.date)})</option>`).join('');
    });
    wSel?.addEventListener('change', () => { sBtn.disabled = !wSel.value; });
  }

  // Generate pre-workout link for student
  document.getElementById('genPreLinkBtn')?.addEventListener('click', () => {
    const sid = sSel?.value;
    if (!sid) { notify.warning('Selecione um aluno primeiro'); return; }
    const url = `${window.location.origin}${window.location.pathname}#/form/pre/${sid}`;
    navigator.clipboard?.writeText(url);
    notify.success('Link copiado! Envie para o aluno.');
    openModal({
      title: 'Link do Pré-Treino', size: 'md',
      content: `<p class="text-muted mb-md">Envie este link para o aluno preencher o formulário pré-treino:</p>
        <div class="form-input" style="word-break:break-all;padding:12px;background:var(--bg-card)">${url}</div>
        <p class="text-muted text-sm mt-md">O aluno pode abrir no celular. Os dados serão salvos automaticamente.</p>`,
    });
  });

  // Start session
  if (sBtn) {
    sBtn.addEventListener('click', async () => {
      const wk = await db.get('workouts', wSel.value);
      if (!wk) return;
      const preBf = {};
      ['sleep', 'mood', 'energy', 'stress', 'pain'].forEach(k => {
        preBf[k] = parseInt(document.getElementById(`pre_${k}`)?.value) || 5;
      });

      // Check if student submitted pre-workout form
      const pendingForms = await db.getAll('biofeedback');
      const todayPre = pendingForms.find(f => f.studentId === wk.studentId && f.formType === 'pre' && new Date(f.date).toDateString() === new Date().toDateString());
      if (todayPre) {
        Object.assign(preBf, { sleep: todayPre.sleep, mood: todayPre.mood, energy: todayPre.energy, stress: todayPre.stress, pain: todayPre.pain });
        notify.info('Dados pré-treino do aluno carregados automaticamente!');
      }

      const session = {
        studentId: wk.studentId, workoutId: wk.id, workoutName: wk.name,
        exercises: JSON.parse(JSON.stringify(wk.exercises || [])),
        date: new Date().toISOString(), startTime: Date.now(),
        status: 'running', soundEnabled: document.getElementById('trkSound')?.checked !== false,
        preBiofeedback: preBf, setLog: [],
      };
      await db.add('sessions', session);
      resetState();
      state.session = session;
      notify.success('Sessão iniciada!');
      navigateFn('/tracker');
    });
  }

  // --- LIVE MODE ---
  if (!state.session) return;

  // Total timer
  if (!state.workoutTimer) {
    const elapsed0 = Math.floor((Date.now() - state.session.startTime) / 1000);
    state.workoutTimer = new Timer({ mode: 'stopwatch' });
    state.workoutTimer.elapsed = elapsed0;
    state.workoutTimer.start();
  }

  // Update display loop
  const updateUI = () => {
    if (!state.session) return;
    const el = state.workoutTimer?.getElapsed() || 0;
    const totalEl = document.getElementById('liveTotal');
    const workEl = document.getElementById('liveWork');
    const restEl = document.getElementById('liveRest');
    const densEl = document.getElementById('liveDens');
    if (totalEl) totalEl.textContent = formatTime(el);
    if (workEl) workEl.textContent = formatTime(state.workSec);
    const rs = Math.max(0, el - state.workSec);
    if (restEl) restEl.textContent = formatTime(rs);
    if (densEl) densEl.textContent = el > 0 ? (state.workSec / el).toFixed(2) : '0.00';
  };
  const uiInterval = setInterval(updateUI, 500);
  state._uiInterval = uiInterval;
  updateUI();

  // Rest timer
  const curEx = (state.session.exercises || [])[state.exIdx] || {};
  const restDur = parseInt(curEx.rest) || 60;
  if (state.restTimer) { state.restTimer.stop(); }
  state.restTimer = new Timer({
    mode: 'countdown', duration: restDur,
    soundEnabled: state.session.soundEnabled !== false,
    onTick: (rem) => {
      const c = document.getElementById('restCount');
      const l = document.getElementById('restLbl');
      if (c) { c.textContent = formatTime(rem); c.style.color = rem <= 5 ? 'var(--danger)' : rem <= 15 ? 'var(--warning)' : ''; }
      if (l) l.textContent = 'Descansando...';
    },
    onComplete: () => {
      const l = document.getElementById('restLbl');
      if (l) { l.textContent = 'HORA DE TREINAR!'; l.style.color = 'var(--primary)'; }
      notify.success('Descanso finalizado!');
    }
  });

  document.getElementById('goRest')?.addEventListener('click', () => {
    state.restTimer.soundEnabled = document.getElementById('sndToggle')?.checked !== false;
    if (state.restTimer.running) state.restTimer.stop();
    else { state.restTimer.reset(); state.restTimer.start(); }
  });
  document.getElementById('rstRest')?.addEventListener('click', () => {
    state.restTimer.reset();
    const c = document.getElementById('restCount'); if (c) c.textContent = formatTime(state.restTimer.duration);
    const l = document.getElementById('restLbl'); if (l) { l.textContent = 'Pronto'; l.style.color = ''; }
  });
  document.querySelectorAll('.rp').forEach(b => b.addEventListener('click', () => {
    state.restTimer.reset(); state.restTimer.setDuration(parseInt(b.dataset.t));
    const c = document.getElementById('restCount'); if (c) c.textContent = formatTime(state.restTimer.duration);
  }));
  document.getElementById('sndToggle')?.addEventListener('change', e => { state.restTimer.soundEnabled = e.target.checked; });

  // Complete set — INLINE update, no full re-render
  document.querySelectorAll('.do-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.i);
      const row = btn.closest('.set-row');
      const reps = parseInt(row.querySelector('.set-reps')?.value) || 0;
      const load = parseFloat(row.querySelector('.set-load')?.value) || 0;
      const pse = parseInt(row.querySelector('.set-pse')?.value) || 0;

      state.setLog.push({ exIdx: state.exIdx, setIdx: i, reps, load, pse, time: Date.now() });
      state.workSec += 30;

      // Update row visually (no re-render!)
      row.classList.add('set-done');
      row.classList.remove('set-active');
      row.querySelectorAll('input').forEach(inp => inp.disabled = true);
      btn.replaceWith(Object.assign(document.createElement('span'), { className: 'badge badge-success', textContent: '✓' }));

      // Advance active set
      const exSets = parseInt(curEx.sets) || 3;
      const nextSet = i + 1;
      if (nextSet < exSets) {
        state.setIdx = nextSet;
        const nextRow = document.querySelector(`[data-si="${nextSet}"]`);
        if (nextRow) nextRow.classList.add('set-active');
      }

      // Update volume
      const volEl = document.getElementById('liveVol');
      if (volEl) volEl.textContent = totalVolume() + ' kg';

      // Update progress
      const totalS = (state.session.exercises || []).reduce((s, e) => s + (parseInt(e.sets) || 3), 0);
      const doneS = state.setLog.length;
      const fill = document.querySelector('.progress-fill');
      if (fill) fill.style.width = Math.round((doneS / totalS) * 100) + '%';

      // Save progress
      state.session.setLog = state.setLog;
      state.session.currentExIdx = state.exIdx;
      db.put('sessions', state.session);

      // Auto-start rest
      state.restTimer.reset();
      state.restTimer.start();

      notify.info(`Série ${i + 1} ✓ — ${reps} reps × ${load}kg`);
    });
  });

  // Navigate exercises — inline update, NO full re-render
  const refreshExerciseView = async () => {
    // Re-render just the tracker page content while preserving timers
    const students = await db.getAll('students');
    const content = document.getElementById('pageContent');
    if (content && state.session) {
      content.innerHTML = renderLiveView(students);
      initTracker(navigateFn);
    }
  };
  document.getElementById('prevEx')?.addEventListener('click', () => { if (state.exIdx > 0) { state.exIdx--; state.setIdx = 0; refreshExerciseView(); } });
  document.getElementById('nextEx')?.addEventListener('click', () => { if (state.exIdx < (state.session.exercises || []).length - 1) { state.exIdx++; state.setIdx = 0; refreshExerciseView(); } });
  document.querySelectorAll('.go-ex').forEach(el => el.addEventListener('click', () => { state.exIdx = parseInt(el.dataset.g); state.setIdx = 0; refreshExerciseView(); }));

  // End session
  document.getElementById('endBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Finalizar sessão?')) return;
    // Stop all timers immediately
    if (state._uiInterval) { clearInterval(state._uiInterval); state._uiInterval = null; }
    if (state.workoutTimer) { state.workoutTimer.stop(); }
    if (state.restTimer) { state.restTimer.stop(); }
    const dur = state.workoutTimer?.getElapsed() || 0;
    const vol = totalVolume();
    const dens = dur > 0 ? state.workSec / dur : 0;

    openModal({
      title: 'Pós-Treino', size: 'md',
      content: `<form id="postF">
        <div class="form-group"><label class="form-label">PSE Geral do treino (1-10)</label><input class="form-input" name="pse" type="range" min="1" max="10" value="7" oninput="document.getElementById('pseV').textContent=this.value" /><span id="pseV" style="font-size:1.2rem;font-weight:700">7</span></div>
        <div class="form-group"><label class="form-label">Satisfação (1-10)</label><input class="form-input" name="satisfaction" type="range" min="1" max="10" value="8" oninput="document.getElementById('satV').textContent=this.value" /><span id="satV" style="font-size:1.2rem;font-weight:700">8</span></div>
        <div class="form-group"><label class="form-label">Observações</label><textarea class="form-textarea" name="notes" rows="2" placeholder="Como foi o treino?"></textarea></div>
        <p class="text-muted text-sm mt-md">Ou gere um link para o aluno preencher:</p>
        <button type="button" class="btn btn-secondary btn-sm" id="genPostLink">Gerar link pós-treino</button>
      </form>`,
      actions: [
        { label: 'Salvar e Finalizar', class: 'btn-primary', id: 'doSave', onClick: async () => {
          // Disable button to prevent double-click
          const btn = document.getElementById('doSave');
          if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
          try {
            const fd = new FormData(document.getElementById('postF'));
            const post = Object.fromEntries(fd);
            await finishSession(dur, vol, dens, post, navigateFn);
          } catch (err) {
            console.error('Finish session error:', err);
            notify.error('Erro ao salvar sessão: ' + err.message);
            if (btn) { btn.disabled = false; btn.textContent = 'Salvar e Finalizar'; }
          }
        }}
      ]
    });

    // Post link
    setTimeout(() => {
      document.getElementById('genPostLink')?.addEventListener('click', () => {
        if (!state.session) return;
        const url = `${window.location.origin}${window.location.pathname}#/form/post/${state.session.id}`;
        navigator.clipboard?.writeText(url);
        notify.success('Link copiado para o aluno!');
      });
    }, 200);
  });
}

async function finishSession(dur, vol, dens, post, navigateFn) {
  const s = state.session;
  if (!s) { notify.error('Sessão não encontrada'); return; }

  // Buscar peso do aluno na última avaliação para cálculo de kcal
  const assessments = (await db.getAll('assessments')).filter(a => a.studentId === s.studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const weightKg = assessments[0]?.weight || 0;
  const pse = parseInt(post.pse) || 7;
  const kcalInfo = Calc.calcGastoCalorico(pse, dur, weightKg);

  // 1. Build complete session data BEFORE any state reset
  const sessionData = {
    ...s,
    status: 'completed',
    endTime: Date.now(),
    totalDuration: dur,
    totalVolume: vol,
    density: dens,
    workSeconds: state.workSec,
    restSeconds: Math.max(0, dur - state.workSec),
    setLog: [...state.setLog],
    postBiofeedback: post,
    totalSets: state.setLog.length,
    estimatedKcal: kcalInfo.kcal,
    kcalMet: kcalInfo.met,
    kcalWeightUsed: kcalInfo.weightUsed,
    kcalIsEstimate: kcalInfo.isEstimate,
  };

  // 2. Save session
  try {
    await db.put('sessions', sessionData);
  } catch(e) {
    console.error('Error saving session:', e);
    notify.error('Erro ao salvar sessão!');
    return;
  }

  // 3. Save biofeedback record
  try {
    await db.add('biofeedback', {
      studentId: s.studentId,
      date: s.date,
      ...s.preBiofeedback,
      pse,
      duration: Math.round(dur / 60),
      trainingLoad: Calc.cargaTreino(pse, Math.round(dur / 60)),
      estimatedKcal: kcalInfo.kcal,
      notes: post.notes,
    });
  } catch(e) {
    console.error('Error saving biofeedback:', e);
  }

  // 4. Generate session summary for student sharing
  const students = await db.getAll('students');
  const student = students.find(x => x.id === s.studentId);
  const summary = buildSessionSummary(sessionData, student);

  // 5. Reset state
  resetState();

  // 6. Close modal and show summary
  closeModal(() => {
    notify.success('Sessão finalizada! Dados salvos.');
    showSessionSummary(summary, sessionData, student, navigateFn);
  });
}

function buildSessionSummary(session, student) {
  const durMin = Math.round((session.totalDuration || 0) / 60);
  const exercises = session.exercises || [];
  const setLog = session.setLog || [];
  const pse = session.postBiofeedback?.pse || '-';

  // Group sets by exercise
  const exSummary = exercises.map((ex, i) => {
    const sets = setLog.filter(l => l.exIdx === i);
    if (sets.length === 0) return null;
    const maxLoad = Math.max(...sets.map(s => s.load || 0));
    const totalReps = sets.reduce((t, s) => t + (s.reps || 0), 0);
    return `${ex.name}: ${sets.length}x (${totalReps} reps, ${maxLoad}kg)`;
  }).filter(Boolean);

  const text = [
    `PERSONAL PRO — Resumo da Sessão`,
    ``,
    `Aluno: ${student?.name || 'N/A'}`,
    `Treino: ${session.workoutName || '-'}`,
    `Data: ${new Date(session.date).toLocaleDateString('pt-BR')}`,
    `Duração: ${durMin} min`,
    `Volume Total: ${session.totalVolume || 0} kg`,
    `Séries Realizadas: ${session.totalSets || 0}`,
    `PSE: ${pse}/10`,
    `Densidade: ${(session.density || 0).toFixed(2)}`,
    ``,
    `--- Exercícios Realizados ---`,
    ...exSummary,
    ``,
    `Bom treino! Continue evoluindo.`,
  ].join('\n');

  return text;
}

function showSessionSummary(summaryText, session, student, navigateFn) {
  const durMin = Math.round((session.totalDuration || 0) / 60);
  const exs = session.exercises || [];
  const setLog = session.setLog || [];

  const exRows = exs.map((ex, i) => {
    const sets = setLog.filter(l => l.exIdx === i);
    if (sets.length === 0) return `<tr style="opacity:0.4"><td>${ex.name}</td><td colspan="4">Não realizado</td></tr>`;
    const maxLoad = Math.max(...sets.map(s => s.load || 0));
    const totalReps = sets.reduce((t, s) => t + (s.reps || 0), 0);
    const rir = ex.rir != null ? ex.rir : '-';
    return `<tr><td><strong>${ex.name}</strong></td><td>${sets.length}</td><td>${totalReps}</td><td>${maxLoad}kg</td><td>${rir}</td></tr>`;
  }).join('');

  const kcal = session.estimatedKcal || 0;
  const kcalIsEst = session.kcalIsEstimate;
  const kcalMet = session.kcalMet || '-';

  openModal({
    title: 'Resumo da Sessão', size: 'lg',
    content: `
      <div style="background:var(--bg-card);border-radius:12px;padding:20px;margin-bottom:16px">
        <div class="flex items-center gap-md mb-md">
          <div class="avatar">${student?.name?.[0] || '?'}</div>
          <div>
            <div style="font-weight:700;font-size:1.1rem">${student?.name || 'Aluno'}</div>
            <div class="text-muted text-sm">${session.workoutName || 'Treino'} · ${new Date(session.date).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);gap:8px">
          <div class="stat-card" style="padding:12px;text-align:center"><div class="stat-label">Duração</div><div class="stat-value text-gradient" style="font-size:1.2rem">${durMin}min</div></div>
          <div class="stat-card" style="padding:12px;text-align:center"><div class="stat-label">Volume</div><div class="stat-value text-gradient" style="font-size:1.2rem">${session.totalVolume || 0}kg</div></div>
          <div class="stat-card" style="padding:12px;text-align:center"><div class="stat-label">Séries</div><div class="stat-value text-gradient" style="font-size:1.2rem">${session.totalSets || 0}</div></div>
          <div class="stat-card" style="padding:12px;text-align:center"><div class="stat-label">PSE</div><div class="stat-value" style="font-size:1.2rem;color:${(session.postBiofeedback?.pse || 7) > 8 ? 'var(--danger)' : 'var(--success)'}">${session.postBiofeedback?.pse || '-'}</div></div>
          <div class="stat-card" style="padding:12px;text-align:center;border:1px solid rgba(245,158,11,0.3)">
            <div class="stat-label">🔥 KCAL EST.</div>
            <div class="stat-value" style="font-size:1.2rem;color:var(--warning)">${kcal}</div>
            <div class="text-xs text-muted" style="margin-top:2px">MET ${kcalMet}${kcalIsEst ? ' · ~70kg' : ''}</div>
          </div>
        </div>
        ${kcalIsEst ? '<p class="text-xs text-muted mt-sm" style="text-align:center">⚠️ Peso não cadastrado — estimativa usando 70kg</p>' : ''}
      </div>
      <div class="table-container"><table class="data-table"><thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>RIR</th></tr></thead>
      <tbody>${exRows}</tbody></table></div>
    `,
    actions: [
      { label: '📄 Gerar PDF', class: 'btn-secondary', id: 'pdfSession', onClick: () => gerarPdfSessao(session, student, summaryText) },
      { label: '📲 WhatsApp', class: 'btn-secondary', id: 'waSummary', onClick: () => {
        const phone = student?.phone?.replace(/\D/g, '') || '';
        const wa = `https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}?text=${encodeURIComponent(summaryText)}`;
        window.open(wa, '_blank');
      }},
      { label: 'Copiar', class: 'btn-secondary', id: 'copySummary', onClick: () => {
        navigator.clipboard?.writeText(summaryText);
        notify.success('Resumo copiado!');
      }},
      { label: 'Fechar', class: 'btn-primary', id: 'closeSummary', onClick: () => {
        closeModal();
        navigateFn('/tracker');
      }},
    ]
  });
}

function gerarPdfSessao(session, student) {
  const durMin = Math.round((session.totalDuration || 0) / 60);
  const exs = session.exercises || [];
  const setLog = session.setLog || [];
  const kcal = session.estimatedKcal || 0;
  const kcalIsEst = session.kcalIsEstimate;
  const pre = session.preBiofeedback || {};
  const post = session.postBiofeedback || {};

  let exHTML = '';
  exs.forEach((ex, i) => {
    const sets = setLog.filter(l => l.exIdx === i);
    if (!sets.length) return;
    exHTML += `<h3 style="font-size:13px;margin:14px 0 6px;color:#00A499">${ex.name}
      <span style="color:#999;font-weight:normal;font-size:11px">${ex.muscleGroup||''} &middot; ${ex.sets||''}x${ex.reps||''} &middot; Desc: ${ex.rest||60}s${ex.rir != null ? ' &middot; RIR: '+ex.rir : ''}</span>
    </h3>
    <table><thead><tr><th>#</th><th>Reps</th><th>Carga (kg)</th><th>PSE</th><th>Volume</th></tr></thead><tbody>
    ${sets.map((s,si) => `<tr><td>${si+1}</td><td>${s.reps||'-'}</td><td>${s.load||'-'}</td><td>${s.pse||'-'}</td><td>${((s.reps||0)*(s.load||0)).toFixed(1)}kg</td></tr>`).join('')}
    </tbody></table>`;
  });

  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html><html><head><title>Sessão - ${student?.name||'Aluno'}</title>
  <style>
    *{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:28px 36px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.5}
    h1{font-size:22px;border-bottom:3px solid #00A499;padding-bottom:8px;margin-bottom:6px}h1 span{color:#00A499}
    h2{font-size:15px;color:#00A499;margin-top:22px;border-bottom:1px solid #e0e0e0;padding-bottom:5px}
    h3{font-size:13px;color:#333;margin-top:14px}
    .subtitle{font-size:11px;color:#888;margin-bottom:18px}
    .header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:14px;background:#f8faf9;border-radius:8px}
    .avatar{width:48px;height:48px;border-radius:50%;background:#00A499;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;flex-shrink:0}
    .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:16px 0}
    .stat{text-align:center;padding:12px 6px;border:1px solid #e8e8e8;border-radius:8px;background:#fafafa}
    .stat-val{font-size:22px;font-weight:700;color:#00A499}.stat-kcal{color:#f59e0b}
    .stat-lbl{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
    .bf-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:10px 0}
    .bf-item{text-align:center;padding:10px 6px;background:#f3f3f3;border-radius:6px}
    .bf-val{font-size:18px;font-weight:700;color:#333}.bf-lbl{font-size:10px;color:#666;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:12px}
    th{background:#f3f3f3;padding:7px 10px;text-align:left;font-weight:600;border-bottom:2px solid #ddd;font-size:11px;text-transform:uppercase;color:#555}
    td{padding:6px 10px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#fafafa}
    .footer{text-align:center;font-size:10px;color:#aaa;margin-top:36px;border-top:1px solid #ddd;padding-top:10px}
    @media print{body{padding:12px 18px}}
  </style></head><body>
  <h1>Personal<span>PRO</span> &mdash; Relatório de Sessão</h1>
  <p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
  <div class="header">
    <div class="avatar">${student?.name?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()||'?'}</div>
    <div><strong style="font-size:17px">${student?.name||'Aluno'}</strong><br>
    <span style="color:#666">${student?.code||''} &middot; ${session.workoutName||'Treino'} &middot; ${new Date(session.date).toLocaleDateString('pt-BR')}</span></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-val">${durMin}</div><div class="stat-lbl">Duração (min)</div></div>
    <div class="stat"><div class="stat-val">${session.totalVolume||0}</div><div class="stat-lbl">Volume (kg)</div></div>
    <div class="stat"><div class="stat-val">${session.totalSets||0}</div><div class="stat-lbl">Séries</div></div>
    <div class="stat"><div class="stat-val">${post.pse||'-'}</div><div class="stat-lbl">PSE</div></div>
    <div class="stat" style="border-color:#f59e0b"><div class="stat-val stat-kcal">${kcal}</div><div class="stat-lbl">🔥 Kcal Est.${kcalIsEst?' (~70kg)':''}</div></div>
  </div>
  <h2>Biofeedback Pré-Treino</h2>
  <div class="bf-grid">
    ${['sleep|Sono','mood|Humor','energy|Energia','stress|Estresse','pain|Dor'].map(f=>{ const[k,l]=f.split('|'); return `<div class="bf-item"><div class="bf-val">${pre[k]||'-'}</div><div class="bf-lbl">${l}</div></div>`; }).join('')}
  </div>
  <h2>Biofeedback Pós-Treino</h2>
  <div class="bf-grid">
    <div class="bf-item"><div class="bf-val">${post.pse||'-'}</div><div class="bf-lbl">PSE</div></div>
    <div class="bf-item"><div class="bf-val">${post.satisfaction||'-'}</div><div class="bf-lbl">Satisfação</div></div>
    <div class="bf-item" style="grid-column:span 3"><div class="bf-lbl" style="text-align:left;font-size:12px;padding:4px">Obs: ${post.notes||'&mdash;'}</div></div>
  </div>
  <h2>Exercícios Realizados</h2>
  ${exHTML}
  <div class="footer">Personal PRO &mdash; ${new Date().toLocaleDateString('pt-BR')} &mdash; Sistema Profissional de Treinamento</div>
  </body></html>`);
  printWin.document.close();
  setTimeout(() => { printWin.print(); }, 500);
}

