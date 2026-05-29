// ========================================
// PERSONAL PRO — Anamnesis Page (v2)
// Design limpo · Link com trainerId · Visualização completa
// ========================================
import db from '../db.js';
import { notify } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { Calc } from '../utils/calculations.js';

const ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_USER = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const ICON_DEL  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
const ICON_WA   = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

export const ANAMNESIS_QUESTIONS = [
  { section: 'Dados Pessoais', fields: [
    { name: 'fullName',     label: 'Nome Completo',                           type: 'text',    required: true },
    { name: 'birthDate',    label: 'Data de Nascimento',                      type: 'date',    required: true },
    { name: 'gender',       label: 'Gênero',                                  type: 'select',  options: ['Masculino','Feminino','Outro'] },
    { name: 'phone',        label: 'Telefone / WhatsApp',                     type: 'tel' },
    { name: 'email',        label: 'E-mail',                                  type: 'email' },
    { name: 'occupation',   label: 'Profissão / Ocupação',                    type: 'text' },
  ]},
  { section: 'Histórico de Saúde', fields: [
    { name: 'conditions',    label: 'Possui condição médica? (diabetes, hipertensão, etc.)', type: 'textarea' },
    { name: 'medications',   label: 'Toma medicação regular?',                type: 'textarea' },
    { name: 'surgeries',     label: 'Já fez cirurgia?',                       type: 'textarea' },
    { name: 'injuries',      label: 'Lesões ou dores articulares/musculares?',type: 'textarea' },
    { name: 'familyHistory', label: 'Histórico familiar de cardiopatias, AVC ou diabetes?', type: 'select', options: ['Sim','Não','Não sei'] },
    { name: 'smoker',        label: 'Fumante?',                               type: 'select',  options: ['Não','Sim','Ex-fumante'] },
    { name: 'alcohol',       label: 'Consome bebidas alcoólicas?',            type: 'select',  options: ['Não','Raramente','Moderadamente','Frequentemente'] },
  ]},
  { section: 'Atividade Física', fields: [
    { name: 'currentActivity', label: 'Pratica exercícios atualmente?',        type: 'select', options: ['Sim, regularmente','Sim, esporadicamente','Não pratico'] },
    { name: 'activityType',    label: 'Que tipo de exercício pratica / já praticou?', type: 'textarea' },
    { name: 'frequency',       label: 'Quantas vezes por semana pode treinar?',type: 'select', options: ['2x','3x','4x','5x','6x'] },
    { name: 'experience',      label: 'Experiência com musculação',            type: 'select', options: ['Nunca treinei','Iniciante (< 6 meses)','Intermediário (6m–2 anos)','Avançado (> 2 anos)'] },
    { name: 'timeAvailable',   label: 'Tempo disponível por sessão',           type: 'select', options: ['30–45 min','45–60 min','60–75 min','75–90 min','> 90 min'] },
  ]},
  { section: 'Objetivos e Estilo de Vida', fields: [
    { name: 'mainGoal',     label: 'Objetivo principal',                       type: 'select', options: ['Hipertrofia','Emagrecimento','Condicionamento','Saúde / Qualidade de Vida','Reabilitação','Performance Esportiva'] },
    { name: 'goalDetail',   label: 'Descreva seu objetivo com detalhes',       type: 'textarea' },
    { name: 'sleepHours',   label: 'Horas de sono por noite (média)',          type: 'select', options: ['Menos de 5h','5–6h','6–7h','7–8h','Mais de 8h'] },
    { name: 'sleepQuality', label: 'Qualidade do sono',                        type: 'select', options: ['Ruim','Regular','Bom','Excelente'] },
    { name: 'stressLevel',  label: 'Nível de estresse no dia a dia',           type: 'select', options: ['Baixo','Moderado','Alto','Muito alto'] },
    { name: 'nutrition',    label: 'Como é sua alimentação?',                  type: 'select', options: ['Equilibrada','Razoável','Desregulada','Faço acompanhamento nutricional'] },
    { name: 'hydration',    label: 'Consumo diário de água (litros)',          type: 'select', options: ['Menos de 1L','1–2L','2–3L','Mais de 3L'] },
  ]},
  { section: 'Informações Adicionais', fields: [
    { name: 'additionalNotes',   label: 'Algo mais que gostaria de informar?', type: 'textarea' },
    { name: 'preferredSchedule', label: 'Horário preferido de treino',         type: 'select', options: ['Manhã (5–9h)','Meio-dia (11–14h)','Tarde (14–18h)','Noite (18–22h)'] },
  ]},
];

