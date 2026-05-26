// ========================================
// PERSONAL PRO — Student Portal (PWA Mobile)
// Portal do Aluno · Glass UI · PIN Auth
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';

// ── PWA Install prompt ─────────────────────────────────────────
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// ── STATE ──────────────────────────────────────────────────────
const portalState = {
  studentId: null,
  trainerId: null,
  student: null,
  section: 'home',
};

// ── RENDER ENTRY ───────────────────────────────────────────────
export async function renderStudentPortal(rawParam) {
  const [studentId, query] = rawParam.split('?');
  const params = new URLSearchParams(query || '');
  const trainerId = params.get('t') || '';
  portalState.studentId = studentId;
  portalState.trainerId = trainerId;

  const student = await db.get('students', studentId).catch(() => null);

  // PIN auth
  const sessionKey = `portal_auth_${studentId}`;
  const isAuth = sessionStorage.getItem(sessionKey) === 'ok';

  if (!isAuth) {
    return renderPINScreen(student, studentId, trainerId);
  }

  portalState.student = student;
  return renderPortalShell(student);
}

export function initStudentPortal() {
  // PIN form
  const pinForm = document.getElementById('portalPinForm');
  if (pinForm) {
    initPINHandlers();
    return;
  }
  // Portal nav
  initPortalNav();
  loadSection('home');
}

// ── PIN SCREEN ─────────────────────────────────────────────────
function renderPINScreen(student, studentId, trainerId) {
  const name = student?.name || 'Aluno';
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return `
    <div class="portal-root" data-sid="${studentId}" data-tid="${trainerId}">
      <div class="portal-pin-screen">
        <div class="portal-pin-card">
          <div class="portal-logo">Personal<strong>PRO</strong></div>
          <div class="portal-avatar-big">${initials}</div>
          <h2 class="portal-pin-name">${name}</h2>
          <p class="portal-pin-sub">Digite seu PIN de acesso</p>

          <form id="portalPinForm" autocomplete="off">
            <div class="portal-pin-dots" id="pinDots">
              <span class="pin-dot" id="dot0"></span>
              <span class="pin-dot" id="dot1"></span>
              <span class="pin-dot" id="dot2"></span>
              <span class="pin-dot" id="dot3"></span>
            </div>
            <div id="pinError" class="portal-pin-error" style="display:none">PIN incorreto. Tente novamente.</div>
            <div class="portal-keypad">
              ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k,i) => `
                <button type="button" class="keypad-btn ${k===''?'keypad-empty':''}" data-key="${k}">${k}</button>
              `).join('')}
            </div>
          </form>

          <div class="portal-pin-footer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Acesso seguro por PIN
          </div>
        </div>
      </div>
    </div>`;
}

function initPINHandlers() {
  const root = document.querySelector('.portal-root');
  const sid = root?.dataset.sid;
  const tid = root?.dataset.tid;
  let pin = '';

  document.querySelectorAll('.keypad-btn:not(.keypad-empty)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const k = btn.dataset.key;
      if (k === '⌫') {
        pin = pin.slice(0, -1);
      } else if (pin.length < 4) {
        pin += k;
      }
      updateDots(pin);

      if (pin.length === 4) {
        const student = await db.get('students', sid).catch(() => null);
        const correctPin = student?.portalPin || '1234';
        if (pin === String(correctPin)) {
          sessionStorage.setItem(`portal_auth_${sid}`, 'ok');
          window.location.reload();
        } else {
          document.getElementById('pinError').style.display = 'block';
          document.querySelectorAll('.pin-dot').forEach(d => d.classList.add('pin-dot-error'));
          setTimeout(() => {
            pin = '';
            updateDots(pin);
            document.getElementById('pinError').style.display = 'none';
            document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('pin-dot-error', 'pin-dot-filled'));
          }, 1200);
        }
      }
    });
  });
}

function updateDots(pin) {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (dot) dot.classList.toggle('pin-dot-filled', i < pin.length);
  }
}

