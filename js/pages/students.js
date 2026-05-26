// ========================================
// PERSONAL PRO — Students Page (v2)
// Design limpo + SVG icons + dados úteis
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const ICON_WA = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

export async function renderStudents() {
  const [students, sessions, settings] = await Promise.all([
    db.getAll('students'),
    db.getAll('sessions'),
    db.get('settings', 'trainer').catch(() => ({}))
  ]);
  const trainerId = settings?.id || 'trainer';
  students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Enriquecer com dados de sessão
  const enriched = students.map(s => {
    const completed = sessions.filter(x => x.studentId === s.id && x.status === 'completed');
    const last = completed.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const daysSince = last ? Math.floor((Date.now() - new Date(last.date)) / 86400000) : null;
    return { ...s, _lastSession: last, _daysSince: daysSince, _totalSessions: completed.length };
  });

  return `
    <div class="page-header">
      <div>
        <h1>Alunos</h1>
        <p class="subtitle">${students.length} cadastrado(s) · ${students.filter(s => s.status === 'Ativo').length} ativo(s)</p>
      </div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <div style="position:relative">
          <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted)" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="studentSearch" class="form-input" placeholder="Buscar aluno..." style="padding-left:34px;min-width:200px" />
        </div>
        <button class="btn btn-primary" id="addStudentBtn">+ Novo Aluno</button>
      </div>
    </div>

    <div class="tabs" id="studentTabs">
      <button class="tab active" data-filter="all">Todos (${students.length})</button>
      <button class="tab" data-filter="Ativo">Ativos (${students.filter(s => s.status === 'Ativo').length})</button>
      <button class="tab" data-filter="Inativo">Inativos (${students.filter(s => s.status === 'Inativo').length})</button>
    </div>

    <div id="studentsList">
      ${enriched.length ? renderStudentCards(enriched, trainerId) : `
        <div class="empty-state">
          <div class="empty-icon">—</div>
          <h3>Nenhum aluno cadastrado</h3>
          <p>Clique em "Novo Aluno" para adicionar o primeiro</p>
          <button class="btn btn-primary mt-sm" id="addStudentBtnEmpty">+ Novo Aluno</button>
        </div>
      `}
    </div>
  `;
}

