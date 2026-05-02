// ========================================
// PERSONAL PRO — Assessments Page
// ========================================

import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

export async function renderAssessments() {
  const students = await db.getAll('students');
  const assessments = await db.getAll('assessments');
  assessments.sort((a, b) => new Date(b.date) - new Date(a.date));
  const activeStudents = students.filter(s => s.status === 'Ativo');

  return `
    <div class="page-header">
      <div>
        <h1>Avaliações Físicas</h1>
        <p class="subtitle">${assessments.length} avaliação(ões) registrada(s)</p>
      </div>
      <button class="btn btn-primary" id="addAssessmentBtn">+ Nova Avaliação</button>
    </div>

    <div class="tabs" id="assessmentTypeTabs">
      <button class="tab active" data-type="composicao">Composição Corporal</button>
      <button class="tab" data-type="conconi">Protocolo Conconi</button>
      <button class="tab" data-type="forca">Avaliação de Força</button>
      <button class="tab" data-type="zonas">Zonas de Treino</button>
    </div>

    <!-- Composição Corporal -->
    <div id="panel-composicao" class="assessment-panel">
      ${renderComposicaoPanel(assessments.filter(a => a.type === 'composicao'), students)}
    </div>

    <!-- Conconi -->
    <div id="panel-conconi" class="assessment-panel hidden">
      ${renderConconiPanel(assessments.filter(a => a.type === 'conconi'), students)}
    </div>

    <!-- Força -->
    <div id="panel-forca" class="assessment-panel hidden">
      ${renderForcaPanel(assessments.filter(a => a.type === 'forca'), students)}
    </div>

    <!-- Zonas de Treino -->
    <div id="panel-zonas" class="assessment-panel hidden">
      <div class="card">
        <div class="card-header"><span class="card-title">Calculadora de Zonas de Treino</span></div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Idade</label>
            <input class="form-input" id="zonaIdade" type="number" placeholder="Ex: 30" />
          </div>
          <div class="form-group">
            <label class="form-label">FC Repouso (bpm)</label>
            <input class="form-input" id="zonaFcRep" type="number" placeholder="Ex: 65" />
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end">
            <button class="btn btn-primary" id="calcZonas">Calcular</button>
          </div>
        </div>
        <div id="zonasResult" class="mt-lg"></div>
      </div>
    </div>
  `;
}

function renderComposicaoPanel(assessments, students) {
  if (!assessments.length) return `<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Nenhuma avaliação de composição corporal</h3><p>Adicione a primeira avaliação</p></div>`;
  return `
    <div class="table-container">
      <table class="data-table"><thead><tr><th>Aluno</th><th>Data</th><th>Peso</th><th>Altura</th><th>IMC</th><th>% Gordura</th><th>M. Magra</th><th>Ações</th></tr></thead>
      <tbody>${assessments.map(a => {
    const st = students.find(s => s.id === a.studentId);
    const imc = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
    const imcC = imc ? Calc.imcClassificacao(imc) : null;
    return `<tr>
          <td>${st ? st.name : '?'}</td><td>${Calc.formatDate(a.date)}</td>
          <td>${a.peso ? a.peso + 'kg' : '-'}</td><td>${a.altura ? a.altura + 'cm' : '-'}</td>
          <td>${imc ? `<span class="badge badge-${imcC.color}">${Calc.formatNum(imc)}</span>` : '-'}</td>
          <td>${a.percentualGordura ? Calc.formatNum(a.percentualGordura) + '%' : '-'}</td>
          <td>${a.massaMagra ? Calc.formatNum(a.massaMagra) + 'kg' : '-'}</td>
          <td><button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" style="color:var(--danger)">✕</button></td>
        </tr>`;
  }).join('')}</tbody></table>
    </div>
  `;
}

