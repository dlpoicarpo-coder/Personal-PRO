export function renderPrivacidade() {
  return `
    <div class="login-page">
      <div class="login-card fade-in" style="max-width: 800px; padding: 40px; text-align: left; max-height: 90vh; overflow-y: auto;">
        <div class="login-header" style="display:flex; justify-content:center; align-items:center; margin-bottom:20px; font-size:1.8rem;">
          <div class="vetor-logo">
            <span class="vetor-name">Vetor</span>
            <i class="vetor-diamond"></i>
          </div>
        </div>
        
        <div class="legal-content" style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-top: 30px;">
          <p><strong>Última atualização: [DATA]</strong></p>
          <p>A Plataforma <strong>Personal PRO</strong> valoriza e respeita a sua privacidade. Esta Política de Privacidade descreve como tratamos, protegemos e armazenamos os dados pessoais de Treinadores e Alunos.</p>

          <h3 style="color: var(--text-primary); margin-top: 20px;">1. Papéis e Responsabilidades (LGPD)</h3>
          <ul style="margin-left: 20px; margin-bottom: 15px;">
            <li><strong>O Personal Trainer</strong> atua como <strong>Controlador</strong> dos dados.</li>
            <li><strong>O Personal PRO</strong> atua como <strong>Operador</strong> dos dados.</li>
          </ul>

          <h3 style="color: var(--text-primary); margin-top: 20px;">2. Dados Coletados e Base Legal</h3>
          <ul style="margin-left: 20px; margin-bottom: 15px;">
            <li><strong>2.1. Dados de Cadastro, Contato e Responsáveis Legais:</strong> Coletamos nome, e-mail, telefone/WhatsApp, data de nascimento e, no caso de alunos menores de idade, os dados de seus responsáveis legais. A data de nascimento é de preenchimento obrigatório.</li>
            <li><strong>2.2. Dados Pessoais Sensíveis (Saúde):</strong> O Personal PRO processa dados de saúde. O tratamento ocorre <strong>exclusivamente mediante consentimento específico e destacado</strong> (Art. 11, I, LGPD).</li>
            <li><strong>2.3. Menores de Idade (Art. 14 da LGPD):</strong> Quando um aluno é menor, o Treinador cadastra obrigatoriamente um Responsável Legal. O convite é enviado exclusivamente para o Responsável, que deve aceitar estes Termos em nome do menor e conceder consentimento explícito. Caso o aluno complete 18 anos durante a utilização do serviço, o consentimento do responsável permanece legalmente válido; todavia, a Plataforma notificará o aluno para ratificar seu consentimento direto.</li>
          </ul>

          <h3 style="color: var(--text-primary); margin-top: 20px;">3. Armazenamento e Subprocessadores (Transferência Internacional)</h3>
          <p>Utilizamos Supabase/AWS, Vercel e Resend. Os dados podem ser processados em servidores no exterior, em estrita conformidade com o Art. 33 da LGPD, mediante salvaguardas contratuais.</p>

          <h3 style="color: var(--text-primary); margin-top: 20px;">4. Retenção, Exclusão e Anonimização de Dados</h3>
          <ul style="margin-left: 20px; margin-bottom: 15px;">
            <li><strong>Aluno Inativo (Anonimização Automática):</strong> Após <strong>24 meses</strong> de inatividade absoluta, todos os dados identificadores são permanentemente deletados. Restará apenas o histórico biométrico anonimizado ("Aluno #A47").</li>
            <li><strong>Cancelamento do Treinador:</strong> Após o cancelamento, o Treinador terá <strong>60 dias</strong> para exportação de dados; posteriormente, a base ativa será excluída.</li>
            <li><strong>Registros de Consentimento:</strong> Os logs sistêmicos são mantidos permanentemente em infraestrutura isolada para conformidade e defesa jurídica, sobrevivendo à exclusão/anonimização das contas principais.</li>
          </ul>

          <h3 style="color: var(--text-primary); margin-top: 20px;">5. Direitos do Titular de Dados e Canal Direto</h3>
          <p>O aluno (ou seu responsável legal) pode solicitar exclusão, acesso ou revogação acionando seu Treinador ou diretamente o Operador através do canal direto: [INSERIR E-MAIL JURÍDICO/DPO].</p>

          <h3 style="color: var(--text-primary); margin-top: 20px;">6. Segurança da Informação e Incidentes</h3>
          <p>Utilizamos proteção multi-tenant via RLS. Em caso de incidentes de segurança com risco relevante aos titulares, o Personal PRO notificará a ANPD e os Treinadores afetados em até <strong>72 horas</strong>.</p>
        </div>

        <div class="text-center" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border);">
          <button class="btn btn-primary" onclick="window.history.back()" style="min-width: 200px;">Voltar</button>
        </div>
      </div>
    </div>
  `;
}
