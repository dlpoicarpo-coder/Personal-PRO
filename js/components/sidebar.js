// ========================================
// PERSONAL PRO — Sidebar Component (v4)
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
        <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Minimizar menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
        </button>
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
              <span class="sidebar-user-role">Personal Trainer</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <!-- Sino de notificações -->
            <button id="notifBtn" title="Notificações" style="position:relative;background:none;border:none;cursor:pointer;color:var(--text-muted);padding:7px;border-radius:6px;transition:all 0.2s"
              onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.color='var(--text-primary)'"
              onmouseout="this.style.background='none';this.style.color='var(--text-muted)'">
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span id="notifBadge" style="display:none;position:absolute;top:2px;right:2px;background:var(--danger);color:white;font-size:0.55rem;font-weight:700;min-width:14px;height:14px;border-radius:7px;display:flex;align-items:center;justify-content:center;line-height:1;padding:0 3px"></span>
            </button>
            <!-- Logout -->
            <button id="logoutBtn" title="Sair do Sistema" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem; padding: 8px; opacity: 0.8; transition: all 0.2s; display: flex; align-items: center; border-radius: 6px;" onmouseover="this.style.opacity='1';this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.opacity='0.8';this.style.background='none'">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </div>
        <!-- Painel de notificações (dropdown) -->
        <div id="notifPanel" style="
          display:none;
          position:fixed;
          bottom:80px;
          left:16px;
          width:340px;
          max-height:520px;
          background:#1e293b;
          border:1px solid rgba(255,255,255,0.12);
          border-radius:12px;
          box-shadow:0 16px 48px rgba(0,0,0,0.5);
          z-index:9999;
          overflow:hidden;
          color:#f1f5f9;
        ">
          <div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between;background:#0f172a">
            <div style="display:flex;align-items:center;gap:8px">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span style="font-weight:700;font-size:0.95rem;color:#f1f5f9">Notificações</span>
            </div>
            <button id="closeNotifPanel" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.1rem;line-height:1;padding:2px 6px;border-radius:4px" 
              onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#f1f5f9'"
              onmouseout="this.style.background='none';this.style.color='#94a3b8'">✕</button>
          </div>
          <div id="notifPanelContent" style="overflow-y:auto;max-height:460px">
            <div style="padding:24px;text-align:center;color:#94a3b8;font-size:0.85rem">Carregando...</div>
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
    if (localStorage.getItem('pp_sidebar_collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('pp_sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
  }

  // ── SINO DE NOTIFICAÇÕES ──────────────────────────────────
  const notifBtn   = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  const closePanel = document.getElementById('closeNotifPanel');

  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isOpen = notifPanel.style.display !== 'none';
      notifPanel.style.display = isOpen ? 'none' : '';

      if (!isOpen) {
        // Carregar conteúdo do painel
        const contentEl = document.getElementById('notifPanelContent');
        if (contentEl) {
          try {
            const { renderNotificationsPanel, requestNotificationPermission } = await import('../utils/notifications-manager.js');
            await requestNotificationPermission();
            contentEl.innerHTML = await renderNotificationsPanel();

            // Handler: enviar lembrete WhatsApp
            contentEl.querySelectorAll('.send-reminder').forEach(btn => {
              btn.addEventListener('click', async () => {
                const { sendWorkoutReminder } = await import('../utils/notifications-manager.js');
                const db = (await import('../db.js')).default;
                const student  = await db.get('students', btn.dataset.studentId);
                const schedule = await db.get('schedules', btn.dataset.scheduleId);
                if (!student || !schedule) return;
                const wa = sendWorkoutReminder(student, schedule);
                if (wa) window.open(wa, '_blank');
                else {
                  const { notify } = await import('../components/toast.js');
                  notify.warning('Aluno sem telefone cadastrado.');
                }
              });
            });

            // Limpar badge após abrir
            const badge = document.getElementById('notifBadge');
            if (badge) badge.style.display = 'none';
            localStorage.setItem('pp_last_notif_check', new Date().toISOString());
          } catch (err) {
            console.error('Notif panel error:', err);
            document.getElementById('notifPanelContent').innerHTML =
              '<p class="text-sm text-muted" style="padding:16px">Erro ao carregar notificações.</p>';
          }
        }
      }
    });

    // Fechar painel
    closePanel?.addEventListener('click', () => { notifPanel.style.display = 'none'; });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
      if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
        notifPanel.style.display = 'none';
      }
    });
  }

  // LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm('Tem certeza que deseja sair do sistema?')) {
        try {
          const { getSupabase } = await import('../utils/auth.js');
          const sb = getSupabase();
          if (sb) await sb.auth.signOut();
        } catch(err) { console.warn('signOut error:', err); }
        localStorage.removeItem('pp_session');
        const baseUrl = window.location.href.split('#')[0];
        window.location.href = baseUrl + '#/';
        setTimeout(() => window.location.reload(), 100);
      }
    });
  }
}

export { MENU_ITEMS };
