// ============================================================
// PERSONAL PRO â€” Student Forms v2
// FormulÃ¡rios pÃºblicos (sem login) para alunos
// Acessa Supabase direto via anon key com policy pÃºblica por ID
// PrÃ©-treino: simplificado + TQR
// PÃ³s-treino: PSE, satisfaÃ§Ã£o, dor, TQR pÃ³s
// ============================================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { notify } from '../components/toast.js';

// â”€â”€ Supabase direto (sem auth) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Usa a chave pÃºblica (anon) + policies abertas para leitura por ID
const SUPABASE_URL = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

async function publicGet(table, id) {
  // 1. Tentar via db normal (se o personal estiver logado no mesmo device)
  try {
    const item = await db.get(table, id);
    if (item) return item;
  } catch(_) {}

  // 2. Supabase anon â€” buscar por id direto
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`;
    const res = await fetch(url, {
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Accept':        'application/json',
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows?.length) {
        const row = rows[0];
        const obj = row.data ? { ...row.data, id: row.id } : { ...row };
        if (obj.id || obj.name) return obj;
      }
    } else {
      console.warn(`publicGet(${table}) HTTP ${res.status}:`, await res.text().catch(()=>''));
    }
  } catch(e) { console.warn(`publicGet(${table}) fetch error:`, e?.message); }

  // 3. Fallback â€” buscar via data JSONB (formato antigo)
  try {
    const url2 = `${SUPABASE_URL}/rest/v1/${table}?data->>id=eq.${encodeURIComponent(id)}&select=*&limit=1`;
    const res2 = await fetch(url2, {
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Accept':        'application/json',
      }
    });
    if (res2.ok) {
      const rows2 = await res2.json();
      if (rows2?.length) {
        const row = rows2[0];
        return row.data ? { ...row.data, id: row.data.id || row.id } : { ...row };
      }
    }
  } catch(_) {}

  // 4. Fallback localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.includes(`_${table}`)) continue;
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      const found = Array.isArray(items) ? items.find(x => x?.id === id) : null;
      if (found) return found;
    }
  } catch(_) {}

  return null;
}

async function publicAdd(table, data) {
  const id = data.id || crypto.randomUUID();
  // trainer_id deve ser UUID vÃ¡lido ou null â€” string vazia quebra a FK
  const isUUID = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const trainerId = isUUID(data.trainerId) ? data.trainerId
                  : isUUID(data.trainer_id) ? data.trainer_id
                  : null;

  const row = {
    id,
    trainer_id: trainerId,
    data: { ...data, id },
  };

  // Incluir colunas diretas para biofeedback
  if (table === 'biofeedback') {
    Object.assign(row, {
      studentId:    data.studentId    || null,
      sleep:        parseFloat(data.sleep)     || null,
      mood:         parseFloat(data.mood)      || null,
      energy:       parseFloat(data.energy)    || null,
      stress:       parseFloat(data.stress)    || null,
      pain:         parseFloat(data.pain)      || null,
      pse:          parseFloat(data.pse)       || null,
      duration:     parseFloat(data.duration)  || null,
      trainingLoad: parseFloat(data.trainingLoad) || null,
      food:         parseFloat(data.food)      || null,
      motivation:   parseFloat(data.motivation) || null,
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
      if (err.includes('23505') || err.includes('unique_violation') || res.status === 409) {
        // Fallback para PATCH se o registro jÃ¡ existir (Upsert sem exigir SELECT permission)
        return await publicPut(table, data);
      }
      console.error(`publicAdd(${table}) error:`, err);
    }
  } catch(e) { console.error('publicAdd fetch error:', e); }

  return { ...data, id };
}

async function publicPut(table, data) {
  try {
    const now = new Date().toISOString();

    // Corpo: atualiza a coluna JSONB 'data' + 'updatedAt'
    const body = { data, updatedAt: now };

    // Para biofeedback: atualizar tambÃ©m colunas diretas
    if (table === 'biofeedback') {
      Object.assign(body, {
        studentId:    data.studentId    || null,
        sleep:        parseFloat(data.sleep)        || null,
        mood:         parseFloat(data.mood)         || null,
        energy:       parseFloat(data.energy)       || null,
        stress:       parseFloat(data.stress)       || null,
        pain:         parseFloat(data.pain)         || null,
        pse:          parseFloat(data.pse)          || null,
        duration:     parseFloat(data.duration)     || null,
        trainingLoad: parseFloat(data.trainingLoad) || null,
        food:         parseFloat(data.food)         || null,
        motivation:   parseFloat(data.motivation)   || null,
      });
    }

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
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`publicPut(${table}) ${res.status}:`, txt);
    } else {
      console.log(`publicPut(${table}) OK`);
    }
  } catch(e) {
    console.warn('publicPut error:', e);
  }
}

// â”€â”€ RegiÃµes de dor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PAIN_REGIONS = [
  { id:'cabeca',      label:'CabeÃ§a' },       { id:'pescoco',    label:'PescoÃ§o' },
  { id:'ombro_d',     label:'Ombro Dir.' },   { id:'ombro_e',    label:'Ombro Esq.' },
  { id:'costas_sup',  label:'Costas Sup.' },  { id:'lombar',     label:'Lombar' },
  { id:'quadril',     label:'Quadril' },      { id:'joelho_d',   label:'Joelho Dir.' },
  { id:'joelho_e',    label:'Joelho Esq.' },  { id:'tornozelo_d',label:'Tornozelo Dir.' },
  { id:'panturrilha', label:'Panturrilha' },  { id:'abdomen',    label:'AbdÃ´men' },
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

// â”€â”€ CSS injetado uma vez â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FORM_CSS = `
  *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
  body{margin:0;font-family:-apple-system,'Segoe UI',sans-serif}

  .student-form-page{
    min-height:100vh;
    display:flex;align-items:flex-start;justify-content:center;
    background:#080c12;
    padding:0 0 60px;
  }

  .form-card{
    background:#0f1420;
    width:100%;max-width:460px;
    min-height:100vh;
  }

  /* Header com acento verde */
  .form-card-header{
    padding:28px 24px 22px;
    text-align:center;
    border-bottom:1px solid rgba(255,255,255,0.06);
    position:relative;
    overflow:hidden;
  }
  .form-card-header::before{
    content:'';
    position:absolute;
    top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,#059669,#10b981,#34d399);
  }
  .form-card-header .logo{
    font-size:1.15rem;font-weight:800;color:#f1f5f9;
    letter-spacing:-0.02em;margin:0 0 3px;
  }
  .form-card-header .logo strong{color:#10b981}
  .form-card-header .subtitle{
    margin:0;font-size:0.78rem;color:#475569;
    font-weight:500;letter-spacing:0.03em;text-transform:uppercase;
  }

  .form-card-body{padding:22px 20px 32px}

  /* Info aluno */
  .student-info{
    display:flex;align-items:center;gap:12px;
    margin-bottom:24px;
    padding:13px 15px;
    background:rgba(16,185,129,0.05);
    border:1px solid rgba(16,185,129,0.12);
    border-radius:12px;
  }
  .student-info .av{
    width:42px;height:42px;border-radius:50%;
    background:#10b981;color:#fff;
    display:flex;align-items:center;justify-content:center;
    font-weight:800;font-size:0.9rem;flex-shrink:0;
    box-shadow:0 0 0 3px rgba(16,185,129,0.15);
  }
  .student-info .name{font-weight:700;font-size:0.95rem;color:#e2e8f0}
  .student-info .date{font-size:0.72rem;color:#64748b;margin-top:2px;text-transform:capitalize}

  /* Perguntas */
  .q{margin-bottom:26px}
  .q-label{
    font-size:0.75rem;font-weight:700;color:#64748b;
    text-transform:uppercase;letter-spacing:0.07em;
    margin-bottom:10px;display:flex;align-items:center;gap:6px;
  }

  /* OpÃ§Ãµes de seleÃ§Ã£o */
  .opt-group{display:flex;flex-direction:column;gap:7px}
  .opt-label{
    display:flex;align-items:center;gap:11px;
    padding:12px 14px;
    border:1px solid rgba(255,255,255,0.07);
    border-radius:10px;
    cursor:pointer;
    transition:all 0.15s;
    user-select:none;
    color:#94a3b8;
    font-size:0.88rem;
    line-height:1.3;
    background:rgba(255,255,255,0.02);
  }
  .opt-label:hover{border-color:rgba(16,185,129,0.25);background:rgba(16,185,129,0.04)}
  .opt-label:has(input:checked){
    background:rgba(16,185,129,0.1);
    border-color:rgba(16,185,129,0.45);
    color:#e2e8f0;font-weight:600;
  }
  .opt-label input[type=radio],
  .opt-label input[type=checkbox]{
    accent-color:#10b981;
    width:17px;height:17px;flex-shrink:0;cursor:pointer;
  }

  /* Scale picker (TQR/PSE) */
  .scale-opt {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    margin-bottom: 6px;
    background: rgba(255,255,255,0.015);
    box-sizing: border-box;
  }
  .scale-opt:hover {
    border-color: rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    transform: translateY(-1px);
  }
  .scale-opt.selected {
    border-width: 2px !important;
    border-color: var(--opt-color) !important;
    background: var(--opt-bg) !important;
    box-shadow: 0 0 12px var(--opt-bg) !important;
    transform: scale(1.01);
  }
  .scale-badge-num {
    width: 32px;
    height: 32px;
    border-radius: 50% !important; /* Perfect circle */
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.95rem;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  /* Slider range */
  input[type=range]{width:100%;height:4px;accent-color:#10b981;cursor:pointer;border-radius:2px}

  /* Tags de dor */
  .pain-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .pain-tag{
    padding:6px 13px;
    border:1px solid rgba(255,255,255,0.08);
    border-radius:20px;cursor:pointer;
    font-size:0.78rem;color:#64748b;
    background:rgba(255,255,255,0.02);
    transition:all 0.15s;user-select:none;
  }
  .pain-tag:hover{border-color:rgba(16,185,129,0.3);color:#94a3b8}
  .pain-tag.active{border-color:#10b981;background:rgba(16,185,129,0.12);color:#10b981;font-weight:600}

  /* Textarea */
  textarea{
    width:100%;padding:12px 14px;
    background:rgba(255,255,255,0.03);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:10px;color:#e2e8f0;
    font-size:0.87rem;resize:vertical;min-height:68px;
    font-family:inherit;transition:border-color 0.15s;
  }
  textarea::placeholder{color:#334155}
  textarea:focus{outline:none;border-color:rgba(16,185,129,0.5);background:rgba(16,185,129,0.03)}

  /* BotÃ£o enviar */
  .submit-btn{
    width:100%;padding:16px;
    background:#10b981;color:#fff;border:none;
    border-radius:12px;font-size:0.95rem;font-weight:700;
    cursor:pointer;margin-top:10px;
    letter-spacing:0.02em;
    transition:all 0.2s;
    box-shadow:0 4px 14px rgba(16,185,129,0.25);
  }
  .submit-btn:hover{background:#0ea472;box-shadow:0 6px 20px rgba(16,185,129,0.35);transform:translateY(-1px)}
  .submit-btn:active{transform:translateY(0);box-shadow:0 2px 8px rgba(16,185,129,0.2)}
  .submit-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none}

  /* Sucesso */
  .form-success{text-align:center;padding:56px 24px}
  .form-success .check{
    width:64px;height:64px;border-radius:50%;
    background:rgba(16,185,129,0.15);
    border:2px solid rgba(16,185,129,0.3);
    display:flex;align-items:center;justify-content:center;margin:0 auto 18px;
  }
  .form-success h2{color:#f1f5f9;margin:0 0 8px;font-size:1.35rem;font-weight:700}
  .form-success p{color:#64748b;margin:0;font-size:0.9rem}

  /* Cards de contexto */
  .pre-card{
    background:rgba(16,185,129,0.05);
    border:1px solid rgba(16,185,129,0.15);
    border-radius:10px;padding:12px 14px;margin-bottom:20px;
  }
  .pre-card-title{font-size:0.65rem;color:#10b981;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px}
  .pre-card-vals{display:flex;gap:12px;flex-wrap:wrap;font-size:0.82rem;color:#64748b}
  .pre-card-vals strong{color:#e2e8f0}

  /* Intro box */
  .form-intro{
    background:rgba(255,255,255,0.03);
    border-left:3px solid #10b981;
    border-radius:0 8px 8px 0;
    padding:12px 14px;
    margin-bottom:22px;
    font-size:0.83rem;color:#64748b;line-height:1.6;
  }

  /* Info DOMS */
  .doms-info{
    background:rgba(245,158,11,0.06);
    border:1px solid rgba(245,158,11,0.15);
    border-radius:8px;padding:9px 12px;margin-bottom:10px;
    font-size:0.74rem;color:#d97706;line-height:1.5;
  }

  .hidden{display:none!important}
  q-hint{font-size:0.75rem;color:#10b981;text-align:center;margin-top:6px;min-height:16px;font-weight:500}

  /* Premium Feeling buttons (Checkout) */
  .portal-feeling-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; margin-bottom: 16px; }
  .portal-feeling-emoji-btn {
    flex: 1; min-width: 60px; padding: 10px 4px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; color: #94a3b8; font-size: 1.25rem; cursor: pointer;
    transition: all 0.2s ease; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .portal-feeling-emoji-btn:hover { background: rgba(255,255,255,0.06); transform: translateY(-1px); }
  .portal-feeling-emoji-btn.active {
    border-color: #10b981; color: #10b981;
    background: rgba(16,185,129,0.12); transform: scale(1.05); font-weight: 700;
  }
  .portal-feeling-emoji-lbl { font-size: 0.65rem; font-weight: 600; }

  /* Premium Articular Pain chips (Checkout) */
  .portal-pain-chip-chk {
    display: flex; align-items: center; gap: 4px; padding: 6px 12px;
    border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
    border-radius: 20px; cursor: pointer; font-size: 0.75rem; transition: all 0.15s ease; color: #94a3b8;
  }
  .portal-pain-chip-chk:hover { background: rgba(255,255,255,0.05); }
  .portal-pain-chip-chk.active { background: rgba(239,68,68,0.12); border-color: #ef4444; color: #fca5a5; font-weight: 600; }

  /* scale item text classes */
  .scale-label { font-size:0.85rem; font-weight:700; color:#e2e8f0; }
  .scale-desc { font-size:0.72rem; color:#64748b; margin-top:2px; }
  .scale-sublabel { font-size:0.72rem; color:#475569; margin:-6px 0 10px; line-height:1.4; }
  .intro-name { color:#e2e8f0; }

  /* â”€â”€ LIGHT MODE OVERRIDES â”€â”€ */
  [data-theme="light"] .student-form-page { background:#f1f5f9 !important; }
  [data-theme="light"] .form-card { background:#ffffff !important; box-shadow:0 2px 16px rgba(0,0,0,0.07); }
  [data-theme="light"] .form-card-header { border-bottom-color:rgba(0,0,0,0.07); }
  [data-theme="light"] .form-card-header .subtitle { color:#475569; }
  [data-theme="light"] .student-info { background:rgba(16,185,129,0.06); border-color:rgba(16,185,129,0.18); }
  [data-theme="light"] .student-info .name { color:#0f172a; }
  [data-theme="light"] .student-info .date { color:#64748b; }
  [data-theme="light"] .q-label { color:#334155; }
  [data-theme="light"] .scale-label { color:#0f172a; }
  [data-theme="light"] .scale-desc { color:#64748b; }
  [data-theme="light"] .scale-sublabel { color:#64748b; }
  [data-theme="light"] .intro-name { color:#0f172a; }
  [data-theme="light"] .opt-label {
    border-color:rgba(0,0,0,0.1); color:#334155; background:rgba(0,0,0,0.02);
  }
  [data-theme="light"] .opt-label:hover { border-color:rgba(16,185,129,0.35); background:rgba(16,185,129,0.04); }
  [data-theme="light"] .opt-label:has(input:checked) { background:rgba(16,185,129,0.08); border-color:rgba(16,185,129,0.4); color:#065f46; }
  [data-theme="light"] .scale-opt { border-color:rgba(0,0,0,0.08) !important; background:#f8fafc !important; }
  [data-theme="light"] .scale-opt:hover { border-color:rgba(0,0,0,0.15) !important; background:#f1f5f9 !important; transform:translateY(-1px); }
  [data-theme="light"] .scale-opt.selected { background:var(--opt-bg) !important; border-color:var(--opt-color) !important; }
  [data-theme="light"] .form-intro { background:rgba(16,185,129,0.05); border-color:rgba(16,185,129,0.2); color:#334155; }
  [data-theme="light"] .doms-info { color:#92400e; background:rgba(245,158,11,0.06); border-color:rgba(245,158,11,0.2); }
  [data-theme="light"] .pain-tag { border-color:rgba(0,0,0,0.1); color:#475569; background:rgba(0,0,0,0.02); }
  [data-theme="light"] .pain-tag:hover { border-color:rgba(16,185,129,0.3); color:#0f172a; }
  [data-theme="light"] .pain-tag.active { border-color:#10b981; background:rgba(16,185,129,0.08); color:#065f46; }
  [data-theme="light"] textarea { background:rgba(0,0,0,0.02); border-color:rgba(0,0,0,0.1); color:#0f172a; }
  [data-theme="light"] textarea::placeholder { color:#94a3b8; }
  [data-theme="light"] .pre-card { background:rgba(16,185,129,0.04); border-color:rgba(16,185,129,0.15); }
  [data-theme="light"] .pre-card-vals { color:#475569; }
  [data-theme="light"] .pre-card-vals strong { color:#0f172a; }
  [data-theme="light"] .portal-feeling-emoji-btn { background:rgba(0,0,0,0.03); border-color:rgba(0,0,0,0.08); color:#475569; }
  [data-theme="light"] .portal-feeling-emoji-btn.active { background:rgba(16,185,129,0.1); border-color:#10b981; color:#065f46; }
  [data-theme="light"] .portal-pain-chip-chk { background:rgba(0,0,0,0.02); border-color:rgba(0,0,0,0.08); color:#475569; }
  [data-theme="light"] .form-success h2 { color:#0f172a; }
  [data-theme="light"] .form-success p { color:#64748b; }
`;


// â”€â”€ Escala TQR â€” KenttÃ¤ & HassmÃ©n (1998) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TQR_SCALE = [
  { v:1,  color:'#ef4444', label:'Muito, muito mal recuperado',  desc:'Dor muscular intensa, exaustÃ£o total' },
  { v:2,  color:'#ef4444', label:'Muito mal recuperado',         desc:'CansaÃ§o extremo, sem disposiÃ§Ã£o' },
  { v:3,  color:'#f97316', label:'Mal recuperado',               desc:'Pernas pesadas, sono excessivo' },
  { v:4,  color:'#f97316', label:'Razoavelmente mal recuperado', desc:'Cansado, motivaÃ§Ã£o baixa' },
  { v:5,  color:'#f59e0b', label:'Nem bem nem mal',              desc:'Neutro, energia moderada' },
  { v:6,  color:'#f59e0b', label:'Razoavelmente bem recuperado', desc:'Descansado, sem dores relevantes' },
  { v:7,  color:'#84cc16', label:'Bem recuperado',               desc:'Disposto, animado para treinar' },
  { v:8,  color:'#22c55e', label:'Muito bem recuperado',         desc:'Leve, energÃ©tico, foco alto' },
  { v:9,  color:'#10b981', label:'Muito, muito bem recuperado',  desc:'Descansado ao mÃ¡ximo' },
  { v:10, color:'#10b981', label:'Completamente recuperado',     desc:'100% â€” Pronto para superar limites' },
];

// â”€â”€ Escala PSE â€” Borg CR10 adaptada por Foster (1996) â”€â”€â”€â”€â”€â”€
const PSE_SCALE = [
  { v:0,  color:'#64748b', label:'Repouso',                      desc:'Sem esforÃ§o algum' },
  { v:1,  color:'#22c55e', label:'Muito, muito leve',            desc:'Mal percebe o esforÃ§o' },
  { v:2,  color:'#84cc16', label:'Leve',                         desc:'FÃ¡cil, poderia continuar por horas' },
  { v:3,  color:'#84cc16', label:'Moderado',                     desc:'ConfortÃ¡vel, respiraÃ§Ã£o levemente aumentada' },
  { v:4,  color:'#f59e0b', label:'Um pouco intenso',             desc:'ComeÃ§a a sentir o esforÃ§o' },
  { v:5,  color:'#f59e0b', label:'Intenso',                      desc:'DifÃ­cil manter conversa' },
  { v:6,  color:'#f97316', label:'Intenso +',                    desc:'FÃ´lego reduzido, exige concentraÃ§Ã£o' },
  { v:7,  color:'#f97316', label:'Muito intenso',                desc:'Muito difÃ­cil, perto do limite' },
  { v:8,  color:'#ef4444', label:'Muito intenso +',              desc:'Quase mÃ¡ximo, sustentÃ¡vel por pouco tempo' },
  { v:9,  color:'#ef4444', label:'Extremamente intenso',         desc:'Quase impossÃ­vel de manter' },
  { v:10, color:'#dc2626', label:'MÃ¡ximo absoluto',              desc:'EsforÃ§o total â€” 100% do limite' },
];

const SONO_SCALE = [
  { v:1,  color:'#ef4444', label:'1 - PÃ©ssimo', desc:'InsÃ´nia / Noite em claro' },
  { v:2,  color:'#ef4444', label:'2 - PÃ©ssimo', desc:'InsÃ´nia / Noite em claro' },
  { v:3,  color:'#fb923c', label:'3 - Ruim', desc:'Acordei vÃ¡rias vezes / Agitado' },
  { v:4,  color:'#fb923c', label:'4 - Ruim', desc:'Acordei vÃ¡rias vezes / Agitado' },
  { v:5,  color:'#eab308', label:'5 - Regular', desc:'Dormi o suficiente, mas acordei cansado' },
  { v:6,  color:'#eab308', label:'6 - Regular', desc:'Dormi o suficiente, mas acordei cansado' },
  { v:7,  color:'#10b981', label:'7 - Bom', desc:'Sono contÃ­nuo e revigorante' },
  { v:8,  color:'#10b981', label:'8 - Bom', desc:'Sono contÃ­nuo e revigorante' },
  { v:9,  color:'#06b6d4', label:'9 - Excelente', desc:'Sono profundo e muito reparador' },
  { v:10, color:'#06b6d4', label:'10 - Excelente', desc:'Sono profundo e muito reparador' }
];

const ALIMENTACAO_SCALE = [
  { v:5, color:'#06b6d4', label:'5 - Excelente', desc:'Bati todas as metas nutricionais e hidrataÃ§Ã£o' },
  { v:4, color:'#10b981', label:'4 - Boa', desc:'AlimentaÃ§Ã£o majoritariamente saudÃ¡vel / poucos furos' },
  { v:3, color:'#eab308', label:'3 - Regular', desc:'AlimentaÃ§Ã£o na mÃ©dia / algumas escapadas' },
  { v:2, color:'#fb923c', label:'2 - Ruim', desc:'Pulei refeiÃ§Ãµes ou comi alimentos pouco nutritivos' },
  { v:1, color:'#ef4444', label:'1 - PÃ©ssima', desc:'Fast food excessivo ou quase sem comer nada' }
];

const ESTRESSE_SCALE = [
  { v:1,  color:'#10b981', label:'1 - Muito Relaxado', desc:'Sem nenhum estresse mental, mente tranquila' },
  { v:2,  color:'#10b981', label:'2 - Tranquilo', desc:'Pouco estresse na rotina diÃ¡ria' },
  { v:3,  color:'#eab308', label:'3 - Moderado', desc:'Estresse sob controle, rotina equilibrada' },
  { v:4,  color:'#fb923c', label:'4 - Estressado', desc:'Rotina de trabalho/estudos pesada' },
  { v:5,  color:'#ef4444', label:'5 - Muito Estressado', desc:'Mente no limite, exaustÃ£o mental' }
];

const DOR_SCALE = [
  { v:1,  color:'#10b981', label:'1 - Sem Dor / Muito Leve', desc:'ArticulaÃ§Ãµes e tendÃµes 100% confortÃ¡veis' },
  { v:2,  color:'#10b981', label:'2 - Leve', desc:'Desconforto muscular leve residual pÃ³s-treino' },
  { v:3,  color:'#eab308', label:'3 - Moderada', desc:'Dor suportÃ¡vel, mas incomoda em movimentos' },
  { v:4,  color:'#fb923c', label:'4 - Forte', desc:'Dificulta a execuÃ§Ã£o de movimentos especÃ­ficos' },
  { v:5,  color:'#ef4444', label:'5 - Intensa / LesÃ£o', desc:'Dor muito forte, impede ou dificulta treinar' }
];

const MOTIVACAO_SCALE = [
  { v:1,  color:'#ef4444', label:'1 - Muito Baixa', desc:'Sem nenhuma vontade de treinar hoje' },
  { v:2,  color:'#ef4444', label:'2 - Muito Baixa', desc:'Sem nenhuma vontade de treinar hoje' },
  { v:3,  color:'#fb923c', label:'3 - Baixa', desc:'Desanimado, vou treinar por pura obrigaÃ§Ã£o' },
  { v:4,  color:'#fb923c', label:'4 - Baixa', desc:'Desanimado, vou treinar por pura obrigaÃ§Ã£o' },
  { v:5,  color:'#eab308', label:'5 - Moderada', desc:'Foco mediano, treino mantido por disciplina' },
  { v:6,  color:'#eab308', label:'6 - Moderada', desc:'Foco mediano, treino mantido por disciplina' },
  { v:7,  color:'#10b981', label:'7 - Alta', desc:'Focado, animado e com boa energia mental' },
  { v:8,  color:'#10b981', label:'8 - Alta', desc:'Focado, animado e com boa energia mental' },
  { v:9,  color:'#06b6d4', label:'9 - Muito Alta', desc:'Energia mÃ¡xima, sedento por treinar pesado' },
  { v:10, color:'#06b6d4', label:'10 - Muito Alta', desc:'Energia mÃ¡xima, sedento por treinar pesado' }
];

function scalePickerHTML(id, scale, defaultVal, label, sublabel='') {
  return `
    <div class="q">
      <div class="q-label">${label}</div>
      ${sublabel?`<div class="scale-sublabel">${sublabel}</div>`:''}
      <input type="hidden" name="${id}" id="hidden_${id}" value="${defaultVal}" />
      <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;padding-right:4px;" id="scale_${id}">
        ${scale.map(s => {
          const bg = s.color + '15';
          const isActive = String(s.v) === String(defaultVal);
          return `
            <label onclick="
              document.getElementById('hidden_${id}').value='${s.v}';
              document.querySelectorAll('#scale_${id} .scale-opt').forEach(el=>el.classList.remove('selected'));
              this.classList.add('selected');
              if ('${id}' === 'pain' && typeof window.onPrePainChange === 'function') {
                window.onPrePainChange('${s.v}');
              }
              if ('${id}' === 'postPain' && typeof window.onPostPainChange === 'function') {
                window.onPostPainChange('${s.v}');
              }
            " class="scale-opt${isActive?' selected':''}" 
              data-val="${s.v}" 
              style="--opt-color: ${s.color}; --opt-bg: ${bg};">
              <span class="scale-badge-num" style="background:${bg}; color:${s.color}; border: 1px solid ${s.color}33">
                ${s.v}
              </span>
              <div style="flex:1;min-width:0;text-align:left">
                <div class="scale-label">${s.label}</div>
                <div class="scale-desc">${s.desc}</div>
              </div>
            </label>
          `;
        }).join('')}
      </div>
    </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PRÃ‰-TREINO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function renderPreForm(studentId) {
  // Limpar parÃ¢metros extras do ID (links antigos tinham ?t=...&n=...)
  const cleanId = (studentId || '').split('?')[0].split('&')[0].trim();
  const student = await publicGet('students', cleanId);

  if (!student) {    return `
      <style>${FORM_CSS}</style>
      <div class="student-form-page">
        <div class="form-card">
          <div class="form-card-header"><h2>Personal<strong class="logo-pro">PRO</strong></h2></div>
          <div class="form-card-body" style="text-align:center;padding:48px 24px">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" style="margin-bottom:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3>Aluno nÃ£o encontrado</h3>
            <p style="color:var(--text-muted);margin-top:8px;font-size:0.9rem">
              O link pode estar desatualizado. PeÃ§a um novo link ao seu personal.
            </p>
          </div>
        </div>
      </div>`;
  }

  const firstName = student.name?.split(' ')[0] || student.name;
  const ini = student.name?.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() || '?';
  const dateStr = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});

  return `
    <style>
      ${FORM_CSS}
      .opt-group{display:flex;flex-direction:column;gap:6px}
      .opt-label{display:flex;align-items:center;gap:10px;padding:11px 14px;border:1px solid rgba(255,255,255,0.07);border-radius:8px;cursor:pointer;transition:all 0.12s;user-select:none;color:#cbd5e1;font-size:0.88rem}
      .opt-label:has(input:checked){background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.5);color:#e2e8f0;font-weight:600}
      .scale-opt.selected{background:rgba(16,185,129,0.12)!important;border-color:rgba(16,185,129,0.6)!important}
      .form-intro{background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:10px;padding:14px 16px;margin-bottom:22px;font-size:0.82rem;color:#94a3b8;line-height:1.6}
      .doms-info{background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:0.74rem;color:#f59e0b;line-height:1.5}
    </style>
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <div class="logo">Personal<strong>PRO</strong></div>
          <p class="subtitle">Check-in PrÃ©-Treino</p>
        </div>
        <div class="form-card-body">
          <div class="form-intro">
            OlÃ¡, <strong class="intro-name">${firstName}</strong>! Este check-in avalia sua recuperaÃ§Ã£o para ajustar a intensidade do treino de hoje. <strong style="color:#10b981">Responda com sinceridade.</strong>
          </div>
          <div class="student-info">
            <div class="av">${ini}</div>
            <div><div class="name">${student.name}</div><div class="date">${dateStr}</div></div>
          </div>

          <form id="preStudentForm" onkeydown="if(event.key==='Enter'&&event.target.tagName!=='TEXTAREA'){event.preventDefault();}">
            <input type="hidden" name="studentId" value="${cleanId}" />
            <input type="hidden" name="trainerId" value="${student.trainer_id||student.trainerId||''}" />

            ${scalePickerHTML('sleep', SONO_SCALE, 7, 'ðŸ˜´ Qualidade do Sono ðŸŒ™', 'Selecione o descritor que melhor representa sua Ãºltima noite de sono.')}

            ${scalePickerHTML('food', ALIMENTACAO_SCALE, 4, 'ðŸŽ AlimentaÃ§Ã£o nas Ãºltimas 24h', 'Como foi sua ingestÃ£o de alimentos e hidrataÃ§Ã£o nas Ãºltimas 24h?')}

            ${scalePickerHTML('motivation', MOTIVACAO_SCALE, 7, 'ðŸ”¥ MotivaÃ§Ã£o para o Treino', 'Como estÃ¡ sua disposiÃ§Ã£o e motivaÃ§Ã£o para o treino de hoje?')}

            ${scalePickerHTML('stress', ESTRESSE_SCALE, 3, 'ðŸ¤¯ NÃ­vel de Estresse Mental', 'Como estÃ¡ sua mente e seu nÃ­vel de estresse hoje?')}

            ${scalePickerHTML('tqr', TQR_SCALE, 7, 'âš¡ NÃ­vel de RecuperaÃ§Ã£o (TQR)', 'Escala de Estado de RecuperaÃ§Ã£o (KenttÃ¤ & HassmÃ©n, 1998). Selecione seu estado de recuperaÃ§Ã£o atual.')}

            ${scalePickerHTML('pain', DOR_SCALE, 1, 'ðŸ©¹ Dor Articular ou Desconforto', 'Sente alguma dor ou incÃ´modo nas articulaÃ§Ãµes ou tendÃµes?')}
            <div id="painGroup" style="display:none;margin-bottom:22px">
              <div class="q-label" style="margin-bottom:10px">Selecione a regiÃ£o</div>
              <div class="pain-tags" id="pre_pain_regions_wrap">
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="pernas" style="display:none"/>Pernas</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="bracos" style="display:none"/>BraÃ§os</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="costas" style="display:none"/>Costas</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="ombros" style="display:none"/>Ombros</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="peito" style="display:none"/>Peito</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="abdomen" style="display:none"/>AbdÃ´men</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="lombar" style="display:none"/>Lombar</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="tornozelo" style="display:none"/>Tornozelo</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="gluteos" style="display:none"/>GlÃºteos</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="coxas" style="display:none"/>Coxas</label>
                <label class="pain-tag"><input type="checkbox" name="pre_pain_regions" value="joelhos" style="display:none"/>Joelhos</label>
              </div>
            </div>

            ${student.gender==='F'||student.gender==='Feminino'?`
            <div class="q">
              <div class="q-label">EstÃ¡ no perÃ­odo do ciclo menstrual? <span style="color:#ef4444">*</span></div>
              <div class="opt-group">
                <label class="opt-label"><input type="radio" name="menstrual" value="sim" />Sim</label>
                <label class="opt-label"><input type="radio" name="menstrual" value="nao" checked />NÃ£o</label>
              </div>
            </div>`:'<input type="hidden" name="menstrual" value="nao" />'}

            <div class="q">
              <div class="q-label">Alguma observaÃ§Ã£o a acrescentar?</div>
              <textarea name="notes" rows="2" placeholder="Opcional"></textarea>
            </div>

            <button type="submit" id="preSubmitBtn" class="submit-btn">Enviar check-in</button>
          </form>

          <div id="preSuccess" class="hidden">
            <div class="form-success">
              <div class="check"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
              <h2>Enviado, ${firstName}!</h2>
              <p>Seu personal jÃ¡ recebeu. Bom treino! ðŸ’ª</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}


export function initPreForm() {
  // Bind global pain change handler
  window.onPrePainChange = (val) => {
    const painVal = parseInt(val) || 0;
    const grp = document.getElementById('painGroup');
    if (grp) grp.style.display = painVal >= 3 ? 'block' : 'none';
  };

  // Trigger initial state
  setTimeout(() => {
    const initPain = parseInt(document.getElementById('hidden_pain')?.value) || 0;
    window.onPrePainChange(initPain);
  }, 100);

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

      // Normalizar numÃ©ricos
      ['sleep','tqr','stress','pain','food','motivation'].forEach(k => {
        data[k] = parseInt(data[k]) || (k==='pain'?0:(k==='motivation'?7:5));
      });
      data.energy    = data.tqr;
      data.mood      = Math.round((data.sleep + data.tqr) / 2);
      data.menstrual = data.menstrual === 'sim';
      data.submittedByStudent = true;
      data.submittedAt = Calc.nowISO();
      // Garantir trainerId
      data.trainerId = data.trainerId || '';

      // ID determinÃ­stico para permitir mesclagem de check-ins do mesmo dia
      data.id = 'bf_' + data.studentId + '_' + data.date.substring(0, 10);

      await publicAdd('biofeedback', data);
      e.target.classList.add('hidden');
      document.getElementById('preSuccess')?.classList.remove('hidden');
    } catch(err) {
      console.error('Erro prÃ© submit:', err?.message || err);
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar'; }
      // Mostrar erro real para debug
      const msg = err?.message || String(err) || 'Erro desconhecido';
      alert('Erro ao enviar:\n' + msg.slice(0, 200));
    }
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PÃ“S-TREINO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function renderPostForm(sessionId) {
  const cleanSessionId = (sessionId || '').split('?')[0].split('&')[0].trim();
  const session = await publicGet('sessions', cleanSessionId);

  if (!session) {
    return `
      <style>${FORM_CSS}</style>
      <div class="student-form-page">
        <div class="form-card">
          <div class="form-card-header"><h2>Personal<strong class="logo-pro">PRO</strong></h2></div>
          <div class="form-card-body" style="text-align:center;padding:48px 24px">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" style="margin-bottom:6px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3>SessÃ£o nÃ£o encontrada</h3>
            <p style="color:var(--text-muted);margin-top:8px;font-size:0.9rem">
              O link pode estar expirado. PeÃ§a um novo link ao seu personal.
            </p>
          </div>
        </div>
      </div>`;
  }

  const student    = await publicGet('students', session.studentId);
  const firstName  = student?.name?.split(' ')[0] || 'Aluno';
  const ini        = student?.name?.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() || '?';

  // Buscar prÃ©-treino do mesmo dia
  let preBf = null;
  try {
    const allBf  = await db.getAllForStudent('biofeedback', session.studentId);
    const dayStr = new Date(session.date||Date.now()).toDateString();
    preBf = allBf.find(b => b.studentId===session.studentId && b.formType==='pre' && new Date(b.date).toDateString()===dayStr);
  } catch(_) {}

  return `
    <style>${FORM_CSS}</style>
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <div class="logo">Personal<strong>PRO</strong></div>
          <p class="subtitle">Check-in PÃ³s-Treino</p>
        </div>
        <div class="form-card-body">

          <div class="student-info">
            <div class="av">${ini}</div>
            <div>
              <div class="name">${student?.name||'Aluno'}</div>
              <div class="date">${session.workoutName||'Treino'} Â· ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          ${preBf ? `
          <div class="pre-card">
            <div class="pre-card-title">Check-in de entrada</div>
            <div class="pre-card-vals">
              <span>Sono <strong>${preBf.sleep}/10</strong></span>
              <span>TQR <strong>${preBf.tqr||preBf.energy||'â€”'}/10</strong></span>
              <span>Est. Mental <strong>${preBf.stress}/10</strong></span>
              ${preBf.pain>2?`<span>Dor <strong>${preBf.pain}/10</strong></span>`:''}
            </div>
          </div>` : ''}

          <form id="postStudentForm">
            <input type="hidden" name="sessionId" value="${sessionId}" />
            ${preBf ? `<input type="hidden" name="preBiofeedbackId" value="${preBf.id}" />` : ''}
            <input type="hidden" name="trainerId" value="${student?.trainer_id||student?.trainerId||''}" />

            <!-- 1. PSE com descritores completos -->
            ${scalePickerHTML('pse', PSE_SCALE, 5,
              'Qual a intensidade do seu treino de hoje? âš¡',
              'PSE â€” PercepÃ§Ã£o Subjetiva de EsforÃ§o (Borg CR10, adaptada por Foster 1996). Selecione o descritor que melhor representa como foi o treino.'
            )}

            <!-- 2. Feeling / Humores pÃ³s-treino (emoji buttons) -->
            <div class="q">
              <div class="q-label">ðŸ˜Š SensaÃ§Ã£o pÃ³s-treino (RecuperaÃ§Ã£o/Humor)</div>
              <div class="portal-feeling-row">
                <button type="button" class="portal-feeling-emoji-btn" data-val="1">
                  <span>ðŸ˜©</span><span class="portal-feeling-emoji-lbl">Esgotado</span>
                </button>
                <button type="button" class="portal-feeling-emoji-btn" data-val="2">
                  <span>ðŸ¥±</span><span class="portal-feeling-emoji-lbl">Cansado</span>
                </button>
                <button type="button" class="portal-feeling-emoji-btn active" data-val="3">
                  <span>ðŸ™‚</span><span class="portal-feeling-emoji-lbl">Ok</span>
                </button>
                <button type="button" class="portal-feeling-emoji-btn" data-val="4">
                  <span>ðŸ˜</span><span class="portal-feeling-emoji-lbl">Bem</span>
                </button>
                <button type="button" class="portal-feeling-emoji-btn" data-val="5">
                  <span>ðŸ”¥</span><span class="portal-feeling-emoji-lbl">Excelente</span>
                </button>
              </div>
              <input type="hidden" name="feeling" id="hidden_feeling" value="3" />
            </div>

            <!-- 3. Articular Pain post-workout -->
            ${scalePickerHTML('postPain', DOR_SCALE, 1, 'ðŸ©¹ Dor Articular ou Desconforto', 'Sente alguma dor ou incÃ´modo articular pÃ³s-treino?')}

            <!-- 4. Pain regions container -->
            <div id="postPainGroup" style="display:none;margin-bottom:22px">
              <div class="q-label" style="margin-bottom:10px">Selecione a regiÃ£o da dor</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; padding:6px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px">
                ${[
                  { id: 'joelho_e', label: 'Joelho Esq.' },
                  { id: 'joelho_d', label: 'Joelho Dir.' },
                  { id: 'ombro_e', label: 'Ombro Esq.' },
                  { id: 'ombro_d', label: 'Ombro Dir.' },
                  { id: 'lombar', label: 'Coluna Lombar' },
                  { id: 'cervical', label: 'Coluna Cervical' },
                  { id: 'quadril', label: 'Quadril' },
                  { id: 'tornozelo', label: 'Tornozelo/PÃ©' },
                  { id: 'cotovelo', label: 'Cotovelo/Punho' }
                ].map(c => `
                  <label class="portal-pain-chip-chk">
                    <input type="checkbox" name="post_pain_regions" value="${c.id}" style="display:none">
                    ${c.label}
                  </label>
                `).join('')}
              </div>
              <div style="margin-top: 10px;">
                <input type="text" name="postPainDescription" placeholder="Descreva brevemente o incÃ´modo (opcional)..." class="portal-textarea" style="padding: 8px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.05); text-align: left; width: 100%;">
              </div>
            </div>

            <!-- 5. Notes -->
            <div class="q">
              <div class="q-label">Alguma observaÃ§Ã£o a acrescentar?</div>
              <textarea name="notes" placeholder="Opcional â€” dificuldade em algum exercÃ­cio, dor, algo diferente..."></textarea>
            </div>

            <button type="submit" id="postSubmitBtn" class="submit-btn">Enviar avaliaÃ§Ã£o</button>
          </form>

          <div id="postSuccess" class="hidden">
            <div class="form-success">
              <div class="check">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2>ParabÃ©ns, ${firstName}!</h2>
              <p>Treino registrado. Continue evoluindo.</p>
            </div>
          </div>

        </div>
      </div>
    </div>`;
}

export function initPostForm() {
  // Bind global pain change handler
  window.onPostPainChange = (val) => {
    const painVal = parseInt(val) || 0;
    const grp = document.getElementById('postPainGroup');
    if (grp) grp.style.display = painVal >= 1 ? 'block' : 'none';
  };

  // Trigger initial state
  setTimeout(() => {
    const initPain = parseInt(document.getElementById('hidden_postPain')?.value) || 0;
    window.onPostPainChange(initPain);

    // Feeling buttons
    document.querySelectorAll('#postStudentForm .portal-feeling-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#postStudentForm .portal-feeling-emoji-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const hiddenFeeling = document.getElementById('hidden_feeling');
        if (hiddenFeeling) hiddenFeeling.value = btn.dataset.val;
      });
    });

    // Pain location chips
    document.querySelectorAll('#postStudentForm .portal-pain-chip-chk').forEach(lbl => {
      lbl.addEventListener('click', () => {
        const input = lbl.querySelector('input');
        if (input) {
          input.checked = !input.checked;
          lbl.classList.toggle('active', input.checked);
        }
      });
    });
  }, 100);

  document.getElementById('postStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('postSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
      const fd      = new FormData(e.target);
      const data    = Object.fromEntries(fd);
      const postPainRegions = fd.getAll('post_pain_regions');
      const session = await publicGet('sessions', data.sessionId);

      if (!session) throw new Error('SessÃ£o nÃ£o encontrada. O link pode ter expirado.');
      {
        const dur = session.totalDuration ? Math.round(session.totalDuration/60) : 60;
        const pse = parseInt(data.pse) || 7;
        const tqrPost = 7; // TQR pÃ³s removido do formulÃ¡rio â€” usar neutro
        const postPain = parseInt(data.postPain) || 0;
        const feeling = parseInt(data.feeling) || 3;
        const satisfaction = feeling * 2; // Map 1-5 to 2-10

        session.postBiofeedback = {
          pse,
          tqrPost,
          feeling,
          satisfaction,
          postPain,
          painRegions: postPainRegions,
          painDescription: data.postPainDescription || '',
          notes: data.notes||'',
          submittedByStudent: true,
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
              postPain,
              postPainRegions,
              satisfaction,
              postNotes: data.notes||'',
              postPainDescription: data.postPainDescription || '',
              formType: 'complete',
              sessionId: data.sessionId, completedAt: Calc.nowISO(),
            });
          }
        } else {
          await publicAdd('biofeedback', {
            id: 'bf_' + session.studentId + '_' + (session.date||Calc.nowISO()).substring(0, 10),
            studentId: session.studentId, trainerId: data.trainerId||session.trainerId||'',
            date: session.date||Calc.nowISO(),
            pse, tqrPost, duration: dur, trainingLoad: pse*dur,
            postPain, postPainRegions,
            satisfaction,
            notes: data.notes||'',
            painDescription: data.postPainDescription || '',
            formType:'post', sessionId: data.sessionId,
          });
        }
      }

      e.target.classList.add('hidden');
      document.getElementById('postSuccess')?.classList.remove('hidden');
    } catch(err) {
      console.error('Erro pÃ³s submit:', err?.message || err);
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar'; }
      const msg = err?.message || String(err) || 'Erro desconhecido';
      alert('Erro ao enviar:\n' + msg.slice(0, 200));
    }
  });
}

