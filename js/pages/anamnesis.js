// ========================================
// PERSONAL PRO — Anamnesis Page (v1)
// Send anamnesis form link to potential students
// ========================================
import db from '../db.js';
import { notify } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

const ANAMNESIS_QUESTIONS = [
  { section: 'Dados Pessoais', fields: [
    { name: 'fullName', label: 'Nome Completo', type: 'text', required: true },
    { name: 'birthDate', label: 'Data de Nascimento', type: 'date', required: true },
    { name: 'gender', label: 'Gênero', type: 'select', options: ['Masculino', 'Feminino', 'Outro'] },
    { name: 'phone', label: 'Telefone / WhatsApp', type: 'tel' },
    { name: 'email', label: 'E-mail', type: 'email' },
    { name: 'occupation', label: 'Profissão / Ocupação', type: 'text' },
  ]},
  { section: 'Histórico de Saúde', fields: [
    { name: 'conditions', label: 'Possui alguma condição médica? (diabetes, hipertensão, etc.)', type: 'textarea' },
    { name: 'medications', label: 'Toma alguma medicação regular?', type: 'textarea' },
    { name: 'surgeries', label: 'Já fez alguma cirurgia?', type: 'textarea' },
    { name: 'injuries', label: 'Possui lesões ou dores articulares/musculares?', type: 'textarea' },
    { name: 'familyHistory', label: 'Histórico familiar de doenças cardíacas, AVC ou diabetes?', type: 'select', options: ['Sim', 'Não', 'Não sei'] },
    { name: 'smoker', label: 'Fumante?', type: 'select', options: ['Não', 'Sim', 'Ex-fumante'] },
    { name: 'alcohol', label: 'Consome bebidas alcoólicas?', type: 'select', options: ['Não', 'Raramente', 'Sim, moderadamente', 'Sim, frequentemente'] },
  ]},
  { section: 'Atividade Física', fields: [
    { name: 'currentActivity', label: 'Pratica exercícios atualmente?', type: 'select', options: ['Sim, regularmente', 'Sim, esporadicamente', 'Não pratico'] },
    { name: 'activityType', label: 'Que tipo de exercício pratica ou já praticou?', type: 'textarea' },
    { name: 'frequency', label: 'Quantas vezes por semana pode treinar?', type: 'select', options: ['2x', '3x', '4x', '5x', '6x'] },
    { name: 'experience', label: 'Nível de experiência com musculação', type: 'select', options: ['Nunca treinei', 'Iniciante (< 6 meses)', 'Intermediário (6m - 2 anos)', 'Avançado (> 2 anos)'] },
    { name: 'timeAvailable', label: 'Tempo disponível por sessão', type: 'select', options: ['30-45 min', '45-60 min', '60-75 min', '75-90 min', '> 90 min'] },
  ]},
  { section: 'Objetivos e Estilo de Vida', fields: [
    { name: 'mainGoal', label: 'Objetivo principal', type: 'select', options: ['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Saúde / Qualidade de Vida', 'Reabilitação', 'Performance Esportiva'] },
    { name: 'goalDetail', label: 'Descreva seu objetivo com mais detalhes', type: 'textarea' },
    { name: 'sleepHours', label: 'Quantas horas dorme por noite em média?', type: 'select', options: ['Menos de 5h', '5-6h', '6-7h', '7-8h', 'Mais de 8h'] },
    { name: 'sleepQuality', label: 'Qualidade do sono', type: 'select', options: ['Ruim', 'Regular', 'Bom', 'Excelente'] },
    { name: 'stressLevel', label: 'Nível de estresse no dia a dia', type: 'select', options: ['Baixo', 'Moderado', 'Alto', 'Muito alto'] },
    { name: 'nutrition', label: 'Como é sua alimentação?', type: 'select', options: ['Equilibrada', 'Razoável', 'Desregulada', 'Faço acompanhamento nutricional'] },
    { name: 'hydration', label: 'Consumo diário de água (litros)', type: 'select', options: ['Menos de 1L', '1-2L', '2-3L', 'Mais de 3L'] },
  ]},
  { section: 'Informações Adicionais', fields: [
    { name: 'additionalNotes', label: 'Algo mais que gostaria de informar?', type: 'textarea' },
    { name: 'preferredSchedule', label: 'Horário preferido de treino', type: 'select', options: ['Manhã (5-9h)', 'Meio-dia (11-14h)', 'Tarde (14-18h)', 'Noite (18-22h)'] },
  ]},
];

