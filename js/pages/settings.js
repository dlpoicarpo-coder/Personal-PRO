// ========================================
// PERSONAL PRO — Settings Page (v2)
// ========================================
import db from '../db.js';
import { exportBackup, importBackup } from '../utils/backup.js';
import { notify } from '../components/toast.js';
import { getCurrentUser } from '../utils/auth.js';

export async function renderSettings() {
  const settings     = await db.get('settings', 'trainer') || {};
  const currentTheme = localStorage.getItem('pp_theme') || 'dark';
  const isInstalled  = window.matchMedia('(display-mode: standalone)').matches;

  if (!settings.trainerEmail) {
    try {
      const user = await getCurrentUser();
      if (user) {
        if (!settings.trainerEmail) settings.trainerEmail = user.email || '';
        if (!settings.trainerName)  settings.trainerName  = user.user_metadata?.full_name || '';
      }
    } catch(_) {}
  }

  return `
    <div class="page-header">
      <div><h1>Configurações</h1><p class="subtitle">Personalize o Personal PRO para o seu negócio</p></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Perfil do Treinador</span></div>
        <p class="text-xs text-muted mb-md">Aparece nos PDFs, relatórios e dossiês gerados pelo sistema.</p>
        <form id="trainerForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nome Completo *</label>
              <input class="form-input" name="trainerName" value="${settings.trainerName||''}" required />
            </div>
            <div class="form-group">
              <label class="form-label">CREF</label>
              <input class="form-input" name="cref" value="${settings.cref||''}" placeholder="000000-G/UF" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">WhatsApp Profissional</label>
              <input class="form-input" name="trainerPhone" value="${settings.trainerPhone||''}" placeholder="(00) 00000-0000" />
            </div>
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input class="form-input" name="trainerEmail" type="email" value="${settings.trainerEmail||''}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Chave Pix</label>
            <input class="form-input" name="pixKey" value="${settings.pixKey||''}" placeholder="CPF, e-mail ou telefone" />
            <div class="form-hint">Usada nas mensagens de cobrança via WhatsApp.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Especialização / Bio</label>
            <textarea class="form-textarea" name="bio" rows="2" placeholder="Ex: Especialista em Hipertrofia e Emagrecimento...">${settings.bio||''}</textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%">Salvar Perfil</button>
        </form>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header"><span class="card-title">Aparência &amp; Preferências</span></div>
          <div class="form-group">
            <label class="form-label">Tema do Sistema</label>
            <select id="themeSelect" class="form-select">
              <option value="dark"  ${currentTheme==='dark' ?'selected':''}>Modo Escuro</option>
              <option value="light" ${currentTheme==='light'?'selected':''}>Modo Claro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sessões esperadas por mês (padrão)</label>
            <input class="form-input" id="defaultSessionsInput" type="number" min="1" max="30" value="${settings.defaultExpectedSessions||12}" />
            <div class="form-hint">Usado para calcular o valor por sessão no financeiro.</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">App Mobile (PWA)</span></div>
          ${isInstalled ? `
            <p class="text-sm" style="color:var(--success)">✓ App instalado no dispositivo</p>` : `
            <p class="text-sm text-muted mb-sm">Instale o Personal PRO como app nativo no seu celular ou computador.</p>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn btn-primary btn-sm" id="installPwaBtn">Instalar App</button>
              <button class="btn btn-ghost btn-sm" id="resetPwaDismiss" style="font-size:0.78rem">
                Mostrar popup de instalação novamente
              </button>
            </div>`}
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Backup &amp; Dados</span></div>
          <p class="text-muted text-sm mb-md">Dados sincronizados na nuvem (Supabase). Backup = cópia local de segurança.</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-secondary" id="exportBackupBtn">⬇ Baixar Backup (JSON)</button>
            <label class="btn btn-secondary" style="cursor:pointer;text-align:center;display:flex;align-items:center;justify-content:center">
              ⬆ Importar Backup
              <input type="file" id="importBackupInput" accept=".json" style="display:none" />
            </label>
          </div>
        </div>

        <div class="card" style="border-color:rgba(239,68,68,0.3)">
          <div class="card-header"><span class="card-title" style="color:var(--danger)">Zona de Perigo</span></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-secondary btn-sm" id="logoutSettingsBtn" style="border-color:var(--warning);color:var(--warning)">Sair da Conta</button>
            <button class="btn btn-danger btn-sm" id="clearAllBtn">Limpar Toda a Base de Dados</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-lg">
      <div class="card-header"><span class="card-title">Sobre o Personal PRO</span></div>
      <div class="grid-2">
        <div>
          <p class="text-sm mb-xs"><strong>Versão:</strong> 3.0.0</p>
          <p class="text-sm mb-xs"><strong>Stack:</strong> HTML5 · CSS3 · Vanilla JS ES Modules</p>
          <p class="text-sm mb-xs"><strong>Banco:</strong> Supabase (PostgreSQL) + LocalStorage</p>
          <p class="text-sm"><strong>Desenvolvido por:</strong> Daniel Policarpo · 2026</p>
        </div>
        <div>
          <p class="text-sm text-muted" style="line-height:1.7">
            Sistema profissional de gestão para personal trainers. Gestão de alunos, prescrição, periodização científica, biofeedback, avaliações e relatórios de performance.
          </p>
        </div>
      </div>
    </div>
  `;
}

