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
import { renderStudentPortal, initStudentPortal } from './pages/student-portal.js';

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
  if (path.startsWith('/portal/')) {
    // Inject custom PWA Mobile student portal stylesheet
    if (!document.getElementById('studentPortalStylesheet')) {
      const link = document.createElement('link');
      link.id = 'studentPortalStylesheet';
      link.rel = 'stylesheet';
      link.href = 'css/student-portal.css';
      document.head.appendChild(link);
    }
    const rawParam = path.split('/portal/')[1];
    appContainer.className = '';
    appContainer.innerHTML = await renderStudentPortal(rawParam);
    initStudentPortal();
    return;
  } else {
    // Remove student portal stylesheet if on trainer routes
    const link = document.getElementById('studentPortalStylesheet');
    if (link) link.remove();
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
    import('./components/notifications.js').then(({ initNotifications }) => {
      initNotifications();
    });
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

    // Database deduplication and methods repair
    setTimeout(async () => {
      if (localStorage.getItem('fixed_db_v6')) return;
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
        ];
        for (const m of defaultMethods) {
          if (!freshMethods.find(x => x.name === m.name)) await db.add('methods', m);
        }
        localStorage.setItem('fixed_db_v6', '1');
        window.location.reload();
      } catch(e) { console.error('DB repair error:', e); }
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
