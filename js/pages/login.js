// ========================================
// PERSONAL PRO — Login Page (Cloud Edition v3)
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
          <p class="login-subtitle" style="color:var(--primary);font-weight:600;font-size:0.85rem;letter-spacing:1px">CLOUD EDITION</p>
          <p class="login-subtitle" style="margin-top:4px;font-size:0.8rem">Sistema de Treinamento</p>
        </div>
        <div class="login-body" id="loginBody">
          <div id="loginFormArea"></div>
        </div>
        <div class="login-footer">
          <p class="text-muted text-xs">© 2026 Personal PRO · Todos os dados protegidos na nuvem</p>
        </div>
      </div>
    </div>
  `;
}

export async function initLogin(onSuccess) {
  const area = document.getElementById('loginFormArea');
  if (!area) return;

  // Sempre mostra as duas abas — independente do banco estar acessível ou não
  area.innerHTML = `
    <div class="login-tabs" style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border-color)">
      <button class="login-tab active" id="tabLogin" style="flex:1;padding:10px;border:none;background:none;color:var(--primary);font-weight:600;cursor:pointer;border-bottom:2px solid var(--primary);margin-bottom:-2px;font-size:0.95rem">
        <span style="margin-right:6px">🔑</span> Entrar
      </button>
      <button class="login-tab" id="tabCreate" style="flex:1;padding:10px;border:none;background:none;color:var(--text-secondary);cursor:pointer;margin-bottom:-2px;font-size:0.95rem">
        <span style="margin-right:6px">➕</span> Nova Conta
      </button>
    </div>
    <div id="loginPanel">
      <form id="loginForm">
        <div class="form-group">
          <label class="form-label"><span style="margin-right:6px">📧</span> E-mail ou CREF</label>
          <input class="form-input" name="credential" autocomplete="email" required placeholder="coach@email.com ou 012345-G/SP" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:12px">
          <span style="margin-right:6px">🚀</span> Entrar no Sistema
        </button>
        <p id="loginError" class="text-danger text-sm text-center mt-md" style="display:none"></p>
      </form>
      <p class="text-muted text-xs text-center mt-md">Acesso exclusivo para treinadores cadastrados</p>
    </div>
    <div id="createPanel" style="display:none">
      ${renderCreateForm()}
    </div>
  `;

  // Tab switching
  document.getElementById('tabLogin')?.addEventListener('click', () => switchTab('login'));
  document.getElementById('tabCreate')?.addEventListener('click', () => switchTab('create'));

  // Login handler
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { credential } = Object.fromEntries(fd);
    const trainer = await db.get('settings', 'trainer_auth');
    const errEl = document.getElementById('loginError');

    if (!trainer) {
      if (errEl) { errEl.style.display = ''; errEl.textContent = 'Conta não encontrada. Crie uma nova conta na aba "Nova Conta".'; }
      return;
    }

    const credLower = credential.toLowerCase().trim();
    const emailMatch = trainer.email && trainer.email.toLowerCase().trim() === credLower;
    const crefMatch = trainer.cref && trainer.cref.toLowerCase().trim() === credLower;

    if (emailMatch || crefMatch) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: trainer.trainerName, ts: Date.now() }));
      notify.success(`Bem-vindo, ${trainer.trainerName}!`);
      onSuccess();
    } else {
      if (errEl) { errEl.style.display = ''; errEl.textContent = 'E-mail ou CREF não encontrado'; }
    }
  });

  // Create account handler
  bindCreateForm(onSuccess);
}


function renderCreateForm() {
  return `
    <form id="setupForm">
      <div class="form-group">
        <label class="form-label"><span style="margin-right:6px">👤</span> Nome completo</label>
        <input class="form-input" name="trainerName" required placeholder="Ex: João da Silva" />
      </div>
      <div class="form-group">
        <label class="form-label"><span style="margin-right:6px">📧</span> E-mail</label>
        <input class="form-input" name="email" type="email" required placeholder="coach@email.com" />
      </div>
      <div class="form-group">
        <label class="form-label"><span style="margin-right:6px">🏋️</span> CREF</label>
        <input class="form-input" name="cref" required placeholder="Ex: 012345-G/SP" />
      </div>
      <div class="form-group">
        <label class="form-label"><span style="margin-right:6px">📱</span> WhatsApp (opcional)</label>
        <input class="form-input" name="phone" placeholder="(00) 00000-0000" />
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:12px">
        <span style="margin-right:6px">✨</span> Criar Conta e Entrar
      </button>
    </form>
  `;
}

function switchTab(tab) {
  const loginTab = document.getElementById('tabLogin');
  const createTab = document.getElementById('tabCreate');
  const loginPanel = document.getElementById('loginPanel');
  const createPanel = document.getElementById('createPanel');

  if (tab === 'login') {
    loginTab.style.color = 'var(--primary)';
    loginTab.style.borderBottom = '2px solid var(--primary)';
    loginTab.style.fontWeight = '600';
    createTab.style.color = 'var(--text-secondary)';
    createTab.style.borderBottom = 'none';
    createTab.style.fontWeight = '400';
    loginPanel.style.display = '';
    createPanel.style.display = 'none';
  } else {
    createTab.style.color = 'var(--primary)';
    createTab.style.borderBottom = '2px solid var(--primary)';
    createTab.style.fontWeight = '600';
    loginTab.style.color = 'var(--text-secondary)';
    loginTab.style.borderBottom = 'none';
    loginTab.style.fontWeight = '400';
    loginPanel.style.display = 'none';
    createPanel.style.display = '';
  }
}

function bindCreateForm(onSuccess) {
  document.getElementById('setupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<span style="margin-right:6px">⏳</span> Criando conta...';
    btn.disabled = true;

    try {
      const fd = new FormData(e.target);
      const d = Object.fromEntries(fd);
      if (!d.trainerName || !d.email) { notify.error('Nome e email são obrigatórios'); btn.innerHTML = '<span style="margin-right:6px">✨</span> Criar Conta e Entrar'; btn.disabled = false; return; }

      await db.put('settings', {
        id: 'trainer_auth',
        trainerName: d.trainerName,
        email: d.email,
        cref: d.cref,
        phone: d.phone || '',
        isSetup: true,
        createdAt: new Date().toISOString(),
      });
      await db.put('settings', { id: 'trainer', trainerName: d.trainerName, cref: d.cref, email: d.email, trainerPhone: d.phone || '' });

      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: d.trainerName, ts: Date.now() }));
      notify.success('Conta criada! Bem-vindo ao Personal PRO!');
      onSuccess();
    } catch (err) {
      notify.error('Erro ao criar conta. Tente novamente.');
      btn.innerHTML = '<span style="margin-right:6px">✨</span> Criar Conta e Entrar';
      btn.disabled = false;
    }
  });
}
