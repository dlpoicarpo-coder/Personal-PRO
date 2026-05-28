// ========================================
// PERSONAL PRO — Tutorial Page (v1)
// Interactive guide for all system features
// ========================================

const TUTORIALS = [
  {
    section: 'Primeiros Passos',
    icon: '▶',
    items: [
      {
        title: 'Configurar seu perfil de Personal Trainer',
        steps: [
          'Acesse <strong>Configurações</strong> no menu lateral',
          'Preencha seu nome, CREF e outras informações profissionais',
          'Defina o tema visual (claro ou escuro) da sua preferência',
          'Salve as configurações — seu nome e CREF aparecerão automaticamente nos PDFs gerados',
        ],
        tip: 'O CREF é exibido em todos os documentos PDF gerados pelo sistema, garantindo a identificação profissional.'
      },
      {
        title: 'Cadastrar um novo aluno',
        steps: [
          'Acesse <strong>Alunos</strong> no menu lateral',
          'Clique em <strong>+ Novo Aluno</strong>',
          'Preencha nome, código, data de nascimento, gênero, contato e objetivo',
          'Defina a <strong>Zona-Alvo de Treino</strong> e <strong>Frequência Semanal</strong>',
          'Clique em <strong>Salvar</strong>',
        ],
        tip: 'O código do aluno é usado na identificação em relatórios e PDFs. Ex: JOA-001.'
      },
    ]
  },
  {
    section: 'Treinos & Periodização',
    icon: '💪',
    items: [
      {
        title: 'Criar uma ficha de treino',
        steps: [
          'Acesse <strong>Treinos</strong> e clique em <strong>+ Novo Treino</strong>',
          'Selecione o aluno e dê um nome ao treino (ex: Treino A - Superior)',
          'Adicione exercícios: nome, séries, repetições, carga, descanso e método',
          'Use o campo <strong>Ciclo</strong> para organizar treinos por fase (ex: Ciclo 1 - Adaptação)',
          'Salve e depois gere o PDF com o botão <strong>PDF</strong> na listagem',
        ],
        tip: 'O nome dos exercícios possui autocompletar baseado na biblioteca do sistema. Comece a digitar para ver sugestões.'
      },
      {
        title: 'Criar um macrociclo de periodização',
        steps: [
          'Acesse <strong>Periodização</strong> e clique em <strong>+ Novo Macrociclo</strong>',
          'Selecione o aluno e defina o nome do macrociclo',
          'Escolha o modelo de periodização (linear, ondulatório, bloco)',
          'Defina as semanas totais, data de início e frequência de deload',
          'Selecione os dias da semana e horário de treino',
          'Opcionalmente, selecione um <strong>modelo de treino existente</strong> ou deixe o sistema gerar automaticamente',
          'Clique em <strong>Gerar Macrociclo</strong> — os treinos e sessões na agenda são criados automaticamente',
        ],
        tip: 'Cada semana é colorida por intensidade: verde (leve) → amarelo → laranja → vermelho (muito alta) → azul (deload).'
      },
      {
        title: 'Filtrar treinos por ciclo ativo',
        steps: [
          'Na página de <strong>Treinos</strong>, use o dropdown <strong>Ciclos</strong> ao lado dos filtros por aluno',
          'Selecione <strong>Apenas ciclo ativo</strong> para ver somente os treinos do macrociclo em andamento',
          'Ou selecione um macrociclo específico para visualização',
        ],
        tip: 'Combinando o filtro de aluno com o filtro de ciclo, você isola exatamente o que precisa.'
      },
    ]
  },
  {
    section: 'Agenda & Treino ao Vivo',
    icon: '📅',
    items: [
      {
        title: 'Agendar sessões de treino',
        steps: [
          'Acesse <strong>Agenda</strong> e clique em <strong>+ Agendar Treino</strong>',
          'Selecione o aluno e o treino desejado',
          'Escolha <strong>dias da semana</strong> e o número de semanas para repetição automática',
          'Defina horário e duração da sessão',
          'Clique em <strong>Agendar</strong> — as sessões são criadas na agenda automaticamente',
        ],
        tip: 'Use o filtro de aluno no topo da agenda para ver apenas as sessões de um aluno específico.'
      },
      {
        title: 'Iniciar um treino ao vivo',
        steps: [
          'Na agenda, clique em <strong>▶ Iniciar</strong> na sessão desejada',
          'O sistema abre o <strong>Treino ao Vivo</strong> já com o aluno e treino pré-selecionados',
          'Registre cada série com carga e repetições realizadas',
          'Use o cronômetro de descanso integrado entre as séries',
          'Ao finalizar, preencha o pós-treino (PSE, sono, energia) ou gere o link para o aluno preencher',
        ],
        tip: 'O link de pós-treino pode ser copiado e enviado via WhatsApp. Ao copiar, a sessão é finalizada automaticamente.'
      },
      {
        title: 'Enviar lembretes e links de biofeedback',
        steps: [
          'Na agenda, clique em <strong>WhatsApp</strong> para enviar lembrete de treino',
          'Clique em <strong>🏃 Pré</strong> para enviar o link do formulário pré-treino ao aluno',
          'Clique em <strong>🏋 Pós</strong> para enviar o link do formulário pós-treino',
          'Os dados preenchidos pelo aluno são salvos automaticamente no sistema',
        ],
        tip: 'O formulário de pré-treino pergunta sobre sono, energia e estresse. Ideal para monitorar a prontidão do aluno.'
      },
    ]
  },
  {
    section: 'Avaliações & Saúde',
    icon: '📊',
    items: [
      {
        title: 'Registrar avaliação física',
        steps: [
          'Acesse <strong>Avaliações</strong> e clique em <strong>+ Nova Avaliação</strong>',
          'Selecione o tipo: Composição Corporal, Conconi ou Força',
          'Para composição: preencha peso, altura e dobras cutâneas — o IMC e % gordura são calculados automaticamente',
          'Para força: informe exercício, carga e repetições — o 1RM estimado é calculado (fórmula de Epley)',
        ],
        tip: 'A fórmula de Pollock 3 dobras é usada para % de gordura, diferenciada por sexo e idade.'
      },
      {
        title: 'Calcular zonas de treino pelo aluno',
        steps: [
          'Acesse <strong>Avaliações</strong> → aba <strong>Zonas de Treino</strong>',
          'Selecione o aluno no dropdown — a idade é preenchida automaticamente',
          'Informe a FC de repouso e clique em <strong>Calcular Zonas</strong>',
          'As 5 zonas de FC são calculadas pela fórmula de Karvonen',
        ],
        tip: 'FC Máxima estimada pela fórmula de Tanaka: 208 - (0.7 × idade). Mais precisa que a fórmula 220 - idade.'
      },
    ]
  },
  {
    section: 'Biblioteca de Modelos & Financeiro',
    icon: '📚',
    items: [
      {
        title: 'Criar seus próprios Modelos de Treino',
        steps: [
          'Acesse <strong>Exercícios</strong> e vá na aba <strong>Meus Modelos</strong>',
          'Clique em <strong>+ Novo Modelo</strong>',
          'Monte o template com exercícios, cargas e intervalos',
          'Ao salvar, ele ficará disponível para uso rápido na criação de Fichas e Macrociclos',
        ],
        tip: 'Você pode visualizar ou editar seus modelos criados a qualquer momento.'
      },
      {
        title: 'Cálculo de Custo por Sessão (Financeiro)',
        steps: [
          'No cadastro do aluno, defina as <strong>Sessões Esperadas (Mês)</strong> e a <strong>Mensalidade</strong>',
          'Na aba <strong>Financeiro</strong>, o sistema calculará automaticamente o <strong>Custo/sessão</strong> (Mensalidade ÷ Sessões Esperadas)',
          'Veja o <strong>Valor proporcional</strong> gerado pelas sessões efetivamente realizadas no mês',
        ],
        tip: 'Isso ajuda a ter controle exato da rentabilidade de cada aluno por treino executado.'
      },
    ]
  },
  {
    section: 'Relatórios & Dossiê',
    icon: '📋',
    items: [
      {
        title: 'Gerar o dossiê de performance',
        steps: [
          'Acesse <strong>Relatórios</strong> e selecione o aluno',
          'O dossiê é gerado automaticamente com gráficos de bem-estar, carga, PSE e comparação de ciclos',
          'A periodização ativa do aluno é exibida com a semana atual destacada',
          'Clique em <strong>Exportar PDF</strong> para baixar o relatório completo',
        ],
        tip: 'O parecer do aluno é escrito em linguagem acessível. O parecer técnico inclui análise de overtraining e prontidão.'
      },
    ]
  },
  {
    section: 'Anamnese',
    icon: '📝',
    items: [
      {
        title: 'Enviar anamnese para novo aluno',
        steps: [
          'Acesse <strong>Anamnese</strong> no menu lateral',
          'Clique em <strong>Gerar Link de Anamnese</strong> — o link é copiado automaticamente',
          'Envie o link para o possível aluno via WhatsApp ou e-mail',
          'O aluno preenche o formulário completo: saúde, histórico, objetivos e estilo de vida',
          'Ao receber a anamnese, clique em <strong>Cadastrar Aluno</strong> para convertê-la em um cadastro automaticamente',
        ],
        tip: 'O formulário de anamnese contém 35 perguntas divididas em 5 seções, cobrindo todos os aspectos necessários para a prescrição segura.'
      },
    ]
  },
  {
    section: 'Portal do Aluno',
    icon: '📱',
    items: [
      {
        title: 'Como o aluno acessa o Portal',
        steps: [
          'No cadastro do aluno, ou na aba de alunos, copie o <strong>Link do Portal</strong>.',
          'Envie o link para o aluno pelo WhatsApp.',
          'O aluno não precisa de senha! O acesso é simplificado pelo link único que salva o progresso localmente.',
          'No portal, o aluno visualizará seus treinos, histórico, e gráficos de evolução.'
        ],
        tip: 'O Portal do Aluno pode ser adicionado à tela inicial do celular como um aplicativo (PWA).'
      },
      {
        title: 'Check-in e Checkout pelo Portal',
        steps: [
          'Antes de iniciar o treino, o aluno pode preencher o Biofeedback (Sono, TQR, Estresse, Dor).',
          'O aluno dá o "Check-in" em cada exercício que for completando.',
          'No final da sessão, ele preenche o formulário Pós-treino informando a Percepção de Esforço (PSE) e satisfação.',
          'O sistema sincroniza automaticamente esses dados para o seu painel de Relatórios!'
        ],
        tip: 'Todos os gráficos do Portal (Volume, Densidade, Radar de Wellness) atualizam sozinhos com esses dados!'
      }
    ]
  }
];

