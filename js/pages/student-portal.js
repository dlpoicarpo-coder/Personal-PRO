// ========================================
// PERSONAL PRO — Student Portal (PWA Mobile)
// Portal do Aluno · Glass UI · PIN Auth
// v2 — Check-in reminders, Series Colors,
//       Reports Feed, Solo Training, PWA Popup, Light Theme
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';

// ── PWA Install prompt ─────────────────────────────────────────
let deferredPrompt = null;
let pwaPopupShown = false;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show popup with a slight delay after portal loads
  setTimeout(() => showPwaPopup(), 3000);
});

function showPwaPopup() {
  if (pwaPopupShown || !deferredPrompt) return;
  pwaPopupShown = true;
  const popup = document.getElementById('pwaInstallPopup');
  if (popup) { popup.classList.add('visible'); return; }
  // If portal already rendered, inject
  const root = document.querySelector('.portal-root');
  if (!root) return;
  const el = document.createElement('div');
  el.id = 'pwaInstallPopup';
  el.className = 'portal-pwa-popup visible';
  el.innerHTML = `
    <div class="portal-pwa-popup-inner">
      <div class="portal-pwa-icon">📲</div>
      <div class="portal-pwa-text">
        <div class="portal-pwa-title">Instalar Personal PRO</div>
        <div class="portal-pwa-sub">Adicione à tela inicial para acesso rápido sem abrir o navegador!</div>
      </div>
      <div class="portal-pwa-actions">
        <button id="pwaInstallYes" class="portal-pwa-btn-yes">Instalar</button>
        <button id="pwaInstallNo" class="portal-pwa-btn-no">Agora não</button>
      </div>
    </div>`;
  root.appendChild(el);
  document.getElementById('pwaInstallYes')?.addEventListener('click', () => {
    deferredPrompt.prompt();
    el.classList.remove('visible');
  });
  document.getElementById('pwaInstallNo')?.addEventListener('click', () => {
    el.classList.remove('visible');
  });
}

// ── THEME ──────────────────────────────────────────────────────
function getPortalTheme() {
  return localStorage.getItem('portal_theme') || 'dark';
}
function setPortalTheme(theme) {
  localStorage.setItem('portal_theme', theme);
  document.querySelector('.portal-root')?.setAttribute('data-theme', theme);
}

// ── STATE ──────────────────────────────────────────────────────
const portalState = {
  studentId: null,
  trainerId: null,
  student: null,
  section: 'home',
  selectedReportMacroId: 'all',
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
  // Apply saved theme
  document.querySelector('.portal-root')?.setAttribute('data-theme', getPortalTheme());
  // Try PWA popup if already available
  if (deferredPrompt) setTimeout(() => showPwaPopup(), 3000);
}

// ── PIN SCREEN ─────────────────────────────────────────────────
function renderPINScreen(student, studentId, trainerId) {
  const name = student?.name || 'Aluno';
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return `
    <div class="portal-root" data-sid="${studentId}" data-tid="${trainerId}" data-theme="${getPortalTheme()}">
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
              ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k) => `
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
    <div class="portal-root" data-sid="${portalState.studentId}" data-tid="${portalState.trainerId}" data-theme="${getPortalTheme()}">
      <div class="portal-header">
        <div class="portal-header-left">
          <div class="portal-avatar-sm">${initials}</div>
          <div>
            <div class="portal-header-name">${name.split(' ')[0]}</div>
            <div class="portal-header-sub">Portal do Aluno</div>
          </div>
        </div>
        <div class="portal-header-actions">
          <button class="portal-theme-btn" id="portalThemeToggle" title="Alternar tema">
            <svg id="themeIconDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg id="themeIconLight" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="portal-logout-btn" id="portalLogout" title="Sair">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      <div class="portal-content" id="portalContent">
        <div class="portal-spinner"><div class="portal-spin-ring"></div></div>
      </div>

      <nav class="portal-nav">
        <button class="portal-nav-btn active" data-section="home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Início</span>
        </button>
        <button class="portal-nav-btn" data-section="treinar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          <span>Treinar</span>
        </button>
        <button class="portal-nav-btn" data-section="sessoes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Sessões</span>
        </button>
        <button class="portal-nav-btn" data-section="bio">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span>Check-in</span>
        </button>
        <button class="portal-nav-btn" data-section="relatorios">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span>Relatórios</span>
        </button>
      </nav>

      <!-- PWA Install Popup -->
      <div id="pwaInstallPopup" class="portal-pwa-popup">
        <div class="portal-pwa-popup-inner">
          <div class="portal-pwa-icon">📲</div>
          <div class="portal-pwa-text">
            <div class="portal-pwa-title">Instalar Personal PRO</div>
            <div class="portal-pwa-sub">Adicione à tela inicial para acesso rápido sem abrir o navegador!</div>
          </div>
          <div class="portal-pwa-actions">
            <button id="pwaInstallYes" class="portal-pwa-btn-yes">Instalar</button>
            <button id="pwaInstallNo" class="portal-pwa-btn-no">Agora não</button>
          </div>
        </div>
      </div>
    </div>`;
}

function initPortalNav() {
  const root = document.querySelector('.portal-root');
  portalState.studentId = root?.dataset.sid;
  portalState.trainerId = root?.dataset.tid;

  document.querySelectorAll('.portal-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const activeSession = document.getElementById('soloActiveSession');
      if (activeSession && activeSession.style.display === 'block') {
        if (!confirm('Você tem um treino em andamento! Tem certeza que deseja sair sem salvar? O progresso será perdido.')) {
          return;
        }
      }
      document.querySelectorAll('.portal-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSection(btn.dataset.section);
    });
  });

  document.getElementById('portalLogout')?.addEventListener('click', () => {
    sessionStorage.removeItem(`portal_auth_${portalState.studentId}`);
    window.location.reload();
  });

  // Theme toggle
  const themeBtn = document.getElementById('portalThemeToggle');
  const updateThemeIcon = () => {
    const t = getPortalTheme();
    document.getElementById('themeIconDark').style.display = t === 'dark' ? '' : 'none';
    document.getElementById('themeIconLight').style.display = t === 'light' ? '' : 'none';
  };
  updateThemeIcon();
  themeBtn?.addEventListener('click', () => {
    const next = getPortalTheme() === 'dark' ? 'light' : 'dark';
    setPortalTheme(next);
    updateThemeIcon();
  });

  // PWA Popup events
  document.getElementById('pwaInstallYes')?.addEventListener('click', () => {
    deferredPrompt?.prompt();
    document.getElementById('pwaInstallPopup')?.classList.remove('visible');
  });
  document.getElementById('pwaInstallNo')?.addEventListener('click', () => {
    document.getElementById('pwaInstallPopup')?.classList.remove('visible');
  });

  // Show button in header if prompt available
  if (deferredPrompt) {
    const installBtn = document.createElement('button');
    installBtn.className = 'portal-install-btn';
    installBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> App`;
    installBtn.addEventListener('click', () => showPwaPopup());
    document.querySelector('.portal-header-actions')?.prepend(installBtn);
  }
}

async function loadSection(section) {
  portalState.section = section;
  const content = document.getElementById('portalContent');
  if (!content) return;
  content.innerHTML = '<div class="portal-spinner"><div class="portal-spin-ring"></div></div>';

  const sid = portalState.studentId;
  const tid = portalState.trainerId;

  const [student, sessionsRaw, workouts, biofeedbacks, assessments, schedules, macrocycles, finances] = await Promise.all([
    db.get('students', sid).catch(() => null),
    db.getAll('sessions').then(all => all.filter(s => s.studentId === sid)).catch(() => []),
    db.getAll('workouts').then(all => all.filter(w => w.studentId === sid)).catch(() => []),
    db.getAll('biofeedback').then(all => all.filter(b => b.studentId === sid).sort((a,b) => new Date(b.date)-new Date(a.date))).catch(() => []),
    db.getAll('assessments').then(all => all.filter(a => a.studentId === sid).sort((a,b) => new Date(b.date)-new Date(a.date))).catch(() => []),
    db.getAll('schedules').then(all => all.filter(s => s.studentId === sid)).catch(() => []),
    db.getAll('macrocycles').then(all => all.filter(m => m.studentId === sid)).catch(() => []),
    db.getAll('finances').then(all => all.filter(f => f.studentId === sid)).catch(() => []),
  ]);

  // Normalize sessions: unify field names from trainer live-tracker vs solo portal
  const sessions = sessionsRaw.map(s => {
    const durationMin = s.durationMin || (s.totalDuration ? Math.round(s.totalDuration / 60) : 0);
    // Resolve exercise names in setLog using session.exercises array
    const exercises = s.exercises || [];
    const setLog = (s.setLog || []).map(set => ({
      ...set,
      exerciseName: set.exerciseName || (exercises[set.exIdx]?.name) || (set.exerciseIdx != null ? exercises[set.exerciseIdx]?.name : null) || null,
      load: parseFloat(set.load) || 0,
      reps: parseFloat(set.reps) || 0,
    }));
    const totalVol = s.totalVolume || setLog.reduce((t,x)=>t+(x.load||0)*(x.reps||0),0);
    return { ...s, durationMin, setLog, totalVolume: totalVol };
  });


  portalState.student = student;

  switch (section) {
    case 'home': content.innerHTML = renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments, biofeedbacks); break;
    case 'treinar': content.innerHTML = renderTreinar(workouts, schedules); initTreinar(workouts, schedules, student); break;
    case 'sessoes': content.innerHTML = renderSessoes(sessions, schedules); break;
    case 'bio': content.innerHTML = renderBio(biofeedbacks, sid, tid); initBio(); break;
    case 'relatorios': content.innerHTML = await renderRelatorios(student, sessions, assessments, biofeedbacks, macrocycles); initRelatorios(student, sessions, assessments, biofeedbacks, macrocycles); break;
    default: content.innerHTML = renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments, biofeedbacks);
  }

  // Bind events after render
  if (section === 'sessoes') initSessoesSection(sessions);
  if (section === 'home') initHomeSection(student, tid);

  // Check-in reminder (day of session)
  checkSessionReminders(schedules, sessions);
}

