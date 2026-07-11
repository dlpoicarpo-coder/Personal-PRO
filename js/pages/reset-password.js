import { getSupabase } from '../utils/auth.js';

export function renderResetPassword() {
  return `
    <div class="auth-container">
      <div class="auth-card fade-in">
        <div class="auth-logo">Personal<strong>PRO</strong></div>
        <h2 class="auth-title">Redefinir Senha</h2>
        <p class="auth-subtitle">Digite sua nova senha abaixo.</p>
        
        <form id="resetPasswordForm" autocomplete="off">
          <div class="form-group">
            <label class="form-label">Nova Senha</label>
            <input type="password" class="form-input" id="newPassword" required minlength="6" placeholder="Mínimo 6 caracteres" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Nova Senha</label>
            <input type="password" class="form-input" id="confirmPassword" required minlength="6" placeholder="Mínimo 6 caracteres" />
          </div>
          <div id="resetError" style="color:var(--danger);font-size:0.85rem;display:none;margin-bottom:1rem"></div>
          <div id="resetSuccess" style="color:var(--success);font-size:0.85rem;display:none;margin-bottom:1rem"></div>
          <button type="submit" class="btn btn-primary" style="width:100%" id="resetBtn">Salvar Nova Senha</button>
        </form>
        
        <div class="text-center mt-md">
          <a href="#/" class="auth-link">Voltar para o Início</a>
        </div>
      </div>
    </div>
  `;
}

export function initResetPassword() {
  const form = document.getElementById('resetPasswordForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorEl = document.getElementById('resetError');
    const successEl = document.getElementById('resetSuccess');
    const btn = document.getElementById('resetBtn');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (newPassword !== confirmPassword) {
      errorEl.textContent = 'As senhas não coincidem.';
      errorEl.style.display = 'block';
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      errorEl.textContent = 'Serviço indisponível no momento.';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
      const { data, error } = await sb.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      successEl.textContent = 'Senha alterada com sucesso! Redirecionando...';
      successEl.style.display = 'block';

      setTimeout(() => {
        window.location.hash = '/';
      }, 2000);

    } catch (err) {
      errorEl.textContent = err.message || 'Erro ao atualizar senha.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Salvar Nova Senha';
    }
  });
}
