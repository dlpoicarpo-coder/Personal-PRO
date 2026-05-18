// ========================================
// PERSONAL PRO — Assessments Page (v2)
// Composição · Força/1RM · Conconi · Zonas · Evolução
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

const ICON_DEL = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
const ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

// Exercícios mais avaliados para 1RM
const RM_EXERCISES = [
  'Supino Reto com Barra','Agachamento Livre com Barra','Levantamento Terra',
  'Desenvolvimento com Barra','Puxada Frontal','Rosca Direta com Barra',
  'Leg Press 45°','Remada Curvada com Barra','Supino Inclinado com Halteres',
  'Hip Thrust','Stiff com Barra','Tríceps Pulley',
];

// Fórmulas de 1RM
const RM1_FORMULAS = {
  epley:   (l, r) => l * (1 + r / 30),
  brzycki: (l, r) => l * (36 / (37 - r)),
  lander:  (l, r) => (100 * l) / (101.3 - 2.67123 * r),
  lombardi:(l, r) => l * Math.pow(r, 0.1),
};

function calcRM1(load, reps, formula = 'epley') {
  if (reps === 1) return load;
  const fn = RM1_FORMULAS[formula] || RM1_FORMULAS.epley;
  return Math.round(fn(load, reps) * 2) / 2;
}

// Percentuais de 1RM para zonas de treinamento
function rm1Zones(rm1) {
  return [
    { pct: 100, reps: '1',    label: 'Força Máxima',     color: '#ef4444' },
    { pct: 95,  reps: '2-3',  label: 'Força Máxima',     color: '#ef4444' },
    { pct: 90,  reps: '3-4',  label: 'Força',            color: '#f97316' },
    { pct: 85,  reps: '4-6',  label: 'Força/Hipertrofia',color: '#f97316' },
    { pct: 80,  reps: '6-8',  label: 'Hipertrofia',      color: '#eab308' },
    { pct: 75,  reps: '8-10', label: 'Hipertrofia',      color: '#eab308' },
    { pct: 70,  reps: '10-12',label: 'Hipertrofia/RML',  color: '#22c55e' },
    { pct: 65,  reps: '12-15',label: 'Resistência',      color: '#22c55e' },
    { pct: 60,  reps: '15-20',label: 'Resistência Musc.',color: '#3b82f6' },
    { pct: 50,  reps: '20+',  label: 'Resistência Musc.',color: '#3b82f6' },
  ].map(z => ({ ...z, load: Math.round(rm1 * (z.pct / 100) * 2) / 2 }));
}

