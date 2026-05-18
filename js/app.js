import { renderSidebar, initSidebar } from './components/sidebar.js';
import { renderLogin, initLogin } from './pages/login.js';
import { isAuthenticated, getCurrentUser, onAuthChange, signOut } from './utils/auth.js';
import db from './db.js';

// Import Renders and Inits
import { renderDashboard, initDashboardCharts } from './pages/dashboard.js';
import { renderStudents, initStudents } from './pages/students.js';
import { renderWorkouts, initWorkouts } from './pages/workouts.js';
import { renderTracker, initTracker } from './pages/live-tracker.js';
import { renderReports, initReports } from './pages/reports.js';
import { renderCalendar, initCalendar, initAutoReminders, requestNotificationPermission } from './pages/calendar.js';
import { renderBiofeedback, initBiofeedback } from './pages/biofeedback.js';
import { renderFinancial, initFinancial } from './pages/financial.js';
import { renderAssessments, initAssessments } from './pages/assessments.js';
import { renderExercisesLibrary, initExercisesLibrary } from './pages/exercises-library.js';
import { renderPeriodization, initPeriodization } from './pages/periodization.js';
import { renderWeeklySummary, initWeeklySummary } from './pages/weekly-summary.js';
import { renderSettings, initSettings } from './pages/settings.js';
import { renderPreForm, initPreForm, renderPostForm, initPostForm } from './pages/student-forms.js';
import { renderAnamnesis, initAnamnesis, renderAnamneseForm, initAnamneseForm } from './pages/anamnesis.js';
import { renderTutorial, initTutorial } from './pages/tutorial.js';
import { renderAdmin, initAdmin } from './pages/admin.js';
import { isAdmin, applyRoleUI, clearRoleCache } from './utils/roles.js';

// Central Router
const routes = {
  '/': { render: renderDashboard, init: initDashboardCharts },
  '/alunos': { render: renderStudents, init: initStudents },
  '/tracker': { render: renderTracker, init: initTracker },
  '/agenda': { render: renderCalendar, init: initCalendar },
  '/treinos': { render: renderWorkouts, init: initWorkouts },
  '/periodizacao': { render: renderPeriodization, init: initPeriodization },
  '/avaliacoes': { render: renderAssessments, init: initAssessments },
  '/biofeedback': { render: renderBiofeedback, init: initBiofeedback },
  '/semanal': { render: renderWeeklySummary, init: initWeeklySummary },
  '/financeiro': { render: renderFinancial, init: initFinancial },
  '/exercicios': { render: renderExercisesLibrary, init: initExercisesLibrary },
  '/relatorios': { render: renderReports, init: initReports },
  '/anamnese': { render: renderAnamnesis, init: initAnamnesis },
  '/tutorial': { render: renderTutorial, init: initTutorial },
  '/config':   { render: renderSettings,  init: initSettings },
  '/admin':    { render: renderAdmin,     init: initAdmin },
};

