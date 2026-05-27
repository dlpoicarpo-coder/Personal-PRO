// ========================================
// PERSONAL PRO — student Form Pages (v2)
// Pre-workout and Post-workout forms via link
// ========================================
import db from '../db.js';
import { notify } from '../components/toast.js';
import { PAIN_REGIONS, painRegionSelector } from '../utils/alerts.js';

// ======================== HELPER FORMS ========================
function setupFormDraft(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  
  // Prevent Enter key submission
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
  });

  // Load draft
  try {
    const draft = JSON.parse(localStorage.getItem('draft_' + formId));
    if (draft) {
      Object.entries(draft).forEach(([k, v]) => {
        const input = form.elements[k];
        if (input) {
          if (input.type === 'radio' || input.type === 'checkbox') {
             if(input.length) Array.from(input).forEach(i => { if(i.value == v) i.checked = true; });
             else if(input.value == v) input.checked = true;
          } else {
            input.value = v;
          }
        }
      });
      // trigger events
      Array.from(form.elements).forEach(el => el.dispatchEvent(new Event('change', { bubbles: true })));
    }
  } catch(e){}

  // Save on change
  form.addEventListener('input', () => {
    const fd = new FormData(form);
    localStorage.setItem('draft_' + formId, JSON.stringify(Object.fromEntries(fd)));
  });
}


// ======================== PRE-WORKOUT FORM ========================

