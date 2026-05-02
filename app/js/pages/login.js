// ========================================
// PERSONAL PRO — Login Page (v2)
// Email ou CREF — simplificado para produção
// ========================================
import db from '../db.js';
import { notify } from '../components/toast.js';

const SESSION_KEY = 'pp_session';

export async function isAuthenticated() {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return false;
  const trainer = await db.get('settings', 'trainer_auth');
  return trainer && trainer.isSetup;
}

export async function hasAccount() {
  const trainer = await db.get('settings', 'trainer_auth');
  return trainer && trainer.isSetup;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function renderLogin() {
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <h1 class="login-title">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="login-subtitle">Sistema de Treinamento</p>
        </div>
        <div class="login-body" id="loginBody">
          <div id="loginFormArea"></div>
        </div>
        <div class="login-footer">
          <p class="text-muted text-xs">© 2026 Personal PRO. Todos os dados são armazenados localmente.</p>
        </div>
      </div>
    </div>
  `;
}

export async function initLogin(onSuccess) {
  const area = document.getElementById('loginFormArea');
  if (!area) return;
  const hasAcc = await hasAccount();

  if (hasAcc) {
    // Login — only email or CREF
    area.innerHTML = `
      <h3 style="text-align:center;margin-bottom:20px">Acesso do Treinador</h3>
      <form id="loginForm">
        <div class="form-group">
          <label class="form-label">E-mail ou CREF</label>
          <input class="form-input" name="credential" autocomplete="email" required placeholder="coach@email.com ou 012345-G/SP" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:12px">Entrar</button>
        <p id="loginError" class="text-danger text-sm text-center mt-md" style="display:none"></p>
      </form>
      <p class="text-muted text-xs text-center mt-md">Acesso exclusivo para treinadores cadastrados</p>
    `;
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const { credential } = Object.fromEntries(fd);
      const trainer = await db.get('settings', 'trainer_auth');

      const credLower = credential.toLowerCase().trim();
      const emailMatch = trainer.email && trainer.email.toLowerCase().trim() === credLower;
      const crefMatch = trainer.cref && trainer.cref.toLowerCase().trim() === credLower;

      if (emailMatch || crefMatch) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: trainer.trainerName, ts: Date.now() }));
        notify.success(`Bem-vindo, ${trainer.trainerName}!`);
        onSuccess();
      } else {
        const errEl = document.getElementById('loginError');
        if (errEl) { errEl.style.display = ''; errEl.textContent = 'E-mail ou CREF não encontrado'; }
      }
    });
  } else {
    // First time setup
    area.innerHTML = `
      <h3 style="text-align:center;margin-bottom:8px">Primeiro Acesso</h3>
      <p class="text-muted text-sm text-center mb-lg">Configure sua conta de treinador</p>
      <form id="setupForm">
        <div class="form-group"><label class="form-label">Seu nome completo</label><input class="form-input" name="trainerName" required placeholder="Ex: João da Silva" /></div>
        <div class="form-group"><label class="form-label">E-mail</label><input class="form-input" name="email" type="email" required placeholder="coach@email.com" /></div>
        <div class="form-group"><label class="form-label">CREF</label><input class="form-input" name="cref" required placeholder="Ex: 012345-G/SP" /></div>
        <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:12px">Criar Conta</button>
      </form>
    `;
    document.getElementById('setupForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const d = Object.fromEntries(fd);
      if (!d.trainerName || !d.email) { notify.error('Nome e email são obrigatórios'); return; }

      await db.put('settings', {
        key: 'trainer_auth',
        trainerName: d.trainerName,
        email: d.email,
        cref: d.cref,
        isSetup: true,
        createdAt: new Date().toISOString(),
      });
      await db.put('settings', { key: 'trainer', trainerName: d.trainerName, cref: d.cref, email: d.email });

      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: d.trainerName, ts: Date.now() }));
      notify.success('Conta criada! Bem-vindo ao Personal PRO!');
      onSuccess();
    });
  }
}