// ── SESSION REMINDERS ──────────────────────────────────────────
function checkSessionReminders(schedules, sessions) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Check-in reminder: session TODAY
  const todaySessions = schedules.filter(s => s.date === todayStr);
  if (todaySessions.length > 0) {
    const s = todaySessions[0];
    showToast(`📅 Você tem treino hoje${s.time ? ' às ' + s.time : ''}! Lembre-se de fazer o check-in antes de treinar.`, 'info', 8000);
  }

  // 2. Checkout reminder: sessions without checkout (postBiofeedback missing)
  const needsCheckout = sessions.filter(s => {
    if (s.status !== 'completed') return false;
    if (s.postBiofeedback) return false;
    if (!s.date) return false;
    const daysAgo = (now - new Date(s.date + 'T12:00')) / 86400000;
    return daysAgo <= 3; // only recent ones
  });
  if (needsCheckout.length > 0) {
    setTimeout(() => {
      showToast(`⚡ Você tem ${needsCheckout.length} treino(s) sem checkout (feedback pós-treino). Complete para registrar seu progresso!`, 'warning', 10000);
    }, 2000);
  }
}

function showToast(msg, type = 'info', duration = 5000) {
  const existing = document.getElementById('portalToast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'portalToast';
  el.className = `portal-toast portal-toast-${type}`;
  el.innerHTML = `<span>${msg}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.1rem;line-height:1">✕</button>`;
  document.querySelector('.portal-content')?.prepend(el);
  setTimeout(() => el.remove(), duration);
}

// ── HOME ───────────────────────────────────────────────────────
function renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments, biofeedbacks) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nextSchedule = schedules
    .filter(s => new Date(s.date + 'T' + (s.time || '00:00')) >= now)
    .sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time))[0];

  const currentMacro = macrocycles.sort((a,b) => new Date(b.startDate)-new Date(a.startDate))[0];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const lastSession = completedSessions.sort((a,b) => new Date(b.date)-new Date(a.date))[0];

  // Mensalidade
  const paymentDue = student?.paymentDue;
  let paymentDays = null, paymentColor = 'var(--portal-success)', paymentLabel = 'Em dia';
  if (paymentDue) {
    const diff = Math.ceil((new Date(paymentDue) - now) / 86400000);
    paymentDays = diff;
    paymentColor = diff < 0 ? 'var(--portal-danger)' : diff <= 5 ? 'var(--portal-warning)' : 'var(--portal-success)';
    paymentLabel = diff < 0 ? `Venceu há ${Math.abs(diff)}d` : diff === 0 ? 'Vence hoje!' : `Vence em ${diff}d`;
  }

  // Backfill macrocycle endDate dynamically if not present in DB
  if (currentMacro && !currentMacro.endDate && currentMacro.startDate) {
    const totalW = parseInt(currentMacro.totalWeeks) || 12;
    const endD = new Date(currentMacro.startDate + 'T12:00');
    endD.setDate(endD.getDate() + (totalW * 7));
    currentMacro.endDate = endD.toISOString().slice(0, 10);
  }

  // Macrociclo progress — based on session count within macro period
  let macroProgress = 0;
  let macroSessionsCount = 0;
  if (currentMacro?.startDate && currentMacro?.endDate) {
    const ms = new Date(currentMacro.startDate + 'T12:00');
    const me = new Date(currentMacro.endDate + 'T12:00');
    const total = me - ms;
    const elapsed = now - ms;
    // Date-based progress
    const datePct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    // Session-based: sessions within macro date range
    macroSessionsCount = completedSessions.filter(s => {
      if (!s.date) return false;
      const sDateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
      return sDateStr >= currentMacro.startDate && sDateStr <= currentMacro.endDate;
    }).length;
    // Planned sessions (approx: macrocycle weeks * sessions/week from schedules)
    const macroWeeks = Math.max(1, Math.ceil(total / (7*86400000)));
    const schedInMacro = schedules.filter(s => {
      if (!s.date) return false;
      const sDateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
      return sDateStr >= currentMacro.startDate && sDateStr <= currentMacro.endDate;
    }).length;
    const plannedSessions = schedInMacro || (macroWeeks * 3);
    const sesssPct = plannedSessions > 0 ? Math.min(100, Math.round((macroSessionsCount / plannedSessions) * 100)) : 0;
    macroProgress = sesssPct;
  }

  // Today check-in banner
  const todaySched = schedules.find(s => s.date === todayStr);
  let checkinBanner = '';
  if (todaySched) {
    const checkedIn = biofeedbacks.find(b => b.date?.startsWith(todayStr) && b.formType === 'pre');
    checkinBanner = checkedIn
      ? `<div class="portal-reminder portal-reminder-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Check-in do treino de hoje já realizado ✅
        </div>`
      : `<div class="portal-reminder portal-reminder-info" id="checkinBanner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Você tem treino hoje às ${todaySched.time || '—'}! <button onclick="document.querySelector('[data-section=bio]').click()" class="portal-reminder-btn">Fazer check-in</button>
        </div>`;
  }

  // Checkout reminder
  const needsCheckout = sessions.filter(s => s.status === 'completed' && !s.postBiofeedback);
  let checkoutBanner = '';
  if (needsCheckout.length > 0) {
    const s = needsCheckout[0];
    checkoutBanner = `<div class="portal-reminder portal-reminder-warning">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      ${needsCheckout.length} treino(s) aguardando checkout!
      <a href="#/form/post/${s.id}?t=${portalState.trainerId}" class="portal-reminder-btn">Fazer agora</a>
    </div>`;
  }

  return `
    <div class="portal-section">
      <!-- Reminders -->
      ${checkinBanner}
      ${checkoutBanner}

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
          <div class="portal-stat-icon" style="color:var(--portal-primary)">
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
          <div class="portal-macro-pct">${macroProgress}% concluído &middot; ${macroSessionsCount} sessões no ciclo</div>
          ${currentMacro.endDate ? `<div class="text-xs" style="color:var(--portal-text-muted);margin-top:4px">Termina em: ${new Date(currentMacro.endDate).toLocaleDateString('pt-BR')}</div>` : ''}
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

// ── TREINAR (Smart) ────────────────────────────────────────────────
function renderTreinar(workouts, schedules) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySched = schedules.find(s => s.date === todayStr);
  const nextSched = schedules
    .filter(s => s.date > todayStr)
    .sort((a,b) => a.date.localeCompare(b.date))[0];
  const suggestedSched = todaySched || nextSched;
  const suggestedWorkout = suggestedSched ? workouts.find(w => w.id === suggestedSched.workoutId) : null;

  const suggestedCard = suggestedWorkout ? `
    <div class="portal-suggested-card" id="suggestedCard">
      <div class="portal-suggested-label">
        ${todaySched
          ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Treino de HOJE`
          : `📅 Próximo treino — ${new Date(suggestedSched.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}`}
        ${suggestedSched.time ? ` · ${suggestedSched.time}` : ''}
      </div>
      <div class="portal-suggested-name">${suggestedWorkout.name || 'Treino'}</div>
      <div class="portal-suggested-meta">${(suggestedWorkout.exercises||[]).length} exercícios</div>
      <button class="portal-submit-btn" id="startSuggestedBtn" data-wid="${suggestedWorkout.id}" style="margin-top:12px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Iniciar Este Treino
      </button>
    </div>` : '';

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Treinar</h2>

      ${suggestedCard}

      <div class="portal-section-sub" style="margin-top:${suggestedCard?'20px':'0'}">Ou escolha outro treino</div>
      <div class="portal-bio-field">
        <div class="portal-workout-picker" id="soloWorkoutPicker">
          <div class="portal-workout-pick-item selected" data-wid="">
            <div class="portal-workout-pick-icon">🎯</div>
            <div class="portal-workout-pick-name">Livre</div>
            <div class="portal-workout-pick-sub">Sem base</div>
          </div>
          ${workouts.slice(0,6).map(w => `
            <div class="portal-workout-pick-item" data-wid="${w.id}">
              <div class="portal-workout-pick-icon">💪</div>
              <div class="portal-workout-pick-name">${(w.name||'Treino').substring(0,18)}${(w.name||'').length>18?'…':''}</div>
              <div class="portal-workout-pick-sub">${(w.exercises||[]).length} ex.</div>
            </div>
          `).join('')}
        </div>
        <input type="hidden" id="soloWorkoutSel" value="">
      </div>

      <div id="soloExercisesBlock"></div>

      <button id="soloStartBtn" class="portal-submit-btn" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 16px rgba(99,102,241,0.3)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Iniciar Sessão
      </button>

      <!-- Active session -->
      <div id="soloActiveSession" style="display:none;margin-top:4px">

        <!-- Live panel -->
        <div class="portal-live-panel">
          <div class="portal-live-stat">
            <div class="portal-live-val" id="liveTotal">00:00</div>
            <div class="portal-live-lbl">⏱ Total</div>
          </div>
          <div class="portal-live-stat">
            <div class="portal-live-val" id="liveWork" style="color:#10b981">00:00</div>
            <div class="portal-live-lbl">💪 Trabalho</div>
          </div>
          <div class="portal-live-stat">
            <div class="portal-live-val" id="liveRest" style="color:#06b6d4">00:00</div>
            <div class="portal-live-lbl">🙏 Descanso</div>
          </div>
          <button id="soundToggleBtn" class="portal-sound-btn" title="Som do timer">🔔</button>
        </div>

        <!-- Rest timer overlay (hidden until set done) -->
        <div id="restTimerOverlay" class="portal-rest-overlay" style="display:none">
          <div class="portal-rest-label">Descanso</div>
          <div class="portal-rest-countdown" id="restCountdown">60</div>
          <div class="portal-rest-bar-track"><div class="portal-rest-bar-fill" id="restBarFill" style="width:100%"></div></div>
          <div class="portal-rest-actions">
            <button class="portal-rest-adj" id="restMinus">-15s</button>
            <button class="portal-rest-skip" id="restSkip">Pular ⏩</button>
            <button class="portal-rest-adj" id="restPlus">+15s</button>
          </div>
        </div>

        <!-- Exercises -->
        <div id="soloExerciseLog" class="portal-live-exercises"></div>

        <!-- Session notes -->
        <div class="glass-card" style="margin-top:12px">
          <div class="portal-card-label">📝 Anotações da Sessão</div>
          <textarea id="soloNotes" class="portal-textarea" rows="3" placeholder="Observações gerais do treino..."></textarea>
        </div>

        <div class="portal-bio-field" style="margin-top:12px">
          <label class="portal-bio-label">PSE geral (Borg CR10) <span id="soloPseVal">5</span>
            <span id="soloPseDesc" style="font-size:0.72rem;color:var(--portal-text-muted);margin-left:8px">Algo Pesado</span>
          </label>
          <select id="soloPse" class="portal-textarea" style="margin-top:4px;padding:10px" onchange="
            document.getElementById('soloPseVal').textContent=this.value;
            var d=['','Extremamente Leve','Muito Leve','Leve','Moderado','Algo Pesado','Pesado / Forte','Muito Forte','Muito Forte+','Extremamente Forte','Esforço Máximo'];
            document.getElementById('soloPseDesc').textContent=d[this.value]||'';
          ">
            <option value="1">1 - Extremamente Leve (Repouso)</option>
            <option value="2">2 - Muito Leve</option>
            <option value="3">3 - Leve (Fácil)</option>
            <option value="4">4 - Moderado (Confortável)</option>
            <option value="5" selected>5 - Algo Pesado</option>
            <option value="6">6 - Pesado / Forte</option>
            <option value="7">7 - Muito Forte</option>
            <option value="8">8 - Muito Forte+</option>
            <option value="9">9 - Extremamente Forte (Quase Máximo)</option>
            <option value="10">10 - Esforço Máximo (Exaustão)</option>
          </select>
        </div>

        <button id="soloFinishBtn" class="portal-submit-btn" style="background:linear-gradient(135deg,#10b981,#059669);margin-top:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Finalizar & Salvar Sessão
        </button>
      </div>
    </div>`;
}

function initTreinar(workouts, schedules, student) {
  let soloTimerInterval = null;
  let soloStartTime = null;
  let workSeconds = 0, restSeconds = 0;
  let isResting = false;
  let soundEnabled = true;
  let restTimer = null;
  let restTotal = 60;
  let restRemaining = 60;
  const sid = portalState.studentId;
  const tid = portalState.trainerId;
  const selInput = document.getElementById('soloWorkoutSel');
  const exBlock = document.getElementById('soloExercisesBlock');

  // Sound helper (Web Audio API)
  function playBeep(freq = 880, dur = 0.15, times = 3) {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let t = ctx.currentTime;
      for (let i = 0; i < times; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t); osc.stop(t + dur);
        t += dur + 0.05;
      }
    } catch {}
  }

  // Sound toggle
  document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    document.getElementById('soundToggleBtn').textContent = soundEnabled ? '🔔' : '🔕';
  });

  // Rest timer
  function startRestTimer(seconds) {
    if (restTimer) clearInterval(restTimer);
    restTotal = seconds;
    restRemaining = seconds;
    isResting = true;
    const overlay = document.getElementById('restTimerOverlay');
    const cd = document.getElementById('restCountdown');
    const bar = document.getElementById('restBarFill');
    if (!overlay) return;
    overlay.style.display = 'block';
    const updateUI = () => {
      if (cd) cd.textContent = restRemaining;
      if (bar) bar.style.width = `${(restRemaining / restTotal) * 100}%`;
    };
    updateUI();
    restTimer = setInterval(() => {
      restRemaining--;
      restSeconds++;
      updateUI();
      if (restRemaining <= 0) {
        clearInterval(restTimer);
        overlay.style.display = 'none';
        isResting = false;
        playBeep(660, 0.2, 3);
      }
    }, 1000);
  }

  function stopRestTimer() {
    if (restTimer) clearInterval(restTimer);
    isResting = false;
    const overlay = document.getElementById('restTimerOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  document.getElementById('restSkip')?.addEventListener('click', stopRestTimer);
  document.getElementById('restMinus')?.addEventListener('click', () => {
    restRemaining = Math.max(5, restRemaining - 15);
    restTotal = Math.max(5, restTotal - 15);
    document.getElementById('restCountdown').textContent = restRemaining;
  });
  document.getElementById('restPlus')?.addEventListener('click', () => {
    restRemaining += 15; restTotal += 15;
    document.getElementById('restCountdown').textContent = restRemaining;
  });

  // Workout card picker
  document.querySelectorAll('.portal-workout-pick-item').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.portal-workout-pick-item').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const wid = card.dataset.wid;
      if (selInput) selInput.value = wid;
      const w = workouts.find(w => w.id === wid);
    if (w && w.exercises?.length) {
        exBlock.innerHTML = `
          <div class="portal-section-sub" style="margin-bottom:8px">Exercícios do Treino</div>
          ${w.exercises.map((ex,i) => `
            <div class="glass-card portal-ex-pick-card" data-ei="${i}" data-wid="${w.id}" style="padding:12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all 0.2s">
              <div class="portal-ex-num" style="min-width:28px;height:28px;border-radius:50%;background:rgba(99,102,241,0.2);color:#818cf8;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700">${i+1}</div>
              <div style="flex:1;min-width:0">
                <div class="portal-ex-name" style="font-size:0.88rem;font-weight:600">${ex.name}</div>
                <div class="portal-ex-detail">${ex.sets||3}×${ex.reps||'10-12'}${ex.load?' &middot; '+ex.load+'kg':''}${ex.rest?' &middot; '+ex.rest+'s':''}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--portal-text-muted);flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
          `).join('')}`;
        // Bind info tap
        exBlock.querySelectorAll('.portal-ex-pick-card').forEach(card => {
          card.addEventListener('click', () => {
            const ei = parseInt(card.dataset.ei);
            const ex = w.exercises[ei];
            if (ex) showExerciseModal(ex);
          });
        });
      } else { exBlock.innerHTML = ''; }
    });
  });

  // Start suggested workout
  document.getElementById('startSuggestedBtn')?.addEventListener('click', (e) => {
    const wid = e.currentTarget.dataset.wid;
    if (selInput) selInput.value = wid;
    document.querySelectorAll('.portal-workout-pick-item').forEach(c => c.classList.remove('selected'));
    const matchCard = document.querySelector(`.portal-workout-pick-item[data-wid="${wid}"]`);
    if (matchCard) matchCard.classList.add('selected');
    document.getElementById('soloStartBtn')?.click();
  });

  // Build exercise log HTML
  function buildExerciseLog(w) {
    const exLogEl = document.getElementById('soloExerciseLog');
    if (w && w.exercises?.length) {
      exLogEl.innerHTML = w.exercises.map((ex, ei) => `
        <div class="glass-card portal-live-ex-card">
          <div class="portal-live-ex-header">
            <div class="portal-ex-num">${ei+1}</div>
            <div style="flex:1;min-width:0">
              <div class="portal-ex-name">${ex.name}</div>
              <div class="portal-ex-detail">${ex.sets||3}×${ex.reps||'10-12'}${ex.load?` · ${ex.load}kg`:''}${ex.rest?` · ${ex.rest}s descanso`:''}</div>
              ${ex.method?`<div class="portal-ex-method">${ex.method}</div>`:''}
            </div>
            <button class="portal-ex-info-btn" data-ei="${ei}" title="Ver detalhes" style="background:rgba(99,102,241,0.15);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </button>
            ${ex.videoUrl?`<a href="${ex.videoUrl}" target="_blank" class="portal-ex-video"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Vídeo</a>`:''}
          </div>
          ${ex.description||ex.notes?`<div class="portal-ex-desc">${ex.description||ex.notes}</div>`:''}
          ${Array.from({length: parseInt(ex.sets)||3}, (_, si) => `
            <div class="portal-solo-set-row" id="setrow_${ei}_${si}">
              <span class="portal-set-num">S${si+1}</span>
              <input type="number" placeholder="Reps" class="portal-solo-input" id="sr_${ei}_${si}_reps" min="0" value="${parseInt(ex.reps)||''}">
              <input type="number" placeholder="kg" class="portal-solo-input" id="sr_${ei}_${si}_load" min="0" step="0.5" value="${ex.load||''}">
              <select class="portal-solo-input portal-solo-pse" id="sr_${ei}_${si}_pse" style="padding: 8px 2px;">
                <option value="" disabled selected>PSE</option>
                <option value="1">1 - M. Leve</option>
                <option value="2">2 - Leve</option>
                <option value="3">3 - Moderado</option>
                <option value="4">4 - A. Pesado</option>
                <option value="5">5 - Forte</option>
                <option value="6">6 - Forte+</option>
                <option value="7">7 - M. Forte</option>
                <option value="8">8 - M. Forte+</option>
                <option value="9">9 - Extr. Forte</option>
                <option value="10">10 - Máximo</option>
              </select>
              <select class="portal-solo-input portal-solo-pse" id="sr_${ei}_${si}_rir" style="padding: 8px 2px;">
                <option value="" disabled selected>RIR</option>
                <option value="0">0 RIR (Falha)</option>
                <option value="1">1 RIR</option>
                <option value="2">2 RIR</option>
                <option value="3">3 RIR</option>
                <option value="4">4 RIR</option>
                <option value="5">5 RIR</option>
                <option value="6">6 RIR</option>
                <option value="7">7 RIR</option>
                <option value="8">8 RIR</option>
                <option value="9">9 RIR</option>
                <option value="10">10+ RIR</option>
              </select>
              <button class="portal-solo-done-btn" id="sdb_${ei}_${si}" data-ei="${ei}" data-si="${si}" data-rest="${ex.rest||60}">&#10003;</button>
            </div>
          `).join('')}
          <div class="portal-live-ex-notes-wrap">
            <textarea class="portal-textarea" id="exnotes_${ei}" rows="1" placeholder="Anotações deste exercício..."></textarea>
          </div>
        </div>
      `).join('');
    } else {
      // Free log
      exLogEl.innerHTML = `
        <div id="soloFreeExercises"></div>
        <button id="soloAddExBtn" class="portal-expand-btn" style="border:1px dashed rgba(255,255,255,0.15);border-radius:10px;padding:10px;width:100%;justify-content:center;margin-bottom:8px;color:var(--portal-primary)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar exercício
        </button>`;
      let cnt = 0;
      document.getElementById('soloAddExBtn')?.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'glass-card'; div.style.cssText = 'padding:10px;margin-bottom:8px';
        const ei = cnt++;
        div.innerHTML = `
          <input type="text" placeholder="Nome do exercício" class="portal-textarea" id="fex_${ei}_name" style="margin-bottom:6px">
          <div class="portal-solo-set-row">
            <span class="portal-set-num">S1</span>
            <input type="number" placeholder="Reps" class="portal-solo-input" id="fex_${ei}_reps">
            <input type="number" placeholder="kg" class="portal-solo-input" id="fex_${ei}_load" step="0.5">
            <select class="portal-solo-input portal-solo-pse" id="fex_${ei}_pse" style="padding: 8px 2px;">
              <option value="" disabled selected>PSE</option>
              <option value="1">1 - M. Leve</option>
              <option value="2">2 - Leve</option>
              <option value="3">3 - Moderado</option>
              <option value="4">4 - A. Pesado</option>
              <option value="5">5 - Forte</option>
              <option value="6">6 - Forte+</option>
              <option value="7">7 - M. Forte</option>
              <option value="8">8 - M. Forte+</option>
              <option value="9">9 - Extr. Forte</option>
              <option value="10">10 - Máximo</option>
            </select>
            <select class="portal-solo-input portal-solo-pse" id="fex_${ei}_rir" style="padding: 8px 2px;">
              <option value="" disabled selected>RIR</option>
              <option value="0">0 RIR (Falha)</option>
              <option value="1">1 RIR</option>
              <option value="2">2 RIR</option>
              <option value="3">3 RIR</option>
              <option value="4">4 RIR</option>
              <option value="5">5 RIR</option>
              <option value="6">6 RIR</option>
              <option value="7">7 RIR</option>
              <option value="8">8 RIR</option>
              <option value="9">9 RIR</option>
              <option value="10">10+ RIR</option>
            </select>
          </div>`;
        document.getElementById('soloFreeExercises').appendChild(div);
      });
    }

    // Bind done buttons
    exLogEl.querySelectorAll('.portal-solo-done-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const isDone = btn.classList.toggle('done');
        btn.closest('.portal-solo-set-row')?.classList.toggle('set-done', isDone);
        if (isDone) {
          workSeconds += 30; // estimate 30s work per set
          const restSec = parseInt(btn.dataset.rest) || 60;
          startRestTimer(restSec);
          playBeep(440, 0.1, 1);
        }
      });
    });

    // Bind info buttons
    if (w?.exercises) {
      exLogEl.querySelectorAll('.portal-ex-info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const ei = parseInt(btn.dataset.ei);
          const ex = w.exercises[ei];
          if (ex) showExerciseModal(ex);
        });
      });
    }
  }


  // Main timer
  function startMainTimer() {
    soloStartTime = new Date();
    soloTimerInterval = setInterval(() => {
      const elapsed = Math.floor((new Date() - soloStartTime) / 1000);
      // Only count work when NOT resting
      if (!isResting) workSeconds++;
      const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
      const el = document.getElementById('liveTotal');
      const ew = document.getElementById('liveWork');
      const er = document.getElementById('liveRest');
      if (el) el.textContent = fmt(elapsed);
      if (ew) ew.textContent = fmt(workSeconds);
      if (er) er.textContent = fmt(restSeconds);
    }, 1000);
  }

  document.getElementById('soloStartBtn')?.addEventListener('click', () => {
    document.getElementById('soloActiveSession').style.display = 'block';
    document.getElementById('soloStartBtn').style.display = 'none';
    document.getElementById('soloExercisesBlock').style.display = 'none';
    document.getElementById('soloWorkoutPicker').style.display = 'none';
    document.getElementById('suggestedCard')?.remove();
    document.querySelector('.portal-section-sub')?.remove();

    const wid = selInput?.value || '';
    const w = workouts.find(w => w.id === wid);
    buildExerciseLog(w);
    startMainTimer();
  });

  document.getElementById('soloFinishBtn')?.addEventListener('click', async () => {
    clearInterval(soloTimerInterval);
    stopRestTimer();
    const durationMin = Math.round((new Date() - soloStartTime) / 60000);
    const wid = selInput?.value || '';
    const w = workouts.find(w => w.id === wid);
    const pse = parseInt(document.getElementById('soloPse')?.value) || 5;
    const notes = document.getElementById('soloNotes')?.value || '';

    // Collect setLog
    const setLog = [];
    if (w && w.exercises?.length) {
      w.exercises.forEach((ex, ei) => {
        const sets = parseInt(ex.sets) || 3;
        for (let si = 0; si < sets; si++) {
          const reps = document.getElementById(`sr_${ei}_${si}_reps`)?.value;
          const load = document.getElementById(`sr_${ei}_${si}_load`)?.value;
          const psei = document.getElementById(`sr_${ei}_${si}_pse`)?.value;
          const rir = document.getElementById(`sr_${ei}_${si}_rir`)?.value;
          const exNotes = document.getElementById(`exnotes_${ei}`)?.value || '';
          // Save even if empty so we don't lose the exercise grouping
          setLog.push({ exerciseIdx: ei, exerciseName: ex.name, setIdx: si,
            reps: parseInt(reps)||0, load: parseFloat(load)||0,
            pse: psei ? parseInt(psei) : null,
            rir: rir !== '' && rir != null ? parseInt(rir) : null,
            notes: exNotes });
        }
      });
    } else {
      // Collect from free exercises
      const freeCards = document.getElementById('soloFreeExercises')?.children || [];
      Array.from(freeCards).forEach((card, ei) => {
        const name = document.getElementById(`fex_${ei}_name`)?.value || `Exercício ${ei+1}`;
        const reps = document.getElementById(`fex_${ei}_reps`)?.value;
        const load = document.getElementById(`fex_${ei}_load`)?.value;
        const psei = document.getElementById(`fex_${ei}_pse`)?.value;
        const rir = document.getElementById(`fex_${ei}_rir`)?.value;
        
        setLog.push({
          exerciseIdx: ei,
          exerciseName: name,
          setIdx: 0,
          reps: parseInt(reps)||0,
          load: parseFloat(load)||0,
          pse: psei ? parseInt(psei) : null,
          rir: rir !== '' && rir != null ? parseInt(rir) : null,
          notes: ''
        });
      });
    }

    const sessionData = {
      studentId: sid,
      trainerId: tid,
      trainer_id: tid,
      workoutId: wid || null,
      workoutName: w?.name || 'Treino Autônomo',
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      isSolo: true,
      durationMin,
      setLog,
      postBiofeedback: { pse, notes },
    };

    try {
      await db.add('sessions', sessionData);
    } catch(e) { console.error(e); }

    document.getElementById('soloActiveSession').innerHTML = `
      <div class="portal-success">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--portal-success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <div>Treino salvo! Duração: ${durationMin} min</div>
      </div>`;
  });
}

// ── SESSÕES ────────────────────────────────────────────────────
function safeFormatDate(dStr, timeStr = '') {
  if (!dStr) return '';
  try {
    if (dStr.includes('/')) {
      const [d, m, y] = dStr.split('/');
      return new Date(y, m-1, d, 12).toLocaleDateString('pt-BR', {weekday:'short',day:'numeric',month:'short'});
    }
    const d = new Date(dStr + (dStr.includes('T') ? '' : (timeStr ? 'T'+timeStr : 'T12:00')));
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString('pt-BR', {weekday:'short',day:'numeric',month:'short'});
  } catch { return dStr; }
}

// -- EXERCISE DETAIL MODAL -------------------------------------
function showExerciseModal(ex) {
  // Remove any existing modal
  document.getElementById('exDetailModal')?.remove();

  const muscleIcons = {
    'peito': '#f97316', 'chest': '#f97316',
    'costas': '#10b981', 'back': '#10b981',
    'pernas': '#6366f1', 'quad': '#6366f1', 'legs': '#6366f1', 'gluteo': '#6366f1',
    'ombro': '#06b6d4', 'shoulder': '#06b6d4',
    'biceps': '#f59e0b', 'bicep': '#f59e0b',
    'triceps': '#8b5cf6', 'tricep': '#8b5cf6',
    'core': '#ef4444', 'abdominal': '#ef4444',
  };
  const muscleLower = (ex.muscleGroup || ex.muscle || '').toLowerCase();
  const muscleColor = Object.entries(muscleIcons).find(([k])=>muscleLower.includes(k))?.[1] || '#818cf8';

  const loadTypeLabel = ex.loadType === 'bodyweight' ? 'Peso Corporal' :
                        ex.loadType === 'intensity' ? 'Intensidade (%)' : 'Carga (kg)';

  const modal = document.createElement('div');
  modal.id = 'exDetailModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;justify-content:flex-end;
    background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
    animation:fadeIn 0.2s ease;
  `;

  modal.innerHTML = `
    <style>
      @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      #exDetailSheet { animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    </style>
    <div id="exDetailSheet" style="
      background:var(--portal-card,#1e293b);border-radius:24px 24px 0 0;
      padding:0 0 env(safe-area-inset-bottom,20px);max-height:85vh;overflow-y:auto;
      box-shadow:0 -20px 60px rgba(0,0,0,0.5);
    ">
      <!-- Handle -->
      <div style="display:flex;justify-content:center;padding:12px 0 0">
        <div style="width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2)"></div>
      </div>

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:16px 20px 12px">
        <div style="flex:1">
          <div style="font-size:1.15rem;font-weight:800;color:var(--portal-text,#f1f5f9);line-height:1.3">${ex.name}</div>
          ${ex.muscleGroup||ex.muscle ? `<div style="font-size:0.8rem;color:${muscleColor};font-weight:600;margin-top:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${muscleColor}" style="vertical-align:middle;margin-right:4px"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            ${ex.muscleGroup||ex.muscle}
          </div>` : ''}
        </div>
        <button id="closeExModal" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Quick stats row -->
      <div style="display:flex;gap:8px;padding:0 20px 16px;overflow-x:auto">
        ${ex.sets ? `<div style="background:rgba(99,102,241,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#818cf8">${ex.sets}</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Séries</div>
        </div>` : ''}
        ${ex.reps ? `<div style="background:rgba(16,185,129,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#10b981">${ex.reps}</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Reps</div>
        </div>` : ''}
        ${ex.load ? `<div style="background:rgba(249,115,22,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#f97316">${ex.load}${ex.loadType!=='bodyweight'?'kg':'%'}</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">${loadTypeLabel}</div>
        </div>` : ''}
        ${ex.rest ? `<div style="background:rgba(6,182,212,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#06b6d4">${ex.rest}s</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Descanso</div>
        </div>` : ''}
        ${ex.rir!=null ? `<div style="background:rgba(245,158,11,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#f59e0b">RIR ${ex.rir}</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Reserva</div>
        </div>` : ''}
      </div>

      <!-- Video -->
      ${ex.videoUrl ? `<div style="padding:0 20px 16px">
        ${ex.videoUrl.includes('youtube') || ex.videoUrl.includes('youtu.be') ?
          `<div style="position:relative;padding-top:56.25%;border-radius:14px;overflow:hidden;background:#000">
            <iframe src="${ex.videoUrl.replace('watch?v=','embed/').replace('youtu.be/','youtube.com/embed/')}" style="position:absolute;inset:0;width:100%;height:100%;border:none" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>
          </div>` :
          `<video src="${ex.videoUrl}" controls playsinline style="width:100%;border-radius:14px;max-height:220px;background:#000"></video>`
        }
      </div>` : `<div style="margin:0 20px 16px;height:160px;background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08));border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px dashed rgba(255,255,255,0.1)">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <span style="font-size:0.75rem;color:rgba(255,255,255,0.3)">Nenhum vídeo vinculado</span>
      </div>`}

      <!-- Description / Technique -->
      <div style="padding:0 20px 20px">
        ${ex.description||ex.notes||ex.technique ? `
        <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:14px 16px;border-left:3px solid ${muscleColor}">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${muscleColor};margin-bottom:8px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${muscleColor}" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Técnica de Execução
          </div>
          <p style="font-size:0.82rem;line-height:1.7;color:var(--portal-text-secondary,#94a3b8);margin:0">${ex.description||ex.notes||ex.technique}</p>
        </div>` : `
        <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:14px 16px">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px">Dicas de Execução</div>
          <p style="font-size:0.82rem;line-height:1.7;color:#64748b;margin:0">Mantenha a postura correta durante todo o movimento. Controle a fase excêntrica (descida) em 2-3 segundos. Respire corretamente: expire no esforço, inspire no retorno.</p>
        </div>`}

        ${ex.method ? `<div style="margin-top:10px;background:rgba(139,92,246,0.1);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><polygon points="12 2 2 7 12 22 22 7 12 2"/></svg>
          <span style="font-size:0.8rem;color:#a78bfa;font-weight:600">${ex.method}</span>
        </div>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.getElementById('closeExModal')?.addEventListener('click', () => modal.remove());
}

function renderSessoes(sessions, schedules) {
  const now = new Date();
  const upcoming = schedules
    .filter(s => new Date(s.date+'T'+(s.time||'23:59')) >= now)
    .sort((a,b) => new Date(a.date+'T'+a.time)-new Date(b.date+'T'+b.time))
    .slice(0,5);

  const allCompleted = sessions.filter(s => s.status === 'completed');
  const completed = allCompleted.sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,20);
  // Sessions needing checkout (no postBiofeedback)
  const needsCheckout = allCompleted.filter(s => !s.postBiofeedback).slice(0,3);

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Sessões</h2>

      ${upcoming.length ? `
        <div class="portal-section-sub">Próximas sessões</div>
        ${upcoming.map(s => `
          <div class="glass-card portal-session-upcoming">
            <div class="portal-session-date">${safeFormatDate(s.date)}</div>
            <div class="portal-session-time">${s.time || 'Horário a confirmar'}</div>
            <div class="portal-session-name">${s.workoutName || 'Treino'}</div>
          </div>
        `).join('')}
      ` : ''}

      <!-- CHECKOUT PENDENTE -->
      ${needsCheckout.length ? `
        <div class="portal-section-sub" style="margin-top:20px;color:var(--portal-warning)">⚡ Checkout pendente</div>
        ${needsCheckout.map(s => `
          <div class="glass-card portal-checkout-card" id="checkout_${s.id}">
            <div class="portal-checkout-header">
              <div>
                <div class="portal-session-name">${s.workoutName||'Treino'}</div>
                <div class="portal-session-meta">${safeFormatDate(s.date)}</div>
              </div>
              <span class="portal-checkout-badge">Checkout</span>
            </div>
            <div class="portal-checkout-form" id="chkform_${s.id}" style="display:none">
              <div class="portal-bio-field" style="margin-top:12px">
                <label class="portal-bio-label">PSE pós-treino <span id="chkpse_lbl_${s.id}">5</span>/10
                  <span id="chkpse_desc_${s.id}" style="font-size:0.72rem;color:var(--portal-text-muted);margin-left:8px">Algo Pesado</span>
                </label>
                <select id="chkpse_${s.id}" class="portal-textarea" style="margin-top:4px;padding:10px" onchange="
                  document.getElementById('chkpse_lbl_${s.id}').textContent=this.value;
                  var d=['','Extremamente Leve','Muito Leve','Leve','Moderado','Algo Pesado','Pesado / Forte','Muito Forte','Muito Forte+','Extremamente Forte','Esforço Máximo'];
                  document.getElementById('chkpse_desc_${s.id}').textContent=d[this.value]||'';
                ">
                  <option value="1">1 - Extremamente Leve (Repouso)</option>
                  <option value="2">2 - Muito Leve</option>
                  <option value="3">3 - Leve (Fácil)</option>
                  <option value="4">4 - Moderado (Confortável)</option>
                  <option value="5" selected>5 - Algo Pesado</option>
                  <option value="6">6 - Pesado / Forte</option>
                  <option value="7">7 - Muito Forte</option>
                  <option value="8">8 - Muito Forte+</option>
                  <option value="9">9 - Extremamente Forte (Quase Máximo)</option>
                  <option value="10">10 - Esforço Máximo (Exaustão)</option>
                </select>
              </div>
              <div class="portal-bio-field">
                <label class="portal-bio-label">Sensação geral</label>
                <div class="portal-feeling-row">
                  ${['😩 Péssimo','😓 Ruim','😐 Ok','😊 Bom','🔥 Ótimo'].map((f,i)=>`
                    <button type="button" class="portal-feeling-btn" data-val="${i+1}" data-sid="${s.id}" onclick="this.parentElement.querySelectorAll('.portal-feeling-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${f}</button>
                  `).join('')}
                </div>
              </div>
              <div class="portal-bio-field">
                <label class="portal-bio-label">Notas do treino</label>
                <textarea class="portal-textarea" id="chknotes_${s.id}" rows="2" placeholder="Como foi? Algo importante?"></textarea>
              </div>
              <button class="portal-submit-btn" id="chksubmit_${s.id}" data-sid="${s.id}" style="background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 4px 12px rgba(245,158,11,0.3)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Confirmar Checkout
              </button>
            </div>
            <button class="portal-expand-btn checkout-toggle" data-sid="${s.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              Fazer checkout
            </button>
          </div>
        `).join('')}
      ` : ''}

      <div class="portal-section-sub" style="margin-top:20px">Histórico</div>
      ${completed.length === 0 ? `<div class="portal-empty">Nenhuma sessão concluída ainda</div>` :
        completed.map(s => {
          const setLog = s.setLog || [];
          const vol = setLog.reduce((t,x) => t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0);
          const pse = s.postBiofeedback?.pse;
          const isSolo = s.isSolo;
          const hasCheckout = !!s.postBiofeedback;
          return `
            <div class="portal-session-card glass-card${isSolo ? ' portal-session-solo' : ''}">
              <div class="portal-session-header">
                <div>
                  <div class="portal-session-name">${s.workoutName||'Treino'}${isSolo ? ' <span class="portal-solo-badge">autônomo</span>' : ''}</div>
                  <div class="portal-session-meta">${safeFormatDate(s.date)}</div>
                </div>
                <div class="portal-session-stats-sm">
                  ${vol>0?`<span>${Math.round(vol)}kg</span>`:''}
                  ${pse?`<span class="pse-badge ${getPseBadgeClass(pse)}">PSE ${pse}</span>`:
                    !hasCheckout?`<span class="portal-no-checkout">sem checkout</span>`:''}
                  ${s.durationMin ? `<span>${s.durationMin}min</span>` : ''}
                </div>
              </div>
              <div class="portal-session-sets" id="sets_${s.id}" style="display:none">
                ${(() => {
                  if (!setLog.length) return '<div class="text-muted" style="font-size:0.75rem;padding:8px 0">Sem dados de série</div>';
                  // Group sets by exerciseName
                  const groups = [];
                  const seen = {};
                  setLog.forEach(x => {
                    const key = x.exerciseName || ('Exercício ' + ((x.exerciseIdx||0)+1));
                    if (!seen[key]) { seen[key] = groups.length; groups.push({ name: key, sets: [] }); }
                    groups[seen[key]].sets.push(x);
                  });
                  return groups.map(g => `
                    <div class="portal-ex-group">
                      <div class="portal-ex-group-name" style="color:var(--portal-primary);font-size:0.8rem;margin-bottom:4px;font-weight:700">${g.name}</div>
                      ${g.sets.map(x => {
                        const pseClass = getPseBadgeClass(x.pse);
                        const rirColor = x.rir == null || x.rir === '' ? '' : x.rir <= 1 ? 'color:#ef4444' : x.rir <= 2 ? 'color:#f59e0b' : 'color:#10b981';
                        return `
                          <div class="portal-set-row set-colored">
                            <span class="portal-set-num">S${x.setIdx+1}</span>
                            <span>${x.reps} reps</span>
                            <span>${x.load}kg</span>
                            ${x.pse?`<span class="pse-mini ${pseClass}">PSE ${x.pse}</span>`:''}
                            ${x.rir!=null&&x.rir!==''?`<span style="${rirColor};font-size:0.68rem;font-weight:600">RIR ${x.rir}</span>`:''}
                          </div>`;
                      }).join('')}
                    </div>`).join('');
                })()}
              </div>
              ${setLog.length?`<button class="portal-expand-btn session-expand" data-id="${s.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                Ver exercícios
              </button>`:''}
            </div>`;
        }).join('')}
    </div>`;
}

function getPseBadgeClass(pse) {
  if (!pse) return '';
  if (pse >= 9) return 'pse-red';
  if (pse >= 7) return 'pse-orange';
  if (pse >= 5) return 'pse-yellow';
  return 'pse-green';
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

  // Checkout toggle
  document.querySelectorAll('.checkout-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.sid;
      const form = document.getElementById(`chkform_${sid}`);
      const isOpen = form.style.display !== 'none';
      form.style.display = isOpen ? 'none' : 'block';
      btn.innerHTML = isOpen
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> Fazer checkout`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> Fechar`;
    });
  });

  // Checkout submit
  document.querySelectorAll('[id^="chksubmit_"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sid = btn.dataset.sid;
      const pse = parseInt(document.getElementById(`chkpse_${sid}`)?.value) || 5;
      const notes = document.getElementById(`chknotes_${sid}`)?.value || '';
      const feeling = document.querySelector(`[data-sid="${sid}"].portal-feeling-btn.active`)?.dataset.val || null;

      try {
        // Update session in local DB
        const session = await db.get('sessions', sid);
        if (session) {
          session.postBiofeedback = { pse, notes, feeling: feeling ? parseInt(feeling) : null, date: new Date().toISOString() };
          await db.update('sessions', session);
        }
      } catch(e) { console.error(e); }

      const card = document.getElementById(`checkout_${sid}`);
      if (card) {
        card.innerHTML = `<div class="portal-success" style="padding:16px">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--portal-success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div>Checkout salvo! PSE ${pse}</div>
        </div>`;
      }
    });
  });
}

// ── BIOFEEDBACK ────────────────────────────────────────────────
function renderBio(biofeedbacks, sid, tid) {
  const last7 = biofeedbacks.slice(0, 7);
  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Check-in</h2>

      <div class="glass-card portal-bio-form-card">
        <div class="portal-card-label">Biofeedback Pré-treino</div>
        <form id="portalBioForm">
          <div class="portal-bio-field">
            <label class="portal-bio-label">Qualidade do Sono <span id="sleepVal">7</span>/10</label>
            <input type="range" name="sleep" min="1" max="10" value="7" class="portal-range" oninput="document.getElementById('sleepVal').textContent=this.value">
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">Recuperação (TQR) <span id="tqrVal">5</span>/10
              <span id="tqrDesc" style="font-size:0.72rem;color:var(--portal-text-muted);margin-left:8px">Recuperação parcial</span>
            </label>
            <input type="range" name="tqr" min="0" max="10" value="5" class="portal-range" oninput="
              document.getElementById('tqrVal').textContent=this.value;
              var d=['Não recuperado','Muito mal recuperado','Mal recuperado','Pouco recuperado','Recuperação abaixo da média','Recuperação parcial','Razoavelmente recuperado','Bem recuperado','Muito bem recuperado','Excelente recuperação','Totalmente recuperado'];
              document.getElementById('tqrDesc').textContent=d[this.value]||'';
            ">
            <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--portal-text-muted);margin-top:4px">
              <span style="color:#ef4444">0 — Esgotado</span><span style="color:#f59e0b">5 — Parcial</span><span style="color:#10b981">10 — Pleno</span>
            </div>
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">Alimentação nas últimas 24h</label>
            <select name="food" class="portal-textarea" style="background:rgba(255,255,255,0.05);color:var(--portal-text);font-size:0.85rem">
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
            <label class="portal-bio-label">Motivação <span id="motivVal">7</span>/10</label>
            <input type="range" name="motivation" min="1" max="10" value="7" class="portal-range" oninput="document.getElementById('motivVal').textContent=this.value">
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
            <div class="portal-bio-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
              ${b.sleep!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.2);color:#93c5fd;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  Sono: ${b.sleep}
                </span>`:''}
              ${b.tqr!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.2);color:#6ee7b7;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  TQR: ${b.tqr}
                </span>`:''}
              ${b.food!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.2);color:#fda4af;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/></svg>
                  Alim: ${b.food}/5
                </span>`:''}
              ${b.stress!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.2);color:#fde047;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Stress: ${b.stress}
                </span>`:''}
              ${b.pain!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.2);color:#fca5a5;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><path d="M12 2v20M2 12h20"/></svg>
                  Dor: ${b.pain}
                </span>`:''}
              ${b.motivation!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.2);color:#ffedd5;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Mot: ${b.motivation}
                </span>`:''}
              ${b.pse!=null?`<span class="pse-badge ${getPseBadgeClass(b.pse)}">PSE ${b.pse}</span>`:''}
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
      motivation: parseInt(fd.get('motivation')) || 7,
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
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--portal-success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div>Check-in enviado! ✅</div>
    </div>`;
  });
}

