// ========================================
// PERSONAL PRO — Toast Notifications
// ========================================

let container = null;

function ensureContainer() {
  let c = document.getElementById('toastContainer');
  if (!c) {
    c = document.createElement('div');
    c.className = 'toast-container';
    c.id = 'toastContainer';
    document.body.appendChild(c);
  }
  return c;
}

export function toast(message, type = 'info', duration = 3500) {
  const c = ensureContainer();
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const el = document.createElement('div');
  el.className = `toast toast-${type} animate-slide-in`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  c.appendChild(el);
  setTimeout(() => {
    if (el && el.parentNode) {
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      setTimeout(() => { if (el && el.parentNode) el.remove(); }, 300);
    }
  }, duration);
}

export const notify = {
  success: (msg) => toast(msg, 'success'),
  error: (msg) => toast(msg, 'error'),
  warning: (msg) => toast(msg, 'warning'),
  info: (msg) => toast(msg, 'info'),
};
