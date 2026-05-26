// ========================================
// PERSONAL PRO — Assessments v3
// Clean · Força+Submax unificados · Ficha por aluno
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

const ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_DEL  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;

const RM_EXERCISES = [
  'Supino Reto com Barra','Agachamento Livre com Barra','Levantamento Terra',
  'Desenvolvimento com Barra','Puxada Frontal','Rosca Direta com Barra',
  'Leg Press 45°','Remada Curvada com Barra','Hip Thrust','Stiff com Barra',
];

const SUBMAX_STEPS = [
  { set:1, pct:50, reps:'10-12', desc:'Aquecimento leve — nunca falha' },
  { set:2, pct:65, reps:'6-8',   desc:'Aquecimento moderado' },
  { set:3, pct:80, reps:'3-5',   desc:'Série pesada — esforço real' },
  { set:4, pct:90, reps:'2-3',   desc:'Série muito pesada' },
  { set:5, pct:95, reps:'1-2',   desc:'Próximo do máximo (opcional)' },
];

function ini(name='') {
  return name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()||'?';
}

export function renderEnergyExpenditureCardHTML(students, compAss, filterSid) {
  const lastC = filterSid ? compAss.find(a=>a.studentId===filterSid) : compAss[0];
  if (!lastC || !lastC.peso) {
    return `
      <div class="card" style="border-left:3px solid var(--border-color)">
        <div class="card-header"><span class="card-title">Gasto Energético Estimado</span></div>
        <p class="text-sm text-muted">Selecione um aluno com avaliação de composição (peso + altura) para ver o cálculo.</p>
      </div>`;
  }
  const st    = students.find(s=>s.id===lastC.studentId);
  const age2  = st?.birthDate ? Calc.calcularIdade(st.birthDate) : (st?.age || 0);
  const sexo  = st?.gender || 'M';
  const objMap= {'Emagrecimento':'emagrecimento','Perda de peso':'emagrecimento','Hipertrofia':'hipertrofia','Ganho de massa':'hipertrofia','Manutenção':'manutencao','Saúde':'manutencao','Condicionamento':'manutencao'};
  const obj   = objMap[st?.goal] || 'manutencao';
  const tmb2  = age2 && lastC.peso ? Calc.tmb(lastC.peso, lastC.altura, age2, sexo, lastC.massaMagra) : null;
  if(!tmb2) {
    return `
      <div class="card" style="border-left:3px solid var(--border-color)">
        <div class="card-header"><span class="card-title">Gasto Energético Estimado</span></div>
        <p class="text-sm text-muted">Preencha data de nascimento ou idade no cadastro para calcular a TMB.</p>
      </div>`;
  }
  const tdee2 = Calc.tdee(tmb2.valor, 'moderado');
  const meta2 = Calc.metaCalorica(tdee2.valor, obj);
  const mac2  = Calc.macros(meta2.kcal, lastC.peso, obj);
  return `
    <div class="card" style="border-left:3px solid var(--primary)">
      <div class="card-header">
        <span class="card-title">Gasto Energético — ${st?.name||'Aluno'}</span>
        <span class="text-xs text-muted">${tmb2.formula}${lastC.massaMagra?' · Katch-McArdle':''}</span>
      </div>
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">TMB</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--text-secondary)">${tmb2.valor} <span style="font-size:0.75rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">${tmb2.formula}</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">TDEE</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--primary)">${tdee2.valor} <span style="font-size:0.75rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">×${tdee2.fator} (moderado)</div>
        </div>
        <div class="stat-card" style="text-align:center;padding:10px">
          <div class="stat-label">Meta (${st?.goal||'Manutenção'})</div>
          <div style="font-size:1.3rem;font-weight:800;color:${obj.includes('emagr')?'var(--warning)':obj.includes('hipert')?'var(--success)':'var(--accent)'}">${meta2.kcal} <span style="font-size:0.75rem">kcal</span></div>
          <div style="font-size:0.65rem;color:var(--text-muted)">${meta2.label}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[['Proteína',mac2.proteina,'#10b981'],['Carboidrato',mac2.carboidrato,'#f59e0b'],['Gordura',mac2.gordura,'#8b5cf6']].map(([n,m,c])=>`
          <div style="padding:10px 12px;background:var(--bg-page);border-radius:8px;border-left:3px solid ${c}">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">${n}</div>
            <div style="font-size:1.3rem;font-weight:700;color:${c}">${m.g}g</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${m.kcal} kcal · ${m.pct}%</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:10px;font-size:0.72rem;color:var(--text-muted)">
        Proteína: <strong>${mac2.protPorKg}g/kg</strong> (ISSN 2018) · Base: avaliação de ${Calc.formatDate(lastC.date)}
      </div>
    </div>`;
}

function rm1Zones(rm1) {
  return [
    {pct:100,reps:'1',    label:'Força Máxima',    color:'#ef4444'},
    {pct:90, reps:'3-4',  label:'Força',           color:'#f97316'},
    {pct:85, reps:'4-6',  label:'Força/Hipert.',   color:'#f97316'},
    {pct:80, reps:'6-8',  label:'Hipertrofia',     color:'#eab308'},
    {pct:75, reps:'8-10', label:'Hipertrofia',     color:'#eab308'},
    {pct:70, reps:'10-12',label:'Hipert./RML',     color:'#22c55e'},
    {pct:65, reps:'12-15',label:'Resistência',     color:'#22c55e'},
    {pct:60, reps:'15-20',label:'Resist.Musc.',    color:'#3b82f6'},
  ].map(z=>({...z, load: Math.round(rm1*(z.pct/100)*2)/2}));
}

// ── RENDER PRINCIPAL ─────────────────────────────────────────
export async function renderAssessments() {
  const students    = await db.getAll('students');
  let assessments = await db.getAll('assessments');
  const active      = students.filter(s=>s.status==='Ativo');

  // Remove avaliações órfãs (alunos deletados como o caso da "Vitória")
  const validAss = [];
  for (const a of assessments) {
    if (students.find(s => s.id === a.studentId)) {
      validAss.push(a);
    } else {
      console.log('Removendo avaliação órfã:', a.id);
      db.delete('assessments', a.id).catch(()=>{});
    }
  }
  assessments = validAss;

  assessments.sort((a,b)=>new Date(b.date)-new Date(a.date));

  const compAss  = assessments.filter(a=>a.type==='composicao');
  const forcaAss = assessments.filter(a=>a.type==='forca');
  const concAss  = assessments.filter(a=>a.type==='conconi');
  const avalAlu  = [...new Set(assessments.map(a=>a.studentId))].length;

  // PRs por exercício para o badge
  const prs = {};
  forcaAss.forEach(a=>{
    const key = `${a.studentId}::${a.exercise}`;
    if(!prs[key]||a.rm1>prs[key].rm1) prs[key]=a;
  });

  return `
    <div class="page-header">
      <div>
        <h1>Avaliações Físicas</h1>
        <p class="subtitle">${assessments.length} avaliação(ões) · ${avalAlu} aluno(s) avaliado(s)</p>
      </div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <select class="form-select" id="assStudentFilter" style="min-width:180px">
          <option value="">Todos os alunos</option>
          ${active.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="addAssessmentBtn">+ Nova Avaliação</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      ${[
        ['COMPOSIÇÃO', compAss.length,  'text-gradient', 'avaliações'],
        ['FORÇA / 1RM', forcaAss.length, 'warning',       'registros'],
        ['CONCONI / VO₂', concAss.length,'accent',        'testes'],
        ['ALUNOS',        avalAlu,       'primary',        'avaliados'],
      ].map(([l,v,c,s])=>`
        <div class="stat-card" style="text-align:center;padding:12px">
          <div class="stat-label">${l}</div>
          <div class="stat-value ${c.startsWith('text')?c:''}" ${!c.startsWith('text')?`style="color:var(--${c})"`:''}>${v}</div>
          <div class="stat-change">${s}</div>
        </div>`).join('')}
    </div>

    <!-- Tabs -->
    <div class="tabs" id="assessmentTypeTabs">
      <button class="tab active" data-type="composicao">Composição</button>
      <button class="tab" data-type="forca">Força &amp; 1RM</button>
      <button class="tab" data-type="conconi">Conconi / VO₂</button>
      <button class="tab" data-type="zonas">Zonas FC &amp; Carga</button>
      <button class="tab" data-type="evolucao">Evolução</button>
      <button class="tab" data-type="ficha">Ficha do Aluno</button>
    </div>

    <!-- ── COMPOSIÇÃO CORPORAL ── -->
    <div id="panel-composicao" class="assessment-panel">
      ${!compAss.length ? `
        <div class="empty-state">
          <div class="empty-icon">—</div>
          <h3>Nenhuma avaliação de composição</h3>
          <p>Clique em "+ Nova Avaliação" para registrar</p>
        </div>` : `
        <div class="card mb-lg">
          <div class="table-container">
            <table class="data-table">
              <thead><tr>
                <th>Aluno</th><th>Data</th><th>Peso</th><th>Altura</th><th>IMC</th>
                <th>% Gordura</th><th>M. Magra</th><th>M. Musc. Esq.</th><th>Cintura</th><th>RCQ</th><th></th>
              </tr></thead>
              <tbody>
                ${compAss.map(a=>{
                  const st   = students.find(s=>s.id===a.studentId);
                  const imc  = a.peso&&a.altura?Calc.imc(a.peso,a.altura):null;
                  const imcC = imc?Calc.imcClassificacao(imc):null;
                  const pctColor = (a.percentualGordura||0)>25?'var(--warning)':'var(--success)';
                  return `<tr data-student="${a.studentId}">
                    <td>
                      <div class="flex items-center gap-sm">
                        <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${ini(st?.name)}</div>
                        <span style="font-size:0.85rem">${st?.name||'?'}</span>
                      </div>
                    </td>
                    <td style="font-size:0.82rem;white-space:nowrap">${Calc.formatDate(a.date)}</td>
                    <td><strong>${a.peso?a.peso+'kg':'—'}</strong></td>
                    <td>${a.altura?a.altura+'cm':'—'}</td>
                    <td>${imc?`<span class="badge badge-${imcC.color}" title="${imcC.label}">${Calc.formatNum(imc)}</span>`:'—'}</td>
                    <td style="color:${pctColor};font-weight:600">${a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'—'}</td>
                    <td style="color:var(--primary);font-weight:600">${a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'—'}</td>
                    <td style="color:var(--accent);font-weight:600">${a.pctMassaMuscular?Calc.formatNum(a.pctMassaMuscular)+'%':'—'}</td>
                    <td>${a.cintura?a.cintura+'cm':'—'}</td>
                    <td>${a.rcq?Calc.formatNum(a.rcq,2):'—'}</td>
                    <td>
                      <div style="display:flex;gap:4px">
                        <button class="btn btn-ghost btn-sm view-assessment" data-id="${a.id}" style="padding:4px 6px;color:var(--accent)">${ICON_EYE}</button>
                        <button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cálculo de Calorias por aluno (usa avaliação mais recente) -->
        <div id="assEnergyCardContainer" style="display:none">
          ${renderEnergyExpenditureCardHTML(students, compAss, '')}
        </div>
      `}
    </div>

    <!-- ── FORÇA & 1RM SUBMAX (unificado) ── -->
    <div id="panel-forca" class="assessment-panel" style="display:none">
      <div class="grid-2">

        <!-- Protocolo Submax -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Protocolo 1RM Submax</span>
            <span class="badge badge-success" style="font-size:0.68rem">Seguro</span>
          </div>
          <p class="text-xs text-muted mb-md" style="line-height:1.6">
            Estimativa do 1RM sem chegar ao máximo. Registre carga e reps de cada série — o sistema calcula automaticamente.
          </p>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Aluno</label>
              <select class="form-select" id="rm1protStudent">
                <option value="">Selecione</option>
                ${active.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fórmula</label>
              <select class="form-select" id="rm1protFormula">
                <option value="epley">Epley (padrão)</option>
                <option value="brzycki">Brzycki</option>
                <option value="lander">Lander</option>
                <option value="lombardi">Lombardi</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Exercício</label>
            <input class="form-input" id="rm1protExercise" list="rm1ExList" placeholder="Ex: Supino Reto com Barra" />
            <datalist id="rm1ExList">${RM_EXERCISES.map(e=>`<option value="${e}">`).join('')}</datalist>
          </div>

          <!-- Séries progressivas -->
          <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:4px">
            <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Séries</div>
            ${SUBMAX_STEPS.map((s,i)=>`
              <div style="display:grid;grid-template-columns:28px 1fr 76px 76px 52px;gap:6px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border-color)">
                <div style="width:26px;height:26px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.75rem;flex-shrink:0">${s.set}</div>
                <div>
                  <div style="font-size:0.75rem;font-weight:600">~${s.pct}% · ${s.reps}</div>
                  <div style="font-size:0.65rem;color:var(--text-muted)">${s.desc}</div>
                </div>
                <input class="form-input rm1-carga" data-set="${i}" type="number" step="0.5" placeholder="kg"
                  style="text-align:center;font-size:0.82rem;padding:4px 6px" />
                <input class="form-input rm1-reps" data-set="${i}" type="number" min="1" max="20" placeholder="reps"
                  style="text-align:center;font-size:0.82rem;padding:4px 6px" />
                <span class="rm1-result" data-set="${i}" style="font-size:0.78rem;color:var(--primary);font-weight:700;text-align:center">—</span>
              </div>`).join('')}
          </div>

          <!-- Resultado -->
          <div style="margin-top:14px;padding:14px;background:rgba(16,185,129,0.08);border-radius:10px;border:1px solid rgba(16,185,129,0.2)">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Melhor estimativa de 1RM</div>
            <div id="rm1protResult" style="font-size:2.2rem;font-weight:800;color:var(--primary);line-height:1">—</div>
            <div id="rm1protSource" class="text-xs text-muted mt-xs">Preencha as séries acima</div>
          </div>
          <button class="btn btn-primary mt-md" id="saveRM1Prot" style="width:100%">Salvar 1RM Estimado</button>
        </div>

        <!-- Histórico de força -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Histórico de Força</span>
            <span class="text-xs text-muted">${forcaAss.length} registro(s)</span>
          </div>
          ${!forcaAss.length ? `
            <div class="empty-state" style="padding:32px 0">
              <p class="text-muted text-sm">Nenhum registro de força ainda</p>
            </div>` : `
            <div class="table-container">
              <table class="data-table" style="font-size:0.82rem">
                <thead><tr>
                  <th>Aluno</th><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM</th><th></th>
                </tr></thead>
                <tbody>
                  ${forcaAss.map(a=>{
                    const st  = students.find(s=>s.id===a.studentId);
                    const key = `${a.studentId}::${a.exercise}`;
                    const isPR= prs[key]?.id===a.id && a.rm1;
                    return `<tr data-student="${a.studentId}">
                      <td>
                        <div class="flex items-center gap-sm">
                          <div class="avatar avatar-sm" style="width:22px;height:22px;font-size:0.6rem">${ini(st?.name)}</div>
                          <span>${st?.name||'?'}</span>
                        </div>
                      </td>
                      <td style="white-space:nowrap">${Calc.formatDate(a.date)}</td>
                      <td style="font-weight:600">${a.exercise||'—'}</td>
                      <td>${a.carga?a.carga+'kg':'—'}</td>
                      <td>${a.reps||'—'}</td>
                      <td>
                        <span style="color:var(--primary);font-weight:700">${a.rm1?a.rm1+'kg':'—'}</span>
                        ${isPR?`<span style="color:#fbbf24;font-size:0.7rem;font-weight:700;margin-left:3px">★PR</span>`:''}
                      </td>
                      <td style="display:flex;gap:3px">
                        <button class="btn btn-ghost btn-sm view-rm1" data-id="${a.id}" style="padding:4px 5px;color:var(--accent)">${ICON_EYE}</button>
                        <button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" style="padding:4px 5px;color:var(--danger)">${ICON_DEL}</button>
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    </div>

    <!-- ── CONCONI / VO₂MAX ── -->
    <div id="panel-conconi" class="assessment-panel" style="display:none">
      ${!concAss.length ? `
        <div class="empty-state">
          <div class="empty-icon">—</div>
          <h3>Nenhum teste Conconi registrado</h3>
          <p>Registre testes de limiar anaeróbio e VO₂max</p>
        </div>` : `
        <div class="card">
          <div class="table-container">
            <table class="data-table">
              <thead><tr>
                <th>Aluno</th><th>Data</th><th>FC Pico</th><th>VMA</th><th>VO₂max</th><th>FC Limiar</th><th>Limiar 2</th><th></th>
              </tr></thead>
              <tbody>
                ${concAss.map(a=>{
                  const st=students.find(s=>s.id===a.studentId);
                  return `<tr data-student="${a.studentId}">
                    <td>
                      <div class="flex items-center gap-sm">
                        <div class="avatar avatar-sm" style="width:22px;height:22px;font-size:0.6rem">${ini(st?.name)}</div>
                        <span style="font-size:0.85rem">${st?.name||'?'}</span>
                      </div>
                    </td>
                    <td style="font-size:0.82rem;white-space:nowrap">${Calc.formatDate(a.date)}</td>
                    <td style="color:var(--danger);font-weight:600">${a.fcPico?a.fcPico+' bpm':'—'}</td>
                    <td style="color:var(--primary);font-weight:600">${a.vma?a.vma+' km/h':'—'}</td>
                    <td style="color:var(--accent);font-weight:700">${a.vo2max?Calc.formatNum(a.vo2max)+' ml/kg/min':'—'}</td>
                    <td>${a.fcLimiar?a.fcLimiar+' bpm':'—'}</td>
                    <td>${a.limiar2?a.limiar2+' km/h':'—'}</td>
                    <td>
                      <button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" style="padding:4px 5px;color:var(--danger)">${ICON_DEL}</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`}
    </div>

    <!-- ── ZONAS FC & CARGA ── -->
    <div id="panel-zonas" class="assessment-panel" style="display:none">
      <div class="grid-2">
        <!-- Zonas de FC -->
        <div class="card">
          <div class="card-header"><span class="card-title">Zonas de FC — Karvonen</span></div>
          <p class="text-xs text-muted mb-md">Selecione um aluno ou preencha manualmente</p>
          <div class="form-group">
            <label class="form-label">Aluno (opcional)</label>
            <select class="form-select" id="zonaStudentSel">
              <option value="">Preencher manualmente</option>
              ${active.map(s=>`<option value="${s.id}" data-birth="${s.birthDate||''}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Idade</label>
              <input class="form-input" id="zonaIdade" type="number" placeholder="Ex: 30" />
            </div>
            <div class="form-group">
              <label class="form-label">FC Repouso (bpm)</label>
              <input class="form-input" id="zonaFcRep" type="number" placeholder="Ex: 65" />
            </div>
          </div>
          <button class="btn btn-primary" id="calcZonas" style="width:100%">Calcular Zonas</button>
          <div id="zonasResult" class="mt-md"></div>
        </div>

        <!-- Zonas por 1RM -->
        <div class="card">
          <div class="card-header"><span class="card-title">Zonas por 1RM</span></div>
          <p class="text-xs text-muted mb-md">Calcule as cargas de treino a partir do 1RM estimado</p>
          <div class="form-group">
            <label class="form-label">Exercício</label>
            <select class="form-select" id="rm1ExSel">
              <option value="">Selecione</option>
              ${RM_EXERCISES.map(e=>`<option>${e}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Aluno (carrega último 1RM)</label>
            <select class="form-select" id="rm1StudentSel">
              <option value="">Preencher manualmente</option>
              ${active.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">1RM (kg)</label>
            <input class="form-input" id="rm1Value" type="number" step="0.5" placeholder="Ex: 100" />
          </div>
          <button class="btn btn-primary" id="calcRM1Zones" style="width:100%">Calcular Zonas de Carga</button>
          <div id="rm1ZonesResult" class="mt-md"></div>
        </div>
      </div>
    </div>

    <!-- ── EVOLUÇÃO ── -->
    <div id="panel-evolucao" class="assessment-panel" style="display:none">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Evolução por Aluno</span>
          <select class="form-select" id="evolStudentSel" style="width:auto;min-width:200px">
            <option value="">Selecione um aluno</option>
            ${active.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div id="evolucaoContent">
          <div style="padding:40px;text-align:center;color:var(--text-muted)">Selecione um aluno para ver a evolução</div>
        </div>
      </div>
    </div>

    <!-- ── FICHA COMPLETA ── -->
    <div id="panel-ficha" class="assessment-panel" style="display:none">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Ficha Completa</span>
          <div class="flex gap-sm">
            <select class="form-select" id="fichaStudentSel" style="width:auto;min-width:200px">
              <option value="">Selecione um aluno</option>
              ${active.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" id="fichaExportBtn" style="display:none">Gerar PDF</button>
          </div>
        </div>
        <div id="fichaContent">
          <div style="padding:40px;text-align:center;color:var(--text-muted)">Selecione um aluno para ver a ficha completa</div>
        </div>
      </div>
    </div>
  `;
}

// ── INIT ─────────────────────────────────────────────────────
export function initAssessments(navigateFn) {

  // Tabs
  document.querySelectorAll('#assessmentTypeTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#assessmentTypeTabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.assessment-panel').forEach(p=>p.style.display='none');
      document.getElementById(`panel-${tab.dataset.type}`)?.style.setProperty('display','');
    });
  });

  // Filtro por aluno
  document.getElementById('assStudentFilter')?.addEventListener('change', async e=>{
    const sid = e.target.value;
    document.querySelectorAll('.assessment-panel table tbody tr').forEach(row=>{
      row.style.display = !sid||row.dataset.student===sid||!row.dataset.student?'':'none';
    });
    
    // Update Energy Card Container dynamically!
    const container = document.getElementById('assEnergyCardContainer');
    if (container) {
      if (sid) {
        container.style.display = 'block';
        const [all, students] = await Promise.all([db.getAll('assessments'), db.getAll('students')]);
        const compAss = all.filter(a => a.type === 'composicao').sort((a,b)=>new Date(b.date)-new Date(a.date));
        container.innerHTML = renderEnergyExpenditureCardHTML(students, compAss, sid);
      } else {
        container.style.display = 'none';
      }
    }
  });

  // ── BOTÃO + Nova Avaliação ─────────────────────────────────
  document.getElementById('addAssessmentBtn')?.addEventListener('click', async ()=>{
    const students = (await db.getAll('students')).filter(s=>s.status==='Ativo');
    openModal({
      title: '+ Nova Avaliação', size: 'md',
      content: `
        <div class="form-group">
          <label class="form-label">Tipo de Avaliação</label>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              ['composicao','Composição Corporal','Peso, dobras, circunferências, IMC, % gordura'],
              ['forca',     'Força / 1RM Submax',  'Protocolo progressivo de estimativa do 1RM'],
              ['conconi',   'Conconi / VO₂max',    'FC pico, VMA, limiar anaeróbio'],
            ].map(([id,label,desc])=>`
              <label style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;transition:all 0.15s" class="aval-type-opt">
                <input type="radio" name="avalType" value="${id}" style="flex-shrink:0" />
                <div>
                  <div style="font-weight:600;font-size:0.88rem">${label}</div>
                  <div class="text-xs text-muted">${desc}</div>
                </div>
              </label>`).join('')}
          </div>
        </div>`,
      actions:[
        { label:'Cancelar', class:'btn-secondary', onClick:()=>closeModal() },
        { label:'Continuar →', class:'btn-primary', onClick:()=>{
          const tipo = document.querySelector('[name="avalType"]:checked')?.value;
          if(!tipo){ notify.warning('Selecione o tipo de avaliação'); return; }
          closeModal();
          setTimeout(()=>openAssessmentForm(tipo, students, navigateFn), 100);
        }}
      ]
    });
    // Highlight ao selecionar
    setTimeout(()=>{
      document.querySelectorAll('.aval-type-opt').forEach(opt=>{
        opt.addEventListener('click',()=>{
          document.querySelectorAll('.aval-type-opt').forEach(o=>{o.style.borderColor='';o.style.background='';});
          opt.style.borderColor='var(--primary)';
          opt.style.background='rgba(16,185,129,0.06)';
        });
      });
    },50);
  });

  // ── PROTOCOLO 1RM SUBMAX — preview em tempo real ───────────
  document.querySelectorAll('.rm1-carga, .rm1-reps').forEach(inp=>{
    inp.addEventListener('input',()=>{
      updateRM1Preview(inp.dataset.set);
      updateRM1Best();
    });
  });
  document.getElementById('rm1protFormula')?.addEventListener('change',()=>{
    for(let i=0;i<5;i++) updateRM1Preview(i);
    updateRM1Best();
  });

  document.getElementById('saveRM1Prot')?.addEventListener('click', async()=>{
    const sid  = document.getElementById('rm1protStudent')?.value;
    const ex   = document.getElementById('rm1protExercise')?.value?.trim();
    const form = document.getElementById('rm1protFormula')?.value||'epley';
    if(!sid){ notify.error('Selecione o aluno'); return; }
    if(!ex) { notify.error('Informe o exercício'); return; }
    const series=[];
    for(let i=0;i<5;i++){
      const carga=parseFloat(document.querySelector(`.rm1-carga[data-set="${i}"]`)?.value);
      const reps =parseInt(document.querySelector(`.rm1-reps[data-set="${i}"]`)?.value);
      if(carga&&reps) series.push({carga,reps,formula:form});
    }
    if(!series.length){ notify.error('Registre ao menos uma série'); return; }
    const best = Calc.melhorEstimativa1RM(series);
    if(!best?.rm1){ notify.error('Não foi possível calcular o 1RM'); return; }
    const all  = await db.getAll('assessments');
    const prev = all.filter(a=>a.studentId===sid&&a.exercise===ex&&a.rm1).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const isPR = !prev.length||best.rm1>prev[0].rm1;
    await db.add('assessments',{
      studentId:sid, type:'forca', exercise:ex, carga:best.carga, reps:best.reps,
      rm1:best.rm1, formula:form, series, protocolo:'submax', isPR,
      date:new Date().toISOString().slice(0,10),
    });
    notify.success(`1RM ${isPR?'🏆 PR! ':''}Estimado: ${best.rm1}kg salvo!`);
    navigateFn('/avaliacoes');
  });

  // ── ZONAS DE FC ────────────────────────────────────────────
  document.getElementById('zonaStudentSel')?.addEventListener('change', e=>{
    const birth = e.target.selectedOptions[0]?.dataset.birth;
    if(birth){ const el=document.getElementById('zonaIdade'); if(el) el.value=Calc.calcularIdade(birth); }
  });

  document.getElementById('calcZonas')?.addEventListener('click', ()=>{
    const idade = parseInt(document.getElementById('zonaIdade')?.value);
    const fcRep = parseInt(document.getElementById('zonaFcRep')?.value);
    if(!idade||!fcRep){ notify.warning('Preencha idade e FC repouso'); return; }
    const fcMax = Calc.fcMax(idade);
    const zonas = Calc.zonasTreino(fcMax, fcRep);
    document.getElementById('zonasResult').innerHTML = `
      <div style="display:flex;gap:16px;margin-bottom:12px;padding:10px 14px;background:var(--bg-page);border-radius:8px">
        <div><div class="text-xs text-muted">FC Máxima (Tanaka)</div><div style="font-size:1.4rem;font-weight:800;color:var(--danger)">${fcMax}<span style="font-size:0.8rem;font-weight:400"> bpm</span></div></div>
        <div><div class="text-xs text-muted">FC Reserva</div><div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${fcMax-fcRep}<span style="font-size:0.8rem;font-weight:400"> bpm</span></div></div>
      </div>
      <table class="data-table" style="font-size:0.82rem">
        <thead><tr><th>Zona</th><th>Nome</th><th>FC Mín</th><th>FC Máx</th><th>Objetivo</th></tr></thead>
        <tbody>${zonas.map(z=>`<tr>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${z.cor};margin-right:6px;vertical-align:middle"></span><strong>Z${z.zona}</strong></td>
          <td>${z.nome}</td>
          <td style="color:${z.cor};font-weight:600">${z.fcMin}</td>
          <td style="color:${z.cor};font-weight:600">${z.fcMax}</td>
          <td class="text-xs text-muted">${z.objetivo||'—'}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  });

  // ── ZONAS POR 1RM ──────────────────────────────────────────
  document.getElementById('rm1StudentSel')?.addEventListener('change', async e=>{
    const sid = e.target.value;
    const ex  = document.getElementById('rm1ExSel')?.value;
    if(!sid||!ex) return;
    const all  = await db.getAll('assessments');
    const last = all.filter(a=>a.studentId===sid&&a.exercise===ex&&a.rm1).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    if(last){ const el=document.getElementById('rm1Value'); if(el){ el.value=last.rm1; notify.info(`Último 1RM de ${ex}: ${last.rm1}kg`); } }
  });

  document.getElementById('calcRM1Zones')?.addEventListener('click', ()=>{
    const rm1 = parseFloat(document.getElementById('rm1Value')?.value);
    const ex  = document.getElementById('rm1ExSel')?.value||'Exercício';
    if(!rm1){ notify.warning('Informe o 1RM'); return; }
    const zones = rm1Zones(rm1);
    document.getElementById('rm1ZonesResult').innerHTML = `
      <div style="padding:10px 14px;background:var(--bg-page);border-radius:8px;margin-bottom:10px">
        <div class="text-xs text-muted">${ex}</div>
        <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${rm1}kg <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted)">1RM</span></div>
      </div>
      <table class="data-table" style="font-size:0.82rem">
        <thead><tr><th>%1RM</th><th>Carga</th><th>Reps</th><th>Objetivo</th></tr></thead>
        <tbody>${zones.map(z=>`<tr>
          <td style="color:${z.color};font-weight:700">${z.pct}%</td>
          <td style="color:${z.color};font-weight:700">${z.load}kg</td>
          <td>${z.reps}</td>
          <td class="text-xs text-muted">${z.label}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  });

  // ── EVOLUÇÃO ───────────────────────────────────────────────
  document.getElementById('evolStudentSel')?.addEventListener('change', async e=>{
    const sid = e.target.value;
    const el  = document.getElementById('evolucaoContent');
    if(!el||!sid){ if(el) el.innerHTML='<div style="padding:40px;text-align:center;color:var(--text-muted)">Selecione um aluno</div>'; return; }

    const [all, students] = await Promise.all([db.getAll('assessments'), db.getAll('students')]);
    const sAss = all.filter(a=>a.studentId===sid).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const comp = sAss.filter(a=>a.type==='composicao');
    const forca= sAss.filter(a=>a.type==='forca');

    if(!sAss.length){ el.innerHTML='<div style="padding:40px;text-align:center;color:var(--text-muted)">Nenhuma avaliação para este aluno</div>'; return; }

    el.innerHTML = `
      ${comp.length>=2?`
      <div style="margin-bottom:20px">
        <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Composição Corporal</div>
        <div class="table-container">
          <table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Data</th><th>Peso</th><th>% Gordura</th><th>M. Magra</th><th>IMC</th><th>Cintura</th><th>Δ Peso</th></tr></thead>
            <tbody>${comp.map((a,i)=>{
              const prev=comp[i-1];
              const dp=prev&&a.peso&&prev.peso?(a.peso-prev.peso):null;
              const imc=a.peso&&a.altura?Calc.imc(a.peso,a.altura):null;
              return `<tr>
                <td style="font-size:0.78rem;white-space:nowrap">${Calc.formatDate(a.date)}</td>
                <td style="font-weight:600">${a.peso?a.peso+'kg':'—'}</td>
                <td style="color:${(a.percentualGordura||0)>25?'var(--warning)':'var(--success)'}">${a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'—'}</td>
                <td style="color:var(--primary);font-weight:600">${a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'—'}</td>
                <td>${imc?Calc.formatNum(imc):'—'}</td>
                <td>${a.cintura?a.cintura+'cm':'—'}</td>
                <td style="font-weight:600;color:${dp===null?'inherit':dp<0?'var(--success)':'var(--danger)'}">
                  ${dp===null?'—':(dp>0?'+':'')+Calc.formatNum(dp)+'kg'}
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div style="height:160px;margin-top:12px"><canvas id="evolPesoChart"></canvas></div>
      </div>`:
      comp.length===1?'<p class="text-xs text-muted" style="padding:8px 0">Apenas 1 avaliação de composição — gráfico disponível a partir de 2.</p>':''
      }
      ${forca.length?`
      <div style="border-top:1px solid var(--border-color);padding-top:16px">
        <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Força / 1RM</div>
        <div class="table-container">
          <table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Est.</th><th></th></tr></thead>
            <tbody>${forca.map(a=>{
              const byEx=forca.filter(x=>x.exercise===a.exercise);
              const maxRm1=Math.max(...byEx.map(x=>x.rm1||0));
              const isPR=a.rm1&&a.rm1>=maxRm1;
              return `<tr>
                <td style="font-size:0.78rem;white-space:nowrap">${Calc.formatDate(a.date)}</td>
                <td style="font-weight:600">${a.exercise||'—'}</td>
                <td>${a.carga?a.carga+'kg':'—'}</td>
                <td>${a.reps||'—'}</td>
                <td style="color:var(--primary);font-weight:700">${a.rm1?a.rm1+'kg':'—'}</td>
                <td>${isPR?'<span style="color:#fbbf24;font-weight:700;font-size:0.78rem">★PR</span>':''}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>`:''}
    `;

    // Gráfico de evolução de peso
    if(comp.length>=2 && typeof Chart!=='undefined'){
      const canvas=document.getElementById('evolPesoChart');
      if(canvas){
        new Chart(canvas,{
          type:'line',
          data:{
            labels:comp.map(a=>Calc.formatDate(a.date).slice(0,5)),
            datasets:[
              {label:'Peso (kg)',   data:comp.map(a=>a.peso||null),      borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.07)',tension:0.3,pointRadius:4,fill:true,spanGaps:true},
              {label:'M. Magra',   data:comp.map(a=>a.massaMagra||null), borderColor:'#10b981',backgroundColor:'rgba(16,185,129,0.07)',tension:0.3,pointRadius:4,fill:true,spanGaps:true},
            ]
          },
          options:{
            responsive:true,maintainAspectRatio:false,
            plugins:{legend:{labels:{color:'#94a3b8',font:{size:10},boxWidth:12}}},
            scales:{
              y:{ticks:{color:'#64748b',font:{size:9}},grid:{color:'rgba(148,163,184,0.07)'}},
              x:{ticks:{color:'#94a3b8',font:{size:9}},grid:{display:false}}
            }
          }
        });
      }
    }
  });

  // ── VER AVALIAÇÃO (composição) ─────────────────────────────
  document.querySelectorAll('.view-assessment').forEach(btn=>{
    btn.addEventListener('click', async()=>{
      const a  = await db.get('assessments',btn.dataset.id);
      if(!a) return;
      const st = await db.get('students',a.studentId);
      const imc=a.peso&&a.altura?Calc.imc(a.peso,a.altura):null;
      const imcC=imc?Calc.imcClassificacao(imc):null;
      openModal({
        title:`Avaliação — ${st?.name||'Aluno'}`, size:'lg',
        content:`
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${[
              ['Data',        Calc.formatDate(a.date)],
              ['Peso',        a.peso?a.peso+'kg':'—'],
              ['Altura',      a.altura?a.altura+'cm':'—'],
              ['IMC',         imc?`${Calc.formatNum(imc)} — ${imcC?.label}`:'-'],
              ['% Gordura',   a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'—'],
              ['Massa Magra', a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'—'],
              ['Massa Gorda', a.massaGorda?Calc.formatNum(a.massaGorda)+'kg':'—'],
              ['RCQ',         a.rcq?Calc.formatNum(a.rcq,2):'—'],
              ['Cintura',     a.cintura?a.cintura+'cm':'—'],
              ['Quadril',     a.quadril?a.quadril+'cm':'—'],
              ['Braço',       a.braco?a.braco+'cm':'—'],
              ['PA',          a.paSistolica?`${a.paSistolica}/${a.paDiastolica} mmHg`:'—'],
            ].map(([l,v])=>`<div style="padding:8px 10px;background:var(--bg-page);border-radius:6px">
              <div class="text-xs text-muted">${l}</div>
              <div style="font-weight:600;margin-top:1px">${v}</div>
            </div>`).join('')}
          </div>
          ${a.notes?`<div class="text-sm text-muted mt-md"><strong>Obs:</strong> ${a.notes}</div>`:''}`
      });
    });
  });

  // ── VER 1RM (zonas de carga) ────────────────────────────────
  document.querySelectorAll('.view-rm1').forEach(btn=>{
    btn.addEventListener('click', async()=>{
      const a=await db.get('assessments',btn.dataset.id);
      if(!a||!a.rm1) return;
      const zones=rm1Zones(a.rm1);
      openModal({
        title:`Zonas de Carga — ${a.exercise}`, size:'md',
        content:`
          <div style="padding:10px 14px;background:var(--bg-page);border-radius:8px;margin-bottom:12px">
            <div class="text-xs text-muted">1RM estimado · ${a.formula||'Epley'} · ${Calc.formatDate(a.date)}</div>
            <div style="font-size:1.6rem;font-weight:800;color:var(--primary)">${a.rm1}kg</div>
          </div>
          <table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>%1RM</th><th>Carga</th><th>Reps</th><th>Objetivo</th></tr></thead>
            <tbody>${zones.map(z=>`<tr>
              <td style="color:${z.color};font-weight:700">${z.pct}%</td>
              <td style="color:${z.color};font-weight:700">${z.load}kg</td>
              <td>${z.reps}</td>
              <td class="text-xs text-muted">${z.label}</td>
            </tr>`).join('')}</tbody>
          </table>`
      });
    });
  });

  // ── EXCLUIR ────────────────────────────────────────────────
  document.querySelectorAll('.delete-assessment').forEach(btn=>{
    btn.addEventListener('click', async()=>{
      if(!window.confirm('Excluir esta avaliação?')) return;
      await db.delete('assessments',btn.dataset.id);
      notify.success('Avaliação removida.');
      navigateFn('/avaliacoes');
    });
  });

  // ── FICHA COMPLETA ─────────────────────────────────────────
  document.getElementById('fichaStudentSel')?.addEventListener('change', async e=>{
    const sid = e.target.value;
    const btn = document.getElementById('fichaExportBtn');
    if(!sid){ document.getElementById('fichaContent').innerHTML='<div style="padding:40px;text-align:center;color:var(--text-muted)">Selecione um aluno</div>'; if(btn) btn.style.display='none'; return; }
    if(btn) btn.style.display='';
    await renderFichaCompleta(sid);
  });

  document.getElementById('fichaExportBtn')?.addEventListener('click', async()=>{
    const sid = document.getElementById('fichaStudentSel')?.value;
    if(sid) await exportFichaPDF(sid);
  });
}

// ── HELPER: preview 1RM por série ─────────────────────────────
function updateRM1Preview(i) {
  const carga = parseFloat(document.querySelector(`.rm1-carga[data-set="${i}"]`)?.value);
  const reps  = parseInt(document.querySelector(`.rm1-reps[data-set="${i}"]`)?.value);
  const form  = document.getElementById('rm1protFormula')?.value||'epley';
  const el    = document.querySelector(`.rm1-result[data-set="${i}"]`);
  if(el) el.textContent = carga&&reps&&reps>=1 ? (Calc.rm1Estimado(carga,reps,form)||'—')+'kg' : '—';
}

function updateRM1Best() {
  const form = document.getElementById('rm1protFormula')?.value||'epley';
  const series=[];
  for(let i=0;i<5;i++){
    const carga=parseFloat(document.querySelector(`.rm1-carga[data-set="${i}"]`)?.value);
    const reps =parseInt(document.querySelector(`.rm1-reps[data-set="${i}"]`)?.value);
    if(carga&&reps) series.push({carga,reps,formula:form});
  }
  const best = Calc.melhorEstimativa1RM(series);
  const resEl=document.getElementById('rm1protResult');
  const srcEl=document.getElementById('rm1protSource');
  if(resEl) resEl.textContent = best?.rm1 ? best.rm1+' kg' : '—';
  if(srcEl) srcEl.textContent = best ? `${best.carga}kg × ${best.reps} reps · fórmula ${form}` : 'Preencha as séries acima';
}

// ── FORMULÁRIOS POR TIPO DE AVALIAÇÃO ─────────────────────────
function openAssessmentForm(tipo, students, navigateFn) {
  const titles = { composicao:'Composição Corporal', forca:'Força / 1RM', conconi:'Protocolo Conconi / VO₂max' };
  const content = tipo==='composicao' ? composicaoFormHTML(students) :
                  tipo==='forca'      ? forcaFormHTML(students) :
                  conconiFormHTML(students);

  openModal({
    title:`Nova Avaliação — ${titles[tipo]}`, size: tipo==='composicao'?'xl':'md',
    preventBackdropClose: true,
    content,
    actions:[
      { label:'Cancelar', class:'btn-secondary', onClick:()=>closeModal() },
      { label:'Salvar Avaliação', class:'btn-primary', onClick:async()=>{
        const fd = new FormData(document.getElementById('assessForm'));
        const d  = Object.fromEntries(fd);
        if(!d.studentId){ notify.error('Selecione o aluno'); return; }
        await saveAssessment(tipo, d, navigateFn);
      }}
    ]
  });

  // Auto-preencher idade se aluno selecionado
  setTimeout(()=>{
    document.querySelector('#assessForm [name="studentId"]')?.addEventListener('change', async e=>{
      const st = students.find(s=>s.id===e.target.value);
      if(st?.birthDate){
        const age = Calc.calcularIdade(st.birthDate);
        const el  = document.querySelector('#assessForm [name="idadeCalc"]');
        if(el) el.value = age;
        const gel = document.querySelector('#assessForm [name="genero"]');
        if(gel&&st.gender) gel.value = st.gender;
      }
    });

    // Conconi: auto-calcular VO2max ao digitar VMA
    document.querySelector('#assessForm [name="vma"]')?.addEventListener('input', e=>{
      const vma = parseFloat(e.target.value);
      const el  = document.querySelector('#assessForm [name="vo2max"]');
      if(vma&&el) el.value = Calc.vo2maxConconi(vma);
    });
  }, 80);
}

async function saveAssessment(tipo, d, navigateFn) {
  const base = { type:tipo, studentId:d.studentId, date:d.date||new Date().toISOString().slice(0,10) };

  if(tipo==='composicao'){
    const peso   = parseFloat(d.peso)||null;
    const altura = parseFloat(d.altura)||null;
    const imc    = peso&&altura ? Calc.imc(peso,altura) : null;
    const genero = d.genero||'M';
    const idade  = parseInt(d.idadeCalc)||30;
    // % gordura por dobras ou manual
    let pct = parseFloat(d.percentualGorduraManual)||null;
    if(!pct && d.dobra1&&d.dobra2&&d.dobra3) {
      pct = Calc.percentualGordura3dobras(genero, idade, d.dobra1, d.dobra2, d.dobra3);
    }
    const comp = pct&&peso ? Calc.composicaoCorporal(peso,pct) : {};
    const rcq  = d.cintura&&d.quadril ? Calc.rcq(parseFloat(d.cintura),parseFloat(d.quadril)) : null;
    const smm = Calc.massaMuscularEsqueletica(peso, altura, idade, genero, 0);
    const pctMassaMuscular = Calc.pctMassaMuscular(smm, peso);

    await db.add('assessments',{...base, peso, altura,
      imc:     imc?Math.round(imc*10)/10:null,
      percentualGordura: comp.percentualGordura||pct,
      massaMagra:  comp.massaMagra||null,
      massaGorda:  comp.massaGorda||null,
      massaMuscularEsqueletica: smm,
      pctMassaMuscular: pctMassaMuscular,
      cintura:     parseFloat(d.cintura)||null,
      quadril:     parseFloat(d.quadril)||null,
      braco:       parseFloat(d.braco)||null,
      coxa:        parseFloat(d.coxa)||null,
      panturrilha: parseFloat(d.panturrilha)||null,
      rcq:         rcq?Math.round(rcq*100)/100:null,
      dobra1:      parseFloat(d.dobra1)||null,
      dobra2:      parseFloat(d.dobra2)||null,
      dobra3:      parseFloat(d.dobra3)||null,
      paSistolica: parseFloat(d.paSistolica)||null,
      paDiastolica:parseFloat(d.paDiastolica)||null,
      notes:       d.notes||'',
    });
    notify.success('Avaliação de composição salva!');
  }
  else if(tipo==='forca'){
    const rm1 = Calc.rm1Estimado(d.carga, d.reps, d.formula||'epley');
    const all  = await db.getAll('assessments');
    const prev = all.filter(a=>a.studentId===d.studentId&&a.exercise===d.exercise&&a.rm1).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const isPR = !prev.length||rm1>prev[0].rm1;
    await db.add('assessments',{...base, exercise:d.exercise, carga:parseFloat(d.carga),
      reps:parseInt(d.reps), rm1, formula:d.formula||'epley', isPR, notes:d.notes||''});
    notify.success(`1RM ${isPR?'🏆 PR! ':''}registrado: ${rm1}kg`);
  }
  else if(tipo==='conconi'){
    const vo2 = d.vma ? Calc.vo2maxConconi(parseFloat(d.vma)) : null;
    await db.add('assessments',{...base,
      fcPico:   parseFloat(d.fcPico)||null,
      fcLimiar: parseFloat(d.fcLimiar)||null,
      vma:      parseFloat(d.vma)||null,
      limiar2:  parseFloat(d.limiar2)||null,
      vo2max:   parseFloat(d.vo2max)||vo2,
      notes:    d.notes||'',
    });
    notify.success('Protocolo Conconi salvo!');
  }
  closeModal();
  navigateFn('/avaliacoes');
}

// ── FORMS ───────────────────────────────────────────────────
function studentSelectOpts(students) {
  return `<option value="">Selecione</option>${students.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}`;
}

function composicaoFormHTML(students) {
  const today = new Date().toISOString().slice(0,10);
  return `<form id="assessForm">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Aluno *</label>
        <select class="form-select" name="studentId" required>${studentSelectOpts(students)}</select></div>
      <div class="form-group"><label class="form-label">Data</label>
        <input class="form-input" name="date" type="date" value="${today}" /></div>
      <div class="form-group"><label class="form-label">Gênero</label>
        <select class="form-select" name="genero">
          <option value="M">Masculino</option><option value="F">Feminino</option></select></div>
    </div>
    <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px">
      <h4 style="margin-bottom:10px">Medidas Básicas</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Peso (kg)</label><input class="form-input" name="peso" type="number" step="0.1" placeholder="75.5" /></div>
        <div class="form-group"><label class="form-label">Altura (cm)</label><input class="form-input" name="altura" type="number" step="0.1" placeholder="175" /></div>
        <div class="form-group"><label class="form-label">Idade</label><input class="form-input" name="idadeCalc" type="number" placeholder="30" /></div>
      </div>
    </div>
    <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px">
      <h4 style="margin-bottom:4px">Dobras Cutâneas — 3 Dobras (mm)</h4>
      <p class="text-xs text-muted mb-sm">Jackson & Pollock. ♂: Peitoral, Abdominal, Coxa · ♀: Tríceps, Suprailíaca, Coxa</p>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Dobra 1</label><input class="form-input" name="dobra1" type="number" step="0.1" placeholder="mm" /></div>
        <div class="form-group"><label class="form-label">Dobra 2</label><input class="form-input" name="dobra2" type="number" step="0.1" placeholder="mm" /></div>
        <div class="form-group"><label class="form-label">Dobra 3 (Coxa)</label><input class="form-input" name="dobra3" type="number" step="0.1" placeholder="mm" /></div>
      </div>
    </div>
    <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px">
      <h4 style="margin-bottom:10px">Circunferências (cm)</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Cintura</label><input class="form-input" name="cintura" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Quadril</label><input class="form-input" name="quadril" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Braço (D)</label><input class="form-input" name="braco" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Coxa (D)</label><input class="form-input" name="coxa" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Panturrilha</label><input class="form-input" name="panturrilha" type="number" step="0.1" placeholder="cm" /></div>
      </div>
    </div>
    <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px">
      <div class="form-row">
        <div class="form-group"><label class="form-label">% Gordura (manual)</label><input class="form-input" name="percentualGorduraManual" type="number" step="0.1" placeholder="Se não usar dobras" /></div>
        <div class="form-group"><label class="form-label">PA Sistólica</label><input class="form-input" name="paSistolica" type="number" placeholder="120" /></div>
        <div class="form-group"><label class="form-label">PA Diastólica</label><input class="form-input" name="paDiastolica" type="number" placeholder="80" /></div>
      </div>
      <div class="form-group"><label class="form-label">Observações</label>
        <textarea class="form-textarea" name="notes" rows="2" placeholder="Notas..."></textarea></div>
    </div>
  </form>`;
}

function forcaFormHTML(students) {
  const today = new Date().toISOString().slice(0,10);
  return `<form id="assessForm">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Aluno *</label>
        <select class="form-select" name="studentId" required>${studentSelectOpts(students)}</select></div>
      <div class="form-group"><label class="form-label">Data</label>
        <input class="form-input" name="date" type="date" value="${today}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Exercício *</label>
      <input class="form-input" name="exercise" list="assExList" placeholder="Ex: Supino Reto com Barra" required />
      <datalist id="assExList">${RM_EXERCISES.map(e=>`<option value="${e}">`).join('')}</datalist></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Carga (kg) *</label>
        <input class="form-input" name="carga" type="number" step="0.5" required /></div>
      <div class="form-group"><label class="form-label">Repetições *</label>
        <input class="form-input" name="reps" type="number" min="1" max="20" required /></div>
      <div class="form-group"><label class="form-label">Fórmula</label>
        <select class="form-select" name="formula">
          <option value="epley">Epley (padrão)</option>
          <option value="brzycki">Brzycki</option>
          <option value="lander">Lander</option>
          <option value="lombardi">Lombardi</option>
        </select></div>
    </div>
    <div class="form-group"><label class="form-label">Observações</label>
      <textarea class="form-textarea" name="notes" rows="2" placeholder="Notas..."></textarea></div>
  </form>`;
}

function conconiFormHTML(students) {
  const today = new Date().toISOString().slice(0,10);
  return `<form id="assessForm">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Aluno *</label>
        <select class="form-select" name="studentId" required>${studentSelectOpts(students)}</select></div>
      <div class="form-group"><label class="form-label">Data</label>
        <input class="form-input" name="date" type="date" value="${today}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">FC Pico (bpm)</label>
        <input class="form-input" name="fcPico" type="number" placeholder="185" /></div>
      <div class="form-group"><label class="form-label">FC Limiar Anaeróbio</label>
        <input class="form-input" name="fcLimiar" type="number" placeholder="165" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">VMA (km/h)</label>
        <input class="form-input" name="vma" type="number" step="0.1" placeholder="16.0" /></div>
      <div class="form-group"><label class="form-label">Limiar 2 (km/h)</label>
        <input class="form-input" name="limiar2" type="number" step="0.1" placeholder="13.5" /></div>
      <div class="form-group"><label class="form-label">VO₂max (auto)</label>
        <input class="form-input" name="vo2max" type="number" step="0.1" placeholder="Calculado ao digitar VMA" /></div>
    </div>
    <div class="form-group"><label class="form-label">Observações</label>
      <textarea class="form-textarea" name="notes" rows="2" placeholder="Notas..."></textarea></div>
  </form>`;
}

// ── FICHA COMPLETA ────────────────────────────────────────────
async function renderFichaCompleta(sid) {
  const el = document.getElementById('fichaContent');
  if(!el) return;
  el.innerHTML = '<div style="padding:20px;color:var(--text-muted)">Carregando...</div>';

  const [student, all, biofeedback, sessions, anamnesis] = await Promise.all([
    db.get('students', sid),
    db.getAll('assessments'),
    db.getAll('biofeedback'),
    db.getAll('sessions'),
    db.getAll('anamnesis'),
  ]);

  const sAss  = all.filter(a=>a.studentId===sid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const comp  = sAss.filter(a=>a.type==='composicao');
  const forca = sAss.filter(a=>a.type==='forca');
  const conc  = sAss.filter(a=>a.type==='conconi');
  const sBf   = biofeedback.filter(b=>b.studentId===sid).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10);
  const sSess = sessions.filter(s=>s.studentId===sid&&s.status==='completed');
  const ana   = anamnesis.find(a=>a.fullName===student?.name);
  const age   = student?.birthDate ? Calc.calcularIdade(student.birthDate) : student?.age;

  const prs = {};
  forca.forEach(a=>{ if(!prs[a.exercise]||a.rm1>prs[a.exercise].rm1) prs[a.exercise]=a; });
  const avgBf = (key)=>sBf.length?Math.round(sBf.reduce((t,b)=>t+(b[key]||0),0)/sBf.length*10)/10:null;

  // Calcular TMB/TDEE/Macros com base na avaliação mais recente
  const lastComp   = comp[0];
  const sexo       = student?.gender || lastComp?.genero || 'M';
  const peso       = lastComp?.peso;
  const altura     = lastComp?.altura;
  const massaMagra = lastComp?.massaMagra;
  const goalMap    = {
    'Emagrecimento':'emagrecimento', 'Perda de peso':'emagrecimento',
    'Hipertrofia':'hipertrofia', 'Ganho de massa':'hipertrofia',
    'Manutenção':'manutencao', 'Saúde':'manutencao', 'Condicionamento':'manutencao',
  };
  const objetivo  = goalMap[student?.goal] || 'manutencao';
  const tmbResult = age && peso ? Calc.tmb(peso, altura, age, sexo, massaMagra) : null;

  // Estimar nível de atividade pelo número de sessões por semana
  const sessPerWeek = sSess.length > 0
    ? sSess.length / Math.max(1, Math.ceil((Date.now() - new Date(sSess[sSess.length-1]?.date||Date.now()).getTime()) / (7*86400000)))
    : 3;
  const nivelAtividade = sessPerWeek >= 5 ? 'ativo'
    : sessPerWeek >= 3 ? 'moderado'
    : sessPerWeek >= 1 ? 'leve'
    : 'sedentario';
  const tdeeResult = tmbResult ? Calc.tdee(tmbResult.valor, nivelAtividade) : null;
  const metaResult = tdeeResult ? Calc.metaCalorica(tdeeResult.valor, objetivo) : null;
  const macrosResult= metaResult && peso ? Calc.macros(metaResult.kcal, peso, objetivo) : null;

  el.innerHTML = `
    <!-- Header do aluno -->
    <div class="flex items-center gap-lg mb-lg" style="padding-bottom:16px;border-bottom:2px solid var(--border-active)">
      <div class="avatar" style="width:56px;height:56px;font-size:1.4rem;flex-shrink:0">${ini(student?.name)}</div>
      <div style="flex:1">
        <h3 style="margin:0">${student?.name||'—'}</h3>
        <div class="text-muted text-sm">${student?.code||''} · ${age?age+' anos':'—'} · ${student?.goal||'—'}</div>
        <div class="flex gap-sm mt-xs">
          ${student?.status?`<span class="badge badge-${student.status==='Ativo'?'success':'warning'}">${student.status}</span>`:''}
          ${student?.weeklyFrequency?`<span class="badge badge-info">${student.weeklyFrequency}</span>`:''}
        </div>
      </div>
      <div style="text-align:right">
        <div class="text-xs text-muted">Sessões realizadas</div>
        <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${sSess.length}</div>
        <div class="text-xs text-muted mt-xs">Última avaliação</div>
        <div style="font-weight:600">${sAss[0]?Calc.formatDate(sAss[0].date):'—'}</div>
      </div>
    </div>

    ${!sAss.length&&!sBf.length?`
      <div class="empty-state" style="padding:40px">
        <div class="empty-icon">—</div>
        <h3>Nenhuma avaliação registrada para ${student?.name}</h3>
      </div>`:''
    }

    ${tmbResult && tdeeResult && metaResult ? `
    <!-- Calorias e Macros -->
    <div style="margin-bottom:20px">
      <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Gasto Energético Estimado</div>
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
        ${[
          ['TMB',  tmbResult.valor+'kcal',  'text-muted', tmbResult.formula],
          ['TDEE', tdeeResult.valor+'kcal', 'primary',    Calc.FATOR_ATIVIDADE[nivelAtividade]?.label||''],
          ['Meta', metaResult.kcal+'kcal',  objetivo.includes('emagr')?'warning':objetivo.includes('hipert')?'success':'accent', metaResult.label],
        ].map(([l,v,c,s])=>`
          <div class="stat-card" style="text-align:center;padding:10px">
            <div class="stat-label">${l}</div>
            <div style="font-size:1.1rem;font-weight:800;color:var(--${c.startsWith('text')?'text-muted':c})">${v}</div>
            <div style="font-size:0.62rem;color:var(--text-muted);margin-top:2px;line-height:1.3">${s}</div>
          </div>`).join('')}
          ${macrosResult ? `
          <div class="stat-card" style="text-align:center;padding:10px">
            <div class="stat-label">Proteína</div>
            <div style="font-size:1.1rem;font-weight:800;color:var(--primary)">${macrosResult.proteina.g}g</div>
            <div style="font-size:0.62rem;color:var(--text-muted);margin-top:2px">${macrosResult.protPorKg}g/kg · ${macrosResult.proteina.pct}%</div>
          </div>` : ''}
      </div>
      ${macrosResult ? `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[
          ['Proteína',    macrosResult.proteina,   '#10b981'],
          ['Carboidrato', macrosResult.carboidrato, '#f59e0b'],
          ['Gordura',     macrosResult.gordura,     '#8b5cf6'],
        ].map(([n,m,c])=>`
          <div style="background:var(--bg-page);border-radius:8px;padding:10px;border-left:3px solid ${c}">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">${n}</div>
            <div style="font-size:1.2rem;font-weight:700;color:${c}">${m.g}g</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${m.kcal}kcal · ${m.pct}%</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:8px;padding:8px 10px;background:rgba(16,185,129,0.05);border-radius:6px;font-size:0.72rem;color:var(--text-muted)">
        Fórmula: <strong>${tmbResult.formula}</strong>${lastComp?.massaMagra?' (usando massa magra)':''} · Objetivo: <strong>${student?.goal||'Geral'}</strong> · Atividade estimada: ~${Math.round(sessPerWeek*10)/10}×/sem
      </div>` : ''}
    </div>` : peso ? `
    <div style="padding:10px 12px;background:rgba(245,158,11,0.06);border-radius:8px;border-left:3px solid var(--warning);margin-bottom:16px;font-size:0.8rem;color:var(--text-muted)">
      Para calcular calorias, registre peso, altura e idade na avaliação de composição.
    </div>` : ''}

    ${comp.length?`
    <!-- Composição -->
    <div style="margin-bottom:20px">
      <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Composição Corporal</div>
      <div class="table-container">
        <table class="data-table" style="font-size:0.82rem">
          <thead><tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th><th>M. Magra</th><th>M. Musc. Esq.</th><th>Cintura</th><th>RCQ</th><th>Δ Peso</th></tr></thead>
          <tbody>${[...comp].reverse().map((a,i,arr)=>{
            const prev=arr[i-1];
            const dp=prev&&a.peso&&prev.peso?(a.peso-prev.peso):null;
            const imc=a.peso&&a.altura?Calc.imc(a.peso,a.altura):null;
            const imcC=imc?Calc.imcClassificacao(imc):null;
            return `<tr>
              <td style="white-space:nowrap">${Calc.formatDate(a.date)}</td>
              <td style="font-weight:600">${a.peso?a.peso+'kg':'—'}</td>
              <td>${imc?`<span class="badge badge-${imcC.color}">${Calc.formatNum(imc)}</span>`:'—'}</td>
              <td style="color:${(a.percentualGordura||0)>25?'var(--warning)':'var(--success)'}">${a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'—'}</td>
              <td style="color:var(--primary);font-weight:600">${a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'—'}</td>
              <td style="color:var(--accent);font-weight:600">${a.pctMassaMuscular?Calc.formatNum(a.pctMassaMuscular)+'%':'—'}</td>
              <td>${a.cintura?a.cintura+'cm':'—'}</td>
              <td>${a.rcq?Calc.formatNum(a.rcq,2):'—'}</td>
              <td style="color:${dp===null?'inherit':dp<0?'var(--success)':'var(--danger)'};font-weight:600">${dp===null?'—':(dp>0?'+':'')+Calc.formatNum(dp)+'kg'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>`:''
    }

    ${Object.keys(prs).length?`
    <!-- PRs de Força -->
    <div style="margin-bottom:20px">
      <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Records Pessoais — 1RM</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:12px">
        ${Object.entries(prs).map(([ex,a])=>`
          <div style="padding:10px 12px;background:var(--bg-page);border-radius:8px;border:1px solid ${a.isPR?'rgba(16,185,129,0.3)':'var(--border-color)'}">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${ex}</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${a.rm1}kg</div>
            <div style="font-size:0.65rem;color:var(--text-muted)">${Calc.formatDate(a.date)}${a.isPR?' · PR':''}</div>
          </div>`).join('')}
      </div>
    </div>`:''
    }

    ${conc.length?`
    <!-- Conconi -->
    <div style="margin-bottom:20px">
      <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Conconi / VO₂max</div>
      <div class="table-container">
        <table class="data-table" style="font-size:0.82rem">
          <thead><tr><th>Data</th><th>FC Pico</th><th>VMA</th><th>VO₂max</th><th>FC Limiar</th></tr></thead>
          <tbody>${conc.map(a=>`<tr>
            <td style="white-space:nowrap">${Calc.formatDate(a.date)}</td>
            <td style="color:var(--danger);font-weight:600">${a.fcPico?a.fcPico+' bpm':'—'}</td>
            <td>${a.vma?a.vma+' km/h':'—'}</td>
            <td style="color:var(--accent);font-weight:700">${a.vo2max?Calc.formatNum(a.vo2max)+' ml/kg/min':'—'}</td>
            <td>${a.fcLimiar?a.fcLimiar+' bpm':'—'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`:''
    }

    ${sBf.length?`
    <!-- Biofeedback médias -->
    <div style="margin-bottom:20px">
      <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Biofeedback — Médias (últimos ${sBf.length})</div>
      <div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
        ${[['Sono',avgBf('sleep'),false],['Disposição',avgBf('mood'),false],['Energia',avgBf('energy'),false],['Estresse',avgBf('stress'),true],['PSE',avgBf('pse'),true]].map(([l,v,inv])=>`
          <div class="stat-card" style="text-align:center;padding:10px">
            <div class="stat-label" style="font-size:0.62rem">${l}</div>
            <div style="font-size:1.2rem;font-weight:800;color:${v==null?'var(--text-muted)':inv?(v>=7?'var(--danger)':v>=5?'var(--warning)':'var(--success)'):(v<=3?'var(--danger)':v<=5?'var(--warning)':'var(--success)')}">${v??'—'}</div>
          </div>`).join('')}
      </div>
    </div>`:''
    }

    ${ana?`
    <!-- Anamnese -->
    <div>
      <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Anamnese — ${Calc.formatDate(ana.submittedAt)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.82rem">
        ${[['Condições',ana.conditions],['Medicações',ana.medications],['Lesões',ana.injuries],['Experiência',ana.experience],['Sono',ana.sleepQuality],['Estresse',ana.stressLevel]].filter(([,v])=>v).map(([l,v])=>`
          <div style="padding:6px 10px;background:var(--bg-page);border-radius:6px">
            <div class="text-xs text-muted">${l}</div>
            <div style="font-weight:500;margin-top:1px">${v}</div>
          </div>`).join('')}
      </div>
    </div>`:''
    }
  `;
}

async function exportFichaPDF(sid) {
  const [student, all, biofeedback, sessions, settings] = await Promise.all([
    db.get('students',sid), db.getAll('assessments'), db.getAll('biofeedback'),
    db.getAll('sessions'), db.get('settings','trainer').catch(()=>({})),
  ]);
  const comp  = all.filter(a=>a.studentId===sid&&a.type==='composicao').sort((a,b)=>new Date(a.date)-new Date(b.date));
  const forca = all.filter(a=>a.studentId===sid&&a.type==='forca');
  const prs   = {};
  forca.forEach(a=>{ if(!prs[a.exercise]||a.rm1>prs[a.exercise].rm1) prs[a.exercise]=a; });
  const sBf   = biofeedback.filter(b=>b.studentId===sid).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10);
  const sSess = sessions.filter(s=>s.studentId===sid&&s.status==='completed').length;
  const age   = student?.birthDate?Calc.calcularIdade(student.birthDate):student?.age;
  const avgBf = (key)=>sBf.length?Math.round(sBf.reduce((t,b)=>t+(b[key]||0),0)/sBf.length*10)/10:null;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ficha — ${student?.name}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:24px 32px;max-width:900px;margin:0 auto;font-size:12px;line-height:1.5}
  .h1{font-size:20px;color:#10b981;font-weight:800;border-bottom:3px solid #10b981;padding-bottom:8px;margin-bottom:12px}
  .info{display:flex;gap:12px;background:#f0fdf8;padding:12px 16px;border-radius:8px;margin-bottom:16px;align-items:center}
  .av{width:48px;height:48px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex-shrink:0}
  h2{font-size:13px;color:#10b981;border-bottom:1px solid #d1fae5;padding-bottom:4px;margin:16px 0 8px;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
  th{background:#f3f4f6;padding:6px 8px;text-align:left;font-weight:700;border-bottom:2px solid #e5e7eb;font-size:10px;text-transform:uppercase;color:#555}
  td{padding:6px 8px;border-bottom:1px solid #f0f0f0}tr:nth-child(even) td{background:#fafafa}
  .prs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
  .pr{padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa}
  .bf{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px}
  .bfc{text-align:center;padding:8px;border:1px solid #e5e7eb;border-radius:6px}
  .footer{text-align:center;font-size:10px;color:#aaa;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:10px}
  @media print{body{padding:14px 18px}@page{margin:1.5cm}}</style>
  <script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script>
  </head><body>
  <div class="h1">Personal PRO — Ficha de Avaliação</div>
  <div class="info">
    <div class="av">${ini(student?.name)}</div>
    <div>
      <div style="font-size:17px;font-weight:800">${student?.name||'—'}</div>
      <div style="color:#666">${student?.code||''} · ${age?age+' anos':'—'} · ${student?.goal||'—'}</div>
      <div style="font-size:11px;color:#888;margin-top:3px">${sSess} sessões realizadas · Gerado em ${new Date().toLocaleDateString('pt-BR')} por ${settings?.trainerName||'Personal PRO'}</div>
    </div>
  </div>
  ${comp.length?`<h2>Composição Corporal</h2>
  <table><thead><tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th><th>M. Magra</th><th>Cintura</th><th>Δ Peso</th></tr></thead>
  <tbody>${comp.map((a,i)=>{const prev=comp[i-1];const dp=prev&&a.peso&&prev.peso?(a.peso-prev.peso):null;const imc=a.peso&&a.altura?Calc.imc(a.peso,a.altura):null;return`<tr><td>${Calc.formatDate(a.date)}</td><td><strong>${a.peso?a.peso+'kg':'—'}</strong></td><td>${imc?Calc.formatNum(imc):'—'}</td><td>${a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'—'}</td><td style="color:#10b981;font-weight:600">${a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'—'}</td><td>${a.cintura?a.cintura+'cm':'—'}</td><td style="color:${dp===null?'inherit':dp<0?'#10b981':'#ef4444'};font-weight:600">${dp===null?'—':(dp>0?'+':'')+Calc.formatNum(dp)+'kg'}</td></tr>`;}).join('')}</tbody></table>`:''}
  ${Object.keys(prs).length?`<h2>Records Pessoais — 1RM</h2><div class="prs">${Object.entries(prs).map(([ex,a])=>`<div class="pr"><div style="font-size:10px;color:#666">${ex}</div><div style="font-size:18px;font-weight:800;color:#10b981">${a.rm1}kg</div><div style="font-size:9px;color:#999">${Calc.formatDate(a.date)}${a.isPR?' · PR':''}</div></div>`).join('')}</div>`:''}
  ${sBf.length?`<h2>Biofeedback — Médias</h2><div class="bf">${[['Sono',avgBf('sleep')],['Disposição',avgBf('mood')],['Energia',avgBf('energy')],['Estresse',avgBf('stress')],['PSE',avgBf('pse')]].map(([l,v])=>`<div class="bfc"><div style="font-size:9px;color:#666;text-transform:uppercase">${l}</div><div style="font-size:16px;font-weight:800;color:#10b981">${v??'—'}</div></div>`).join('')}</div>`:''}
  <div class="footer">Ficha gerada por ${settings?.trainerName||'Personal PRO'}${settings?.cref?' · CREF '+settings.cref:''} — ${new Date().toLocaleDateString('pt-BR')}</div>
  </body></html>`;

  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  notify.success('Ficha aberta! Use Ctrl+P para salvar como PDF.');
}
