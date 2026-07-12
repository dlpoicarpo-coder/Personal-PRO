// ========================================
// VETOR â€” Tutorial Page (Interactive)
// Guide for all system features
// ========================================

const TUTORIAL_STEPS = [
  {
    title: 'Configurar seu perfil de Personal Trainer',
    section: 'Primeiros Passos',
    steps: [
      'Acesse ConfiguraÃ§Ãµes no menu lateral',
      'Preencha seu nome, CREF e outras informaÃ§Ãµes profissionais',
      'Defina o tema visual (claro ou escuro) da sua preferÃªncia',
      'Salve as configuraÃ§Ãµes â€” seu nome e CREF aparecerÃ£o automaticamente nos PDFs gerados',
    ],
    tip: 'O CREF Ã© exibido em todos os documentos PDF gerados pelo sistema, garantindo a identificaÃ§Ã£o profissional.'
  },
  {
    title: 'Cadastrar um novo aluno',
    section: 'Primeiros Passos',
    steps: [
      'Acesse Alunos no menu lateral',
      'Clique em + Novo Aluno',
      'Preencha nome, cÃ³digo, data de nascimento, gÃªnero, contato e objetivo',
      'Defina a Zona-Alvo de Treino e FrequÃªncia Semanal',
      'Clique em Salvar',
    ],
    tip: 'O cÃ³digo do aluno Ã© usado na identificaÃ§Ã£o em relatÃ³rios e PDFs. Ex: JOA-001.'
  },
  {
    title: 'Criar uma ficha de treino',
    section: 'Treinos e PeriodizaÃ§Ã£o',
    steps: [
      'Acesse Treinos e clique em + Novo Treino',
      'Selecione o aluno e dÃª um nome ao treino (ex: Treino A - Superior)',
      'Adicione exercÃ­cios: nome, sÃ©ries, repetiÃ§Ãµes, carga, descanso e mÃ©todo',
      'Use o campo Ciclo para organizar treinos por fase (ex: Ciclo 1 - AdaptaÃ§Ã£o)',
      'Salve e depois gere o PDF com o botÃ£o PDF na listagem',
    ],
    tip: 'O nome dos exercÃ­cios possui autocompletar baseado na biblioteca do sistema. Comece a digitar para ver sugestÃµes.'
  },
  {
    title: 'Criar um macrociclo de periodizaÃ§Ã£o',
    section: 'Treinos e PeriodizaÃ§Ã£o',
    steps: [
      'Acesse PeriodizaÃ§Ã£o e clique em + Novo Macrociclo',
      'Selecione o aluno e defina o nome do macrociclo',
      'Escolha o modelo de periodizaÃ§Ã£o (linear, ondulatÃ³rio, bloco)',
      'Defina as semanas totais, data de inÃ­cio e frequÃªncia de deload',
      'Opcionalmente, selecione um modelo de treino existente',
      'Clique em Gerar Macrociclo â€” os treinos e sessÃµes na agenda sÃ£o criados automaticamente',
    ],
    tip: 'Cada semana Ã© colorida por intensidade: verde (leve) a vermelho (muito alta) e azul (deload).'
  },
  {
    title: 'Agendar sessÃµes de treino',
    section: 'Agenda e Treino ao Vivo',
    steps: [
      'Acesse Agenda e clique em + Agendar Treino',
      'Selecione o aluno e o treino desejado',
      'Escolha dias da semana e o nÃºmero de semanas para repetiÃ§Ã£o',
      'Defina horÃ¡rio e duraÃ§Ã£o da sessÃ£o',
      'Clique em Agendar',
    ],
    tip: 'Use o filtro de aluno no topo da agenda para ver apenas as sessÃµes de um aluno especÃ­fico.'
  },
  {
    title: 'Iniciar um treino ao vivo',
    section: 'Agenda e Treino ao Vivo',
    steps: [
      'Na agenda, clique em Iniciar na sessÃ£o desejada',
      'O sistema abre o Treino ao Vivo',
      'Registre cada sÃ©rie com carga e repetiÃ§Ãµes realizadas',
      'Ao finalizar, preencha o pÃ³s-treino ou gere o link para o aluno',
    ],
    tip: 'O link de pÃ³s-treino pode ser copiado e enviado via WhatsApp. Ao copiar, a sessÃ£o Ã© finalizada automaticamente.'
  },
  {
    title: 'AvaliaÃ§Ãµes e Zonas de FC',
    section: 'SaÃºde e MÃ©tricas',
    steps: [
      'Acesse AvaliaÃ§Ãµes e clique em + Nova AvaliaÃ§Ã£o para composiÃ§Ã£o corporal ou forÃ§a',
      'Para Zonas de Treino, selecione o aluno, informe a FC de repouso e clique em Calcular Zonas',
    ],
    tip: 'As zonas sÃ£o calculadas pela fÃ³rmula de Karvonen e a FC MÃ¡xima por Tanaka.'
  },
  {
    title: 'Modelos e Financeiro',
    section: 'Biblioteca e Custos',
    steps: [
      'Crie seus templates na aba ExercÃ­cios -> Meus Modelos para reaproveitamento rÃ¡pido',
      'Defina Mensalidade e SessÃµes Esperadas no cadastro do aluno para obter o Custo por SessÃ£o exato na aba Financeiro',
    ],
    tip: 'Isso ajuda a ter controle da rentabilidade de cada aluno por treino executado.'
  },
  {
    title: 'Portal do Aluno',
    section: 'Acesso e Check-in',
    steps: [
      'No cadastro do aluno, copie o Link do Portal',
      'Envie o link para o aluno. NÃ£o requer senha e funciona como um app (PWA)',
      'O aluno pode preencher o check-in prÃ©-treino (Biofeedback) e checkout pÃ³s-treino',
      'Todos os grÃ¡ficos do portal atualizam em tempo real',
    ],
    tip: 'O aluno visualizarÃ¡ seus treinos, histÃ³rico, e grÃ¡ficos de evoluÃ§Ã£o completos no portal.'
  }
];

