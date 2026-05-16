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
  epley:   (l, r) => l * (1 + r / 30),
  brzycki: (l, r) => l * (36 / (37 - r)),
  lander:  (l, r) => (100 * l) / (101.3 - 2.67123 * r),
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
    { pct: 100, reps: '1',    label: 'Força Máxima',     color: '#ef4444' },
    { pct: 95,  reps: '2-3',  label: 'Força Máxima',     color: '#ef4444' },
    { pct: 90,  reps: '3-4',  label: 'Força',            color: '#f97316' },
    { pct: 85,  reps: '4-6',  label: 'Força/Hipertrofia',color: '#f97316' },
    { pct: 80,  reps: '6-8',  label: 'Hipertrofia',      color: '#eab308' },
    { pct: 75,  reps: '8-10', label: 'Hipertrofia',      color: '#eab308' },
    { pct: 70,  reps: '10-12',label: 'Hipertrofia/RML',  color: '#22c55e' },
    { pct: 65,  reps: '12-15',label: 'Resistência',      color: '#22c55e' },
    { pct: 60,  reps: '15-20',label: 'Resistência Musc.',color: '#3b82f6' },
    { pct: 50,  reps: '20+',  label: 'Resistência Musc.',color: '#3b82f6' },
  ].map(z => ({ ...z, load: Math.round(rm1 * (z.pct / 100) * 2) / 2 }));
}

export async function renderAssessments() {
  const students    = await db.getAll('students');
  const assessments = await db.getAll('assessments');
  assessments.sort((a, b) => new Date(b.date) - new Date(a.date));
  const activeStudents = students.filter(s => s.status === 'Ativo');

  const compAss  = assessments.filter(a => a.type === 'composicao');
  const forcaAss = assessments.filter(a => a.type === 'forca');
  const concAss  = assessments.filter(a => a.type === 'conconi');

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
      <button class="tab" data-type="forca">Força &amp; 1RM</button>
      <button class="tab" data-type="conconi">Protocolo Conconi</button>
      <button class="tab" data-type="zonas">Zonas de Treino</button>
      <button class="tab" data-type="evolucao">Evolução</button>
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

    <!-- EVOLUÇÃO -->
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
          const st  = students.find(s => s.id === a.studentId);
          const imc = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
          const imcC = imc ? Calc.imcClassificacao(imc) : null;
          return `<tr>
            <td>
              <div class="flex items-center gap-sm">
                <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${st?st.name[0]:'?'}</div>
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
          const isPR   = a.rm1 && a.rm1 >= maxRm1;
          return `<tr>
            <td>
              <div class="flex items-center gap-sm">
                <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${st?st.name[0]:'?'}</div>
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
                <div class="avatar avatar-sm" style="width:24px;height:24px;font-size:0.65rem">${st?st.name[0]:'?'}</div>
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
    const ex  = document.getElementById('rm1ExSel')?.value;
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
    const ex  = document.getElementById('rm1ExSel')?.value || 'Exercício';
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
    const comp  = sAss.filter(a => a.type === 'composicao');
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
      const a  = await db.get('assessments', btn.dataset.id);
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
      const a  = await db.get('assessments', btn.dataset.id);
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
            const d  = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione um aluno'); return; }
            d.type  = 'composicao';
            d.peso  = parseFloat(d.peso)  || null;
            d.altura= parseFloat(d.altura)|| null;
            if (d.peso && d.altura) d.imc = Math.round(Calc.imc(d.peso, d.altura) * 10) / 10;
            const st    = await db.get('students', d.studentId);
            const idade = parseInt(d.idadeCalc) || (st?.birthDate ? Calc.calcularIdade(st.birthDate) : 30);
            if (d.dobra1 && d.dobra2 && d.dobra3) {
              const pct  = Calc.percentualGordura3dobras(d.genero, idade, parseFloat(d.dobra1), parseFloat(d.dobra2), parseFloat(d.dobra3));
              const comp = Calc.composicaoCorporal(d.peso, pct);
              d.percentualGordura = comp.percentualGordura;
              d.massaMagra        = comp.massaMagra;
              d.massaGorda        = comp.massaGorda;
            } else if (d.percentualGorduraManual) {
              const pct  = parseFloat(d.percentualGorduraManual);
              const comp = Calc.composicaoCorporal(d.peso, pct);
              d.percentualGordura = comp.percentualGordura;
              d.massaMagra        = comp.massaMagra;
              d.massaGorda        = comp.massaGorda;
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
            const d  = Object.fromEntries(fd);
            if (!d.studentId || !d.exercise) { notify.error('Preencha os campos obrigatórios'); return; }
            d.type  = 'forca';
            d.carga = parseFloat(d.carga) || 0;
            d.reps  = parseInt(d.reps)    || 1;
            d.rm1   = calcRM1(d.carga, d.reps, d.formula);
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
            const d  = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione um aluno'); return; }
            d.type   = 'conconi';
            d.vma    = parseFloat(d.vma)    || null;
            d.fcPico = parseInt(d.fcPico)   || null;
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
            const el  = document.getElementById('vo2maxInput');
            if (el) el.value = vo2;
          }
        });
      }, 100);
    }
  });
}