// ── PORTAL SHELL ───────────────────────────────────────────────
function renderPortalShell(student) {
  const name = student?.name || 'Aluno';
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return `
    <div class="portal-root" data-sid="${portalState.studentId}" data-tid="${portalState.trainerId}">
      <div class="portal-header">
        <div class="portal-header-left">
          <div class="portal-avatar-sm">${initials}</div>
          <div>
            <div class="portal-header-name">${name.split(' ')[0]}</div>
            <div class="portal-header-sub">Portal do Aluno</div>
          </div>
        </div>
        <button class="portal-logout-btn" id="portalLogout" title="Sair">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      <div class="portal-content" id="portalContent">
        <div class="portal-spinner"><div class="portal-spin-ring"></div></div>
      </div>

      <nav class="portal-nav">
        <button class="portal-nav-btn active" data-section="home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Início</span>
        </button>
        <button class="portal-nav-btn" data-section="treinos">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          <span>Treinos</span>
        </button>
        <button class="portal-nav-btn" data-section="sessoes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Sessões</span>
        </button>
        <button class="portal-nav-btn" data-section="bio">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span>Biofeedback</span>
        </button>
        <button class="portal-nav-btn" data-section="relatorios">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span>Relatórios</span>
        </button>
      </nav>
    </div>`;
}

