// ========================================
// PERSONAL PRO — Biofeedback Page (v4)
// Design limpo · ACWR · Gráficos · Múltiplas regiões de dor · Excluir
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { analyzeBiofeedback, overallStatus, trainingRecommendation, PAIN_REGIONS } from '../utils/alerts.js';
import { sendWhatsApp, preFormMsg } from '../utils/whatsapp.js';

const ICON_DEL = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
const ICON_WA  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

function colorForVal(val, inverse) {
  if (val == null) return 'var(--text-muted)';
  if (inverse) return val >= 7 ? 'var(--danger)' : val >= 5 ? 'var(--warning)' : 'var(--success)';
  return val <= 3 ? 'var(--danger)' : val <= 5 ? 'var(--warning)' : 'var(--success)';
}

function computeWeeklyLoads(entries) {
  const weeks = {};
  entries.forEach(e => {
    if (!e.trainingLoad) return;
    const d = new Date(e.date);
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
    const key = ws.toISOString().slice(0, 10);
    weeks[key] = (weeks[key] || 0) + e.trainingLoad;
  });
  return Object.keys(weeks).sort().map(k => ({ week: k, load: weeks[k] }));
}

export async function renderBiofeedback() {
  const students = await db.getAll('students');
  const active   = students.filter(s => s.status === 'Ativo');
  const allBf    = await db.getAll('biofeedback');
  allBf.sort((a, b) => new Date(b.date) - new Date(a.date));

  const today     = new Date().toDateString();
  const todayBf   = allBf.filter(e => new Date(e.date).toDateString() === today);
  const recent30  = allBf.slice(0, 30);
  const avgSleep  = recent30.length ? (recent30.reduce((t,e)=>t+(e.sleep||0),0)/recent30.length).toFixed(1) : '-';
  const avgStress = recent30.length ? (recent30.reduce((t,e)=>t+(e.stress||0),0)/recent30.length).toFixed(1) : '-';
  const alerts    = [];
  todayBf.forEach(e => {
    const st = students.find(s => s.id === e.studentId);
    analyzeBiofeedback(e).forEach(a => alerts.push({ ...a, studentName: st?.name || '?' }));
  });

  return `
    <div class="page-header">
      <div><h1>Biofeedback &amp; Wellness</h1><p class="subtitle">Análise científica do bem-estar e prontidão para o treino</p></div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <select class="form-select" id="bfStudentFilter" style="min-width:200px">
          <option value="">Todos os alunos</option>
          ${active.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="addBfBtn">+ Registrar</button>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">HOJE</div>
        <div class="stat-value text-gradient">${todayBf.length}</div>
        <div class="stat-change">check-ins</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">SONO MÉDIO</div>
        <div class="stat-value" style="color:${parseFloat(avgSleep)<6?'var(--warning)':'var(--success)'}">${avgSleep}</div>
        <div class="stat-change">últimos 30 registros</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">ESTRESSE MÉDIO</div>
        <div class="stat-value" style="color:${parseFloat(avgStress)>=7?'var(--danger)':parseFloat(avgStress)>=5?'var(--warning)':'var(--success)'}">${avgStress}</div>
        <div class="stat-change">últimos 30 registros</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">ALERTAS HOJE</div>
        <div class="stat-value" style="color:${alerts.length>0?'var(--danger)':'var(--success)'}">${alerts.length}</div>
        <div class="stat-change">${alerts.length>0?'requerem atenção':'tudo bem'}</div>
      </div>
    </div>

    ${alerts.length ? `
    <div class="card mb-lg" style="border-left:3px solid var(--danger);background:rgba(239,68,68,0.03)">
      <div class="card-header">
        <span class="card-title" style="color:var(--danger)">Alertas de Hoje (${alerts.length})</span>
      </div>
      ${alerts.map(a => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color)">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--danger);margin-top:5px;flex-shrink:0"></div>
          <div>
            <strong>${a.studentName}</strong>
            <span style="color:var(--danger)"> — ${a.metric}: ${a.value}/10</span>
            <div class="text-xs text-muted mt-xs">${a.action}</div>
          </div>
        </div>`).join('')}
    </div>` : ''}

    <div id="bfContent">${renderBfContent(allBf, students, '')}</div>
  `;
}

function renderBfContent(entries, students, filterStudentId) {
  const filtered = filterStudentId ? entries.filter(e => e.studentId === filterStudentId) : entries;
  const sorted   = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent   = sorted.slice(0, 30);
  const student  = filterStudentId ? students.find(s => s.id === filterStudentId) : null;

  // ACWR
  let acwrSection = '';
  if (student && filtered.length >= 2) {
    const weeklyLoads = computeWeeklyLoads(filtered);
    const currentLoad = weeklyLoads[weeklyLoads.length - 1]?.load || 0;
    const chronic4    = weeklyLoads.slice(-5, -1).map(w => w.load);
    const chronicAvg  = chronic4.length ? chronic4.reduce((a,b)=>a+b,0)/chronic4.length : 0;
    const acwr        = chronicAvg > 0 ? Calc.acwr(currentLoad, chronicAvg) : 0;
    const cls         = Calc.acwrClassificacao(acwr);

    acwrSection = `
      <div class="card mb-lg">
        <div class="card-header"><span class="card-title">ACWR — Carga Aguda:Crônica (${student.name})</span></div>
        <p class="text-xs text-muted mb-md">Ratio ideal entre 0.8 e 1.3. Abaixo = possível destreino, acima = risco de lesão.</p>
        <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">
          <div class="stat-card" style="text-align:center;padding:10px">
            <div class="stat-label">Carga Aguda (7d)</div>
            <div class="stat-value" style="font-size:1.3rem">${currentLoad}</div>
          </div>
          <div class="stat-card" style="text-align:center;padding:10px">
            <div class="stat-label">Carga Crônica (28d)</div>
            <div class="stat-value" style="font-size:1.3rem">${Math.round(chronicAvg)}</div>
          </div>
          <div class="stat-card" style="text-align:center;padding:10px">
            <div class="stat-label">ACWR</div>
            <div class="stat-value" style="font-size:1.3rem;color:var(--${cls.color})">${acwr.toFixed(2)}</div>
          </div>
          <div class="stat-card" style="text-align:center;padding:10px">
            <div class="stat-label">Status</div>
            <div style="font-size:0.9rem;font-weight:700;color:var(--${cls.color});margin-top:4px">${cls.label}</div>
          </div>
        </div>
        <div style="position:relative;height:18px;background:linear-gradient(to right,#3b82f6 0%,#22c55e 25%,#22c55e 44%,#f97316 62%,#ef4444 100%);border-radius:9px;margin-bottom:6px">
          ${acwr > 0 ? `<div style="position:absolute;top:-5px;left:${Math.min(97,Math.max(1,(acwr/2)*100))}%;transform:translateX(-50%);width:12px;height:28px;background:white;border-radius:4px;border:2px solid #1e293b;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>` : ''}
        </div>
        <div class="flex justify-between text-xs text-muted mb-md">
          <span>0</span><span style="color:#3b82f6">Destreino</span><span style="color:#22c55e">Ideal 0.8–1.3</span><span style="color:#ef4444">Risco</span><span>2+</span>
        </div>
        ${weeklyLoads.length >= 2 ? `<div style="height:110px"><canvas id="acwrChart"></canvas></div>` : ''}
      </div>`;
  }

  return `
    ${acwrSection}
    <div class="card">
      <div class="card-header">
        <span class="card-title">Registros ${student ? `— ${student.name}` : ''}</span>
        <span class="text-xs text-muted">${recent.length}/${filtered.length}</span>
      </div>
      ${recent.length ? `
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>Data</th>
            ${!student ? '<th>Aluno</th>' : ''}
            <th>Sono</th><th>Disp.</th><th>Energ.</th><th>Estresse</th><th>Dor</th>
            <th>PSE</th><th>Carga</th><th>Status</th><th>Recomendação</th><th></th>
          </tr></thead>
          <tbody>${recent.map(e => {
            const st     = students.find(s => s.id === e.studentId);
            const status = overallStatus(e);
            const rec    = trainingRecommendation(e);
            const painLabel = Array.isArray(e.painRegions) && e.painRegions.length > 0
              ? e.painRegions.slice(0,2).join(', ') + (e.painRegions.length > 2 ? ` +${e.painRegions.length-2}` : '')
              : e.painRegion || '';
            return `<tr>
              <td style="font-size:0.8rem;white-space:nowrap">${Calc.formatDate(e.date)}</td>
              ${!student ? `<td>
                <div class="flex items-center gap-sm">
                  <div class="avatar avatar-sm" style="width:22px;height:22px;font-size:0.6rem">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                  <span style="font-size:0.82rem">${st?.name||'?'}</span>
                </div>
              </td>` : ''}
              <td style="font-weight:600;color:${colorForVal(e.sleep,false)}">${e.sleep||'-'}</td>
              <td style="color:${colorForVal(e.mood,false)}">${e.mood||'-'}</td>
              <td style="color:${colorForVal(e.energy,false)}">${e.energy||'-'}</td>
              <td style="font-weight:600;color:${colorForVal(e.stress,true)}">${e.stress||'-'}</td>
              <td style="color:${colorForVal(e.pain,true)}">
                ${e.pain||'-'}
                ${painLabel ? `<div style="font-size:0.62rem;color:var(--warning);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${painLabel}</div>` : ''}
              </td>
              <td><strong style="color:${(e.pse||0)>8?'var(--danger)':(e.pse||0)>6?'var(--warning)':'var(--success)'}">${e.pse||'-'}</strong></td>
              <td style="font-size:0.8rem">${e.trainingLoad||'-'}</td>
              <td><span class="badge badge-${status.color}" style="font-size:0.7rem">${status.label}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${rec.label}</td>
              <td>
                <div style="display:flex;gap:3px">
                  ${st?.phone ? `<button class="btn btn-ghost btn-sm wa-bf" data-student="${e.studentId}" title="WhatsApp" style="padding:4px 5px;color:#25d366">${ICON_WA}</button>` : ''}
                  <button class="btn btn-ghost btn-sm delete-bf" data-id="${e.id}" title="Excluir" style="padding:4px 5px;color:var(--danger)">${ICON_DEL}</button>
                </div>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      ${filtered.length >= 3 ? `
      <div style="margin-top:16px;border-top:1px solid var(--border-color);padding-top:12px">
        <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Tendência — últimas ${Math.min(filtered.length,14)} entradas</div>
        <div style="height:140px"><canvas id="bfTrendChart"></canvas></div>
      </div>` : ''}
      ` : `<div class="empty-state" style="padding:40px"><p class="text-muted">Nenhum registro ainda</p></div>`}
    </div>`;
}

export function initBiofeedback(navigateFn) {
  document.getElementById('bfStudentFilter')?.addEventListener('change', async (e) => {
    const sid      = e.target.value;
    const students = await db.getAll('students');
    const allBf    = (await db.getAll('biofeedback')).sort((a,b) => new Date(b.date)-new Date(a.date));
    const el       = document.getElementById('bfContent');
    if (el) {
      el.innerHTML = renderBfContent(allBf, students, sid);
      setTimeout(() => {
        initBfCharts(allBf, students, sid);
        bindBfActions(navigateFn, students);
      }, 100);
    }
  });

  bindBfActions(navigateFn, null);
  setTimeout(() => initBfCharts(null, null, null), 300);

  document.getElementById('addBfBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    openModal({
      title: '+ Registrar Biofeedback', size: 'lg',
      content: `<form id="bfForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Aluno *</label>
            <select class="form-select" name="studentId" required>
              <option value="">Selecione</option>
              ${students.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Data</label>
            <input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0,10)}" />
          </div>
        </div>
        ${[
          { id:'sleep',  label:'Como dormiu?',              hint:'1 = muito mal · 10 = muito bem',        inv:false },
          { id:'mood',   label:'Como está sua disposição?', hint:'1 = péssima · 10 = excelente',         inv:false },
          { id:'energy', label:'Nível de energia agora?',   hint:'1 = exausto · 10 = energizado',        inv:false },
          { id:'stress', label:'Nível de estresse?',        hint:'1 = relaxado · 10 = muito estressado', inv:true,  },
          { id:'pain',   label:'Sente alguma dor?',         hint:'1 = nenhuma · 10 = dor intensa',       inv:true,
            extra:`document.getElementById('painGrp').style.display=this.value>=3?'block':'none'` },
        ].map(f=>`
          <div class="form-group" style="margin-bottom:14px">
            <div class="flex items-center justify-between mb-xs">
              <label class="form-label" style="margin:0">${f.label}</label>
              <span style="font-size:1.2rem;font-weight:800;color:var(--primary)" id="bfV_${f.id}">5</span>
            </div>
            <input type="range" name="${f.id}" min="1" max="10" value="5"
              style="width:100%;accent-color:var(--primary)"
              oninput="document.getElementById('bfV_${f.id}').textContent=this.value;${f.extra||''}" />
            <div class="flex justify-between text-xs text-muted mt-xs">
              <span>${f.hint.split('·')[0].trim()}</span>
              <span>${f.hint.split('·')[1]?.trim()||''}</span>
            </div>
          </div>`).join('')}
        <div id="painGrp" style="display:none;margin-bottom:14px">
          <label class="form-label">Locais de dor <span class="text-muted text-xs">(pode marcar mais de um)</span></label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
            ${PAIN_REGIONS.map(r=>`
              <label class="pain-chip" style="
                display:flex;align-items:center;gap:4px;padding:4px 10px;
                border:1px solid var(--border-color);border-radius:20px;
                cursor:pointer;font-size:0.78rem;transition:all 0.15s">
                <input type="checkbox" name="painRegions" value="${r.id}" style="display:none" />
                ${r.label}
              </label>`).join('')}
          </div>
          <div class="form-group mt-sm">
            <input class="form-input" name="painDescription" placeholder="Descrição da dor (opcional)..." />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">PSE — Esforço percebido no treino</label>
            <div class="flex items-center gap-sm">
              <input type="range" name="pse" min="1" max="10" value="7"
                style="flex:1;accent-color:var(--primary)"
                oninput="document.getElementById('bfVpse').textContent=this.value" />
              <span id="bfVpse" style="font-weight:800;color:var(--primary);min-width:20px">7</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Duração do treino (min)</label>
            <input class="form-input" name="duration" type="number" value="60" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-textarea" name="notes" rows="2" placeholder="Notas sobre o treino ou bem-estar..."></textarea>
        </div>
      </form>`,
      actions: [
        { label:'Cancelar', class:'btn-secondary', onClick:()=>closeModal() },
        { label:'Salvar', class:'btn-primary', onClick: async () => {
          const fd = new FormData(document.getElementById('bfForm'));
          const d  = Object.fromEntries(fd);
          if (!d.studentId) { notify.error('Selecione o aluno'); return; }
          ['sleep','mood','energy','stress','pain','pse','duration'].forEach(k=>d[k]=parseInt(d[k])||0);
          d.painRegions  = fd.getAll('painRegions');
          d.trainingLoad = Calc.cargaTreino(d.pse, d.duration);
          d.date         = d.date || new Date().toISOString().slice(0,10);
          await db.add('biofeedback', d);
          const alerts = analyzeBiofeedback(d);
          if (alerts.length) {
            const st = students.find(s=>s.id===d.studentId);
            notify.warning(`${st?.name}: ${alerts.map(a=>a.metric).join(', ')} requerem atenção`);
          }
          closeModal();
          notify.success('Biofeedback registrado!');
          navigateFn('/biofeedback');
        }}
      ]
    });

    setTimeout(() => {
      document.querySelectorAll('.pain-chip').forEach(tag => {
        tag.addEventListener('click', () => {
          const cb = tag.querySelector('input');
          if (!cb) return;
          cb.checked = !cb.checked;
          tag.style.borderColor = cb.checked ? 'var(--primary)' : '';
          tag.style.background  = cb.checked ? 'rgba(16,185,129,0.1)' : '';
          tag.style.color       = cb.checked ? 'var(--primary)' : '';
        });
      });
    }, 100);
  });
}