export function renderTutorial() {
  return `
    <div class="page-header">
      <div><h1>Tutorial do Sistema</h1><p class="subtitle">Guia interativo passo a passo</p></div>
    </div>

    <div class="card mb-lg" style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.08));border:1px solid var(--primary)">
      <div class="flex items-center gap-md">
        <div>
          <h3 style="margin:0">Bem-vindo ao Vetor</h3>
          <p class="text-muted text-sm" style="margin:4px 0 0">Sistema completo de gestÃ£o para Personal Trainers. Use este guia interativo para dominar todas as funcionalidades.</p>
        </div>
      </div>
    </div>

    <div id="tutorialWizard" class="card" style="min-height: 380px; display:flex; flex-direction:column; position:relative;">
      <!-- Content will be injected here by initTutorialWizard -->
    </div>
  `;
}

export function initTutorial(navigateFn) {
  let currentStep = 0;
  
  function renderCurrentStep() {
    const wizardEl = document.getElementById('tutorialWizard');
    if (!wizardEl) return;
    
    const stepData = TUTORIAL_STEPS[currentStep];
    const total = TUTORIAL_STEPS.length;
    const progress = ((currentStep + 1) / total) * 100;
    
    wizardEl.innerHTML = `
      <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.05); position: absolute; top: 0; left: 0; border-top-left-radius: inherit; border-top-right-radius: inherit; overflow:hidden;">
        <div style="width: ${progress}%; height: 100%; background: var(--gradient-primary); transition: width 0.3s ease;"></div>
      </div>
      
      <div style="flex:1; padding: 24px 10px;">
        <div class="text-xs text-muted mb-xs" style="text-transform:uppercase; letter-spacing:1px">${stepData.section} (${currentStep + 1} de ${total})</div>
        <h2 style="color:var(--primary); margin-bottom: 24px; font-size: 1.5rem;">${stepData.title}</h2>
        
        <div class="flex flex-col gap-md" style="margin-bottom: 32px">
          ${stepData.steps.map((s, i) => `
            <div class="flex gap-md items-start">
              <div style="width:24px;height:24px;border-radius:50%;background:rgba(16,185,129,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;margin-top:2px;">${i+1}</div>
              <div style="font-size:0.95rem; color:var(--text); line-height: 1.5;">${s}</div>
            </div>
          `).join('')}
        </div>
        
        ${stepData.tip ? `
          <div style="background: rgba(6,182,212,0.1); border-left: 3px solid #06b6d4; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: auto;">
            <div style="font-size: 0.75rem; text-transform:uppercase; color: #06b6d4; font-weight:700; margin-bottom: 4px;">Dica PRO</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${stepData.tip}</div>
          </div>
        ` : ''}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:16px; border-top:1px solid var(--border-color);">
        ${currentStep > 0 
          ? `<button class="btn btn-ghost" id="tutPrevBtn">Anterior</button>` 
          : `<div></div>`}
        
        ${currentStep < total - 1 
          ? `<button class="btn btn-primary" id="tutNextBtn">PrÃ³ximo Passo</button>` 
          : `<button class="btn btn-success" id="tutFinishBtn">Finalizar Tutorial</button>`}
      </div>
    `;

    document.getElementById('tutPrevBtn')?.addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        renderCurrentStep();
      }
    });

    document.getElementById('tutNextBtn')?.addEventListener('click', () => {
      if (currentStep < total - 1) {
        currentStep++;
        renderCurrentStep();
      }
    });

    document.getElementById('tutFinishBtn')?.addEventListener('click', () => {
      alert("Tutorial concluÃ­do! VocÃª jÃ¡ pode explorar todas as ferramentas.");
      if(navigateFn) navigateFn('dashboard');
    });
  }

  renderCurrentStep();
}

