// ========================================
// PERSONAL PRO — Settings Page (v4)
// ========================================

import db from '../db.js';
import { exportBackup, importBackup } from '../utils/backup.js';
import { notify } from '../components/toast.js';

export async function renderSettings() {
  const settings = await db.get('settings', 'trainer') || {};
  const currentTheme = localStorage.getItem('pp_theme') || 'dark';

  return `
    <div class="page-header">
      <div>
        <h1>Configurações</h1>
        <p class="subtitle">Personalize sua plataforma</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Perfil do Treinador</span></div>
        <p class="text-muted text-xs mb-md">Estas informações aparecem nos PDFs e relatórios gerados</p>
        <form id="trainerForm">
          <div class="form-group">
            <label class="form-label">Nome Completo</label>
            <input class="form-input" name="trainerName" value="${settings.trainerName || ''}" placeholder="Seu nome" required />
          </div>
          <div class="form-group">
            <label class="form-label">CREF</label>
            <input class="form-input" name="cref" value="${settings.cref || ''}" placeholder="Ex: 000000-G/UF" />
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp Profissional</label>
            <input class="form-input" name="trainerPhone" value="${settings.trainerPhone || ''}" placeholder="(00) 00000-0000" />
          </div>
          <div class="form-group">
            <label class="form-label">Email de Contato</label>
            <input class="form-input" name="trainerEmail" type="email" value="${settings.trainerEmail || ''}" placeholder="seu@email.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Semanas padrão (Macrociclo)</label>
            <input class="form-input" name="defaultMacrocycleWeeks" type="number" min="1" max="52" value="${settings.defaultMacrocycleWeeks || 12}" title="Duração padrão em semanas ao criar um novo macrociclo." />
          </div>
          <div class="form-group">
            <label class="form-label">Fuso Horário</label>
            <select class="form-select" name="timezone">
              <option value="America/Sao_Paulo" ${settings.timezone === 'America/Sao_Paulo' || !settings.timezone ? 'selected' : ''}>Brasília (America/Sao_Paulo)</option>
              <option value="America/Manaus" ${settings.timezone === 'America/Manaus' ? 'selected' : ''}>Manaus (America/Manaus)</option>
              <option value="America/Rio_Branco" ${settings.timezone === 'America/Rio_Branco' ? 'selected' : ''}>Rio Branco (America/Rio_Branco)</option>
              <option value="America/Noronha" ${settings.timezone === 'America/Noronha' ? 'selected' : ''}>Fernando de Noronha (America/Noronha)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary mt-md" style="width:100%">Salvar Perfil</button>
        </form>
      </div>

      <div class="flex flex-col gap-md">
        <div class="card">
          <div class="card-header"><span class="card-title">Aparência Visual</span></div>
          <div class="form-group">
            <label class="form-label">Tema do Sistema</label>
            <select id="themeSelect" class="form-select">
              <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Modo Escuro</option>
              <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Modo Claro</option>
            </select>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Backup & Segurança</span></div>
          <p class="text-muted text-sm mb-md">Seus dados estão seguros na nuvem (Supabase).</p>
          <div class="flex flex-col gap-sm">
            <button class="btn btn-secondary" id="exportBackupBtn">Baixar Backup (JSON)</button>
            <div>
              <label class="btn btn-secondary" style="cursor:pointer">
                Importar Backup
                <input type="file" id="importBackupInput" accept=".json" style="display:none" />
              </label>
            </div>
          </div>
        </div>

        <div class="card" style="border-color: rgba(239, 68, 68, 0.3);">
          <div class="card-header"><span class="card-title" style="color: var(--danger);">Zona de Perigo</span></div>
          <div class="flex flex-col gap-sm">
            <button class="btn btn-secondary btn-sm" id="logoutSettingsBtn" style="border-color:var(--warning);color:var(--warning)">Sair da Conta (Logout)</button>
            <button class="btn btn-danger btn-sm" id="clearAllBtn">Limpar Toda a Base de Dados</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-lg">
      <div class="card-header"><span class="card-title">Sobre o Personal PRO</span></div>
      <div class="grid-2">
        <div>
          <p class="text-sm"><strong>Versão:</strong> 2.2.0</p>
          <p class="text-sm"><strong>Tecnologia:</strong> HTML5 + CSS3 + Vanilla JS</p>
          <p class="text-sm"><strong>Armazenamento:</strong> Supabase (PostgreSQL)</p>
        </div>
        <div>
          <p class="text-sm text-muted">Sistema de Treinamento profissional para personal trainers. Gestão de alunos, prescrição de treinos, avaliações e biofeedback.</p>
        </div>
      </div>
    </div>
  `;
}

export function initSettings(navigateFn) {
  // Save trainer info
  document.getElementById('trainerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      const fd = new FormData(e.target);
      const data = { id: 'trainer', ...Object.fromEntries(fd) };
      await db.put('settings', data);
      const nameEl = document.getElementById('trainerName');
      if (nameEl && data.trainerName) nameEl.textContent = data.trainerName;
      const avatarEl = document.getElementById('trainerAvatar');
      if (avatarEl && data.trainerName) {
        avatarEl.textContent = data.trainerName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      }
      notify.success('Perfil atualizado!');
    } catch (err) {
      notify.error('Erro ao salvar.');
    } finally {
      btn.textContent = 'Salvar Perfil';
      btn.disabled = false;
    }
  });

  // Theme toggle — LIGHT MODE ACTIVE
  document.getElementById('themeSelect')?.addEventListener('change', (e) => {
    const theme = e.target.value;
    localStorage.setItem('pp_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    notify.success(`Tema ${theme === 'light' ? 'claro' : 'escuro'} ativado!`);
  });

  // Export
  document.getElementById('exportBackupBtn')?.addEventListener('click', exportBackup);

  // Import
  document.getElementById('importBackupInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (window.confirm('Importar backup? Isso substituirá todos os dados atuais.')) {
        await importBackup(file);
      }
    }
  });

  // LOGOUT
  document.getElementById('logoutSettingsBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (window.confirm('Tem certeza que deseja sair da conta?')) {
      if (db.supabase) {
        await db.supabase.auth.signOut();
      }
      localStorage.removeItem('pp_session');
      const baseUrl = window.location.href.split('#')[0];
      window.location.href = baseUrl + '#/';
      setTimeout(() => window.location.reload(), 100);
    }
  });

  // Clear all
  document.getElementById('clearAllBtn')?.addEventListener('click', async () => {
    if (window.confirm('ATENÇÃO: Isso apagará TODOS os dados permanentemente. Deseja continuar?')) {
      if (window.confirm('Tem certeza? Essa ação NÃO pode ser desfeita!')) {
        try {
          const stores = ['students', 'workouts', 'exercises', 'assessments', 'biofeedback', 'anamnesis', 'cycles', 'sessions', 'macrocycles', 'financial', 'schedules'];
          for (const s of stores) await db.clear(s);
          notify.success('Base de dados limpa. Reiniciando...');
          setTimeout(() => {
            localStorage.clear();
            const baseUrl = window.location.href.split('#')[0];
            window.location.href = baseUrl + '#/';
            setTimeout(() => window.location.reload(), 100);
          }, 2000);
        } catch (err) {
          notify.error('Erro ao limpar a base de dados.');
        }
      }
    }
  });
}