export async function renderPreForm(studentIdRaw) {
  const [studentId, query] = studentIdRaw.split('?');
  const params = new URLSearchParams(query || '');
  const tId = params.get('t') || '';
  const sName = params.get('n') ? decodeURIComponent(params.get('n')) : '';

  let student = await db.get('students', studentId).catch(() => null);
  if (!student && !sName) return `<div class="student-form-page"><div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Aluno não encontrado</h3></div></div>`;

  const displayName = student ? student.name : sName;
  const displayInitial = displayName ? displayName[0] : '?';
  const birth = student?.birthDate ? new Date(student.birthDate) : null;
  const age = birth ? new Date().getFullYear() - birth.getFullYear() : parseInt(student?.age) || null;
  const isWomanUnder40 = student && (student.gender === 'F' || student.gender === 'Feminino') && age !== null && age < 40;

  return `
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h1 style="margin:8px 0 4px">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="text-muted text-sm">Formulário Pré-Treino</p>
        </div>
        <div class="form-card-body">
          <div class="flex items-center gap-md mb-lg">
            <div class="avatar avatar-lg">${displayInitial}</div>
            <div><h3 style="margin:0">${displayName}</h3><div class="text-muted text-sm">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
          </div>



          <form id="preStudentForm">
            <input type="hidden" name="studentId" value="${studentId}" />
            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Qualidade do Sono <span id="sleepVal">7</span>/10
                <span id="sleepDesc" style="font-size:0.78rem;color:var(--text-muted);margin-left:8px;display:block;margin-top:4px">Bom (Sono contínuo e revigorante)</span>
              </label>
              <input type="range" name="sleep" min="1" max="10" value="7" style="width:100%;accent-color:var(--primary)" oninput="
                document.getElementById('sleepVal').textContent=this.value;
                var d={1:'Péssimo (Insônia / Noite em claro)',2:'Péssimo (Insônia / Noite em claro)',3:'Ruim (Acordei várias vezes / Agitado)',4:'Ruim (Acordei várias vezes / Agitado)',5:'Regular (Dormi o suficiente, mas cansado)',6:'Regular (Dormi o suficiente, mas cansado)',7:'Bom (Sono contínuo e revigorante)',8:'Bom (Sono contínuo e revigorante)',9:'Excelente (Sono profundo e muito reparador)',10:'Excelente (Sono profundo e muito reparador)'};
                document.getElementById('sleepDesc').textContent=d[this.value]||'';
              " />
            </div>

            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Nível de Recuperação (TQR)</label>
              <select class="form-select" name="tqr" style="font-size:0.95rem">
                <option value="0">0 - Não recuperado</option>
                <option value="1">1 - Muito mal recuperado</option>
                <option value="2">2 - Mal recuperado</option>
                <option value="3">3 - Pouco recuperado</option>
                <option value="4">4 - Recuperação abaixo da média</option>
                <option value="5" selected>5 - Recuperação parcial</option>
                <option value="6">6 - Razoavelmente recuperado</option>
                <option value="7">7 - Bem recuperado</option>
                <option value="8">8 - Muito bem recuperado</option>
                <option value="9">9 - Excelente recuperação</option>
                <option value="10">10 - Totalmente recuperado</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Alimentação nas últimas 24h</label>
              <select class="form-select" name="food" style="font-size:0.95rem">
                <option value="5" selected>Excelente (Bati as metas / Saudável)</option>
                <option value="4">Boa (Maioria saudável / Poucos furos)</option>
                <option value="3">Regular (Na média / Algumas escapadas)</option>
                <option value="2">Ruim (Pulei refeições / Comi mal)</option>
                <option value="1">Péssima (Fast food / Quase não comi)</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Nível de Estresse <span id="stressVal">5</span>/10
                <span id="stressDesc" style="font-size:0.78rem;color:var(--text-muted);margin-left:8px;display:block;margin-top:4px">Moderado (Estresse sob controle)</span>
              </label>
              <input type="range" name="stress" min="1" max="10" value="5" style="width:100%;accent-color:var(--primary)" oninput="
                document.getElementById('stressVal').textContent=this.value;
                var d={1:'Muito Relaxado (Sem estresse)',2:'Muito Relaxado (Sem estresse)',3:'Pouco Estresse (Tranquilo)',4:'Pouco Estresse (Tranquilo)',5:'Moderado (Estresse sob controle)',6:'Moderado (Estresse sob controle)',7:'Estressado (Rotina pesada)',8:'Estressado (Rotina pesada)',9:'Muito Estressado (No limite / Esgotado)',10:'Muito Estressado (No limite / Esgotado)'};
                document.getElementById('stressDesc').textContent=d[this.value]||'';
              " />
            </div>

            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Dor / Desconforto <span id="painVal">1</span>/10
                <span id="painDesc" style="font-size:0.78rem;color:var(--text-muted);margin-left:8px;display:block;margin-top:4px">Nenhuma (Sem qualquer dor)</span>
              </label>
              <input type="range" name="pain" min="1" max="10" value="1" style="width:100%;accent-color:var(--primary)" oninput="
                document.getElementById('painVal').textContent=this.value;
                document.getElementById('painGroup').style.display=this.value>=3?'block':'none';
                var d={1:'Nenhuma (Sem qualquer dor)',2:'Leve (Desconforto muscular leve)',3:'Moderada (Dor suportável, incomoda)',4:'Moderada (Dor suportável, incomoda)',5:'Incômoda (Dor persistente)',6:'Incômoda (Dor persistente)',7:'Forte (Dificulta alguns movimentos)',8:'Forte (Dificulta alguns movimentos)',9:'Intensa (Muito forte / Impede treinar)',10:'Intensa (Muito forte / Impede treinar)'};
                document.getElementById('painDesc').textContent=d[this.value]||'';
              " />
            </div>

            <div class="form-group" id="painGroup" style="display:none; margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Locais de dor <span class="text-muted text-xs">(pode marcar mais de um)</span></label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;max-height:150px;overflow-y:auto;padding:6px;background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:10px">
                ${PAIN_REGIONS.map(r=>`
                  <label class="portal-pain-chip" style="
                    display:flex;align-items:center;gap:4px;padding:4px 10px;
                    border:1px solid var(--border-color);border-radius:20px;
                    cursor:pointer;font-size:0.78rem;transition:all 0.15s">
                    <input type="checkbox" name="painRegions" value="${r.id}" style="display:none" />
                    ${r.label}
                  </label>`).join('')}
              </div>
              <div class="form-group mt-sm" style="margin-top:12px">
                <label class="form-label text-sm">Descreva a dor (opcional)</label>
                <textarea class="form-textarea" name="painDescription" rows="2" placeholder="Ex: Dor aguda no ombro direito ao levantar o braço"></textarea>
              </div>
            </div>

            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Motivação <span id="motivVal">7</span>/10
                <span id="motivDesc" style="font-size:0.78rem;color:var(--text-muted);margin-left:8px;display:block;margin-top:4px">Alta (Focado e animado)</span>
              </label>
              <input type="range" name="motivation" min="1" max="10" value="7" style="width:100%;accent-color:var(--primary)" oninput="
                document.getElementById('motivVal').textContent=this.value;
                var d={1:'Muito Baixa (Sem vontade de treinar)',2:'Muito Baixa (Sem vontade de treinar)',3:'Baixa (Desanimado, mas vou)',4:'Baixa (Desanimado, mas vou)',5:'Moderada (Treino por disciplina)',6:'Moderada (Treino por disciplina)',7:'Alta (Focado e animado)',8:'Alta (Focado e animado)',9:'Muito Alta (Energia máxima / Sedento por treino)',10:'Muito Alta (Energia máxima / Sedento por treino)'};
                document.getElementById('motivDesc').textContent=d[this.value]||'';
              " />
            </div>

            ${isWomanUnder40 ? `
            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Ciclo Menstrual (Se aplicável)</label>
              <select class="form-select" name="menstrualCycle" style="font-size:0.95rem">
                <option value="" selected>Não se aplica / Prefiro não informar</option>
                <option value="Menstruacao">Menstruação</option>
                <option value="Folicular">Fase Folicular (Pós-menstruação)</option>
                <option value="Ovulatoria">Fase Ovulatória</option>
                <option value="Lutea">Fase Lútea (Pré-menstrual / TPM)</option>
              </select>
            </div>
            ` : ''}

            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Alguma observação?</label>
              <textarea class="form-textarea" name="notes" rows="2" placeholder="Como você está se sentindo hoje? Dormiu bem? Comeu bem?"></textarea>
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
  setupFormDraft('preStudentForm');

  // Tag toggle listener for pain chips
  setTimeout(() => {
    document.querySelectorAll('.portal-pain-chip').forEach(tag => {
      tag.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const cb = tag.querySelector('input');
        if (!cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        tag.style.borderColor = cb.checked ? 'var(--primary)' : '';
        tag.style.background  = cb.checked ? 'rgba(16, 185, 129, 0.12)' : '';
        tag.style.color       = cb.checked ? 'var(--primary)' : '';
      });
    });
  }, 100);

  document.getElementById('preStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const painVal = parseInt(fd.get('pain')) || 1;
    const data = {
      studentId: fd.get('studentId'),
      formType: 'pre',
      date: new Date().toISOString(),
      sleep: parseInt(fd.get('sleep')) || 7,
      tqr: parseInt(fd.get('tqr')) || 5,
      stress: parseInt(fd.get('stress')) || 5,
      pain: painVal,
      painRegions: painVal >= 3 ? fd.getAll('painRegions') : [],
      painDescription: painVal >= 3 ? fd.get('painDescription') : '',
      food: parseInt(fd.get('food')) || 5,
      motivation: parseInt(fd.get('motivation')) || 7,
      menstrualCycle: fd.get('menstrualCycle') || '',
      notes: fd.get('notes') || '',
    };
    
    // Mapeamento para retrocompatibilidade
    data.mood = data.tqr;
    data.energy = data.tqr;

    const studentIdRaw = window.location.hash.split('/form/pre/')[1] || '';
    const query = studentIdRaw.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const tIdUrl = params.get('t');

    // Busca o aluno para obter o trainer_id se não estiver na URL
    const student = await db.get('students', data.studentId).catch(()=>null);
    const tId = tIdUrl || (student ? (student.trainerId || student.trainer_id) : null);
    
    if (tId) {
      data.trainerId = tId;
      data.trainer_id = tId;
    }

    const isPublic = !!tIdUrl;

    try {
      if (tId) {
        const { getSupabase } = await import('../utils/auth.js');
        const sb = getSupabase?.();
        if (sb) {
          const { error } = await sb.from('biofeedback').insert([data]);
          if (error) throw error;
        } else if (!isPublic) {
          await db.add('biofeedback', data);
        } else {
          throw new Error('Supabase indisponível para envio público.');
        }
      } else {
        await db.add('biofeedback', data);
      }
      localStorage.removeItem('draft_preStudentForm');
    } catch(err) {
      console.warn('Erro ao salvar form pre:', err);
      // fallback local só se não for público
      if (!isPublic) await db.add('biofeedback', data);
    }
    
    e.target.classList.add('hidden');
    document.getElementById('preSuccess')?.classList.remove('hidden');
  });
}

// ======================== POST-WORKOUT FORM ========================

export async function renderPostForm(sessionIdRaw) {
  const [sessionId, query] = sessionIdRaw.split('?');
  const params = new URLSearchParams(query || '');
  const tId = params.get('t') || '';
  const sName = params.get('n') ? decodeURIComponent(params.get('n')) : '';

  const session = await db.get('sessions', sessionId).catch(()=>null);
  if (!session && !sName) return `<div class="student-form-page"><div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Sessão não encontrada</h3></div></div>`;
  const student = session ? await db.get('students', session.studentId).catch(()=>null) : null;
  
  const displayName = student ? student.name : sName;
  const displayInitial = displayName ? displayName[0] : '?';

  return `
    <div class="student-form-page">
      <div class="form-card">
        <div class="form-card-header">
          <h1 style="margin:8px 0 4px">Personal<strong class="logo-pro">PRO</strong></h1>
          <p class="text-muted text-sm">Formulário Pós-Treino</p>
        </div>
        <div class="form-card-body">
          <div class="flex items-center gap-md mb-lg">
            <div class="avatar avatar-lg">${displayInitial}</div>
            <div>
              <h3 style="margin:0">${displayName}</h3>
              <div class="text-muted text-sm">${session?.workoutName || 'Treino'} · ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>



          <form id="postStudentForm">
            <input type="hidden" name="sessionId" value="${sessionId}" />
            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">PSE — Quão difícil foi o treino?</label>
              <select class="form-select" name="pse" style="font-size:0.95rem">
                <option value="0">0 - Repouso / Nenhum esforço</option>
                <option value="1">1 - Muito fraco</option>
                <option value="2">2 - Fraco</option>
                <option value="3">3 - Moderado</option>
                <option value="4">4 - Um pouco forte</option>
                <option value="5">5 - Forte</option>
                <option value="6">6 - Forte +</option>
                <option value="7" selected>7 - Muito forte</option>
                <option value="8">8 - Muito forte +</option>
                <option value="9">9 - Quase máximo</option>
                <option value="10">10 - Esforço Máximo</option>
              </select>
            </div>
            
            <div class="form-group" style="margin-bottom:24px; padding:16px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card)">
              <label class="form-label" style="font-size:1.1rem; font-weight:600; margin-bottom:12px">Satisfação com o treino</label>
              <div class="form-hint" style="margin-bottom:16px">1 = Péssimo · 10 = Excelente</div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; overflow-x:auto; padding-bottom:8px">
                ${[1,2,3,4,5,6,7,8,9,10].map(val => `<label style="display:flex; flex-direction:column; align-items:center; cursor:pointer; gap:8px"><input type="radio" name="satisfaction" value="${val}" ${val === 8 ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary);cursor:pointer" /><span style="font-size:0.85rem;font-weight:500;color:var(--text-muted)">${val}</span></label>`).join('')}
              </div>
            </div>
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label">Sentiu dor durante o treino?</label>
              <select name="postPain" class="form-select" onchange="document.getElementById('postPainGroup').style.display=this.value>=3?'block':'none'">
                ${[1,2,3,4,5,6,7,8,9,10].map(val => `<option value="${val}">${val} ${val==1?'(Sem dor)':val==10?'(Muita dor)':''}</option>`).join('')}
              </select>
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
  setupFormDraft('postStudentForm');
  document.getElementById('postStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    
    const sessionId = data.sessionId;
    const session = await db.get('sessions', sessionId).catch(()=>null);
    if (!session) return;

    session.postBiofeedback = {
      pse: parseInt(data.pse) || 7,
      satisfaction: parseInt(data.satisfaction) || 8,
      postPain: parseInt(data.postPain) || 1,
      painRegion: data.painRegion || '',
      painDescription: data.painDescription || '',
      notes: data.notes || '',
    };
    session.notes = data.notes || session.notes;
    session.status = 'completed';

    await db.put('sessions', session);

    // Salvar também no biofeedback history
    const bfData = {
      studentId: session.studentId,
      date: new Date().toISOString(),
      formType: 'post',
      sessionId: sessionId,
      pse: parseInt(data.pse) || 7,
      satisfaction: parseInt(data.satisfaction) || 8,
      postPain: parseInt(data.postPain) || 1,
      painRegion: data.painRegion || '',
      painDescription: data.painDescription || '',
      notes: data.notes || '',
    };

    const studentIdRaw = window.location.hash.split('/form/post/')[1] || '';
    const query = studentIdRaw.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const tIdUrl = params.get('t');

    const student = await db.get('students', session.studentId).catch(()=>null);
    const tId = tIdUrl || (student ? (student.trainerId || student.trainer_id) : null);
    
    if (tId) {
      bfData.trainerId = tId;
      bfData.trainer_id = tId;
    }

    const isPublic = !!tIdUrl;
    try {
      if (tId) {
        const { getSupabase } = await import('../utils/auth.js');
        const sb = getSupabase?.();
        if (sb) {
          await sb.from('biofeedback').insert([bfData]);
        } else if (!isPublic) {
          await db.add('biofeedback', bfData);
        }
      } else {
        await db.add('biofeedback', bfData);
      }
      localStorage.removeItem('draft_postStudentForm');
    } catch(err) {
      console.warn('Erro pós form supabase:', err);
      if (!isPublic) await db.add('biofeedback', bfData);
    }

    e.target.classList.add('hidden');
    document.getElementById('postSuccess')?.classList.remove('hidden');
  });
}
