import { getSupabase } from '../utils/auth.js';
import { notify } from '../components/toast.js';

export function renderInviteScreen() {
  return `
    <div class="portal-root" data-theme="dark">
      <div class="portal-pin-screen">
        <div class="portal-pin-card" style="max-width: 400px; width: 90%; padding: 30px 20px;">
          <div class="vetor-logo" style="margin-bottom: 20px; justify-content: center; font-size: 1.5rem;">
            <span class="vetor-name">Vetor</span>
            <i class="vetor-diamond" style="width: 12px; height: 12px;"></i>
          </div>
          
          <div id="inviteLoading" style="text-align:center">
            <div class="spinner" style="margin: 0 auto"></div>
            <p style="margin-top:15px; color:var(--text-muted)">Preparando seu acesso...</p>
          </div>

          <div id="inviteContent" style="display:none">
            <h2 class="portal-pin-name" style="font-size:1.4rem; margin-bottom:10px">Bem-vindo(a)!</h2>
            <p class="portal-pin-sub" id="inviteStudentName" style="margin-bottom: 25px">Defina sua senha de acesso ao portal</p>
            
            <form id="invitePasswordForm">
              <div id="guardianConfirmation" style="display:none; text-align: left; background: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--warning);">
                <h4 style="margin:0 0 10px; color: var(--warning); font-size: 0.9rem">Confirmação do Responsável Legal</h4>
                <div class="form-group" style="margin-bottom: 10px">
                  <label class="form-label" style="color:var(--text-primary)">Seu Nome Completo *</label>
                  <input type="text" id="guardianConfirmName" class="form-input" placeholder="Nome Completo" style="background:var(--bg-body); border-color:var(--border-color); color:var(--text-primary)"/>
                </div>
                <div class="form-group" style="margin-bottom: 10px">
                  <label class="form-label" style="color:var(--text-primary)">Seu CPF *</label>
                  <input type="text" id="guardianConfirmCpf" class="form-input" placeholder="000.000.000-00" style="background:var(--bg-body); border-color:var(--border-color); color:var(--text-primary)"/>
                </div>
                <div class="form-group" style="margin-bottom: 10px">
                  <label class="form-label" style="color:var(--text-primary)">Parentesco com o menor *</label>
                  <input type="text" id="guardianConfirmRel" class="form-input" placeholder="Ex: Pai, Mãe" style="background:var(--bg-body); border-color:var(--border-color); color:var(--text-primary)"/>
                </div>
              </div>

              <div class="form-group" style="text-align: left; margin-bottom: 20px">
                <label class="form-label" style="color:var(--text-primary)">Nova Senha de Acesso *</label>
                <input type="password" id="invitePassword" class="form-input" required minlength="6" placeholder="Mínimo 6 caracteres" style="background:var(--bg-body); border-color:var(--border-color); color:var(--text-primary)"/>
              </div>
              
              <div class="form-group" style="text-align: left; margin-bottom: 10px; display: flex; gap: 8px; align-items: flex-start;">
                <input type="checkbox" id="inviteTermsCheck" required style="margin-top: 4px;" />
                <label for="inviteTermsCheck" id="labelTerms" style="font-size: 0.85rem; color: var(--text-muted); cursor: pointer; line-height: 1.4;">
                  Li e aceito os <a href="#/termos" target="_blank" style="color: var(--primary); text-decoration: none;">Termos de Uso</a> e a <a href="#/privacidade" target="_blank" style="color: var(--primary); text-decoration: none;">Política de Privacidade</a>.
                </label>
              </div>
              
              <div class="form-group" style="text-align: left; margin-bottom: 20px; display: flex; gap: 8px; align-items: flex-start;">
                <input type="checkbox" id="inviteHealthCheck" required style="margin-top: 4px;" />
                <label for="inviteHealthCheck" id="labelHealth" style="font-size: 0.85rem; color: var(--text-muted); cursor: pointer; line-height: 1.4;">
                  Autorizo o tratamento dos meus dados de saúde (avaliações físicas, biofeedback, condições médicas, lesões e medicações) para fins de acompanhamento do meu treinamento por meu personal trainer.
                </label>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; margin-top: 10px; font-size:1rem" id="inviteSubmitBtn">Salvar e Entrar</button>
            </form>
          </div>

          <div id="inviteError" style="display:none; text-align:center">
            <h2 class="portal-pin-name" style="font-size:1.4rem; color:var(--danger)">Link Inválido ou Expirado</h2>
            <p class="portal-pin-sub" style="margin-top:10px">Solicite um novo convite ao seu treinador.</p>
          </div>

        </div>
      </div>
    </div>
  `;
}

