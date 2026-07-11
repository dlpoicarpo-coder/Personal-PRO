export function renderTermos() {
  return `
    <div class="login-page">
      <div class="login-card fade-in" style="max-width: 800px; padding: 40px; text-align: left; max-height: 90vh; overflow-y: auto;">
        <div class="login-header" style="text-align: center;">
          <h1 class="login-title">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="login-subtitle">Termos de Uso</p>
        </div>
        
        <div class="legal-content" style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-top: 30px;">
          <p><strong>Última atualização: [DATA]</strong></p>
          <p>Bem-vindo ao <strong>Personal PRO</strong>. Este documento rege a licença de uso do software (SaaS) oferecido pela [NOME DA SUA EMPRESA / SEU NOME], inscrita no CNPJ/CPF [INSERIR AQUI], doravante denominada "Plataforma".</p>

          <h3 style="color: var(--text-primary); margin-top: 20px;">1. Objeto e Natureza do Serviço</h3>
          <p>A Plataforma oferece um sistema de gestão esportiva para Treinadores. A Plataforma atua apenas como uma ferramenta tecnológica.</p>

          <h3 style="color: var(--text-primary); margin-top: 20px;">2. Papel e Responsabilidades do Treinador</h3>
          <p>Ao utilizar a Plataforma, o Treinador declara e garante:</p>
          <ul style="margin-left: 20px; margin-bottom: 15px;">
            <li>2.1. Possuir o devido registro ativo no CREF.</li>
            <li>2.2. Ser o Controlador dos dados de seus alunos perante a LGPD.</li>
            <li>2.3. <strong>No trato de Alunos Menores de Idade:</strong> Reconhecer a obrigatoriedade da Data de Nascimento. O Treinador se compromete a cadastrar dados verídicos e válidos do Responsável Legal do menor. É expressamente vedada a inserção do e-mail do menor no campo destinado ao tutor com o intuito de burlar o fluxo sistêmico de consentimento parental (Art. 14 da LGPD), acarretando em imediato bloqueio da conta do Treinador e responsabilização civil.</li>
          </ul>

          <h3 style="color: var(--text-primary); margin-top: 20px;">3. Papel e Responsabilidades do Aluno ou Responsável Legal</h3>
          <p>Ao aceitar o convite para a Plataforma, atesta-se que:</p>
          <ul style="margin-left: 20px; margin-bottom: 15px;">
            <li>3.1. A Plataforma não se responsabiliza pelo risco clínico ou físico dos exercícios físicos prescritos. A responsabilidade é exclusiva do Treinador.</li>
            <li>3.2. Se o aceite for dado por um Responsável Legal, este assume civilmente ser o tutor do menor em questão. A superveniência da maioridade civil do aluno (completar 18 anos) não invalida, por si só, o aceite anterior, mas facultará ao agora maior de idade reafirmar suas autorizações via notificação na Plataforma.</li>
          </ul>

          <h3 style="color: var(--text-primary); margin-top: 20px;">4. Planos, Assinaturas e Retenção de Dados</h3>
          <p>Em caso de cancelamento da assinatura, a Plataforma garantirá um prazo de <strong>60 (sessenta) dias</strong> para exportação. Após esse prazo, os dados serão excluídos, mantendo-se exclusivamente as trilhas de consentimento jurídico inalienáveis.</p>

          <h3 style="color: var(--text-primary); margin-top: 20px;">5. Limitação de Responsabilidade</h3>
          <p>A Plataforma isenta-se de responsabilidade cível ou criminal sobre agravos de saúde ocorridos na execução dos treinamentos. Fica eleito o foro da Comarca de [SUA CIDADE/ESTADO] para litígios.</p>
        </div>

        <div class="text-center" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border);">
          <button class="btn btn-primary" onclick="window.history.back()" style="min-width: 200px;">Voltar</button>
        </div>
      </div>
    </div>
  `;
}