function renderConconiPanel(assessments, students) {
  if (!assessments.length) return `<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Nenhum teste Conconi registrado</h3></div>`;
  return `<div class="table-container"><table class="data-table"><thead><tr><th>Aluno</th><th>Data</th><th>FC Pico</th><th>VMA</th><th>VO2max est.</th><th>Ações</th></tr></thead>
    <tbody>${assessments.map(a => {
    const st = students.find(s => s.id === a.studentId);
    return `<tr><td>${st ? st.name : '?'}</td><td>${Calc.formatDate(a.date)}</td><td>${a.fcPico || '-'} bpm</td><td>${a.vma || '-'} km/h</td><td>${a.vo2max ? Calc.formatNum(a.vo2max) : '-'} ml/kg/min</td><td><button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" style="color:var(--danger)">✕</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function renderForcaPanel(assessments, students) {
  if (!assessments.length) return `<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Nenhuma avaliação de força</h3></div>`;
  return `<div class="table-container"><table class="data-table"><thead><tr><th>Aluno</th><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Est.</th><th>Ações</th></tr></thead>
    <tbody>${assessments.map(a => {
    const st = students.find(s => s.id === a.studentId);
    return `<tr><td>${st ? st.name : '?'}</td><td>${Calc.formatDate(a.date)}</td><td>${a.exercise || '-'}</td><td>${a.carga || '-'}kg</td><td>${a.reps || '-'}</td><td><strong>${a.rm1 ? a.rm1 + 'kg' : '-'}</strong></td><td><button class="btn btn-ghost btn-sm delete-assessment" data-id="${a.id}" style="color:var(--danger)">✕</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function composicaoFormHTML(students) {
  return `<form id="assessForm">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Aluno *</label><select class="form-select" name="studentId" required><option value="">Selecione</option>${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Data</label><input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
    </div>
    <h4 class="mt-md mb-md">Medidas Básicas</h4>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Peso (kg)</label><input class="form-input" name="peso" type="number" step="0.1" placeholder="Ex: 75.5" /></div>
      <div class="form-group"><label class="form-label">Altura (cm)</label><input class="form-input" name="altura" type="number" step="0.1" placeholder="Ex: 175" /></div>
      <div class="form-group"><label class="form-label">Gênero</label><select class="form-select" name="genero"><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
    </div>
    <h4 class="mt-md mb-md">Dobras Cutâneas (3 dobras - mm)</h4>
    <div class="form-row">
      <div class="form-group"><label class="form-label" id="dobra1Label">Peitoral / Tríceps</label><input class="form-input" name="dobra1" type="number" step="0.1" /></div>
      <div class="form-group"><label class="form-label" id="dobra2Label">Abdominal / Suprailíaca</label><input class="form-input" name="dobra2" type="number" step="0.1" /></div>
      <div class="form-group"><label class="form-label">Coxa</label><input class="form-input" name="dobra3" type="number" step="0.1" /></div>
    </div>
    <h4 class="mt-md mb-md">Circunferências (cm)</h4>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Cintura</label><input class="form-input" name="cintura" type="number" step="0.1" /></div>
      <div class="form-group"><label class="form-label">Quadril</label><input class="form-input" name="quadril" type="number" step="0.1" /></div>
      <div class="form-group"><label class="form-label">Braço D</label><input class="form-input" name="bracoD" type="number" step="0.1" /></div>
      <div class="form-group"><label class="form-label">Braço E</label><input class="form-input" name="bracoE" type="number" step="0.1" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Coxa D</label><input class="form-input" name="coxaD" type="number" step="0.1" /></div>
      <div class="form-group"><label class="form-label">Coxa E</label><input class="form-input" name="coxaE" type="number" step="0.1" /></div>
      <div class="form-group"><label class="form-label">Panturrilha D</label><input class="form-input" name="panturrilhaD" type="number" step="0.1" /></div>
      <div class="form-group"><label class="form-label">Panturrilha E</label><input class="form-input" name="panturrilhaE" type="number" step="0.1" /></div>
    </div>
  </form>`;
}

export function initAssessments(navigateFn) {
  // Tab switching
  document.querySelectorAll('#assessmentTypeTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#assessmentTypeTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.assessment-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`panel-${tab.dataset.type}`)?.classList.remove('hidden');
    });
  });

  // Zonas calc
  document.getElementById('calcZonas')?.addEventListener('click', () => {
    const idade = parseInt(document.getElementById('zonaIdade').value);
    const fcRep = parseInt(document.getElementById('zonaFcRep').value);
    if (!idade || !fcRep) { notify.warning('Preencha idade e FC repouso'); return; }
    const fcMax = Calc.fcMax(idade);
    const zonas = Calc.zonasTreino(fcMax, fcRep);
    document.getElementById('zonasResult').innerHTML = `
      <div class="mb-md"><strong>FC Máxima estimada (Tanaka):</strong> <span class="text-gradient" style="font-size:1.3rem;font-weight:700">${fcMax} bpm</span></div>
      <div class="table-container"><table class="data-table"><thead><tr><th>Zona</th><th>Nome</th><th>%FCR</th><th>FC Min</th><th>FC Max</th></tr></thead>
      <tbody>${zonas.map(z => `<tr><td><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${z.cor};margin-right:6px"></span>Z${z.zona}</td><td>${z.nome}</td><td>${z.min}-${z.max}%</td><td>${z.fcMin} bpm</td><td>${z.fcMax} bpm</td></tr>`).join('')}</tbody></table></div>
    `;
  });

  // Add assessment
  document.getElementById('addAssessmentBtn')?.addEventListener('click', async () => {
    const activeTab = document.querySelector('#assessmentTypeTabs .tab.active');
    const type = activeTab?.dataset.type || 'composicao';
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');

    if (type === 'composicao') {
      openModal({
        title: '+ Avaliação de Composição Corporal',
        content: composicaoFormHTML(students),
        size: 'xl',
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelAss', onClick: () => closeModal() },
          {
            label: 'Salvar', class: 'btn-primary', id: 'saveAss', onClick: async () => {
              const form = document.getElementById('assessForm');
              const fd = new FormData(form);
              const d = Object.fromEntries(fd);
              if (!d.studentId) { notify.error('Selecione um aluno'); return; }
              d.type = 'composicao';
              d.peso = parseFloat(d.peso) || null;
              d.altura = parseFloat(d.altura) || null;
              // Calculate
              if (d.peso && d.altura) {
                const imc = Calc.imc(d.peso, d.altura);
                d.imc = Math.round(imc * 10) / 10;
              }
              const st = await db.get('students', d.studentId);
              const idade = st?.birthDate ? Calc.calcularIdade(st.birthDate) : (st?.age || 30);
              if (d.dobra1 && d.dobra2 && d.dobra3) {
                const pct = Calc.percentualGordura3dobras(d.genero, idade, parseFloat(d.dobra1), parseFloat(d.dobra2), parseFloat(d.dobra3));
                const comp = Calc.composicaoCorporal(d.peso, pct);
                d.percentualGordura = comp.percentualGordura;
                d.massaMagra = comp.massaMagra;
                d.massaGorda = comp.massaGorda;
              }
              if (d.cintura && d.quadril) {
                d.rcq = Math.round(Calc.rcq(parseFloat(d.cintura), parseFloat(d.quadril)) * 100) / 100;
              }
              await db.add('assessments', d);
              notify.success('Avaliação registrada!');
              closeModal();
              navigateFn('/avaliacoes');
            }
          }
        ]
      });
    } else if (type === 'conconi') {
      openModal({
        title: '+ Teste Conconi',
        size: 'lg',
        content: `<form id="assessForm">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Aluno *</label><select class="form-select" name="studentId" required><option value="">Selecione</option>${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Data</label><input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">FC Pico (bpm)</label><input class="form-input" name="fcPico" type="number" /></div>
            <div class="form-group"><label class="form-label">VMA (km/h)</label><input class="form-input" name="vma" type="number" step="0.1" /></div>
            <div class="form-group"><label class="form-label">Limiar 2 (km/h)</label><input class="form-input" name="limiar2" type="number" step="0.1" /></div>
          </div>
        </form>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelConc', onClick: () => closeModal() },
          {
            label: 'Salvar', class: 'btn-primary', id: 'saveConc', onClick: async () => {
              const fd = new FormData(document.getElementById('assessForm'));
              const d = Object.fromEntries(fd);
              if (!d.studentId) { notify.error('Selecione um aluno'); return; }
              d.type = 'conconi';
              d.vma = parseFloat(d.vma) || null;
              d.fcPico = parseInt(d.fcPico) || null;
              if (d.vma) d.vo2max = Calc.vo2maxConconi(d.vma);
              await db.add('assessments', d);
              notify.success('Teste Conconi salvo!');
              closeModal();
              navigateFn('/avaliacoes');
            }
          }
        ]
      });
    } else if (type === 'forca') {
      openModal({
        title: '+ Avaliação de Força',
        size: 'md',
        content: `<form id="assessForm">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Aluno *</label><select class="form-select" name="studentId" required><option value="">Selecione</option>${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Data</label><input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Exercício</label><input class="form-input" name="exercise" placeholder="Ex: Supino Reto" /></div>
            <div class="form-group"><label class="form-label">Carga (kg)</label><input class="form-input" name="carga" type="number" step="0.5" /></div>
            <div class="form-group"><label class="form-label">Reps realizadas</label><input class="form-input" name="reps" type="number" /></div>
          </div>
        </form>`,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelFor', onClick: () => closeModal() },
          {
            label: 'Salvar', class: 'btn-primary', id: 'saveFor', onClick: async () => {
              const fd = new FormData(document.getElementById('assessForm'));
              const d = Object.fromEntries(fd);
              if (!d.studentId) { notify.error('Selecione um aluno'); return; }
              d.type = 'forca';
              d.carga = parseFloat(d.carga) || 0;
              d.reps = parseInt(d.reps) || 1;
              d.rm1 = Calc.rm1Estimado(d.carga, d.reps);
              await db.add('assessments', d);
              notify.success('Avaliação de força salva!');
              closeModal();
              navigateFn('/avaliacoes');
            }
          }
        ]
      });
    }
  });

  // Delete
  document.querySelectorAll('.delete-assessment').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir avaliação?')) {
        await db.delete('assessments', btn.dataset.id);
        notify.success('Avaliação removida');
        navigateFn('/avaliacoes');
      }
    });
  });
}