function renderStudentCards(students, trainerId = 'trainer') {
  return `<div class="students-grid stagger-children">${students.map(s => {
    const initials = s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const age = s.birthDate ? Calc.calcularIdade(s.birthDate) : s.age || null;
    const dayColor = s._daysSince === null ? 'var(--text-muted)' : s._daysSince > 14 ? 'var(--danger)' : s._daysSince > 7 ? 'var(--warning)' : 'var(--success)';
    const phone = s.phone?.replace(/\D/g, '') || '';
    const waUrl = phone ? `https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}` : null;

    return `
    <div class="card student-card" data-id="${s.id}" data-status="${s.status}" data-name="${s.name.toLowerCase()}">
      <div class="flex items-center gap-md mb-sm">
        <div class="avatar avatar-lg" style="font-size:1.1rem">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div class="text-muted text-xs">${s.code || ''}${age ? ` · ${age} anos` : ''}${s.gender ? ` · ${s.gender === 'M' ? 'Masc.' : 'Fem.'}` : ''}</div>
        </div>
        <span class="badge ${s.status === 'Ativo' ? 'badge-success' : 'badge-warning'}">${s.status}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
        ${s.goal ? `<div style="padding:6px 8px;background:var(--bg-page);border-radius:6px">
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">Objetivo</div>
          <div style="font-size:0.8rem;font-weight:600;margin-top:1px">${s.goal}</div>
        </div>` : ''}
        ${s.weeklyFrequency ? `<div style="padding:6px 8px;background:var(--bg-page);border-radius:6px">
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">Frequência</div>
          <div style="font-size:0.8rem;font-weight:600;margin-top:1px">${s.weeklyFrequency}</div>
        </div>` : ''}
        <div style="padding:6px 8px;background:var(--bg-page);border-radius:6px">
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">Último treino</div>
          <div style="font-size:0.8rem;font-weight:600;margin-top:1px;color:${dayColor}">
            ${s._daysSince === null ? '—' : s._daysSince === 0 ? 'Hoje' : `${s._daysSince}d atrás`}
          </div>
        </div>
        <div style="padding:6px 8px;background:var(--bg-page);border-radius:6px">
          <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">Total sessões</div>
          <div style="font-size:0.8rem;font-weight:600;margin-top:1px">${s._totalSessions}</div>
        </div>
      </div>

      <div class="flex gap-xs" style="border-top:1px solid var(--border-color);padding-top:10px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm view-student" data-id="${s.id}" title="Ver perfil" style="flex:1;min-width:45px;display:flex;align-items:center;justify-content:center;gap:4px;padding:4px">
          ${ICON_EYE} <span style="font-size:0.72rem">Ver</span>
        </button>
        <button class="btn btn-ghost btn-sm edit-student" data-id="${s.id}" title="Editar" style="flex:1;min-width:45px;display:flex;align-items:center;justify-content:center;gap:4px;padding:4px">
          ${ICON_EDIT} <span style="font-size:0.72rem">Editar</span>
        </button>
        <a href="#/portal/${s.id}?t=${trainerId}" target="_blank" class="btn btn-ghost btn-sm" title="Portal do Aluno" style="flex:1;min-width:55px;display:flex;align-items:center;justify-content:center;gap:4px;padding:4px;color:var(--primary);text-decoration:none">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span style="font-size:0.72rem">Portal</span>
        </a>
        ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn btn-ghost btn-sm" title="WhatsApp" style="flex:1;min-width:40px;display:flex;align-items:center;justify-content:center;gap:4px;padding:4px;color:#25d366;text-decoration:none">
          ${ICON_WA} <span style="font-size:0.72rem">WA</span>
        </a>` : ''}
        <button class="btn btn-ghost btn-sm delete-student" data-id="${s.id}" title="Excluir" style="color:var(--danger);padding:4px 6px">
          ${ICON_DELETE}
        </button>
      </div>
    </div>
    `}).join('')}</div>`;
}

function studentFormHTML(student = {}) {
  return `
    <form id="studentForm">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome Completo *</label>
          <input class="form-input" name="name" value="${student.name || ''}" required placeholder="Ex: João da Silva" />
        </div>
        <div class="form-group">
          <label class="form-label">Código</label>
          <input class="form-input" name="code" value="${student.code || ''}" placeholder="Ex: JOA-001" />
          <div class="form-hint">Deixe vazio para gerar automaticamente de forma sequencial</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data de Nascimento</label>
          <input class="form-input" name="birthDate" type="date" value="${student.birthDate || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Gênero</label>
          <select class="form-select" name="gender">
            <option value="">Selecione</option>
            <option value="M" ${student.gender === 'M' ? 'selected' : ''}>Masculino</option>
            <option value="F" ${student.gender === 'F' ? 'selected' : ''}>Feminino</option>
            <option value="Outro" ${student.gender === 'Outro' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Telefone / WhatsApp</label>
          <input class="form-input" name="phone" value="${student.phone || ''}" placeholder="(00) 00000-0000" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" name="email" type="email" value="${student.email || ''}" placeholder="email@exemplo.com" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Objetivo Principal</label>
          <select class="form-select" name="goal">
            <option value="">Selecione</option>
            ${['Hipertrofia','Emagrecimento','Condicionamento','Saúde','Reabilitação','Performance','Força Máxima','Qualidade de Vida'].map(g => `<option ${student.goal === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" name="status">
            <option value="Ativo" ${(!student.status || student.status === 'Ativo') ? 'selected' : ''}>Ativo</option>
            <option value="Inativo" ${student.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
            <option value="Em avaliação" ${student.status === 'Em avaliação' ? 'selected' : ''}>Em avaliação</option>
            <option value="Suspenso" ${student.status === 'Suspenso' ? 'selected' : ''}>Suspenso</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Frequência Semanal</label>
          <select class="form-select" name="weeklyFrequency" onchange="const val = parseInt(this.value); if(val) this.form.querySelector('[name=expectedSessions]').value = Math.round(val * 4.33);">
            <option value="">Selecione</option>
            ${[2,3,4,5,6].map(n => `<option value="${n}x por semana" ${student.weeklyFrequency === n+'x por semana' ? 'selected' : ''}>${n}x por semana</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Sessões Esperadas (Mês)</label>
          <input class="form-input" name="expectedSessions" type="number" min="1" max="31" value="${student.expectedSessions || ''}" placeholder="Ex: 12" title="Número de sessões pagas/esperadas por mês para cálculo preciso de Custo da Sessão" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Horário Preferido</label>
          <select class="form-select" name="preferredTime">
            <option value="">Selecione</option>
            ${['Manhã (5-9h)','Manhã (9-12h)','Tarde (12-17h)','Noite (17-22h)'].map(h => `<option ${student.preferredTime === h ? 'selected' : ''}>${h}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Peso atual (kg)</label>
          <input class="form-input" name="weight" type="number" step="0.1" value="${student.weight || ''}" placeholder="Ex: 75.5" />
        </div>
        <div class="form-group">
          <label class="form-label">Altura (cm)</label>
          <input class="form-input" name="height" type="number" value="${student.height || ''}" placeholder="Ex: 175" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Plano / Mensalidade (R$)</label>
          <input class="form-input" name="monthlyFee" type="number" step="0.01" value="${student.monthlyFee || ''}" placeholder="Ex: 250.00" />
        </div>
        <div class="form-group">
          <label class="form-label">Vencimento da Mensalidade</label>
          <input class="form-input" name="paymentDue" type="date" value="${student.paymentDue || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">PIN do Portal (4 dígitos)</label>
        <input class="form-input" name="portalPin" type="password" maxlength="4" pattern="[0-9]{4}" value="${student.portalPin || ''}" placeholder="Ex: 1234" />
        <div class="form-hint">Padrão: 1234</div>
      </div>
      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea class="form-textarea" name="notes" rows="3" placeholder="Lesões, restrições, preferências...">${student.notes || ''}</textarea>
      </div>
    </form>
  `;
}

async function viewStudentHTML(student) {
  const age = student.birthDate ? Calc.calcularIdade(student.birthDate) : student.age || '-';
  const [workouts, assessments, bfData, sessions, settings] = await Promise.all([
    db.getAll('workouts').then(w => w.filter(x => x.studentId === student.id).sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5)),
    db.getAll('assessments').then(a => a.filter(x => x.studentId === student.id).sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,3)),
    db.getAll('biofeedback').then(b => b.filter(x => x.studentId === student.id).sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5)),
    db.getAll('sessions').then(s => s.filter(x => x.studentId === student.id && x.status === 'completed')),
    db.get('settings', 'trainer').catch(() => ({})),
  ]);

  const totalVol = sessions.reduce((t, s) => t + (s.totalVolume || 0), 0);
  const avgPse   = sessions.filter(s => s.postBiofeedback?.pse).length
    ? (sessions.filter(s => s.postBiofeedback?.pse).reduce((t,s) => t + s.postBiofeedback.pse, 0) / sessions.filter(s => s.postBiofeedback?.pse).length).toFixed(1)
    : '-';
  const phone = student.phone?.replace(/\D/g,'') || '';
  const waUrl = phone ? `https://wa.me/${phone.startsWith('55') ? phone : '55'+phone}` : null;
  const trainerId = settings?.id || 'trainer';
  const portalUrl = `${window.location.origin}${window.location.pathname}#/portal/${student.id}?t=${trainerId}`;

  return `
    <div class="flex items-center gap-lg mb-lg" style="flex-wrap:wrap">
      <div class="avatar" style="width:64px;height:64px;font-size:1.4rem">
        ${student.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}
      </div>
      <div style="flex:1">
        <h2 style="margin:0 0 4px">${student.name}</h2>
        <div class="flex gap-sm items-center flex-wrap">
          <span class="text-muted text-sm">${student.code || ''}</span>
          <span class="badge ${student.status === 'Ativo' ? 'badge-success' : 'badge-warning'}">${student.status}</span>
          ${student.goal ? `<span class="badge badge-info">${student.goal}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-sm" style="flex-wrap:wrap;align-items:center">
        ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn btn-secondary btn-sm" style="color:#25d366;border-color:#25d366;padding:4px 8px">WhatsApp</a>` : ''}
        <a href="#/portal/${student.id}?t=${trainerId}" target="_blank" class="btn btn-secondary btn-sm" style="color:var(--primary);border-color:var(--primary);padding:4px 8px">Portal do Aluno</a>
        <button class="btn btn-ghost btn-sm" style="padding:4px 8px" onclick="navigator.clipboard.writeText('${portalUrl}'); notify.success('Link do portal copiado!');">Copiar Link</button>
        <a href="#/tracker" class="btn btn-primary btn-sm" style="padding:4px 8px">▶ Treino</a>
      </div>
    </div>

    <!-- Stats rápidas -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
      ${[
        { label: 'Idade', value: age !== '-' ? age + ' anos' : '-' },
        { label: 'Sessões', value: String(sessions.length) },
        { label: 'Volume Total', value: totalVol > 0 ? (totalVol/1000).toFixed(1) + 't' : '-' },
        { label: 'PSE Médio', value: String(avgPse) },
      ].map(s => `<div style="text-align:center;padding:10px 8px;background:var(--bg-page);border-radius:8px">
        <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted)">${s.label}</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--primary);margin-top:2px">${s.value}</div>
      </div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${student.phone ? `<div class="text-sm"><span class="text-muted">Telefone:</span> ${student.phone}</div>` : ''}
      ${student.email ? `<div class="text-sm"><span class="text-muted">Email:</span> ${student.email}</div>` : ''}
      ${student.weight ? `<div class="text-sm"><span class="text-muted">Peso:</span> ${student.weight}kg</div>` : ''}
      ${student.height ? `<div class="text-sm"><span class="text-muted">Altura:</span> ${student.height}cm</div>` : ''}
      ${student.weeklyFrequency ? `<div class="text-sm"><span class="text-muted">Frequência:</span> ${student.weeklyFrequency}</div>` : ''}
      ${student.preferredTime ? `<div class="text-sm"><span class="text-muted">Horário:</span> ${student.preferredTime}</div>` : ''}
      ${student.paymentDue ? `<div class="text-sm"><span class="text-muted">Vencimento:</span> ${Calc.formatDate(student.paymentDue)}</div>` : ''}
      ${student.portalPin ? `<div class="text-sm"><span class="text-muted">PIN Portal:</span> <code>${student.portalPin}</code></div>` : ''}
    </div>
    ${student.notes ? `<div class="mb-md"><span class="text-muted text-sm">Observações:</span><p class="text-sm" style="margin-top:4px">${student.notes}</p></div>` : ''}

    <!-- Treinos recentes -->
    <div style="border-top:1px solid var(--border-color);padding-top:14px;margin-top:8px">
      <div class="flex items-center justify-between mb-sm">
        <h4 style="margin:0">Treinos Recentes</h4>
        <a href="#/treinos" class="btn btn-ghost btn-sm">Ver todos →</a>
      </div>
      ${workouts.length ? `<table class="data-table" style="font-size:0.82rem">
        <thead><tr><th>Treino</th><th>Data</th><th>Exercícios</th></tr></thead>
        <tbody>${workouts.map(w => `<tr>
          <td><strong>${w.name}</strong>${w.cycle ? ` <span class="text-muted text-xs">(${w.cycle})</span>` : ''}</td>
          <td>${Calc.formatDate(w.date)}</td>
          <td>${(w.exercises||[]).length}</td>
        </tr>`).join('')}</tbody></table>`
      : '<p class="text-muted text-sm">Nenhum treino cadastrado</p>'}
    </div>

    <!-- Avaliações -->
    <div style="border-top:1px solid var(--border-color);padding-top:14px;margin-top:12px">
      <div class="flex items-center justify-between mb-sm">
        <h4 style="margin:0">Avaliações</h4>
        <a href="#/avaliacoes" class="btn btn-ghost btn-sm">Ver todas →</a>
      </div>
      ${assessments.length ? `<table class="data-table" style="font-size:0.82rem">
        <thead><tr><th>Tipo</th><th>Data</th><th>Peso</th><th>BF%</th><th>1RM</th></tr></thead>
        <tbody>${assessments.map(a => `<tr>
          <td><span class="badge badge-info">${a.type || 'Geral'}</span></td>
          <td>${Calc.formatDate(a.date)}</td>
          <td>${a.peso ? a.peso+'kg' : '-'}</td>
          <td>${a.percentualGordura ? a.percentualGordura+'%' : '-'}</td>
          <td>${a.rm1 ? a.rm1+'kg' : '-'}</td>
        </tr>`).join('')}</tbody></table>`
      : '<p class="text-muted text-sm">Nenhuma avaliação registrada</p>'}
    </div>

    <!-- Biofeedback -->
    <div style="border-top:1px solid var(--border-color);padding-top:14px;margin-top:12px">
      <div class="flex items-center justify-between mb-sm">
        <h4 style="margin:0">Biofeedback Recente</h4>
        <a href="#/biofeedback" class="btn btn-ghost btn-sm">Ver todos →</a>
      </div>
      ${bfData.length ? `<table class="data-table" style="font-size:0.82rem">
        <thead><tr><th>Data</th><th>Ciclo</th><th>Sono</th><th>TQR</th><th>Alim</th><th>Estresse</th><th>Dor</th><th>PSE</th><th>Carga</th></tr></thead>
        <tbody>${bfData.map(b => `<tr>
          <td>${Calc.formatDate(b.date)}</td>
          <td><strong>${b.cycle || 'Geral'}</strong></td>
          <td style="color:${(b.sleep||0)<5?'var(--danger)':(b.sleep||0)<7?'var(--warning)':'var(--success)'}">${b.sleep||'-'}</td>
          <td style="color:${(b.tqr || b.energy || 0)<5?'var(--danger)':(b.tqr || b.energy || 0)<7?'var(--warning)':'var(--success)'}">${b.tqr || b.energy || '-'}</td>
          <td style="color:${(b.food||0)<=2?'var(--danger)':(b.food||0)<=3?'var(--warning)':'var(--success)'}"><strong>${b.food ? b.food+'/5' : '-'}</strong></td>
          <td style="color:${(b.stress||0)>=8?'var(--danger)':(b.stress||0)>=6?'var(--warning)':'inherit'}">${b.stress||'-'}</td>
          <td style="color:${(b.pain||0)>=5?'var(--danger)':(b.pain||0)>=3?'var(--warning)':'inherit'}">${b.pain||'-'}</td>
          <td style="color:${(b.pse||0)>8?'var(--danger)':(b.pse||0)>6?'var(--warning)':'var(--success)'}"><strong>${b.pse||'-'}</strong></td>
          <td>${b.trainingLoad||'-'}</td>
        </tr>`).join('')}</tbody></table>`
      : '<p class="text-muted text-sm">Nenhum registro de biofeedback</p>'}
    </div>

    <div class="flex gap-sm mt-lg" style="border-top:1px solid var(--border-color);padding-top:14px;flex-wrap:wrap">
      <a href="#/relatorios" class="btn btn-secondary btn-sm">Relatório Completo</a>
      <a href="#/periodizacao" class="btn btn-secondary btn-sm">Periodização</a>
      <a href="#/agenda" class="btn btn-secondary btn-sm">Agenda</a>
    </div>
  `;
}

export function initStudents(navigateFn) {
  // Add student
  const openAddModal = () => openModal({
    title: '+ Novo Aluno', size: 'lg',
    preventBackdropClose: true,
    content: studentFormHTML(),
    actions: [
      { label: 'Cancelar', class: 'btn-secondary', id: 'cancelAdd', onClick: () => closeModal() },
      {
        label: 'Salvar', class: 'btn-primary', id: 'saveStudent', onClick: async () => {
          const fd = new FormData(document.getElementById('studentForm'));
          const data = Object.fromEntries(fd);
          if (!data.name) { notify.error('Nome é obrigatório'); return; }
          if (!data.code) {
            // Geração de código sequencial único: 3 letras do nome + contador padded
            const allStudents = await db.getAll('students');
            const prefix = data.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
            let num = allStudents.length + 1;
            let code;
            do {
              code = prefix + '-' + String(num).padStart(3, '0');
              num++;
            } while (allStudents.some(s => s.code === code));
            data.code = code;
          }
          if (data.birthDate) data.age = Calc.calcularIdade(data.birthDate);
          data.createdAt = new Date().toISOString();
          await db.add('students', data);
          notify.success(`${data.name} cadastrado!`);
          closeModal();
          navigateFn('/alunos');
        }
      }
    ]
  });

  document.getElementById('addStudentBtn')?.addEventListener('click', openAddModal);
  document.getElementById('addStudentBtnEmpty')?.addEventListener('click', openAddModal);

  // Search
  document.getElementById('studentSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.student-card').forEach(card => {
      card.style.display = card.dataset.name.includes(q) ? '' : 'none';
    });
  });

  // Tabs
  document.querySelectorAll('#studentTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#studentTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      document.querySelectorAll('.student-card').forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.status === filter) ? '' : 'none';
      });
    });
  });

  // View
  document.querySelectorAll('.view-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('students', btn.dataset.id);
      if (s) openModal({ title: s.name, content: await viewStudentHTML(s), size: 'xl' });
    });
  });

  // Edit
  document.querySelectorAll('.edit-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('students', btn.dataset.id);
      if (!s) return;
      openModal({
        title: 'Editar Aluno', size: 'lg',
        preventBackdropClose: true,
        content: studentFormHTML(s),
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelEdit', onClick: () => closeModal() },
          {
            label: 'Salvar', class: 'btn-primary', id: 'saveEdit', onClick: async () => {
              const fd = new FormData(document.getElementById('studentForm'));
              const data = { ...s, ...Object.fromEntries(fd) };
              if (data.birthDate) data.age = Calc.calcularIdade(data.birthDate);
              await db.put('students', data);
              notify.success('Aluno atualizado!');
              closeModal();
              navigateFn('/alunos');
            }
          }
        ]
      });
    });
  });

  // Delete
  document.querySelectorAll('.delete-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('students', btn.dataset.id);
      if (!s) return;
      if (window.confirm(`Excluir ${s.name}? Todos os dados associados serão removidos.`)) {
        await db.delete('students', s.id);
        notify.success('Aluno removido');
        navigateFn('/alunos');
      }
    });
  });
}
