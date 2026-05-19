// ============================================================
// PERSONAL PRO — Student Forms v2
// Formulários públicos (sem login) para alunos
// Acessa Supabase direto via anon key com policy pública por ID
// Pré-treino: simplificado + TQR
// Pós-treino: PSE, satisfação, dor, TQR pós
// ============================================================
import db from '../db.js';
import { notify } from '../components/toast.js';

// ── Supabase direto (sem auth) ─────────────────────────────
// Usa a chave pública (anon) + policies abertas para leitura por ID
const SUPABASE_URL = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

async function publicGet(table, id) {
  // 1. Tentar via db normal (se o personal estiver logado no mesmo device)
  try {
    const item = await db.get(table, id);
    if (item) return item;
  } catch(_) {}

  // 2. Supabase anon — tabelas reais (students, sessions, etc.)
  // Cada tabela tem: id TEXT, trainer_id UUID, data JSONB
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=data&limit=1`;
    const res = await fetch(url, {
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows?.length && rows[0].data) return rows[0].data;
    }
  } catch(_) {}

  // 3. Fallback localStorage
  try {
    const raw = localStorage.getItem(`pp_${table}`);
    if (raw) {
      const items = JSON.parse(raw);
      return items.find(i => i.id === id) || null;
    }
  } catch(_) {}

  return null;
}

async function publicAdd(table, data) {
  // Tentar via db normal primeiro
  try { return await db.add(table, data); } catch(_) {}

  // Supabase anon insert — tabela real
  try {
    const id  = data.id || crypto.randomUUID();
    const row = {
      id,
      trainer_id: data.trainerId || null,
      data: { ...data, id },
      is_default: false,
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('publicAdd error:', err);
    }
    return { ...data, id };
  } catch(_) {}
}

async function publicPut(table, data) {
  try { return await db.put(table, data); } catch(_) {}
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(data.id)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey':        SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ data }),
      }
    );
    if (!res.ok) console.error('publicPut error:', await res.text());
  } catch(_) {}
}

// ── Regiões de dor ─────────────────────────────────────────
const PAIN_REGIONS = [
  { id:'cabeca',      label:'Cabeça' },       { id:'pescoco',    label:'Pescoço' },
  { id:'ombro_d',     label:'Ombro Dir.' },   { id:'ombro_e',    label:'Ombro Esq.' },
  { id:'costas_sup',  label:'Costas Sup.' },  { id:'lombar',     label:'Lombar' },
  { id:'quadril',     label:'Quadril' },      { id:'joelho_d',   label:'Joelho Dir.' },
  { id:'joelho_e',    label:'Joelho Esq.' },  { id:'tornozelo_d',label:'Tornozelo Dir.' },
  { id:'panturrilha', label:'Panturrilha' },  { id:'abdomen',    label:'Abdômen' },
];

function painTagsHTML(prefix) {
  return `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px" id="${prefix}_regions_wrap">
      ${PAIN_REGIONS.map(r=>`
        <label class="pain-tag" style="display:flex;align-items:center;gap:4px;padding:6px 12px;border:1px solid var(--border-color);border-radius:20px;cursor:pointer;font-size:0.8rem;user-select:none">
          <input type="checkbox" name="${prefix}_regions" value="${r.id}" style="display:none" />
          ${r.label}
        </label>`).join('')}
    </div>`;
}

// ── CSS injetado uma vez ───────────────────────────────────
const FORM_CSS = `
  .student-form-page { min-height:100vh;display:flex;align-items:flex-start;justify-content:center;background:var(--bg-app);padding:20px 16px 40px; }
  .form-card { background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;width:100%;max-width:480px;overflow:hidden; }
  .form-card-header { background:var(--bg-page);border-bottom:1px solid var(--border-color);padding:20px 24px;text-align:center; }
  .form-card-body { padding:24px; }
  .logo-pro { color:var(--primary); }
  .slider-row { margin-bottom:24px; }
  .slider-label { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
  .slider-label span { font-weight:600;font-size:0.95rem; }
  .slider-val { font-size:1.6rem;font-weight:800;color:var(--primary);min-width:32px;text-align:right; }
  .slider-hints { display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-top:4px; }
  input[type=range] { width:100%;height:26px;accent-color:var(--primary);cursor:pointer; }
  .pain-tag { transition:all 0.15s; }
  .pain-tag.active { border-color:var(--primary)!important;background:rgba(16,185,129,0.1);color:var(--primary); }
  .form-success { text-align:center;padding:48px 24px; }
  .hidden { display:none!important; }
`;

// ── Helpers ────────────────────────────────────────────────
function sliderHTML(id, label, min, max, val, leftHint, rightHint, onInput='') {
  return `
    <div class="slider-row">
      <div class="slider-label">
        <span>${label}</span>
        <span class="slider-val" id="v_${id}">${val}</span>
      </div>
      <input type="range" name="${id}" id="r_${id}" min="${min}" max="${max}" value="${val}"
        oninput="document.getElementById('v_${id}').textContent=this.value;${onInput}" />
      <div class="slider-hints"><span>${leftHint}</span><span>${rightHint}</span></div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  PRÉ-TREINO
// ══════════════════════════════════════════════════════════

export async function renderPreForm(studentId) {
  const student = await publicGet('students', studentId);

  if (!student) {
    return `
      <style>${FORM_CSS}</style>
      <div class="student-form-page">
        <div class="form-card">
          <div class="form-card-header"><h2>Personal<strong class="logo-pro">PRO</strong></h2></div>
          <div class="form-card-body" style="text-align:center;padding:48px 24px">
            <div style="font-size:2.5rem;margin-bottom:12px">😕</div>
            <h3>Aluno não encontrado</h3>
            <p style="color:var(--text-muted);margin-top:8px;font-size:0.9rem">
              O link pode estar desatualizado. Peça um novo link ao seu personal.
            </p>
          </div>
        </div>
      </div>`;
  }

  const firstName = student.name?.split(' ')[0] || student.name;
  const ini = student.name?.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() || '?';
  const dateStr = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});

  return `
    <style>${FORM_CSS}</style>
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h2 style="margin:0 0 4px">Personal<strong class="logo-pro">PRO</strong></h2>
          <p style="margin:0;font-size:0.85rem;color:var(--text-muted)">Check-in Pré-Treino</p>
        </div>
        <div class="form-card-body">

          <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding:14px;background:var(--bg-page);border-radius:10px">
            <div class="avatar" style="width:48px;height:48px;font-size:1.2rem;flex-shrink:0">${ini}</div>
            <div>
              <div style="font-weight:700;font-size:1.05rem">${student.name}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;text-transform:capitalize">${dateStr}</div>
            </div>
          </div>

          <form id="preStudentForm">
            <input type="hidden" name="studentId" value="${studentId}" />
            <input type="hidden" name="trainerId" value="${student.trainerId||''}" />

            <!-- SONO -->
            ${sliderHTML('sleep','😴 Como você dormiu?',1,10,5,'Muito mal','Muito bem')}

            <!-- ENERGIA / TQR -->
            ${sliderHTML('tqr','⚡ Quanto você se sente recuperado?',1,10,5,
              '1 — Nada recuperado','10 — Totalmente recuperado',
              `document.getElementById('tqrHint').textContent=['','Exausto','Muito cansado','Cansado','Um pouco cansado','Razoável','Razoável+','Bem recuperado','Bem recuperado+','Quase 100%','100% recuperado'][this.value]`
            )}
            <div id="tqrHint" style="font-size:0.75rem;color:var(--accent);text-align:center;margin-top:-12px;margin-bottom:20px;font-weight:600">Razoável</div>

            <!-- ESTRESSE -->
            ${sliderHTML('stress','🧠 Nível de estresse hoje?',1,10,3,'Tranquilo','Muito estressado')}

            <!-- DOR -->
            ${sliderHTML('pain','🤕 Sente alguma dor ou desconforto?',1,10,1,
              '1 — Nenhuma','10 — Dor intensa',
              `document.getElementById('painGroup').style.display=parseInt(this.value)>=3?'block':'none'`
            )}
            <div id="painGroup" style="display:none;margin-bottom:20px">
              <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">
                Onde? <span style="font-weight:400;color:var(--text-muted)">(pode marcar vários)</span>
              </label>
              ${painTagsHTML('pre_pain')}
              <textarea name="painDescription" placeholder="Descreva brevemente (opcional)..."
                style="width:100%;margin-top:8px;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-page);color:var(--text-primary);font-size:0.85rem;resize:vertical;min-height:56px"
                rows="2"></textarea>
            </div>

            <!-- OBSERVAÇÕES -->
            <div style="margin-bottom:20px">
              <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:6px">
                💬 Quer falar algo mais? <span style="font-weight:400;color:var(--text-muted)">(opcional)</span>
              </label>
              <textarea name="notes" placeholder="Ex: comi pouco hoje, dormi tarde, dor de cabeça leve..."
                style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-page);color:var(--text-primary);font-size:0.85rem;resize:vertical;min-height:64px"
                rows="2"></textarea>
            </div>

            <button type="submit" id="preSubmitBtn"
              style="width:100%;padding:16px;background:var(--primary);color:white;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;transition:opacity 0.2s">
              Enviar Check-in ✓
            </button>
          </form>

          <div id="preSuccess" class="hidden">
            <div class="form-success">
              <div style="font-size:3rem;color:var(--primary)">✓</div>
              <h2 style="margin:12px 0 8px">Enviado, ${firstName}!</h2>
              <p style="color:var(--text-muted)">Seu personal já recebeu. Bom treino! 💪</p>
            </div>
          </div>

        </div>
      </div>
    </div>`;
}

