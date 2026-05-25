// ========================================
// PERSONAL PRO — Modal Component
// ========================================

let activeModal = null;

export function openModal(options = {}) {
  closeModal();
  const { title = '', content = '', size = 'md', onClose = null, actions = [], preventBackdropClose = false } = options;

  const sizeClass = { sm: 'modal-sm', md: 'modal-md', lg: 'modal-lg', xl: 'modal-xl' }[size] || 'modal-md';

  // Auto-generate IDs for actions that don't have one
  actions.forEach((a, i) => { if (!a.id) a.id = `modalAction_${i}_${Date.now()}`; });

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'activeModal';
  modal.innerHTML = `
    <div class="modal ${sizeClass} animate-slide-up">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="btn-ghost btn-icon modal-close" id="modalCloseBtn">✕</button>
      </div>
      <div class="modal-body" id="modalBody">${content}</div>
      ${actions.length ? `
        <div class="modal-footer">
          ${actions.map(a => `<button class="btn ${a.class || 'btn-secondary'}" id="${a.id}" ${a.disabled ? 'disabled' : ''}>${a.label}</button>`).join('')}
        </div>
      ` : ''}
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  activeModal = modal;

  // Animate in
  requestAnimationFrame(() => modal.classList.add('visible'));

  // Close handlers
  modal.querySelector('#modalCloseBtn').addEventListener('click', () => closeModal(onClose));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (preventBackdropClose) {
        const modalEl = modal.querySelector('.modal');
        if (modalEl) {
          modalEl.style.animation = 'none';
          void modalEl.offsetWidth; // Trigger reflow
          modalEl.style.animation = 'shake 0.4s ease';
        }
      } else {
        closeModal(onClose);
      }
    }
  });

  // Action handlers — bind ALL actions with onClick
  actions.forEach(a => {
    if (a.onClick) {
      const btn = modal.querySelector(`#${a.id}`);
      if (btn) btn.addEventListener('click', a.onClick);
    }
  });

  return modal;
}

export function closeModal(callback) {
  if (activeModal) {
    const modalToClose = activeModal;
    modalToClose.classList.remove('visible');
    activeModal = null;
    setTimeout(() => {
      if (modalToClose && modalToClose.parentNode) {
        modalToClose.remove();
      }
      document.body.style.overflow = '';
      if (callback) callback();
    }, 200);
  } else if (callback) {
    callback();
  }
}

export function getModalBody() {
  return document.getElementById('modalBody');
}

// Confirm dialog helper
export function confirm(message, title = 'Confirmar') {
  return new Promise((resolve) => {
    openModal({
      title,
      content: `<p style="color: var(--text-secondary); font-size: 0.95rem;">${message}</p>`,
      size: 'sm',
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', id: 'confirmNo', onClick: () => { closeModal(); resolve(false); } },
        { label: 'Confirmar', class: 'btn-primary', id: 'confirmYes', onClick: () => { closeModal(); resolve(true); } },
      ]
    });
  });
}
