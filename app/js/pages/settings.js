// ========================================
// PERSONAL PRO — Settings Page
// ========================================

import db from '../db.js';
import { exportBackup, importBackup } from '../utils/backup.js';
import { notify } from '../components/toast.js';

export async function renderSettings() {
  const settings = await db.get('settings', 'trainer') || {};

  return `
    <div class="page-header">
      <div>
        <h1>Configurações</h1>
        <p class="subtitle">Personalize sua plataforma</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Dados do Personal</span></div>
        <form id="trainerForm">
          <div class="form-group">
            <label class="form-label">Nome Completo</label>
            <input class="form-input" name="trainerName" value="${settings.trainerName || ''}" placeholder="Seu nome" />
          </div>
          <div class="form-group">
            <label class="form-label">CREF</label>
            <input class="form-input" name="cref" value="${settings.cref || ''}" placeholder="Ex: 000000-G/UF" />
          </div>
          <div class="form-group">
            <label class="form-label">Telefone</label>
            <input class="form-input" name="trainerPhone" value="${settings.trainerPhone || ''}" placeholder="(00) 00000-0000" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" name="trainerEmail" value="${settings.trainerEmail || ''}" placeholder="seu@email.com" />
          </div>
          <button type="submit" class="btn btn-primary mt-md">Salvar</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Backup & Restauração</span></div>
        <p class="text-muted text-sm mb-md">Exporte seus dados para manter um backup seguro. Importe para restaurar ou migrar dados.</p>
        <div class="flex flex-col gap-md">
          <button class="btn btn-primary" id="exportBackupBtn">Exportar Backup (JSON)</button>
          <div>
            <label class="btn btn-secondary" style="cursor:pointer">
              Importar Backup
              <input type="file" id="importBackupInput" accept=".json" style="display:none" />
            </label>
          </div>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color)">
          <div class="card-header"><span class="card-title">Zona de Perigo</span></div>
          <p class="text-muted text-sm mb-md">Cuidado: essas ações são irreversíveis.</p>
          <button class="btn btn-danger btn-sm" id="clearAllBtn">Limpar Todos os Dados</button>
        </div>
      </div>
    </div>

    <div class="card mt-lg">
      <div class="card-header"><span class="card-title">Sobre o Personal PRO</span></div>
      <div class="grid-2">
        <div>
          <p class="text-sm"><strong>Versão:</strong> 1.0.0</p>
          <p class="text-sm"><strong>Tecnologia:</strong> HTML5 + CSS3 + JavaScript</p>
          <p class="text-sm"><strong>Armazenamento:</strong> IndexedDB (local)</p>
          <p class="text-sm"><strong>Gráficos:</strong> Chart.js</p>
          <p class="text-sm"><strong>PDFs:</strong> jsPDF</p>
        </div>
        <div>
          <p class="text-sm text-muted">O Personal PRO é uma plataforma profissional para gestão de alunos, prescrição de treinos, avaliações físicas e monitoramento de biofeedback. Todos os dados são armazenados localmente no seu navegador.</p>
          <p class="text-sm text-muted mt-md"><strong>Dica:</strong> Faça backup regularmente para não perder seus dados!</p>
        </div>
      </div>
    </div>
  `;
}

export function initSettings(navigateFn) {
  // Save trainer info
  document.getElementById('trainerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { key: 'trainer', ...Object.fromEntries(fd) };
    await db.put('settings', data);
    // Update sidebar name
    const nameEl = document.getElementById('trainerName');
    if (nameEl && data.trainerName) nameEl.textContent = data.trainerName;
    notify.success('Dados salvos!');
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

  // Clear all
  document.getElementById('clearAllBtn')?.addEventListener('click', async () => {
    if (window.confirm('ATENÇÃO: Isso apagará TODOS os dados permanentemente. Deseja continuar?')) {
      if (window.confirm('Tem certeza? Essa ação NÃO pode ser desfeita!')) {
        const stores = ['students', 'workouts', 'exercises', 'assessments', 'biofeedback', 'anamnesis', 'cycles'];
        for (const s of stores) await db.clear(s);
        notify.success('Todos os dados foram removidos');
        navigateFn('/');
      }
    }
  });
}
