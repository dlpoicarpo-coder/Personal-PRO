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
    case 'home': content.innerHTML = renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments, biofeedbacks); break;
    case 'treinar': content.innerHTML = renderTreinar(workouts, schedules); initTreinar(workouts, schedules, student); break;
    case 'sessoes': content.innerHTML = renderSessoes(sessions, schedules); break;
    case 'bio': content.innerHTML = renderBio(biofeedbacks, sid, tid); initBio(); break;
    case 'relatorios': content.innerHTML = await renderRelatorios(student, sessions, assessments, biofeedbacks); initRelatorios(); break;
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

  // Macrociclo progress
  let macroProgress = 0;
  if (currentMacro?.startDate && currentMacro?.endDate) {
    const total = new Date(currentMacro.endDate) - new Date(currentMacro.startDate);
    const elapsed = now - new Date(currentMacro.startDate);
    macroProgress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
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
          <div class="portal-macro-pct">${macroProgress}% concluído</div>
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
          <label class="portal-bio-label">PSE geral (1-10) <span id="soloPseVal">5</span></label>
          <input type="range" id="soloPse" min="1" max="10" value="5" class="portal-range" oninput="document.getElementById('soloPseVal').textContent=this.value">
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
      updateUI();
      if (restRemaining <= 0) {
        clearInterval(restTimer);
        overlay.style.display = 'none';
        playBeep(660, 0.2, 3);
      }
    }, 1000);
  }

  function stopRestTimer() {
    if (restTimer) clearInterval(restTimer);
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
          <div class="portal-section-sub" style="margin-bottom:8px">Exercícios</div>
          ${w.exercises.map((ex,i) => `
            <div class="glass-card" style="padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px">
              <div class="portal-ex-num">${i+1}</div>
              <div>
                <div class="portal-ex-name" style="font-size:0.85rem">${ex.name}</div>
                <div class="portal-ex-detail">${ex.sets||3}×${ex.reps||'10-12'}${ex.rest?` · ${ex.rest}s descanso`:''}</div>
              </div>
            </div>
          `).join('')}`;
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
            ${ex.videoUrl?`<a href="${ex.videoUrl}" target="_blank" class="portal-ex-video"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Vídeo</a>`:''}
          </div>
          ${ex.description||ex.notes?`<div class="portal-ex-desc">${ex.description||ex.notes}</div>`:''}
          ${Array.from({length: parseInt(ex.sets)||3}, (_, si) => `
            <div class="portal-solo-set-row" id="setrow_${ei}_${si}">
              <span class="portal-set-num">S${si+1}</span>
              <input type="number" placeholder="Reps" class="portal-solo-input" id="sr_${ei}_${si}_reps" min="0">
              <input type="number" placeholder="kg" class="portal-solo-input" id="sr_${ei}_${si}_load" min="0" step="0.5">
              <input type="number" placeholder="PSE" class="portal-solo-input portal-solo-pse" id="sr_${ei}_${si}_pse" min="1" max="10">
              <input type="number" placeholder="RIR" class="portal-solo-input portal-solo-pse" id="sr_${ei}_${si}_rir" min="0" max="10">
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
            <input type="number" placeholder="PSE" class="portal-solo-input portal-solo-pse" id="fex_${ei}_pse" min="1" max="10">
            <input type="number" placeholder="RIR" class="portal-solo-input portal-solo-pse" id="fex_${ei}_rir" min="0" max="10">
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
  }

  // Main timer
  function startMainTimer() {
    soloStartTime = new Date();
    soloTimerInterval = setInterval(() => {
      const elapsed = Math.floor((new Date() - soloStartTime) / 1000);
      const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
      const el = document.getElementById('liveTotal');
      const ew = document.getElementById('liveWork');
      const er = document.getElementById('liveRest');
      if (el) el.textContent = fmt(elapsed);
      if (ew) ew.textContent = fmt(workSeconds);
      const rd = Math.max(0, elapsed - workSeconds);
      if (er) er.textContent = fmt(rd);
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
          if (reps || load) {
            setLog.push({ exerciseIdx: ei, exerciseName: ex.name, setIdx: si,
              reps: parseInt(reps)||0, load: parseFloat(load)||0,
              pse: psei ? parseInt(psei) : null,
              rir: rir !== '' && rir != null ? parseInt(rir) : null,
              notes: exNotes });
          }
        }
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
            <div class="portal-session-date">${new Date(s.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}</div>
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
                <div class="portal-session-meta">${s.date?new Date(s.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'}):''}</div>
              </div>
              <span class="portal-checkout-badge">Checkout</span>
            </div>
            <div class="portal-checkout-form" id="chkform_${s.id}" style="display:none">
              <div class="portal-bio-field" style="margin-top:12px">
                <label class="portal-bio-label">PSE pós-treino <span id="chkpse_lbl_${s.id}">5</span>/10</label>
                <input type="range" min="1" max="10" value="5" class="portal-range" id="chkpse_${s.id}" oninput="document.getElementById('chkpse_lbl_${s.id}').textContent=this.value">
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
                  <div class="portal-session-meta">${s.date?new Date(s.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'}):''}</div>
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
                    const key = x.exerciseName || `ex_${x.exerciseIdx ?? 0}`;
                    if (!seen[key]) { seen[key] = groups.length; groups.push({ name: x.exerciseName || 'Exercício', sets: [] }); }
                    groups[seen[key]].sets.push(x);
                  });
                  return groups.map(g => `
                    <div class="portal-ex-group">
                      <div class="portal-ex-group-name">${g.name}</div>
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
            <label class="portal-bio-label">Recuperação (TQR) <span id="tqrVal">5</span>/10</label>
            <input type="range" name="tqr" min="0" max="10" value="5" class="portal-range" oninput="document.getElementById('tqrVal').textContent=this.value">
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
            <div class="portal-bio-row">
              ${b.sleep!=null?`<span>💤 Sono: ${b.sleep}</span>`:''}
              ${b.tqr!=null?`<span>⚡ TQR: ${b.tqr}</span>`:''}
              ${b.food!=null?`<span>🍎 Alim: ${b.food}/5</span>`:''}
              ${b.stress!=null?`<span>😰 Stress: ${b.stress}</span>`:''}
              ${b.pain!=null?`<span>🩹 Dor: ${b.pain}</span>`:''}
              ${b.motivation!=null?`<span>🔥 Mot: ${b.motivation}</span>`:''}
              ${b.pse!=null?`<span class="pse-badge">PSE ${b.pse}</span>`:''}
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

  // Volume total (carga × reps)
  const totalVol = completed.reduce((t, s) => {
    return t + (s.setLog||[]).reduce((tt,x) => tt+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0);
  }, 0);

  // Density: volume / session count
  const density = completed.length > 0 ? (totalVol / completed.length).toFixed(0) : '—';

  // Exercise evolution (top exercise with most data)
  const exMap = {};
  completed.forEach(s => {
    (s.setLog||[]).forEach(x => {
      if (!x.exerciseName) return;
      if (!exMap[x.exerciseName]) exMap[x.exerciseName] = [];
      exMap[x.exerciseName].push({ date: s.date, load: parseFloat(x.load)||0, reps: parseFloat(x.reps)||0 });
    });
  });
  const topEx = Object.entries(exMap).sort((a,b) => b[1].length-a[1].length).slice(0,3);

  // Caloric
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
              <div class="portal-caloric-lbl">TMB</div>
            </div>
            <div class="portal-caloric-item" style="color:var(--portal-primary)">
              <div class="portal-caloric-val">${tdee.valor}</div>
              <div class="portal-caloric-lbl">TDEE</div>
            </div>
            <div class="portal-caloric-item" style="color:var(--portal-accent)">
              <div class="portal-caloric-val">${meta.kcal}</div>
              <div class="portal-caloric-lbl">Meta</div>
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
            <div style="font-size:1.3rem;font-weight:700;color:${dpeso<0?'var(--portal-success)':dpeso>0?'var(--portal-danger)':'var(--portal-text-secondary)'}">${dpeso>0?'+':''}${dpeso}kg</div>
            <div class="portal-caloric-lbl">Peso</div>
          </div>`:''}
          ${dgord!=null?`<div class="portal-evol-item">
            <div style="font-size:1.3rem;font-weight:700;color:${dgord<0?'var(--portal-success)':'var(--portal-danger)'}">${dgord>0?'+':''}${dgord}%</div>
            <div class="portal-caloric-lbl">% Gordura</div>
          </div>`:''}
          ${dmass!=null?`<div class="portal-evol-item">
            <div style="font-size:1.3rem;font-weight:700;color:${dmass>0?'var(--portal-success)':'var(--portal-danger)'}">${dmass>0?'+':''}${dmass}kg</div>
            <div class="portal-caloric-lbl">Massa Magra</div>
          </div>`:''}
        </div>
        <div style="font-size:0.7rem;color:var(--portal-text-muted);margin-top:6px">${new Date(first.date).toLocaleDateString('pt-BR')} → ${new Date(last.date).toLocaleDateString('pt-BR')}</div>
      </div>`;
  }

  // Exercise evolution cards
  let exEvolCards = '';
  if (topEx.length > 0) {
    exEvolCards = `
      <div class="portal-section-sub" style="margin-top:8px">Evolução por Exercício</div>
      ${topEx.map(([name, entries]) => {
        const sorted = entries.sort((a,b) => new Date(a.date)-new Date(b.date));
        const first = sorted[0], last = sorted[sorted.length-1];
        const diff = last.load - first.load;
        const sparkData = sorted.map(e => e.load);
        return `
          <div class="glass-card portal-ex-evol-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div class="portal-ex-evol-name">${name}</div>
              <div style="font-size:1.3rem;font-weight:800;color:${diff>=0?'var(--portal-success)':'var(--portal-danger)'}">${diff>=0?'+':''}${diff.toFixed(1)}kg</div>
            </div>
            ${svgSparkline(sparkData, diff>=0?'#10b981':'#ef4444')}
            <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--portal-text-muted);margin-top:4px">
              <span>${new Date(first.date+'T12:00').toLocaleDateString('pt-BR',{day:'numeric',month:'short'})}: ${first.load}kg</span>
              <span>${new Date(last.date+'T12:00').toLocaleDateString('pt-BR',{day:'numeric',month:'short'})}: ${last.load}kg</span>
            </div>
          </div>`;
      }).join('')}`;
  }

  // PSE trend chart
  const pseData = completed.slice(0,12).reverse().map(s => s.postBiofeedback?.pse || 0).filter(v => v > 0);
  const pseChart = pseData.length >= 2 ? `
    <div class="glass-card">
      <div class="portal-card-label">📈 Tendência PSE (últimas sessões)</div>
      ${svgLineChart(pseData, '#f59e0b', 1, 10, ['1','5','10'])}
    </div>` : '';

  // Volume trend chart
  const volData = completed.slice(0,10).reverse().map(s =>
    Math.round((s.setLog||[]).reduce((t,x) => t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0)/100)*100
  ).filter(v => v > 0);
  const volChart = volData.length >= 2 ? `
    <div class="glass-card">
      <div class="portal-card-label">🏋️ Volume por Sessão (kg)</div>
      ${svgBarChart(volData, '#6366f1')}
    </div>` : '';

  // Weight trend chart from assessments
  const weightData = compAss.map(a => ({ date: a.date, v: parseFloat(a.peso)||0 })).filter(d => d.v > 0);
  const weightChart = weightData.length >= 2 ? `
    <div class="glass-card">
      <div class="portal-card-label">⚖️ Evolução do Peso (kg)</div>
      ${svgLineChart(weightData.map(d=>d.v), '#06b6d4', Math.min(...weightData.map(d=>d.v))-2, Math.max(...weightData.map(d=>d.v))+2)}
      <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--portal-text-muted);margin-top:2px">
        <span>${new Date(weightData[0].date).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})}</span>
        <span>${new Date(weightData[weightData.length-1].date).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})}</span>
      </div>
    </div>` : '';

  // Motivational feed
  const feedMessages = [
    { icon: '🏆', msg: `${completed.length} sessões concluídas! Continue assim!` },
    { icon: '🔥', msg: `PSE médio ${avgPse} — você está trabalhando no limite certo!` },
    { icon: '📈', msg: `Volume total acumulado: ${(totalVol/1000).toFixed(1)}t levantadas!` },
    { icon: '⚡', msg: `Densidade média por sessão: ${density}kg de volume!` },
    { icon: '💪', msg: `${sessionsMonth} treinos só este mês. Incrível!` },
  ].filter(f => !f.msg.includes('undefined') && !f.msg.includes('NaN') && !f.msg.includes('—'));

  const feed = feedMessages.length > 0 ? `
    <div class="portal-section-sub" style="margin-top:8px">💬 Feed do Treinador</div>
    <div class="portal-feed-card glass-card">
      ${feedMessages.map(f => `
        <div class="portal-feed-item">
          <span class="portal-feed-icon">${f.icon}</span>
          <span class="portal-feed-msg">${f.msg}</span>
        </div>
      `).join('')}
    </div>` : '';

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Relatórios</h2>

      <div class="portal-stats-row">
        <div class="portal-stat-card glass-card">
          <div class="portal-stat-val" style="color:var(--portal-primary)">${sessionsMonth}</div>
          <div class="portal-stat-lbl">Treinos/mês</div>
        </div>
        <div class="portal-stat-card glass-card">
          <div class="portal-stat-val" style="color:var(--portal-accent)">${avgPse}</div>
          <div class="portal-stat-lbl">PSE médio</div>
        </div>
      </div>

      <div class="portal-stats-row">
        <div class="portal-stat-card glass-card">
          <div class="portal-stat-val" style="color:#10b981;font-size:1.1rem">${(totalVol/1000).toFixed(1)}t</div>
          <div class="portal-stat-lbl">Volume total</div>
        </div>
        <div class="portal-stat-card glass-card">
          <div class="portal-stat-val" style="color:#f59e0b;font-size:1.1rem">${density}</div>
          <div class="portal-stat-lbl">Vol/sessão (kg)</div>
        </div>
      </div>

      ${pseChart}
      ${volChart}
      ${caloricCard}
      ${weightChart}
      ${evolCard}
      ${exEvolCards}
      ${feed}

      ${compAss.length === 0 && completed.length === 0 ? `<div class="portal-empty">Peça ao seu treinador para registrar suas avaliações e realize sessões para ver os gráficos de evolução.</div>` : ''}
    </div>`;
}

