// ========================================
// PERSONAL PRO — Sidebar Component (v3)
// ========================================
import { ICONS } from '../utils/icons.js';

const MENU_ITEMS = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/' },
  { id: 'students', icon: 'students', label: 'Alunos', path: '/alunos' },
  { id: 'tracker', icon: 'tracker', label: 'Treino ao Vivo', path: '/tracker', highlight: true },
  { id: 'calendar', icon: 'calendar', label: 'Agenda', path: '/agenda' },
  { id: 'workouts', icon: 'workouts', label: 'Treinos', path: '/treinos' },
  { id: 'periodization', icon: 'periodization', label: 'Periodização', path: '/periodizacao' },
  { id: 'assessments', icon: 'assessments', label: 'Avaliações', path: '/avaliacoes' },
  { id: 'biofeedback', icon: 'biofeedback', label: 'Biofeedback', path: '/biofeedback' },
  { id: 'weekly', icon: 'weekly', label: 'Resumo Semanal', path: '/semanal' },
  { id: 'financial', icon: 'financial', label: 'Financeiro', path: '/financeiro' },
  { id: 'exercises', icon: 'exercises', label: 'Exercícios', path: '/exercicios' },
  { id: 'reports', icon: 'reports', label: 'Relatórios', path: '/relatorios' },
  { id: 'settings', icon: 'settings', label: 'Configurações', path: '/config' },
];

export function renderSidebar(currentPath) {
  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-text">
            <span class="logo-title">Personal<strong class="logo-pro">PRO</strong></span>
            <span class="logo-subtitle">Sistema de Treinamento</span>
          </div>
        </div>
        <button class="sidebar-toggle btn-ghost btn-icon" id="sidebarToggle" title="Menu">
          ☰
        </button>
      </div>
      <nav class="sidebar-nav">
        ${MENU_ITEMS.map(item => `
          <a href="#${item.path}" 
             class="sidebar-link ${currentPath === item.path ? 'active' : ''} ${item.highlight ? 'sidebar-link-highlight' : ''}" 
             data-page="${item.id}"
             id="nav-${item.id}">
            <span class="sidebar-icon-svg">${ICONS[item.icon] || ''}</span>
            <span class="sidebar-label">${item.label}</span>
            ${item.highlight ? '<span class="live-dot"></span>' : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar avatar-sm" id="trainerAvatar">PP</div>
          <div class="sidebar-user-info">
            <span class="sidebar-user-name" id="trainerName">Personal PRO</span>
            <span class="sidebar-user-role">Trainer</span>
          </div>
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

export function initSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      sidebar.classList.toggle('mobile-open');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
    });
  }
}

export { MENU_ITEMS };