export function initPreForm() {
  // Ativar tags de dor
  document.querySelectorAll('.pain-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const cb = tag.querySelector('input[type=checkbox]');
      if (!cb) return;
      cb.checked = !cb.checked;
      tag.classList.toggle('active', cb.checked);
    });
  });

  document.getElementById('preStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('preSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
      const fd   = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.painRegions = fd.getAll('pre_pain_regions');
      data.formType    = 'pre';
      data.date        = new Date().toISOString();

      // Normalizar numéricos
      ['sleep','tqr','stress','pain'].forEach(k => {
        data[k] = parseInt(data[k]) || (k==='pain'?1:5);
      });
      // Compatibilidade: mapear TQR para energy (usado nos alertas)
      data.energy = data.tqr;
      data.mood   = Math.round((data.sleep + data.tqr) / 2); // proxy de disposição

      await publicAdd('biofeedback', data);
      e.target.classList.add('hidden');
      document.getElementById('preSuccess')?.classList.remove('hidden');
    } catch(err) {
      console.error(err);
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Check-in ✓'; }
      alert('Erro ao enviar. Por favor, tente novamente.');
    }
  });
}

// ══════════════════════════════════════════════════════════
//  PÓS-TREINO
// ══════════════════════════════════════════════════════════

export async function renderPostForm(sessionId) {
  const session = await publicGet('sessions', sessionId);

  if (!session) {
    return `
      <style>${FORM_CSS}</style>
      <div class="student-form-page">
        <div class="form-card">
          <div class="form-card-header"><h2>Personal<strong class="logo-pro">PRO</strong></h2></div>
          <div class="form-card-body" style="text-align:center;padding:48px 24px">
            <div style="font-size:2.5rem;margin-bottom:12px">😕</div>
            <h3>Sessão não encontrada</h3>
            <p style="color:var(--text-muted);margin-top:8px;font-size:0.9rem">
              O link pode estar expirado. Peça um novo link ao seu personal.
            </p>
          </div>
        </div>
      </div>`;
  }

  const student    = await publicGet('students', session.studentId);
  const firstName  = student?.name?.split(' ')[0] || 'Aluno';
  const ini        = student?.name?.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() || '?';

  // Buscar pré-treino do mesmo dia
  let preBf = null;
  try {
    const allBf  = await db.getAll('biofeedback');
    const dayStr = new Date(session.date||Date.now()).toDateString();
    preBf = allBf.find(b => b.studentId===session.studentId && b.formType==='pre' && new Date(b.date).toDateString()===dayStr);
  } catch(_) {}

  return `
    <style>${FORM_CSS}</style>
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h2 style="margin:0 0 4px">Personal<strong class="logo-pro">PRO</strong></h2>
          <p style="margin:0;font-size:0.85rem;color:var(--text-muted)">Check-in Pós-Treino</p>
        </div>
        <div class="form-card-body">

          <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding:14px;background:var(--bg-page);border-radius:10px">
            <div class="avatar" style="width:48px;height:48px;font-size:1.2rem;flex-shrink:0">${ini}</div>
            <div>
              <div style="font-weight:700;font-size:1.05rem">${student?.name||'Aluno'}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${session.workoutName||'Treino'} · ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          ${preBf ? `
          <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:12px;margin-bottom:20px">
            <div style="font-size:0.7rem;color:var(--primary);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Seu check-in de entrada</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.82rem">
              <span>Sono <strong>${preBf.sleep}/10</strong></span>
              <span>TQR <strong>${preBf.tqr||preBf.energy||'—'}/10</strong></span>
              <span>Estresse <strong>${preBf.stress}/10</strong></span>
              ${preBf.pain>2?`<span style="color:var(--warning)">Dor <strong>${preBf.pain}/10</strong></span>`:''}
            </div>
          </div>` : ''}

          <form id="postStudentForm">
            <input type="hidden" name="sessionId" value="${sessionId}" />
            ${preBf ? `<input type="hidden" name="preBiofeedbackId" value="${preBf.id}" />` : ''}
            <input type="hidden" name="trainerId" value="${student?.trainerId||''}" />

            <!-- PSE -->
            ${sliderHTML('pse','🏋️ O quanto o treino foi intenso?',1,10,7,'1 — Muito leve','10 — Máximo esforço')}

            <!-- TQR PÓS -->
            ${sliderHTML('tqrPost','⚡ Como você está se sentindo agora?',1,10,7,
              '1 — Exausto','10 — Energizado',
              `document.getElementById('tqrPostHint').textContent=['','Exausto','Muito cansado','Cansado','Cansado+','Razoável','Ok','Bem','Bem+','Ótimo','Excelente'][this.value]`
            )}
            <div id="tqrPostHint" style="font-size:0.75rem;color:var(--accent);text-align:center;margin-top:-12px;margin-bottom:20px;font-weight:600">Bem</div>

            <!-- SATISFAÇÃO -->
            ${sliderHTML('satisfaction','😊 Como foi o treino pra você?',1,10,8,'1 — Péssimo','10 — Incrível')}

            <!-- DOR PÓS -->
            ${sliderHTML('postPain','🤕 Sentiu alguma dor durante o treino?',1,10,1,
              '1 — Nenhuma','10 — Dor intensa',
              `document.getElementById('postPainGroup').style.display=parseInt(this.value)>=3?'block':'none'`
            )}
            <div id="postPainGroup" style="display:none;margin-bottom:20px">
              <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Onde sentiu dor?</label>
              ${painTagsHTML('post_pain')}
            </div>

            <!-- OBSERVAÇÕES -->
            <div style="margin-bottom:20px">
              <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:6px">
                💬 Comentário sobre o treino? <span style="font-weight:400;color:var(--text-muted)">(opcional)</span>
              </label>
              <textarea name="notes" placeholder="Ex: senti dificuldade no agachamento, ombro incomodou um pouco..."
                style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-page);color:var(--text-primary);font-size:0.85rem;resize:vertical;min-height:64px"
                rows="2"></textarea>
            </div>

            <button type="submit" id="postSubmitBtn"
              style="width:100%;padding:16px;background:var(--primary);color:white;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer">
              Enviar Pós-Treino ✓
            </button>
          </form>

          <div id="postSuccess" class="hidden">
            <div class="form-success">
              <div style="font-size:3rem;color:var(--primary)">🎉</div>
              <h2 style="margin:12px 0 8px">Parabéns, ${firstName}!</h2>
              <p style="color:var(--text-muted)">Treino registrado. Continue evoluindo! 💪</p>
            </div>
          </div>

        </div>
      </div>
    </div>`;
}

