// ========================================
// PERSONAL PRO — Periodization Page (v5)
// Design limpo + templates com exercícios + fluxo correto
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { PERIODIZATION_MODELS } from '../utils/periodization-engine.js';

// ── GERADOR DE SEMANAS INTERNO ─────────────────────────────
function generateInternalWeeklyPlan(modelType, totalWeeks, deloadEvery) {
  const weeks = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const isDeload = deloadEvery > 0 && w % deloadEvery === 0;

    if (isDeload) {
      weeks.push({ week: w, phase: 'deload', label: 'Deload', intensityPct: 50, volumePct: 40, repsRange: '12-15' });
      continue;
    }

    const progress = (w - 1) / Math.max(totalWeeks - 1, 1);

    if (modelType === 'undulating') {
      // DUP: alterna Força / Hipertrofia / Metabólico a cada semana com leve progressão
      const cycle = (w - 1) % 3;
      const progressBonus = Math.round(progress * 10);
      if (cycle === 0) weeks.push({ week: w, phase: 'Força', label: `Semana ${w} — Força`, intensityPct: 82 + progressBonus, volumePct: 55, repsRange: '4-6' });
      else if (cycle === 1) weeks.push({ week: w, phase: 'Hipertrofia', label: `Semana ${w} — Hipertrofia`, intensityPct: 70 + Math.round(progressBonus * 0.7), volumePct: 80, repsRange: '8-12' });
      else weeks.push({ week: w, phase: 'Metabólico', label: `Semana ${w} — Metabólico`, intensityPct: 58 + Math.round(progressBonus * 0.5), volumePct: 95, repsRange: '15-20' });

    } else if (modelType === 'block') {
      // Blocos: Acumulação → Intensificação → Realização
      const third = Math.ceil(totalWeeks / 3);
      if (w <= third) weeks.push({ week: w, phase: 'Acumulação', label: `Semana ${w} — Acumulação`, intensityPct: 60 + Math.round((w / third) * 8), volumePct: 90, repsRange: '12-15' });
      else if (w <= third * 2) weeks.push({ week: w, phase: 'Intensificação', label: `Semana ${w} — Intensificação`, intensityPct: 75 + Math.round(((w - third) / third) * 10), volumePct: 65, repsRange: '5-8' });
      else weeks.push({ week: w, phase: 'Realização', label: `Semana ${w} — Realização`, intensityPct: 88 + Math.round(((w - third * 2) / third) * 7), volumePct: 40, repsRange: '2-4' });

    } else if (modelType === 'conjugate') {
      // Conjugada: alterna Esforço Máximo / Esforço Dinâmico
      const isME = w % 2 !== 0;
      weeks.push({ week: w, phase: isME ? 'Esforço Máximo' : 'Esforço Dinâmico', label: `Semana ${w} — ${isME ? 'ME' : 'DE'}`, intensityPct: isME ? 92 + Math.round(progress * 3) : 55, volumePct: isME ? 40 : 70, repsRange: isME ? '1-3' : '3-5' });

    } else if (modelType === 'concurrent') {
      // Concorrente: alterna Força / Metabólico
      const isStrength = w % 2 !== 0;
      weeks.push({ week: w, phase: isStrength ? 'Força' : 'Metabólico', label: `Semana ${w}`, intensityPct: isStrength ? 68 + Math.round(progress * 12) : 58, volumePct: isStrength ? 70 : 90, repsRange: isStrength ? '8-12' : '15-20' });

    } else if (modelType === 'polarized') {
      // Polarizado: 80% baixa intensidade, 20% alta
      const isHighInt = w % 5 === 0;
      weeks.push({ week: w, phase: isHighInt ? 'Alta Intensidade (Z4/Z5)' : 'Baixa Intensidade (Z1/Z2)', label: `Semana ${w}`, intensityPct: isHighInt ? 88 : 55, volumePct: isHighInt ? 50 : 90, repsRange: isHighInt ? '4-6' : '15-20' });

    } else {
      // Modelos lineares e outros: progressão suave
      const models = {
        linear:        { start: 55, end: 92, volStart: 85, volEnd: 55 },
        reverse_linear:{ start: 85, end: 50, volStart: 55, volEnd: 90 },
        hiit:          { start: 65, end: 90, volStart: 80, volEnd: 65 },
        lsd:           { start: 50, end: 70, volStart: 90, volEnd: 80 },
        threshold:     { start: 60, end: 82, volStart: 85, volEnd: 70 },
        fartlek:       { start: 58, end: 80, volStart: 82, volEnd: 68 },
      };
      const m = models[modelType] || models.linear;
      const intensityPct = Math.round(m.start + (m.end - m.start) * progress);
      const volumePct    = Math.round(m.volStart + (m.volEnd - m.volStart) * progress);
      const repsRange    = intensityPct >= 88 ? '2-4' : intensityPct >= 78 ? '4-6' :
                           intensityPct >= 68 ? '6-10' : intensityPct >= 58 ? '10-12' : '12-15';
      const phase = intensityPct >= 85 ? 'Pico' : intensityPct >= 75 ? 'Força' :
                    intensityPct >= 65 ? 'Hipertrofia' : 'Adaptação';
      weeks.push({ week: w, phase, label: `Semana ${w}`, intensityPct, volumePct, repsRange });
    }
  }
  return weeks;
}

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
      <div class="periodo-tpl-card" data-tpl-id="${t.id}" style="
        padding:10px 14px;
        border:1px solid var(--border-color);
        border-radius:var(--radius-md);
        cursor:pointer;
        transition:border-color var(--transition-fast),background var(--transition-fast);
        background:var(--bg-card)">
        <div style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">${t.name}</div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px">${t.desc}</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px;display:flex;gap:8px">
          <span style="color:var(--accent)">${t.sessions.length} sessões</span>
          <span>·</span>
          <span>${t.sessions.reduce((a,s) => a + s.exercises.length, 0)} exercícios</span>
        </div>
      </div>`).join('');

    const personalHTML = customCycles.length
      ? customCycles.map(c => {
          const totalEx = (c.workouts || []).reduce((a, w) => a + (w.exercises || []).length, 0);
          return `
          <div class="periodo-tpl-card" data-tpl-id="cycle_${c.id}" style="
            padding:10px 14px;
            border:1px solid var(--border-color);
            border-radius:var(--radius-md);
            cursor:pointer;
            transition:border-color var(--transition-fast),background var(--transition-fast);
            background:var(--bg-card)">
            <div style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">${c.name}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;display:flex;gap:8px">
              <span style="color:var(--primary)">${c.goal || 'Geral'}</span>
              <span>·</span>
              <span>${(c.workouts||[]).length} treinos</span>
              <span>·</span>
              <span>${totalEx} exercícios</span>
            </div>
            ${c.description ? `<div style="font-size:0.68rem;color:var(--text-muted);margin-top:3px">${c.description}</div>` : ''}
          </div>`;}).join('')
      : `<div style="padding:12px;border:1px dashed var(--border-color);border-radius:var(--radius-md);text-align:center">
          <p class="text-xs text-muted" style="margin:0">Nenhum modelo criado ainda.</p>
          <a href="#/exercicios" style="font-size:0.75rem;color:var(--primary);text-decoration:none">Ir para Exercícios → Meus Modelos</a>
        </div>`;

    openModal({
      title: 'Novo Macrociclo', size: 'xl',
      content: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start">

          <!-- COLUNA ESQUERDA: Modelo de Treino -->
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <span style="display:inline-block;width:3px;height:16px;background:var(--primary);border-radius:2px"></span>
              <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">Modelo de Treino</span>
            </div>

            <p class="text-xs text-muted mb-sm">Templates padrão do sistema</p>
            <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:16px" id="builtInTpls">${builtInHTML}</div>

            <div style="border-top:1px solid var(--border-color);padding-top:14px;margin-top:4px">
              <p class="text-xs text-muted mb-sm">Seus modelos <span style="color:var(--text-muted);font-size:0.65rem">(Exercícios → Meus Modelos)</span></p>
              <div style="display:flex;flex-direction:column;gap:5px" id="personalTpls">${personalHTML}</div>
            </div>
          </div>

          <!-- COLUNA DIREITA: Configuração -->
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <span style="display:inline-block;width:3px;height:16px;background:var(--primary);border-radius:2px"></span>
              <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">Configuração</span>
            </div>

            <form id="macroForm">
              <div class="form-group">
                <label class="form-label">Aluno *</label>
                <select class="form-select" name="studentId" required>
                  <option value="">Selecione o aluno</option>
                  ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Nome do macrociclo</label>
                <input class="form-input" name="name" value="Macrociclo 1" placeholder="Ex: Macrociclo 1 — Hipertrofia" />
              </div>

              <div class="form-group">
                <label class="form-label">Modelo de periodização *</label>
                <select class="form-select" name="type">
                  <optgroup label="── Musculação ──">
                    <option value="linear">Linear — Volume↓ Intensidade↑</option>
                    <option value="reverse_linear">Linear Reversa — RML / Resistência</option>
                    <option value="undulating">Ondulatória (DUP) — Oscilações diárias</option>
                    <option value="block">Em Blocos — Acumulação → Intensificação → Realização</option>
                    <option value="conjugate">Conjugada — Esforço Máximo + Dinâmico</option>
                    <option value="concurrent">Concorrente — Força + Metabólico</option>
                  </optgroup>
                  <optgroup label="── Cardio / Endurance ──">
                    <option value="polarized">Polarizado — 80% Z1/Z2 + 20% Z4/Z5</option>
                    <option value="hiit">HIIT — Intervalado de Alta Intensidade</option>
                    <option value="lsd">LSD — Longa Duração e Baixa Intensidade</option>
                    <option value="threshold">Limiar Anaeróbio</option>
                    <option value="fartlek">Fartlek — Variações de ritmo livres</option>
                  </optgroup>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Duração (semanas)</label>
                  <input class="form-input" name="totalWeeks" type="number" min="4" max="52" value="12" />
                </div>
                <div class="form-group">
                  <label class="form-label">Deload a cada (sem)</label>
                  <input class="form-input" name="deloadEvery" type="number" min="0" max="8" value="4" />
                  <div class="form-hint">0 = sem deload</div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Data de início</label>
                <input class="form-input" name="startDate" type="date" value="${new Date().toISOString().slice(0,10)}" />
              </div>

              <div class="form-group">
                <label class="form-label">Dias de treino</label>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  ${TRAINING_DAYS.map(d => `
                    <label style="display:flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;font-size:0.8rem;transition:border-color var(--transition-fast),background var(--transition-fast)">
                      <input type="checkbox" name="trainingDays" value="${d.id}" ${[1,3,5].includes(d.id)?'checked':''}/>${d.label}
                    </label>`).join('')}
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Horário</label>
                  <select class="form-select" name="trainingTime">
                    ${HOURS.map(h=>`<option value="${h}" ${h==='07:00'?'selected':''}>${h}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Duração da sessão</label>
                  <select class="form-select" name="sessionDuration">
                    <option value="45">45 min</option>
                    <option value="60" selected>60 min</option>
                    <option value="75">75 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>
              </div>
            </form>

            <!-- Preview cargas -->
            <div id="tplPreview" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color)">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="display:inline-block;width:3px;height:16px;background:var(--accent);border-radius:2px"></span>
                <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">1RM Estimado por exercício</span>
              </div>
              <p style="font-size:0.7rem;color:var(--text-muted);margin-bottom:8px">Informe o 1RM (ou estimativa). O sistema calculará as cargas de treino semana a semana com base na % do modelo de periodização.</p>
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
            d.deloadEvery = d.deloadEvery === '' ? 4 : parseInt(d.deloadEvery); // 0 = sem deload
            d.trainingDays = fd.getAll('trainingDays').map(Number);
            d.sessionDuration = parseInt(d.sessionDuration) || 60;
            d.status = 'active';
            d.createdAt = new Date().toISOString();
            d.workoutModelName = selectedTemplate.name;

            // Gerar plano semanal interno (não depende de generateWeeklyPlan)
            d.weeks = generateInternalWeeklyPlan(d.type, d.totalWeeks, d.deloadEvery);

            const loadInputs = document.querySelectorAll('.load-input');
            const exerciseLoads = {};
            loadInputs.forEach(inp => { exerciseLoads[inp.dataset.exKey] = parseFloat(inp.value) || 20; });

            const sessions = selectedTemplate.sessions || [{ name: selectedTemplate.name, exercises: selectedTemplate.exercises || [] }];
            const allExercises = sessions.flatMap(s => s.exercises);

            d.weekDetails = (d.weeks || []).map((w, i) => {
              if (!w) return null;
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
            }).filter(Boolean);

            const savedMacro = await db.add('macrocycles', d);
            d.id = savedMacro.id;
            d.generatedWorkouts = 0;

            for (let w = 0; w < d.totalWeeks; w++) {
              const weekPlan = d.weeks[w] || {
                week: w + 1, phase: 'training', label: 'Treino',
                intensityPct: 65 + Math.round((w / d.totalWeeks) * 25),
                volumePct: 70, repsRange: '10-12'
              };
              const weekStart = new Date(d.startDate);
              weekStart.setDate(weekStart.getDate() + (w * 7));

              const baseIntensity = d.weeks[0]?.intensityPct || 60;
              const isDeload = weekPlan.phase === 'deload';
              const loadMultiplier = isDeload
                ? 0.6
                : 1 + ((weekPlan.intensityPct - baseIntensity) / 100);

              for (let di = 0; di < d.trainingDays.length; di++) {
                const session = sessions[di % sessions.length];
                const dayOfWeek = d.trainingDays[di];
                const date = new Date(weekStart);
                const currentDay = date.getDay();

                // Corrigir cálculo de data: nunca voltar para semana anterior
                let diff = dayOfWeek - currentDay;
                if (w === 0 && diff < 0) diff += 7; // primeira semana: avança para próxima ocorrência
                else if (diff < 0) diff += 7;
                date.setDate(date.getDate() + diff);

                const wkExercises = session.exercises.map(ex => {
                  const oneRM = exerciseLoads[ex.name] || 60;
                  const exType = document.querySelector(`.load-input[data-ex-key="${ex.name}"]`)?.dataset.type || 'weight';

                  let load;
                  if (exType === 'time') {
                    // Tempo: aumenta proporcionalmente com a intensidade
                    load = Math.round(oneRM * loadMultiplier);
                  } else if (exType === 'bodyweight') {
                    // Peso corporal: carga adicional aumenta
                    load = Math.round(oneRM * loadMultiplier * 2) / 2;
                  } else {
                    // Carga = 1RM × % intensidade da semana
                    load = Math.round(oneRM * (weekPlan.intensityPct / 100) * 2) / 2;
                    if (isDeload) load = Math.round(oneRM * 0.5 * 2) / 2;
                  }

                  return { ...ex, load, oneRM, week: w + 1 };
                });

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
        card.addEventListener('mouseenter', () => {
          if (!card.classList.contains('selected')) {
            card.style.borderColor = 'var(--border-active)';
            card.style.background = 'var(--bg-card-hover)';
          }
        });
        card.addEventListener('mouseleave', () => {
          if (!card.classList.contains('selected')) {
            card.style.borderColor = 'var(--border-color)';
            card.style.background = 'var(--bg-card)';
          }
        });
        card.addEventListener('click', () => {
          document.querySelectorAll('.periodo-tpl-card').forEach(c => {
            c.classList.remove('selected');
            c.style.borderColor = 'var(--border-color)';
            c.style.background = 'var(--bg-card)';
          });
          card.classList.add('selected');
          card.style.borderColor = 'var(--primary)';
          card.style.background = 'var(--primary-glow)';

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

  const BODYWEIGHT_KEYWORDS = ['prancha','flexão','burpee','barra fixa','pull-up','dip','afundo','superman','bird dog','russian twist','abdominal','crunch','mountain climber','jumping jack','polichinelo','ponte'];
  const TIMED_PATTERN = /^\d+s$/i;

  container.innerHTML = exercises.map(ex => {
    const nameLower = ex.name.toLowerCase();
    const isTimed = ex.loadType === 'time' || TIMED_PATTERN.test(String(ex.reps || ''));
    const isBodyweight = ex.loadType === 'bodyweight' || BODYWEIGHT_KEYWORDS.some(k => nameLower.includes(k));

    if (isTimed) {
      const defaultSec = parseInt(String(ex.reps).replace('s','')) || 30;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-color)">
          <div style="flex:1">
            <div style="font-size:0.82rem;font-weight:500;color:var(--text-primary)">${ex.name}</div>
            <div style="font-size:0.68rem;color:var(--accent);margin-top:1px">Isométrico · ${ex.sets} séries × ${ex.reps}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-left:12px">
            <input class="form-input load-input" data-ex-key="${ex.name}" data-type="time"
              type="number" min="5" step="5" value="${defaultSec}"
              style="width:68px;text-align:center;padding:4px 8px;font-size:0.82rem" />
            <span style="font-size:0.72rem;color:var(--text-muted);min-width:22px">seg</span>
          </div>
        </div>`;
    }

    if (isBodyweight) {
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-color)">
          <div style="flex:1">
            <div style="font-size:0.82rem;font-weight:500;color:var(--text-primary)">${ex.name}</div>
            <div style="font-size:0.68rem;color:var(--success);margin-top:1px">Peso corporal · ${ex.sets} séries × ${ex.reps} reps</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-left:12px">
            <input class="form-input load-input" data-ex-key="${ex.name}" data-type="bodyweight"
              type="number" min="0" step="0.5" value="0"
              style="width:68px;text-align:center;padding:4px 8px;font-size:0.82rem" />
            <span style="font-size:0.72rem;color:var(--text-muted);min-width:24px">+kg</span>
          </div>
        </div>`;
    }

    // Exercício com carga — input de 1RM com preview da carga de treino
    return `
      <div style="padding:7px 0;border-bottom:1px solid var(--border-color)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="flex:1">
            <div style="font-size:0.82rem;font-weight:500;color:var(--text-primary)">${ex.name}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:1px">${ex.sets} séries × ${ex.reps} · ${ex.rest}s descanso</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-left:12px">
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
              <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:0.68rem;color:var(--text-muted)">1RM</span>
                <input class="form-input load-input" data-ex-key="${ex.name}" data-type="weight"
                  type="number" min="0" step="2.5" value="60"
                  style="width:68px;text-align:center;padding:4px 8px;font-size:0.82rem"
                  oninput="
                    const pct = 65;
                    const load = Math.round(parseFloat(this.value || 0) * (pct/100) * 2) / 2;
                    const el = this.closest('div').querySelector('.load-preview');
                    if(el) el.textContent = 'Semana 1: ~' + load + 'kg (' + pct + '% 1RM)';
                  " />
                <span style="font-size:0.72rem;color:var(--text-muted)">kg</span>
              </div>
              <span class="load-preview" style="font-size:0.65rem;color:var(--primary)">Semana 1: ~39kg (65% 1RM)</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
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
