import { renderSidebar, initSidebar } from './components/sidebar.js';
import { renderDashboard, initDashboard } from './pages/dashboard.js';
import { renderStudents, initStudents } from './pages/students.js';
import { renderWorkouts, initWorkouts } from './pages/workouts.js';
import { renderTracker, initTracker } from './pages/live-tracker.js';
import { renderReports, initReports } from './pages/reports.js';
import { renderCalendar, initCalendar } from './pages/calendar.js';
import { renderBiofeedback, initBiofeedback } from './pages/biofeedback.js';
import { renderFinancial, initFinancial } from './pages/financial.js';
import { renderAssessments, initAssessments } from './pages/assessments.js';

// Central Router
const routes = {
  '/': { render: renderDashboard, init: initDashboard },
  '/students': { render: renderStudents, init: initStudents },
  '/workouts': { render: renderWorkouts, init: initWorkouts },
  '/tracker': { render: renderTracker, init: initTracker },
  '/reports': { render: renderReports, init: initReports },
  '/calendar': { render: renderCalendar, init: initCalendar },
  '/biofeedback': { render: renderBiofeedback, init: initBiofeedback },
  '/financial': { render: renderFinancial, init: initFinancial },
  '/assessments': { render: renderAssessments, init: initAssessments }
};

export async function navigateTo(path) {
  const appContainer = document.getElementById('app');
  
  // Create layout if missing
  if (!document.querySelector('.sidebar')) {
    appContainer.innerHTML = `
      ${renderSidebar()}
      <main class="main-content" id="pageContent">
        <div class="page-loading"><div class="spinner"></div></div>
      </main>
    `;
    initSidebar(navigateTo);
  }

  const content = document.getElementById('pageContent');
  
  // Highlight active menu
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === '#' + path) a.classList.add('active');
  });

  const route = routes[path] || routes['/'];
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  
  try {
    content.innerHTML = await route.render();
    if (route.init) await route.init(navigateTo);
  } catch (err) {
    content.innerHTML = `<div class="card"><div class="text-danger">Erro ao carregar página: ${err.message}</div></div>`;
  }
}

// Handle hash changes
window.addEventListener('hashchange', () => {
  const path = window.location.hash.slice(1) || '/';
  if (!path.startsWith('/form/')) {
    navigateTo(path);
  }
});

// Initialize app
function initApp() {
  const path = window.location.hash.slice(1) || '/';
  if (!path.startsWith('/form/')) {
    navigateTo(path);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
