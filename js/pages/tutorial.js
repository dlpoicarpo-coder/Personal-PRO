// ========================================
// PERSONAL PRO — Tutorial Page (v2)
// ========================================

const TUTORIALS = [
  {
    section: 'Primeiros Passos',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    items: [
      {
        title: 'Configurar seu perfil de Personal Trainer',
        steps: [
          'Acesse <strong>Configurações</strong> no menu lateral',
          'Preencha nome, CREF, WhatsApp, e-mail e chave Pix',
          'Defina o tema visual (claro ou escuro)',
          'Seu nome e CREF aparecerão automaticamente nos PDFs e dossiês gerados',
        ],
        tip: 'A chave Pix aparece nas mensagens de cobrança enviadas via WhatsApp para os alunos.'
      },
      {
        title: 'Cadastrar um novo aluno',
        steps: [
          'Acesse <strong>Alunos</strong> e clique em <strong>+ Novo Aluno</strong>',
          'Preencha nome, data de nascimento, contato, objetivo e frequência semanal',
          'Informe o valor da mensalidade para que o sistema calcule o financeiro automaticamente',
          'O código é gerado automaticamente (ex: ERI-007)',
        ],
        tip: 'Você também pode cadastrar alunos automaticamente via formulário de Anamnese — basta clicar em "Cadastrar Aluno" ao receber o formulário preenchido.'
      },
    ]
  },
  {
    section: 'Treinos e Periodização',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    items: [
      {
        title: 'Criar uma ficha de treino',
        steps: [
          'Acesse <strong>Treinos</strong> e clique em <strong>+ Novo Treino</strong>',
          'Selecione o aluno, dê um nome e defina o ciclo (ex: Ciclo 1 - Adaptação)',
          'Adicione exercícios com nome (autocompletar), séries, reps, carga, descanso e método',
          'O <strong>Tipo de Carga</strong> define se é Peso (kg), Peso Corporal ou Tempo',
          'Ao selecionar um método (ex: Drop-set), as séries e descanso são sugeridos automaticamente',
        ],
        tip: 'Use o botão ▶ na lista de treinos para iniciar o Treino ao Vivo diretamente, com aluno e treino já selecionados.'
      },
      {
        title: 'Criar um macrociclo de periodização',
        steps: [
          'Acesse <strong>Periodização</strong> e clique em <strong>+ Novo Macrociclo</strong>',
          'Selecione o aluno, modelo (linear, ondulatório, blocos, conjugado...)',
          'Defina semanas totais, data de início e frequência de deload',
          'O sistema gera os treinos automaticamente semana a semana',
          'A semana atual fica destacada com a barra de progresso',
        ],
        tip: 'No modelo ondulatório (DUP), as semanas alternam entre Força, Hipertrofia e Metabólico. O gráfico de barras mostra a distribuição de intensidade visualmente.'
      },
      {
        title: 'Usar a biblioteca de exercícios e métodos',
        steps: [
          'Acesse <strong>Exercícios</strong> para ver todos os exercícios organizados por grupo muscular',
          'Filtre por tipo de carga (Peso, Peso Corporal, Tempo) ou categoria',
          'A aba <strong>Métodos</strong> lista todos os métodos com séries, reps e descanso recomendados',
          'A aba <strong>Modelos Prontos</strong> tem fichas completas para aplicar a qualquer aluno',
          'Em <strong>Meus Modelos</strong>, crie templates reutilizáveis personalizados',
        ],
        tip: 'Ao selecionar um exercício do banco na ficha de treino, o tipo de carga e reps padrão são preenchidos automaticamente.'
      },
    ]
  },
  {
    section: 'Agenda e Treino ao Vivo',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    items: [
      {
        title: 'Agendar sessões de treino',
        steps: [
          'Acesse <strong>Agenda</strong> e clique em <strong>+ Agendar Treino</strong>',
          'Selecione o aluno, treino, data, horário e duração',
          'O calendário visual mostra os dias com treinos por cor (agendado, confirmado, realizado, faltou)',
          'Envie lembretes via WhatsApp diretamente da agenda',
        ],
        tip: 'Use os botões WA Pré e WA Pós para enviar links de check-in para o aluno preencher antes e depois do treino.'
      },
      {
        title: 'Registrar um treino ao vivo',
        steps: [
          'Acesse <strong>Treino ao Vivo</strong>, selecione aluno e treino',
          'Preencha o check-in pré-treino (sono, disposição, energia, estresse, dor)',
          'Registre cada série: reps realizadas, carga utilizada e PSE',
          'O cronômetro de descanso inicia automaticamente ao confirmar cada série',
          'Ao finalizar, preencha o pós-treino ou envie o link para o aluno',
        ],
        tip: 'O timer de descanso continua contando ao navegar entre exercícios. Use os botões rápidos (30s, 45s, 1min) para ajustar o tempo.'
      },
    ]
  },
  {
    section: 'Avaliações e Biofeedback',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    items: [
      {
        title: 'Registrar avaliação física',
        steps: [
          'Acesse <strong>Avaliações</strong> e clique em <strong>+ Nova Avaliação</strong>',
          'Para <strong>Composição Corporal</strong>: peso, altura, 3 dobras cutâneas (Jackson & Pollock) e circunferências',
          'Para <strong>Força / 1RM</strong>: informe exercício, carga e reps — 4 fórmulas disponíveis (Epley, Brzycki, Lander, Lombardi)',
          'Para <strong>Conconi</strong>: FC pico, VMA e limiar anaeróbio — VO₂max calculado automaticamente',
          'A aba <strong>Evolução</strong> mostra o histórico com delta de peso colorido',
        ],
        tip: 'Ao registrar um 1RM, o sistema marca automaticamente se é PR (Personal Record) do aluno naquele exercício.'
      },
      {
        title: 'Monitorar bem-estar com biofeedback',
        steps: [
          'Acesse <strong>Biofeedback</strong> para ver check-ins de todos os alunos',
          'Use o filtro por aluno para ver o ACWR (Carga Aguda:Crônica)',
          'ACWR ideal: entre 0.8 e 1.3. Abaixo = destreino, acima = risco de lesão',
          'O gráfico de tendência mostra Sono, Disposição, Energia e Estresse ao longo do tempo',
          'Alertas automáticos são exibidos para sono < 5, estresse ≥ 8 ou dor ≥ 6',
        ],
        tip: 'O gráfico de bem-estar usa apenas registros com dados completos (não inclui registros de PSE do tracker sem check-in manual).'
      },
    ]
  },
  {
    section: 'Financeiro e Relatórios',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    items: [
      {
        title: 'Gerenciar mensalidades',
        steps: [
          'Acesse <strong>Financeiro</strong> e clique em <strong>⚡ Gerar Mensalidades</strong>',
          'Selecione os alunos, mês inicial, quantos meses e dia de vencimento',
          'O valor é puxado automaticamente do cadastro de cada aluno',
          'Use <strong>Marcar como Pago</strong> para confirmar a data e método de pagamento',
          'Cobranças vencidas ficam no topo, em vermelho, com botão WhatsApp direto',
        ],
        tip: 'O card "Recebido" do Dashboard usa a data de pagamento (não a de vencimento) para calcular a receita do mês.'
      },
      {
        title: 'Gerar o Dossiê de Performance',
        steps: [
          'Acesse <strong>Relatórios</strong> e selecione o aluno',
          'Opcionalmente filtre por ciclo específico',
          'O relatório inclui: stats de sessões, volume total, PSE, sono, progressão de carga por exercício e gráficos',
          'A <strong>Progressão de Carga</strong> mostra a evolução em kg e % por exercício registrado via Live Tracker',
          'Clique em <strong>Gerar PDF</strong> — abre em nova aba para salvar (Ctrl+P)',
          'Ou use <strong>Enviar</strong> para mandar um resumo diretamente via WhatsApp ao aluno',
        ],
        tip: 'Para a progressão de carga aparecer no relatório, o treino deve ser realizado pelo Live Tracker com as séries registradas.'
      },
    ]
  },
  {
    section: 'Anamnese',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
    items: [
      {
        title: 'Enviar anamnese para novo aluno',
        steps: [
          'Acesse <strong>Anamnese</strong> e clique em <strong>Gerar Link</strong>',
          'O link é copiado automaticamente e vinculado à sua conta',
          'Clique em <strong>Enviar via WhatsApp</strong> diretamente pelo modal',
          'O aluno preenche 35 perguntas no celular, sem precisar de conta',
          'Ao receber, clique em <strong>Cadastrar Aluno</strong> para converter em cadastro completo',
        ],
        tip: 'O formulário de anamnese já preenche automaticamente: nome, contato, objetivo, frequência, horário preferido e observações de saúde no cadastro do aluno.'
      },
    ]
  },
{
    icon: '📊',
    title: 'Relatórios e Gráficos',
    items: [
      { q: 'Como ver o relatório de um aluno?', a: 'Vá em Relatórios, selecione o aluno e o ciclo. O sistema gera automaticamente gráficos de progressão de carga, bem-estar, PSE, wellness radar e gasto calórico por sessão.' },
      { q: 'O que é o gráfico de Kcal?', a: 'Estima o gasto calórico de cada sessão usando MET 5.0 (musculação) × peso corporal × duração (Compêndio ACSM, Ainsworth 2011). Útil para ajuste nutricional ao longo do ciclo.' },
      { q: 'Como filtrar por ciclo no relatório?', a: 'Após selecionar o aluno, o seletor de ciclos aparece automaticamente. Escolha o ciclo para ver dados filtrados daquele período.' },
      { q: 'Como exportar o relatório em PDF?', a: 'Clique no botão PDF no canto superior do relatório. O sistema usa jsPDF para gerar um documento completo com todos os gráficos e dados do ciclo.' },
    ]
  },
  {
    icon: '📱',
    title: 'Formulários dos Alunos',
    items: [
      { q: 'Como enviar o link de check-in para o aluno?', a: 'Na Agenda, clique no botão de WhatsApp ao lado do agendamento. O sistema abre o WhatsApp com a mensagem já preenchida e o link do check-in. O aluno clica e preenche em ~30 segundos.' },
      { q: 'O que é TQR?', a: 'Total Quality Recovery (Kenttä & Hassmén, 1998). Escala de 1-10 que mede a percepção de recuperação do aluno. TQR ≤ 3 = alerta vermelho (não treinar pesado). TQR ≥ 7 = boa prontidão.' },
      { q: 'Quando enviar o formulário pós-treino?', a: 'O sistema envia automaticamente ao finalizar a sessão no Treino ao Vivo. O aluno recebe via WhatsApp com o link para avaliar PSE, TQR pós e possíveis dores.' },
      { q: 'Como ver as respostas do aluno?', a: 'No Treino ao Vivo, antes de iniciar a sessão, o sistema mostra automaticamente os dados do check-in pré do aluno (sono, TQR, cabeça, dor). Os dados ficam salvos no relatório da sessão.' },
    ]
  },
  {
    icon: '⚡',
    title: 'Treino ao Vivo — PSE e RIR',
    items: [
      { q: 'O que é PSE por série?', a: 'Percepção Subjetiva de Esforço (Borg 1982, adaptado Foster 1996). Registre o esforço percebido de cada série individualmente (1=muito leve, 10=máximo). Os dados aparecem no resumo e relatório.' },
      { q: 'O que é RIR?', a: 'Reps in Reserve — quantas repetições sobraram antes da falha. RIR 0 = chegou à falha. RIR 3 = parou com 3 repetições sobrando. Evidências (Helms 2016) mostram que RIR 1-3 é ótimo para hipertrofia.' },
      { q: 'Como o 1RM é estimado?', a: 'Automaticamente por série usando a fórmula de Epley: 1RM = carga × (1 + reps/30). Disponível quando reps ≤ 12. Aparece no resumo e permite rastrear progressão de força.' },
    ]
  },
];