export async function renderAnamnesis() {
  const submissions = await db.getAll('anamnesis');
  submissions.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  
  return `
    <div class="page-header"><div><h1>Anamnese</h1><p class="subtitle">Envie formulário de anamnese para possíveis alunos</p></div>
      <div class="flex gap-sm">
        <button class="btn btn-primary" id="genAnamneseLinkBtn">Gerar Link de Anamnese</button>
      </div>
    </div>
    
    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Sobre a Anamnese</span></div>
      <p class="text-sm text-muted">A anamnese é um questionário completo enviado para novos alunos antes da primeira sessão. Contém perguntas sobre saúde, histórico de atividade física, objetivos e estilo de vida. O aluno preenche pelo link e os dados ficam salvos no sistema.</p>
    </div>

    ${submissions.length ? `
    <div class="card">
      <div class="card-header"><span class="card-title">Formulários Recebidos</span></div>
      <div class="table-container"><table class="data-table">
        <thead><tr><th>Nome</th><th>Data</th><th>Objetivo</th><th>Experiência</th><th>Ações</th></tr></thead>
        <tbody>${submissions.map(s => `
          <tr>
            <td><strong>${s.fullName || '—'}</strong></td>
            <td>${s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('pt-BR') : '—'}</td>
            <td><span class="badge badge-primary">${s.mainGoal || '—'}</span></td>
            <td>${s.experience || '—'}</td>
            <td class="flex gap-sm">
              <button class="btn btn-ghost btn-sm view-anamnese" data-id="${s.id}">Ver</button>
              <button class="btn btn-ghost btn-sm convert-anamnese" data-id="${s.id}">Cadastrar Aluno</button>
              <button class="btn btn-ghost btn-sm del-anamnese" data-id="${s.id}" style="color:var(--danger)">✕</button>
            </td>
          </tr>
        `).join('')}</tbody>
      </table></div>
    </div>` : `
    <div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Nenhuma anamnese recebida</h3><p>Gere um link e envie para um possível aluno</p></div>
    `}
  `;
}

export function initAnamnesis(navigateFn) {
  document.getElementById('genAnamneseLinkBtn')?.addEventListener('click', async () => {
    const { getCurrentUser } = await import('../utils/auth.js');
    const user = await getCurrentUser();
    if (!user) { notify.error('Você precisa estar logado'); return; }
    const baseUrl = window.location.href.split('#')[0];
    const url = `${baseUrl}#/form/anamnese?trainer=${user.id}`;
    navigator.clipboard?.writeText(url);
    notify.success('Link copiado!');
    openModal({
      title: 'Link de Anamnese', size: 'md',
      content: `
        <p class="text-muted mb-md">Envie este link para o aluno preencher a anamnese:</p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <input class="form-input" value="${url}" readonly onclick="this.select()" style="flex:1;font-size:0.78rem" />
          <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${url}');this.textContent='✓ Copiado!'">Copiar</button>
        </div>
        <a href="https://wa.me/?text=${encodeURIComponent('Olá! Preencha sua anamnese: ' + url)}" target="_blank" class="btn btn-secondary btn-sm">Enviar via WhatsApp</a>
        <p class="text-muted text-xs mt-md">O aluno abrirá no navegador. Após preencher, os dados são salvos automaticamente no seu sistema.</p>
      `,
      actions: [{ label: 'Fechar', class: 'btn-primary', onClick: () => closeModal() }]
    });
  });

  // View submission
  document.querySelectorAll('.view-anamnese').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('anamnesis', btn.dataset.id);
      if (!s) return;
      const html = ANAMNESIS_QUESTIONS.map(sec => `
        <h4 style="margin:16px 0 8px;color:var(--primary)">${sec.section}</h4>
        ${sec.fields.map(f => `<div class="flex justify-between text-sm" style="padding:4px 0;border-bottom:1px solid var(--border-color)"><span class="text-muted">${f.label}</span><strong>${s[f.name] || '—'}</strong></div>`).join('')}
      `).join('');
      openModal({ title: `Anamnese — ${s.fullName || 'Aluno'}`, size: 'lg', content: html });
    });
  });

  // Convert to student
  document.querySelectorAll('.convert-anamnese').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = await db.get('anamnesis', btn.dataset.id);
      if (!s) return;
      const code = (s.fullName || 'ALU').substring(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100);
      await db.add('students', {
        name: s.fullName || '', code, birthDate: s.birthDate || '', gender: s.gender === 'Masculino' ? 'M' : s.gender === 'Feminino' ? 'F' : '',
        phone: s.phone || '', email: s.email || '', goal: s.mainGoal || '', status: 'Ativo',
        notes: `Anamnese recebida em ${new Date(s.submittedAt).toLocaleDateString('pt-BR')}. Experiência: ${s.experience || '-'}. Frequência desejada: ${s.frequency || '-'}.`,
      });
      notify.success(`Aluno ${s.fullName} cadastrado!`);
      navigateFn('/alunos');
    });
  });

  // Delete
  document.querySelectorAll('.del-anamnese').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir anamnese?')) {
        await db.delete('anamnesis', btn.dataset.id);
        navigateFn('/anamnese');
      }
    });
  });
}