export function initSettings(navigateFn) {
  document.getElementById('trainerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Salvando...'; btn.disabled = true;
    try {
      const fd   = new FormData(e.target);
      const data = { id: 'trainer', ...Object.fromEntries(fd) };
      const sesEl = document.getElementById('defaultSessionsInput');
      if (sesEl) data.defaultExpectedSessions = parseInt(sesEl.value) || 12;
      await db.put('settings', data);
      const nameEl   = document.getElementById('trainerName');
      const avatarEl = document.getElementById('trainerAvatar');
      if (nameEl   && data.trainerName) nameEl.textContent = data.trainerName;
      if (avatarEl && data.trainerName) {
        avatarEl.textContent = data.trainerName.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();
      }
      notify.success('Perfil atualizado!');
    } catch { notify.error('Erro ao salvar.'); }
    finally { btn.textContent = orig; btn.disabled = false; }
  });

  document.getElementById('themeSelect')?.addEventListener('change', async (e) => {
    const theme = e.target.value;
    localStorage.setItem('pp_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    try {
      const s = await db.get('settings', 'trainer') || { id: 'trainer' };
      s.theme = theme; await db.put('settings', s);
    } catch(_) {}
    notify.success(`Tema ${theme==='light'?'claro':'escuro'} ativado!`);
  });

  document.getElementById('defaultSessionsInput')?.addEventListener('change', async (e) => {
    try {
      const s = await db.get('settings', 'trainer') || { id: 'trainer' };
      s.defaultExpectedSessions = parseInt(e.target.value) || 12;
      await db.put('settings', s);
    } catch(_) {}
  });

  document.getElementById('installPwaBtn')?.addEventListener('click', () => {
    if (window._pwaPrompt) window._pwaPrompt.prompt();
    else notify.info('Use o menu do browser → "Adicionar à tela inicial".');
  });

  document.getElementById('resetPwaDismiss')?.addEventListener('click', () => {
    localStorage.removeItem('pp_pwa_dismissed');
    notify.success('Popup de instalação será exibido novamente.');
  });

  document.getElementById('exportBackupBtn')?.addEventListener('click', exportBackup);
  document.getElementById('importBackupInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && window.confirm('Importar backup? Isso substituirá todos os dados atuais.')) await importBackup(file);
  });

  document.getElementById('logoutSettingsBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Sair da conta?')) return;
    try { const { getSupabase } = await import('../utils/auth.js'); const sb = getSupabase(); if (sb) await sb.auth.signOut(); } catch(_) {}
    localStorage.removeItem('pp_session');
    window.location.href = window.location.href.split('#')[0] + '#/';
    setTimeout(() => window.location.reload(), 100);
  });

  document.getElementById('clearAllBtn')?.addEventListener('click', async () => {
    if (!window.confirm('ATENÇÃO: apagará TODOS os dados permanentemente. Continuar?')) return;
    if (!window.confirm('Tem certeza? Esta ação NÃO pode ser desfeita!')) return;
    try {
      for (const s of ['students','workouts','exercises','assessments','biofeedback','anamnesis','cycles','sessions','macrocycles','financial','schedules','methods']) {
        try { await db.clear(s); } catch(_) {}
      }
      notify.success('Base limpa. Reiniciando...');
      setTimeout(() => { localStorage.clear(); window.location.href = window.location.href.split('#')[0]+'#/'; setTimeout(()=>window.location.reload(),100); }, 2000);
    } catch { notify.error('Erro ao limpar.'); }
  });
}
