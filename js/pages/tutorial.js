// ========================================
// PERSONAL PRO — Tutorial Page (Interactive)
// Guide for all system features
// ========================================

const TUTORIAL_STEPS = [
  {
    title: 'Configurar seu perfil de Personal Trainer',
    section: 'Primeiros Passos',
    steps: [
      'Acesse Configurações no menu lateral',
      'Preencha seu nome, CREF e outras informações profissionais',
      'Defina o tema visual (claro ou escuro) da sua preferência',
      'Salve as configurações — seu nome e CREF aparecerão automaticamente nos PDFs gerados',
    ],
    tip: 'O CREF é exibido em todos os documentos PDF gerados pelo sistema, garantindo a identificação profissional.'
  },
  {
    title: 'Cadastrar um novo aluno',
    section: 'Primeiros Passos',
    steps: [
      'Acesse Alunos no menu lateral',
      'Clique em + Novo Aluno',
      'Preencha nome, código, data de nascimento, gênero, contato e objetivo',
      'Defina a Zona-Alvo de Treino e Frequência Semanal',
      'Clique em Salvar',
    ],
    tip: 'O código do aluno é usado na identificação em relatórios e PDFs. Ex: JOA-001.'
  },
  {
    title: 'Criar uma ficha de treino',
    section: 'Treinos e Periodização',
    steps: [
      'Acesse Treinos e clique em + Novo Treino',
      'Selecione o aluno e dê um nome ao treino (ex: Treino A - Superior)',
      'Adicione exercícios: nome, séries, repetições, carga, descanso e método',
      'Use o campo Ciclo para organizar treinos por fase (ex: Ciclo 1 - Adaptação)',
      'Salve e depois gere o PDF com o botão PDF na listagem',
    ],
    tip: 'O nome dos exercícios possui autocompletar baseado na biblioteca do sistema. Comece a digitar para ver sugestões.'
  },
  {
    title: 'Criar um macrociclo de periodização',
    section: 'Treinos e Periodização',
    steps: [
      'Acesse Periodização e clique em + Novo Macrociclo',
      'Selecione o aluno e defina o nome do macrociclo',
      'Escolha o modelo de periodização (linear, ondulatório, bloco)',
      'Defina as semanas totais, data de início e frequência de deload',
      'Opcionalmente, selecione um modelo de treino existente',
      'Clique em Gerar Macrociclo — os treinos e sessões na agenda são criados automaticamente',
    ],
    tip: 'Cada semana é colorida por intensidade: verde (leve) a vermelho (muito alta) e azul (deload).'
  },
  {
    title: 'Agendar sessões de treino',
    section: 'Agenda e Treino ao Vivo',
    steps: [
      'Acesse Agenda e clique em + Agendar Treino',
      'Selecione o aluno e o treino desejado',
      'Escolha dias da semana e o número de semanas para repetição',
      'Defina horário e duração da sessão',
      'Clique em Agendar',
    ],
    tip: 'Use o filtro de aluno no topo da agenda para ver apenas as sessões de um aluno específico.'
  },
  {
    title: 'Iniciar um treino ao vivo',
    section: 'Agenda e Treino ao Vivo',
    steps: [
      'Na agenda, clique em Iniciar na sessão desejada',
      'O sistema abre o Treino ao Vivo',
      'Registre cada série com carga e repetições realizadas',
      'Ao finalizar, preencha o pós-treino ou gere o link para o aluno',
    ],
    tip: 'O link de pós-treino pode ser copiado e enviado via WhatsApp. Ao copiar, a sessão é finalizada automaticamente.'
  },
  {
    title: 'Avaliações e Zonas de FC',
    section: 'Saúde e Métricas',
    steps: [
      'Acesse Avaliações e clique em + Nova Avaliação para composição corporal ou força',
      'Para Zonas de Treino, selecione o aluno, informe a FC de repouso e clique em Calcular Zonas',
    ],
    tip: 'As zonas são calculadas pela fórmula de Karvonen e a FC Máxima por Tanaka.'
  },
  {
    title: 'Modelos e Financeiro',
    section: 'Biblioteca e Custos',
    steps: [
      'Crie seus templates na aba Exercícios -> Meus Modelos para reaproveitamento rápido',
      'Defina Mensalidade e Sessões Esperadas no cadastro do aluno para obter o Custo por Sessão exato na aba Financeiro',
    ],
    tip: 'Isso ajuda a ter controle da rentabilidade de cada aluno por treino executado.'
  },
  {
    title: 'Portal do Aluno',
    section: 'Acesso e Check-in',
    steps: [
      'No cadastro do aluno, copie o Link do Portal',
      'Envie o link para o aluno. Não requer senha e funciona como um app (PWA)',
      'O aluno pode preencher o check-in pré-treino (Biofeedback) e checkout pós-treino',
      'Todos os gráficos do portal atualizam em tempo real',
    ],
    tip: 'O aluno visualizará seus treinos, histórico, e gráficos de evolução completos no portal.'
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
          <h3 style="margin:0">Bem-vindo ao Personal PRO</h3>
          <p class="text-muted text-sm" style="margin:4px 0 0">Sistema completo de gestão para Personal Trainers. Use este guia interativo para dominar todas as funcionalidades.</p>
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
    
    wizardEl.innerHTML = \`
      <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.05); position: absolute; top: 0; left: 0; border-top-left-radius: inherit; border-top-right-radius: inherit; overflow:hidden;">
        <div style="width: \${progress}%; height: 100%; background: var(--gradient-primary); transition: width 0.3s ease;"></div>
      </div>
      
      <div style="flex:1; padding: 24px 10px;">
        <div class="text-xs text-muted mb-xs" style="text-transform:uppercase; letter-spacing:1px">\${stepData.section} (\${currentStep + 1} de \${total})</div>
        <h2 style="color:var(--primary); margin-bottom: 24px; font-size: 1.5rem;">\${stepData.title}</h2>
        
        <div class="flex flex-col gap-md" style="margin-bottom: 32px">
          \${stepData.steps.map((s, i) => \`
            <div class="flex gap-md items-start">
              <div style="width:24px;height:24px;border-radius:50%;background:rgba(16,185,129,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;margin-top:2px;">\${i+1}</div>
              <div style="font-size:0.95rem; color:var(--text); line-height: 1.5;">\${s}</div>
            </div>
          \`).join('')}
        </div>
        
        \${stepData.tip ? \`
          <div style="background: rgba(6,182,212,0.1); border-left: 3px solid #06b6d4; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: auto;">
            <div style="font-size: 0.75rem; text-transform:uppercase; color: #06b6d4; font-weight:700; margin-bottom: 4px;">Dica PRO</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">\${stepData.tip}</div>
          </div>
        \` : ''}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:16px; border-top:1px solid var(--border-color);">
        \${currentStep > 0 
          ? \`<button class="btn btn-ghost" id="tutPrevBtn">Anterior</button>\` 
          : \`<div></div>\`}
        
        \${currentStep < total - 1 
          ? \`<button class="btn btn-primary" id="tutNextBtn">Próximo Passo</button>\` 
          : \`<button class="btn btn-success" id="tutFinishBtn">Finalizar Tutorial</button>\`}
      </div>
    \`;

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
      alert("Tutorial concluído! Você já pode explorar todas as ferramentas.");
      if(navigateFn) navigateFn('dashboard');
    });
  }

  renderCurrentStep();
}
