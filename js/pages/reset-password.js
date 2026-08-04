import { getSupabase } from '../utils/auth.js';

export function renderResetPassword() {
  return `
    <div class="login-page">
      <div class="login-card fade-in">
        <div class="login-header" style="display:flex; justify-content:center; align-items:center; margin-bottom:20px; font-size:1.8rem;">
          <div class="vetor-logo">
            <span class="vetor-name">Vetor</span>
            <i class="vetor-diamond"></i>
          </div>
        </div>
        
        <div class="login-body">
          <p style="text-align:center; color:var(--text-muted); margin-bottom: 20px; font-size: 0.9rem;">
            Digite sua nova senha abaixo.
          </p>
          <form id="resetPasswordForm" autocomplete="off">
            <div class="form-group">
              <label class="form-label">Nova Senha</label>
              <input type="password" class="form-input" id="newPassword" required minlength="8" placeholder="Mínimo 8 caracteres" />
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar Nova Senha</label>
              <input type="password" class="form-input" id="confirmPassword" required minlength="8" placeholder="Mínimo 8 caracteres" />
            </div>
            <p id="resetError" style="color:var(--danger);font-size:0.85rem;display:none;margin-bottom:1rem"></p>
            <p id="resetSuccess" style="color:var(--success);font-size:0.85rem;display:none;margin-bottom:1rem"></p>
            <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:16px" id="resetBtn">Salvar Nova Senha</button>
          </form>
          
          <div class="text-center mt-md">
            <a href="#/" style="color:var(--text-muted); text-decoration:none; font-size:0.85rem;">Voltar para o Início</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initResetPassword() {
  const form = document.getElementById('resetPasswordForm');
  if (!form) return;

  const errorEl = document.getElementById('resetError');
  const successEl = document.getElementById('resetSuccess');
  const btn = document.getElementById('resetBtn');

  // Trava o form enquanto validamos a sessão
  btn.disabled = true;
  btn.textContent = 'Verificando link...';

  const sb = getSupabase();
  if (sb) {
    let { data: { session } } = await sb.auth.getSession();
    
    // Tentar parse manual caso o Supabase não consiga ler devido ao hash routing
    if (!session) {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace(/^#\/?/, '').replace('?', '&'));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken && refreshToken) {
        const res = await sb.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        session = res.data?.session;
      }
    }

    if (!session) {
      errorEl.textContent = 'Link expirado ou inválido — solicite novo link.';
      errorEl.style.display = 'block';
      btn.textContent = 'Link Inválido';
      return;
    }
  }

  btn.disabled = false;
  btn.textContent = 'Salvar Nova Senha';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (newPassword.length < 8) {
      errorEl.textContent = 'A senha deve ter no mínimo 8 caracteres.';
      errorEl.style.display = 'block';
      return;
    }

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
