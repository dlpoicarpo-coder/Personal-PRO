// ========================================
// PERSONAL PRO — Settings Page (Cloud Edition v3)
// ========================================

import db from '../db.js';
import { exportBackup, importBackup } from '../utils/backup.js';
import { notify } from '../components/toast.js';

export async function renderSettings() {
  const settings = await db.get('settings', 'trainer') || {};

  return `
    <div class="page-header">
      <div>
        <h1>⚙️ Configurações</h1>
        <p class="subtitle">Personalize sua plataforma na nuvem</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">👤 Perfil do Treinador</span></div>
        <p class="text-muted text-xs mb-md">Estas informações aparecem nos PDFs e relatórios gerados</p>
        <form id="trainerForm">
          <div class="form-group">
            <label class="form-label"><span style="margin-right:6px">👤</span> Nome Completo</label>
            <input class="form-input" name="trainerName" value="${settings.trainerName || ''}" placeholder="Seu nome" required />
          </div>
          <div class="form-group">
            <label class="form-label"><span style="margin-right:6px">🏋️</span> CREF</label>
            <input class="form-input" name="cref" value="${settings.cref || ''}" placeholder="Ex: 000000-G/UF" />
          </div>
          <div class="form-group">
            <label class="form-label"><span style="margin-right:6px">📱</span> WhatsApp Profissional</label>
            <input class="form-input" name="trainerPhone" value="${settings.trainerPhone || ''}" placeholder="(00) 00000-0000" />
          </div>
          <div class="form-group">
            <label class="form-label"><span style="margin-right:6px">📧</span> Email de Contato</label>
            <input class="form-input" name="trainerEmail" type="email" value="${settings.trainerEmail || ''}" placeholder="seu@email.com" />
          </div>
          <button type="submit" class="btn btn-primary mt-md" style="width:100%">
            <span style="margin-right:6px">☁️</span> Salvar Perfil na Nuvem
          </button>
        </form>
      </div>

      <div class="flex flex-col gap-md">
        <div class="card">
          <div class="card-header"><span class="card-title">🎨 Aparência Visual</span></div>
          <div class="form-group">
            <label class="form-label">Tema do Sistema</label>
            <select id="themeSelect" class="form-select">
              <option value="dark">🌙 Modo Escuro (Padrão)</option>
              <option value="light">☀️ Modo Claro (Em breve)</option>
            </select>
            <p class="text-xs text-muted mt-sm">O modo claro será ativado na próxima atualização.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">💾 Backup & Segurança</span></div>
          <p class="text-muted text-sm mb-md">Seus dados estão <b>100% seguros na nuvem (Supabase)</b>. Gere backups locais por precaução.</p>
          <div class="flex flex-col gap-sm">
            <button class="btn btn-secondary" id="exportBackupBtn">
              <span style="margin-right:6px">⬇️</span> Baixar Backup (JSON)
            </button>
            <div>
              <label class="btn btn-secondary" style="cursor:pointer">
                <span style="margin-right:6px">⬆️</span> Importar Backup
                <input type="file" id="importBackupInput" accept=".json" style="display:none" />
              </label>
            </div>
          </div>
        </div>

        <div class="card" style="border-color: rgba(239, 68, 68, 0.3);">
          <div class="card-header"><span class="card-title" style="color: var(--danger);">⚠️ Zona de Perigo</span></div>
          <p class="text-muted text-sm mb-md">Cuidado: essas ações são irreversíveis.</p>
          <div class="flex flex-col gap-sm">
            <button class="btn btn-secondary btn-sm" id="logoutSettingsBtn" style="border-color:var(--warning);color:var(--warning)">
              <span style="margin-right:6px">🚪</span> Sair da Conta (Logout)
            </button>
            <button class="btn btn-danger btn-sm" id="clearAllBtn">
              <span style="margin-right:6px">🗑️</span> Limpar Toda a Base de Dados
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-lg">
      <div class="card-header"><span class="card-title">ℹ️ Sobre o Personal PRO</span></div>
      <div class="grid-2">
        <div>
          <p class="text-sm"><strong>Versão:</strong> 2.1.0 (Cloud Edition)</p>
          <p class="text-sm"><strong>Tecnologia:</strong> HTML5 + CSS3 + Vanilla JS</p>
          <p class="text-sm"><strong>Armazenamento:</strong> Supabase (PostgreSQL na nuvem)</p>
          <p class="text-sm"><strong>Gráficos:</strong> Chart.js</p>
          <p class="text-sm"><strong>PDFs:</strong> jsPDF</p>
        </div>
        <div>
          <p class="text-sm text-muted">Plataforma profissional 100% online para gestão de alunos, prescrição de treinos, avaliações físicas e monitoramento de biofeedback. Acesse de qualquer dispositivo com total segurança.</p>
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
    btn.innerHTML = '<span style="margin-right:6px">⏳</span> Salvando...';
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
      notify.success('Perfil atualizado na nuvem!');
    } catch (err) {
      notify.error('Erro ao salvar. Verifique a conexão.');
    } finally {
      btn.innerHTML = '<span style="margin-right:6px">☁️</span> Salvar Perfil na Nuvem';
      btn.disabled = false;
    }
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

  // LOGOUT from settings — FIXED
  document.getElementById('logoutSettingsBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.confirm('Tem certeza que deseja sair da conta?')) {
      localStorage.removeItem('pp_session');
      window.location.hash = '#/';
      window.location.reload();
    }
  });

  // Clear all
  document.getElementById('clearAllBtn')?.addEventListener('click', async () => {
    if (window.confirm('ATENÇÃO: Isso apagará TODOS os dados permanentemente da nuvem. Deseja continuar?')) {
      if (window.confirm('Tem certeza? Essa ação NÃO pode ser desfeita!')) {
        try {
          const btn = document.getElementById('clearAllBtn');
          btn.innerHTML = '<span style="margin-right:6px">⏳</span> Limpando...';
          btn.disabled = true;

          const stores = ['students', 'workouts', 'exercises', 'assessments', 'biofeedback', 'anamnesis', 'cycles', 'sessions', 'macrocycles', 'financial', 'schedules'];
          for (const s of stores) await db.clear(s);

          notify.success('Base de dados limpa. Reiniciando...');
          setTimeout(() => {
            localStorage.clear();
            window.location.reload();
          }, 2000);
        } catch (err) {
          notify.error('Erro ao limpar a base de dados.');
        }
      }
    }
  });
}