function bindBfActions(navigateFn, studentsCache) {
  document.querySelectorAll('.wa-bf').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sid = btn.dataset.student;
      const st  = studentsCache
        ? studentsCache.find(s=>s.id===sid)
        : await db.get('students', sid);
      if (!st?.phone) { notify.warning('Aluno sem telefone cadastrado'); return; }
      const url = `${location.origin}${location.pathname}#/form/pre/${st.id}`;
      sendWhatsApp(st.phone, preFormMsg(st.name.split(' ')[0], url));
    });
  });

  document.querySelectorAll('.delete-bf').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Excluir este registro de biofeedback?')) return;
      await db.delete('biofeedback', btn.dataset.id);
      notify.success('Registro excluído.');
      navigateFn('/biofeedback');
    });
  });
}

async function initBfCharts(allBfParam, studentsParam, filterSid) {
  if (typeof Chart === 'undefined') return;
  const allBf    = allBfParam    || await db.getAll('biofeedback');
  const students = studentsParam || await db.getAll('students');
  const filtered = filterSid ? allBf.filter(e=>e.studentId===filterSid) : allBf;
  const sorted   = [...filtered].sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-14);

  // Tendência
  const tc = document.getElementById('bfTrendChart');
  if (tc && sorted.length >= 3) {
    if (tc._chart) tc._chart.destroy();
    tc._chart = new Chart(tc, {
      type:'line',
      data:{
        labels: sorted.map(e=>Calc.formatDate(e.date).slice(0,5)),
        datasets:[
          { label:'Sono',       data:sorted.map(e=>e.sleep||null),  borderColor:'#6366f1', tension:0.3, pointRadius:3, borderWidth:1.5, fill:false },
          { label:'Disposição', data:sorted.map(e=>e.mood||null),   borderColor:'#10b981', tension:0.3, pointRadius:3, borderWidth:1.5, fill:false },
          { label:'Energia',    data:sorted.map(e=>e.energy||null), borderColor:'#f59e0b', tension:0.3, pointRadius:3, borderWidth:1.5, fill:false },
          { label:'Estresse',   data:sorted.map(e=>e.stress||null), borderColor:'#ef4444', tension:0.3, pointRadius:3, borderWidth:1.5, fill:false, borderDash:[4,2] },
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#94a3b8', font:{size:10}, boxWidth:12 } } },
        scales:{
          y:{ min:1, max:10, ticks:{ color:'#64748b', font:{size:9} }, grid:{ color:'rgba(148,163,184,0.07)' } },
          x:{ ticks:{ color:'#94a3b8', font:{size:9} }, grid:{ display:false } }
        }
      }
    });
  }

  // ACWR
  const ac = document.getElementById('acwrChart');
  if (ac && filterSid) {
    const weeklyLoads = computeWeeklyLoads(filtered);
    if (weeklyLoads.length >= 2) {
      if (ac._chart) ac._chart.destroy();
      ac._chart = new Chart(ac, {
        type:'bar',
        data:{
          labels: weeklyLoads.slice(-8).map(w=>w.week.slice(5)),
          datasets:[{
            label:'Carga Semanal',
            data: weeklyLoads.slice(-8).map(w=>w.load),
            backgroundColor: weeklyLoads.slice(-8).map((_,i,arr)=>
              i===arr.length-1 ? 'rgba(16,185,129,0.6)' : 'rgba(99,102,241,0.4)'),
            borderRadius:4,
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display:false } },
          scales:{
            y:{ ticks:{ color:'#64748b', font:{size:9} }, grid:{ color:'rgba(148,163,184,0.07)' } },
            x:{ ticks:{ color:'#94a3b8', font:{size:9} }, grid:{ display:false } }
          }
        }
      });
    }
  }
}