export async function renderAssessments() {
  const students    = await db.getAll('students');
  const assessments = await db.getAll('assessments');
  assessments.sort((a, b) => new Date(b.date) - new Date(a.date));
  const activeStudents = students.filter(s => s.status === 'Ativo');

  const compAss  = assessments.filter(a => a.type === 'composicao');
  const forcaAss = assessments.filter(a => a.type === 'forca');
  const concAss  = assessments.filter(a => a.type === 'conconi');

  return `
    <div class="page-header">
      <div>
        <h1>Avaliações Físicas</h1>
        <p class="subtitle">${assessments.length} avaliação(ões) · ${[...new Set(assessments.map(a=>a.studentId))].length} alunos avaliados</p>
      </div>
      <div class="flex gap-sm">
        <select class="form-select" id="assStudentFilter" style="min-width:180px">
          <option value="">Todos os alunos</option>
          ${activeStudents.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="addAssessmentBtn">+ Nova Avaliação</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">COMPOSIÇÃO</div>
        <div class="stat-value text-gradient">${compAss.length}</div>
        <div class="stat-change">avaliações</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">FORÇA / 1RM</div>
        <div class="stat-value" style="color:var(--warning)">${forcaAss.length}</div>
        <div class="stat-change">registros</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">CONCONI</div>
        <div class="stat-value" style="color:var(--accent)">${concAss.length}</div>
        <div class="stat-change">testes</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">ALUNOS</div>
        <div class="stat-value" style="color:var(--primary)">${[...new Set(assessments.map(a=>a.studentId))].length}</div>
        <div class="stat-change">avaliados</div>
      </div>
    </div>

    <div class="tabs" id="assessmentTypeTabs">
      <button class="tab active" data-type="composicao">Composição Corporal</button>
      <button class="tab" data-type="forca">Força &amp; 1RM Submax</button>
      <button class="tab" data-type="conconi">Protocolo Conconi</button>
      <button class="tab" data-type="zonas">Zonas de Treino</button>
      <button class="tab" data-type="evolucao">Evolução</button>
      <button class="tab" data-type="ficha">Ficha Completa</button>
    </div>

    <!-- COMPOSIÇÃO -->
    <div id="panel-composicao" class="assessment-panel">
      ${renderComposicaoPanel(compAss, students)}
    </div>

    <!-- FORÇA / 1RM -->
    <div id="panel-forca" class="assessment-panel" style="display:none">
      ${renderForcaPanel(forcaAss, students)}
    </div>

    <!-- CONCONI -->
    <div id="panel-conconi" class="assessment-panel" style="display:none">
      ${renderConconiPanel(concAss, students)}
    </div>

    <!-- ZONAS -->
    <div id="panel-zonas" class="assessment-panel" style="display:none">
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Calculadora Zonas de FC (Karvonen)</span></div>
          <p class="text-xs text-muted mb-md">Selecione um aluno ou preencha manualmente</p>
          <div class="form-group">
            <label class="form-label">Aluno (opcional)</label>
            <select class="form-select" id="zonaStudentSel">
              <option value="">Preencher manualmente</option>
              ${activeStudents.map(s=>`<option value="${s.id}" data-birth="${s.birthDate||''}">${s.name}</option>`).join('')}
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
          <div id="zonasResult" class="mt-lg"></div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Calculadora Zonas por 1RM</span></div>
          <p class="text-xs text-muted mb-md">Calcule as cargas de treino a partir do 1RM estimado</p>
          <div class="form-group">
            <label class="form-label">Exercício</label>
            <select class="form-select" id="rm1ExSel">
              <option value="">Selecione ou escolha aluno</option>
              ${RM_EXERCISES.map(e=>`<option>${e}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Aluno (carrega último 1RM)</label>
            <select class="form-select" id="rm1StudentSel">
              <option value="">Preencher manualmente</option>
              ${activeStudents.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">1RM (kg)</label>
            <input class="form-input" id="rm1Value" type="number" step="0.5" placeholder="Ex: 100" />
          </div>
          <button class="btn btn-primary" id="calcRM1Zones" style="width:100%">Calcular Zonas de Carga</button>
          <div id="rm1ZonesResult" class="mt-lg"></div>
        </div>
      </div>
    </div>

    <!-- PROTOCOLO 1RM SUBMAX -->
    <div id="panel-protocolo1rm" class="assessment-panel" style="display:none">
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Protocolo 1RM Submax</span>
            <span class="badge badge-success">Seguro e Preciso</span>
          </div>
          <p class="text-xs text-muted mb-md" style="line-height:1.6">
            Estimativa do 1RM sem chegar ao máximo absoluto. Selecione um aluno e exercício, execute as séries e registre a carga e reps de cada uma. O sistema calcula automaticamente o 1RM estimado.
          </p>

          <div class="form-group">
            <label class="form-label">Aluno</label>
            <select class="form-select" id="rm1protStudent">
              <option value="">Selecione</option>
              ${activeStudents.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Exercício</label>
            <input class="form-input" id="rm1protExercise" list="rm1protExList" placeholder="Ex: Supino Reto com Barra" />
            <datalist id="rm1protExList">
              ${RM_EXERCISES.map(e=>`<option value="${e}">`).join('')}
            </datalist>
          </div>
          <div class="form-group">
            <label class="form-label">Fórmula de estimativa</label>
            <select class="form-select" id="rm1protFormula">
              <option value="epley">Epley (padrão)</option>
              <option value="brzycki">Brzycki</option>
              <option value="lander">Lander</option>
              <option value="lombardi">Lombardi</option>
              <option value="mayhew">Mayhew</option>
            </select>
          </div>

          <div style="border-top:1px solid var(--border-color);padding-top:14px;margin-top:4px">
            <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Séries — Registre carga e reps realizadas</div>
            ${Calc.protocolo1RM.steps.map((s, i) => `
            <div style="display:grid;grid-template-columns:32px 1fr 80px 80px auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color)">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem;flex-shrink:0">${s.set}</div>
              <div>
                <div style="font-size:0.78rem;font-weight:600">~${s.pct}% · ${s.reps} reps</div>
                <div style="font-size:0.68rem;color:var(--text-muted)">${s.desc}</div>
              </div>
              <input class="form-input rm1-carga" data-set="${i}" type="number" step="0.5" placeholder="kg" style="text-align:center;font-size:0.82rem;padding:4px 6px" />
              <input class="form-input rm1-reps" data-set="${i}" type="number" min="1" max="20" placeholder="reps" style="text-align:center;font-size:0.82rem;padding:4px 6px" />
              <span class="rm1-result" data-set="${i}" style="font-size:0.78rem;color:var(--primary);font-weight:700;min-width:50px">—</span>
            </div>`).join('')}
          </div>

          <div style="margin-top:16px;padding:14px;background:rgba(16,185,129,0.08);border-radius:10px;border:1px solid rgba(16,185,129,0.2)">
            <div class="text-xs text-muted mb-xs" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Melhor estimativa de 1RM</div>
            <div id="rm1protResult" style="font-size:2.2rem;font-weight:800;color:var(--primary)">—</div>
            <div id="rm1protSource" class="text-xs text-muted mt-xs">Preencha as séries acima</div>
          </div>

          <button class="btn btn-primary mt-md" id="saveRM1Prot" style="width:100%">Salvar 1RM Estimado</button>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Instruções do Protocolo</span></div>

          <div style="margin-bottom:16px">
            <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Como executar</div>
            <ol style="padding-left:18px;line-height:2;font-size:0.85rem">
              ${Calc.protocolo1RM.instructions.map(i=>`<li>${i}</li>`).join('')}
            </ol>
          </div>

          <div style="padding:12px;background:rgba(245,158,11,0.08);border-radius:8px;border-left:3px solid var(--warning);margin-bottom:14px">
            <div style="font-size:0.75rem;font-weight:700;color:var(--warning);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">Segurança</div>
            ${Calc.protocolo1RM.safetyNotes.map(n=>`<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:3px">• ${n}</div>`).join('')}
          </div>

          <div style="border-top:1px solid var(--border-color);padding-top:14px">
            <div class="text-xs text-muted mb-sm" style="font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Comparação das fórmulas</div>
            <table class="data-table" style="font-size:0.8rem">
              <thead><tr><th>Fórmula</th><th>Melhor para</th><th>Reps ideais</th></tr></thead>
              <tbody>
                <tr><td><strong>Epley</strong></td><td>Uso geral — mais usada</td><td>1-10 reps</td></tr>
                <tr><td><strong>Brzycki</strong></td><td>Baixo número de reps</td><td>1-6 reps</td></tr>
                <tr><td><strong>Lander</strong></td><td>Alta precisão geral</td><td>1-10 reps</td></tr>
                <tr><td><strong>Lombardi</strong></td><td>Altas repetições</td><td>6-12 reps</td></tr>
                <tr><td><strong>Mayhew</strong></td><td>Bench press específico</td><td>4-10 reps</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- FICHA COMPLETA POR ALUNO -->
<div id="panel-ficha" class="assessment-panel" style="display:none">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Ficha Completa de Avaliação</span>
          <div class="flex gap-sm">
            <select class="form-select" id="fichaStudentSel" style="width:auto">
              <option value="">Selecione um aluno</option>
              ${activeStudents.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" id="fichaExportBtn" style="display:none">Gerar PDF</button>
          </div>
        </div>
        <div id="fichaContent">
          <div class="empty-state" style="padding:40px">
            <div class="empty-icon">—</div>
            <h3>Selecione um aluno</h3>
            <p>A ficha completa de avaliação será gerada com todos os dados registrados</p>
          </div>
        </div>
      </div>
    </div>

        <div id="panel-evolucao" class="assessment-panel" style="display:none">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Evolução do Aluno</span>
          <select class="form-select" id="evolStudentSel" style="width:auto">
            <option value="">Selecione um aluno</option>
            ${activeStudents.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div id="evolucaoContent">
          <p class="text-muted text-sm" style="padding:20px;text-align:center">Selecione um aluno para ver a evolução</p>
        </div>
      </div>
    </div>
  `;
}
function renderComposicaoPanel(assessments, students) {
  if (!assessments.length) return `<div class="empty-state"><div class="empty-icon">—</div><h3>Nenhuma avaliação de composição corporal</h3><p>Clique em "+ Nova Avaliação" para adicionar</p></div>`;
  return `
    <div class="table-container">
      <table class="data-table">
        <thead><tr><th>Aluno</th><th>Data</th><th>Peso</th><th>Altura</th><th>IMC</th><th>% Gordura</th><th>M. Magra</th><th>M. Gorda</th><th>RCQ</th><th>Cintura</th><th></th></tr></thead>
        <tbody>${assessments.map(a => {
          const st  = students.find(s => s.id === a.studentId);
          const imc = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
          const imcC = imc ? Calc.imcClassificacao(imc) : null;
          return `<tr>
            <td>
              <div class="flex items-center gap-sm">
                <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                ${st?.name||'?'}
              </div>
            </td>
            <td style="font-size:0.82rem">${Calc.formatDate(a.date)}</td>
            <td style="font-weight:600">${a.peso?a.peso+'kg':'-'}</td>
            <td>${a.altura?a.altura+'cm':'-'}</td>
            <td>${imc?`<span class="badge badge-${imcC.color}" title="${imcC.label}">${Calc.formatNum(imc)}</span>`:'-'}</td>
            <td style="color:${(a.percentualGordura||0)>25?'var(--warning)':'var(--success)'}">
              ${a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'-'}
            </td>
            <td style="color:var(--primary);font-weight:600">${a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'-'}</td>
            <td>${a.massaGorda?Calc.formatNum(a.massaGorda)+'kg':'-'}</td>
            <td>${a.rcq?Calc.formatNum(a.rcq):'-'}</td>
            <td>${a.cintura?a.cintura+'cm':'-'}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm view-assessment" data-id="${a.id}" title="Ver detalhes" style="padding:4px 6px;color:var(--accent)">${ICON_EYE}</button>
                <button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" title="Excluir" style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

function renderForcaPanel(assessments, students) {
  if (!assessments.length) return `<div class="empty-state"><div class="empty-icon">—</div><h3>Nenhuma avaliação de força</h3><p>Registre testes de 1RM e estimativas por exercício</p></div>`;

  // Agrupar por aluno para mostrar PR (personal record)
  const byStudent = {};
  assessments.forEach(a => {
    if (!byStudent[a.studentId]) byStudent[a.studentId] = [];
    byStudent[a.studentId].push(a);
  });

  return `
    <div class="table-container">
      <table class="data-table">
        <thead><tr><th>Aluno</th><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Estimado</th><th>Fórmula</th><th>PR?</th><th></th></tr></thead>
        <tbody>${assessments.map(a => {
          const st = students.find(s => s.id === a.studentId);
          // Verificar se é PR do aluno neste exercício
          const studentRecs = (byStudent[a.studentId]||[]).filter(x=>x.exercise===a.exercise);
          const maxRm1 = Math.max(...studentRecs.map(x=>x.rm1||0));
          const isPR   = a.rm1 && a.rm1 >= maxRm1;
          return `<tr>
            <td>
              <div class="flex items-center gap-sm">
                <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                ${st?.name||'?'}
              </div>
            </td>
            <td style="font-size:0.82rem">${Calc.formatDate(a.date)}</td>
            <td style="font-weight:600">${a.exercise||'-'}</td>
            <td>${a.carga?a.carga+'kg':'-'}</td>
            <td>${a.reps||'-'}</td>
            <td style="color:var(--primary);font-weight:700;font-size:1rem">${a.rm1?a.rm1+'kg':'-'}</td>
            <td style="font-size:0.75rem;color:var(--text-muted)">${a.formula||'Epley'}</td>
            <td>${isPR?`<span style="color:#fbbf24;font-size:0.8rem;font-weight:700">PR ★</span>`:''}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm view-rm1" data-id="${a.id}" title="Ver zonas de carga" style="padding:4px 6px;color:var(--accent)">${ICON_EYE}</button>
                <button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" title="Excluir" style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

function renderConconiPanel(assessments, students) {
  if (!assessments.length) return `<div class="empty-state"><div class="empty-icon">—</div><h3>Nenhum teste Conconi</h3><p>Registre testes de limiar anaeróbio</p></div>`;
  return `
    <div class="table-container">
      <table class="data-table">
        <thead><tr><th>Aluno</th><th>Data</th><th>FC Pico</th><th>VMA</th><th>VO₂max est.</th><th>Limiar 2</th><th>FC Limiar</th><th></th></tr></thead>
        <tbody>${assessments.map(a => {
          const st = students.find(s => s.id === a.studentId);
          return `<tr>
            <td>
              <div class="flex items-center gap-sm">
                <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                ${st?.name||'?'}
              </div>
            </td>
            <td style="font-size:0.82rem">${Calc.formatDate(a.date)}</td>
            <td style="color:var(--danger);font-weight:600">${a.fcPico?a.fcPico+' bpm':'-'}</td>
            <td style="color:var(--primary);font-weight:600">${a.vma?a.vma+' km/h':'-'}</td>
            <td style="color:var(--accent)">${a.vo2max?Calc.formatNum(a.vo2max)+' ml/kg/min':'-'}</td>
            <td>${a.limiar2?a.limiar2+' km/h':'-'}</td>
            <td>${a.fcLimiar?a.fcLimiar+' bpm':'-'}</td>
            <td>
              <button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" title="Excluir" style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

function composicaoFormHTML(students) {
  return `<form id="assessForm">
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
      <div class="form-group"><label class="form-label">Gênero</label>
        <select class="form-select" name="genero">
          <option value="M">Masculino</option><option value="F">Feminino</option>
        </select>
      </div>
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
      <h4 style="margin-bottom:6px">Dobras Cutâneas — 3 dobras (mm)</h4>
      <p class="text-xs text-muted mb-sm">Protocolo Jackson &amp; Pollock. Masculino: Peitoral, Abdominal, Coxa. Feminino: Tríceps, Suprailíaca, Coxa.</p>
      <div class="form-row">
        <div class="form-group"><label class="form-label" id="dobra1Label">Peitoral / Tríceps</label><input class="form-input" name="dobra1" type="number" step="0.1" placeholder="mm" /></div>
        <div class="form-group"><label class="form-label" id="dobra2Label">Abdominal / Suprailíaca</label><input class="form-input" name="dobra2" type="number" step="0.1" placeholder="mm" /></div>
        <div class="form-group"><label class="form-label">Coxa</label><input class="form-input" name="dobra3" type="number" step="0.1" placeholder="mm" /></div>
      </div>
    </div>

    <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px">
      <h4 style="margin-bottom:10px">Circunferências (cm)</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Cintura</label><input class="form-input" name="cintura" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Quadril</label><input class="form-input" name="quadril" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Pescoço</label><input class="form-input" name="pescoco" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Braço (D)</label><input class="form-input" name="braco" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Coxa (D)</label><input class="form-input" name="coxa" type="number" step="0.1" placeholder="cm" /></div>
        <div class="form-group"><label class="form-label">Panturrilha</label><input class="form-input" name="panturrilha" type="number" step="0.1" placeholder="cm" /></div>
      </div>
    </div>

    <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px">
      <h4 style="margin-bottom:10px">Observações e % Gordura Manual</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">% Gordura (manual, se não usar dobras)</label><input class="form-input" name="percentualGorduraManual" type="number" step="0.1" placeholder="Ex: 18.5" /></div>
        <div class="form-group"><label class="form-label">PA Sistólica (mmHg)</label><input class="form-input" name="paSistolica" type="number" placeholder="Ex: 120" /></div>
        <div class="form-group"><label class="form-label">PA Diastólica (mmHg)</label><input class="form-input" name="paDiastolica" type="number" placeholder="Ex: 80" /></div>
      </div>
      <div class="form-group"><label class="form-label">Observações</label>
        <textarea class="form-textarea" name="notes" rows="2" placeholder="Notas da avaliação..."></textarea>
      </div>
    </div>
  </form>`;
}

export function initAssessments(navigateFn) {
  // Tabs
  document.querySelectorAll('#assessmentTypeTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#assessmentTypeTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.assessment-panel').forEach(p => p.style.display = 'none');
      document.getElementById(`panel-${tab.dataset.type}`)?.style.setProperty('display', '');
    });
  });

  // Filtro por aluno — esconde linhas da tabela
  document.getElementById('assStudentFilter')?.addEventListener('change', e => {
    const sid = e.target.value;
    document.querySelectorAll('.assessment-panel table tbody tr').forEach(row => {
      row.style.display = !sid || row.dataset.student === sid || !row.dataset.student ? '' : 'none';
    });
  });

  // Zonas de FC
  document.getElementById('zonaStudentSel')?.addEventListener('change', e => {
    const birth = e.target.selectedOptions[0]?.dataset.birth;
    if (birth) {
      const age = Calc.calcularIdade(birth);
      const el = document.getElementById('zonaIdade');
      if (el) el.value = age;
    }
  });

  document.getElementById('calcZonas')?.addEventListener('click', () => {
    const idade = parseInt(document.getElementById('zonaIdade')?.value);
    const fcRep = parseInt(document.getElementById('zonaFcRep')?.value);
    if (!idade || !fcRep) { notify.warning('Preencha idade e FC repouso'); return; }
    const fcMax = Calc.fcMax(idade);
    const zonas = Calc.zonasTreino(fcMax, fcRep);
    document.getElementById('zonasResult').innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:10px;background:var(--bg-page);border-radius:8px">
        <div>
          <div class="text-xs text-muted">FC Máxima (Tanaka)</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--danger)">${fcMax} <span style="font-size:0.8rem">bpm</span></div>
        </div>
        <div>
          <div class="text-xs text-muted">FC Reserva</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${fcMax - fcRep} <span style="font-size:0.8rem">bpm</span></div>
        </div>
      </div>
      <table class="data-table" style="font-size:0.82rem">
        <thead><tr><th>Zona</th><th>Nome</th><th>% FCR</th><th>FC Mín</th><th>FC Máx</th><th>Objetivo</th></tr></thead>
        <tbody>${zonas.map(z => `<tr>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${z.cor};margin-right:6px"></span>Z${z.zona}</td>
          <td style="font-weight:600">${z.nome}</td>
          <td>${z.min}-${z.max}%</td>
          <td style="color:${z.cor};font-weight:600">${z.fcMin} bpm</td>
          <td style="color:${z.cor};font-weight:600">${z.fcMax} bpm</td>
          <td class="text-xs text-muted">${z.objetivo||'-'}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  });

  // Zonas de 1RM
  document.getElementById('rm1StudentSel')?.addEventListener('change', async e => {
    const sid = e.target.value;
    const ex  = document.getElementById('rm1ExSel')?.value;
    if (!sid || !ex) return;
    const assessments = await db.getAll('assessments');
    const last = assessments
      .filter(a => a.studentId === sid && a.exercise === ex && a.rm1)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (last) {
      const el = document.getElementById('rm1Value');
      if (el) { el.value = last.rm1; notify.info(`Último 1RM de ${ex}: ${last.rm1}kg (${Calc.formatDate(last.date)})`); }
    }
  });

  document.getElementById('calcRM1Zones')?.addEventListener('click', () => {
    const rm1 = parseFloat(document.getElementById('rm1Value')?.value);
    const ex  = document.getElementById('rm1ExSel')?.value || 'Exercício';
    if (!rm1) { notify.warning('Informe o 1RM'); return; }
    const zones = rm1Zones(rm1);
    document.getElementById('rm1ZonesResult').innerHTML = `
      <div style="margin-bottom:10px;padding:10px;background:var(--bg-page);border-radius:8px">
        <div class="text-xs text-muted">${ex}</div>
        <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${rm1}kg <span style="font-size:0.8rem;color:var(--text-muted)">1RM</span></div>
      </div>
      <table class="data-table" style="font-size:0.82rem">
        <thead><tr><th>%1RM</th><th>Carga</th><th>Reps</th><th>Objetivo</th></tr></thead>
        <tbody>${zones.map(z => `<tr>
          <td style="color:${z.color};font-weight:700">${z.pct}%</td>
          <td style="color:${z.color};font-weight:700">${z.load}kg</td>
          <td>${z.reps}</td>
          <td class="text-xs text-muted">${z.label}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  });

  // Evolução por aluno
  document.getElementById('evolStudentSel')?.addEventListener('change', async e => {
    const sid = e.target.value;
    if (!sid) return;
    const [assessments, students] = await Promise.all([db.getAll('assessments'), db.getAll('students')]);
    const student = students.find(s => s.id === sid);
    const sAss = assessments.filter(a => a.studentId === sid).sort((a,b) => new Date(a.date)-new Date(b.date));
    const comp  = sAss.filter(a => a.type === 'composicao');
    const forca = sAss.filter(a => a.type === 'forca');
    const content = document.getElementById('evolucaoContent');
    if (!content) return;
    if (!sAss.length) { content.innerHTML = '<p class="text-muted text-sm" style="padding:20px;text-align:center">Nenhuma avaliação para este aluno</p>'; return; }

    content.innerHTML = `
      ${comp.length >= 2 ? `
      <div style="margin-bottom:20px">
        <h4 style="margin-bottom:12px">Evolução Corporal</h4>
        <div style="overflow-x:auto">
          <table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Data</th><th>Peso</th><th>% Gordura</th><th>M. Magra</th><th>IMC</th><th>Cintura</th><th>Δ Peso</th></tr></thead>
            <tbody>${comp.map((a, i) => {
              const prev = comp[i-1];
              const deltaPeso = prev && a.peso && prev.peso ? (a.peso - prev.peso) : null;
              const imc = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
              return `<tr>
                <td style="font-size:0.78rem">${Calc.formatDate(a.date)}</td>
                <td style="font-weight:600">${a.peso?a.peso+'kg':'-'}</td>
                <td style="color:${(a.percentualGordura||0)>25?'var(--warning)':'var(--success)'}">${a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'-'}</td>
                <td style="color:var(--primary);font-weight:600">${a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'-'}</td>
                <td>${imc?Calc.formatNum(imc):'-'}</td>
                <td>${a.cintura?a.cintura+'cm':'-'}</td>
                <td style="color:${deltaPeso===null?'inherit':deltaPeso<0?'var(--success)':'var(--danger)'};font-weight:600">
                  ${deltaPeso===null?'—':(deltaPeso>0?'+':'')+Calc.formatNum(deltaPeso)+'kg'}
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div style="height:160px;margin-top:12px"><canvas id="evolPesoChart"></canvas></div>
      </div>` : ''}

      ${forca.length ? `
      <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:8px">
        <h4 style="margin-bottom:12px">Histórico de Força / 1RM</h4>
        <div style="overflow-x:auto">
          <table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Est.</th><th>PR?</th></tr></thead>
            <tbody>${forca.map(a => {
              const byEx = forca.filter(x=>x.exercise===a.exercise);
              const maxRm1 = Math.max(...byEx.map(x=>x.rm1||0));
              const isPR = a.rm1 && a.rm1 >= maxRm1;
              return `<tr>
                <td style="font-size:0.78rem">${Calc.formatDate(a.date)}</td>
                <td style="font-weight:600">${a.exercise||'-'}</td>
                <td>${a.carga?a.carga+'kg':'-'}</td>
                <td>${a.reps||'-'}</td>
                <td style="color:var(--primary);font-weight:700">${a.rm1?a.rm1+'kg':'-'}</td>
                <td>${isPR?'<span style="color:#fbbf24;font-weight:700">★ PR</span>':''}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>` : ''}
    `;

    // Gráfico de peso
    if (comp.length >= 2 && typeof Chart !== 'undefined') {
      const canvas = document.getElementById('evolPesoChart');
      if (canvas) {
        new Chart(canvas, {
          type: 'line',
          data: {
            labels: comp.map(a => Calc.formatDate(a.date)),
            datasets: [
              { label: 'Peso (kg)', data: comp.map(a=>a.peso||null), borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.07)', tension:0.3, pointRadius:4, fill:true },
              { label: 'M. Magra (kg)', data: comp.map(a=>a.massaMagra||null), borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.07)', tension:0.3, pointRadius:4, fill:true },
            ]
          },
          options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ labels:{ color:'#94a3b8', font:{size:10}, boxWidth:12 } } },
            scales:{
              y:{ ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(148,163,184,0.07)' } },
              x:{ ticks:{ color:'#94a3b8', font:{size:9} }, grid:{ display:false } }
            }
          }
        });
      }
    }
  });

  // Visualizar avaliação de composição
  document.querySelectorAll('.view-assessment').forEach(btn => {
    btn.addEventListener('click', async () => {
      const a  = await db.get('assessments', btn.dataset.id);
      if (!a) return;
      const st = await db.get('students', a.studentId);
      const imc = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
      const imcC = imc ? Calc.imcClassificacao(imc) : null;
      openModal({
        title: `Avaliação — ${st?.name || 'Aluno'}`, size: 'lg',
        content: `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
            ${[
              ['Data', Calc.formatDate(a.date)],
              ['Peso', a.peso?a.peso+'kg':'-'],
              ['Altura', a.altura?a.altura+'cm':'-'],
              ['IMC', imc?`${Calc.formatNum(imc)} (${imcC?.label||'-'})`:'-'],
              ['% Gordura', a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'-'],
              ['Massa Magra', a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'-'],
              ['Massa Gorda', a.massaGorda?Calc.formatNum(a.massaGorda)+'kg':'-'],
              ['RCQ', a.rcq?Calc.formatNum(a.rcq):'-'],
              ['Cintura', a.cintura?a.cintura+'cm':'-'],
              ['Quadril', a.quadril?a.quadril+'cm':'-'],
              ['Braço', a.braco?a.braco+'cm':'-'],
              ['Coxa', a.coxa?a.coxa+'cm':'-'],
              ['PA', a.paSistolica?`${a.paSistolica}/${a.paDiastolica} mmHg`:'-'],
            ].map(([l,v])=>`<div style="padding:8px;background:var(--bg-page);border-radius:6px">
              <div class="text-xs text-muted">${l}</div>
              <div style="font-weight:600;margin-top:2px">${v}</div>
            </div>`).join('')}
          </div>
          ${a.notes?`<div class="text-sm text-muted"><strong>Observações:</strong> ${a.notes}</div>`:''}
        `
      });
    });
  });

  // Visualizar zonas de 1RM
  document.querySelectorAll('.view-rm1').forEach(btn => {
    btn.addEventListener('click', async () => {
      const a  = await db.get('assessments', btn.dataset.id);
      if (!a || !a.rm1) return;
      const zones = rm1Zones(a.rm1);
      openModal({
        title: `Zonas de Carga — ${a.exercise}`, size: 'md',
        content: `
          <div style="margin-bottom:12px;padding:10px;background:var(--bg-page);border-radius:8px">
            <div class="text-xs text-muted">1RM estimado · ${a.formula||'Epley'}</div>
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

  // Excluir
  document.querySelectorAll('.delete-assessment').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir esta avaliação?')) {
        await db.delete('assessments', btn.dataset.id);
        notify.success('Avaliação removida');
        navigateFn('/avaliacoes');
      }
    });
  });

  // ── PROTOCOLO 1RM SUBMAX ─────────────────────────────────
  // Preview em tempo real ao preencher carga/reps
  document.querySelectorAll('.rm1-carga, .rm1-reps').forEach(inp => {
    inp.addEventListener('input', () => {
      const i      = inp.dataset.set;
      const carga  = parseFloat(document.querySelector(`.rm1-carga[data-set="${i}"]`)?.value);
      const reps   = parseInt(document.querySelector(`.rm1-reps[data-set="${i}"]`)?.value);
      const form   = document.getElementById('rm1protFormula')?.value || 'epley';
      const resEl  = document.querySelector(`.rm1-result[data-set="${i}"]`);
      if (carga && reps && resEl) {
        const est = Calc.rm1Estimado(carga, reps, form);
        resEl.textContent = est ? est + 'kg' : '—';
      }
      // Atualizar melhor estimativa
      updateRM1ProtResult();
    });
  });

  document.getElementById('rm1protFormula')?.addEventListener('change', () => {
    document.querySelectorAll('.rm1-carga').forEach(inp => inp.dispatchEvent(new Event('input')));
  });

  function updateRM1ProtResult() {
    const form = document.getElementById('rm1protFormula')?.value || 'epley';
    const series = [];
    for (let i = 0; i < 5; i++) {
      const carga = parseFloat(document.querySelector(`.rm1-carga[data-set="${i}"]`)?.value);
      const reps  = parseInt(document.querySelector(`.rm1-reps[data-set="${i}"]`)?.value);
      if (carga && reps) series.push({ carga, reps, formula: form });
    }
    const best = Calc.melhorEstimativa1RM(series);
    const resEl = document.getElementById('rm1protResult');
    const srcEl = document.getElementById('rm1protSource');
    if (best && resEl) {
      resEl.textContent = best.rm1 + ' kg';
      if (srcEl) srcEl.textContent = `Série ${parseInt(series.findIndex(s=>s.carga===best.carga && s.reps===best.reps))+1} · ${best.carga}kg × ${best.reps} reps · fórmula ${form}`;
    } else if (resEl) {
      resEl.textContent = '—';
    }
  }

  document.getElementById('saveRM1Prot')?.addEventListener('click', async () => {
    const sid  = document.getElementById('rm1protStudent')?.value;
    const ex   = document.getElementById('rm1protExercise')?.value;
    const form = document.getElementById('rm1protFormula')?.value || 'epley';
    if (!sid)  { notify.error('Selecione um aluno'); return; }
    if (!ex)   { notify.error('Informe o exercício'); return; }

    const series = [];
    for (let i = 0; i < 5; i++) {
      const carga = parseFloat(document.querySelector(`.rm1-carga[data-set="${i}"]`)?.value);
      const reps  = parseInt(document.querySelector(`.rm1-reps[data-set="${i}"]`)?.value);
      if (carga && reps) series.push({ set: i+1, carga, reps });
    }
    if (!series.length) { notify.error('Registre pelo menos uma série'); return; }

    const best = Calc.melhorEstimativa1RM(series.map(s => ({ ...s, formula: form })));
    if (!best?.rm1) { notify.error('Não foi possível calcular o 1RM'); return; }

    // Verificar se é PR
    const all = await db.getAll('assessments');
    const prev = all.filter(a => a.studentId === sid && a.exercise === ex && a.rm1).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const isPR = !prev.length || best.rm1 > prev[0].rm1;

    await db.add('assessments', {
      studentId: sid, type: 'forca', exercise: ex,
      carga: best.carga, reps: best.reps, rm1: best.rm1,
      formula: form, series, protocolo: 'submax',
      isPR, date: new Date().toISOString().slice(0, 10),
      notes: `Protocolo submax · ${series.length} séries · fórmula ${form}`,
    });

    notify.success(`1RM ${isPR ? '🏆 PR! ' : ''}Estimado: ${best.rm1}kg salvo!`);
    navigateFn('/avaliacoes');
  });

  // ── FICHA COMPLETA POR ALUNO ──────────────────────────────
  document.getElementById('fichaStudentSel')?.addEventListener('change', async (e) => {
    const sid = e.target.value;
    const exportBtn = document.getElementById('fichaExportBtn');
    if (!sid) {
      document.getElementById('fichaContent').innerHTML = `
        <div class="empty-state" style="padding:40px">
          <div class="empty-icon">—</div><h3>Selecione um aluno</h3>
        </div>`;
      if (exportBtn) exportBtn.style.display = 'none';
      return;
    }
    if (exportBtn) exportBtn.style.display = '';
    await renderFichaCompleta(sid);
  });

  document.getElementById('fichaExportBtn')?.addEventListener('click', async () => {
    const sid = document.getElementById('fichaStudentSel')?.value;
    if (!sid) return;
    await exportFichaPDF(sid);
  });


  // + Nova Avaliação
  document.getElementById('addAssessmentBtn')?.addEventListener('click', async () => {
    const activeTab = document.querySelector('#assessmentTypeTabs .tab.active');
    const type = activeTab?.dataset.type || 'composicao';
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');

    if (type === 'composicao') {
      openModal({
        title: '+ Avaliação de Composição Corporal', size: 'xl',
        content: composicaoFormHTML(students),
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('assessForm'));
            const d  = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione um aluno'); return; }
            d.type  = 'composicao';
            d.peso  = parseFloat(d.peso)  || null;
            d.altura= parseFloat(d.altura)|| null;
            if (d.peso && d.altura) d.imc = Math.round(Calc.imc(d.peso, d.altura) * 10) / 10;
            const st    = await db.get('students', d.studentId);
            const idade = parseInt(d.idadeCalc) || (st?.birthDate ? Calc.calcularIdade(st.birthDate) : 30);
            if (d.dobra1 && d.dobra2 && d.dobra3) {
              const pct  = Calc.percentualGordura3dobras(d.genero, idade, parseFloat(d.dobra1), parseFloat(d.dobra2), parseFloat(d.dobra3));
              const comp = Calc.composicaoCorporal(d.peso, pct);
              d.percentualGordura = comp.percentualGordura;
              d.massaMagra        = comp.massaMagra;
              d.massaGorda        = comp.massaGorda;
            } else if (d.percentualGorduraManual) {
              const pct  = parseFloat(d.percentualGorduraManual);
              const comp = Calc.composicaoCorporal(d.peso, pct);
              d.percentualGordura = comp.percentualGordura;
              d.massaMagra        = comp.massaMagra;
              d.massaGorda        = comp.massaGorda;
            }
            if (d.cintura && d.quadril) d.rcq = Math.round(Calc.rcq(parseFloat(d.cintura), parseFloat(d.quadril)) * 100) / 100;
            await db.add('assessments', d);
            notify.success('Avaliação salva!');
            closeModal(); navigateFn('/avaliacoes');
          }}
        ]
      });
      setTimeout(() => {
        document.querySelector('[name="genero"]')?.addEventListener('change', e => {
          document.getElementById('dobra1Label').textContent = e.target.value === 'F' ? 'Tríceps' : 'Peitoral';
          document.getElementById('dobra2Label').textContent = e.target.value === 'F' ? 'Suprailíaca' : 'Abdominal';
        });
      }, 100);

    } else if (type === 'forca') {
      openModal({
        title: '+ Avaliação de Força / 1RM', size: 'lg',
        content: `<form id="assessForm">
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
          <div class="form-group"><label class="form-label">Exercício *</label>
            <input class="form-input" name="exercise" list="rmExList" placeholder="Ex: Supino Reto" required />
            <datalist id="rmExList">${RM_EXERCISES.map(e=>`<option value="${e}">`).join('')}</datalist>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Carga testada (kg) *</label>
              <input class="form-input" name="carga" id="rmCarga" type="number" step="0.5" required />
            </div>
            <div class="form-group"><label class="form-label">Reps realizadas *</label>
              <input class="form-input" name="reps" id="rmReps" type="number" min="1" max="30" required />
            </div>
            <div class="form-group"><label class="form-label">Fórmula de estimativa</label>
              <select class="form-select" name="formula" id="rmFormula">
                <option value="epley">Epley (padrão)</option>
                <option value="brzycki">Brzycki</option>
                <option value="lander">Lander</option>
                <option value="lombardi">Lombardi</option>
              </select>
            </div>
          </div>
          <div style="padding:12px;background:var(--bg-page);border-radius:8px;margin-top:8px">
            <div class="text-xs text-muted mb-xs">1RM Estimado em tempo real</div>
            <div id="rm1Preview" style="font-size:1.6rem;font-weight:800;color:var(--primary)">— kg</div>
          </div>
          <div class="form-group mt-sm"><label class="form-label">Observações</label>
            <textarea class="form-textarea" name="notes" rows="2" placeholder="Condições do teste, observações..."></textarea>
          </div>
        </form>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('assessForm'));
            const d  = Object.fromEntries(fd);
            if (!d.studentId || !d.exercise) { notify.error('Preencha os campos obrigatórios'); return; }
            d.type  = 'forca';
            d.carga = parseFloat(d.carga) || 0;
            d.reps  = parseInt(d.reps)    || 1;
            d.rm1   = calcRM1(d.carga, d.reps, d.formula);
            await db.add('assessments', d);
            notify.success(`1RM salvo: ${d.rm1}kg`);
            closeModal(); navigateFn('/avaliacoes');
          }}
        ]
      });
      // Preview 1RM em tempo real
      setTimeout(() => {
        const update = () => {
          const c = parseFloat(document.getElementById('rmCarga')?.value);
          const r = parseInt(document.getElementById('rmReps')?.value);
          const f = document.getElementById('rmFormula')?.value || 'epley';
          const el = document.getElementById('rm1Preview');
          if (el && c && r) el.textContent = calcRM1(c, r, f) + ' kg';
        };
        document.getElementById('rmCarga')?.addEventListener('input', update);
        document.getElementById('rmReps')?.addEventListener('input', update);
        document.getElementById('rmFormula')?.addEventListener('change', update);
      }, 100);

    } else if (type === 'conconi') {
      openModal({
        title: '+ Teste Conconi / Limiar', size: 'md',
        content: `<form id="assessForm">
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
          <div class="form-row">
            <div class="form-group"><label class="form-label">FC Pico (bpm)</label>
              <input class="form-input" name="fcPico" type="number" placeholder="Ex: 185" />
            </div>
            <div class="form-group"><label class="form-label">FC Limiar Anaeróbio (bpm)</label>
              <input class="form-input" name="fcLimiar" type="number" placeholder="Ex: 160" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">VMA (km/h)</label>
              <input class="form-input" name="vma" type="number" step="0.1" placeholder="Ex: 16.5" />
            </div>
            <div class="form-group"><label class="form-label">Limiar 2 — velocidade (km/h)</label>
              <input class="form-input" name="limiar2" type="number" step="0.1" placeholder="Ex: 13.0" />
            </div>
            <div class="form-group"><label class="form-label">VO₂max estimado (ml/kg/min)</label>
              <input class="form-input" name="vo2max" type="number" step="0.1" placeholder="Calculado auto" id="vo2maxInput" />
            </div>
          </div>
          <div class="form-group"><label class="form-label">Observações</label>
            <textarea class="form-textarea" name="notes" rows="2" placeholder="Protocolo utilizado, condições do teste..."></textarea>
          </div>
        </form>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
          { label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('assessForm'));
            const d  = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione um aluno'); return; }
            d.type   = 'conconi';
            d.vma    = parseFloat(d.vma)    || null;
            d.fcPico = parseInt(d.fcPico)   || null;
            d.limiar2= parseFloat(d.limiar2)|| null;
            d.fcLimiar= parseInt(d.fcLimiar)|| null;
            if (d.vma && !d.vo2max) d.vo2max = Calc.vo2maxConconi(d.vma);
            else d.vo2max = parseFloat(d.vo2max) || null;
            await db.add('assessments', d);
            notify.success('Teste Conconi salvo!');
            closeModal(); navigateFn('/avaliacoes');
          }}
        ]
      });
      setTimeout(() => {
        document.querySelector('[name="vma"]')?.addEventListener('input', e => {
          const vma = parseFloat(e.target.value);
          if (vma) {
            const vo2 = Calc.vo2maxConconi(vma);
            const el  = document.getElementById('vo2maxInput');
            if (el) el.value = vo2;
          }
        });
      }, 100);
    }
  });
}

// ── FICHA COMPLETA ────────────────────────────────────────────
async function renderFichaCompleta(sid) {
  const content    = document.getElementById('fichaContent');
  if (!content) return;
  content.innerHTML = '<div class="text-muted text-sm" style="padding:20px">Carregando...</div>';

  const student    = await db.get('students', sid);
  const assessments= (await db.getAll('assessments')).filter(a => a.studentId === sid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const biofeedback= (await db.getAll('biofeedback')).filter(b => b.studentId === sid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const anamnesis  = (await db.getAll('anamnesis')).filter(a => a.trainer_id || true).find(a => a.fullName === student?.name);
  const sessions   = (await db.getAll('sessions')).filter(s => s.studentId === sid && s.status === 'completed');

  const comp  = assessments.filter(a => a.type === 'composicao');
  const forca = assessments.filter(a => a.type === 'forca');
  const conc  = assessments.filter(a => a.type === 'conconi');

  // PRs por exercício
  const prs = {};
  forca.forEach(a => {
    if (!prs[a.exercise] || a.rm1 > prs[a.exercise].rm1) prs[a.exercise] = a;
  });

  // Biofeedback médias últimos 10
  const bf10 = biofeedback.slice(0, 10);
  const avgBf = (key) => bf10.length ? Math.round(bf10.reduce((t,b)=>t+(b[key]||0),0)/bf10.length*10)/10 : null;

  const age = student?.birthDate ? Calc.calcularIdade(student.birthDate) : student?.age;

  content.innerHTML = `
    <div id="fichaBody">
      <!-- Cabeçalho -->
      <div class="flex items-center gap-lg mb-lg" style="padding-bottom:16px;border-bottom:2px solid var(--border-active)">
        <div class="avatar avatar-xl" style="width:64px;height:64px;font-size:1.6rem">
          ${(student?.name||'?').split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()}
        </div>
        <div style="flex:1">
          <h2 style="margin:0">${student?.name || '—'}</h2>
          <div class="text-muted text-sm mt-xs">${student?.code||''} · ${age ? age + ' anos' : '—'} · ${student?.goal||'—'}</div>
          <div class="flex gap-sm mt-xs">
            ${student?.phone ? `<span class="badge badge-info">${student.phone}</span>` : ''}
            ${student?.weeklyFrequency ? `<span class="badge badge-success">${student.weeklyFrequency}/sem</span>` : ''}
            ${student?.status ? `<span class="badge badge-${student.status==='Ativo'?'success':'warning'}">${student.status}</span>` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div class="text-xs text-muted">Última avaliação</div>
          <div style="font-weight:700;color:var(--primary)">${assessments[0] ? Calc.formatDate(assessments[0].date) : '—'}</div>
          <div class="text-xs text-muted mt-xs">Sessões realizadas</div>
          <div style="font-weight:700">${sessions.length}</div>
        </div>
      </div>

      ${comp.length ? `
      <!-- Composição Corporal -->
      <div class="card mb-md">
        <div class="card-header"><span class="card-title">Composição Corporal</span><span class="text-xs text-muted">${comp.length} avaliação(ões)</span></div>
        <div class="table-container">
          <table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th><th>Massa Magra</th><th>Massa Gorda</th><th>Cintura</th><th>RCQ</th></tr></thead>
            <tbody>
              ${comp.map((a,i) => {
                const imc  = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
                const imcC = imc ? Calc.imcClassificacao(imc) : null;
                const prev = comp[i+1];
                const dpeso= prev && a.peso ? Math.round((a.peso - prev.peso)*10)/10 : null;
                return `<tr>
                  <td style="white-space:nowrap">${Calc.formatDate(a.date)}</td>
                  <td>
                    <strong>${a.peso||'—'}kg</strong>
                    ${dpeso!=null ? `<span style="font-size:0.7rem;color:${dpeso<0?'var(--success)':'var(--danger)'};margin-left:4px">${dpeso>0?'+':''}${dpeso}kg</span>` : ''}
                  </td>
                  <td>${imc ? `<span class="badge badge-${imcC.color}">${Calc.formatNum(imc)}</span>` : '—'}</td>
                  <td style="color:${(a.percentualGordura||0)>30?'var(--danger)':'inherit'}">${a.percentualGordura ? Calc.formatNum(a.percentualGordura)+'%' : '—'}</td>
                  <td style="color:var(--success)">${a.massaMagra ? Calc.formatNum(a.massaMagra)+'kg' : '—'}</td>
                  <td>${a.massaGorda ? Calc.formatNum(a.massaGorda)+'kg' : '—'}</td>
                  <td>${a.cintura ? a.cintura+'cm' : '—'}</td>
                  <td>${a.rcq ? Calc.formatNum(a.rcq,2) : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      ${Object.keys(prs).length ? `
      <!-- PRs de Força -->
      <div class="card mb-md">
        <div class="card-header"><span class="card-title">Records Pessoais — 1RM Estimado</span><span class="text-xs text-muted">${forca.length} registro(s)</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:10px">
          ${Object.entries(prs).map(([ex, a]) => `
            <div style="padding:10px 12px;background:var(--bg-page);border-radius:8px;border:1px solid ${a.isPR?'rgba(16,185,129,0.3)':'var(--border-color)'}">
              <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px">${ex}</div>
              <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${a.rm1}kg</div>
              <div style="font-size:0.65rem;color:var(--text-muted)">${Calc.formatDate(a.date)}</div>
              ${a.isPR ? `<div style="font-size:0.65rem;color:var(--success);font-weight:700">PR</div>` : ''}
            </div>`).join('')}
        </div>
        <div class="table-container">
          <table class="data-table" style="font-size:0.78rem">
            <thead><tr><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM</th><th>Protocolo</th><th>Fórmula</th></tr></thead>
            <tbody>
              ${forca.slice(0,15).map(a=>`<tr>
                <td>${Calc.formatDate(a.date)}</td>
                <td><strong>${a.exercise||'—'}</strong></td>
                <td>${a.carga||'—'}kg</td>
                <td>${a.reps||'—'}</td>
                <td style="color:var(--primary);font-weight:700">${a.rm1||'—'}kg ${a.isPR?'<span style="color:var(--success);font-size:0.65rem">PR</span>':''}</td>
                <td style="font-size:0.72rem">${a.protocolo==='submax'?'Submax':'Direto'}</td>
                <td style="font-size:0.72rem;color:var(--text-muted)">${a.formula||'Epley'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      ${conc.length ? `
      <!-- Conconi / VO2max -->
      <div class="card mb-md">
        <div class="card-header"><span class="card-title">Protocolo Conconi / VO₂max</span></div>
        <div class="table-container">
          <table class="data-table" style="font-size:0.82rem">
            <thead><tr><th>Data</th><th>FC Pico</th><th>VMA</th><th>VO₂max</th><th>Limiar Anaeróbio</th></tr></thead>
            <tbody>
              ${conc.map(a=>`<tr>
                <td>${Calc.formatDate(a.date)}</td>
                <td>${a.fcPico||'—'} bpm</td>
                <td>${a.vma||'—'} km/h</td>
                <td style="color:var(--accent);font-weight:700">${a.vo2max||'—'} ml/kg/min</td>
                <td>${a.fcLimiar||'—'} bpm ${a.limiar2?`· ${a.limiar2} km/h`:''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      ${bf10.length ? `
      <!-- Biofeedback -->
      <div class="card mb-md">
        <div class="card-header"><span class="card-title">Biofeedback Recente</span><span class="text-xs text-muted">últimos ${bf10.length} registros</span></div>
        <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:12px">
          ${[
            ['Sono',        avgBf('sleep'),  false],
            ['Disposição',  avgBf('mood'),   false],
            ['Energia',     avgBf('energy'), false],
            ['Estresse',    avgBf('stress'), true ],
            ['PSE Médio',   avgBf('pse'),    true ],
          ].map(([l,v,inv])=>`<div class="stat-card" style="text-align:center;padding:10px">
            <div class="stat-label" style="font-size:0.62rem">${l}</div>
            <div style="font-size:1.3rem;font-weight:800;color:${v==null?'var(--text-muted)':inv?(v>=7?'var(--danger)':v>=5?'var(--warning)':'var(--success)'):(v<=3?'var(--danger)':v<=5?'var(--warning)':'var(--success)')}">${v??'—'}</div>
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${anamnesis ? `
      <!-- Anamnese -->
      <div class="card mb-md">
        <div class="card-header"><span class="card-title">Anamnese</span><span class="text-xs text-muted">${anamnesis.submittedAt ? Calc.formatDate(anamnesis.submittedAt) : ''}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.82rem">
          ${[
            ['Condições médicas',  anamnesis.conditions],
            ['Medicações',         anamnesis.medications],
            ['Lesões',             anamnesis.injuries],
            ['Atividade atual',    anamnesis.currentActivity],
            ['Experiência',        anamnesis.experience],
            ['Qualidade do sono',  anamnesis.sleepQuality],
            ['Nível de estresse',  anamnesis.stressLevel],
            ['Alimentação',        anamnesis.nutrition],
          ].filter(([,v])=>v).map(([l,v])=>`
            <div style="padding:6px 8px;background:var(--bg-page);border-radius:6px">
              <div class="text-xs text-muted">${l}</div>
              <div style="font-weight:500;margin-top:1px">${v}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}

      ${!assessments.length && !bf10.length ? `
      <div class="empty-state" style="padding:40px">
        <div class="empty-icon">—</div>
        <h3>Nenhuma avaliação registrada</h3>
        <p>Registre avaliações nas abas acima para preencher a ficha</p>
      </div>` : ''}
    </div>
  `;
}

async function exportFichaPDF(sid) {
  const student    = await db.get('students', sid);
  const assessments= (await db.getAll('assessments')).filter(a => a.studentId === sid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const biofeedback= (await db.getAll('biofeedback')).filter(b => b.studentId === sid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const sessions   = (await db.getAll('sessions')).filter(s => s.studentId === sid && s.status === 'completed');
  const settings   = await db.get('settings', 'trainer') || {};

  const comp  = assessments.filter(a => a.type === 'composicao');
  const forca = assessments.filter(a => a.type === 'forca');
  const conc  = assessments.filter(a => a.type === 'conconi');
  const prs   = {};
  forca.forEach(a => { if (!prs[a.exercise] || a.rm1 > prs[a.exercise].rm1) prs[a.exercise] = a; });
  const bf10  = biofeedback.slice(0, 10);
  const avgBf = (key) => bf10.length ? Math.round(bf10.reduce((t,b)=>t+(b[key]||0),0)/bf10.length*10)/10 : null;
  const age   = student?.birthDate ? Calc.calcularIdade(student.birthDate) : student?.age;
  const ini   = (student?.name||'?').split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"><title>Ficha — ${student?.name}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:24px 32px;font-size:12px;line-height:1.5;max-width:900px;margin:0 auto}
      .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #10b981;padding-bottom:12px;margin-bottom:16px}
      .avatar{width:52px;height:52px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex-shrink:0}
      h1{font-size:20px;color:#10b981}
      h2{font-size:13px;color:#10b981;border-bottom:1px solid #d1fae5;padding-bottom:4px;margin:16px 0 8px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
      th{background:#f3f4f6;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#555;border-bottom:2px solid #e5e7eb}
      td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
      tr:nth-child(even) td{background:#fafafa}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
      .badge-success{background:#d1fae5;color:#065f46}
      .badge-warning{background:#fef3c7;color:#92400e}
      .badge-danger{background:#fee2e2;color:#991b1b}
      .badge-info{background:#dbeafe;color:#1e40af}
      .prs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
      .pr-card{padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa}
      .pr-card .ex{font-size:10px;color:#666;margin-bottom:2px}
      .pr-card .val{font-size:18px;font-weight:800;color:#10b981}
      .pr-card .date{font-size:9px;color:#999}
      .bf-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px}
      .bf-card{text-align:center;padding:8px;border:1px solid #e5e7eb;border-radius:6px}
      .bf-card .lbl{font-size:9px;color:#666;text-transform:uppercase}
      .bf-card .val{font-size:16px;font-weight:800;color:#10b981;margin-top:2px}
      .footer{text-align:center;font-size:10px;color:#aaa;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:10px}
      @media print{body{padding:14px 18px}@page{margin:1.5cm}}
    </style>
    <script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script>
  </head><body>
    <div class="header">
      <div class="avatar">${ini}</div>
      <div>
        <h1>${student?.name||'—'}</h1>
        <p>${student?.code||''} · ${age?age+' anos':'—'} · ${student?.goal||'—'} · ${student?.status||''}</p>
      </div>
      <div style="margin-left:auto;text-align:right">
        <p style="font-size:11px;color:#666">Ficha gerada por ${settings.trainerName||'Personal PRO'}</p>
        <p style="font-size:11px;color:#666">${new Date().toLocaleDateString('pt-BR')}</p>
        <p style="font-size:11px;color:#666">${sessions.length} sessões realizadas</p>
      </div>
    </div>

    ${comp.length ? `
    <h2>Composição Corporal</h2>
    <table>
      <thead><tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th><th>Massa Magra</th><th>Massa Gorda</th><th>Cintura</th><th>RCQ</th></tr></thead>
      <tbody>${comp.map(a=>{
        const imc=a.peso&&a.altura?Calc.imc(a.peso,a.altura):null;
        const imcC=imc?Calc.imcClassificacao(imc):null;
        return `<tr>
          <td>${Calc.formatDate(a.date)}</td>
          <td><strong>${a.peso||'—'}kg</strong></td>
          <td>${imc?`<span class="badge badge-${imcC.color}">${Calc.formatNum(imc)}</span>`:'—'}</td>
          <td>${a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'—'}</td>
          <td style="color:#10b981;font-weight:600">${a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'—'}</td>
          <td>${a.massaGorda?Calc.formatNum(a.massaGorda)+'kg':'—'}</td>
          <td>${a.cintura?a.cintura+'cm':'—'}</td>
          <td>${a.rcq?Calc.formatNum(a.rcq,2):'—'}</td>
        </tr>`;}).join('')}
      </tbody>
    </table>` : ''}

    ${Object.keys(prs).length ? `
    <h2>Records Pessoais — 1RM Estimado</h2>
    <div class="prs">
      ${Object.entries(prs).map(([ex,a])=>`<div class="pr-card">
        <div class="ex">${ex}</div>
        <div class="val">${a.rm1}kg</div>
        <div class="date">${Calc.formatDate(a.date)} ${a.isPR?'· PR':''}${a.protocolo==='submax'?' · Submax':''}</div>
      </div>`).join('')}
    </div>
    <table>
      <thead><tr><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Est.</th><th>Fórmula</th><th>Protocolo</th></tr></thead>
      <tbody>${forca.map(a=>`<tr>
        <td>${Calc.formatDate(a.date)}</td>
        <td><strong>${a.exercise||'—'}</strong></td>
        <td>${a.carga||'—'}kg</td><td>${a.reps||'—'}</td>
        <td style="color:#10b981;font-weight:700">${a.rm1||'—'}kg ${a.isPR?'★':''}</td>
        <td>${a.formula||'Epley'}</td>
        <td>${a.protocolo==='submax'?'Submax':'Direto'}</td>
      </tr>`).join('')}</tbody>
    </table>` : ''}

    ${conc.length ? `
    <h2>Protocolo Conconi / VO₂max</h2>
    <table>
      <thead><tr><th>Data</th><th>FC Pico</th><th>VMA</th><th>VO₂max</th><th>Limiar Anaeróbio</th></tr></thead>
      <tbody>${conc.map(a=>`<tr>
        <td>${Calc.formatDate(a.date)}</td>
        <td>${a.fcPico||'—'} bpm</td>
        <td>${a.vma||'—'} km/h</td>
        <td style="color:#06b6d4;font-weight:700">${a.vo2max||'—'} ml/kg/min</td>
        <td>${a.fcLimiar||'—'} bpm ${a.limiar2?`· ${a.limiar2} km/h`:''}</td>
      </tr>`).join('')}</tbody>
    </table>` : ''}

    ${bf10.length ? `
    <h2>Biofeedback — Médias (últimos ${bf10.length} check-ins)</h2>
    <div class="bf-grid">
      ${[['Sono',avgBf('sleep')],['Disposição',avgBf('mood')],['Energia',avgBf('energy')],['Estresse',avgBf('stress')],['PSE',avgBf('pse')]].map(([l,v])=>`
        <div class="bf-card"><div class="lbl">${l}</div><div class="val">${v??'—'}</div></div>`).join('')}
    </div>` : ''}

    <div class="footer">Ficha gerada por ${settings.trainerName||'Personal PRO'} ${settings.cref?'· CREF '+settings.cref:''} — ${new Date().toLocaleDateString('pt-BR')} — Personal PRO · Sistema Profissional de Treinamento</div>
  </body></html>`;

  const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  link.href = blobUrl; link.target = '_blank'; link.rel = 'noopener';
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  notify.success('Ficha aberta! Use Ctrl+P para salvar como PDF.');
}
