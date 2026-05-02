// ========================================
// PERSONAL PRO — Cardio Training Page
// HR Zones + HIIT/SIT/MICT/Polarized
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

const CARDIO_METHODS = [
  { id: 'mict', name: 'MICT — Contínuo Moderado', desc: 'Exercício contínuo em intensidade moderada (Zona 2-3). Ideal para base aeróbia.', zone: '2-3', duration: '30-60 min', icon: '—' },
  { id: 'hiit', name: 'HIIT — Intervalado de Alta Intensidade', desc: 'Intervalos de 30s-4min a 80-95% FCmax com recuperação ativa. Melhora VO2max.', zone: '4-5', duration: '20-40 min', icon: '—' },
  { id: 'sit', name: 'SIT — Sprint Interval Training', desc: 'Sprints all-out de 10-30s com recuperação completa (2-4 min). Máxima potência anaeróbia.', zone: '5', duration: '15-25 min', icon: '—' },
  { id: 'polarized', name: 'Polarizado', desc: '80% do treino em baixa intensidade (Z1-2) e 20% em alta intensidade (Z4-5). Evita zona 3.', zone: '1-2 + 4-5', duration: 'Variável', icon: '—' },
  { id: 'fartlek', name: 'Fartlek', desc: 'Variação livre de intensidade durante o treino. Combina sprints curtos com recuperação.', zone: '2-5', duration: '20-45 min', icon: '—' },
  { id: 'tabata', name: 'Tabata', desc: 'Protocolo 20s esforço máximo + 10s descanso × 8 rounds = 4 min. Ultra-eficiente.', zone: '5', duration: '4-16 min', icon: '—' },
  { id: 'threshold', name: 'Limiar Anaeróbio', desc: 'Esforço sustentado no limiar (Zona 4). Melhora tolerância ao lactato.', zone: '4', duration: '20-40 min', icon: '—' },
  { id: 'recovery', name: 'Recuperação Ativa', desc: 'Exercício muito leve (Zona 1) para promover recuperação entre sessões intensas.', zone: '1', duration: '20-40 min', icon: '—' },
];

const ZONE_COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const ZONE_NAMES = ['Recuperação', 'Base Aeróbia', 'Aeróbia', 'Limiar Anaeróbio', 'VO2 Max'];
const ZONE_PCTS = [[50, 60], [60, 70], [70, 80], [80, 90], [90, 100]];

function calcZones(fcMax, fcRep) {
  const reserve = fcMax - fcRep;
  return ZONE_PCTS.map((pct, i) => ({
    zone: i + 1, name: ZONE_NAMES[i], color: ZONE_COLORS[i],
    pctMin: pct[0], pctMax: pct[1],
    fcMin: Math.round(fcRep + reserve * (pct[0] / 100)),
    fcMax: Math.round(fcRep + reserve * (pct[1] / 100)),
  }));
}

