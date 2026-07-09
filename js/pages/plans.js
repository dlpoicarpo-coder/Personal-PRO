import { navigateTo } from '../app.js';

export function renderPlans() {
  return `
    <div class="page-header text-center" style="margin-bottom: 40px; margin-top: 20px;">
      <h1>Assinaturas e Planos</h1>
      <p class="subtitle text-center">Escolha o plano ideal para a sua carteira de alunos.</p>
    </div>

    <div class="grid-3" style="align-items: center; max-width: 1000px; margin: 0 auto;">
      
      <!-- START -->
      <div class="card flex flex-col" style="padding: 30px 24px; position:relative;">
        <h2 style="font-size:1.5rem; color:var(--text); margin-bottom: 8px;">Start</h2>
        <p class="text-sm text-muted mb-md">Para quem está começando no digital.</p>
        <div style="font-size:2.5rem; font-weight:800; color:var(--primary); margin-bottom:24px;">R$49<span style="font-size:1rem; color:var(--text-muted); font-weight:400">/mês</span></div>
        
        <ul style="list-style:none; padding:0; margin:0 0 32px 0; display:flex; flex-direction:column; gap:12px; flex:1">
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Até 5 alunos ativos</li>
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Portal do Aluno (Zero-Trust)</li>
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Prescrição ilimitada</li>
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Gestão de cobranças manuais</li>
        </ul>
        <button class="btn btn-secondary plan-checkout-btn" data-plan="Start">Selecionar Start</button>
      </div>

      <!-- PRO -->
      <div class="card flex flex-col" style="padding: 40px 24px; border: 2px solid var(--primary); transform: scale(1.05); z-index: 10;">
        <div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:var(--primary); color:white; padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:700;">MAIS ESCOLHIDO</div>
        <h2 style="font-size:1.5rem; color:var(--text); margin-bottom: 8px;">Pro</h2>
        <p class="text-sm text-muted mb-md">Para personais consolidados.</p>
        <div style="font-size:2.5rem; font-weight:800; color:var(--primary); margin-bottom:24px;">R$99<span style="font-size:1rem; color:var(--text-muted); font-weight:400">/mês</span></div>
        
        <ul style="list-style:none; padding:0; margin:0 0 32px 0; display:flex; flex-direction:column; gap:12px; flex:1">
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Até 20 alunos ativos</li>
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Tudo do plano Start</li>
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Relatórios de Biofeedback</li>
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Exportação de planilhas</li>
        </ul>
        <button class="btn btn-primary plan-checkout-btn" data-plan="Pro">Assinar Pro</button>
      </div>

      <!-- STUDIO -->
      <div class="card flex flex-col" style="padding: 30px 24px;">
        <h2 style="font-size:1.5rem; color:var(--text); margin-bottom: 8px;">Studio</h2>
        <p class="text-sm text-muted mb-md">Para estúdios e academias.</p>
        <div style="font-size:2.5rem; font-weight:800; color:var(--primary); margin-bottom:24px;">R$199<span style="font-size:1rem; color:var(--text-muted); font-weight:400">/mês</span></div>
        
        <ul style="list-style:none; padding:0; margin:0 0 32px 0; display:flex; flex-direction:column; gap:12px; flex:1">
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Até 50 alunos ativos</li>
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Tudo do plano Pro</li>
          <li class="flex items-center gap-sm"><span style="color:var(--success)">✓</span> Suporte prioritário via WhatsApp</li>
        </ul>
        <button class="btn btn-secondary plan-checkout-btn" data-plan="Studio">Selecionar Studio</button>
      </div>
      
    </div>
    
    <div class="text-center" style="margin-top: 40px;">
      <p class="text-sm text-muted">Dúvidas sobre os planos? Fale conosco no suporte.</p>
    </div>
  `;
}

export function initPlans() {
  document.querySelectorAll('.plan-checkout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const plan = e.target.dataset.plan;
      alert(`Em ambiente de produção, este botão redirecionará você para o link de checkout seguro do Asaas para o plano ${plan}.`);
      // Lógica real: window.location.href = 'https://asaas.com/checkout/...';
    });
  });
}