export async function navigateTo(rawPath) {
  const appContainer = document.getElementById('app');

  // Separar path de query string
  const [path, qs] = rawPath.split('?');
  const params = new URLSearchParams(qs || '');

  // ── PUBLIC FORM ROUTES (no auth required) ──
  if (path.startsWith('/form/pre/')) {
    const studentId = path.replace('/form/pre/', '').split('?')[0];
    appContainer.className = 'form-public';
    appContainer.innerHTML = await renderPreForm(studentId);
    initPreForm();
    return;
  }
  if (path.startsWith('/form/post/')) {
    const sessionId = path.replace('/form/post/', '').split('?')[0];
    appContainer.className = 'form-public';
    appContainer.innerHTML = await renderPostForm(sessionId);
    initPostForm();
    return;
  }
  if (path === '/form/anamnese' || path.startsWith('/form/anamnese')) {
    const trainerId = params.get('trainer') || '';
    appContainer.className = 'form-public';
    appContainer.innerHTML = await renderAnamneseForm(trainerId);
    initAnamneseForm(trainerId);
    return;
  }

  // ── AUTH CHECK ──
  const auth = await isAuthenticated();
  if (!auth) {
    appContainer.className = '';
    appContainer.innerHTML = renderLogin();
    await initLogin(async (user) => {
      // After login: set user in db, seed, navigate
      db.setUser(user);
      await db.seedTemplates().catch(console.error);
      await navigateTo('/');
    });
    return;
  }

  // ── ENSURE SIDEBAR ──
  appContainer.className = 'app-layout';
  if (!document.querySelector('.sidebar')) {
    appContainer.innerHTML = `
      ${renderSidebar(path)}
      <main class="main-content" id="pageContent">
        <div class="page-loading"><div class="spinner"></div></div>
      </main>
    `;
    initSidebar(navigateTo);
    // Iniciar sistema de lembretes automáticos WhatsApp
    initAutoReminders();
    requestNotificationPermission();
    // Aplicar papel (admin/personal) na UI
    applyRoleUI().then(adminMode => {
      if (adminMode) {
        // Mostrar link admin na sidebar
        const adminLink = document.getElementById('nav-admin');
        if (adminLink) adminLink.style.display = '';
      }
    });
    // Bind logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await signOut();
      clearRoleCache();
      db.setUser(null);
      document.querySelector('.sidebar')?.remove();
      appContainer.className = '';
      await navigateTo('/login');
    });
  }

  // ── UPDATE SIDEBAR TRAINER INFO ──
  const user = await getCurrentUser();
  if (user) {
    db.setUser(user);
    const savedSettings = await db.get('settings', 'trainer').catch(() => null) || {};
    const trainerName = savedSettings.trainerName || user.user_metadata?.trainer_name || user.email;
    const nameEl = document.getElementById('trainerName');
    const avatarEl = document.getElementById('trainerAvatar');
    if (nameEl) nameEl.textContent = trainerName;
    if (avatarEl) {
      const initials = trainerName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      avatarEl.textContent = initials;
    }
    // Restore saved theme — busca do banco primeiro (persiste entre navegadores)
    const theme = savedSettings.theme || localStorage.getItem('pp_theme') || 'dark';
    localStorage.setItem('pp_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = theme;

    // Iniciar polling de notificações
    try {
      const { startNotificationPolling } = await import('./utils/notifications-manager.js');
      startNotificationPolling();
    } catch(e) { console.warn('Notification polling error:', e); }
  }

  // ── HIGHLIGHT ACTIVE MENU ──
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === '#' + path) a.classList.add('active');
  });

  // ── LOAD PAGE ──
  const content = document.getElementById('pageContent');
  const route = routes[path] || routes['/'];
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    content.innerHTML = await route.render();
    if (route.init) await route.init(navigateTo);
  } catch (err) {
    content.innerHTML = `<div class="card"><div class="text-danger">Erro ao carregar página: ${err.message}</div></div>`;
    console.error('Page load error:', err);
  }
}

// Hash navigation
window.addEventListener('hashchange', () => {
  // Preservar query string do hash: #/form/anamnese?trainer=xxx
  const full = window.location.hash.slice(1) || '/';
  navigateTo(full);
});

// Initialize app
async function initApp() {
  // Theme
  const savedTheme = localStorage.getItem('pp_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Handle Supabase auth redirect (email confirmation)
  const hash = window.location.hash;
  if (hash.includes('access_token') || hash.includes('type=signup')) {
    // Let login page handle the session from URL
    const appContainer = document.getElementById('app');
    appContainer.className = '';
    appContainer.innerHTML = renderLogin();
    await initLogin(async (user) => {
      db.setUser(user);
      await db.seedTemplates().catch(console.error);
      window.location.hash = '/';
      await navigateTo('/');
    });
    return;
  }

  // Listen for Supabase auth state changes (e.g., token refresh)
  onAuthChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      db.setUser(null);
      document.querySelector('.sidebar')?.remove();
      window.location.hash = '/';
      await navigateTo('/');
    } else if (event === 'SIGNED_IN' && session?.user) {
      db.setUser(session.user);
    }
  });

  // Seed on startup if authenticated
  const user = await getCurrentUser();
  if (user) {
    db.setUser(user);
    db.seedTemplates().catch(console.error);
  }

  const path = window.location.hash.slice(1) || '/';
  navigateTo(path);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ── PWA INSTALL PROMPT ─────────────────────────────────────
let _pwaPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _pwaPrompt = e;
  if (localStorage.getItem('pp_pwa_dismissed')) return;
  setTimeout(() => { if (_pwaPrompt) showPWABanner(); }, 5000);
});

window.addEventListener('appinstalled', () => {
  _pwaPrompt = null;
  localStorage.setItem('pp_pwa_dismissed', '1');
  document.getElementById('pwaBanner')?.remove();
});

