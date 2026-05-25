import { renderSidebar, initSidebar } from './components/sidebar.js';
import { isAuthenticated, renderLogin, initLogin } from './pages/login.js';

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
  
  // ── FORM ROUTES (no auth required, no sidebar) ──
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
  if (path.startsWith('/form/anamnese')) {
    appContainer.className = '';
    appContainer.innerHTML = await renderAnamneseForm();
    initAnamneseForm();
    return;
  }

  // 1. Auth check
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    appContainer.innerHTML = renderLogin();
    initLogin(() => navigateTo('/'));
    return;
  }
  
  // 2. Create layout if missing
  appContainer.className = 'app-layout';
  if (!document.querySelector('.sidebar')) {
    appContainer.innerHTML = `
      ${renderSidebar(path)}
      <main class="main-content" id="pageContent">
        <div class="page-loading"><div class="spinner"></div></div>
      </main>
    `;
    initSidebar(navigateTo);
  }

  const content = document.getElementById('pageContent');
  
  // 3. Highlight active menu
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === '#' + path) a.classList.add('active');
  });

  // Update trainer name/avatar/role in sidebar
  import('./db.js').then(({ default: db }) => {
    db.get('settings', 'trainer').then(trainer => {
      if (trainer && trainer.trainerName) {
        const nameEl = document.getElementById('trainerName');
        const avatarEl = document.getElementById('trainerAvatar');
        if (nameEl) nameEl.textContent = trainer.trainerName;
        if (avatarEl) {
          const initials = trainer.trainerName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
          avatarEl.textContent = initials;
        }
      }
      
      // Apply Role UI dynamically
      import('./utils/roles.js').then(({ applyRoleUI }) => {
        applyRoleUI().catch(console.error);
      });
    });
  });

  // 4. Load page
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

// Handle hash changes — now includes /form/ routes
window.addEventListener('hashchange', () => {
  const path = window.location.hash.slice(1) || '/';
  navigateTo(path);
});

// Initialize app  
function initApp() {
  // Apply saved theme — default to light mode (item 16)
  const savedTheme = localStorage.getItem('pp_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  import('./db.js').then(({ default: db }) => {
    db.seedTemplates().catch(console.error);
  });
  
  const path = window.location.hash.slice(1) || '/';
  navigateTo(path);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
