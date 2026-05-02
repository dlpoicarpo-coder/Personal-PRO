// ========================================
// PERSONAL PRO — App Shell & Router (v3)
// ========================================
import db from './db.js';
import { renderSidebar, initSidebar } from './components/sidebar.js';
import { initNotifications } from './components/notifications.js';
import { renderDashboard, initDashboardCharts } from './pages/dashboard.js';
import { renderStudents, initStudents } from './pages/students.js';
import { renderWorkouts, initWorkouts } from './pages/workouts.js';
import { renderAssessments, initAssessments } from './pages/assessments.js';
import { renderBiofeedback, initBiofeedback } from './pages/biofeedback.js';
import { renderReports, initReports } from './pages/reports.js';
import { renderSettings, initSettings } from './pages/settings.js';
import { renderTracker, initTracker } from './pages/live-tracker.js';
import { renderPeriodization, initPeriodization } from './pages/periodization.js';
import { renderWeeklySummary, initWeeklySummary } from './pages/weekly-summary.js';
import { renderFinancial, initFinancial } from './pages/financial.js';
import { renderExercisesLibrary, initExercisesLibrary } from './pages/exercises-library.js';
import { renderCalendar, initCalendar } from './pages/calendar.js';
import { renderCardio, initCardio } from './pages/cardio.js';
import { renderPreForm, initPreForm, renderPostForm, initPostForm } from './pages/student-forms.js';
import { renderLogin, initLogin, isAuthenticated, logout } from './pages/login.js';
import { DEFAULT_EXERCISES } from './utils/exercises-db.js';
import { notify } from './components/toast.js';
import { Calc } from './utils/calculations.js';

class App {
  constructor() {
    this.currentPath = '/';
    this.init();
  }

  async init() {
    await db.ready();
    await this.seedData();
    await initNotifications();

    // Check auth - skip for student form routes
    const hash = window.location.hash.replace('#', '') || '/';
    const isFormRoute = hash.startsWith('/form/');
    if (!isFormRoute) {
      const authed = await isAuthenticated();
      if (!authed) {
        this.showLogin();
        return;
      }
    }

    this.render();
    window.addEventListener('hashchange', () => this.onRouteChange());
    this.onRouteChange();
  }

  showLogin() {
    const app = document.getElementById('app');
    app.innerHTML = renderLogin();
    initLogin(() => {
      this.render();
      window.addEventListener('hashchange', () => this.onRouteChange());
      this.onRouteChange();
    });
  }

  async seedData() {
    const exCount = await db.count('exercises');
    if (exCount === 0) { for (const ex of DEFAULT_EXERCISES) await db.add('exercises', { ...ex }); }
    const stCount = await db.count('students');
    if (stCount === 0) await this.seedDemoData();
    const settings = await db.get('settings', 'trainer');
    if (settings?.trainerName) setTimeout(() => { const el = document.getElementById('trainerName'); if (el) el.textContent = settings.trainerName; }, 100);
  }

