// ========================================
// PERSONAL PRO — Periodization Page (v5)
// Design limpo + templates com exercícios + fluxo correto
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { PERIODIZATION_TYPES, MESOCYCLE_PHASES, generateWeeklyPlan } from '../utils/periodization-models.js';
import { generateWorkouts } from '../utils/workout-generator.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { generateProgression, PERIODIZATION_MODELS, TRAINING_GOALS, formatRest, intensityColor } from '../utils/periodization-engine.js';

const TRAINING_DAYS = [
  { id: 0, label: 'Dom' }, { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' }, { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' },
];

const HOURS = ['05:00','06:00','07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

// ── TEMPLATES PADRÃO COM EXERCÍCIOS ──────────────────────────
const BUILT_IN_WORKOUT_TEMPLATES = [
  {
    id: 'full_body_ab',
    name: 'Full Body A/B',
    days: 2,
    desc: '2x por semana · Treino completo alternado',
    sessions: [
      {
        name: 'Full Body A',
        exercises: [
          { name: 'Agachamento Livre com Barra', sets: 4, reps: '10-12', rest: 90 },
          { name: 'Supino Reto com Barra',       sets: 4, reps: '10-12', rest: 90 },
          { name: 'Puxada Frontal',               sets: 3, reps: '10-12', rest: 75 },
          { name: 'Desenvolvimento com Halteres', sets: 3, reps: '12',    rest: 75 },
          { name: 'Prancha Frontal',              sets: 3, reps: '30s',   rest: 60 },
        ]
      },
      {
        name: 'Full Body B',
        exercises: [
          { name: 'Leg Press 45°',                sets: 4, reps: '12-15', rest: 90 },
          { name: 'Supino Inclinado com Halteres',sets: 3, reps: '12',    rest: 75 },
          { name: 'Remada Curvada com Barra',     sets: 4, reps: '10-12', rest: 90 },
          { name: 'Elevação Lateral',             sets: 3, reps: '15',    rest: 60 },
          { name: 'Hip Thrust',                   sets: 3, reps: '12',    rest: 75 },
        ]
      }
    ]
  },
  {
    id: 'abc_3x',
    name: 'ABC — 3x por semana',
    days: 3,
    desc: 'A: Peito/Tríceps · B: Costas/Bíceps · C: Pernas/Ombros',
    sessions: [
      {
        name: 'Treino A — Peito e Tríceps',
        exercises: [
          { name: 'Supino Reto com Barra',         sets: 4, reps: '8-10',  rest: 120 },
          { name: 'Supino Inclinado com Halteres', sets: 3, reps: '10-12', rest: 90  },
          { name: 'Crucifixo Reto',                sets: 3, reps: '12',    rest: 75  },
          { name: 'Tríceps Pulley',                sets: 3, reps: '12-15', rest: 60  },
          { name: 'Tríceps Testa',                 sets: 3, reps: '10-12', rest: 75  },
        ]
      },
      {
        name: 'Treino B — Costas e Bíceps',
        exercises: [
          { name: 'Puxada Frontal',               sets: 4, reps: '8-10',  rest: 120 },
          { name: 'Remada Curvada com Barra',     sets: 4, reps: '10-12', rest: 90  },
          { name: 'Remada Unilateral com Halter', sets: 3, reps: '10-12', rest: 75  },
          { name: 'Rosca Direta com Barra',       sets: 3, reps: '10-12', rest: 75  },
          { name: 'Rosca Alternada com Halteres', sets: 3, reps: '12',    rest: 60  },
        ]
      },
      {
        name: 'Treino C — Pernas e Ombros',
        exercises: [
          { name: 'Agachamento Livre com Barra',  sets: 4, reps: '8-10',  rest: 120 },
          { name: 'Leg Press 45°',                sets: 3, reps: '12-15', rest: 90  },
          { name: 'Mesa Flexora',                 sets: 3, reps: '12',    rest: 75  },
          { name: 'Desenvolvimento com Halteres', sets: 4, reps: '10-12', rest: 90  },
          { name: 'Elevação Lateral',             sets: 3, reps: '15',    rest: 60  },
        ]
      }
    ]
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower — 4x por semana',
    days: 4,
    desc: 'Superior A/B · Inferior A/B — Alternado',
    sessions: [
      {
        name: 'Superior A',
        exercises: [
          { name: 'Supino Reto com Barra',        sets: 4, reps: '6-8',   rest: 120 },
          { name: 'Puxada Frontal',               sets: 4, reps: '6-8',   rest: 120 },
          { name: 'Desenvolvimento com Halteres', sets: 3, reps: '10-12', rest: 90  },
          { name: 'Rosca Direta com Barra',       sets: 3, reps: '10-12', rest: 75  },
          { name: 'Tríceps Pulley',               sets: 3, reps: '10-12', rest: 75  },
        ]
      },
      {
        name: 'Inferior A',
        exercises: [
          { name: 'Agachamento Livre com Barra',  sets: 4, reps: '6-8',   rest: 120 },
          { name: 'Stiff com Barra',              sets: 3, reps: '8-10',  rest: 90  },
          { name: 'Cadeira Extensora',            sets: 3, reps: '12-15', rest: 75  },
          { name: 'Hip Thrust',                   sets: 4, reps: '10-12', rest: 90  },
          { name: 'Panturrilha em Pé',            sets: 4, reps: '15-20', rest: 60  },
        ]
      },
      {
        name: 'Superior B',
        exercises: [
          { name: 'Supino Inclinado com Halteres',sets: 4, reps: '8-10',  rest: 90 },
          { name: 'Remada Curvada com Barra',     sets: 4, reps: '8-10',  rest: 90 },
          { name: 'Elevação Lateral',             sets: 4, reps: '12-15', rest: 60 },
          { name: 'Rosca Martelo',                sets: 3, reps: '12',    rest: 60 },
          { name: 'Tríceps Corda',                sets: 3, reps: '12-15', rest: 60 },
        ]
      },
      {
        name: 'Inferior B',
        exercises: [
          { name: 'Leg Press 45°',                sets: 4, reps: '10-12', rest: 90 },
          { name: 'Mesa Flexora',                 sets: 3, reps: '12',    rest: 75 },
          { name: 'Agachamento Búlgaro',          sets: 3, reps: '10',    rest: 75 },
          { name: 'Abdução na Máquina',           sets: 3, reps: '15',    rest: 60 },
          { name: 'Panturrilha Sentado',          sets: 3, reps: '15-20', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'push_pull_legs',
    name: 'Push / Pull / Legs',
    days: 3,
    desc: 'Push · Pull · Legs — 3 a 6x por semana',
    sessions: [
      {
        name: 'Push — Peito, Ombros e Tríceps',
        exercises: [
          { name: 'Supino Reto com Barra',         sets: 4, reps: '8-10',  rest: 120 },
          { name: 'Supino Inclinado com Halteres', sets: 3, reps: '10-12', rest: 90  },
          { name: 'Desenvolvimento com Halteres',  sets: 4, reps: '10-12', rest: 90  },
          { name: 'Elevação Lateral',              sets: 3, reps: '15',    rest: 60  },
          { name: 'Tríceps Pulley',                sets: 3, reps: '12-15', rest: 60  },
          { name: 'Tríceps Testa',                 sets: 3, reps: '10-12', rest: 75  },
        ]
      },
      {
        name: 'Pull — Costas e Bíceps',
        exercises: [
          { name: 'Puxada Frontal',               sets: 4, reps: '8-10',  rest: 120 },
          { name: 'Remada Curvada com Barra',     sets: 4, reps: '8-10',  rest: 90  },
          { name: 'Remada Unilateral com Halter', sets: 3, reps: '10-12', rest: 75  },
          { name: 'Face Pull',                    sets: 3, reps: '15',    rest: 60  },
          { name: 'Rosca Direta com Barra',       sets: 3, reps: '10-12', rest: 75  },
          { name: 'Rosca Martelo',                sets: 3, reps: '12',    rest: 60  },
        ]
      },
      {
        name: 'Legs — Pernas e Glúteos',
        exercises: [
          { name: 'Agachamento Livre com Barra',  sets: 4, reps: '8-10',  rest: 120 },
          { name: 'Leg Press 45°',                sets: 3, reps: '12-15', rest: 90  },
          { name: 'Stiff com Barra',              sets: 3, reps: '10-12', rest: 90  },
          { name: 'Hip Thrust',                   sets: 4, reps: '10-12', rest: 90  },
          { name: 'Cadeira Extensora',            sets: 3, reps: '15',    rest: 60  },
          { name: 'Panturrilha em Pé',            sets: 4, reps: '15-20', rest: 60  },
        ]
      }
    ]
  },
  {
    id: 'adaptacao_anatomica',
    name: 'Adaptação Anatômica',
    days: 2,
    desc: 'Iniciantes · Osteopenia · Reabilitação · 2x/sem',
    sessions: [
      {
        name: 'Sessão A — Full Body Leve',
        exercises: [
          { name: 'Leg Press 45°',                sets: 3, reps: '15', rest: 75 },
          { name: 'Supino Reto com Barra',        sets: 3, reps: '15', rest: 75 },
          { name: 'Remada Baixa (Sentado)',        sets: 3, reps: '15', rest: 75 },
          { name: 'Desenvolvimento com Halteres', sets: 3, reps: '15', rest: 60 },
          { name: 'Prancha Frontal',              sets: 3, reps: '20s', rest: 60 },
        ]
      },
      {
        name: 'Sessão B — Full Body Leve',
        exercises: [
          { name: 'Cadeira Extensora',            sets: 3, reps: '15', rest: 75 },
          { name: 'Peck Deck (Voador)',           sets: 3, reps: '15', rest: 60 },
          { name: 'Puxada Frontal',               sets: 3, reps: '15', rest: 75 },
          { name: 'Elevação Lateral',             sets: 3, reps: '15', rest: 60 },
          { name: 'Hip Thrust',                   sets: 3, reps: '15', rest: 75 },
        ]
      }
    ]
  },
];

export async function renderPeriodization() {
  const students = await db.getAll('students');
  const macros = await db.getAll('macrocycles');
  const active = students.filter(s => s.status === 'Ativo');
  macros.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return `
    <div class="page-header">
      <div><h1>Periodização</h1><p class="subtitle">Planejamento científico de macrociclos</p></div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <select class="form-select" id="perioStudentFilter" style="min-width:180px">
          <option value="">Todos os alunos</option>
          ${active.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="addMacroBtn">+ Novo Macrociclo</button>
      </div>
    </div>
    <div id="periodizationContent">
      ${macros.length ? macros.map(m => renderMacroCard(m, students)).join('') : `
        <div class="empty-state">
          <div class="empty-icon">—</div>
          <h3>Nenhum macrociclo criado</h3>
          <p>Crie um planejamento de periodização para seus alunos</p>
        </div>`}
    </div>
  `;
}

function renderMacroCard(m, students) {
  const st = students.find(s => s.id === m.studentId);
  const currentWeek = Math.max(1, Math.ceil((Date.now() - new Date(m.startDate).getTime()) / (7 * 86400000)));
  const modelDef = PERIODIZATION_MODELS[m.type] || {};
  return `
    <div class="card mb-lg macro-card" data-student="${m.studentId || ''}" data-macro="${m.id || ''}">
      <div class="card-header">
        <div class="flex items-center gap-md">
          <div class="avatar avatar-sm">${st ? st.name[0] : '?'}</div>
          <div>
            <div class="card-title" style="margin:0">${st ? st.name : '?'} — ${m.name}</div>
            <div class="text-xs text-muted">${m.totalWeeks} semanas · ${modelDef.label || m.type} · Início: ${Calc.formatDate(m.startDate)}${m.workoutModelName ? ` · ${m.workoutModelName}` : ''}</div>
          </div>
        </div>
        <div class="flex gap-sm items-center">
          <span class="badge badge-${m.status === 'active' ? 'success' : 'warning'}">${m.status === 'active' ? 'Ativo' : 'Finalizado'}</span>
          <button class="btn btn-ghost btn-sm delete-macro" data-id="${m.id}" style="color:var(--danger)">✕</button>
        </div>
      </div>

      <div style="overflow-x:auto;margin-top:12px">
        <div style="display:flex;gap:4px;min-width:max-content;padding-bottom:4px">
          ${(m.weeks || []).map((w, i) => {
            const isCurrent = i + 1 === currentWeek;
            const isDeload = w.phase === 'deload';
            const color = isDeload ? '#3b82f6' : w.intensityPct >= 85 ? '#ef4444' : w.intensityPct >= 75 ? '#f97316' : w.intensityPct >= 65 ? '#eab308' : '#22c55e';
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px" title="Sem ${w.week}: ${w.label || w.phase} | Vol ${w.volumePct}% | Int ${w.intensityPct}%">
              <div style="width:26px;height:${Math.max(16, w.volumePct * 0.42)}px;background:${color}22;border:1px solid ${color};border-radius:3px;${isCurrent ? `box-shadow:0 0 0 2px ${color};` : ''}"></div>
              <div style="font-size:0.5rem;color:${color};font-weight:${isCurrent ? 700 : 400}">S${w.week}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="flex gap-lg mt-sm" style="flex-wrap:wrap">
        <span class="text-xs" style="color:#22c55e">— Leve</span>
        <span class="text-xs" style="color:#eab308">— Moderada</span>
        <span class="text-xs" style="color:#f97316">— Alta</span>
        <span class="text-xs" style="color:#ef4444">— Muito Alta</span>
        <span class="text-xs" style="color:#3b82f6">— Deload</span>
        ${m.trainingDays?.length ? `<span class="text-xs text-muted">· ${m.trainingDays.map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}</span>` : ''}
        ${m.generatedWorkouts ? `<span class="text-xs" style="color:var(--success)">· ${m.generatedWorkouts} treinos gerados</span>` : ''}
      </div>

      ${m.weekDetails ? `
      <div class="mt-md" style="border-top:1px solid var(--border-color);padding-top:12px;overflow-x:auto">
        <table class="data-table" style="font-size:0.78rem">
          <thead><tr><th>Sem</th><th>Fase</th><th>Séries</th><th>Reps</th><th>%1RM</th><th>RPE</th><th>Treino A</th><th>Treino B</th></tr></thead>
          <tbody>${m.weekDetails.map(wd => {
            const c = wd.phase === 'Deload' ? '#3b82f6' : wd.intensity >= 85 ? '#ef4444' : wd.intensity >= 75 ? '#f97316' : wd.intensity >= 65 ? '#eab308' : '#22c55e';
            return `<tr>
              <td><strong style="color:${c}">S${wd.week}</strong></td>
              <td style="color:${c}">${wd.phase}</td>
              <td>${wd.sets}</td><td>${wd.reps}</td>
              <td style="color:${c};font-weight:600">${wd.intensity}%</td>
              <td>${wd.rpe}</td>
              <td class="text-xs">${wd.trainA || '-'}</td>
              <td class="text-xs">${wd.trainB || '-'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>` : ''}

      <div class="mt-md" style="border-top:1px solid var(--border-color);padding-top:12px">
        <canvas id="macroChart_${m.id}" height="110"></canvas>
      </div>
    </div>`;
}

export function initPeriodization(navigateFn) {
  document.getElementById('perioStudentFilter')?.addEventListener('change', (e) => {
    const sid = e.target.value;
    document.querySelectorAll('.macro-card').forEach(card => {
      card.style.display = !sid || card.dataset.student === sid ? '' : 'none';
    });
  });

  document.querySelectorAll('.delete-macro').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Excluir macrociclo e todos os treinos gerados?')) return;
      const macroId = btn.dataset.id;
      const workouts = await db.getAll('workouts');
      for (const w of workouts.filter(w => w.macrocycleId === macroId)) await db.delete('workouts', w.id);
      const schedules = await db.getAll('schedules');
      for (const s of schedules.filter(s => s.macrocycleId === macroId)) await db.delete('schedules', s.id);
      await db.delete('macrocycles', macroId);
      notify.success('Macrociclo removido');
      navigateFn('/periodizacao');
    });
  });

  initMacroCharts();

  document.getElementById('addMacroBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    // Busca modelos personalizados da aba Exercícios → Meus Modelos (store cycles com isTemplate)
    const customCycles = (await db.getAll('cycles')).filter(c => c.isTemplate);

    let selectedTemplate = null;

    const builtInHTML = BUILT_IN_WORKOUT_TEMPLATES.map(t => `
      <div class="periodo-tpl-card" data-tpl-id="${t.id}" style="padding:10px 12px;border:1px solid var(--border-color);border-radius:7px;cursor:pointer;transition:border-color 0.15s,background 0.15s">
        <div style="font-weight:600;font-size:0.84rem">${t.name}</div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${t.desc}</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:3px">${t.sessions.length} sessões · ${t.sessions.reduce((a,s) => a + s.exercises.length, 0)} exercícios</div>
      </div>`).join('');

    const personalHTML = customCycles.length
      ? customCycles.map(c => {
          const totalEx = (c.workouts || []).reduce((a, w) => a + (w.exercises || []).length, 0);
          return `
          <div class="periodo-tpl-card" data-tpl-id="cycle_${c.id}" style="padding:10px 12px;border:1px solid var(--border-color);border-radius:7px;cursor:pointer;transition:border-color 0.15s,background 0.15s">
            <div style="font-weight:600;font-size:0.84rem">${c.name}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${c.goal || 'Geral'} · ${(c.workouts||[]).length} treinos · ${totalEx} exercícios</div>
            ${c.description ? `<div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">${c.description}</div>` : ''}
          </div>`;}).join('')
      : `<p class="text-xs text-muted" style="padding:8px 0">Nenhum modelo criado. Vá em <a href="#/exercicios" style="color:var(--primary)">Exercícios → Meus Modelos</a> para criar.</p>`;

    openModal({
      title: 'Novo Macrociclo', size: 'xl',
      content: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">

          <div>
            <div class="form-label" style="margin-bottom:10px">Modelo de treino *</div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px" id="builtInTpls">${builtInHTML}</div>
            <div class="form-label" style="margin-bottom:8px;border-top:1px solid var(--border-color);padding-top:12px">Seus modelos</div>
            <div style="display:flex;flex-direction:column;gap:6px" id="personalTpls">${personalHTML}</div>
          </div>

          <div>
            <div class="form-label" style="margin-bottom:10px">Configuração</div>
            <form id="macroForm">
              <div class="form-group">
                <label class="form-label">Aluno *</label>
                <select class="form-select" name="studentId" required>
                  <option value="">Selecione</option>
                  ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Nome</label>
                <input class="form-input" name="name" value="Macrociclo 1" />
              </div>
              <div class="form-group">
                <label class="form-label">Modelo de periodização *</label>
                <select class="form-select" name="type">
                  <optgroup label="Musculação">
                    <option value="linear">Linear — Volume↓ Intensidade↑</option>
                    <option value="reverse_linear">Linear Reversa — RML / Resistência</option>
                    <option value="undulating">Ondulatória (DUP)</option>
                    <option value="block">Em Blocos — Acum. → Intens. → Realiz.</option>
                    <option value="conjugate">Conjugada</option>
                    <option value="concurrent">Concorrente — Força + Metabólico</option>
                  </optgroup>
                  <optgroup label="Cardio / Endurance">
                    <option value="polarized">Polarizado — 80% Z1/Z2 + 20% Z4/Z5</option>
                    <option value="hiit">HIIT</option>
                    <option value="lsd">LSD — Longa Duração Baixa Intensidade</option>
                    <option value="threshold">Limiar Anaeróbio</option>
                    <option value="fartlek">Fartlek</option>
                  </optgroup>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Semanas</label>
                  <input class="form-input" name="totalWeeks" type="number" min="4" max="52" value="12" />
                </div>
                <div class="form-group">
                  <label class="form-label">Deload a cada</label>
                  <input class="form-input" name="deloadEvery" type="number" min="0" max="8" value="4" />
                  <div class="form-hint">0 = sem deload</div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Início</label>
                <input class="form-input" name="startDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
              </div>
              <div class="form-group">
                <label class="form-label">Dias de treino</label>
                <div class="flex gap-sm" style="flex-wrap:wrap">
                  ${TRAINING_DAYS.map(d => `<label style="display:flex;align-items:center;gap:4px;padding:4px 9px;border:1px solid var(--border-color);border-radius:6px;cursor:pointer;font-size:0.78rem"><input type="checkbox" name="trainingDays" value="${d.id}" ${[1,3,5].includes(d.id)?'checked':''}/>${d.label}</label>`).join('')}
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Horário</label>
                  <select class="form-select" name="trainingTime">${HOURS.map(h=>`<option value="${h}" ${h==='07:00'?'selected':''}>${h}</option>`).join('')}</select>
                </div>
                <div class="form-group">
                  <label class="form-label">Duração</label>
                  <select class="form-select" name="sessionDuration">
                    <option value="45">45 min</option><option value="60" selected>60 min</option>
                    <option value="75">75 min</option><option value="90">90 min</option>
                  </select>
                </div>
              </div>
            </form>

            <div id="tplPreview" style="display:none;margin-top:8px;border-top:1px solid var(--border-color);padding-top:10px">
              <div class="form-label" style="margin-bottom:8px">Cargas iniciais por exercício</div>
              <div id="tplExerciseLoads"></div>
            </div>
          </div>
        </div>
      `,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        {
          label: 'Gerar Macrociclo', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('macroForm'));
            const d = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione um aluno'); return; }
            if (!selectedTemplate) { notify.error('Selecione um modelo de treino à esquerda'); return; }

            d.totalWeeks = parseInt(d.totalWeeks) || 12;
            d.deloadEvery = parseInt(d.deloadEvery) || 4;
            d.trainingDays = fd.getAll('trainingDays').map(Number);
            d.sessionDuration = parseInt(d.sessionDuration) || 60;
            d.status = 'active';
            d.createdAt = new Date().toISOString();
            d.workoutModelName = selectedTemplate.name;
            d.weeks = generateWeeklyPlan(d.type, d.totalWeeks, null, d.deloadEvery);

            const loadInputs = document.querySelectorAll('.load-input');
            const exerciseLoads = {};
            loadInputs.forEach(inp => { exerciseLoads[inp.dataset.exKey] = parseFloat(inp.value) || 20; });

            const sessions = selectedTemplate.sessions || [{ name: selectedTemplate.name, exercises: selectedTemplate.exercises || [] }];
            const allExercises = sessions.flatMap(s => s.exercises);

            d.weekDetails = d.weeks.map((w, i) => {
              const isDeload = w.phase === 'deload';
              const prevWeek = i > 0 ? d.weeks[i-1] : null;
              return {
                week: w.week, phase: w.label || w.phase,
                sets: isDeload ? '2-3' : w.volumePct > 80 ? '4-5' : w.volumePct > 60 ? '3-4' : '3',
                reps: w.repsRange || '10-12',
                intensity: w.intensityPct,
                rpe: isDeload ? '4-5' : w.intensityPct >= 85 ? '8-9' : w.intensityPct >= 70 ? '7-8' : '6-7',
                volDelta: prevWeek ? Math.round(w.volumePct - prevWeek.volumePct) : 0,
                trainA: allExercises.slice(0,3).map(e=>e.name).join(', ') || '-',
                trainB: allExercises.slice(3,6).map(e=>e.name).join(', ') || '-',
              };
            });

            const savedMacro = await db.add('macrocycles', d);
            d.id = savedMacro.id;
            d.generatedWorkouts = 0;

            for (let w = 0; w < d.totalWeeks; w++) {
              const weekPlan = d.weeks[w];
              const weekStart = new Date(d.startDate);
              weekStart.setDate(weekStart.getDate() + (w * 7));
              const loadMultiplier = weekPlan.phase === 'deload' ? 0.6 : 0.85 + ((weekPlan.intensityPct - 60) / 200);

              for (let di = 0; di < d.trainingDays.length; di++) {
                const session = sessions[di % sessions.length];
                const dayOfWeek = d.trainingDays[di];
                const date = new Date(weekStart);
                const diff = dayOfWeek - date.getDay();
                date.setDate(date.getDate() + (diff >= 0 ? diff : diff + 7));

                const wkExercises = session.exercises.map(ex => ({
                  ...ex,
                  load: Math.round((exerciseLoads[ex.name] || 20) * loadMultiplier * 2) / 2,
                  week: w + 1,
                }));

                const savedWorkout = await db.add('workouts', {
                  studentId: d.studentId,
                  macrocycleId: savedMacro.id,
                  name: `${session.name} — Sem ${w+1}`,
                  date: date.toISOString().slice(0,10),
                  exercises: wkExercises,
                  phase: weekPlan.label || weekPlan.phase,
                  intensityPct: weekPlan.intensityPct,
                  isDeload: weekPlan.phase === 'deload',
                });

                await db.add('schedules', {
                  studentId: d.studentId,
                  workoutId: savedWorkout.id,
                  macrocycleId: savedMacro.id,
                  date: date.toISOString().slice(0,10),
                  time: d.trainingTime,
                  duration: d.sessionDuration,
                  workoutName: savedWorkout.name,
                  status: 'scheduled',
                  repeat: 'none',
                });
                d.generatedWorkouts++;
              }
            }

            await db.put('macrocycles', { ...savedMacro, ...d });
            notify.success(`Macrociclo gerado — ${d.generatedWorkouts} sessões criadas`);
            closeModal();
            navigateFn('/periodizacao');
          }
        }
      ]
    });

    setTimeout(() => {
      document.querySelectorAll('.periodo-tpl-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.periodo-tpl-card').forEach(c => {
            c.style.borderColor = 'var(--border-color)';
            c.style.background = '';
          });
          card.style.borderColor = 'var(--primary)';
          card.style.background = 'rgba(16,185,129,0.05)';

          const tplId = card.dataset.tplId;
          if (tplId.startsWith('cycle_')) {
            const cycleId = tplId.replace('cycle_', '');
            db.get('cycles', cycleId).then(cycle => {
              if (!cycle) return;
              // Converter estrutura cycles → sessions para o sistema
              selectedTemplate = {
                name: cycle.name,
                sessions: (cycle.workouts || []).map(w => ({
                  name: w.name,
                  exercises: (w.exercises || []).map(ex => ({
                    name: ex.name,
                    sets: ex.sets || 3,
                    reps: ex.reps || '10-12',
                    rest: ex.rest || 60,
                  }))
                }))
              };
              const allEx = selectedTemplate.sessions.flatMap(s => s.exercises);
              renderLoadInputs(allEx);
            });
          } else {
            selectedTemplate = BUILT_IN_WORKOUT_TEMPLATES.find(t => t.id === tplId);
            if (selectedTemplate) renderLoadInputs(selectedTemplate.sessions.flatMap(s => s.exercises));
          }
        });
      });
    }, 80);
  });
}

