// ========================================
// PERSONAL PRO — Painel Admin
// Visível apenas para usuários com role=admin
// ========================================
import db from '../db.js';
import { isAdmin } from '../utils/roles.js';
import { notify } from '../components/toast.js';
import { Calc } from '../utils/calculations.js';

const ICON_DEL   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
const ICON_EDIT  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

export async function renderAdmin() {
  // Redirecionar se não for admin
  if (!(await isAdmin())) {
    return `
      <div class="page">
        <div class="empty-state" style="padding:80px 40px">
          <div style="font-size:3rem;margin-bottom:16px">🔒</div>
          <h2>Acesso Restrito</h2>
          <p class="text-muted">Esta área é exclusiva para administradores do sistema.</p>
          <p class="text-xs text-muted mt-sm">Contate o suporte se precisar de acesso de admin.</p>
        </div>
      </div>`;
  }

  // Buscar dados globais (sem filtro por trainer_id)
  const [students, workouts, sessions, assessments, biofeedback, financial, exercises, methods] = await Promise.all([
    db.getAllGlobal?.('students') || db.getAll('students'),
    db.getAll('workouts'),
    db.getAll('sessions'),
    db.getAll('assessments'),
    db.getAll('biofeedback'),
    db.getAll('financial'),
    db.getAll('exercises'),
    db.getAll('methods'),
  ]);

  const active     = students.filter(s=>s.status==='Ativo');
  const completed  = sessions.filter(s=>s.status==='completed');
  const paidMonth  = financial.filter(f=>f.status==='paid' && new Date(f.paidDate||f.dueDate||0).getMonth()===new Date().getMonth());
  const totalRev   = paidMonth.reduce((t,f)=>t+(f.amount||0),0);
  const defaultEx  = exercises.filter(e=>e.is_default);
  const userEx     = exercises.filter(e=>!e.is_default);
  const defaultMet = methods.filter(m=>m.is_default);

  return `
    <div class="page-header">
      <div>
        <h1>Painel Administrativo</h1>
        <p class="subtitle">Visão global do sistema Personal PRO</p>
      </div>
      <span class="badge" style="background:rgba(239,68,68,0.15);color:var(--danger);font-size:0.75rem;padding:4px 10px">
        Admin
      </span>
    </div>

    <!-- Stats globais -->
    <div class="stats-grid" style="margin-bottom:20px">
      ${[
        ['ALUNOS ATIVOS',   active.length,    'text-gradient', `de ${students.length} total`],
        ['SESSÕES TOTAL',   completed.length, 'primary',       'realizadas'],
        ['RECEITA MÊS',     `R$ ${Math.round(totalRev).toLocaleString('pt-BR')}`, 'success', 'recebido'],
        ['EXERCÍCIOS',      exercises.length, 'accent',        `${defaultEx.length} padrão + ${userEx.length} custom`],
        ['AVALIAÇÕES',      assessments.length,'warning',      'registradas'],
      ].map(([l,v,c,s])=>`
        <div class="stat-card" style="text-align:center;padding:12px">
          <div class="stat-label">${l}</div>
          <div class="stat-value ${c.startsWith('text')?c:''}" ${!c.startsWith('text')?`style="color:var(--${c})"`:''}>${v}</div>
          <div class="stat-change">${s}</div>
        </div>`).join('')}
    </div>

    <!-- Tabs -->
    <div class="tabs" id="adminTabs">
      <button class="tab active" data-tab="exercicios">Exercícios Padrão</button>
      <button class="tab" data-tab="metodos">Métodos Padrão</button>
      <button class="tab" data-tab="alunos">Todos os Alunos</button>
      <button class="tab" data-tab="sistema">Sistema</button>
    </div>

    <!-- Exercícios padrão -->
    <div id="tab-exercicios" class="admin-panel">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Exercícios Padrão do Sistema</span>
          <div class="flex gap-sm">
            <span class="text-xs text-muted">${defaultEx.length} exercícios · visíveis para todos os usuários</span>
            <button class="btn btn-primary btn-sm" id="addDefaultExBtn">+ Adicionar</button>
          </div>
        </div>
        <p class="text-xs text-muted mb-md" style="padding:0 4px">
          Exercícios marcados como padrão (<code>is_default: true</code>) aparecem para <strong>todos</strong> os personals. 
          Apenas admins podem editar ou excluir.
        </p>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Nome</th><th>Grupo Muscular</th><th>Categoria</th><th>Tipo de Carga</th><th>Padrão?</th><th></th></tr></thead>
            <tbody>
              ${defaultEx.slice(0,50).map(e=>`
                <tr>
                  <td style="font-weight:600">${e.name}</td>
                  <td>${e.muscleGroup||'—'}</td>
                  <td>${e.category||'—'}</td>
                  <td><span class="badge badge-info" style="font-size:0.7rem">${e.loadType||'weight'}</span></td>
                  <td><span class="badge badge-success" style="font-size:0.7rem">✓ Padrão</span></td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-ghost btn-sm edit-def-ex" data-id="${e.id}" style="padding:3px 5px;color:var(--text-muted)">${ICON_EDIT}</button>
                      <button class="btn btn-ghost btn-sm del-def-ex" data-id="${e.id}" style="padding:3px 5px;color:var(--danger)">${ICON_DEL}</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${defaultEx.length>50?`<p class="text-xs text-muted mt-sm" style="padding:0 4px">Mostrando 50 de ${defaultEx.length}. Use a busca para filtrar.</p>`:''}
      </div>
    </div>

    <!-- Métodos padrão -->
    <div id="tab-metodos" class="admin-panel" style="display:none">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Métodos de Treino Padrão</span>
          <span class="text-xs text-muted">${defaultMet.length} métodos padrão · ${methods.length} total</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Método</th><th>Categoria</th><th>Séries</th><th>Reps</th><th>Descanso</th><th>Padrão?</th></tr></thead>
            <tbody>
              ${methods.map(m=>`
                <tr>
                  <td style="font-weight:600">${m.name}</td>
                  <td>${m.category||'—'}</td>
                  <td>${m.sets||'—'}</td>
                  <td style="font-size:0.8rem">${m.repsHint||'—'}</td>
                  <td style="font-size:0.8rem">${m.restHint||'—'}</td>
                  <td>${m.is_default?`<span class="badge badge-success" style="font-size:0.7rem">✓</span>`:`<span class="badge badge-warning" style="font-size:0.7rem">Custom</span>`}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Todos os alunos -->
    <div id="tab-alunos" class="admin-panel" style="display:none">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Todos os Alunos</span>
          <span class="text-xs text-muted">${active.length} ativos · ${students.length} total</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Aluno</th><th>Status</th><th>Objetivo</th><th>Sessões</th><th>Última Sessão</th><th>Mensalidade</th></tr></thead>
            <tbody>
              ${students.sort((a,b)=>a.name?.localeCompare(b.name)).map(s=>{
                const sSess = sessions.filter(x=>x.studentId===s.id&&x.status==='completed');
                const last  = sSess.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
                const fin   = financial.filter(f=>f.studentId===s.id&&f.status!=='paid');
                return `<tr>
                  <td>
                    <div class="flex items-center gap-sm">
                      <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">
                        ${s.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style="font-size:0.85rem;font-weight:600">${s.name}</div>
                        <div style="font-size:0.7rem;color:var(--text-muted)">${s.code||''}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-${s.status==='Ativo'?'success':'warning'}">${s.status||'—'}</span></td>
                  <td style="font-size:0.82rem">${s.goal||'—'}</td>
                  <td style="text-align:center"><strong style="color:var(--primary)">${sSess.length}</strong></td>
                  <td style="font-size:0.78rem">${last?Calc.formatDate(last.date):'Nunca'}</td>
                  <td style="font-size:0.78rem;color:${fin.length?'var(--danger)':'var(--success)'}">
                    ${fin.length?`${fin.length} pendente(s)`:'Em dia'}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sistema -->
    <div id="tab-sistema" class="admin-panel" style="display:none">
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Informações do Sistema</span></div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:0.85rem">
            ${[
              ['Versão',        '3.0.0'],
              ['Total alunos',  students.length],
              ['Total sessões', sessions.length],
              ['Total treinos', workouts.length],
              ['Exercícios padrão', defaultEx.length],
              ['Exercícios custom', userEx.length],
              ['Métodos padrão', defaultMet.length],
              ['Avaliações',    assessments.length],
              ['Registros BF',  biofeedback.length],
            ].map(([l,v])=>`
              <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg-page);border-radius:6px">
                <span class="text-muted">${l}</span>
                <strong>${v}</strong>
              </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Como definir papéis de usuário</span></div>
          <div style="font-size:0.82rem;line-height:1.7">
            <p class="text-muted mb-sm">Para tornar um usuário <strong>Admin</strong>:</p>
            <ol style="padding-left:18px;line-height:2">
              <li>Acesse o <strong>Supabase Dashboard</strong></li>
              <li>Vá em <strong>Authentication → Users</strong></li>
              <li>Selecione o usuário → <strong>Edit user</strong></li>
              <li>Em <strong>Raw App Meta Data</strong>, adicione:</li>
            </ol>
            <div style="background:var(--bg-page);border-radius:6px;padding:10px;margin:8px 0;font-family:monospace;font-size:0.8rem;border:1px solid var(--border-color)">
              { "role": "admin" }
            </div>
            <p class="text-muted">Para <strong>Personal Trainer</strong> (padrão):</p>
            <div style="background:var(--bg-page);border-radius:6px;padding:10px;margin:8px 0;font-family:monospace;font-size:0.8rem;border:1px solid var(--border-color)">
              { "role": "personal" }
            </div>
            <p class="text-xs text-muted mt-sm">
              ⚠️ O campo <code>app_metadata</code> só pode ser editado pelo admin — 
              o usuário não consegue alterar o próprio papel.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initAdmin(navigateFn) {
  // Tabs
  document.querySelectorAll('#adminTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#adminTabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-panel').forEach(p=>p.style.display='none');
      document.getElementById(`tab-${tab.dataset.tab}`)?.style.setProperty('display','');
    });
  });

  // Excluir exercício padrão
  document.querySelectorAll('.del-def-ex').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Excluir este exercício padrão? Ele sumirá para todos os usuários.')) return;
      await db.delete('exercises', btn.dataset.id);
      notify.success('Exercício padrão excluído.');
      navigateFn('/admin');
    });
  });
}