  async seedDemoData() {
    const students = [
      { code: 'IRI-001', name: 'Iris Mendes da Silva', gender: 'F', birthDate: '1990-03-15', age: 36, goal: 'Condicionamento', status: 'Ativo', phone: '(11) 99999-0001', expectedSessions: 12 },
      { code: 'EMI-002', name: 'Emilson Ferreira dos Santos', gender: 'M', birthDate: '1985-07-22', age: 40, goal: 'Hipertrofia', status: 'Ativo', phone: '(11) 99999-0002', expectedSessions: 16 },
      { code: 'NOR-003', name: 'Norma Sueli Rodrigues', gender: 'F', birthDate: '1968-11-10', age: 57, goal: 'Saúde', status: 'Ativo', phone: '(11) 99999-0003', expectedSessions: 12 },
      { code: 'NEI-004', name: 'Neide Aparecida Costa', gender: 'F', birthDate: '1975-05-30', age: 51, goal: 'Hipertrofia', status: 'Ativo', phone: '(11) 99999-0004', expectedSessions: 12 },
      { code: 'VIT-005', name: 'Vitor Hugo Nascimento', gender: 'M', birthDate: '1998-01-18', age: 28, goal: 'Performance', status: 'Inativo', phone: '(11) 99999-0005', expectedSessions: 16 },
      { code: 'AMÉ-006', name: 'Amélia Rodrigues de Freitas Amorim', gender: 'F', birthDate: '1960-09-05', age: 65, goal: 'Saúde', status: 'Ativo', phone: '(11) 99999-0006', expectedSessions: 8 },
      { code: 'ERI-007', name: 'Erick Oliveira Lima', gender: 'M', birthDate: '1995-12-03', age: 30, goal: 'Hipertrofia', status: 'Ativo', phone: '(11) 99999-0007', expectedSessions: 20 },
    ];
    const saved = [];
    for (const s of students) saved.push(await db.add('students', s));

    const demoWorkouts = [
      { studentIdx: 0, name: 'Treino A - Superior', date: '2026-04-13', cycle: 'Ciclo 2', exercises: [
        { name: 'Supino Reto com Barra', sets: 4, reps: '10', load: '30', rest: '90', method: '' },
        { name: 'Puxada Frontal', sets: 4, reps: '10', load: '35', rest: '90', method: '' },
        { name: 'Desenvolvimento com Halteres', sets: 3, reps: '12', load: '8', rest: '60', method: '' },
        { name: 'Rosca Direta com Barra', sets: 3, reps: '12', load: '15', rest: '60', method: '' },
        { name: 'Tríceps Pulley', sets: 3, reps: '12', load: '20', rest: '60', method: '' },
      ]},
      { studentIdx: 0, name: 'Treino B - Inferior', date: '2026-04-15', cycle: 'Ciclo 2', exercises: [
        { name: 'Agachamento Livre com Barra', sets: 4, reps: '10', load: '40', rest: '120', method: '' },
        { name: 'Leg Press 45°', sets: 4, reps: '12', load: '100', rest: '90', method: '' },
        { name: 'Cadeira Extensora', sets: 3, reps: '12', load: '30', rest: '60', method: '' },
        { name: 'Mesa Flexora', sets: 3, reps: '12', load: '25', rest: '60', method: '' },
        { name: 'Panturrilha em Pé na Máquina', sets: 4, reps: '15', load: '40', rest: '45', method: '' },
      ]},
      { studentIdx: 1, name: 'Treino A - Peito/Tríceps', date: '2026-04-14', cycle: 'Ciclo 1 - Hipertrofia', exercises: [
        { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', load: '60', rest: '120', method: '' },
        { name: 'Supino Inclinado com Halteres', sets: 4, reps: '10', load: '22', rest: '90', method: '' },
        { name: 'Cross Over', sets: 3, reps: '12', load: '15', rest: '60', method: 'Drop set' },
        { name: 'Tríceps Testa', sets: 3, reps: '10', load: '20', rest: '60', method: '' },
        { name: 'Tríceps Corda', sets: 3, reps: '12', load: '18', rest: '60', method: '' },
      ]},
      { studentIdx: 1, name: 'Treino B - Costas/Bíceps', date: '2026-04-16', cycle: 'Ciclo 1 - Hipertrofia', exercises: [
        { name: 'Puxada Frontal', sets: 4, reps: '10', load: '50', rest: '90', method: '' },
        { name: 'Remada Curvada com Barra', sets: 4, reps: '8', load: '50', rest: '120', method: '' },
        { name: 'Remada Unilateral com Halter', sets: 3, reps: '10', load: '22', rest: '60', method: '' },
        { name: 'Rosca Alternada com Halteres', sets: 3, reps: '10', load: '14', rest: '60', method: '' },
        { name: 'Rosca Martelo', sets: 3, reps: '12', load: '12', rest: '60', method: '' },
      ]},
      { studentIdx: 6, name: 'Treino A - Push', date: '2026-04-18', cycle: 'Ciclo 1', exercises: [
        { name: 'Supino Reto com Barra', sets: 4, reps: '8', load: '70', rest: '120', method: '' },
        { name: 'Desenvolvimento com Barra', sets: 4, reps: '8', load: '40', rest: '90', method: '' },
        { name: 'Elevação Lateral', sets: 4, reps: '12', load: '10', rest: '60', method: '' },
        { name: 'Tríceps Pulley', sets: 3, reps: '12', load: '25', rest: '60', method: '' },
      ]},
      { studentIdx: 5, name: 'Treino A - Adaptação', date: '2026-04-17', cycle: 'Ciclo 1 - Adaptação', exercises: [
        { name: 'Leg Press 45°', sets: 3, reps: '15', load: '50', rest: '60', method: '' },
        { name: 'Cadeira Extensora', sets: 3, reps: '15', load: '15', rest: '60', method: '' },
        { name: 'Cadeira Flexora', sets: 3, reps: '15', load: '15', rest: '60', method: '' },
        { name: 'Supino na Máquina', sets: 3, reps: '15', load: '10', rest: '60', method: '' },
        { name: 'Puxada Frontal', sets: 3, reps: '15', load: '20', rest: '60', method: '' },
      ]},
    ];
    for (const w of demoWorkouts) await db.add('workouts', { ...w, studentId: saved[w.studentIdx].id });

    const demoAssessments = [
      { studentIdx: 1, type: 'composicao', date: '2026-03-10', peso: 82.5, altura: 178, genero: 'M', dobra1: 12, dobra2: 18, dobra3: 15, imc: 26.0, percentualGordura: 15.2, massaMagra: 69.9, massaGorda: 12.6, cintura: 88, quadril: 98, rcq: 0.90 },
      { studentIdx: 0, type: 'composicao', date: '2026-03-12', peso: 65.0, altura: 165, genero: 'F', dobra1: 16, dobra2: 14, dobra3: 22, imc: 23.9, percentualGordura: 24.1, massaMagra: 49.3, massaGorda: 15.7, cintura: 72, quadril: 96, rcq: 0.75 },
      { studentIdx: 1, type: 'conconi', date: '2026-03-15', fcPico: 185, vma: 14, limiar2: 11, vo2max: 49.0 },
      { studentIdx: 1, type: 'forca', date: '2026-04-01', exercise: 'Supino Reto com Barra', carga: 80, reps: 6, rm1: 93 },
      { studentIdx: 6, type: 'forca', date: '2026-04-05', exercise: 'Agachamento Livre com Barra', carga: 100, reps: 5, rm1: 113 },
    ];
    for (const a of demoAssessments) await db.add('assessments', { ...a, studentId: saved[a.studentIdx].id });

    const demoBf = [
      { studentIdx: 1, date: '2026-04-20', sleep: 8, mood: 8, energy: 7, stress: 3, pain: 1, pse: 7, duration: 65, trainingLoad: 455 },
      { studentIdx: 1, date: '2026-04-22', sleep: 6, mood: 6, energy: 5, stress: 5, pain: 2, pse: 8, duration: 70, trainingLoad: 560 },
      { studentIdx: 0, date: '2026-04-21', sleep: 7, mood: 9, energy: 8, stress: 2, pain: 1, pse: 6, duration: 55, trainingLoad: 330 },
      { studentIdx: 6, date: '2026-04-23', sleep: 9, mood: 8, energy: 9, stress: 2, pain: 1, pse: 9, duration: 75, trainingLoad: 675 },
      { studentIdx: 5, date: '2026-04-24', sleep: 7, mood: 7, energy: 6, stress: 4, pain: 3, pse: 5, duration: 45, trainingLoad: 225 },
      { studentIdx: 0, date: '2026-04-24', sleep: 8, mood: 8, energy: 7, stress: 3, pain: 1, pse: 7, duration: 60, trainingLoad: 420 },
      { studentIdx: 1, date: '2026-04-24', sleep: 7, mood: 7, energy: 6, stress: 4, pain: 2, pse: 8, duration: 70, trainingLoad: 560 },
    ];
    for (const b of demoBf) await db.add('biofeedback', { ...b, studentId: saved[b.studentIdx].id });
    await db.put('settings', { key: 'trainer', trainerName: 'Personal PRO' });
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `${renderSidebar(this.currentPath)}<main class="main-content" id="pageContent"><div class="page-loading"><div class="spinner"></div><p class="text-muted">Carregando...</p></div></main>`;
    initSidebar();
  }

  async onRouteChange() {
    const hash = window.location.hash.replace('#', '') || '/';
    this.currentPath = hash;

    // Student form routes — render WITHOUT sidebar (full page form)
    const preMatch = hash.match(/^\/form\/pre\/(.+)$/);
    const postMatch = hash.match(/^\/form\/post\/(.+)$/);
    if (preMatch || postMatch) {
      const app = document.getElementById('app');
      if (preMatch) {
        app.innerHTML = `<main class="main-content" style="margin-left:0;padding:20px">${await renderPreForm(preMatch[1])}</main>`;
        initPreForm();
      } else {
        app.innerHTML = `<main class="main-content" style="margin-left:0;padding:20px">${await renderPostForm(postMatch[1])}</main>`;
        initPostForm();
      }
      return;
    }

    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${hash}`);
    });
    const content = document.getElementById('pageContent');
    if (!content) { this.render(); return this.onRouteChange(); }
    content.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

    try {
      let html = '';
      const nav = (path) => this.navigate(path);
      switch (hash) {
        case '/':
          html = await renderDashboard(); content.innerHTML = html;
          const wk = await db.getAll('workouts'); initDashboardCharts(wk); break;
        case '/alunos': html = await renderStudents(); content.innerHTML = html; initStudents(nav); break;
        case '/tracker': html = await renderTracker(); content.innerHTML = html; initTracker(nav); break;
        case '/agenda': html = await renderCalendar(); content.innerHTML = html; initCalendar(nav); break;
        case '/treinos': html = await renderWorkouts(); content.innerHTML = html; initWorkouts(nav); break;
        case '/periodizacao': html = await renderPeriodization(); content.innerHTML = html; initPeriodization(nav); break;
        case '/avaliacoes': html = await renderAssessments(); content.innerHTML = html; initAssessments(nav); break;
        case '/biofeedback': html = await renderBiofeedback(); content.innerHTML = html; initBiofeedback(nav); break;
        case '/semanal': html = await renderWeeklySummary(); content.innerHTML = html; initWeeklySummary(nav); break;
        case '/financeiro': html = await renderFinancial(); content.innerHTML = html; initFinancial(nav); break;
        case '/exercicios': html = await renderExercisesLibrary(); content.innerHTML = html; initExercisesLibrary(nav); break;
        case '/cardio': html = await renderCardio(); content.innerHTML = html; initCardio(nav); break;
        case '/relatorios': html = await renderReports(); content.innerHTML = html; initReports(nav); break;
        case '/config': html = await renderSettings(); content.innerHTML = html; initSettings(nav); break;
        default: content.innerHTML = '<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Página não encontrada</h3><p><a href="#/">Voltar ao Dashboard</a></p></div>';
      }
    } catch (err) {
      console.error('Routing error:', err);
      content.innerHTML = `<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Erro ao carregar página</h3><p>${err.message}</p></div>`;
    }
  }

  navigate(path) { window.location.hash = path; }
}

document.addEventListener('DOMContentLoaded', () => new App());