// -- RELATORIOS -------------------------------------------------
async function renderRelatorios(student, sessions, assessments, biofeedbacks, macrocycles = []) {
  const selectedMacroId = portalState.selectedReportMacroId || 'all';
  let completed = sessions.filter(s => s.status === 'completed').sort((a,b) => new Date(a.date)-new Date(b.date));
  const compAss = assessments.filter(a => a.type === 'composicao').sort((a,b) => new Date(a.date)-new Date(b.date));
  let bf = [...biofeedbacks].sort((a,b) => new Date(a.date)-new Date(b.date));

  if (selectedMacroId !== 'all') {
    const macro = macrocycles.find(m => m.id === selectedMacroId);
    if (macro) {
      completed = completed.filter(s => s.macrocycleId === macro.id || (s.date >= macro.startDate && s.date <= macro.endDate));
      bf = bf.filter(b => b.date >= macro.startDate && b.date <= macro.endDate);
    }
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsMonth = completed.filter(s => new Date(s.date) >= startOfMonth).length;
  const recent10 = bf.slice(-10);
  const avgPse   = recent10.length ? (recent10.reduce((t,b)=>t+(b.pse||0),0)/recent10.length).toFixed(1) : '--';
  const avgSleep = recent10.length ? (recent10.reduce((t,b)=>t+(b.sleep||0),0)/recent10.length).toFixed(1) : '--';

  const totalVol = completed.reduce((t,s)=>t+(s.setLog||[]).reduce((tt,x)=>tt+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0),0);
  const avgVolPerSess = completed.length ? Math.round(totalVol/completed.length) : 0;
  const avgDurMin = completed.length ? Math.round(completed.reduce((t,s)=>t+(s.durationMin||0),0)/completed.length) : 0;

  const lastComp = compAss[compAss.length-1];
  const age = student?.birthDate ? Calc.calcularIdade(student.birthDate) : (student?.age||0);
  const objMap = {'Emagrecimento':'emagrecimento','Perda de peso':'emagrecimento','Hipertrofia':'hipertrofia','Ganho de massa':'hipertrofia','Manutencao':'manutencao','Saude':'manutencao'};
  const obj = objMap[student?.goal] || 'manutencao';
  const tmbRes = lastComp?.peso && age ? Calc.tmb(lastComp.peso, lastComp.altura, age, student?.gender||'M', lastComp.massaMagra) : null;
  const sessPerWeek = completed.length>1 ? completed.length/Math.max(1,Math.ceil((new Date(completed[completed.length-1].date)-new Date(completed[0].date))/(7*86400000))) : 3;
  const nivelAtiv = sessPerWeek>=5?'ativo':sessPerWeek>=3?'moderado':sessPerWeek>=1?'leve':'sedentario';
  const tdeeRes = tmbRes ? Calc.tdee(tmbRes.valor, nivelAtiv) : null;
  const metaRes = tdeeRes ? Calc.metaCalorica(tdeeRes.valor, obj) : null;
  const macrosRes = metaRes && lastComp?.peso ? Calc.macros(metaRes.kcal, lastComp.peso, obj) : null;

  // Exercise load sparklines
  const exMap = {};
  completed.forEach(s => {
    (s.setLog||[]).forEach(x => {
      if (!x.exerciseName || !x.load || x.load<=0) return;
      if (!exMap[x.exerciseName]) exMap[x.exerciseName] = [];
      exMap[x.exerciseName].push({ date: s.date, load: parseFloat(x.load)||0 });
    });
  });
  const topEx = Object.entries(exMap).filter(([,sets])=>sets.length>=2)
    .map(([name,sets])=>{
      const sorted=sets.sort((a,b)=>new Date(a.date)-new Date(b.date));
      const first=sorted[0],last=sorted[sorted.length-1];
      const delta=last.load-first.load;
      return {name,first,last,delta,pct:first.load>0?Math.round((delta/first.load)*100):0,sets:sorted};
    }).sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct)).slice(0,6);

  // Caloric card
  let caloricHtml = '';
  if (tmbRes && tdeeRes && metaRes) {
    caloricHtml = `<div class="glass-card portal-caloric-card" style="margin-bottom:12px">
      <div class="portal-card-label">Gasto Energetico Estimado &middot; ${tmbRes.formula}</div>
      <div class="portal-caloric-grid">
        <div class="portal-caloric-item"><div class="portal-caloric-val">${tmbRes.valor}</div><div class="portal-caloric-lbl">TMB kcal</div></div>
        <div class="portal-caloric-item" style="color:var(--portal-primary)"><div class="portal-caloric-val">${tdeeRes.valor}</div><div class="portal-caloric-lbl">TDEE kcal</div></div>
        <div class="portal-caloric-item" style="color:var(--portal-accent)"><div class="portal-caloric-val">${metaRes.kcal}</div><div class="portal-caloric-lbl">Meta kcal</div></div>
      </div>
      ${macrosRes?`<div class="portal-macros-row" style="margin-top:8px">
        <div style="color:#10b981">Proteina: <b>${macrosRes.proteina.g}g</b></div>
        <div style="color:#f59e0b">Carb: <b>${macrosRes.carboidrato.g}g</b></div>
        <div style="color:#8b5cf6">Gordura: <b>${macrosRes.gordura.g}g</b></div>
      </div>`:''}
    </div>`;
  }

  // Motivational feed
  const pseNum = parseFloat(avgPse)||0;
  const sleepNum = parseFloat(avgSleep)||0;
  let feedTxt = '';
  if (pseNum>8) feedTxt='Seus treinos estao muito intensos! Vamos ajustar o ritmo para garantir boa recuperacao.';
  else if (pseNum>6) feedTxt='Voce esta treinando na intensidade ideal! Continue assim.';
  else feedTxt='Boa consistencia! Temos margem para evoluir a intensidade gradualmente.';
  if (sleepNum>0 && sleepNum<6) feedTxt+=' O sono esta abaixo do ideal.';
  else if (sleepNum>=7) feedTxt+=' Otima qualidade de sono!';
  if (completed.length>0) feedTxt+=` ${completed.length} sessoes concluidas. Incrivel!`;

  // Exercise progression
  const exHtml = topEx.length>0 ? `<div class="glass-card" style="margin-bottom:12px">
    <div class="portal-card-label" style="margin-bottom:12px">Progressao de Carga por Exercicio</div>
    ${topEx.map(ex=>{
      const col=ex.delta>=0?'#10b981':'#ef4444';
      const W=280,H=40,pad=4;
      const lo=Math.min(...ex.sets.map(s=>s.load)),hi=Math.max(...ex.sets.map(s=>s.load));
      const r=hi-lo||1;
      const xs=ex.sets.map((_,i)=>pad+(i/(ex.sets.length-1))*(W-pad*2));
      const ys=ex.sets.map(s=>H-pad-((s.load-lo)/r)*(H-pad*2));
      const path=xs.map((x,i)=>`${i===0?'M':'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
      const area=`${path} L${xs[xs.length-1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;
      return `<div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:0.8rem;font-weight:700">${ex.name}</span>
          <span style="font-size:0.85rem;font-weight:800;color:${col}">${ex.delta>=0?'+':''}${ex.delta.toFixed(1)}kg (${ex.delta>=0?'+':''}${ex.pct}%)</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:40px">
          <defs><linearGradient id="sg${ex.name.replace(/\W/g,'')}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${col}" stop-opacity="0.2"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="${area}" fill="url(#sg${ex.name.replace(/\W/g,'')})"/>
          <path d="${path}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round"/>
          ${xs.map((x,i)=>`<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.5" fill="${col}"/>`).join('')}
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--portal-text-muted)">
          <span>${safeFormatDate(ex.first.date)}: ${ex.first.load}kg</span>
          <span>${safeFormatDate(ex.last.date)}: ${ex.last.load}kg</span>
        </div>
      </div>`;
    }).join('')}
  </div>` : '';

  // Group workouts by base name for comparative chart
  const getBaseWorkoutName = name => {
    if (!name) return 'Treino Avulso';
    return name.replace(/\s*—\s*Sem\s*\d+/i, '').replace(/\s*-\s*Semana\s*\d+/i, '').replace(/\s*Sem\s*\d+/i, '').trim();
  };

  const workoutsByName = {};
  completed.forEach(s => {
    if (!s.workoutName) return;
    const base = getBaseWorkoutName(s.workoutName);
    if (!workoutsByName[base]) workoutsByName[base] = [];
    workoutsByName[base].push(s);
  });
  const comparableBases = Object.keys(workoutsByName).filter(base => workoutsByName[base].length >= 2);

  let compareSessionsHtml = '';
  if (comparableBases.length > 0) {
    compareSessionsHtml = `
      <div class="glass-card" style="margin-bottom:12px">
        <div class="portal-card-label">📈 Comparativo de Sessões Idênticas</div>
        <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Compare a evolução de Volume total e PSE para o mesmo treino ao longo das semanas.</p>
        <select id="portalCompareWorkoutSel" class="portal-textarea" style="margin-bottom:12px;padding:8px">
          ${comparableBases.map((base, idx) => `<option value="${base}" ${idx===0?'selected':''}>${base}</option>`).join('')}
        </select>
        <div style="height:200px;position:relative"><canvas id="portalCompareChart"></canvas></div>
      </div>
    `;
  }

  return `<div class="portal-section" id="portalRelatoriosSection">
    <h2 class="portal-section-title">Relatorios</h2>

    <div class="glass-card" style="margin-bottom:12px;padding:12px">
      <div class="portal-card-label" style="margin-bottom:6px">Filtro de Macrociclo</div>
      <select id="portalReportMacroFilter" class="portal-textarea" style="padding:8px;font-size:0.85rem">
        <option value="all" ${selectedMacroId==='all'?'selected':''}>Todos os macrociclos</option>
        ${macrocycles.map(m => `<option value="${m.id}" ${selectedMacroId===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select>
    </div>

    <div class="portal-stats-row" style="grid-template-columns:repeat(2,1fr)">
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:var(--portal-primary)">${completed.length}</div><div class="portal-stat-lbl">Sessoes</div></div>
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:var(--portal-accent)">${avgPse}</div><div class="portal-stat-lbl">PSE Medio</div></div>
    </div>
    <div class="portal-stats-row" style="grid-template-columns:repeat(2,1fr)">
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:#10b981;font-size:1.1rem">${(totalVol/1000).toFixed(1)}t</div><div class="portal-stat-lbl">Volume Total</div></div>
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:#f59e0b;font-size:1.1rem">${avgDurMin}min</div><div class="portal-stat-lbl">Duracao Media</div></div>
    </div>
    <div class="portal-stats-row" style="grid-template-columns:repeat(2,1fr)">
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:#6366f1;font-size:1.1rem">${avgVolPerSess.toLocaleString('pt-BR')}kg</div><div class="portal-stat-lbl">Vol/Sessao</div></div>
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:#06b6d4;font-size:1.1rem">${sessionsMonth}</div><div class="portal-stat-lbl">Treinos/mes</div></div>
    </div>

    ${caloricHtml}

    <div class="glass-card portal-feed-card" style="margin-bottom:12px">
      <div class="portal-card-label">Resumo do seu Desempenho</div>
      <p style="font-size:0.82rem;line-height:1.7;color:var(--portal-text-secondary);margin-top:8px">${feedTxt}</p>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Evolucao do Bem-estar</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Sono (roxo) &middot; TQR (verde) &middot; Estresse (amarelo)</p>
      <div style="height:200px;position:relative"><canvas id="portalWellnessChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">PSE por Sessao</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Zona ideal: 6-8. Acima de 8 por 3+ sessoes = atencao a fadiga.</p>
      <div style="height:180px;position:relative"><canvas id="portalPseChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Volume por Sessao (kg)</div>
      <div style="height:180px;position:relative"><canvas id="portalVolChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Carga de Treino Semanal (PSE x min)</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Aumentos graduais de ~10%/semana sao ideais.</p>
      <div style="height:180px;position:relative"><canvas id="portalLoadChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Gasto Calorico nas Sessoes (kcal)</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Estimativa com MET de musculacao x peso x duracao.</p>
      <div style="height:180px;position:relative"><canvas id="portalKcalChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Densidade de Treino (kg/min)</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Volume levantado por minuto de treino.</p>
      <div style="height:180px;position:relative"><canvas id="portalDensityChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Frequencia Semanal (ultimas 8 semanas)</div>
      <div style="height:160px;position:relative"><canvas id="portalFreqChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Radar de Wellness</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Media dos ultimos 5 check-ins. Quanto maior, melhor.</p>
      <div style="height:220px;position:relative"><canvas id="portalRadarChart"></canvas></div>
    </div>

    ${compareSessionsHtml}

    ${compAss.length>=2?`<div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Evolucao da Composicao Corporal</div>
      <div style="height:200px;position:relative"><canvas id="portalMeasuresChart"></canvas></div>
    </div>`:''}

    ${exHtml}

    ${completed.length===0?`<div class="portal-empty">Realize sessoes de treino para ver os graficos de evolucao.</div>`:''}
  </div>`;
}

// -- INIT RELATORIOS (Chart.js) --------------------------------
function initRelatorios(student, sessions, assessments, biofeedbacks, macrocycles = []) {
  const selectedMacroId = portalState.selectedReportMacroId || 'all';
  let completed = sessions.filter(s => s.status === 'completed').sort((a,b) => new Date(a.date)-new Date(b.date));
  const compAss = assessments.filter(a => a.type === 'composicao').sort((a,b) => new Date(a.date)-new Date(b.date));
  let bf = [...biofeedbacks].sort((a,b) => new Date(a.date)-new Date(b.date));

  if (selectedMacroId !== 'all') {
    const macro = macrocycles.find(m => m.id === selectedMacroId);
    if (macro) {
      completed = completed.filter(s => s.macrocycleId === macro.id || (s.date >= macro.startDate && s.date <= macro.endDate));
      bf = bf.filter(b => b.date >= macro.startDate && b.date <= macro.endDate);
    }
  }

  const fmtDate = d => {
    try { return new Date(d.includes('T')?d:d+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); }
    catch { return d||''; }
  };

  const co = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:'#94a3b8', font:{size:10} } } },
    scales:{
      x:{ ticks:{color:'#64748b',font:{size:9},maxRotation:45}, grid:{color:'rgba(255,255,255,0.04)'} },
      y:{ ticks:{color:'#94a3b8',font:{size:9}}, grid:{color:'rgba(255,255,255,0.04)'} }
    }
  };

  // Group workouts by base name for comparative chart
  const getBaseWorkoutName = name => {
    if (!name) return 'Treino Avulso';
    return name.replace(/\s*—\s*Sem\s*\d+/i, '').replace(/\s*-\s*Semana\s*\d+/i, '').replace(/\s*Sem\s*\d+/i, '').trim();
  };

  const workoutsByName = {};
  completed.forEach(s => {
    if (!s.workoutName) return;
    const base = getBaseWorkoutName(s.workoutName);
    if (!workoutsByName[base]) workoutsByName[base] = [];
    workoutsByName[base].push(s);
  });
  const comparableBases = Object.keys(workoutsByName).filter(base => workoutsByName[base].length >= 2);

  const drawAll = () => {
    // Wellness
    const wCtx = document.getElementById('portalWellnessChart');
    if (wCtx && bf.length>=2) {
      new Chart(wCtx, { type:'line', data:{ labels:bf.map(b=>fmtDate(b.date)), datasets:[
        {label:'Sono', data:bf.map(b=>b.sleep||null), borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.08)', tension:0.3, fill:true, pointRadius:3},
        {label:'TQR',  data:bf.map(b=>b.tqr||null),   borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.08)',  tension:0.3, fill:true, pointRadius:3},
        {label:'Estresse', data:bf.map(b=>b.stress||null), borderColor:'#f59e0b', borderDash:[5,3], tension:0.3, fill:false, pointRadius:3},
      ]}, options:{...co, scales:{...co.scales, y:{...co.scales.y,min:0,max:10}}} });
    }

    // PSE per session
    const pseCtx = document.getElementById('portalPseChart');
    if (pseCtx && completed.length>=2) {
      new Chart(pseCtx, { type:'line', data:{ labels:completed.map(s=>fmtDate(s.date)), datasets:[
        {label:'PSE', data:completed.map(s=>s.postBiofeedback?.pse||null), borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.15)', fill:true, tension:0.3, pointRadius:4, pointBackgroundColor:'#ef4444'}
      ]}, options:{...co, plugins:{legend:{display:false}}, scales:{...co.scales, y:{...co.scales.y,min:0,max:10}}} });
    }

    // Volume
    const volCtx = document.getElementById('portalVolChart');
    if (volCtx && completed.length>=2) {
      const recent=completed.slice(-12);
      new Chart(volCtx, { type:'bar', data:{ labels:recent.map(s=>fmtDate(s.date)), datasets:[
        {label:'Volume (kg)', data:recent.map(s=>Math.round((s.setLog||[]).reduce((t,x)=>t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0))),
          backgroundColor:'rgba(99,102,241,0.6)', borderColor:'#6366f1', borderWidth:1, borderRadius:4}
      ]}, options:{...co, plugins:{legend:{display:false}}} });
    }

    // Weekly load
    const loadCtx = document.getElementById('portalLoadChart');
    if (loadCtx && completed.length>=2) {
      const wc={};
      completed.forEach(s=>{
        const d=new Date(s.date.includes('T')?s.date:s.date+'T12:00');
        const mon=new Date(d); mon.setDate(d.getDate()-d.getDay()+1);
        const key=mon.toISOString().split('T')[0];
        wc[key]=(wc[key]||0)+(s.postBiofeedback?.pse||5)*(s.durationMin||0);
      });
      const wKeys=Object.keys(wc).sort().slice(-8);
      new Chart(loadCtx, { type:'bar', data:{ labels:wKeys.map(k=>fmtDate(k)), datasets:[
        {label:'Carga', data:wKeys.map(k=>wc[k]), backgroundColor:'rgba(16,185,129,0.5)', borderColor:'#10b981', borderWidth:1, borderRadius:4}
      ]}, options:{...co, plugins:{legend:{display:false}}} });
    }

    // Kcal
    const peso = compAss[compAss.length-1]?.peso || student?.weight || 70;
    const kcalCtx = document.getElementById('portalKcalChart');
    if (kcalCtx && completed.length>=2) {
      const recent=completed.slice(-12);
      new Chart(kcalCtx, { type:'bar', data:{ labels:recent.map(s=>fmtDate(s.date)), datasets:[
        {label:'Kcal', data:recent.map(s=>s.durationMin?Math.round(Calc.caloriasAtividade(peso,s.durationMin,'musculacao')):null),
          backgroundColor:'rgba(249,115,22,0.6)', borderColor:'#f97316', borderWidth:1, borderRadius:4}
      ]}, options:{...co, plugins:{legend:{display:false}}} });
    }

    // Density
    const denCtx = document.getElementById('portalDensityChart');
    if (denCtx && completed.length>=2) {
      const recent=completed.slice(-12);
      new Chart(denCtx, { type:'line', data:{ labels:recent.map(s=>fmtDate(s.date)), datasets:[
        {label:'kg/min', data:recent.map(s=>{
          const vol=(s.setLog||[]).reduce((t,x)=>t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0);
          return s.durationMin>0?parseFloat((vol/s.durationMin).toFixed(1)):null;
        }), borderColor:'#06b6d4', backgroundColor:'rgba(6,182,212,0.1)', fill:true, tension:0.3, pointRadius:3}
      ]}, options:{...co, plugins:{legend:{display:false}}} });
    }

    // Frequency
    const freqCtx = document.getElementById('portalFreqChart');
    if (freqCtx && completed.length>=1) {
      const fc={};
      completed.forEach(s=>{
        const d=new Date(s.date.includes('T')?s.date:s.date+'T12:00');
        const mon=new Date(d); mon.setDate(d.getDate()-d.getDay()+1);
        const key=mon.toISOString().split('T')[0];
        fc[key]=(fc[key]||0)+1;
      });
      const fKeys=Object.keys(fc).sort().slice(-8);
      new Chart(freqCtx, { type:'bar', data:{ labels:fKeys.map(k=>fmtDate(k)), datasets:[
        {label:'Sessoes', data:fKeys.map(k=>fc[k]), backgroundColor:'rgba(6,182,212,0.5)', borderColor:'#06b6d4', borderWidth:1, borderRadius:4}
      ]}, options:{...co, plugins:{legend:{display:false}}, scales:{...co.scales, y:{...co.scales.y,min:0,ticks:{stepSize:1,color:'#94a3b8',font:{size:9}}}}} });
    }

    // Radar
    const radCtx = document.getElementById('portalRadarChart');
    if (radCtx && bf.length>=1) {
      const r5=bf.slice(-5);
      const avg=arr=>arr.length?parseFloat((arr.reduce((t,v)=>t+v,0)/arr.length).toFixed(1)):0;
      new Chart(radCtx, { type:'radar', data:{ labels:['Sono','TQR','Motivacao','Alimentacao','Anti-Estresse'],
        datasets:[{ label:'Wellness', data:[
          avg(r5.map(b=>b.sleep||0)), avg(r5.map(b=>b.tqr||0)),
          avg(r5.map(b=>b.motivation||0)), avg(r5.map(b=>b.food||0)),
          avg(r5.map(b=>10-(b.stress||5))),
        ], backgroundColor:'rgba(16,185,129,0.15)', borderColor:'#10b981', pointBackgroundColor:'#10b981' }]
      }, options:{ responsive:true, maintainAspectRatio:false,
        scales:{r:{min:0,max:10,ticks:{stepSize:2,color:'#64748b',font:{size:9},backdropColor:'transparent'},grid:{color:'rgba(255,255,255,0.08)'},angleLines:{color:'rgba(255,255,255,0.08)'},pointLabels:{color:'#94a3b8',font:{size:10}}}},
        plugins:{legend:{display:false}}
      }});
    }

    // Identical Sessions comparison
    const compSel = document.getElementById('portalCompareWorkoutSel');
    const compCtx = document.getElementById('portalCompareChart');
    let compareChart = null;

    const drawCompareChart = () => {
      if (!compCtx || !compSel) return;
      const base = compSel.value;
      const sessList = (workoutsByName[base] || []).sort((a,b) => new Date(a.date) - new Date(b.date));

      if (compareChart) compareChart.destroy();
      
      const labels = sessList.map(s => {
        const dStr = fmtDate(s.date);
        const wkMatch = s.workoutName?.match(/Sem\s*(\d+)/i);
        return wkMatch ? `Sem ${wkMatch[1]} (${dStr})` : dStr;
      });

      compareChart = new Chart(compCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Volume Total (kg)',
              data: sessList.map(s => (s.setLog||[]).reduce((t,x)=>t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0)),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.05)',
              tension: 0.3,
              yAxisID: 'y',
              fill: true,
              pointRadius: 4
            },
            {
              label: 'PSE (Borg)',
              data: sessList.map(s => s.postBiofeedback?.pse || null),
              borderColor: '#ef4444',
              tension: 0.3,
              yAxisID: 'y1',
              borderDash: [5, 3],
              pointRadius: 4
            }
          ]
        },
        options: {
          ...co,
          scales: {
            x: co.scales.x,
            y: {
              position: 'left',
              title: { display: true, text: 'Volume (kg)', color: '#94a3b8', font: {size: 9} },
              ticks: { color: '#6366f1', font: {size: 9} },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y1: {
              position: 'right',
              title: { display: true, text: 'PSE', color: '#94a3b8', font: {size: 9} },
              ticks: { color: '#ef4444', font: {size: 9}, min: 0, max: 10 },
              grid: { display: false }
            }
          }
        }
      });
    };

    if (compSel) {
      compSel.addEventListener('change', drawCompareChart);
      drawCompareChart();
    }

    // Body composition
    const measCtx = document.getElementById('portalMeasuresChart');
    if (measCtx && compAss.length>=2) {
      const ds=[];
      if (compAss.some(a=>a.peso)) ds.push({label:'Peso (kg)', data:compAss.map(a=>a.peso||null), borderColor:'#10b981', tension:0.3, yAxisID:'y'});
      if (compAss.some(a=>a.percentualGordura)) ds.push({label:'BF %', data:compAss.map(a=>a.percentualGordura||null), borderColor:'#f59e0b', tension:0.3, yAxisID:'y1'});
      if (ds.length) new Chart(measCtx, { type:'line', data:{ labels:compAss.map(a=>fmtDate(a.date)), datasets:ds },
        options:{ responsive:true, maintainAspectRatio:false,
          plugins:{legend:{labels:{color:'#94a3b8',font:{size:10}}}},
          scales:{y:{position:'left',ticks:{color:'#10b981',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'}},y1:{position:'right',ticks:{color:'#f59e0b',font:{size:9}},grid:{display:false}},x:{ticks:{color:'#64748b',font:{size:9}},grid:{display:false}}}
        }});
    }
  };

  // Bind change on macro filter to reload section
  document.getElementById('portalReportMacroFilter')?.addEventListener('change', async (e) => {
    portalState.selectedReportMacroId = e.target.value;
    await loadSection('relatorios');
  });

  if (window.Chart) {
    drawAll();
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = drawAll;
    document.head.appendChild(s);
  }
}

// (end of student-portal.js)
