// ========================================
// PERSONAL PRO — Student Form Pages (v3)
// Perguntas diretas + múltiplos locais de dor
// Pré e pós vinculados ao mesmo registro
// ========================================
import db from '../db.js';
import { notify } from '../components/toast.js';

// Regiões de dor — múltipla seleção
const PAIN_REGIONS = [
  { id: 'cabeca',       label: 'Cabeça' },
  { id: 'pescoco',      label: 'Pescoço' },
  { id: 'ombro_d',      label: 'Ombro Dir.' },
  { id: 'ombro_e',      label: 'Ombro Esq.' },
  { id: 'cotovelo_d',   label: 'Cotovelo Dir.' },
  { id: 'cotovelo_e',   label: 'Cotovelo Esq.' },
  { id: 'punho_d',      label: 'Punho Dir.' },
  { id: 'punho_e',      label: 'Punho Esq.' },
  { id: 'costas_sup',   label: 'Costas (superior)' },
  { id: 'lombar',       label: 'Lombar' },
  { id: 'quadril',      label: 'Quadril' },
  { id: 'joelho_d',     label: 'Joelho Dir.' },
  { id: 'joelho_e',     label: 'Joelho Esq.' },
  { id: 'tornozelo_d',  label: 'Tornozelo Dir.' },
  { id: 'tornozelo_e',  label: 'Tornozelo Esq.' },
  { id: 'panturrilha',  label: 'Panturrilha' },
  { id: 'abdomen',      label: 'Abdômen' },
  { id: 'peito',        label: 'Peito' },
];

function painRegionMultiSelect(prefix = 'pain') {
  return `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px" id="${prefix}_regions">
      ${PAIN_REGIONS.map(r => `
        <label style="display:flex;align-items:center;gap:4px;padding:5px 10px;border:1px solid var(--border-color);border-radius:20px;cursor:pointer;font-size:0.78rem;transition:all 0.15s" class="pain-region-tag">
          <input type="checkbox" name="${prefix}_regions" value="${r.id}" style="display:none" />
          ${r.label}
        </label>`).join('')}
    </div>
    <script>
      document.querySelectorAll('.pain-region-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          const cb = tag.querySelector('input[type=checkbox]');
          cb.checked = !cb.checked;
          tag.style.borderColor = cb.checked ? 'var(--primary)' : 'var(--border-color)';
          tag.style.background = cb.checked ? 'rgba(16,185,129,0.1)' : '';
          tag.style.color = cb.checked ? 'var(--primary)' : '';
        });
      });
    </script>`;
}

// ======================== PRÉ-TREINO ========================

