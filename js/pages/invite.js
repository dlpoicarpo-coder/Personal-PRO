import { getSupabase } from '../utils/auth.js';
import { notify } from '../components/toast.js';

export function renderInviteScreen() {
  return `
    <div class="portal-root" data-theme="dark">
      <div class="portal-pin-screen">
        <div class="portal-pin-card" style="max-width: 400px; width: 90%; padding: 30px 20px;">
          <div class="portal-logo" style="margin-bottom: 20px">Personal<strong>PRO</strong></div>
          
          <div id="inviteLoading" style="text-align:center">
            <div class="spinner" style="margin: 0 auto"></div>
            <p style="margin-top:15px; color:var(--text-muted)">Preparando seu acesso...</p>
          </div>

          <div id="inviteContent" style="display:none">
            <h2 class="portal-pin-name" style="font-size:1.4rem; margin-bottom:10px">Bem-vindo(a)!</h2>
            <p class="portal-pin-sub" id="inviteStudentName" style="margin-bottom: 25px">Defina sua senha de acesso ao portal</p>
            
            <form id="invitePasswordForm">
              <div class="form-group" style="text-align: left">
                <label class="form-label" style="color:var(--text-primary)">Nova Senha</label>
                <input type="password" id="invitePassword" class="form-input" required minlength="6" placeholder="Mínimo 6 caracteres" style="background:var(--bg-body); border-color:var(--border-color); color:var(--text-primary)"/>
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
  const sb = getSupabase();
  if (!sb) {
    notify.error('Erro de conexão.');
    return;
  }

  const loadingEl = document.getElementById('inviteLoading');
  const contentEl = document.getElementById('inviteContent');
  const errorEl = document.getElementById('inviteError');
  const form = document.getElementById('invitePasswordForm');
  const nameEl = document.getElementById('inviteStudentName');

  try {
    // 1. Verificar se a sessão foi estabelecida com sucesso
    const { data: { session }, error: sessionError } = await sb.auth.getSession();
    
    if (sessionError || !session) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
      return;
    }

    // 2. Buscar o nome do aluno via RLS (já está vinculado pelo backend)
    const { data: student, error: studentError } = await sb
      .from('students')
      .select('id, name')
      .eq('auth_user_id', session.user.id)
      .single();

    if (studentError || !student) {
      console.warn('Aluno não encontrado via RLS:', studentError);
      // Fallback: se não achar o nome, só exibe mensagem genérica
      nameEl.innerHTML = `Defina sua senha de acesso ao portal`;
    } else {
      const firstName = (student.name || 'Aluno').split(' ')[0];
      nameEl.innerHTML = `Olá, <strong>${firstName}</strong>!<br>Defina sua senha de acesso ao portal`;
      
      // Salva o ID do estudante logado no localStorage para o portal saber qual abrir
      localStorage.setItem('portal_logged_student_id', student.id);
    }

    // Exibir formulário
    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';

    // 3. Submeter formulário
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pwd = document.getElementById('invitePassword').value;
      const btn = document.getElementById('inviteSubmitBtn');
      
      btn.disabled = true;
      btn.innerHTML = 'Salvando...';

      const { error: updateError } = await sb.auth.updateUser({
        password: pwd
      });

      if (updateError) {
        notify.error('Erro ao salvar senha: ' + updateError.message);
        btn.disabled = false;
        btn.innerHTML = 'Salvar e Entrar';
        return;
      }

      notify.success('Senha definida com sucesso!');
      
      // Redireciona para o portal. O id já está no localStorage.
      setTimeout(() => {
        if (student && student.id) {
           window.location.hash = `/portal/${student.id}`;
        } else {
           window.location.hash = '/portal';
        }
      }, 1000);
    });

  } catch (err) {
    console.error(err);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}
