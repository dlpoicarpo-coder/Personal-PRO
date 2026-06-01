// ========================================
// PERSONAL PRO — Login Page (v3)
// Supabase Auth: Email confirmation + multi-tenant
// ========================================
import { signIn, signUp, sendPasswordReset, getCurrentUser, getSupabase } from '../utils/auth.js';
import { notify } from '../components/toast.js';

export function renderLogin() {
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <h1 class="login-title">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="login-subtitle">Sistema de Treinamento</p>
        </div>

        <div class="login-tabs">
          <button class="login-tab active" id="tabLogin">Entrar</button>
          <button class="login-tab" id="tabSignup">Criar Conta</button>
        </div>

        <div class="login-body" id="loginBody">
          <!-- Login Form -->
          <div id="panelLogin">
            <div class="role-selector" style="display:flex;background:rgba(255,255,255,0.05);padding:4px;border-radius:8px;margin-bottom:20px;border:1px solid var(--border-color)">
              <button type="button" class="role-tab active" id="roleTrainer" style="flex:1;padding:8px 0;background:var(--primary);color:#fff;border:none;border-radius:6px;font-size:0.85rem;font-weight:700;cursor:pointer;transition:all 0.2s">Treinador</button>
              <button type="button" class="role-tab" id="roleStudent" style="flex:1;padding:8px 0;background:transparent;color:var(--text-muted);border:none;border-radius:6px;font-size:0.85rem;font-weight:700;cursor:pointer;transition:all 0.2s">Aluno</button>
            </div>
            <form id="loginForm" autocomplete="on">
              <div class="form-group">
                <label class="form-label">E-mail</label>
                <input class="form-input" name="email" type="email" autocomplete="email" required placeholder="seu@email.com" />
              </div>
              <div class="form-group" id="loginPasswordGroup">
                <label class="form-label">Senha</label>
                <div style="position:relative">
                  <input class="form-input" name="password" type="password" autocomplete="current-password" required placeholder="Sua senha" id="loginPasswordInput" />
                  <button type="button" id="toggleLoginPass" title="Mostrar/ocultar senha" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px"><svg id="eyeIconLogin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><svg id="eyeOffIconLogin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button>
                </div>
              </div>
              <p id="loginError" class="text-sm mt-sm" style="color:var(--danger);display:none"></p>
              <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:16px" id="loginSubmitBtn">
                Entrar no Sistema
              </button>
            </form>
            <div class="text-center mt-md">
              <button class="btn btn-ghost btn-sm" id="forgotPassBtn">Esqueci minha senha</button>
            </div>
          </div>

          <!-- Signup Form -->
          <div id="panelSignup" style="display:none">
            <form id="signupForm" autocomplete="on">
              <div class="form-group">
                <label class="form-label">Nome completo *</label>
                <input class="form-input" name="trainerName" required placeholder="Ex: João da Silva" autocomplete="name" />
              </div>
              <div class="form-group">
                <label class="form-label">E-mail *</label>
                <input class="form-input" name="email" type="email" required placeholder="seu@email.com" autocomplete="email" />
              </div>
              <div class="form-group">
                <label class="form-label">CREF</label>
                <input class="form-input" name="cref" placeholder="Ex: 012345-G/SP" />
              </div>
              <div class="form-group">
                <label class="form-label">Senha *</label>
                <div style="position:relative">
                  <input class="form-input" name="password" type="password" required placeholder="Mínimo 6 caracteres" id="signupPasswordInput" autocomplete="new-password" />
                  <button type="button" id="toggleSignupPass" title="Mostrar/ocultar senha" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px"><svg id="eyeIconSignup" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><svg id="eyeOffIconSignup" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Confirmar senha *</label>
                <input class="form-input" name="passwordConfirm" type="password" required placeholder="Repita a senha" autocomplete="new-password" />
              </div>
              <p id="signupError" class="text-sm mt-sm" style="color:var(--danger);display:none"></p>
              <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:16px" id="signupSubmitBtn">
                Criar Conta
              </button>
            </form>
          </div>

          <!-- Email Confirmation Pending -->
          <div id="panelConfirmation" style="display:none;text-align:center;padding:20px 0">
            <div style="font-size:3rem;margin-bottom:16px">📧</div>
            <h3 style="margin-bottom:8px">Confirme seu e-mail</h3>
            <p class="text-muted text-sm" style="line-height:1.7;margin-bottom:16px">
              Enviamos um link de confirmação para <strong id="confirmEmail"></strong>.<br>
              Clique no link para ativar sua conta e acessar o sistema.
            </p>
            <div class="card" style="background:rgba(16,185,129,0.06);border:1px solid var(--primary);padding:12px;margin-bottom:16px">
              <p class="text-xs text-muted">Não recebeu? Verifique a pasta de spam ou</p>
              <button class="btn btn-ghost btn-sm mt-sm" id="resendConfirmBtn">Reenviar e-mail de confirmação</button>
            </div>
            <button class="btn btn-secondary btn-sm" id="backToLoginBtn">Voltar para Login</button>
          </div>

          <!-- Reset Password -->
          <div id="panelReset" style="display:none">
            <h3 style="margin-bottom:8px">Recuperar senha</h3>
            <p class="text-muted text-sm mb-md">Informe seu e-mail para receber o link de redefinição.</p>
            <form id="resetForm">
              <div class="form-group">
                <label class="form-label">E-mail</label>
                <input class="form-input" name="email" type="email" required placeholder="seu@email.com" />
              </div>
              <p id="resetMsg" class="text-sm mt-sm" style="display:none"></p>
              <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:12px">Enviar link</button>
            </form>
            <div class="text-center mt-md">
              <button class="btn btn-ghost btn-sm" id="backToLoginFromReset">Voltar para Login</button>
            </div>
          </div>
        </div>

        <div class="login-footer">
          <p class="text-muted text-xs">© 2026 Personal PRO — Dados protegidos por Supabase Auth</p>
        </div>
      </div>
    </div>
  `;
}

function showPanel(name) {
  ['panelLogin','panelSignup','panelConfirmation','panelReset'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === name ? '' : 'none';
  });
}

export async function initLogin(onSuccess) {
  let activeRole = 'trainer';

  const roleTrainerBtn = document.getElementById('roleTrainer');
  const roleStudentBtn = document.getElementById('roleStudent');
  const passwordGroup = document.getElementById('loginPasswordGroup');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const loginPassInput = document.getElementById('loginPasswordInput');

  roleTrainerBtn?.addEventListener('click', () => {
    activeRole = 'trainer';
    roleTrainerBtn.classList.add('active');
    roleTrainerBtn.style.background = 'var(--primary)';
    roleTrainerBtn.style.color = '#fff';
    roleStudentBtn.classList.remove('active');
    roleStudentBtn.style.background = 'transparent';
    roleStudentBtn.style.color = 'var(--text-muted)';
    if (passwordGroup) passwordGroup.style.display = '';
    if (loginPassInput) loginPassInput.required = true;
    if (loginSubmitBtn) loginSubmitBtn.textContent = 'Entrar no Sistema';
  });

  roleStudentBtn?.addEventListener('click', () => {
    activeRole = 'student';
    roleStudentBtn.classList.add('active');
    roleStudentBtn.style.background = 'var(--primary)';
    roleStudentBtn.style.color = '#fff';
    roleTrainerBtn.classList.remove('active');
    roleTrainerBtn.style.background = 'transparent';
    roleTrainerBtn.style.color = 'var(--text-muted)';
    if (passwordGroup) passwordGroup.style.display = 'none';
    if (loginPassInput) loginPassInput.required = false;
    if (loginSubmitBtn) loginSubmitBtn.textContent = 'Acessar Portal';
  });

  // Tab switching
  document.getElementById('tabLogin')?.addEventListener('click', () => {
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('tabSignup').classList.remove('active');
    showPanel('panelLogin');
  });
  document.getElementById('tabSignup')?.addEventListener('click', () => {
    document.getElementById('tabSignup').classList.add('active');
    document.getElementById('tabLogin').classList.remove('active');
    showPanel('panelSignup');
  });

  // Password visibility toggles
  document.getElementById('toggleLoginPass')?.addEventListener('click', () => {
    const inp = document.getElementById('loginPasswordInput');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    const isText = inp.type === 'text';
    document.getElementById('eyeIconLogin').style.display = isText ? 'none' : '';
    document.getElementById('eyeOffIconLogin').style.display = isText ? '' : 'none';
  });
  document.getElementById('toggleSignupPass')?.addEventListener('click', () => {
    const inp = document.getElementById('signupPasswordInput');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    const isText = inp.type === 'text';
    document.getElementById('eyeIconSignup').style.display = isText ? 'none' : '';
    document.getElementById('eyeOffIconSignup').style.display = isText ? '' : 'none';
  });

  // LOGIN FORM
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    const errEl = document.getElementById('loginError');
    btn.disabled = true;
    btn.textContent = activeRole === 'trainer' ? 'Entrando...' : 'Acessando...';
    errEl.style.display = 'none';

    const fd = new FormData(e.target);
    const { email, password } = Object.fromEntries(fd);

    if (activeRole === 'student') {
      try {
        const { default: db } = await import('../db.js');
        const cleanEmail = email.trim().toLowerCase();
        const student = await db.getStudentByEmail(cleanEmail);
        if (!student) {
          errEl.textContent = 'Nenhum aluno cadastrado com este e-mail.';
          errEl.style.display = '';
          btn.disabled = false;
          btn.textContent = 'Acessar Portal';
          return;
        }
        notify.success(`Olá, ${student.name}! Redirecionando para seu portal...`);
        localStorage.setItem('portal_logged_student_id', student.id);
        window.location.hash = `#/portal/${student.id}`;
      } catch (err) {
        errEl.textContent = 'Erro ao buscar aluno: ' + err.message;
        errEl.style.display = '';
        btn.disabled = false;
        btn.textContent = 'Acessar Portal';
      }
      return;
    }

    const result = await signIn(email, password);

    if (result.error) {
      let msg = result.error;
      if (msg.includes('Invalid login')) msg = 'E-mail ou senha incorretos.';
      if (msg.includes('Email not confirmed')) msg = 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
      errEl.textContent = msg;
      errEl.style.display = '';
      btn.disabled = false;
      btn.textContent = 'Entrar no Sistema';
    } else {
      notify.success(`Bem-vindo, ${result.user?.user_metadata?.trainer_name || result.user?.email}!`);
      onSuccess(result.user);
    }
  });

  // SIGNUP FORM
  document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signupSubmitBtn');
    const errEl = document.getElementById('signupError');
    btn.disabled = true;
    btn.textContent = 'Criando conta...';
    errEl.style.display = 'none';

    const fd = new FormData(e.target);
    const { trainerName, email, cref, password, passwordConfirm } = Object.fromEntries(fd);

    if (password !== passwordConfirm) {
      errEl.textContent = 'As senhas não coincidem.';
      errEl.style.display = '';
      btn.disabled = false;
      btn.textContent = 'Criar Conta';
      return;
    }
    if (password.length < 6) {
      errEl.textContent = 'A senha deve ter no mínimo 6 caracteres.';
      errEl.style.display = '';
      btn.disabled = false;
      btn.textContent = 'Criar Conta';
      return;
    }

    const result = await signUp(email, password, trainerName, cref);

    if (result.error) {
      let msg = result.error;
      if (msg.includes('already registered') || msg.includes('already exists')) msg = 'Este e-mail já possui uma conta. Faça login.';
      errEl.textContent = msg;
      errEl.style.display = '';
      btn.disabled = false;
      btn.textContent = 'Criar Conta';
      return;
    }

    if (result.needsConfirmation) {
      // Show confirmation pending panel
      document.getElementById('confirmEmail').textContent = email;
      showPanel('panelConfirmation');
      // Store email for resend
      document.getElementById('resendConfirmBtn').dataset.email = email;
    } else if (result.session) {
      // No email confirmation needed (e.g., auto-confirm enabled in Supabase)
      notify.success(`Conta criada! Bem-vindo, ${trainerName}!`);
      onSuccess(result.user);
    }
    btn.disabled = false;
    btn.textContent = 'Criar Conta';
  });

  // RESEND CONFIRMATION
  document.getElementById('resendConfirmBtn')?.addEventListener('click', async (e) => {
    const email = e.target.dataset.email;
    if (!email) return;
    const sb = getSupabase();
    const { error } = await sb.auth.resend({ type: 'signup', email });
    if (error) notify.error('Erro ao reenviar: ' + error.message);
    else notify.success('E-mail reenviado! Verifique sua caixa de entrada.');
  });

  // BACK TO LOGIN
  document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
    showPanel('panelLogin');
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('tabSignup').classList.remove('active');
  });

  // FORGOT PASSWORD
  document.getElementById('forgotPassBtn')?.addEventListener('click', () => showPanel('panelReset'));
  document.getElementById('backToLoginFromReset')?.addEventListener('click', () => showPanel('panelLogin'));

  // RESET FORM
  document.getElementById('resetForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { email } = Object.fromEntries(fd);
    const result = await sendPasswordReset(email);
    const msg = document.getElementById('resetMsg');
    if (result.error) {
      msg.style.color = 'var(--danger)';
      msg.textContent = result.error;
    } else {
      msg.style.color = 'var(--success)';
      msg.textContent = 'Link enviado! Verifique seu e-mail.';
    }
    msg.style.display = '';
  });

  // Check if returning from email confirmation link
  const hash = window.location.hash;
  if (hash.includes('access_token') || hash.includes('type=signup')) {
    const user = await getCurrentUser();
    if (user) {
      notify.success('E-mail confirmado! Bem-vindo ao Personal PRO!');
      onSuccess(user);
    }
  }
}

// Export isAuthenticated so app.js can use it
export { isAuthenticated } from '../utils/auth.js';
export { signOut as logout } from '../utils/auth.js';
