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

import { renderAnamnesis, initAnamnesis, renderAnamneseForm, initAnamneseForm } from './pages/anamnesis.js';
import { renderTutorial, initTutorial } from './pages/tutorial.js';
import { renderStudentPortal, initStudentPortal } from './pages/student-portal.js';
import { renderPlans, initPlans } from './pages/plans.js';

// Global UI Helpers
window.getModalityBadge = function(modality) {
  if (!modality) return '';
  const iconStyle = 'display:inline-block;vertical-align:-1px;margin-right:4px;';
  if (modality === 'Presencial') {
    return `<span class="badge badge-primary" style="display:inline-flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${iconStyle}"><path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z"/><circle cx="12" cy="9" r="2.5"/></svg>Presencial</span>`;
  }
  if (modality === 'Consultoria Online') {
    return `<span class="badge badge-purple" style="display:inline-flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${iconStyle}"><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/></svg>Online</span>`;
  }
  if (modality === 'Híbrido') {
    return `<span class="badge badge-success" style="display:inline-flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="${iconStyle}"><path d="M17 2l4 4-4 4M3 12v-2a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 12v2a4 4 0 0 1-4 4H3"/></svg>Híbrido</span>`;
  }
  return '';
};

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
  '/config': { render: renderSettings, init: initSettings },
  '/planos': { render: renderPlans, init: initPlans }
};

