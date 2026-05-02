// ========================================
// PERSONAL PRO — Biofeedback Page (v3)
// Scientific Analysis + Alerts + Individual View
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { analyzeBiofeedback, overallStatus, trainingRecommendation, PAIN_REGIONS, ALERT_THRESHOLDS } from '../utils/alerts.js';
import { sendWhatsApp, preFormMsg } from '../utils/whatsapp.js';

export async function renderBiofeedback() {
  const students = await db.getAll('students');
  const active = students.filter(s => s.status === 'Ativo');
  const allBf = await db.getAll('biofeedback');

  return `
    <div class="page-header">
      <div><h1>Biofeedback & Wellness</h1><p class="subtitle">Análise científica do bem-estar e prontidão do aluno</p></div>
      <div class="flex gap-sm">
        <select class="form-select" id="bfStudentFilter" style="min-width:200px">
          <option value="">Todos os alunos</option>
          ${active.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="addBfBtn">+ Registrar</button>
      </div>
    </div>

    <div id="bfContent">${renderBfContent(allBf, students, '')}</div>
  `;
}

function renderBfContent(entries, students, filterStudentId) {
  const filtered = filterStudentId ? entries.filter(e => e.studentId === filterStudentId) : entries;
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 20);
  const student = filterStudentId ? students.find(s => s.id === filterStudentId) : null;

  // Alerts summary
  const todayEntries = sorted.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
  const allAlerts = [];
  todayEntries.forEach(e => {
    const alerts = analyzeBiofeedback(e);
    const st = students.find(s => s.id === e.studentId);
    alerts.forEach(a => allAlerts.push({ ...a, studentName: st?.name || '?', entry: e }));
  });

  // ACWR for filtered student
  let acwrSection = '';
  if (student && filtered.length >= 2) {
    const weekLoads = computeWeeklyLoads(filtered);
    const currentWeek = weekLoads[weekLoads.length - 1] || 0;
    const chronic = weekLoads.slice(-5, -1);
    const chronicAvg = chronic.length > 0 ? chronic.reduce((a, b) => a + b, 0) / chronic.length : 0;
    const acwr = Calc.acwr(currentWeek, chronicAvg);
    const cls = Calc.acwrClassificacao(acwr);
    acwrSection = `
      <div class="card mb-lg">
        <div class="card-header"><span class="card-title">ACWR — ${student.name}</span></div>
        <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="stat-card"><div class="stat-label">Carga Semana Atual</div><div class="stat-value">${currentWeek}</div></div>
          <div class="stat-card"><div class="stat-label">Média Crônica (4 sem)</div><div class="stat-value">${Math.round(chronicAvg)}</div></div>
          <div class="stat-card"><div class="stat-label">ACWR</div><div class="stat-value" style="color:var(--${cls.color})">${acwr.toFixed(2)}</div></div>
          <div class="stat-card"><div class="stat-label">Status</div><div class="stat-value" style="color:var(--${cls.color})">${cls.label}</div></div>
        </div>
      </div>`;
  }

  return `
    ${allAlerts.length ? `
    <div class="card mb-lg" style="border-left:3px solid var(--danger)">
      <div class="card-header"><span class="card-title">Alertas de Hoje</span></div>
      ${allAlerts.map(a => `
        <div class="alert-row" style="display:flex;align-items:flex-start;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border-color)">
          <span style="font-size:1.2rem">${a.icon}</span>
          <div>
            <strong>${a.studentName}</strong> — <span style="color:var(--${a.level})">${a.metric}: ${a.value}/10</span>
            <div class="text-sm text-muted mt-xs">${a.action}</div>
          </div>
        </div>
      `).join('')}
    </div>` : ''}

    ${acwrSection}

    <div class="card">
      <div class="card-header"><span class="card-title">Registros ${student ? `— ${student.name}` : ''}</span></div>
      ${recent.length ? `
      <div class="table-container"><table class="data-table">
        <thead><tr><th>Data</th>${!student ? '<th>Aluno</th>' : ''}<th>Sono</th><th>Humor</th><th>Energia</th><th>Estresse</th><th>Dor</th><th>PSE</th><th>Carga</th><th>Status</th><th>Recomendação</th></tr></thead>
        <tbody>${recent.map(e => {
    const st = students.find(s => s.id === e.studentId);
    const status = overallStatus(e);
    const rec = trainingRecommendation(e);
    const alerts = analyzeBiofeedback(e);
    const painInfo = e.painRegion ? PAIN_REGIONS.find(r => r.id === e.painRegion) : null;
    return `<tr>
            <td>${Calc.formatDate(e.date)}</td>
            ${!student ? `<td>${st ? st.name : '?'}</td>` : ''}
            <td style="color:var(--${colorForVal(e.sleep, false)})">${e.sleep || '-'}</td>
            <td style="color:var(--${colorForVal(e.mood, false)})">${e.mood || '-'}</td>
            <td style="color:var(--${colorForVal(e.energy, false)})">${e.energy || '-'}</td>
            <td style="color:var(--${colorForVal(e.stress, true)})">${e.stress || '-'}</td>
            <td style="color:var(--${colorForVal(e.pain, true)})">
              ${e.pain || '-'}${painInfo ? ` ${painInfo.icon}` : ''}
            </td>
            <td><strong>${e.pse || '-'}</strong></td>
            <td>${e.trainingLoad || '-'}</td>
            <td><span class="badge badge-${status.color}">${status.icon} ${status.label}</span></td>
            <td class="text-sm">${rec.label}</td>
          </tr>`;
  }).join('')}</tbody>
      </table></div>` : '<div class="empty-state" style="padding:40px"><p class="text-muted">Nenhum registro ainda</p></div>'}
    </div>
  `;
}