export function renderTutorial() {
  return `
    <div class="page-header">
      <div><h1>Tutorial do Sistema</h1><p class="subtitle">Guia completo de todas as funcionalidades do Personal PRO</p></div>
    </div>

    <div class="card mb-lg" style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.08));border:1px solid var(--primary)">
      <div class="flex items-center gap-md">
        <div style="font-size:2rem">▶</div>
        <div>
          <h3 style="margin:0">Bem-vindo ao Personal PRO</h3>
          <p class="text-muted text-sm" style="margin:4px 0 0">Sistema completo de gestão para Personal Trainers. Use este guia para dominar todas as funcionalidades.</p>
        </div>
      </div>
    </div>

    <div class="flex gap-sm mb-lg" style="flex-wrap:wrap">
      ${TUTORIALS.map((sec, i) => `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-secondary'} tutorial-section-btn" data-section="${i}">${sec.icon} ${sec.section}</button>`).join('')}
    </div>

    ${TUTORIALS.map((sec, si) => `
      <div class="tutorial-section ${si !== 0 ? 'hidden' : ''}" data-section="${si}">
        <h2 class="mb-lg" style="color:var(--primary)">${sec.icon} ${sec.section}</h2>
        ${sec.items.map((item, ii) => `
          <div class="card mb-md tutorial-item" id="tutorial_${si}_${ii}">
            <div class="card-header tutorial-toggle" data-target="tutorial_body_${si}_${ii}" style="cursor:pointer">
              <span class="card-title">${item.title}</span>
              <span class="tutorial-arrow" style="font-size:0.8rem;transition:transform 0.2s">▼</span>
            </div>
            <div id="tutorial_body_${si}_${ii}" class="tutorial-body" style="${ii === 0 ? '' : 'display:none'}">
              <ol style="margin:0 0 12px;padding-left:20px;line-height:1.9">
                ${item.steps.map(s => `<li>${s}</li>`).join('')}
              </ol>
              ${item.tip ? `<div class="tutorial-tip"><strong>Dica:</strong> ${item.tip}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

export function initTutorial() {
  // Section navigation
  document.querySelectorAll('.tutorial-section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.section;
      document.querySelectorAll('.tutorial-section-btn').forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
      btn.classList.replace('btn-secondary', 'btn-primary');
      document.querySelectorAll('.tutorial-section').forEach(s => s.classList.add('hidden'));
      document.querySelector(`.tutorial-section[data-section="${idx}"]`)?.classList.remove('hidden');
    });
  });

  // Accordion toggle
  document.querySelectorAll('.tutorial-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const bodyId = toggle.dataset.target;
      const body = document.getElementById(bodyId);
      const arrow = toggle.querySelector('.tutorial-arrow');
      if (body) {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : '';
        if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
      }
    });
  });
}