export function initPostForm() {
  document.querySelectorAll('.pain-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const cb = tag.querySelector('input[type=checkbox]');
      if (!cb) return;
      cb.checked = !cb.checked;
      tag.classList.toggle('active', cb.checked);
    });
  });

  document.getElementById('postStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('postSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
      const fd      = new FormData(e.target);
      const data    = Object.fromEntries(fd);
      const postPainRegions = fd.getAll('post_pain_regions');
      const session = await publicGet('sessions', data.sessionId);

      if (session) {
        const dur = session.totalDuration ? Math.round(session.totalDuration/60) : 60;
        const pse = parseInt(data.pse) || 7;
        const tqrPost = parseInt(data.tqrPost) || 7;

        session.postBiofeedback = {
          pse, tqrPost, satisfaction: parseInt(data.satisfaction)||8,
          postPain: parseInt(data.postPain)||1, painRegions: postPainRegions,
          notes: data.notes||'', submittedByStudent: true,
          submittedAt: new Date().toISOString(),
        };
        await publicPut('sessions', session);

        // Atualizar ou criar registro biofeedback
        if (data.preBiofeedbackId) {
          const preBf = await publicGet('biofeedback', data.preBiofeedbackId);
          if (preBf) {
            await publicPut('biofeedback', {
              ...preBf, pse, tqrPost, duration: dur,
              trainingLoad: pse * dur,
              postPain: parseInt(data.postPain)||1,
              postPainRegions, satisfaction: parseInt(data.satisfaction)||8,
              postNotes: data.notes||'', formType: 'complete',
              sessionId: data.sessionId, completedAt: new Date().toISOString(),
            });
          }
        } else {
          await publicAdd('biofeedback', {
            studentId: session.studentId, trainerId: data.trainerId||session.trainerId||'',
            date: session.date||new Date().toISOString(),
            pse, tqrPost, duration: dur, trainingLoad: pse*dur,
            postPain: parseInt(data.postPain)||1, postPainRegions,
            satisfaction: parseInt(data.satisfaction)||8,
            notes: data.notes||'', formType:'post', sessionId: data.sessionId,
          });
        }
      }

      e.target.classList.add('hidden');
      document.getElementById('postSuccess')?.classList.remove('hidden');
    } catch(err) {
      console.error(err);
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Pós-Treino ✓'; }
      alert('Erro ao enviar. Por favor, tente novamente.');
    }
  });
}
