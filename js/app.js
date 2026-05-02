// ========================================
// PERSONAL PRO — App Central (Motor Corrigido)
// ========================================
import { renderSidebar, initSidebar } from './components/sidebar.js';
import { isAuthenticated, renderLogin, initLogin } from './pages/login.js';

import { renderDashboard } from './pages/dashboard.js';
import { renderStudents, initStudents } from './pages/students.js';
import { renderWorkouts, initWorkouts } from './pages/workouts.js';
import { renderTracker, initTracker } from './pages/live-tracker.js';
import { renderReports, initReports } from './pages/reports.js';
import { renderCalendar, initCalendar } from './pages/calendar.js';
import { renderBiofeedback, initBiofeedback } from './pages/biofeedback.js';
import { renderFinancial, initFinancial } from './pages/financial.js';
import { renderAssessments, initAssessments } from './pages/assessments.js';
import { renderSettings, initSettings } from './pages/settings.js';

// Roteador Central (Agora fala a mesma língua que o Menu!)
const routes = {
  '/': { render: renderDashboard },
  '/alunos': { render: renderStudents, init: initStudents },
  '/treinos': { render: renderWorkouts, init: initWorkouts },
  '/tracker': { render: renderTracker, init: initTracker },
  '/relatorios': { render: renderReports, init: initReports },
  '/agenda': { render: renderCalendar, init: initCalendar },
  '/biofeedback': { render: renderBiofeedback, init: initBiofeedback },
  '/financeiro': { render: renderFinancial, init: initFinancial },
  '/avaliacoes': { render: renderAssessments, init: initAssessments },
  '/config': { render: renderSettings, init: initSettings }
};

export async function navigateTo(path) {
  const appContainer = document.getElementById('app');
  
  // 1. Verificação de Segurança (Login)
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    appContainer.innerHTML = renderLogin();
    initLogin(() => navigateTo('/'));
    return;
  }

  // 2. Cria a estrutura da página se não existir
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
  
  // 3. Ilumina o menu lateral correto
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === '#' + path) a.classList.add('active');
  });

  // 4. Carrega a Aba Solicitada
  const route = routes[path] || routes['/'];
  content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';
  
  try {
    content.innerHTML = await route.render();
    if (route.init) await route.init(navigateTo);
  } catch (err) {
    content.innerHTML = `<div class="card"><div class="text-danger">Página não encontrada ou em construção.</div></div>`;
  }
}

// Deteta quando clicas numa aba
window.addEventListener('hashchange', () => {
  const path = window.location.hash.slice(1) || '/';
  if (!path.startsWith('/form/')) {
    navigateTo(path);
  }
});

// Arranca a Máquina
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