export function renderTutorial() {
  return `
    <div class="page-header">
      <div><h1>Tutorial do Sistema</h1><p class="subtitle">Guia completo de todas as funcionalidades do Personal PRO</p></div>
    </div>

    <div class="card mb-lg" style="background:linear-gradient(135deg,rgba(16,185,129,0.07),rgba(6,182,212,0.07));border:1px solid var(--border-active)">
      <div class="flex items-center gap-md">
        <div style="width:44px;height:44px;background:var(--primary);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div>
          <h3 style="margin:0">Bem-vindo ao Personal PRO</h3>
          <p class="text-muted text-sm" style="margin:4px 0 0">Sistema completo de gestão para personal trainers. Use as seções abaixo para dominar cada funcionalidade.</p>
        </div>
      </div>
    </div>

    <div class="tabs" id="tutorialTabs" style="margin-bottom:20px">
      ${TUTORIALS.map((sec, i) => `
        <button class="tab ${i===0?'active':''} tutorial-section-btn" data-section="${i}" style="display:flex;align-items:center;gap:6px">
          ${sec.icon} ${sec.section}
        </button>`).join('')}
    </div>

    ${TUTORIALS.map((sec, si) => `
      <div class="tutorial-section ${si!==0?'hidden':''}" data-section="${si}">
        <h2 style="color:var(--primary);margin-bottom:16px;display:flex;align-items:center;gap:8px">
          ${sec.icon} ${sec.section}
        </h2>
        ${sec.items.map((item, ii) => `
          <div class="card mb-md">
            <div class="card-header tutorial-toggle" data-target="tb_${si}_${ii}" style="cursor:pointer;user-select:none">
              <span class="card-title" style="font-size:0.95rem">${item.title}</span>
              <svg class="tutorial-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition:transform 0.2s;${ii===0?'transform:rotate(180deg)':''}"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div id="tb_${si}_${ii}" style="${ii!==0?'display:none':''}">
              <ol style="margin:0 0 12px;padding-left:22px;line-height:2">
                ${item.steps.map(s=>`<li style="font-size:0.88rem">${s}</li>`).join('')}
              </ol>
              ${item.tip ? `
              <div style="padding:10px 14px;background:rgba(16,185,129,0.07);border-radius:8px;border-left:3px solid var(--primary)">
                <span style="font-size:0.8rem;color:var(--primary);font-weight:700">Dica: </span>
                <span style="font-size:0.82rem;color:var(--text-secondary)">${item.tip}</span>
              </div>` : ''}
            </div>
          </div>`).join('')}
      </div>`).join('')}
  `;
}

export function initTutorial() {
  document.querySelectorAll('.tutorial-section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tutorial-section-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const idx = btn.dataset.section;
      document.querySelectorAll('.tutorial-section').forEach(s => s.classList.add('hidden'));
      document.querySelector(`.tutorial-section[data-section="${idx}"]`)?.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.tutorial-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const body  = document.getElementById(toggle.dataset.target);
      const arrow = toggle.querySelector('.tutorial-arrow');
      if (!body) return;
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : '';
      if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
    });
  });
}