function initPortalNav() {
  const root = document.querySelector('.portal-root');
  portalState.studentId = root?.dataset.sid;
  portalState.trainerId = root?.dataset.tid;

  document.querySelectorAll('.portal-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.portal-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSection(btn.dataset.section);
    });
  });

  document.getElementById('portalLogout')?.addEventListener('click', () => {
    sessionStorage.removeItem(`portal_auth_${portalState.studentId}`);
    window.location.reload();
  });

  // PWA install
  if (deferredPrompt) {
    const installBtn = document.createElement('button');
    installBtn.className = 'portal-install-btn';
    installBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Instalar App`;
    installBtn.addEventListener('click', () => { deferredPrompt.prompt(); });
    document.querySelector('.portal-header')?.appendChild(installBtn);
  }
}

async function loadSection(section) {
  portalState.section = section;
  const content = document.getElementById('portalContent');
  if (!content) return;
  content.innerHTML = '<div class="portal-spinner"><div class="portal-spin-ring"></div></div>';

  const sid = portalState.studentId;
  const tid = portalState.trainerId;

  const [student, sessions, workouts, biofeedbacks, assessments, schedules, macrocycles, finances] = await Promise.all([
    db.get('students', sid).catch(() => null),
    db.getAll('sessions').then(all => all.filter(s => s.studentId === sid)).catch(() => []),
    db.getAll('workouts').then(all => all.filter(w => w.studentId === sid)).catch(() => []),
    db.getAll('biofeedback').then(all => all.filter(b => b.studentId === sid).sort((a,b) => new Date(b.date)-new Date(a.date))).catch(() => []),
    db.getAll('assessments').then(all => all.filter(a => a.studentId === sid).sort((a,b) => new Date(b.date)-new Date(a.date))).catch(() => []),
    db.getAll('schedules').then(all => all.filter(s => s.studentId === sid)).catch(() => []),
    db.getAll('macrocycles').then(all => all.filter(m => m.studentId === sid)).catch(() => []),
    db.getAll('finances').then(all => all.filter(f => f.studentId === sid)).catch(() => []),
  ]);

  portalState.student = student;

  switch (section) {
    case 'home': content.innerHTML = renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments); break;
    case 'treinos': content.innerHTML = renderTreinos(workouts, macrocycles); break;
    case 'sessoes': content.innerHTML = renderSessoes(sessions, schedules); break;
    case 'bio': content.innerHTML = renderBio(biofeedbacks, sid, tid); initBio(); break;
    case 'relatorios': content.innerHTML = await renderRelatorios(student, sessions, assessments, biofeedbacks); break;
    default: content.innerHTML = renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments);
  }

  // Bind events after render
  if (section === 'treinos') initTreinosSection();
  if (section === 'sessoes') initSessoesSection(sessions);
  if (section === 'home') initHomeSection(student, tid);
}

// ── HOME ───────────────────────────────────────────────────────
function renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments) {
  const now = new Date();
  const nextSchedule = schedules
    .filter(s => new Date(s.date + 'T' + (s.time || '00:00')) >= now)
    .sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time))[0];

  const currentMacro = macrocycles.sort((a,b) => new Date(b.startDate)-new Date(a.startDate))[0];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const lastSession = completedSessions.sort((a,b) => new Date(b.date)-new Date(a.date))[0];

  // Mensalidade
  const paymentDue = student?.paymentDue;
  let paymentDays = null, paymentColor = 'var(--success)', paymentLabel = 'Em dia';
  if (paymentDue) {
    const diff = Math.ceil((new Date(paymentDue) - now) / 86400000);
    paymentDays = diff;
    paymentColor = diff < 0 ? 'var(--danger)' : diff <= 5 ? 'var(--warning)' : 'var(--success)';
    paymentLabel = diff < 0 ? `Venceu há ${Math.abs(diff)}d` : diff === 0 ? 'Vence hoje!' : `Vence em ${diff}d`;
  }

  // Macrociclo progress
  let macroProgress = 0;
  if (currentMacro?.startDate && currentMacro?.endDate) {
    const total = new Date(currentMacro.endDate) - new Date(currentMacro.startDate);
    const elapsed = now - new Date(currentMacro.startDate);
    macroProgress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  return `
    <div class="portal-section">
      <!-- Greeting -->
      <div class="portal-greeting-card glass-card">
        <div class="portal-greeting-text">
          <div class="portal-greeting-hi">Olá, ${(student?.name||'').split(' ')[0]} 👋</div>
          <div class="portal-greeting-date">${now.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}</div>
        </div>
        ${lastSession ? `<div class="portal-last-session">Último treino: ${Math.floor((now - new Date(lastSession.date))/86400000)}d atrás</div>` : ''}
      </div>

      <!-- Stats rápidas -->
      <div class="portal-stats-row">
        <div class="portal-stat-card glass-card">
          <div class="portal-stat-icon" style="color:var(--primary)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="portal-stat-val">${completedSessions.length}</div>
          <div class="portal-stat-lbl">Sessões</div>
        </div>
        <div class="portal-stat-card glass-card" style="border-top:3px solid ${paymentColor}">
          <div class="portal-stat-icon" style="color:${paymentColor}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <div class="portal-stat-val" style="color:${paymentColor};font-size:1rem">${paymentLabel}</div>
          <div class="portal-stat-lbl">Mensalidade</div>
        </div>
      </div>

      <!-- Próxima sessão -->
      ${nextSchedule ? `
        <div class="glass-card portal-next-session">
          <div class="portal-card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Próxima Sessão
          </div>
          <div class="portal-next-date">${new Date(nextSchedule.date+'T12:00').toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}</div>
          <div class="portal-next-time">${nextSchedule.time || ''} ${nextSchedule.workoutName ? '· '+nextSchedule.workoutName : ''}</div>
        </div>` : `
        <div class="glass-card portal-next-session" style="opacity:0.6">
          <div class="portal-card-label">Próxima Sessão</div>
          <div class="portal-next-date">Nenhuma agendada</div>
        </div>`}

      <!-- Macrociclo atual -->
      ${currentMacro ? `
        <div class="glass-card portal-macro-card">
          <div class="portal-card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Macrociclo Atual
          </div>
          <div class="portal-macro-name">${currentMacro.name || 'Macrociclo'}</div>
          <div class="portal-macro-progress-bar">
            <div class="portal-macro-progress-fill" style="width:${macroProgress}%"></div>
          </div>
          <div class="portal-macro-pct">${macroProgress}% concluído</div>
          ${currentMacro.endDate ? `<div class="text-xs" style="color:var(--text-muted);margin-top:4px">Termina em: ${new Date(currentMacro.endDate).toLocaleDateString('pt-BR')}</div>` : ''}
        </div>` : ''}

      <!-- Botão Mensagem -->
      <button class="portal-btn-wa" id="portalMsgBtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Enviar mensagem ao Treinador
      </button>
    </div>`;
}

function initHomeSection(student, tid) {
  document.getElementById('portalMsgBtn')?.addEventListener('click', () => {
    const trainer = student?.trainerPhone || '';
    const msg = encodeURIComponent(`Olá! Sou ${student?.name || 'seu aluno'}. Preciso falar com você.`);
    const phone = trainer.replace(/\D/g,'');
    const url = phone ? `https://wa.me/${phone.startsWith('55')?phone:'55'+phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  });
}

