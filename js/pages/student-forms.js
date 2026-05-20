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
  // Formulário público — nunca usar db (requer auth), ir direto ao Supabase anon
  const id  = data.id || crypto.randomUUID();
  const row = {
    id,
    trainer_id: data.trainerId || data.trainer_id || null,
    data: { ...data, id },
    is_default: false,
  };

  // Incluir colunas diretas para biofeedback (mapeamento de tipos)
  if (table === 'biofeedback') {
    Object.assign(row, {
      studentId:    data.studentId    || null,
      sleep:        parseFloat(data.sleep)  || null,
      mood:         parseFloat(data.mood)   || null,
      energy:       parseFloat(data.energy) || null,
      stress:       parseFloat(data.stress) || null,
      pain:         parseFloat(data.pain)   || null,
      pse:          parseFloat(data.pse)    || null,
      duration:     parseFloat(data.duration) || null,
      trainingLoad: parseFloat(data.trainingLoad) || null,
    });
  }

  try {
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
      console.error(`publicAdd(${table}) error:`, err);
    }
  } catch(e) { console.error('publicAdd fetch error:', e); }

  return { ...data, id };
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
  *{box-sizing:border-box}
  .student-form-page{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;background:#0f1117;padding:24px 16px 48px}
  .form-card{background:#1a1d27;border:1px solid rgba(255,255,255,0.08);border-radius:16px;width:100%;max-width:440px}
  .form-card-header{padding:24px 24px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)}
  .form-card-header h2{margin:0 0 2px;font-size:1.1rem;font-weight:700;color:#fff;letter-spacing:-0.01em}
  .form-card-header h2 strong{color:#10b981}
  .form-card-header p{margin:0;font-size:0.8rem;color:#64748b}
  .form-card-body{padding:24px}
  .student-info{display:flex;align-items:center;gap:12px;margin-bottom:28px;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:10px}
  .student-info .av{width:40px;height:40px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;flex-shrink:0}
  .student-info .name{font-weight:600;font-size:0.95rem;color:#e2e8f0}
  .student-info .date{font-size:0.75rem;color:#64748b;margin-top:1px;text-transform:capitalize}
  .q{margin-bottom:28px}
  .q-label{font-size:0.82rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px}
  .q-val{font-size:2.4rem;font-weight:800;color:#10b981;text-align:center;line-height:1;margin-bottom:8px}
  input[type=range]{width:100%;height:4px;accent-color:#10b981;cursor:pointer;border-radius:2px}
  .q-anchors{display:flex;justify-content:space-between;font-size:0.7rem;color:#475569;margin-top:6px}
  .q-hint{font-size:0.75rem;color:#10b981;text-align:center;margin-top:6px;min-height:16px;font-weight:500}
  .pain-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .pain-tag{padding:5px 12px;border:1px solid rgba(255,255,255,0.1);border-radius:20px;cursor:pointer;font-size:0.78rem;color:#94a3b8;background:transparent;transition:all 0.15s;user-select:none}
  .pain-tag.active{border-color:#10b981;background:rgba(16,185,129,0.1);color:#10b981}
  .obs-label{font-size:0.82rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
  textarea{width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e2e8f0;font-size:0.85rem;resize:vertical;min-height:64px;font-family:inherit}
  textarea::placeholder{color:#475569}
  textarea:focus{outline:none;border-color:#10b981}
  .submit-btn{width:100%;padding:15px;background:#10b981;color:#fff;border:none;border-radius:10px;font-size:0.95rem;font-weight:700;cursor:pointer;margin-top:8px;letter-spacing:0.01em;transition:opacity 0.2s}
  .submit-btn:hover{opacity:0.9}
  .submit-btn:disabled{opacity:0.5;cursor:not-allowed}
  .form-success{text-align:center;padding:52px 20px}
  .form-success .check{width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
  .form-success h2{color:#e2e8f0;margin:0 0 8px;font-size:1.3rem}
  .form-success p{color:#64748b;margin:0;font-size:0.9rem}
  .pre-card{background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:10px;padding:12px 14px;margin-bottom:20px}
  .pre-card-title{font-size:0.68rem;color:#10b981;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px}
  .pre-card-vals{display:flex;gap:14px;flex-wrap:wrap;font-size:0.82rem;color:#94a3b8}
  .pre-card-vals strong{color:#e2e8f0}
  .hidden{display:none!important}
`;

// ── Helpers ────────────────────────────────────────────────
function sliderHTML(id, label, min, max, val, leftHint, rightHint, onInput='') {
  return `
    <div class="q">
      <div class="q-label">${label}</div>
      <div class="q-val" id="v_${id}">${val}</div>
      <input type="range" name="${id}" id="r_${id}" min="${min}" max="${max}" value="${val}"
        oninput="document.getElementById('v_${id}').textContent=this.value;${onInput}" />
      <div class="q-anchors"><span>${leftHint}</span><span>${rightHint}</span></div>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" style="margin-bottom:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
          <h2>Personal<strong>PRO</strong></h2>
          <p>Check-in Pré-Treino</p>
        </div>
        <div class="form-card-body">

          <div class="student-info">
            <div class="av">${ini}</div>
            <div>
              <div class="name">${student.name}</div>
              <div class="date">${dateStr}</div>
            </div>
          </div>

          <form id="preStudentForm">
            <input type="hidden" name="studentId" value="${studentId}" />
            <input type="hidden" name="trainerId" value="${student.trainer_id||student.trainerId||''}" />

            ${sliderHTML('sleep','Como você dormiu?',1,10,5,'Mal','Muito bem')}

            ${sliderHTML('tqr','Como está sua recuperação?',1,10,5,'Exausto','100% recuperado',
              `var h=document.getElementById('tqrHint');if(h)h.textContent=['','Exausto','Muito cansado','Cansado','Pouco cansado','50%','Razoável','Bem','Muito bem','Quase lá','100%'][this.value]`
            )}
            <div class="q-hint" id="tqrHint">50%</div>

            ${sliderHTML('stress','Como está seu estado mental hoje?',1,10,3,'Tranquilo','Sobrecarregado')}

            ${sliderHTML('pain','Sente alguma dor?',1,10,1,'Nenhuma','Intensa',
              `document.getElementById('painGroup').style.display=parseInt(this.value)>=3?'block':'none'`
            )}
            <div id="painGroup" style="display:none;margin-bottom:20px">
              <div class="q-label" style="margin-bottom:8px">Onde?</div>
              <div class="pain-tags" id="pre_pain_regions_wrap">
                ${['Cabeça','Pescoço','Ombro Dir.','Ombro Esq.','Costas Sup.','Lombar','Quadril','Joelho Dir.','Joelho Esq.','Tornozelo Dir.','Panturrilha','Abdômen'].map(r=>`
                  <label class="pain-tag">
                    <input type="checkbox" name="pre_pain_regions" value="${r.toLowerCase().replace(/[^a-z]/g,'_')}" style="display:none" />${r}
                  </label>`).join('')}
              </div>
            </div>

            <div class="q">
              <div class="q-label">Observações <span style="font-weight:400;text-transform:none;font-size:0.72rem;color:#475569">(opcional)</span></div>
              <textarea name="notes" placeholder="Ex: ansioso, concentrado, disperso..."></textarea>
            </div>

            <button type="submit" id="preSubmitBtn" class="submit-btn">Enviar</button>
          </form>

          <div id="preSuccess" class="hidden">
            <div class="form-success">
              <div class="check">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2>Enviado, ${firstName}!</h2>
              <p>Seu personal já recebeu. Bom treino!</p>
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
      data.date        = Calc.nowISO();

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
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Check-in'; }
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
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" style="margin-bottom:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
          <h2>Personal<strong>PRO</strong></h2>
          <p>Check-in Pós-Treino</p>
        </div>
        <div class="form-card-body">

          <div class="student-info">
            <div class="av">${ini}</div>
            <div>
              <div class="name">${student?.name||'Aluno'}</div>
              <div class="date">${session.workoutName||'Treino'} · ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          ${preBf ? `
          <div class="pre-card">
            <div class="pre-card-title">Check-in de entrada</div>
            <div class="pre-card-vals">
              <span>Sono <strong>${preBf.sleep}/10</strong></span>
              <span>TQR <strong>${preBf.tqr||preBf.energy||'—'}/10</strong></span>
              <span>Est. Mental <strong>${preBf.stress}/10</strong></span>
              ${preBf.pain>2?`<span>Dor <strong>${preBf.pain}/10</strong></span>`:''}
            </div>
          </div>` : ''}

          <form id="postStudentForm">
            <input type="hidden" name="sessionId" value="${sessionId}" />
            ${preBf ? `<input type="hidden" name="preBiofeedbackId" value="${preBf.id}" />` : ''}
            <input type="hidden" name="trainerId" value="${student?.trainer_id||student?.trainerId||''}" />

            ${sliderHTML('pse','Intensidade do treino',1,10,7,'Leve','Máximo esforço')}


            ${sliderHTML('postPain','Sentiu alguma dor?',1,10,1,'Nenhuma','Intensa',
              `document.getElementById('postPainGroup').style.display=parseInt(this.value)>=3?'block':'none'`
            )}
            <div id="postPainGroup" style="display:none;margin-bottom:20px">
              <div class="q-label" style="margin-bottom:8px">Onde?</div>
              <div class="pain-tags">
                ${['Cabeça','Pescoço','Ombro Dir.','Ombro Esq.','Costas Sup.','Lombar','Quadril','Joelho Dir.','Joelho Esq.','Tornozelo Dir.','Panturrilha','Abdômen'].map(r=>`
                  <label class="pain-tag">
                    <input type="checkbox" name="post_pain_regions" value="${r.toLowerCase().replace(/[^a-z]/g,'_')}" style="display:none" />${r}
                  </label>`).join('')}
              </div>
            </div>

            <div class="q">
              <div class="q-label">Comentário <span style="font-weight:400;text-transform:none;font-size:0.72rem;color:#475569">(opcional)</span></div>
              <textarea name="notes" placeholder="Dificuldade em algum exercício, dor, algo diferente..."></textarea>
            </div>

            <button type="submit" id="postSubmitBtn" class="submit-btn">Enviar</button>
          </form>

          <div id="postSuccess" class="hidden">
            <div class="form-success">
              <div class="check">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2>Parabéns, ${firstName}!</h2>
              <p>Treino registrado. Continue evoluindo.</p>
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
        const tqrPost = 7; // TQR pós removido do formulário — usar neutro

        session.postBiofeedback = {
          pse, tqrPost, motivation: parseInt(data.motivation)||8, satisfaction: parseInt(data.motivation)||8,
          postPain: parseInt(data.postPain)||1, painRegions: postPainRegions,
          notes: data.notes||'', submittedByStudent: true,
          submittedAt: Calc.nowISO(),
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
              sessionId: data.sessionId, completedAt: Calc.nowISO(),
            });
          }
        } else {
          await publicAdd('biofeedback', {
            studentId: session.studentId, trainerId: data.trainerId||session.trainerId||'',
            date: session.date||Calc.nowISO(),
            pse, tqrPost, duration: dur, trainingLoad: pse*dur,
            postPain: parseInt(data.postPain)||1, postPainRegions,
            motivation: parseInt(data.motivation)||8, satisfaction: parseInt(data.motivation)||8,
            notes: data.notes||'', formType:'post', sessionId: data.sessionId,
          });
        }
      }

      e.target.classList.add('hidden');
      document.getElementById('postSuccess')?.classList.remove('hidden');
    } catch(err) {
      console.error(err);
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Pós-Treino'; }
      alert('Erro ao enviar. Por favor, tente novamente.');
    }
  });
}