function showPWABanner() {
  if (document.getElementById('pwaBanner')) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isInStandalone) return; // já instalado

  const isMobile = window.innerWidth <= 768;

  const banner = document.createElement('div');
  banner.id = 'pwaBanner';

  const posStyle = isMobile
    ? 'left:12px;right:12px;bottom:76px;' // acima do bottom nav
    : 'right:24px;bottom:24px;max-width:340px;';

  banner.innerHTML = `
    <div id="pwaBannerInner" style="
      position:fixed;${posStyle}
      background:#1e293b;
      border:1px solid rgba(16,185,129,0.35);
      border-radius:14px;
      padding:16px 18px;
      box-shadow:0 12px 40px rgba(0,0,0,0.5);
      z-index:99999;
      color:#f1f5f9;
      animation:pwaSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
    ">
      <style>
        @keyframes pwaSlideUp {
          from { transform:translateY(30px); opacity:0 }
          to   { transform:translateY(0);    opacity:1 }
        }
      </style>

      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="width:42px;height:42px;background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(16,185,129,0.3)">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:0.93rem;margin-bottom:3px">Instalar Personal PRO</div>
          <div style="font-size:0.76rem;color:#94a3b8;line-height:1.45">
            ${isIOS
              ? 'Toque em <strong style="color:#f1f5f9">Compartilhar</strong> → <strong style="color:#f1f5f9">Adicionar à Tela Inicial</strong> para instalar.'
              : 'Acesse como app nativo — mais rápido, sem abrir o navegador.'}
          </div>
        </div>
        <button id="pwaDismiss" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:1rem;padding:2px;line-height:1;flex-shrink:0" title="Fechar">✕</button>
      </div>

      ${!isIOS ? `
      <div style="display:flex;gap:8px;margin-top:14px">
        <button id="pwaInstall" style="
          flex:1;padding:10px;
          background:linear-gradient(135deg,#10b981,#06b6d4);
          color:white;border:none;border-radius:8px;
          font-weight:700;font-size:0.85rem;cursor:pointer;
          box-shadow:0 4px 12px rgba(16,185,129,0.3)">
          ⬇ Instalar App
        </button>
        <button id="pwaDismiss2" style="
          padding:10px 14px;
          background:rgba(255,255,255,0.07);
          color:#94a3b8;border:1px solid rgba(255,255,255,0.08);
          border-radius:8px;font-size:0.82rem;cursor:pointer">
          Depois
        </button>
      </div>` : `
      <div style="margin-top:12px;padding:8px 10px;background:rgba(16,185,129,0.08);border-radius:8px;font-size:0.74rem;color:#94a3b8;line-height:1.5">
        Safari → <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Compartilhar → Adicionar à Tela Inicial
      </div>`}
    </div>
  `;

  document.body.appendChild(banner);

  // Instalar (Android/Chrome)
  document.getElementById('pwaInstall')?.addEventListener('click', async () => {
    if (!_pwaPrompt) return;
    _pwaPrompt.prompt();
    const { outcome } = await _pwaPrompt.userChoice;
    _pwaPrompt = null;
    banner.remove();
    if (outcome === 'accepted') {
      localStorage.setItem('pp_pwa_dismissed', '1');
      notify('App instalado com sucesso!', 'success');
    }
  });

  const dismiss = () => {
    localStorage.setItem('pp_pwa_dismissed', '1');
    banner.remove();
  };
  document.getElementById('pwaDismiss')?.addEventListener('click', dismiss);
  document.getElementById('pwaDismiss2')?.addEventListener('click', dismiss);

  // Auto-fechar depois de 20s
  setTimeout(() => { banner.remove(); }, 20000);
}

// Fallback: mostrar popup iOS mesmo sem beforeinstallprompt
window.addEventListener('load', () => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const dismissed = localStorage.getItem('pp_pwa_dismissed');
  if (isIOS && !isInStandalone && !dismissed) {
    setTimeout(() => showPWABanner(), 6000);
  }
});

// Helper toast simples para notificação de instalação
function notify(msg, type = 'info') {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:20px;right:20px;padding:12px 20px;background:${type==='success'?'#10b981':'#3b82f6'};color:white;border-radius:8px;font-size:0.85rem;font-weight:600;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.3);animation:pwaSlideUp 0.3s ease`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
