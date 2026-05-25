// ========================================
// PERSONAL PRO — student Form Pages (v2)
// Pre-workout and Post-workout forms via link
// ========================================
import db from '../db.js';
import { notify } from '../components/toast.js';
import { PAIN_REGIONS, painRegionSelector } from '../utils/alerts.js';

// ======================== PRE-WORKOUT FORM ========================

export async function renderPreForm(studentId) {
  const student = await db.get('students', studentId);
  if (!student) return `<div class="student-form-page"><div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Aluno não encontrado</h3></div></div>`;

  return `
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h1 style="margin:8px 0 4px">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="text-muted text-sm">Formulário Pré-Treino</p>
        </div>
        <div class="form-card-body">
          <div class="flex items-center gap-md mb-lg">
            <div class="avatar avatar-lg">${student.name[0]}</div>
            <div><h3 style="margin:0">${student.name}</h3><div class="text-muted text-sm">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
          </div>

          <!-- Google Forms Alternativo -->
          <div style="margin-bottom: 20px; border-left: 3px solid var(--primary); background: rgba(16,185,129,0.04); border-radius: var(--radius-md); padding: 12px 16px; border: 1px solid var(--border-color); border-left-width: 3px;">
            <strong style="font-size: 0.85rem; color: var(--primary);">📋 Google Forms Oficial</strong>
            <p class="text-xs text-muted" style="margin-top: 4px; line-height: 1.4;">Se preferir, você também pode responder pelo formulário oficial do Google Forms:</p>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSeovTLfRFi5-5IMmCx8B1Efz0Zsc83KeoxC4BdQaagTOZyHZw/viewform?usp=header" target="_blank" class="btn btn-secondary btn-sm" style="width: 100%; text-align: center; margin-top: 10px; font-size: 0.78rem;">Responder pelo Google Forms</a>
          </div>

          <form id="preStudentForm">
            <input type="hidden" name="studentId" value="${studentId}" />
            ${[
              { id: 'sleep', icon: '', label: 'Qualidade do Sono', hint: '1 = péssimo · 10 = ótimo' },
              { id: 'tqr', icon: '', label: 'Nível de Recuperação (TQR)', hint: '1 = exausto/sem recuperação · 10 = totalmente recuperado' },
              { id: 'stress', icon: '', label: 'Nível de Estresse', hint: '1 = relaxado · 10 = muito estressado' },
              { id: 'pain', icon: '', label: 'Dor/Desconforto', hint: '1 = nenhuma · 10 = muita dor' },
            ].map(f => `
              <div class="form-group" style="margin-bottom:20px">
                <div class="flex items-center justify-between mb-sm">
                  <label class="form-label" style="margin:0">${f.label}</label>
                  <span class="text-gradient" style="font-size:1.4rem;font-weight:800" id="v_${f.id}">5</span>
                </div>
                <input type="range" name="${f.id}" min="1" max="10" value="5" style="width:100%;height:32px" oninput="document.getElementById('v_${f.id}').textContent=this.value;${f.id === 'pain' ? "document.getElementById('painGroup').style.display=this.value>=3?'block':'none'" : ''}" />
                <div class="form-hint text-center">${f.hint}</div>
              </div>
            `).join('')}
            <div class="form-group" id="painGroup" style="display:none">
              <label class="form-label">Onde está a dor?</label>
              ${painRegionSelector('painRegion')}
              <div class="form-group mt-sm">
                <label class="form-label text-sm">Descreva a dor</label>
                <textarea class="form-textarea" name="painDescription" rows="2" placeholder="Ex: Dor aguda no ombro direito ao levantar o braço"></textarea>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Alguma observação?</label>
              <textarea class="form-textarea" name="notes" rows="2" placeholder="Como você está se sentindo? Dormiu bem? Comeu bem?"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;padding:16px;font-size:1rem;margin-top:12px">Enviar Pré-Treino</button>
          </form>
          <div id="preSuccess" class="hidden" style="text-align:center;padding:40px 0">
            <div style="font-size:3rem;margin-bottom:16px">✓</div>
            <h2>Enviado com sucesso!</h2>
            <p class="text-muted">Seus dados foram registrados. Bom treino!</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initPreForm() {
  document.getElementById('preStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.formType = 'pre';
    data.date = new Date().toISOString();
    ['sleep', 'tqr', 'stress', 'pain'].forEach(k => data[k] = parseInt(data[k]) || 5);
    
    // Mapeamento para retrocompatibilidade
    data.mood = data.tqr;
    data.energy = data.tqr;

    // Busca o aluno para obter o trainer_id para RLS do Supabase
    const student = await db.get('students', data.studentId);
    if (student) {
      const tId = student.trainerId || student.trainer_id;
      if (tId) {
        data.trainerId = tId;
        data.trainer_id = tId;
      }
    }

    await db.add('biofeedback', data);
    e.target.classList.add('hidden');
    document.getElementById('preSuccess')?.classList.remove('hidden');
  });
}

// ======================== POST-WORKOUT FORM ========================

export async function renderPostForm(sessionId) {
  const session = await db.get('sessions', sessionId);
  if (!session) return `<div class="student-form-page"><div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Sessão não encontrada</h3></div></div>`;
  const student = await db.get('students', session.studentId);

  return `
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h1 style="margin:8px 0 4px">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="text-muted text-sm">Formulário Pós-Treino</p>
        </div>
        <div class="form-card-body">
          <div class="flex items-center gap-md mb-lg">
            <div class="avatar avatar-lg">${student ? student.name[0] : '?'}</div>
            <div>
              <h3 style="margin:0">${student ? student.name : 'Aluno'}</h3>
              <div class="text-muted text-sm">${session.workoutName || 'Treino'} · ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          <!-- Google Forms Alternativo -->
          <div style="margin-bottom: 20px; border-left: 3px solid var(--primary); background: rgba(16,185,129,0.04); border-radius: var(--radius-md); padding: 12px 16px; border: 1px solid var(--border-color); border-left-width: 3px;">
            <strong style="font-size: 0.85rem; color: var(--primary);">📋 Google Forms Oficial</strong>
            <p class="text-xs text-muted" style="margin-top: 4px; line-height: 1.4;">Se preferir, você também pode responder pelo formulário oficial do Google Forms:</p>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSdeAD_1ZV_sS-97dexYBp3vprSJOYYklU1ArgtxhDtUX28Qlg/viewform?usp=header" target="_blank" class="btn btn-secondary btn-sm" style="width: 100%; text-align: center; margin-top: 10px; font-size: 0.78rem;">Responder pelo Google Forms</a>
          </div>

          <form id="postStudentForm">
            <input type="hidden" name="sessionId" value="${sessionId}" />
            <div class="form-group" style="margin-bottom:20px">
              <div class="flex items-center justify-between mb-sm">
                <label class="form-label" style="margin:0">PSE — Quão difícil foi o treino?</label>
                <span class="text-gradient" style="font-size:1.8rem;font-weight:800" id="v_pse">7</span>
              </div>
              <input type="range" name="pse" min="1" max="10" value="7" style="width:100%;height:32px" oninput="document.getElementById('v_pse').textContent=this.value" />
              <div class="flex justify-between text-xs text-muted" style="justify-content:space-between"><span>1 Muito fácil</span><span>5 Moderado</span><span>10 Máximo</span></div>
            </div>
            <div class="form-group" style="margin-bottom:20px">
              <div class="flex items-center justify-between mb-sm">
                <label class="form-label" style="margin:0">Satisfação com o treino</label>
                <span class="text-gradient" style="font-size:1.4rem;font-weight:800" id="v_sat">8</span>
              </div>
              <input type="range" name="satisfaction" min="1" max="10" value="8" style="width:100%;height:32px" oninput="document.getElementById('v_sat').textContent=this.value" />
            </div>
            <div class="form-group" style="margin-bottom:20px">
              <div class="flex items-center justify-between mb-sm">
                <label class="form-label" style="margin:0">Sentiu dor durante o treino?</label>
                <span class="text-gradient" style="font-size:1.4rem;font-weight:800" id="v_postpain">1</span>
              </div>
              <input type="range" name="postPain" min="1" max="10" value="1" style="width:100%;height:32px" oninput="document.getElementById('v_postpain').textContent=this.value;document.getElementById('postPainGroup').style.display=this.value>=3?'block':'none'" />
            </div>
            <div class="form-group" id="postPainGroup" style="display:none">
              <label class="form-label">Onde sentiu dor?</label>
              ${painRegionSelector('painRegion')}
            </div>
            <div class="form-group">
              <label class="form-label">Observações</label>
              <textarea class="form-textarea" name="notes" rows="3" placeholder="Como se sentiu durante o treino? Algum exercício causou desconforto?">${session.notes || ''}</textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;padding:16px;font-size:1rem;margin-top:12px">Enviar Pós-Treino</button>
          </form>
          <div id="postSuccess" class="hidden" style="text-align:center;padding:40px 0">
            <div style="font-size:3rem;margin-bottom:16px">✓</div>
            <h2>Treino registrado!</h2>
            <p class="text-muted">Parabéns pelo treino! Seus dados foram salvos.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initPostForm() {
  document.getElementById('postStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    const session = await db.get('sessions', data.sessionId);

    if (session) {
      // Busca o aluno para obter o trainer_id para RLS do Supabase
      const student = await db.get('students', session.studentId);
      const tId = student ? (student.trainerId || student.trainer_id) : null;

      session.postBiofeedback = {
        pse: parseInt(data.pse) || 7,
        satisfaction: parseInt(data.satisfaction) || 8,
        postPain: parseInt(data.postPain) || 1,
        painRegion: data.painRegion || '',
        notes: data.notes || '',
        submittedByStudent: true,
        submittedAt: new Date().toISOString(),
      };
      if (tId) {
        session.trainerId = tId;
        session.trainer_id = tId;
      }
      await db.put('sessions', session);

      if (session.studentId) {
        const dur = session.totalDuration ? Math.round(session.totalDuration / 60) : 60;
        const pse = parseInt(data.pse) || 7;
        
        const bfEntry = {
          studentId: session.studentId,
          date: session.date || new Date().toISOString(),
          pse, duration: dur,
          trainingLoad: pse * dur,
          pain: parseInt(data.postPain) || 1,
          painRegion: data.painRegion || '',
          notes: data.notes,
          formType: 'post',
          sessionId: data.sessionId,
        };
        if (tId) {
          bfEntry.trainerId = tId;
          bfEntry.trainer_id = tId;
        }
        await db.add('biofeedback', bfEntry);
      }
    }

    e.target.classList.add('hidden');
    document.getElementById('postSuccess')?.classList.remove('hidden');
  });
}