// ── TREINOS ────────────────────────────────────────────────────
function renderTreinos(workouts, macrocycles) {
  const sorted = [...workouts].sort((a,b) => new Date(b.date||0)-new Date(a.date||0));
  const currentMacro = macrocycles.sort((a,b) => new Date(b.startDate)-new Date(a.startDate))[0];

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Meus Treinos</h2>
      ${currentMacro ? `<div class="portal-macro-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        ${currentMacro.name}
      </div>` : ''}

      ${sorted.length === 0 ? `<div class="portal-empty">Nenhum treino cadastrado ainda</div>` :
        sorted.map(w => `
          <div class="portal-workout-card glass-card" data-wid="${w.id}">
            <div class="portal-workout-header">
              <div>
                <div class="portal-workout-name">${w.name || 'Treino'}</div>
                <div class="portal-workout-meta">${w.cycle || ''} ${w.date ? '· '+new Date(w.date+'T12:00').toLocaleDateString('pt-BR',{day:'numeric',month:'short'}) : ''}</div>
              </div>
              <div class="portal-workout-badge">${(w.exercises||[]).length} ex.</div>
            </div>
            <div class="portal-workout-exercises" id="wex_${w.id}" style="display:none">
              ${(w.exercises||[]).map((ex,i) => `
                <div class="portal-exercise-row">
                  <div class="portal-ex-num">${i+1}</div>
                  <div class="portal-ex-info">
                    <div class="portal-ex-name">${ex.name}</div>
                    <div class="portal-ex-detail">${ex.sets||'3'}×${ex.reps||'10-12'} ${ex.load?'· '+ex.load+'kg':''} ${ex.rest?'· '+ex.rest+' descanso':''}</div>
                    ${ex.method ? `<div class="portal-ex-method">${ex.method}</div>` : ''}
                    ${ex.videoUrl ? `
                      <a href="${ex.videoUrl}" target="_blank" class="portal-ex-video">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Ver vídeo
                      </a>` : ''}
                    ${ex.notes ? `<div class="portal-ex-notes">${ex.notes}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
            <button class="portal-expand-btn" data-wid="${w.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              Ver exercícios
            </button>
          </div>
        `).join('')}
    </div>`;
}

function initTreinosSection() {
  document.querySelectorAll('.portal-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wid = btn.dataset.wid;
      const exDiv = document.getElementById(`wex_${wid}`);
      const isOpen = exDiv.style.display !== 'none';
      exDiv.style.display = isOpen ? 'none' : 'block';
      btn.innerHTML = isOpen
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> Ver exercícios`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> Fechar`;
    });
  });
}

// ── SESSÕES ────────────────────────────────────────────────────
function renderSessoes(sessions, schedules) {
  const now = new Date();
  const upcoming = schedules
    .filter(s => new Date(s.date+'T'+(s.time||'23:59')) >= now)
    .sort((a,b) => new Date(a.date+'T'+a.time)-new Date(b.date+'T'+b.time))
    .slice(0,5);

  const completed = sessions
    .filter(s => s.status === 'completed')
    .sort((a,b) => new Date(b.date)-new Date(a.date))
    .slice(0,20);

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Sessões</h2>

      ${upcoming.length ? `
        <div class="portal-section-sub">Próximas sessões</div>
        ${upcoming.map(s => `
          <div class="glass-card portal-session-upcoming">
            <div class="portal-session-date">${new Date(s.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}</div>
            <div class="portal-session-time">${s.time || 'Horário a confirmar'}</div>
            <div class="portal-session-name">${s.workoutName || 'Treino'}</div>
          </div>
        `).join('')}
      ` : ''}

      <div class="portal-section-sub" style="margin-top:20px">Histórico</div>
      ${completed.length === 0 ? `<div class="portal-empty">Nenhuma sessão concluída ainda</div>` :
        completed.map(s => {
          const setLog = s.setLog || [];
          const vol = setLog.reduce((t,x) => t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0);
          const pse = s.postBiofeedback?.pse;
          return `
            <div class="portal-session-card glass-card" data-sid="${s.id}">
              <div class="portal-session-header">
                <div>
                  <div class="portal-session-name">${s.workoutName||'Treino'}</div>
                  <div class="portal-session-meta">${s.date?new Date(s.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'}):''}</div>
                </div>
                <div class="portal-session-stats-sm">
                  ${vol>0?`<span>${Math.round(vol)}kg</span>`:''}
                  ${pse?`<span class="pse-badge">PSE ${pse}</span>`:''}
                </div>
              </div>
              <div class="portal-session-sets" id="sets_${s.id}" style="display:none">
                ${setLog.map(x => `
                  <div class="portal-set-row">
                    <span class="portal-set-num">S${x.setIdx+1}</span>
                    <span>${x.reps} reps</span>
                    <span>${x.load}kg</span>
                    ${x.pse?`<span>PSE ${x.pse}</span>`:''}
                    ${x.rir!=null&&x.rir!==''?`<span>RIR ${x.rir}</span>`:''}
                  </div>
                `).join('') || '<div class="text-muted text-xs">Sem dados de série</div>'}
              </div>
              ${setLog.length?`<button class="portal-expand-btn session-expand" data-id="${s.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                Ver séries
              </button>`:''}
            </div>`;
        }).join('')}
    </div>`;
}

function initSessoesSection() {
  document.querySelectorAll('.session-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const div = document.getElementById(`sets_${id}`);
      const isOpen = div.style.display !== 'none';
      div.style.display = isOpen ? 'none' : 'block';
      btn.innerHTML = isOpen
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> Ver séries`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> Fechar`;
    });
  });
}