export async function renderPreForm(studentId) {
  const student = await db.get('students', studentId);
  if (!student) return `<div class="student-form-page"><div class="empty-state"><h3>Aluno não encontrado</h3></div></div>`;

  return `
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h1 style="margin:8px 0 4px">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="text-muted text-sm">Check-in Pré-Treino</p>
        </div>
        <div class="form-card-body">
          <div class="flex items-center gap-md mb-lg">
            <div class="avatar avatar-lg">${student.name[0]}</div>
            <div>
              <h3 style="margin:0">${student.name}</h3>
              <div class="text-muted text-sm">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </div>
          </div>
          <form id="preStudentForm">
            <input type="hidden" name="studentId" value="${studentId}" />

            ${[
              { id: 'sleep',  label: 'Como você dormiu?',                    hint: '1 = muito mal  ·  10 = muito bem' },
              { id: 'energy', label: 'Como está sua energia agora?',         hint: '1 = sem energia  ·  10 = muito disposto' },
              { id: 'mood',   label: 'Como está sua disposição hoje?',       hint: '1 = péssima  ·  10 = excelente' },
              { id: 'stress', label: 'Quanto estresse você está sentindo?',  hint: '1 = nenhum  ·  10 = muito estressado' },
              { id: 'pain',   label: 'Sente alguma dor ou desconforto?',     hint: '1 = nenhuma  ·  10 = dor intensa',
                extra: `document.getElementById('painGroup').style.display=this.value>=3?'block':'none'` },
            ].map(f => `
              <div class="form-group" style="margin-bottom:22px">
                <div class="flex items-center justify-between mb-xs">
                  <label class="form-label" style="margin:0;font-weight:600">${f.label}</label>
                  <span class="text-gradient" style="font-size:1.5rem;font-weight:800;min-width:28px;text-align:center" id="v_${f.id}">5</span>
                </div>
                <input type="range" name="${f.id}" min="1" max="10" value="5"
                  style="width:100%;height:28px;accent-color:var(--primary)"
                  oninput="document.getElementById('v_${f.id}').textContent=this.value;${f.extra || ''}" />
                <div class="flex justify-between text-xs text-muted mt-xs">
                  <span>${f.hint.split('·')[0].trim()}</span>
                  <span>${f.hint.split('·')[1]?.trim() || ''}</span>
                </div>
              </div>
            `).join('')}

            <div class="form-group" id="painGroup" style="display:none;margin-bottom:20px">
              <label class="form-label font-medium">Onde está a dor? <span class="text-muted text-xs">(pode marcar mais de um)</span></label>
              ${painRegionMultiSelect('pre_pain')}
              <div class="form-group mt-sm">
                <label class="form-label text-sm">Descreva brevemente</label>
                <textarea class="form-textarea" name="painDescription" rows="2"
                  placeholder="Ex: Dor aguda no ombro direito ao levantar o braço"></textarea>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label font-medium">Quer falar algo mais?</label>
              <textarea class="form-textarea" name="notes" rows="2"
                placeholder="Ex: Comi pouco hoje, ou estou com dor de cabeça leve..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary"
              style="width:100%;padding:16px;font-size:1rem;margin-top:16px">
              Enviar Check-in
            </button>
          </form>

          <div id="preSuccess" class="hidden" style="text-align:center;padding:40px 0">
            <div style="font-size:3rem;margin-bottom:16px;color:var(--primary)">✓</div>
            <h2>Enviado!</h2>
            <p class="text-muted">Seu personal já recebeu. Bom treino!</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initPreForm() {
  // Ativar tags de dor via JS (inline script não funciona em alguns contextos)
  document.querySelectorAll('.pain-region-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const cb = tag.querySelector('input[type=checkbox]');
      if (!cb) return;
      cb.checked = !cb.checked;
      tag.style.borderColor = cb.checked ? 'var(--primary)' : '';
      tag.style.background  = cb.checked ? 'rgba(16,185,129,0.1)' : '';
      tag.style.color       = cb.checked ? 'var(--primary)' : '';
    });
  });

  document.getElementById('preStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);

    // Múltiplos locais de dor
    data.painRegions = fd.getAll('pre_pain_regions');
    data.formType = 'pre';
    data.date = new Date().toISOString();
    ['sleep', 'mood', 'energy', 'stress', 'pain'].forEach(k => data[k] = parseInt(data[k]) || 5);

    await db.add('biofeedback', data);
    e.target.classList.add('hidden');
    document.getElementById('preSuccess')?.classList.remove('hidden');
  });
}

// ======================== PÓS-TREINO ========================

export async function renderPostForm(sessionId) {
  const session = await db.get('sessions', sessionId);
  if (!session) return `<div class="student-form-page"><div class="empty-state"><h3>Sessão não encontrada</h3></div></div>`;
  const student = await db.get('students', session.studentId);

  // Buscar pré-treino vinculado a esta sessão (mesmo studentId, mesmo dia, formType=pre)
  const allBf = await db.getAll('biofeedback');
  const sessionDate = new Date(session.date).toDateString();
  const preBf = allBf.find(b =>
    b.studentId === session.studentId &&
    b.formType === 'pre' &&
    new Date(b.date).toDateString() === sessionDate
  );

  return `
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h1 style="margin:8px 0 4px">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="text-muted text-sm">Check-in Pós-Treino</p>
        </div>
        <div class="form-card-body">
          <div class="flex items-center gap-md mb-lg">
            <div class="avatar avatar-lg">${student ? student.name[0] : '?'}</div>
            <div>
              <h3 style="margin:0">${student ? student.name : 'Aluno'}</h3>
              <div class="text-muted text-sm">${session.workoutName || 'Treino'} · ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          ${preBf ? `
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:12px;margin-bottom:20px">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Seu check-in pré-treino</div>
            <div style="display:flex;gap:16px;flex-wrap:wrap">
              <span class="text-sm">Sono <strong>${preBf.sleep}/10</strong></span>
              <span class="text-sm">Energia <strong>${preBf.energy}/10</strong></span>
              <span class="text-sm">Humor <strong>${preBf.mood}/10</strong></span>
              <span class="text-sm">Estresse <strong>${preBf.stress}/10</strong></span>
              ${preBf.pain > 2 ? `<span class="text-sm" style="color:var(--warning)">Dor <strong>${preBf.pain}/10</strong></span>` : ''}
            </div>
          </div>` : ''}

          <form id="postStudentForm">
            <input type="hidden" name="sessionId" value="${sessionId}" />
            ${preBf ? `<input type="hidden" name="preBiofeedbackId" value="${preBf.id}" />` : ''}

            <div class="form-group" style="margin-bottom:22px">
              <div class="flex items-center justify-between mb-xs">
                <label class="form-label" style="margin:0;font-weight:600">O quanto o treino foi puxado?</label>
                <span class="text-gradient" style="font-size:1.5rem;font-weight:800;min-width:28px;text-align:center" id="v_pse">7</span>
              </div>
              <input type="range" name="pse" min="1" max="10" value="7"
                style="width:100%;height:28px;accent-color:var(--primary)"
                oninput="document.getElementById('v_pse').textContent=this.value" />
              <div class="flex justify-between text-xs text-muted mt-xs">
                <span>1 — Muito leve</span><span>5 — Moderado</span><span>10 — Máximo esforço</span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom:22px">
              <div class="flex items-center justify-between mb-xs">
                <label class="form-label" style="margin:0;font-weight:600">Como você ficou após o treino?</label>
                <span class="text-gradient" style="font-size:1.5rem;font-weight:800;min-width:28px;text-align:center" id="v_sat">8</span>
              </div>
              <input type="range" name="satisfaction" min="1" max="10" value="8"
                style="width:100%;height:28px;accent-color:var(--primary)"
                oninput="document.getElementById('v_sat').textContent=this.value" />
              <div class="flex justify-between text-xs text-muted mt-xs">
                <span>1 — Péssimo</span><span>10 — Ótimo, energizado</span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom:22px">
              <div class="flex items-center justify-between mb-xs">
                <label class="form-label" style="margin:0;font-weight:600">Sentiu alguma dor durante o treino?</label>
                <span class="text-gradient" style="font-size:1.5rem;font-weight:800;min-width:28px;text-align:center" id="v_postpain">1</span>
              </div>
              <input type="range" name="postPain" min="1" max="10" value="1"
                style="width:100%;height:28px;accent-color:var(--primary)"
                oninput="document.getElementById('v_postpain').textContent=this.value;document.getElementById('postPainGroup').style.display=this.value>=3?'block':'none'" />
              <div class="flex justify-between text-xs text-muted mt-xs">
                <span>1 — Nenhuma</span><span>10 — Dor intensa</span>
              </div>
            </div>

            <div class="form-group" id="postPainGroup" style="display:none;margin-bottom:20px">
              <label class="form-label font-medium">Onde sentiu dor? <span class="text-muted text-xs">(pode marcar mais de um)</span></label>
              ${painRegionMultiSelect('post_pain')}
            </div>

            <div class="form-group">
              <label class="form-label font-medium">Algum comentário sobre o treino?</label>
              <textarea class="form-textarea" name="notes" rows="3"
                placeholder="Ex: Senti dificuldade no agachamento, ou o treino estava bem pesado hoje..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary"
              style="width:100%;padding:16px;font-size:1rem;margin-top:16px">
              Enviar Pós-Treino
            </button>
          </form>

          <div id="postSuccess" class="hidden" style="text-align:center;padding:40px 0">
            <div style="font-size:3rem;margin-bottom:16px;color:var(--primary)">✓</div>
            <h2>Registrado!</h2>
            <p class="text-muted">Parabéns pelo treino! Continue evoluindo.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initPostForm() {
  // Ativar tags de dor
  document.querySelectorAll('.pain-region-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const cb = tag.querySelector('input[type=checkbox]');
      if (!cb) return;
      cb.checked = !cb.checked;
      tag.style.borderColor = cb.checked ? 'var(--primary)' : '';
      tag.style.background  = cb.checked ? 'rgba(16,185,129,0.1)' : '';
      tag.style.color       = cb.checked ? 'var(--primary)' : '';
    });
  });

  document.getElementById('postStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    const session = await db.get('sessions', data.sessionId);

    // Múltiplos locais de dor
    const postPainRegions = fd.getAll('post_pain_regions');

    if (session) {
      session.postBiofeedback = {
        pse:          parseInt(data.pse) || 7,
        satisfaction: parseInt(data.satisfaction) || 8,
        postPain:     parseInt(data.postPain) || 1,
        painRegions:  postPainRegions,
        notes:        data.notes || '',
        submittedByStudent: true,
        submittedAt:  new Date().toISOString(),
      };
      await db.put('sessions', session);

      if (session.studentId) {
        const dur = session.totalDuration ? Math.round(session.totalDuration / 60) : 60;
        const pse = parseInt(data.pse) || 7;

        // Se existe registro pré-treino vinculado, atualizar com dados pós
        if (data.preBiofeedbackId) {
          const preBf = await db.get('biofeedback', data.preBiofeedbackId);
          if (preBf) {
            await db.put('biofeedback', {
              ...preBf,
              pse, duration: dur,
              trainingLoad: pse * dur,
              postPain:    parseInt(data.postPain) || 1,
              painRegions: postPainRegions,
              satisfaction: parseInt(data.satisfaction) || 8,
              postNotes:   data.notes || '',
              formType:    'complete', // pré + pós no mesmo registro
              sessionId:   data.sessionId,
              completedAt: new Date().toISOString(),
            });
          }
        } else {
          // Criar registro pós separado se não encontrou o pré
          await db.add('biofeedback', {
            studentId:   session.studentId,
            date:        session.date || new Date().toISOString(),
            pse, duration: dur,
            trainingLoad: pse * dur,
            postPain:    parseInt(data.postPain) || 1,
            painRegions: postPainRegions,
            satisfaction: parseInt(data.satisfaction) || 8,
            notes:       data.notes || '',
            formType:    'post',
            sessionId:   data.sessionId,
          });
        }
      }
    }

    e.target.classList.add('hidden');
    document.getElementById('postSuccess')?.classList.remove('hidden');
  });
}