// ── SVG CHART HELPERS ──────────────────────────────────────────
function svgLineChart(data, color = '#10b981', min = null, max = null, yLabels = []) {
  if (!data || data.length < 2) return '';
  const W = 300, H = 80, pad = 6;
  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const range = hi - lo || 1;
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (W - pad * 2));
  const ys = data.map(v => H - pad - ((v - lo) / range) * (H - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${path} L${xs[xs.length-1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;
  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:80px;overflow:visible">
      <defs>
        <linearGradient id="lg_${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#lg_${color.replace('#','')})" />
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${xs.map((x,i) => `<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3" fill="${color}"/>`)}
      ${[data[0], data[data.length-1]].map((v,i) => {
        const xi = i === 0 ? xs[0] : xs[xs.length-1];
        const yi = i === 0 ? ys[0] : ys[ys.length-1];
        return `<text x="${xi.toFixed(1)}" y="${(yi-6).toFixed(1)}" text-anchor="middle" font-size="9" fill="${color}" font-weight="700">${v}</text>`;
      }).join('')}
    </svg>`;
}

function svgBarChart(data, color = '#6366f1') {
  if (!data || data.length < 2) return '';
  const W = 300, H = 70, pad = 4;
  const max = Math.max(...data) || 1;
  const barW = Math.max(4, (W - pad * 2) / data.length - 2);
  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:70px">
      ${data.map((v, i) => {
        const bh = Math.max(2, ((v / max) * (H - pad * 2)));
        const x = pad + i * ((W - pad * 2) / data.length) + 1;
        const y = H - pad - bh;
        return `
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${color}" opacity="${0.5 + 0.5*(v/max)}"/>
          ${v > 0 ? `<text x="${(x+barW/2).toFixed(1)}" y="${(y-2).toFixed(1)}" text-anchor="middle" font-size="8" fill="${color}" font-weight="700">${v>=1000?(v/1000).toFixed(1)+'k':v}</text>` : ''}`;
      }).join('')}
    </svg>`;
}

function svgSparkline(data, color = '#10b981') {
  if (!data || data.length < 2) return '';
  const W = 200, H = 36, pad = 4;
  const lo = Math.min(...data), hi = Math.max(...data);
  const range = hi - lo || 1;
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (W - pad * 2));
  const ys = data.map(v => H - pad - ((v - lo) / range) * (H - pad * 2));
  const path = xs.map((x,i) => `${i===0?'M':'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:36px"><path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>${xs.map((x,i) => `<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.5" fill="${color}"/>`)}</svg>`;
}

function initRelatorios() {}