export async function initInviteScreen() {
  const loadingEl = document.getElementById('inviteLoading');
  const contentEl = document.getElementById('inviteContent');
  const errorEl = document.getElementById('inviteError');
  const form = document.getElementById('invitePasswordForm');
  const nameEl = document.getElementById('inviteStudentName');

  // Extrair o token do hash: #/convite?t=123
  const hash = window.location.hash;
  const tokenMatch = hash.match(/\?t=([^&]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    return;
  }

  let studentEmail = '';

  try {
    // 1. GET: Validar token no servidor
    const res = await fetch(`/api/accept-invite?token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!res.ok || !data.valid) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
      return;
    }

    studentEmail = data.email;
    const firstName = (data.studentName || 'Aluno').split(' ')[0];
    let isMinorFlag = data.isMinor;
    
    if (isMinorFlag) {
       nameEl.innerHTML = `Olá, responsável por <strong>${firstName}</strong>!<br>Configure o acesso do menor ao portal`;
       document.getElementById('guardianConfirmation').style.display = 'block';
       document.getElementById('guardianConfirmName').required = true;
       document.getElementById('guardianConfirmCpf').required = true;
       document.getElementById('guardianConfirmRel').required = true;
       
       if (data.guardianData) {
         if (data.guardianData.name) document.getElementById('guardianConfirmName').value = data.guardianData.name;
         if (data.guardianData.cpf) document.getElementById('guardianConfirmCpf').value = data.guardianData.cpf;
         if (data.guardianData.relationship) document.getElementById('guardianConfirmRel').value = data.guardianData.relationship;
       }
       
       document.getElementById('labelTerms').innerHTML = `Na qualidade de responsável legal, declaro ter lido e aceito os <a href="#/termos" target="_blank" style="color: var(--primary); text-decoration: none;">Termos de Uso</a> e a <a href="#/privacidade" target="_blank" style="color: var(--primary); text-decoration: none;">Política de Privacidade</a> em nome do menor.`;
       
       document.getElementById('labelHealth').innerHTML = `Na qualidade de responsável legal, AUTORIZO EXPRESSAMENTE o tratamento dos dados de saúde do menor (avaliações físicas, biofeedback, condições médicas, lesões e medicações) para fins de acompanhamento do treinamento prescrito pelo personal trainer.`;
    } else {
       nameEl.innerHTML = `Olá, <strong>${firstName}</strong>!<br>Defina sua senha de acesso ao portal`;
    }
    if (data.studentId) localStorage.setItem('portal_logged_student_id', data.studentId);

    // Exibir formulário
    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';

    // 2. POST: Definir senha e aceitar convite
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pwd = document.getElementById('invitePassword').value;
      const btn = document.getElementById('inviteSubmitBtn');
      
      btn.disabled = true;
      btn.innerHTML = 'Salvando...';

      const postDataBody = {
        token, 
        password: pwd,
        consentData: {
           termsVersion: '1.0',
           isMinor: isMinorFlag,
           guardianName: isMinorFlag ? document.getElementById('guardianConfirmName').value : null,
           guardianCpf: isMinorFlag ? document.getElementById('guardianConfirmCpf').value : null,
           guardianRelationship: isMinorFlag ? document.getElementById('guardianConfirmRel').value : null
        }
      };

      const postRes = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postDataBody)
      });

      const postData = await postRes.json();

      if (!postRes.ok) {
        notify.error('Erro: ' + (postData.error || 'Falha ao aceitar convite'));
        btn.disabled = false;
        btn.innerHTML = 'Salvar e Entrar';
        return;
      }

      notify.success('Senha definida com sucesso! Entrando...');
      
      // 3. Login silencioso com a nova senha
      const { getSupabase } = await import('../utils/auth.js');
      const sb = getSupabase();
      if (sb) {
        await sb.auth.signInWithPassword({ email: studentEmail, password: pwd });
      }
      
      // Redireciona para o portal principal
      setTimeout(() => {
        window.location.hash = '/portal';
      }, 1000);
    });

  } catch (err) {
    console.error(err);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}
