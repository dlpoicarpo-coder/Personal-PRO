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
import { renderCalendar, initCalendar } from './pages/calendar.js';
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
  '/config': { render: renderSettings, init: initSettings }
};

export async function navigateTo(path) {
  const appContainer = document.getElementById('app');

  // ── PUBLIC FORM ROUTES (no auth required) ──
  if (path.startsWith('/form/pre/')) {
    const studentId = path.split('/form/pre/')[1];
    appContainer.className = '';
    appContainer.innerHTML = await renderPreForm(studentId);
    initPreForm();
    return;
  }
  if (path.startsWith('/form/post/')) {
    const sessionId = path.split('/form/post/')[1];
    appContainer.className = '';
    appContainer.innerHTML = await renderPostForm(sessionId);
    initPostForm();
    return;
  }
  if (path === '/form/anamnese') {
    appContainer.className = '';
    appContainer.innerHTML = await renderAnamneseForm();
    initAnamneseForm();
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
    // Bind logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await signOut();
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
    const trainerName = user.user_metadata?.trainer_name || user.email;
    const nameEl = document.getElementById('trainerName');
    const avatarEl = document.getElementById('trainerAvatar');
    if (nameEl) nameEl.textContent = trainerName;
    if (avatarEl) {
      const initials = trainerName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      avatarEl.textContent = initials;
    }
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
  const path = window.location.hash.slice(1) || '/';
  navigateTo(path);
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