// Public form renderer (accessed via link by the student)
export async function renderAnamneseForm() {
  return `
    <div class="student-form-page">
      <div class="form-card" style="max-width:600px">
        <div class="form-card-header">
          <h2 style="margin:0">Personal<strong class="logo-pro">PRO</strong></h2>
          <p class="text-muted text-sm" style="margin-top:4px">Formulário de Anamnese</p>
        </div>
        <div class="form-card-body">
          <p class="text-sm text-muted mb-lg">Preencha todas as informações com atenção. Seus dados serão enviados ao seu treinador.</p>
          <form id="anamneseForm">
            ${ANAMNESIS_QUESTIONS.map(sec => `
              <h4 style="margin:20px 0 10px;color:var(--primary);border-bottom:1px solid var(--border-color);padding-bottom:6px">${sec.section}</h4>
              ${sec.fields.map(f => {
                if (f.type === 'select') {
                  return `<div class="form-group"><label class="form-label">${f.label}</label><select class="form-select" name="${f.name}" ${f.required ? 'required' : ''}><option value="">Selecione</option>${f.options.map(o => `<option>${o}</option>`).join('')}</select></div>`;
                }
                if (f.type === 'textarea') {
                  return `<div class="form-group"><label class="form-label">${f.label}</label><textarea class="form-textarea" name="${f.name}" rows="2" placeholder="Descreva..."></textarea></div>`;
                }
                return `<div class="form-group"><label class="form-label">${f.label}</label><input class="form-input" name="${f.name}" type="${f.type}" ${f.required ? 'required' : ''} /></div>`;
              }).join('')}
            `).join('')}
            <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;margin-top:16px">Enviar Anamnese</button>
          </form>
          <div id="anamneseSuccess" style="display:none;text-align:center;padding:40px">
            <div style="font-size:2.5rem;margin-bottom:12px;color:var(--primary)">✓</div>
            <h3>Anamnese Enviada!</h3>
            <p class="text-muted">Seu treinador receberá as informações. Obrigado!</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initAnamneseForm() {
  document.getElementById('anamneseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.submittedAt = new Date().toISOString();

    // Capturar trainerId da URL para salvar no banco correto
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const trainerId = params.get('trainer');
    if (trainerId) data.trainer_id = trainerId;

    const { default: db } = await import('../db.js');

    // Salvar via Supabase diretamente com o trainer_id
    if (trainerId) {
      try {
        const { getSupabase } = await import('../utils/auth.js');
        const sb = getSupabase();
        if (sb) {
          const { error } = await sb.from('anamneses').insert([{ ...data, trainer_id: trainerId }]);
          if (error) throw error;
        }
      } catch (err) {
        console.error('Anamnese save error:', err);
        // Fallback: salvar no localStorage para o personal resgatar depois
        await db.add('anamnesis', data);
      }
    } else {
      await db.add('anamnesis', data);
    }

    e.target.style.display = 'none';
    document.getElementById('anamneseSuccess').style.display = '';
  });
}

export { ANAMNESIS_QUESTIONS };
