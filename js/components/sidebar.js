// ========================================
// PERSONAL PRO — Sidebar Component (v4)
// ========================================
import { ICONS } from '../utils/icons.js';
import db from '../db.js';

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
  { id: 'anamnesis', icon: 'assessments', label: 'Anamnese', path: '/anamnese' },
  { id: 'tutorial', icon: 'weekly', label: 'Tutorial', path: '/tutorial' },
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
        <div style="display:flex; gap: 4px;">
          <button class="sidebar-collapse-btn" id="notificationBtn" title="Notificações" style="position:relative;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span id="notifBadge" style="position:absolute;top:-4px;right:-4px;background:var(--danger);color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:bold;display:none;align-items:center;justify-content:center;"></span>
          </button>
          <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Minimizar menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
          </button>
        </div>
      </div>
      <button class="sidebar-toggle btn-ghost btn-icon" id="sidebarToggle" title="Menu">☰</button>
      
      <nav class="sidebar-nav">
        ${MENU_ITEMS.map(item => `
          <a href="#${item.path}" 
             class="sidebar-link ${currentPath === item.path ? 'active' : ''} ${item.highlight ? 'sidebar-link-highlight' : ''}" 
             data-page="${item.id}"
             id="nav-${item.id}"
             title="${item.label}">
            <span class="sidebar-icon-svg">${ICONS[item.icon] || '•'}</span>
            <span class="sidebar-label">${item.label}</span>
            ${item.highlight ? '<span class="live-dot"></span>' : ''}
          </a>
        `).join('')}
      </nav>
      
      <div class="sidebar-footer">
        <div class="sidebar-user" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="avatar avatar-sm" id="trainerAvatar">PRO</div>
            <div class="sidebar-user-info">
              <span class="sidebar-user-name" id="trainerName">Treinador</span>
              <span class="sidebar-user-role" id="roleBadge">Personal Trainer</span>
            </div>
          </div>
          <button id="logoutBtn" title="Sair do Sistema" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem; padding: 8px; opacity: 0.8; transition: all 0.2s; display: flex; align-items: center; border-radius: 6px;" onmouseover="this.style.opacity='1';this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.opacity='0.8';this.style.background='none'">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
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
  const logoutBtn = document.getElementById('logoutBtn');
  const collapseBtn = document.getElementById('sidebarCollapseBtn');

  // Mobile toggle
  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
    });
  }

  // Desktop collapse/expand
  if (collapseBtn) {
    // Restore collapsed state
    if (localStorage.getItem('pp_sidebar_collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('pp_sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
  }

  // LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm('Tem certeza que deseja sair do sistema?')) {
        if (db.supabase) {
          await db.supabase.auth.signOut();
        }
        localStorage.removeItem('pp_session');
        const baseUrl = window.location.href.split('#')[0];
        window.location.href = baseUrl + '#/';
        setTimeout(() => window.location.reload(), 100);
      }
    });
  }
}

export { MENU_ITEMS };