export async function renderCardio() {
  const students = await db.getAll('students');
  const active = students.filter(s => s.status === 'Ativo');
  const cardioSessions = (await db.getAll('sessions')).filter(s => s.sessionType === 'cardio');

  return `
    <div class="page-header">
      <div><h1>Treino Cardiovascular</h1><p class="subtitle">Zonas de FC, HIIT, SIT, Polarizado e mais</p></div>
      <button class="btn btn-primary" id="newCardioBtn">+ Nova Sessão Cardio</button>
    </div>

    <div class="tabs" id="cardioTabs">
      <button class="tab active" data-tab="zones">Zonas de Treino</button>
      <button class="tab" data-tab="methods">Métodos</button>
      <button class="tab" data-tab="sessions">Sessões Cardio</button>
    </div>

    <!-- TAB: Zonas por Aluno -->
    <div id="tabZones" class="cardio-tab">
      <div class="card mb-lg">
        <div class="card-header"><span class="card-title">Calcular Zonas de FC por Aluno</span></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Aluno</label>
            <select class="form-select" id="zoneStudent"><option value="">Selecione</option>
            ${active.map(s => `<option value="${s.id}">${s.name} (${s.age || '-'} anos)</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">FC Máxima (bpm)</label>
            <input class="form-input" id="zoneFcMax" type="number" placeholder="Auto: 220 - idade" />
            <div class="form-hint">Deixe vazio para usar fórmula de Tanaka</div>
          </div>
          <div class="form-group"><label class="form-label">FC Repouso (bpm)</label>
            <input class="form-input" id="zoneFcRep" type="number" value="70" placeholder="60-80" />
          </div>
          <div class="form-group" style="align-self:end">
            <button class="btn btn-primary" id="calcZonesBtn">Calcular Zonas</button>
          </div>
        </div>
      </div>
      <div id="zonesResult"></div>
    </div>

    <!-- TAB: Métodos -->
    <div id="tabMethods" class="cardio-tab" style="display:none">
      <div class="methods-grid">
        ${CARDIO_METHODS.map(m => `
          <div class="card method-card">
            <div class="flex items-center gap-sm mb-sm">
              <span style="font-size:1.5rem">${m.icon}</span>
              <h4 style="margin:0;font-size:0.95rem">${m.name}</h4>
            </div>
            <p class="text-xs text-muted mb-md" style="line-height:1.6">${m.desc}</p>
            <div class="flex gap-sm">
              <span class="badge badge-info">Zona ${m.zone}</span>
              <span class="badge badge-success">${m.duration}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card mt-lg">
        <div class="card-header"><span class="card-title">Distribuição Semanal Recomendada</span></div>
        <div class="table-container"><table class="data-table"><thead><tr>
          <th>Objetivo</th><th>MICT (Z2)</th><th>Limiar (Z4)</th><th>HIIT/SIT (Z5)</th><th>Recuperação (Z1)</th><th>Total/Sem</th>
        </tr></thead><tbody>
          <tr><td><strong>Saúde Geral</strong></td><td>3×30min</td><td>—</td><td>1×20min</td><td>1×20min</td><td>3-5 sessões</td></tr>
          <tr><td><strong>Emagrecimento</strong></td><td>3×40min</td><td>1×25min</td><td>1×20min</td><td>1×20min</td><td>4-6 sessões</td></tr>
          <tr><td><strong>Performance</strong></td><td>2×45min</td><td>1×30min</td><td>2×25min</td><td>1×25min</td><td>5-6 sessões</td></tr>
          <tr><td><strong>Polarizado</strong></td><td>4×40min</td><td>—</td><td>1×30min</td><td>—</td><td>4-5 sessões</td></tr>
        </tbody></table></div>
      </div>
    </div>

    <!-- TAB: Sessões Cardio -->
    <div id="tabSessions" class="cardio-tab" style="display:none">
      ${cardioSessions.length ? `
        <div class="table-container"><table class="data-table"><thead><tr>
          <th>Aluno</th><th>Método</th><th>Data</th><th>Duração</th><th>FC Méd</th><th>Zona Méd</th><th>Carga</th>
        </tr></thead><tbody>
        ${cardioSessions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => {
          const st = students.find(x => x.id === s.studentId);
          return `<tr>
            <td>${st ? st.name : '?'}</td>
            <td><span class="badge badge-info">${s.cardioMethod || '-'}</span></td>
            <td>${Calc.formatDate(s.date)}</td>
            <td>${s.cardioDuration || '-'} min</td>
            <td>${s.avgHR || '-'} bpm</td>
            <td>Z${s.avgZone || '-'}</td>
            <td>${s.cardioLoad || '-'}</td>
          </tr>`;
        }).join('')}
        </tbody></table></div>
      ` : `<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Nenhuma sessão cardio</h3><p>Crie sessões de treino cardiovascular para seus alunos</p></div>`}
    </div>
  `;
}

function renderZonesTable(zones, fcMax, fcRep, studentName) {
  return `
    <div class="card mb-lg" style="border-top:3px solid var(--primary)">
      <div class="card-header">
        <span class="card-title">Zonas de Treino — ${studentName}</span>
        <div class="text-sm text-muted">FCmax: ${fcMax} bpm · FCrep: ${fcRep} bpm · Reserva: ${fcMax - fcRep} bpm</div>
      </div>
      <div class="zones-visual mb-lg">
        ${zones.map(z => `
          <div class="zone-bar" style="--zone-color:${z.color}">
            <div class="zone-header">
              <span class="zone-badge" style="background:${z.color}">Z${z.zone}</span>
              <strong>${z.name}</strong>
            </div>
            <div class="zone-range">${z.fcMin} — ${z.fcMax} bpm</div>
            <div class="zone-pct">${z.pctMin}-${z.pctMax}% FCmax</div>
            <div class="zone-fill" style="width:${z.pctMax}%;background:${z.color}20;border-right:3px solid ${z.color}"></div>
          </div>
        `).join('')}
      </div>
      <div class="table-container"><table class="data-table"><thead><tr>
        <th>Zona</th><th>Nome</th><th>% FC Reserva</th><th>FC Min</th><th>FC Max</th><th>Benefício Principal</th>
      </tr></thead><tbody>
        ${zones.map(z => `<tr>
          <td><span class="badge" style="background:${z.color}20;color:${z.color}">Zona ${z.zone}</span></td>
          <td><strong>${z.name}</strong></td>
          <td>${z.pctMin}-${z.pctMax}%</td>
          <td>${z.fcMin} bpm</td>
          <td>${z.fcMax} bpm</td>
          <td class="text-sm text-muted">${['Recuperação, aquecimento', 'Base aeróbia, queima de gordura', 'Resistência aeróbia', 'Limiar anaeróbio, tolerância ao lactato', 'VO2max, pico de performance'][z.zone - 1]}</td>
        </tr>`).join('')}
      </tbody></table></div>
      <div class="mt-lg" style="height:250px;position:relative"><canvas id="zonesChart"></canvas></div>
    </div>
    <button class="btn btn-secondary" id="saveZonesBtn">Salvar Zonas do Aluno</button>
  `;
}

export function initCardio(navigateFn) {
  // Tab switching
  document.querySelectorAll('#cardioTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#cardioTabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.cardio-tab').forEach(c => c.style.display = 'none');
      const target = tab.dataset.tab;
      document.getElementById(target === 'zones' ? 'tabZones' : target === 'methods' ? 'tabMethods' : 'tabSessions').style.display = '';
    });
  });

  // Auto-fill FC when student is selected
  document.getElementById('zoneStudent')?.addEventListener('change', async (e) => {
    const sid = e.target.value;
    if (!sid) return;
    const student = await db.get('students', sid);
    if (!student) return;
    const fcMaxInput = document.getElementById('zoneFcMax');
    if (fcMaxInput && !fcMaxInput.value) {
      fcMaxInput.value = Calc.fcMax(student.age || 30);
      fcMaxInput.placeholder = `Tanaka: ${Calc.fcMax(student.age || 30)}`;
    }
    // Check if student has saved zones
    const savedZones = await db.get('settings', `zones_${sid}`);
    if (savedZones) {
      document.getElementById('zoneFcRep').value = savedZones.fcRep || 70;
      fcMaxInput.value = savedZones.fcMax || '';
    }
  });

  // Calculate zones
  document.getElementById('calcZonesBtn')?.addEventListener('click', async () => {
    const sid = document.getElementById('zoneStudent')?.value;
    if (!sid) { notify.error('Selecione um aluno'); return; }
    const student = await db.get('students', sid);
    const fcMaxVal = parseInt(document.getElementById('zoneFcMax')?.value) || Calc.fcMax(student?.age || 30);
    const fcRep = parseInt(document.getElementById('zoneFcRep')?.value) || 70;

    const zones = calcZones(fcMaxVal, fcRep);
    const result = document.getElementById('zonesResult');
    result.innerHTML = renderZonesTable(zones, fcMaxVal, fcRep, student?.name || 'Aluno');

    // Render chart
    if (typeof Chart !== 'undefined') {
      const ctx = document.getElementById('zonesChart');
      if (ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: zones.map(z => `Z${z.zone} - ${z.name}`),
            datasets: [{
              label: 'FC Mín', data: zones.map(z => z.fcMin),
              backgroundColor: zones.map(z => z.color + '60'), borderColor: zones.map(z => z.color), borderWidth: 1, borderRadius: 4,
            }, {
              label: 'FC Máx', data: zones.map(z => z.fcMax),
              backgroundColor: zones.map(z => z.color + '90'), borderColor: zones.map(z => z.color), borderWidth: 1, borderRadius: 4,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'y',
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: {
              x: { ticks: { color: '#94a3b8', callback: v => v + ' bpm' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
          }
        });
      }
    }

    // Save zones
    document.getElementById('saveZonesBtn')?.addEventListener('click', async () => {
      await db.put('settings', { key: `zones_${sid}`, fcMax: fcMaxVal, fcRep, zones, studentId: sid });
      notify.success('Zonas salvas para o aluno!');
    });
  });

  // New cardio session
  document.getElementById('newCardioBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    openModal({
      title: '+ Nova Sessão Cardio', size: 'lg',
      content: `<form id="cardioForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Aluno *</label>
            <select class="form-select" name="studentId" required><option value="">Selecione</option>
            ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Método *</label>
            <select class="form-select" name="cardioMethod">
            ${CARDIO_METHODS.map(m => `<option value="${m.id}">${m.icon} ${m.name}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Data</label>
            <input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
          <div class="form-group"><label class="form-label">Duração (min)</label>
            <input class="form-input" name="cardioDuration" type="number" value="30" /></div>
          <div class="form-group"><label class="form-label">Modalidade</label>
            <select class="form-select" name="modality"><option>Esteira</option><option>Bicicleta</option><option>Elíptico</option><option>Remo</option><option>Corrida Ao Ar Livre</option><option>Natação</option><option>Pular Corda</option><option>Outro</option></select>
          </div>
        </div>
        <div id="protocolDetails"></div>
        <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:16px">
          <h4 class="mb-sm">Dados da Sessão (opcional)</h4>
          <div class="form-row">
            <div class="form-group"><label class="form-label">FC Média (bpm)</label><input class="form-input" name="avgHR" type="number" placeholder="Ex: 145" /></div>
            <div class="form-group"><label class="form-label">FC Máx Atingida</label><input class="form-input" name="maxHR" type="number" placeholder="Ex: 175" /></div>
            <div class="form-group"><label class="form-label">Distância (km)</label><input class="form-input" name="distance" type="number" step="0.1" placeholder="Ex: 5.2" /></div>
            <div class="form-group"><label class="form-label">Calorias</label><input class="form-input" name="calories" type="number" placeholder="Ex: 350" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">PSE (1-10)</label><input class="form-input" name="pse" type="number" min="1" max="10" value="6" /></div>
            <div class="form-group"><label class="form-label">Notas</label><input class="form-input" name="notes" placeholder="Observações..." /></div>
          </div>
        </div>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', id: 'cancelCardio', onClick: () => closeModal() },
        { label: 'Salvar Sessão', class: 'btn-primary', id: 'saveCardio', onClick: async () => {
          const fd = new FormData(document.getElementById('cardioForm'));
          const d = Object.fromEntries(fd);
          if (!d.studentId) { notify.error('Selecione um aluno'); return; }
          d.cardioDuration = parseInt(d.cardioDuration) || 30;
          d.avgHR = parseInt(d.avgHR) || null;
          d.maxHR = parseInt(d.maxHR) || null;
          d.distance = parseFloat(d.distance) || null;
          d.calories = parseInt(d.calories) || null;
          d.pse = parseInt(d.pse) || 6;
          d.cardioLoad = d.pse * d.cardioDuration;
          d.sessionType = 'cardio';
          d.status = 'completed';

          // Calculate average zone if we have HR data
          if (d.avgHR) {
            const student = await db.get('students', d.studentId);
            const savedZones = await db.get('settings', `zones_${d.studentId}`);
            const fcMax = savedZones?.fcMax || Calc.fcMax(student?.age || 30);
            const fcRep = savedZones?.fcRep || 70;
            const zones = calcZones(fcMax, fcRep);
            const avgZ = zones.find(z => d.avgHR >= z.fcMin && d.avgHR <= z.fcMax);
            d.avgZone = avgZ ? avgZ.zone : '-';
          }

          await db.add('sessions', d);

          // Also save biofeedback
          await db.add('biofeedback', {
            studentId: d.studentId, date: d.date,
            pse: d.pse, duration: d.cardioDuration,
            trainingLoad: d.cardioLoad, notes: d.notes,
          });

          notify.success('Sessão cardio registrada!');
          closeModal();
          navigateFn('/cardio');
        }}
      ]
    });

    // Show protocol details based on method
    setTimeout(() => {
      document.querySelector('[name="cardioMethod"]')?.addEventListener('change', (e) => {
        const method = CARDIO_METHODS.find(m => m.id === e.target.value);
        const details = document.getElementById('protocolDetails');
        if (!method || !details) return;
        let html = '';
        if (e.target.value === 'hiit') {
          html = `<div class="card mt-md" style="background:rgba(239,68,68,0.05);border-color:rgba(239,68,68,0.2)">
            <h4 class="mb-sm" style="color:var(--danger)">Protocolo HIIT</h4>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Tempo de Esforço (s)</label><input class="form-input" name="hiit_work" type="number" value="30" /></div>
              <div class="form-group"><label class="form-label">Tempo de Recuperação (s)</label><input class="form-input" name="hiit_rest" type="number" value="30" /></div>
              <div class="form-group"><label class="form-label">Rounds</label><input class="form-input" name="hiit_rounds" type="number" value="10" /></div>
              <div class="form-group"><label class="form-label">Séries</label><input class="form-input" name="hiit_sets" type="number" value="3" /></div>
            </div>
          </div>`;
        } else if (e.target.value === 'tabata') {
          html = `<div class="card mt-md" style="background:rgba(239,68,68,0.05);border-color:rgba(239,68,68,0.2)">
            <h4 class="mb-sm" style="color:var(--danger)">Protocolo Tabata (20s/10s × 8)</h4>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Rounds por série</label><input class="form-input" name="tabata_rounds" type="number" value="8" /></div>
              <div class="form-group"><label class="form-label">Séries</label><input class="form-input" name="tabata_sets" type="number" value="4" /></div>
              <div class="form-group"><label class="form-label">Descanso entre séries (s)</label><input class="form-input" name="tabata_rest" type="number" value="60" /></div>
            </div>
          </div>`;
        } else if (e.target.value === 'sit') {
          html = `<div class="card mt-md" style="background:rgba(245,158,11,0.05);border-color:rgba(245,158,11,0.2)">
            <h4 class="mb-sm" style="color:var(--warning)">Protocolo SIT</h4>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Sprint (s)</label><input class="form-input" name="sit_sprint" type="number" value="20" /></div>
              <div class="form-group"><label class="form-label">Recuperação (s)</label><input class="form-input" name="sit_rest" type="number" value="180" /></div>
              <div class="form-group"><label class="form-label">Sprints</label><input class="form-input" name="sit_reps" type="number" value="6" /></div>
            </div>
          </div>`;
        }
        details.innerHTML = html;
      });
    }, 100);
  });
}