export async function navigateTo(path) {
  const appContainer = document.getElementById('app');
  

  if (path.startsWith('/form/anamnese')) {
    appContainer.className = '';
    appContainer.innerHTML = await renderAnamneseForm();
    initAnamneseForm();
    return;
  }

  if (path.startsWith('/form/consentimento')) {
    appContainer.className = '';
    const { renderConsentForm, initConsentForm } = await import('./pages/consent-form.js');
    appContainer.innerHTML = await renderConsentForm();
    initConsentForm();
    return;
  }

  if (path.startsWith('/reset-password')) {
    appContainer.className = '';
    import('./pages/reset-password.js').then(({ renderResetPassword, initResetPassword }) => {
      appContainer.innerHTML = renderResetPassword();
      if(initResetPassword) initResetPassword();
    });
    return;
  }

  if (path === '/termos') {
    appContainer.className = '';
    import('./pages/termos.js').then(({ renderTermos }) => {
      appContainer.innerHTML = renderTermos();
    });
    return;
  }

  if (path === '/privacidade') {
    appContainer.className = '';
    import('./pages/privacidade.js').then(({ renderPrivacidade }) => {
      appContainer.innerHTML = renderPrivacidade();
    });
    return;
  }
  if (path.startsWith('access_token=') || path.startsWith('error=')) {
    if (path.includes('type=invite')) {
      setTimeout(() => window.location.hash = '/convite', 500);
    } else if (path.includes('type=recovery')) {
      appContainer.className = '';
      import('./pages/reset-password.js').then(({ renderResetPassword, initResetPassword }) => {
        appContainer.innerHTML = renderResetPassword();
        initResetPassword();
      });
      return;
    } else {
      setTimeout(() => window.location.hash = '/', 500);
    }
    appContainer.innerHTML = '<div class="page-loading"><div class="spinner"></div><p style="margin-top:20px;text-align:center;color:var(--text-muted)">Autenticando...</p></div>';
    return;
  }

  // Manage student portal stylesheet based on route
  const isPortalRoute = path.startsWith('/portal') || path.startsWith('/convite');
  if (isPortalRoute) {
    if (!document.getElementById('studentPortalStylesheet')) {
      const link = document.createElement('link');
      link.id = 'studentPortalStylesheet';
      link.rel = 'stylesheet';
      link.href = 'css/student-portal.css';
      document.head.appendChild(link);
    }
  } else {
    const link = document.getElementById('studentPortalStylesheet');
    if (link) link.remove();
  }

  if (path.startsWith('/convite')) {
    appContainer.className = '';
    const { renderInviteScreen, initInviteScreen } = await import('./pages/invite.js');
    appContainer.innerHTML = renderInviteScreen();
    initInviteScreen();
    return;
  }

  if (path.startsWith('/portal')) {
    let rawParam = path.split('/portal/')[1] || path.split('/portal')[1];
    if (rawParam && rawParam.startsWith('/')) rawParam = rawParam.substring(1);
    
    const loggedId = localStorage.getItem('portal_logged_student_id');
    
    // If no ID is provided in URL, try using the logged one
    if (!rawParam && loggedId) {
      rawParam = loggedId;
    }
    
    appContainer.className = '';
    appContainer.innerHTML = await renderStudentPortal(rawParam);
    initStudentPortal(rawParam);
    return;
  }

  // 1. Auth check
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    appContainer.innerHTML = renderLogin();
    initLogin(() => navigateTo('/'));
    return;
  }

  // 2. Role Guard Check
  const { getUserRole } = await import('./utils/role.js');
  const role = await getUserRole();
  if (role === 'student') {
    // If the student reaches here, it means they tried to access a trainer route
    // (since /portal returns early above). Redirect them forcibly.
    window.location.hash = '/portal';
    return;
  }

  if (role !== 'trainer') {
    console.error('[Guard] papel indeterminado, bloqueando');
    appContainer.innerHTML = renderLogin();
    initLogin(() => navigateTo('/'));
    return;
  }

  // Asynchronously seed templates once the trainer is authenticated
  import('./db.js').then(({ default: db }) => {
    db.seedTemplates().catch(console.error);

    // Billing Guard Check
    db.getSubscription().then(sub => {
      window._currentPlan = sub?.plan || 'Start';
      if (sub && (sub.status === 'past_due' || sub.status === 'canceled')) {
        // Verifica se o current_period_end já passou (prazo de carência)
        const isExpired = new Date(sub.current_period_end) < new Date();
        if (isExpired) {
          if (!document.getElementById('billingBanner')) {
            const banner = document.createElement('div');
            banner.id = 'billingBanner';
            banner.style = "background:var(--danger);color:white;text-align:center;padding:12px;font-weight:bold;z-index:9999;position:relative;";
            banner.innerHTML = `Sua assinatura está vencida ou o trial expirou (Plano ${sub.plan}). O sistema está operando em modo somente-leitura. <a href="#/planos" style="color:white;text-decoration:underline">Regularizar agora</a>`;
            appContainer.insertBefore(banner, appContainer.firstChild);
          }
          window._isBillingPastDue = true;
        } else {
          window._isBillingPastDue = false;
        }
      } else {
        window._isBillingPastDue = false;
        const banner = document.getElementById('billingBanner');
        if (banner) banner.remove();
      }
    });
  });
  
  // 2. Create layout if missing
  appContainer.className = 'app-layout';
  if (!document.querySelector('.sidebar')) {
    appContainer.innerHTML = `
      ${renderSidebar(path)}

      <!-- Mobile Topbar -->
      <div class="mobile-topbar" id="mobileTopbar">
        <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu" style="background:none;border:none;color:var(--text-primary);cursor:pointer;padding:6px;display:flex;align-items:center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span style="font-size:1rem;font-weight:700;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;flex:1">Vetor</span>
        <button id="mobileNotifBtn" aria-label="Notificações" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:6px;display:flex;align-items:center;position:relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
      </div>

      <!-- Sidebar overlay -->
      <div id="sidebarOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:299" onclick="document.getElementById('sidebar').classList.remove('mobile-open');this.style.display='none'"></div>

      <main class="main-content" id="pageContent">
        <div class="page-loading"><div class="spinner"></div></div>
      </main>

      <!-- Mobile Bottom Nav -->
      <nav id="mobileBottomNav" role="navigation" aria-label="Navegação mobile">
        <button class="mobile-nav-item" data-route="/" aria-label="Dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Início</span>
        </button>
        <button class="mobile-nav-item" data-route="/alunos" aria-label="Alunos">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Alunos</span>
        </button>
        <button class="mobile-nav-item mobile-nav-center" data-route="/tracker" aria-label="Treino ao Vivo">
          <div class="mobile-nav-fab">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span>Live</span>
        </button>
        <button class="mobile-nav-item" data-route="/agenda" aria-label="Agenda">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Agenda</span>
        </button>
        <button class="mobile-nav-item" data-route="/config" aria-label="Mais opções">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Mais</span>
        </button>
      </nav>
    `;
    initSidebar(navigateTo);
    import('./components/notifications.js').then(({ initNotifications }) => {
      initNotifications();
    });

    // Mobile menu button — open sidebar
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      sidebar?.classList.toggle('mobile-open');
      if (overlay) overlay.style.display = sidebar?.classList.contains('mobile-open') ? 'block' : 'none';
    });

    // Mobile bottom nav click routing
    document.querySelectorAll('#mobileBottomNav .mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        if (route) {
          window.location.hash = route;
        }
      });
    });
  }

  // Update mobile bottom nav active state
  document.querySelectorAll('#mobileBottomNav .mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === path);
  });

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
  // Apply saved theme — fallback to localStorage before session loads
  let savedTheme = localStorage.getItem('pp_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  import('./db.js').then(({ default: db }) => {
    // Override with source of truth
    db.getAll('settings').then(settingsList => {
      const settings = settingsList[0];
      const settingsTheme = settings && (settings.theme || (settings.data && settings.data.theme));
      if (settingsTheme && settingsTheme !== savedTheme) {
        savedTheme = settingsTheme;
        localStorage.setItem('pp_theme', savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    }).catch(() => {});

    db.seedTemplates().catch(console.error);

    // Database deduplication and methods repair
    setTimeout(async () => {
      const { getCurrentUser } = await import('./utils/auth.js');
      const user = await getCurrentUser();
      if (!user) return; // Executa apenas se houver sessão ativa

      if (localStorage.getItem('fixed_db_v8')) return;
      localStorage.setItem('fixed_db_v8', '1'); // Setado antes para evitar loops
      

      try {
        // Dedup exercises
        const exs = await db.getAll('exercises');
        const seen = new Map();
        for (const ex of exs) {
          const name = (ex.name || '').toLowerCase().trim();
          if (!name) continue;
          if (!seen.has(name)) { seen.set(name, ex); } else {
            const existing = seen.get(name);
            if (ex.is_default && !existing.is_default) {
              await db.delete('exercises', existing.id);
              seen.set(name, ex);
            } else if (!ex.is_default && existing.is_default) {
              await db.delete('exercises', ex.id);
            } else {
              await db.delete('exercises', ex.id);
            }
          }
        }

        // Dedup methods too
        const allMethods = await db.getAll('methods');
        const seenM = new Map();
        for (const m of allMethods) {
          const name = (m.name || '').toLowerCase().trim();
          if (!name) continue;
          if (!seenM.has(name)) { seenM.set(name, m); } else {
            await db.delete('methods', m.id);
          }
        }

        // Add missing methods
        const freshMethods = await db.getAll('methods');
        const defaultMethods = [
          { name: 'Drop-set', description: 'Executa até a falha, reduz carga ~20% e continua sem descanso', category: 'Hipertrofia', is_default: true, sets: '3', repsHint: 'Até a falha', restHint: '0s' },
          { name: 'Rest-Pause', description: 'Até a falha, pausa 15-20s, continua até nova falha', category: 'Hipertrofia', is_default: true, sets: '3', repsHint: 'Até a falha', restHint: '15s' },
          { name: 'Cluster', description: '2-3 reps, pausa 10-15s, repetir 5x. Força máxima.', category: 'Força', is_default: true, sets: '5', repsHint: '2-3', restHint: '10-15s' },
          { name: 'Bi-set', description: 'Dois exercícios seguidos sem descanso', category: 'Condicionamento', is_default: true, sets: '3-4', repsHint: '10-15', restHint: '60s' },
          { name: 'Tri-set', description: 'Três exercícios seguidos sem descanso', category: 'Condicionamento', is_default: true, sets: '3-4', repsHint: '10-15', restHint: '60-90s' },
          { name: 'Quad-set / Super-set', description: 'Quatro ou mais exercícios em sequência', category: 'Condicionamento', is_default: true, sets: '3-4', repsHint: '10-15', restHint: '60-90s' },
          { name: 'Pirâmide Crescente', description: 'Aumenta a carga e diminui repetições a cada série', category: 'Hipertrofia', is_default: true, sets: '4', repsHint: '15-12-10-8', restHint: '60-90s' },
          { name: 'Pirâmide Decrescente', description: 'Diminui a carga e aumenta repetições a cada série', category: 'Hipertrofia', is_default: true, sets: '4', repsHint: '8-10-12-15', restHint: '60-90s' },
          { name: 'FST-7', description: '7 séries do mesmo exercício no fim do treino com 30s de descanso', category: 'Hipertrofia', is_default: true, sets: '7', repsHint: '10-12', restHint: '30s' },
          { name: 'GVT (10x10)', description: '10 séries de 10 repetições com a mesma carga (60% 1RM)', category: 'Hipertrofia', is_default: true, sets: '10', repsHint: '10', restHint: '60s' },
          { name: 'SST (Sarcoplasma Stimulating)', description: 'Alta variação de estímulos (falha, rests curtos, isometria)', category: 'Hipertrofia Avançada', is_default: true, sets: '1', repsHint: 'Até falhar 3x', restHint: '15s' },
          { name: 'Método Búlgaro', description: 'Múltiplas sessões diárias, foco em 1RM (levantamento de peso)', category: 'Força', is_default: true, sets: '5-8', repsHint: '1-3', restHint: '120-180s' },
          { name: 'Ponto Zero', description: 'Isometria de 3-5s no ponto de maior tensão do movimento', category: 'Hipertrofia', is_default: true, sets: '3-4', repsHint: '8-12', restHint: '60s' },
          { name: 'Exaustão (Falha Concentrica)', description: 'Séries levadas até o limite da falha muscular concêntrica', category: 'Hipertrofia', is_default: true, sets: '3', repsHint: 'Falha', restHint: '90s' },
          { name: 'Heavy Duty', description: '1-2 séries até a falha total (incluindo forçadas/negativas)', category: 'Hipertrofia Avançada', is_default: true, sets: '1-2', repsHint: 'Falha', restHint: '120s' },
          { name: 'Agonista-Antagonista', description: 'Bi-set com músculos opostos (ex: Bíceps e Tríceps)', category: 'Hipertrofia', is_default: true, sets: '3-4', repsHint: '10-12', restHint: '60s' },
          { name: 'Pico de Contração', description: 'Segurar a contração máxima por 2s no final de cada repetição', category: 'Hipertrofia', is_default: true, sets: '3-4', repsHint: '10-12', restHint: '60s' },
          { name: 'Tensão Contínua', description: 'Movimento lento sem pausar nos pontos de descanso articular', category: 'Hipertrofia', is_default: true, sets: '3-4', repsHint: '12-15', restHint: '60s' },
          { name: 'Negativa Focada', description: 'Fase excêntrica controlada (4-6 segundos)', category: 'Força', is_default: true, sets: '3-4', repsHint: '6-8', restHint: '90s' },
          { name: 'Circuito', description: 'Passagem por vários exercícios com mínimo ou nenhum descanso', category: 'Condicionamento', is_default: true, sets: '3', repsHint: '15-20', restHint: '0s' },
          { name: 'Tabata (20/10)', description: '20s de esforço máximo, 10s de descanso, 8 rounds', category: 'Condicionamento', is_default: true, sets: '8', repsHint: 'Máximo', restHint: '10s' },
          { name: 'EMOM', description: 'Every Minute on the Minute: Realizar trabalho no inicio de cada minuto', category: 'Condicionamento', is_default: true, sets: '10', repsHint: 'Atingir meta', restHint: 'Restante' },
          { name: 'AMRAP', description: 'As Many Rounds/Reps As Possible no tempo estipulado', category: 'Condicionamento', is_default: true, sets: '1', repsHint: 'Máximo', restHint: 'N/A' },
          { name: 'Rest-Pause Estendido', description: 'Falha -> 15s -> Falha -> 15s -> Falha', category: 'Hipertrofia Avançada', is_default: true, sets: '3', repsHint: 'Falha', restHint: '15s' },
          { name: 'Myo-Reps', description: 'Série de ativação (12-15) + pequenas séries (3-5) com curtas pausas', category: 'Hipertrofia', is_default: true, sets: '1+4', repsHint: '15 + 3', restHint: '15s' },
          { name: 'Série 21', description: '7 reps parciais base, 7 parciais topo, 7 completas', category: 'Hipertrofia', is_default: true, sets: '3', repsHint: '21', restHint: '60s' },
          { name: 'Wave Loading', description: 'Ondulação de carga (ex: 3 reps Pesado, 1 rep Muito Pesado x3)', category: 'Força', is_default: true, sets: '6', repsHint: '3-1-3-1', restHint: '120s' },
          { name: 'Blood Flow Restriction (Kaatsu)', description: 'Treino com oclusão vascular parcial, altas repetições, baixa carga', category: 'Hipertrofia', is_default: true, sets: '4', repsHint: '30-15-15-15', restHint: '30s' },
          { name: 'Drop-set Duplo', description: 'Duas reduções de carga em seguida, até a falha', category: 'Hipertrofia', is_default: true, sets: '3', repsHint: 'Falha x3', restHint: '0s' },
          { name: 'Pré-Exaustão', description: 'Exercício isolador seguido imediatamente de um composto', category: 'Hipertrofia', is_default: true, sets: '3-4', repsHint: '12-15', restHint: '60s' },
          { name: 'Cardio Contínuo', description: 'Exercício cardiovascular mantendo a mesma intensidade', category: 'Condicionamento', is_default: true, sets: '1', repsHint: 'Tempo', restHint: '0s' },
          { name: 'Endurance (Resistência)', description: 'Foco na resistência muscular (cargas leves, altas repetições)', category: 'Resistência', is_default: true, sets: '3-4', repsHint: '15-20+', restHint: '30-45s' },
          { name: 'Pirâmide Completa', description: 'Sobe carga e desce rep, depois desce carga e sobe rep', category: 'Hipertrofia', is_default: true, sets: '6', repsHint: '12-10-8-8-10-12', restHint: '60-90s' },
          { name: 'Pirâmide', description: 'Variação de pirâmide com ajuste de carga por série', category: 'Hipertrofia', is_default: true, sets: '4', repsHint: '12-10-8-6', restHint: '60-90s' },
          { name: 'Unilateral', description: 'Executar o exercício de um lado de cada vez para correção de assimetrias e equilíbrio muscular', category: 'Geral', is_default: true, sets: '3-4', repsHint: '10-12', restHint: '60s' },
        ];
        for (const m of defaultMethods) {
          if (!freshMethods.find(x => x.name === m.name)) await db.add('methods', m);
        }
      } catch(e) { 
        console.error('DB repair error:', e); 
      } finally {
      }
    }, 2000);
  });
  
  const path = window.location.hash.slice(1) || '/';
  navigateTo(path);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