function colorForVal(val, inverse) {
  if (val == null) return 'text-muted';
  if (inverse) return val >= 7 ? 'danger' : val >= 5 ? 'warning' : 'success';
  return val <= 3 ? 'danger' : val <= 5 ? 'warning' : 'success';
}

function computeWeeklyLoads(entries) {
  const weeks = {};
  entries.forEach(e => {
    if (!e.trainingLoad) return;
    const d = new Date(e.date);
    const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weeks[key] = (weeks[key] || 0) + e.trainingLoad;
  });
  return Object.keys(weeks).sort().map(k => weeks[k]);
}

export function initBiofeedback(navigateFn) {
  // Student filter
  document.getElementById('bfStudentFilter')?.addEventListener('change', async (e) => {
    const sid = e.target.value;
    const students = await db.getAll('students');
    const allBf = await db.getAll('biofeedback');
    const contentEl = document.getElementById('bfContent');
    if (contentEl) contentEl.innerHTML = renderBfContent(allBf, students, sid);
  });

  // Add biofeedback
  document.getElementById('addBfBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    openModal({
      title: '+ Registrar Biofeedback', size: 'lg',
      content: `<form id="bfForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Aluno *</label><select class="form-select" name="studentId" required><option value="">Selecione</option>${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Data</label><input class="form-input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
        </div>
        ${[
          { id: 'sleep', label: 'Sono', hint: '1=péssimo · 10=ótimo' },
          { id: 'mood', label: 'Humor', hint: '1=péssimo · 10=ótimo' },
          { id: 'energy', label: 'Disposição', hint: '1=exausto · 10=energizado' },
          { id: 'stress', label: 'Estresse', hint: '1=relaxado · 10=estressado' },
          { id: 'pain', label: 'Dor', hint: '1=nenhuma · 10=muita' },
        ].map(f => `
          <div class="form-group" style="margin-bottom:12px">
            <div class="flex items-center justify-between"><label class="form-label" style="margin:0">${f.label}</label><span class="text-gradient" style="font-weight:700" id="bfV_${f.id}">5</span></div>
            <input type="range" name="${f.id}" min="1" max="10" value="5" style="width:100%" oninput="document.getElementById('bfV_${f.id}').textContent=this.value;${f.id === 'pain' ? "document.getElementById('painRegionGroup').style.display=this.value>=3?'block':'none'" : ''}" />
            <div class="form-hint">${f.hint}</div>
          </div>
        `).join('')}
        <div class="form-group" id="painRegionGroup" style="display:none">
          <label class="form-label">Região da Dor</label>
          <select class="form-select" name="painRegion"><option value="">Selecione</option>${PAIN_REGIONS.map(r => `<option value="${r.id}">${r.icon} ${r.label}</option>`).join('')}</select>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">PSE (1-10)</label><input class="form-input" name="pse" type="number" min="1" max="10" value="7" /></div>
          <div class="form-group"><label class="form-label">Duração (min)</label><input class="form-input" name="duration" type="number" value="60" /></div>
        </div>
        <div class="form-group"><label class="form-label">Notas</label><textarea class="form-textarea" name="notes" rows="2"></textarea></div>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        {
          label: 'Salvar', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('bfForm'));
            const d = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione o aluno'); return; }
            ['sleep', 'mood', 'energy', 'stress', 'pain', 'pse', 'duration'].forEach(k => d[k] = parseInt(d[k]) || 0);
            d.trainingLoad = Calc.cargaTreino(d.pse, d.duration);
            d.date = d.date || new Date().toISOString().slice(0, 10);
            await db.add('biofeedback', d);

            // Show alert if needed
            const alerts = analyzeBiofeedback(d);
            if (alerts.length) {
              const st = students.find(s => s.id === d.studentId);
              notify.warning(`⚠️ ${st?.name}: ${alerts.map(a => a.metric).join(', ')} requerem atenção`);
            }

            closeModal();
            notify.success('Biofeedback registrado!');
            navigateFn('/biofeedback');
          }
        }
      ]
    });
  });
}
