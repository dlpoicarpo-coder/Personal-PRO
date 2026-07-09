/**
 * =========================================================================
 * MIGRATION: STUDENT PORTAL ZERO-TRUST AUTH REFACTOR
 * =========================================================================
 * Este código não deve ser copiado inteiro e sim mesclado nas funções originais.
 * Ele demonstra como refatorar `js/pages/student-portal.js` para usar 
 * a nova lógica segura sem vazar dados no preload.
 */

// 1. Modificar o auth.js ou criar uma forma de injetar o header
// Em js/utils/auth.js ou no topo de db.js adicione:
/*
export let studentToken = null;
export function setStudentToken(token) {
  studentToken = token;
  // Recria o cliente do Supabase passando o header customizado para o RLS
  window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { 'x-student-token': token } }
  });
}
*/

// 2. Refatorar renderStudentPortal no js/pages/student-portal.js
export async function renderStudentPortal(rawParam) {
  if (!rawParam || rawParam === 'undefined') {
    return renderEmailLoginScreen();
  }
  
  const [studentId, query] = rawParam.split('?');
  const params = new URLSearchParams(query || '');
  let trainerId = params.get('t') || '';

  // ANTES (INSEGURO):
  // const student = await db.get('students', studentId).catch(() => null);
  // DEPOIS (SEGURO): NÃO BUSCA NADA SEM O PIN (pois vai falhar na Policy!)

  portalState.studentId = studentId;
  portalState.trainerId = trainerId;
  
  // No Portal do Aluno, quem responde qual é o trainerId será a API pós-autenticação.
  // db.studentPortalTrainerId = trainerId; 

  const sessionKey = `portal_auth_${studentId}`;
  const token = sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey);
  const isAuth = !!token;

  if (!isAuth) {
    // Passamos null para o 'student', a tela do PIN não mostrará o nome para não vazar.
    return renderPINScreen(null, studentId, trainerId);
  }

  // Agora SIM, temos autorização. Injetamos o token no Supabase Client.
  // setStudentToken(token); // (função a ser implementada no db.js/auth.js)

  // Agora podemos buscar o student com segurança
  const student = await db.get('students', studentId).catch(() => null);
  if (!student) {
    // Token inválido ou expirado
    localStorage.removeItem(sessionKey);
    sessionStorage.removeItem(sessionKey);
    return renderPINScreen(null, studentId, trainerId);
  }

  portalState.student = student;
  return renderPortalShell(student);
}


// 3. Modificar o HTML da Tela do PIN para não exigir o "nome" do aluno
function renderPINScreen(student, studentId, trainerId) {
  const pinDigitsHtml = Array.from({length: 4}).map((_, i) => `<span class="pin-dot" id="dot${i}"></span>`).join('');
  
  return `
    <div class="portal-root" data-theme="dark">
      <div class="portal-pin-screen">
        <div class="portal-pin-card">
          <div class="portal-pin-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <!-- NOME REMOVIDO PARA EVITAR LEAK DE DADOS PRIVADOS -->
          <h2 class="portal-pin-name">Acesso ao Portal</h2>
          <p class="portal-pin-sub">Digite seu PIN de segurança</p>

          <div class="portal-pin-display">
            <div class="portal-pin-dots" id="pinDots">
              ${pinDigitsHtml}
            </div>
            <div id="pinError" class="portal-pin-error" style="display:none">PIN incorreto. Tente novamente.</div>
          </div>

          <div class="portal-pin-keypad">
            <!-- Os botões de teclado seguem iguais -->
            ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-key" data-key="${n}">${n}</button>`).join('')}
            <button class="pin-key pin-key-empty"></button>
            <button class="pin-key" data-key="0">0</button>
            <button class="pin-key" data-key="backspace" style="font-size:1.2rem;background:rgba(239,68,68,0.1);color:#ef4444">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 4. Modificar initPINHandlers para usar a RPC do Supabase
function initPINHandlers() {
  const dots = document.querySelectorAll('.pin-dot');
  const errorEl = document.getElementById('pinError');
  let pin = '';
  let isLoading = false;

  const updateDots = (val) => {
    dots.forEach((dot, i) => dot.classList.toggle('pin-dot-filled', i < val.length));
  };

  const verifyPin = async () => {
    if (isLoading) return;
    isLoading = true;
    errorEl.style.display = 'none';

    try {
      // Chama a função Postgres Security Definer
      const { data, error } = await window.supabase.rpc('verify_student_pin', {
        p_student_id: portalState.studentId,
        p_pin: pin
      });

      if (error || !data || !data.success) {
        throw new Error(error?.message || data?.error || 'PIN incorreto.');
      }

      // Sucesso! Temos o Token de Sessão gerado e o TrainerId!
      const token = data.token;
      portalState.trainerId = data.trainer_id;
      db.studentPortalTrainerId = data.trainer_id;

      // Persistência
      const sessionKey = `portal_auth_${portalState.studentId}`;
      localStorage.setItem(sessionKey, token);

      // Recarrega o app agora que temos autorização.
      window.location.reload();

    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      dots.forEach(d => d.classList.add('pin-dot-error'));
      
      setTimeout(() => {
        pin = '';
        updateDots(pin);
        dots.forEach(d => d.classList.remove('pin-dot-error', 'pin-dot-filled'));
        isLoading = false;
      }, 500);
    }
  };

  document.querySelectorAll('.pin-key').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isLoading) return;
      const k = btn.getAttribute('data-key');
      if (!k) return;

      if (k === 'backspace') {
        pin = pin.slice(0, -1);
      } else if (pin.length < 4) {
        pin += k;
      }
      updateDots(pin);

      if (pin.length === 4) {
        verifyPin();
      }
    });
  });
}