function renderLoadInputs(exercises) {
  const preview = document.getElementById('tplPreview');
  const container = document.getElementById('tplExerciseLoads');
  if (!preview || !container || !exercises.length) return;
  preview.style.display = '';
  container.innerHTML = exercises.map(ex => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-color)">
      <div>
        <div style="font-size:0.8rem;font-weight:500">${ex.name}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${ex.sets}×${ex.reps} · ${ex.rest}s</div>
      </div>
      <div style="display:flex;align-items:center;gap:5px">
        <input class="form-input load-input" data-ex-key="${ex.name}"
          type="number" min="0" step="0.5" value="20"
          style="width:65px;text-align:center;padding:3px 6px;font-size:0.82rem" />
        <span style="font-size:0.7rem;color:var(--text-muted)">kg</span>
      </div>
    </div>`).join('');
}

async function initMacroCharts() {
  const macros = await db.getAll('macrocycles');
  macros.forEach(m => {
    const canvas = document.getElementById(`macroChart_${m.id}`);
    if (!canvas || typeof Chart === 'undefined' || !m.weeks?.length) return;
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: m.weeks.map(w => `S${w.week}`),
        datasets: [
          { label: 'Volume %', data: m.weeks.map(w => w.volumePct), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.07)', tension: 0.3, fill: true, pointRadius: 2, borderWidth: 1.5 },
          { label: 'Intensidade %', data: m.weeks.map(w => w.intensityPct), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.07)', tension: 0.3, fill: true, pointRadius: 2, borderWidth: 1.5 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 } } },
        scales: {
          y: { min: 0, max: 110, ticks: { color: '#64748b', callback: v => v+'%', font: { size: 10 } }, grid: { color: 'rgba(148,163,184,0.07)' } },
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  });
}
