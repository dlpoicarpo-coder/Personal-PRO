// ========================================
// VETOR — Anamnesis Page (v2)
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
  { section: 'Identificação', fields: [
    { name: 'fullName',     label: 'Nome Completo',                           type: 'text',    required: true },
    { name: 'birthDate',    label: 'Data de Nascimento',                      type: 'date',    required: true },
    { name: 'gender',       label: 'Gênero',                                  type: 'select',  options: ['Masculino','Feminino','Outro'], required: true },
    { name: 'phone',        label: 'Telefone / WhatsApp',                     type: 'tel',     required: true },
    { name: 'email',        label: 'E-mail',                                  type: 'email',   required: true },
    { name: 'occupation',   label: 'Profissão / Ocupação',                    type: 'text' },
    { name: 'weight',       label: 'Peso atual (kg)',                         type: 'number',  required: true },
    { name: 'height',       label: 'Altura (cm)',                             type: 'number',  required: true },
    { name: 'emergencyContactName', label: 'Contato de emergência — nome',    type: 'text' },
    { name: 'emergencyContactPhone',label: 'Contato de emergência — telefone',type: 'text' },
    { name: 'guardian_name', label: 'Nome completo do responsável legal', type: 'text', required: false },
    { name: 'guardian_email', label: 'E-mail do responsável legal', type: 'email', required: false },
    { name: 'guardian_phone', label: 'Telefone do responsável legal', type: 'tel', required: false },
    { name: 'guardian_relationship', label: 'Grau de parentesco', type: 'select', options: ['Mãe','Pai','Tutor legal','Outro'], required: false },
    { name: 'consent_responsavel_legal', label: 'Declaro ser o responsável legal e autorizo o tratamento dos dados de saúde do menor para fins de prescrição de treinamento.', type: 'checkbox', required: false }
  ]},
  { section: 'PAR-Q+', description: 'As perguntas abaixo seguem o PAR-Q+, questionário padrão internacional de prontidão para atividade física. Responda com sinceridade — elas existem para a sua segurança.', fields: [
    { name: 'parq_heart',       label: 'Algum médico já disse que você possui problema cardíaco e que só deveria fazer atividade física supervisionado por profissional de saúde?', type: 'select', options: ['Não','Sim'], required: true },
    { name: 'parq_chest_pain',  label: 'Você sente dor no peito quando pratica atividade física?', type: 'select', options: ['Não','Sim'], required: true },
    { name: 'parq_chest_month', label: 'No último mês, sentiu dor no peito ao praticar atividade física?', type: 'select', options: ['Não','Sim'], required: true },
    { name: 'parq_dizziness',   label: 'Você apresenta desequilíbrio devido a tontura e/ou perda de consciência?', type: 'select', options: ['Não','Sim'], required: true },
    { name: 'parq_bone',        label: 'Você possui algum problema ósseo ou articular que poderia ser piorado pela atividade física?', type: 'select', options: ['Não','Sim'], required: true },
    { name: 'parq_meds',        label: 'Você toma atualmente algum medicamento para pressão arterial e/ou problema cardíaco?', type: 'select', options: ['Não','Sim'], required: true },
    { name: 'parq_other',       label: 'Sabe de alguma outra razão pela qual não deveria praticar atividade física?', type: 'select', options: ['Não','Sim'], required: true },
    { name: 'parq_pregnancy',   label: 'Você está grávida, no pós-parto ou amamentando?', type: 'select', options: ['Não se aplica','Grávida','Pós-parto','Amamentando'], required: true }
  ]},
  { section: 'Histórico de Saúde', fields: [
    { name: 'conditions',    label: 'Possui condição médica? (diabetes, hipertensão, etc.)', type: 'textarea' },
    { name: 'medications',   label: 'Toma medicação regular?',                type: 'textarea' },
    { name: 'surgeries',     label: 'Já fez cirurgia?',                       type: 'textarea' },
    { name: 'injuries',      label: 'Lesões ou dores articulares/musculares?',type: 'textarea' },
    { name: 'injuriesDetails',label: 'Se sim, em quais regiões do corpo?',    type: 'textarea' },
    { name: 'familyHistory', label: 'Histórico familiar de cardiopatias, AVC ou diabetes?', type: 'select', options: ['Sim','Não','Não sei'] },
    { name: 'medicalFollowUp',label: 'Faz acompanhamento com nutricionista, ortopedista ou cardiologista? (Se sim, envie o exame mais recente ao seu treinador pelo WhatsApp)', type: 'textarea' }
  ]},
  { section: 'Estilo de Vida', fields: [
    { name: 'smoker',        label: 'Fumante?',                               type: 'select',  options: ['Não','Sim','Ex-fumante'] },
    { name: 'alcohol',       label: 'Consome bebidas alcoólicas?',            type: 'select',  options: ['Não','Raramente','Moderadamente','Frequentemente'] },
    { name: 'sleepHours',   label: 'Horas de sono por noite (média)',          type: 'select', options: ['Menos de 5h','5–6h','6–7h','7–8h','Mais de 8h'] },
    { name: 'sleepQuality', label: 'Qualidade do sono',                        type: 'select', options: ['Ruim','Regular','Bom','Excelente'] },
    { name: 'stressLevel',  label: 'Nível de estresse no dia a dia',           type: 'select', options: ['Baixo','Moderado','Alto','Muito alto'] },
    { name: 'nutrition',    label: 'Como é sua alimentação?',                  type: 'select', options: ['Equilibrada','Razoável','Desregulada','Faço acompanhamento nutricional'] },
    { name: 'hydration',    label: 'Consumo diário de água (litros)',          type: 'select', options: ['Menos de 1L','1–2L','2–3L','Mais de 3L'] },
    { name: 'workActivity', label: 'Nível de atividade no trabalho',           type: 'select', options: ['Sedentário','Moderado','Ativo'] },
    { name: 'routineIntensity',label:'Descreva a intensidade da sua rotina (física ou mental)', type: 'textarea' }
  ]},
  { section: 'Treino e Preferências', fields: [
    { name: 'currentActivity', label: 'Pratica exercícios atualmente?',        type: 'select', options: ['Sim, regularmente','Sim, esporadicamente','Não pratico'] },
    { name: 'activityType',    label: 'Que tipo de exercício pratica / já praticou?', type: 'textarea' },
    { name: 'experience',      label: 'Experiência com musculação',            type: 'select', options: ['Nunca treinei','Iniciante (< 6 meses)','Intermediário (6m–2 anos)','Avançado (> 2 anos)'] },
    { name: 'frequency',       label: 'Quantas vezes por semana pode treinar?',type: 'select', options: ['2x','3x','4x','5x','6x'] },
    { name: 'timeAvailable',   label: 'Tempo disponível por sessão',           type: 'select', options: ['30–45 min','45–60 min','60–75 min','75–90 min','> 90 min'] },
    { name: 'preferredSchedule', label: 'Horário preferido de treino',         type: 'select', options: ['Manhã (5–9h)','Meio-dia (11–14h)','Tarde (14–18h)','Noite (18–22h)'] },
    { name: 'preferredModalities',label:'Modalidades preferidas (musculação, funcional, HIIT, corrida, pilates, yoga, lutas, ao ar livre, em casa...)', type: 'textarea' },
    { name: 'dislikedModalities',label: 'Alguma modalidade que NÃO gosta?',   type: 'textarea' }
  ]},
  { section: 'Objetivos', fields: [
    { name: 'mainGoal',     label: 'Objetivo principal',                       type: 'select', options: ['Hipertrofia','Emagrecimento','Condicionamento','Saúde / Qualidade de Vida','Reabilitação','Performance Esportiva'] },
    { name: 'goalDetail',   label: 'Descreva seu objetivo com detalhes',       type: 'textarea' },
    { name: 'constancyObstacles',label:'O que pode atrapalhar sua constância?',type: 'textarea' },
    { name: 'additionalNotes',   label: 'Algo mais que gostaria de informar?', type: 'textarea' },
    { name: 'consent_veracidade', label: 'Declaro que as informações prestadas são verdadeiras e completas.', type: 'checkbox', required: true },
    { name: 'consent_dados_saude', label: 'Autorizo o uso destas informações, incluindo meus dados de saúde, exclusivamente para a prescrição do meu treinamento personalizado. (Art. 11, Lei 13.709/2018 — LGPD)', type: 'checkbox', required: true }
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
      
      let riskCount = 0;
      for (const key in s) {
        if (key.startsWith('parq_') && s[key]) {
          const v = s[key].toString().trim().toLowerCase();
          if (key === 'parq_pregnancy' && v !== 'não se aplica' && v !== 'nao se aplica' && v !== '') riskCount++;
          else if (v === 'sim') riskCount++;
        }
      }

      const html = `
        <div class="flex items-center gap-md mb-lg">
          <div class="avatar">${initials(s.fullName)}</div>
          <div>
            <h3 style="margin:0">${s.fullName || '—'}</h3>
            <p class="text-muted text-xs">${s.submittedAt ? 'Recebido em ' + new Date(s.submittedAt).toLocaleDateString('pt-BR') : ''}</p>
            ${s.consent_timestamp ? `<p class="text-xs" style="color:var(--success);margin-top:4px">Consentimento LGPD: ${new Date(s.consent_timestamp).toLocaleString('pt-BR')}</p>` : ''}
          </div>
        </div>
        ${riskCount > 0 ? `<div style="background:rgba(239,68,68,0.1);border-left:3px solid var(--danger);color:var(--text-primary);padding:10px;margin-bottom:16px;font-size:0.85rem"><strong>⚠️ ${riskCount} resposta(s) de risco no PAR-Q+</strong></div>` : ''}
        
        ${s.guardian_name ? `
          <div style="background:rgba(234,179,8,0.05);border:1px solid var(--warning);border-radius:8px;padding:16px;margin-bottom:16px">
            <h4 style="color:var(--warning);margin-top:0;margin-bottom:12px;display:flex;align-items:center;gap:6px">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Responsável Legal (Menor de 18 anos)
            </h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.85rem">
              <div><span class="text-muted">Nome:</span> <strong style="color:var(--text-primary)">${s.guardian_name}</strong></div>
              <div><span class="text-muted">Parentesco:</span> <strong style="color:var(--text-primary)">${s.guardian_relationship || '—'}</strong></div>
              <div><span class="text-muted">E-mail:</span> <strong style="color:var(--text-primary)">${s.guardian_email || '—'}</strong></div>
              <div><span class="text-muted">Telefone:</span> <strong style="color:var(--text-primary)">${s.guardian_phone || '—'}</strong></div>
              <div style="grid-column:1/-1;margin-top:8px"><span class="text-muted">Consentimento:</span> <strong style="color:var(--success)">${s.consent_responsavel_legal === 'on' || s.consent_responsavel_legal === true || s.consent_responsavel_legal === 'true' ? 'Sim, autorizado' : '—'}</strong></div>
            </div>
          </div>
        ` : ''}

        ${ANAMNESIS_QUESTIONS.map(sec => `
          <div style="margin-bottom:16px">
            <h4 style="color:var(--primary);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border-color)">${sec.section}</h4>
            ${sec.fields.map(f => {
              if (f.name.startsWith('guardian_') || f.name === 'consent_responsavel_legal') return '';
              const val = s[f.name];
              
              if (!val && f.type !== 'checkbox') return '';
              
              let valHtml = '';
              let isRisk = false;
              
              if (f.type === 'checkbox') {
                const isChecked = val === 'on' || val === true || val === 'true' || val === '1' || val === 't';
                valHtml = isChecked 
                  ? `<strong style="color:var(--success);text-align:right;max-width:55%">Sim, autorizo</strong>` 
                  : `<strong style="color:var(--danger);text-align:right;max-width:55%">Não autorizado</strong>`;
              } else {
                if (f.name.startsWith('parq_')) {
                  const v = val.toString().trim().toLowerCase();
                  if (f.name === 'parq_pregnancy' && v !== 'não se aplica' && v !== 'nao se aplica') isRisk = true;
                  else if (v === 'sim') isRisk = true;
                }
                valHtml = isRisk 
                  ? `<span style="background:var(--danger);color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:0.75rem">${val}</span>`
                  : `<strong style="text-align:right;max-width:55%">${val}</strong>`;
              }
                
              return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-color);font-size:0.82rem">
                <span class="text-muted" style="${isRisk ? 'color:var(--danger);font-weight:bold' : ''}">${f.label}</span>
                <div style="text-align:right;max-width:55%">${valHtml}</div>
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

import { SUPABASE_URL, SUPABASE_KEY } from '../utils/config.js';

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
  .ana-select option { color: #0F1519; }
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
  .ana-progress { margin-bottom: 24px; }
  .ana-progress-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
  .ana-progress-fill { height: 100%; background: #10b981; transition: width 0.3s ease; }
  .ana-progress-text { font-size: 0.78rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }
  .ana-desc{font-size:0.82rem;color:#64748b;margin-bottom:18px;line-height:1.5}

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
  [data-theme="light"] .ana-progress-bar { background: rgba(0,0,0,0.08); }
  [data-theme="light"] .ana-desc{color:#475569}
`;

export async function renderAnamneseForm() {
  return `
    <style>${ANAMNESE_CSS}</style>
    <div class="ana-page">
      <div class="ana-card">
        <div class="login-header" style="display:flex; justify-content:center; align-items:center; margin-bottom:20px; font-size:1.8rem;">
          <div class="vetor-logo">
            <span class="vetor-name">Vetor</span>
            <i class="vetor-diamond"></i>
          </div>
        </div>
        <div class="ana-body">
          <div class="ana-progress">
            <div class="ana-progress-bar">
              <div class="ana-progress-fill" id="anaProgressFill" style="width:0%"></div>
            </div>
            <div class="ana-progress-text" id="anaProgressText">Etapa 1 de X</div>
          </div>
          <div class="ana-intro">
            Preencha com atenção. Suas respostas ajudarão o treinador a criar o programa ideal para você.
          </div>
          <form id="anamneseForm">
            ${ANAMNESIS_QUESTIONS.map((sec, index) => `
              <div class="ana-step" data-step="${index}" style="display: none;">
                <div class="ana-section">${sec.section}</div>
                ${sec.description ? `<p class="ana-desc">${sec.description}</p>` : ''}
                ${sec.fields.map(f => {
                  if (f.type === 'select') return `<div class="ana-group"><label class="ana-label">${f.label}${f.required ? ' *' : ''}</label><select class="ana-select" name="${f.name}" ${f.required ? 'required' : ''}><option value="">Selecione...</option>${f.options.map(o => `<option>${o}</option>`).join('')}</select></div>`;
                  if (f.type === 'textarea') return `<div class="ana-group"><label class="ana-label">${f.label}${f.required ? ' *' : ''}</label><textarea class="ana-textarea" name="${f.name}" rows="2" placeholder="Descreva..." ${f.required ? 'required' : ''}></textarea></div>`;
                  if (f.type === 'checkbox') return `<div class="ana-group" style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px"><input type="checkbox" class="ana-checkbox" id="${f.name}" name="${f.name}" ${f.required ? 'required' : ''} style="margin-top:2px;width:22px;height:22px;accent-color:#10b981;cursor:pointer;flex-shrink:0"><label for="${f.name}" style="font-size:0.9rem;color:#fff;line-height:1.5;cursor:pointer">${f.label}${f.required ? ' *' : ''}</label></div>`;
                  return `<div class="ana-group"><label class="ana-label">${f.label}${f.required ? ' *' : ''}</label><input class="ana-input" name="${f.name}" type="${f.type}" ${f.required ? 'required' : ''} placeholder="" /></div>`;
                }).join('')}
              </div>
            `).join('')}
            <div class="ana-footer" style="display:flex;gap:12px;margin-top:24px">
              <button type="button" id="anaPrev" class="ana-submit" style="background:rgba(255,255,255,0.1);color:#e2e8f0;margin-top:0;display:none">Voltar</button>
              <button type="button" id="anaNext" class="ana-submit" style="margin-top:0">Próximo</button>
              <button type="submit" id="anamneseSubmit" class="ana-submit" style="margin-top:0;display:none">Enviar Anamnese</button>
            </div>
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
  const form = document.getElementById('anamneseForm');
  if (!form) return;

  const steps = form.querySelectorAll('.ana-step');
  const prevBtn = document.getElementById('anaPrev');
  const nextBtn = document.getElementById('anaNext');
  const submitBtn = document.getElementById('anamneseSubmit');
  const progressFill = document.getElementById('anaProgressFill');
  const progressText = document.getElementById('anaProgressText');
  
  let currentStep = 0;
  let formMemory = {}; // A memória entre etapas deve ser uma variável JS

  const updateUI = () => {
    steps.forEach((el, idx) => {
      el.style.display = idx === currentStep ? 'block' : 'none';
      if (idx === currentStep) el.classList.add('active');
      else el.classList.remove('active');
    });

    const total = steps.length;
    progressFill.style.width = `${((currentStep + 1) / total) * 100}%`;
    progressText.textContent = `Etapa ${currentStep + 1} de ${total}`;

    if (currentStep === 0) {
      prevBtn.style.display = 'none';
    } else {
      prevBtn.style.display = 'block';
    }

    if (currentStep === total - 1) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'block';
      checkConsents();
    } else {
      nextBtn.style.display = 'block';
      submitBtn.style.display = 'none';
    }
  };

  const checkConsents = () => {
    const cv = form.querySelector('[name="consent_veracidade"]');
    const cds = form.querySelector('[name="consent_dados_saude"]');
    if (cv && cds) {
      const isValid = cv.checked && cds.checked;
      submitBtn.disabled = !isValid;
      submitBtn.style.opacity = isValid ? '1' : '0.5';
      submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
  };

  form.addEventListener('change', (e) => {
    if (e.target.name === 'consent_veracidade' || e.target.name === 'consent_dados_saude') {
      checkConsents();
    }
  });

  // Minor Logic
  const guardianNames = ['guardian_name', 'guardian_email', 'guardian_phone', 'guardian_relationship', 'consent_responsavel_legal'];
  const guardianFields = guardianNames.map(n => form.querySelector(`[name="${n}"]`)?.closest('.ana-group')).filter(Boolean);
  guardianFields.forEach(el => { if (el) el.style.display = 'none'; });
  
  if (guardianFields[0]) {
    const warningHtml = `<div id="guardianWarning" style="display:none;background:rgba(234,179,8,0.1);border-left:3px solid var(--warning);padding:12px;margin-bottom:16px;font-size:0.85rem;color:var(--text-primary)">
      <strong style="color:var(--warning)">Atenção:</strong> Como você é menor de 18 anos, é necessário o consentimento do seu responsável legal (Art. 14, Lei 13.709/2018).
    </div>`;
    guardianFields[0].insertAdjacentHTML('beforebegin', warningHtml);
  }
  
  const warningEl = document.getElementById('guardianWarning');
  const birthDateInput = form.querySelector('[name="birthDate"]');
  
  if (birthDateInput) {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const maxDate = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    birthDateInput.min = minDate;
    birthDateInput.max = maxDate;
    
    birthDateInput.addEventListener('input', () => {
      birthDateInput.setCustomValidity('');
      const val = birthDateInput.value;
      if (val) {
        if (val < minDate) birthDateInput.setCustomValidity('Data inválida (mais de 120 anos).');
        if (val > maxDate) birthDateInput.setCustomValidity('O aluno deve ter pelo menos 5 anos de idade.');
      }
    });

    birthDateInput.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      const age = Calc.calcularIdade(val);
      const isMinor = age < 18;
      
      if (warningEl) warningEl.style.display = isMinor ? 'block' : 'none';
      
      guardianFields.forEach(el => {
        if (!el) return;
        el.style.display = isMinor ? 'flex' : 'none';
        if (el.classList.contains('ana-group') && !el.querySelector('input[type="checkbox"]')) {
           el.style.display = isMinor ? 'block' : 'none';
        }
        const input = el.querySelector('input, select, textarea');
        if (input) {
          input.required = isMinor;
          if (!isMinor) {
             if(input.type === 'checkbox') input.checked = false;
             else input.value = '';
          }
        }
      });
    });
  }

  const saveToMemory = () => {
    const fd = new FormData(form);
    formMemory = Object.fromEntries(fd);
  };

  prevBtn.addEventListener('click', () => {
    if (currentStep > 0) {
      saveToMemory();
      currentStep--;
      updateUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  nextBtn.addEventListener('click', () => {
    const activeStep = steps[currentStep];
    const inputs = activeStep.querySelectorAll('input, select, textarea');
    let isValid = true;
    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
        isValid = false;
        break;
      }
    }
    
    if (isValid && currentStep === 0) {
      const emailInput = form.querySelector('[name="email"]');
      const guardianEmailInput = form.querySelector('[name="guardian_email"]');
      if (emailInput && guardianEmailInput && guardianEmailInput.required) {
        if (emailInput.value.trim().toLowerCase() === guardianEmailInput.value.trim().toLowerCase()) {
          alert('O e-mail do responsável deve ser diferente do seu.');
          isValid = false;
        }
      }
    }

    if (isValid && currentStep < steps.length - 1) {
      saveToMemory();
      currentStep++;
      updateUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  updateUI();

  // ── 4. Submit ───────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('anamneseSubmit');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
      const fd   = new FormData(form);
      const data = Object.fromEntries(fd);
      data.submittedAt = new Date().toISOString();
      data.consent_timestamp = new Date().toISOString();
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

      let res = await fetch(`${SUPABASE_URL}/rest/v1/anamnesis`, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(row),
      });

      if (!res.ok) {
        let errText = await res.text();
        if (errText.includes('23505') || errText.includes('unique_violation') || res.status === 409) {
          // Fallback para PATCH se o registro já existir
          res = await fetch(`${SUPABASE_URL}/rest/v1/anamnesis?id=eq.${encodeURIComponent(data.id)}`, {
            method: 'PATCH',
            headers: {
              'apikey':        SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type':  'application/json',
              'Prefer':        'return=minimal',
            },
            body: JSON.stringify(row),
          });
          if (!res.ok) {
            errText = await res.text();
            throw new Error('Falha ao atualizar anamnese: ' + errText);
          }
        } else {
          throw new Error('Falha ao enviar anamnese: ' + errText);
        }
      }

      form.style.display = 'none';
      document.getElementById('anamneseSuccess').style.display = '';
    } catch (err) {
      console.error('Anamnese submit error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Anamnese'; }
      alert(err.message || 'Erro ao enviar. Verifique sua conexão e tente novamente.');
    }
  });
}