function initials(name = '') {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

export async function renderAnamnesis() {
  const submissions = await db.getAll('anamnesis');
  submissions.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  const converted = submissions.filter(s => s._converted).length;

  return `
    <div class="page-header">
      <div>
        <h1>Anamnese</h1>
        <p class="subtitle">Formulário de pré-avaliação enviado ao aluno antes da primeira sessão</p>
      </div>
      <button class="btn btn-primary" id="genAnamneseLinkBtn">Gerar Link</button>
    </div>

    <div class="card mb-lg" style="border-left:3px solid var(--primary);background:rgba(16,185,129,0.03)">
      <div class="flex gap-md items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <div>
          <h4 style="margin:0 0 4px">Como funciona</h4>
          <p class="text-sm text-muted" style="line-height:1.6">
            Clique em <strong>Gerar Link</strong> e envie ao possível aluno via WhatsApp ou e-mail.
            Ele preenche 35 perguntas no próprio celular. Ao receber, clique em
            <strong>Cadastrar Aluno</strong> para converter automaticamente em cadastro completo.
          </p>
        </div>
      </div>
    </div>

    ${submissions.length ? `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">RECEBIDAS</div>
        <div class="stat-value text-gradient">${submissions.length}</div>
        <div class="stat-change">anamneses</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">CONVERTIDAS</div>
        <div class="stat-value" style="color:var(--success)">${converted}</div>
        <div class="stat-change">alunos cadastrados</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">PENDENTES</div>
        <div class="stat-value" style="color:var(--warning)">${submissions.length - converted}</div>
        <div class="stat-change">aguardando</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Formulários Recebidos</span>
        <span class="text-xs text-muted">${submissions.length} registro(s)</span>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Aluno</th><th>Recebido</th><th>Objetivo</th><th>Experiência</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${submissions.map(s => `<tr>
              <td>
                <div class="flex items-center gap-sm">
                  <div class="avatar avatar-sm">${initials(s.fullName)}</div>
                  <div>
                    <div style="font-weight:600;font-size:0.88rem">${s.fullName || '—'}</div>
                    ${s.phone ? `<div class="text-xs text-muted">${s.phone}</div>` : ''}
                  </div>
                </div>
              </td>
              <td style="font-size:0.82rem">${s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('pt-BR') : '—'}</td>
              <td>${s.mainGoal ? `<span class="badge badge-info">${s.mainGoal}</span>` : '—'}</td>
              <td style="font-size:0.82rem">${s.experience || '—'}</td>
              <td>${s._converted ? `<span class="badge badge-success">Cadastrado</span>` : `<span class="badge badge-warning">Pendente</span>`}</td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm view-anamnese" data-id="${s.id}" title="Ver" style="padding:4px 6px;color:var(--accent)">${ICON_EYE}</button>
                  ${!s._converted ? `<button class="btn btn-primary btn-sm convert-anamnese" data-id="${s.id}" style="padding:4px 8px;display:flex;align-items:center;gap:4px;font-size:0.78rem">${ICON_USER} Cadastrar</button>` : ''}
                  ${s.phone ? `<a href="https://wa.me/${(s.phone||'').replace(/\D/g,'')}" target="_blank" class="btn btn-ghost btn-sm" style="padding:4px 6px;color:#25d366">${ICON_WA}</a>` : ''}
                  <button class="btn btn-ghost btn-sm del-anamnese" data-id="${s.id}" style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : `
    <div class="empty-state">
      <div class="empty-icon">—</div>
      <h3>Nenhuma anamnese recebida ainda</h3>
      <p>Gere um link e envie para seu próximo aluno</p>
      <button class="btn btn-primary mt-sm" id="genAnamneseLinkBtnEmpty">Gerar Link de Anamnese</button>
    </div>`}
  `;
}

export function initAnamnesis(navigateFn) {
  const openLinkModal = async () => {
    const { getCurrentUser } = await import('../utils/auth.js');
    const user = await getCurrentUser();
    if (!user) { notify.error('Você precisa estar logado'); return; }
    const baseUrl = window.location.href.split('#')[0];
    const url = `${baseUrl}#/form/anamnese?trainer=${user.id}`;
    navigator.clipboard?.writeText(url);
    notify.success('Link copiado!');
    openModal({
      title: 'Link de Anamnese', size: 'md',
      preventBackdropClose: true,
      content: `
        <p class="text-muted text-sm mb-md">Envie ao aluno. Ele preenche no celular e os dados chegam aqui automaticamente.</p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <input class="form-input" value="${url}" readonly onclick="this.select()" style="flex:1;font-size:0.78rem" />
          <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${url}');this.textContent='✓'">Copiar</button>
        </div>
        <a href="https://wa.me/?text=${encodeURIComponent('Olá! Antes da nossa primeira sessão, preencha sua anamnese: ' + url)}"
           target="_blank" class="btn btn-secondary btn-sm" style="display:flex;align-items:center;gap:6px;width:fit-content">
          ${ICON_WA} Enviar via WhatsApp
        </a>`,
      actions: [{ label: 'Fechar', class: 'btn-primary', onClick: () => closeModal() }]
    });
  };

  document.getElementById('genAnamneseLinkBtn')?.addEventListener('click', openLinkModal);
  document.getElementById('genAnamneseLinkBtnEmpty')?.addEventListener('click', openLinkModal);

  document.querySelectorAll('.view-anamnese').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('anamnesis', btn.dataset.id);
      if (!s) return;
      const html = `
        <div class="flex items-center gap-md mb-lg">
          <div class="avatar">${initials(s.fullName)}</div>
          <div>
            <h3 style="margin:0">${s.fullName || '—'}</h3>
            <p class="text-muted text-xs">${s.submittedAt ? 'Recebido em ' + new Date(s.submittedAt).toLocaleDateString('pt-BR') : ''}</p>
          </div>
        </div>
        ${ANAMNESIS_QUESTIONS.map(sec => `
          <div style="margin-bottom:16px">
            <h4 style="color:var(--primary);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border-color)">${sec.section}</h4>
            ${sec.fields.map(f => {
              const val = s[f.name];
              if (!val) return '';
              return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-color);font-size:0.82rem">
                <span class="text-muted">${f.label}</span>
                <strong style="text-align:right;max-width:55%">${val}</strong>
              </div>`;
            }).filter(Boolean).join('')}
          </div>`).join('')}`;
      openModal({
        title: `Anamnese — ${s.fullName || 'Aluno'}`, size: 'lg', content: html,
        actions: [{ label: 'Fechar', class: 'btn-primary', onClick: () => closeModal() }]
      });
    });
  });

  document.querySelectorAll('.convert-anamnese').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('anamnesis', btn.dataset.id);
      if (!s) return;
      const code = (s.fullName || 'ALU').substring(0, 3).toUpperCase() + '-' + (Math.floor(Math.random() * 900) + 100);
      await db.add('students', {
        name:            s.fullName || '',
        code,
        birthDate:       s.birthDate || '',
        age:             s.birthDate ? Calc.calcularIdade(s.birthDate) : null,
        gender:          s.gender === 'Masculino' ? 'M' : s.gender === 'Feminino' ? 'F' : '',
        phone:           s.phone || '',
        email:           s.email || '',
        goal:            s.mainGoal || '',
        weeklyFrequency: s.frequency ? s.frequency + ' por semana' : '',
        preferredTime:   s.preferredSchedule || '',
        status:          'Ativo',
        notes: [
          s.conditions  ? `Condições: ${s.conditions}`  : '',
          s.medications ? `Medicações: ${s.medications}` : '',
          s.injuries    ? `Lesões: ${s.injuries}`        : '',
          `Experiência: ${s.experience || '-'}`,
          `Anamnese: ${new Date(s.submittedAt).toLocaleDateString('pt-BR')}`,
        ].filter(Boolean).join('. '),
      });
      await db.put('anamnesis', { ...s, _converted: true });
      notify.success(`✓ ${s.fullName} cadastrado como aluno!`);
      navigateFn('/alunos');
    });
  });

  document.querySelectorAll('.del-anamnese').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir esta anamnese?')) {
        await db.delete('anamnesis', btn.dataset.id);
        notify.success('Excluída.'); navigateFn('/anamnese');
      }
    });
  });
}

const ANA_SUPABASE_URL = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const ANA_SUPABASE_ANON = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

const ANAMNESE_CSS = `
  *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
  body{margin:0;font-family:-apple-system,'Segoe UI',sans-serif;background:#080c12}
  .ana-page{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;background:#080c12;padding:0 0 60px}
  .ana-card{background:#0f1420;width:100%;max-width:580px;min-height:100vh}
  .ana-header{padding:20px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);position:relative;overflow:hidden}
  .ana-header::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#059669,#10b981,#34d399)}
  .ana-header h2{margin:0;color:#10b981;font-size:1.2rem;font-weight:800}
  .ana-header h2 strong{color:#34d399}
  .ana-header p{margin:6px 0 0;font-size:0.78rem;color:#475569;text-transform:uppercase;letter-spacing:0.05em;font-weight:500}
  .ana-body{padding:24px}
  .ana-intro{padding:10px 14px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.15);border-radius:8px;margin-bottom:20px;font-size:0.82rem;color:#64748b;line-height:1.5}
  .ana-section{margin:22px 0 12px;color:#10b981;font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid rgba(255,255,255,0.07);padding-bottom:6px}
  .ana-group{margin-bottom:14px}
  .ana-label{font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;display:block}
  .ana-input,.ana-select,.ana-textarea{
    width:100%;padding:11px 13px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);
    border-radius:9px;color:#e2e8f0;font-size:0.88rem;font-family:inherit;transition:border-color 0.15s;
  }
  .ana-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
  .ana-textarea{resize:vertical;min-height:64px}
  .ana-input:focus,.ana-select:focus,.ana-textarea:focus{outline:none;border-color:rgba(16,185,129,0.5);background:rgba(16,185,129,0.04)}
  .ana-input::placeholder,.ana-textarea::placeholder{color:#334155}
  .ana-submit{width:100%;padding:15px;background:#10b981;color:#fff;border:none;border-radius:12px;font-size:0.95rem;font-weight:700;cursor:pointer;margin-top:16px;transition:all 0.2s;box-shadow:0 4px 14px rgba(16,185,129,0.25)}
  .ana-submit:hover{background:#0ea472;transform:translateY(-1px)}
  .ana-submit:disabled{opacity:0.5;cursor:not-allowed;transform:none}
  .ana-success{text-align:center;padding:56px 24px}
  .ana-check{width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,0.15);border:2px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 18px}
  .ana-success h3{color:#f1f5f9;margin:0 0 8px}
  .ana-success p{color:#64748b;margin:0;font-size:0.9rem}

  /* LIGHT MODE */
  [data-theme="light"] .ana-page{background:#f1f5f9}
  [data-theme="light"] .ana-card{background:#ffffff;box-shadow:0 2px 16px rgba(0,0,0,0.07)}
  [data-theme="light"] .ana-header{border-bottom-color:rgba(0,0,0,0.07)}
  [data-theme="light"] .ana-header p{color:#64748b}
  [data-theme="light"] .ana-intro{background:rgba(16,185,129,0.05);border-color:rgba(16,185,129,0.2);color:#334155}
  [data-theme="light"] .ana-section{color:#059669;border-bottom-color:rgba(0,0,0,0.08)}
  [data-theme="light"] .ana-label{color:#475569}
  [data-theme="light"] .ana-input,
  [data-theme="light"] .ana-select,
  [data-theme="light"] .ana-textarea{background:rgba(0,0,0,0.02);border-color:rgba(0,0,0,0.1);color:#0f172a}
  [data-theme="light"] .ana-select{background-color:rgba(0,0,0,0.02)}
  [data-theme="light"] .ana-input:focus,
  [data-theme="light"] .ana-select:focus,
  [data-theme="light"] .ana-textarea:focus{border-color:rgba(16,185,129,0.5);background:rgba(16,185,129,0.03)}
  [data-theme="light"] .ana-input::placeholder,
  [data-theme="light"] .ana-textarea::placeholder{color:#94a3b8}
  [data-theme="light"] .ana-success h3{color:#0f172a}
  [data-theme="light"] .ana-success p{color:#64748b}
`;

export async function renderAnamneseForm() {
  return `
    <style>${ANAMNESE_CSS}</style>
    <div class="ana-page">
      <div class="ana-card">
        <div class="ana-header">
          <h2>Personal<strong>PRO</strong></h2>
          <p>Formulário de Anamnese</p>
        </div>
        <div class="ana-body">
          <div class="ana-intro">
            Preencha com atenção. Suas respostas ajudarão o treinador a criar o programa ideal para você.
          </div>
          <form id="anamneseForm">
            ${ANAMNESIS_QUESTIONS.map(sec => `
              <div class="ana-section">${sec.section}</div>
              ${sec.fields.map(f => {
                if (f.type === 'select') return `<div class="ana-group"><label class="ana-label">${f.label}${f.required ? ' *' : ''}</label><select class="ana-select" name="${f.name}" ${f.required ? 'required' : ''}><option value="">Selecione...</option>${f.options.map(o => `<option>${o}</option>`).join('')}</select></div>`;
                if (f.type === 'textarea') return `<div class="ana-group"><label class="ana-label">${f.label}</label><textarea class="ana-textarea" name="${f.name}" rows="2" placeholder="Descreva..."></textarea></div>`;
                return `<div class="ana-group"><label class="ana-label">${f.label}${f.required ? ' *' : ''}</label><input class="ana-input" name="${f.name}" type="${f.type}" ${f.required ? 'required' : ''} placeholder="" /></div>`;
              }).join('')}
            `).join('')}
            <button type="submit" id="anamneseSubmit" class="ana-submit">Enviar Anamnese</button>
          </form>
          <div id="anamneseSuccess" style="display:none">
            <div class="ana-success">
              <div class="ana-check"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
              <h3>Anamnese Enviada!</h3>
              <p>Seus dados foram enviados ao treinador. Obrigado!</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

export function initAnamneseForm() {
  document.getElementById('anamneseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('anamneseSubmit');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
      const fd   = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.submittedAt = new Date().toISOString();
      data.id = 'ana_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

      // Extract trainerId from URL hash (?trainer=...)
      const hashQuery = window.location.hash.split('?')[1] || '';
      const tid = new URLSearchParams(hashQuery).get('trainer') || '';
      if (tid) data.trainer_id = tid;

      // Save directly to Supabase via REST API (no auth needed)
      const row = {
        id:         data.id,
        trainer_id: tid || null,
        data:       { ...data },
      };

      const res = await fetch(`${ANA_SUPABASE_URL}/rest/v1/anamnesis`, {
        method: 'POST',
        headers: {
          'apikey':        ANA_SUPABASE_ANON,
          'Authorization': `Bearer ${ANA_SUPABASE_ANON}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal,resolution=merge-duplicates',
        },
        body: JSON.stringify(row),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Anamnese Supabase error:', errText);
        // Fallback: save locally if Supabase fails
        const { default: dbM } = await import('../db.js');
        await dbM.add('anamnesis', data);
      }

      e.target.style.display = 'none';
      document.getElementById('anamneseSuccess').style.display = '';
    } catch (err) {
      console.error('Anamnese submit error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Anamnese'; }
      alert('Erro ao enviar. Verifique sua conexão e tente novamente.');
    }
  });
}