// ── BIOFEEDBACK ────────────────────────────────────────────────
function renderBio(biofeedbacks, sid, tid) {
  const last7 = biofeedbacks.slice(0, 7);
  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Biofeedback</h2>

      <div class="glass-card portal-bio-form-card">
        <div class="portal-card-label">Check-in Pré-treino</div>
        <form id="portalBioForm">
          <div class="portal-bio-field">
            <label class="portal-bio-label">Qualidade do Sono <span id="sleepVal">7</span>/10</label>
            <input type="range" name="sleep" min="1" max="10" value="7" class="portal-range" oninput="document.getElementById('sleepVal').textContent=this.value">
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">Recuperação (TQR) <span id="tqrVal">5</span>/10</label>
            <input type="range" name="tqr" min="0" max="10" value="5" class="portal-range" oninput="document.getElementById('tqrVal').textContent=this.value">
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">Alimentação nas últimas 24h</label>
            <select name="food" class="portal-textarea" style="background:rgba(255,255,255,0.05); color:#e2e8f0; font-size:0.85rem">
              <option value="5" selected>Excelente (Bati as metas / Saudável)</option>
              <option value="4">Boa (Maioria saudável / Poucos furos)</option>
              <option value="3">Regular (Na média / Algumas escapadas)</option>
              <option value="2">Ruim (Pulei refeições / Comi mal)</option>
              <option value="1">Péssima (Fast food / Quase não comi)</option>
            </select>
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">Estresse <span id="stressVal">5</span>/10</label>
            <input type="range" name="stress" min="1" max="10" value="5" class="portal-range" oninput="document.getElementById('stressVal').textContent=this.value">
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">Dor/Desconforto <span id="painVal">1</span>/10</label>
            <input type="range" name="pain" min="1" max="10" value="1" class="portal-range" oninput="document.getElementById('painVal').textContent=this.value">
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">Notas</label>
            <textarea name="notes" class="portal-textarea" rows="2" placeholder="Como está se sentindo hoje?"></textarea>
          </div>
          <button type="submit" class="portal-submit-btn">Enviar Check-in</button>
        </form>
      </div>

      ${last7.length ? `
        <div class="portal-section-sub" style="margin-top:20px">Histórico recente</div>
        ${last7.map(b => `
          <div class="glass-card portal-bio-history">
            <div class="portal-bio-date">${new Date(b.date).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}</div>
            <div class="portal-bio-row">
              ${b.sleep!=null?`<span>💤 ${b.sleep}</span>`:''}
              ${b.tqr!=null?`<span>⚡ ${b.tqr}</span>`:''}
              ${b.food!=null?`<span>🍎 ${b.food}/5</span>`:''}
              ${b.stress!=null?`<span>😰 ${b.stress}</span>`:''}
              ${b.pain!=null?`<span>🩹 ${b.pain}</span>`:''}
              ${b.pse!=null?`<span>PSE ${b.pse}</span>`:''}
            </div>
            ${b.notes?`<div class="portal-bio-notes">${b.notes}</div>`:''}
          </div>
        `).join('')}
      ` : ''}
    </div>`;
}

function initBio() {
  document.getElementById('portalBioForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      studentId: portalState.studentId,
      trainerId: portalState.trainerId,
      trainer_id: portalState.trainerId,
      formType: 'pre',
      date: new Date().toISOString(),
      sleep: parseInt(fd.get('sleep')),
      tqr: parseInt(fd.get('tqr')),
      stress: parseInt(fd.get('stress')),
      pain: parseInt(fd.get('pain')),
      food: parseInt(fd.get('food')) || 5,
      notes: fd.get('notes'),
    };

    try {
      const { getSupabase } = await import('../utils/auth.js');
      const sb = getSupabase?.();
      if (sb && data.trainerId) {
        await sb.from('biofeedback').insert([data]);
      } else {
        await db.add('biofeedback', data);
      }
    } catch {
      await db.add('biofeedback', data);
    }

    e.target.innerHTML = `<div class="portal-success">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div>Check-in enviado!</div>
    </div>`;
  });
}

// ── RELATÓRIOS ─────────────────────────────────────────────────
async function renderRelatorios(student, sessions, assessments, biofeedbacks) {
  const completed = sessions.filter(s => s.status === 'completed');
  const compAss = assessments.filter(a => a.type === 'composicao').sort((a,b) => new Date(a.date)-new Date(b.date));
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsMonth = completed.filter(s => new Date(s.date) >= startOfMonth).length;
  const avgPse = biofeedbacks.filter(b=>b.pse).length
    ? (biofeedbacks.filter(b=>b.pse).slice(0,10).reduce((t,b)=>t+b.pse,0)/biofeedbacks.filter(b=>b.pse).slice(0,10).length).toFixed(1)
    : '—';

  // Calcular gasto calórico se tiver avaliação
  const lastComp = compAss[compAss.length-1];
  let caloricCard = '';
  if (lastComp && student) {
    const age = student.birthDate ? Calc.calcularIdade(student.birthDate) : student.age || 0;
    const tmb = age ? Calc.tmb(lastComp.peso, lastComp.altura, age, student.gender || 'M', lastComp.massaMagra) : null;
    if (tmb) {
      const tdee = Calc.tdee(tmb.valor, 'moderado');
      const objMap = {'Emagrecimento':'emagrecimento','Hipertrofia':'hipertrofia','Manutenção':'manutencao'};
      const obj = objMap[student.goal] || 'manutencao';
      const meta = Calc.metaCalorica(tdee.valor, obj);
      const mac = Calc.macros(meta.kcal, lastComp.peso, obj);
      caloricCard = `
        <div class="glass-card portal-caloric-card">
          <div class="portal-card-label">Gasto Energético Estimado</div>
          <div class="portal-caloric-grid">
            <div class="portal-caloric-item">
              <div class="portal-caloric-val">${tmb.valor}</div>
              <div class="portal-caloric-lbl">TMB (kcal)</div>
            </div>
            <div class="portal-caloric-item" style="color:var(--primary)">
              <div class="portal-caloric-val">${tdee.valor}</div>
              <div class="portal-caloric-lbl">TDEE (kcal)</div>
            </div>
            <div class="portal-caloric-item" style="color:var(--accent)">
              <div class="portal-caloric-val">${meta.kcal}</div>
              <div class="portal-caloric-lbl">Meta (kcal)</div>
            </div>
          </div>
          <div class="portal-macros-row">
            <div style="color:#10b981">🥩 Proteína: ${mac.proteina.g}g</div>
            <div style="color:#f59e0b">🍚 Carb: ${mac.carboidrato.g}g</div>
            <div style="color:#8b5cf6">🥑 Gordura: ${mac.gordura.g}g</div>
          </div>
        </div>`;
    }
  }

  // Evolução composição
  let evolCard = '';
  if (compAss.length >= 2) {
    const first = compAss[0], last = compAss[compAss.length-1];
    const dpeso = last.peso && first.peso ? (last.peso - first.peso).toFixed(1) : null;
    const dgord = last.percentualGordura && first.percentualGordura ? (last.percentualGordura - first.percentualGordura).toFixed(1) : null;
    const dmass = last.massaMagra && first.massaMagra ? (last.massaMagra - first.massaMagra).toFixed(1) : null;
    evolCard = `
      <div class="glass-card portal-evol-card">
        <div class="portal-card-label">Evolução da Composição</div>
        <div class="portal-evol-grid">
          ${dpeso!=null?`<div class="portal-evol-item">
            <div style="font-size:1.3rem;font-weight:700;color:${dpeso<0?'var(--success)':dpeso>0?'var(--danger)':'var(--text-secondary)'}">${dpeso>0?'+':''}${dpeso}kg</div>
            <div class="portal-caloric-lbl">Peso</div>
          </div>`:''}
          ${dgord!=null?`<div class="portal-evol-item">
            <div style="font-size:1.3rem;font-weight:700;color:${dgord<0?'var(--success)':'var(--danger)'}">${dgord>0?'+':''}${dgord}%</div>
            <div class="portal-caloric-lbl">% Gordura</div>
          </div>`:''}
          ${dmass!=null?`<div class="portal-evol-item">
            <div style="font-size:1.3rem;font-weight:700;color:${dmass>0?'var(--success)':'var(--danger)'}">${dmass>0?'+':''}${dmass}kg</div>
            <div class="portal-caloric-lbl">Massa Magra</div>
          </div>`:''}
        </div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:6px">${new Date(first.date).toLocaleDateString('pt-BR')} → ${new Date(last.date).toLocaleDateString('pt-BR')}</div>
      </div>`;
  }

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Relatórios</h2>

      <div class="portal-stats-row">
        <div class="portal-stat-card glass-card">
          <div class="portal-stat-val" style="color:var(--primary)">${sessionsMonth}</div>
          <div class="portal-stat-lbl">Treinos no mês</div>
        </div>
        <div class="portal-stat-card glass-card">
          <div class="portal-stat-val" style="color:var(--accent)">${avgPse}</div>
          <div class="portal-stat-lbl">PSE médio</div>
        </div>
      </div>

      ${caloricCard}
      ${evolCard}

      ${compAss.length === 0 ? `<div class="portal-empty">Peça ao seu treinador para registrar sua avaliação de composição para ver seus relatórios completos.</div>` : ''}
    </div>`;
}
