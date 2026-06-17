// ========================================
// PERSONAL PRO — Periodization Page (v5)
// Design limpo + templates com exercícios + fluxo correto
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';
import { PERIODIZATION_MODELS, generateProgression } from '../utils/periodization-engine.js';
import { BUILT_IN_TEMPLATES } from '../utils/workout-templates.js';
import { METHOD_PROGRESSIONS } from './workouts.js';

// Adaptar BUILT_IN_TEMPLATES para o formato que o periodization espera
function adaptTemplate(t) {
  return {
    id:        t.id,
    name:      t.name,
    days:      t.daysPerWeek || (t.workouts || []).length,
    desc:      t.description || '',
    category:  t.category || 'Musculação',
    perioModel:t.perioModel || null,
    // Todas as sessões disponíveis (para o seletor de protocolo)
    allSessions: (t.workouts || []).map(w => ({
      name:      w.name,
      exercises: (w.exercises || []).map(e => ({
        name:      e.name,
        sets:      e.sets || 3,
        reps:      e.reps || '12',
        rest:      parseInt(e.rest) || 0,
        loadType:  e.loadType || 'weight',
        method:    e.method || '',
        intensity: e.intensity || '',
        sciNote:   e.sciNote || '',
      })),
    })),
    // sessions = primeira sessão (default, pode ser alterado pelo usuário no modal)
    sessions: [(t.workouts || [])[0]].filter(Boolean).map(w => ({
      name:      w.name,
      exercises: (w.exercises || []).map(e => ({
        name: e.name, sets: e.sets || 3, reps: e.reps || '12',
        rest: parseInt(e.rest) || 0, loadType: e.loadType || 'weight',
        method: e.method || '', intensity: e.intensity || '',
      })),
    })),
  };
}

const BUILT_IN_WORKOUT_TEMPLATES = BUILT_IN_TEMPLATES.map(adaptTemplate);

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
      // Polarizado: 80% Z1/Z2 + 20% Z4/Z5
      const isHighInt = w % 5 === 0;
      weeks.push({ week: w, phase: isHighInt ? 'Alta Intensidade (Z4/Z5)' : 'Base Aeróbica (Z1/Z2)', label: `Semana ${w}`, intensityPct: isHighInt ? 88 : 55, volumePct: isHighInt ? 50 : 90, repsRange: isHighInt ? '4-6×4min' : '45-90min' });

    } else if (modelType === 'hiit') {
      // HIIT: progressão de intervalos semana a semana
      const intervals = Math.round(4 + progress * 4); // 4 → 8
      const workInt   = Math.round(20 + progress * 40); // 20s → 60s
      const phase     = progress < 0.33 ? 'Base HIIT' : progress < 0.66 ? 'Desenvolvimento' : 'Pico HIIT';
      weeks.push({ week: w, phase, label: `Semana ${w} — ${phase}`, intensityPct: Math.round(75 + progress * 20), volumePct: Math.round(60 + progress * 20), repsRange: `${intervals}×${workInt}s` });

    } else if (modelType === 'sit') {
      // SIT: sprints all-out, recuperação diminui
      const sprints = Math.round(4 + progress * 2); // 4 → 6
      const rest    = Math.round(240 - progress * 60); // 4min → 3min
      const phase   = progress < 0.4 ? 'Introdução SIT' : 'SIT Completo';
      weeks.push({ week: w, phase, label: `Semana ${w} — ${phase}`, intensityPct: 100, volumePct: Math.round(50 + progress * 20), repsRange: `${sprints}×30s / ${Math.round(rest/60)}min` });

    } else if (modelType === 'lvhiit') {
      // LV-HIIT: progressão de intervalos (Gillen 2016)
      const intervals = Math.round(3 + progress * 7); // 3 → 10
      weeks.push({ week: w, phase: progress < 0.4 ? 'Adaptação' : 'LV-HIIT', label: `Semana ${w}`, intensityPct: Math.round(80 + progress * 12), volumePct: Math.round(55 + progress * 20), repsRange: `${intervals}×60s/75s` });

    } else if (modelType === 'zone2') {
      // Base Aeróbica Zona 2 — progressão de duração
      const dur = Math.round(30 + progress * 60); // 30 → 90min
      const sessions = progress < 0.4 ? 3 : progress < 0.7 ? 4 : 5;
      weeks.push({ week: w, phase: 'Base Aeróbica (Z2)', label: `Semana ${w} — Z2`, intensityPct: 65, volumePct: Math.round(60 + progress * 30), repsRange: `${sessions}×${dur}min` });

    } else if (modelType === 'pyramidal') {
      // Pyramidal: 75%Z2 + 20%Z3 + 5%Z4
      const phase = progress < 0.4 ? 'Base Pyramidal' : 'Pyramidal Completo';
      weeks.push({ week: w, phase, label: `Semana ${w}`, intensityPct: Math.round(65 + progress * 15), volumePct: Math.round(65 + progress * 20), repsRange: '75%Z2+20%Z3+5%Z4' });

    } else if (modelType === 'threshold') {
      // Threshold — progressão no tempo de tempo run
      const thMin = Math.round(20 + progress * 40); // 20 → 60min
      const phase = progress < 0.3 ? 'Tempo Runs' : progress < 0.7 ? 'Threshold Intervals' : 'Threshold Pico';
      weeks.push({ week: w, phase, label: `Semana ${w} — ${phase}`, intensityPct: Math.round(75 + progress * 10), volumePct: Math.round(70 + progress * 15), repsRange: `${thMin}min limiar` });

    } else {
      // Modelos lineares e outros
      const models = {
        linear:         { start: 55, end: 92, volStart: 85, volEnd: 55 },
        reverse_linear: { start: 85, end: 50, volStart: 55, volEnd: 90 },
        lsd:            { start: 50, end: 70, volStart: 90, volEnd: 80 },
        fartlek:        { start: 58, end: 80, volStart: 82, volEnd: 68 },
        manual:         { start: 70, end: 70, volStart: 70, volEnd: 70 },
      };
      const m = models[modelType] || models.linear;
      const intensityPct = Math.round(m.start + (m.end - m.start) * progress);
      const volumePct    = Math.round(m.volStart + (m.volEnd - m.volStart) * progress);
      const repsRange    = intensityPct >= 88 ? '2-4' : intensityPct >= 78 ? '4-6' :
                           intensityPct >= 68 ? '6-10' : intensityPct >= 58 ? '10-12' : '12-15';
      // Fase por modelo — não pela intensidade genérica
      const CARDIO_MODELS = ['lsd','fartlek'];
      const phase = CARDIO_MODELS.includes(modelType)
        ? (progress < 0.33 ? 'Base Aeróbica' : progress < 0.66 ? 'Desenvolvimento' : 'Pico')
        : (intensityPct >= 85 ? 'Pico' : intensityPct >= 75 ? 'Força' :
           intensityPct >= 65 ? 'Hipertrofia' : 'Adaptação');
      weeks.push({ week: w, phase, label: `Semana ${w}`, intensityPct, volumePct, repsRange });
    }
  }
  return weeks;
}

const TRAINING_DAYS = [
  { id: 0, label: 'Dom' }, { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' }, { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' },
];

const HOURS = [
  '05:00', '05:15', '05:30', '05:45',
  '06:00', '06:15', '06:30', '06:45',
  '07:00', '07:15', '07:30', '07:45',
  '08:00', '08:15', '08:30', '08:45',
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
  '17:00', '17:15', '17:30', '17:45',
  '18:00', '18:15', '18:30', '18:45',
  '19:00', '19:15', '19:30', '19:45',
  '20:00', '20:15', '20:30', '20:45',
  '21:00', '21:15', '21:30', '21:45',
  '22:00',
];

// ── TEMPLATES PADRÃO COM EXERCÍCIOS ──────────────────────────

export async function renderPeriodization() {
  const students = await db.getAll('students');
  const macros = await db.getAll('macrocycles');
  const active = students.filter(s => s.status === 'Ativo');
  macros.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return `
    <div class="page-header">
      <div><h1>Periodização</h1><p class="subtitle">Planejamento científico de macrociclos</p></div>
      <div class="flex gap-sm" style="flex-wrap:wrap;align-items:center">
        <select class="form-select" id="perioStudentFilter" style="min-width:180px">
          <option value="">Todos os alunos</option>
          ${active.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="addMacroBtn">+ Novo Macrociclo</button>
      </div>
    </div>

    ${macros.length ? `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">ATIVOS</div>
        <div class="stat-value text-gradient">${macros.filter(m=>m.status==='active').length}</div>
        <div class="stat-change">macrociclos em curso</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">FINALIZADOS</div>
        <div class="stat-value" style="color:var(--accent)">${macros.filter(m=>m.status!=='active').length}</div>
        <div class="stat-change">ciclos concluídos</div>
      </div>
      <div class="stat-card" style="text-align:center;padding:12px">
        <div class="stat-label">TREINOS GERADOS</div>
        <div class="stat-value" style="color:var(--success)">${macros.reduce((t,m)=>t+(m.generatedWorkouts||0),0)}</div>
        <div class="stat-change">no total</div>
      </div>
    </div>` : ''}

    <div id="periodizationContent">
      ${macros.length ? macros.map(m => renderMacroCard(m, students)).join('') : `
        <div class="empty-state">
          <div class="empty-icon">—</div>
          <h3>Nenhum macrociclo criado</h3>
          <p>Crie um planejamento de periodização para seus alunos</p>
          <button class="btn btn-primary mt-sm" id="addMacroBtnEmpty">+ Criar Primeiro Macrociclo</button>
        </div>`}
    </div>
  `;
}

const ICON_DEL = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

function renderMacroCard(m, students) {
  const st = students.find(s => s.id === m.studentId);
  const now = Date.now();
  const startMs = new Date(m.startDate).getTime();
  const currentWeek = Math.max(1, Math.min(m.totalWeeks, Math.ceil((now - startMs) / (7 * 86400000))));
  const modelDef = PERIODIZATION_MODELS[m.type] || {};
  const isActive = m.status === 'active';
  const pct = Math.round((currentWeek / m.totalWeeks) * 100);
  const currentWeekData = (m.weeks || [])[currentWeek - 1];
  const currentPhase = currentWeekData?.phase || '—';
  const currentIntensity = currentWeekData?.intensityPct || 0;
  const intensityColor = currentIntensity >= 85 ? '#ef4444' : currentIntensity >= 75 ? '#f97316' : currentIntensity >= 65 ? '#eab308' : currentIntensity > 0 ? '#22c55e' : 'var(--text-muted)';

  return `
    <div class="card mb-lg macro-card" data-student="${m.studentId || ''}" data-macro="${m.id || ''}">
      <div class="card-header">
        <div class="flex items-center gap-md" style="flex:1;min-width:0">
          <div class="avatar">${st ? st.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${st ? st.name : '?'} — ${m.name}
            </div>
            <div class="text-xs text-muted">
              ${m.totalWeeks} semanas · ${modelDef.label || m.type}
              · Início: ${Calc.formatDate(m.startDate)}
              ${m.workoutModelName ? ` · ${m.workoutModelName}` : ''}
              ${m.trainingDays?.length ? ` · ${m.trainingDays.map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}` : ''}
            </div>
          </div>
        </div>
        <div class="flex gap-xs items-center" style="flex-shrink:0">
          <span class="badge badge-${isActive ? 'success' : 'warning'}">${isActive ? 'Ativo' : 'Finalizado'}</span>
          <a href="#/treinos" class="btn btn-ghost btn-sm" title="Ver treinos" style="padding:4px 6px;color:var(--accent)">${ICON_EYE}</a>
          ${isActive ? `<button class="btn btn-ghost btn-sm finish-macro" data-id="${m.id}" title="Finalizar macrociclo" style="padding:4px 6px;color:var(--success)">${ICON_CHECK}</button>` : ''}
          <button class="btn btn-ghost btn-sm delete-macro" data-id="${m.id}" title="Excluir macrociclo" style="padding:4px 6px;color:var(--danger)">${ICON_DEL}</button>
        </div>
      </div>

      ${isActive ? `
      <!-- Progresso e semana atual -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:12px 0">
        <div style="text-align:center;padding:8px;background:var(--bg-page);border-radius:8px">
          <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted)">Semana atual</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${currentWeek}</div>
          <div style="font-size:0.65rem;color:var(--text-muted)">de ${m.totalWeeks}</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--bg-page);border-radius:8px">
          <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted)">Fase</div>
          <div style="font-size:0.88rem;font-weight:700;color:${intensityColor};margin-top:4px">${currentPhase}</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--bg-page);border-radius:8px">
          <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted)">Intensidade</div>
          <div style="font-size:1.4rem;font-weight:800;color:${intensityColor}">${currentIntensity || '—'}${currentIntensity ? '%' : ''}</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--bg-page);border-radius:8px">
          <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted)">Progresso</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--accent)">${pct}%</div>
        </div>
      </div>
      <div style="height:5px;background:var(--border-color);border-radius:3px;margin-bottom:12px">
        <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:3px;transition:width 0.5s"></div>
      </div>` : ''}

      <!-- Gráfico de barras semanal -->
      <div style="overflow-x:auto">
        <div style="display:flex;gap:3px;min-width:max-content;padding-bottom:4px;align-items:flex-end">
          ${(m.weeks || []).map((w, i) => {
            const isCurrent = i + 1 === currentWeek && isActive;
            const isPast    = i + 1 < currentWeek;
            const isDeload  = w.phase === 'deload';
            const color = isDeload ? '#3b82f6' : w.intensityPct >= 85 ? '#ef4444' : w.intensityPct >= 75 ? '#f97316' : w.intensityPct >= 65 ? '#eab308' : '#22c55e';
            const opacity   = isPast ? '0.4' : '1';
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;opacity:${opacity}"
              title="Sem ${w.week}: ${w.label || w.phase} | Vol ${w.volumePct}% | Int ${w.intensityPct}% | Reps ${w.repsRange || '-'}">
              <div style="width:24px;height:${Math.max(12, (w.volumePct || 0) * 0.38)}px;
                background:${color}${isCurrent ? '' : '22'};
                border:1px solid ${color};border-radius:3px;
                ${isCurrent ? `box-shadow:0 0 0 2px ${color},0 0 8px ${color}44;` : ''}"></div>
              <div style="font-size:0.48rem;color:${color};font-weight:${isCurrent ? 700 : 400}">${isCurrent ? '▼' : ''}S${w.week}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="flex gap-md mt-xs" style="flex-wrap:wrap">
        <span class="text-xs" style="color:#22c55e">— Leve</span>
        <span class="text-xs" style="color:#eab308">— Moderada</span>
        <span class="text-xs" style="color:#f97316">— Alta</span>
        <span class="text-xs" style="color:#ef4444">— Muito Alta</span>
        <span class="text-xs" style="color:#3b82f6">— Deload</span>
        ${m.generatedWorkouts ? `<span class="text-xs" style="color:var(--success);margin-left:auto">${m.generatedWorkouts} treinos gerados</span>` : ''}
      </div>

      <!-- Tabela semanal colapsável -->
      <details style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:10px">
        <summary style="cursor:pointer;font-size:0.78rem;font-weight:600;color:var(--text-muted);list-style:none;display:flex;align-items:center;gap:6px;user-select:none">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          Plano semanal detalhado
        </summary>
        ${m.weekDetails ? `
        <div style="overflow-x:auto;margin-top:10px">
          <table class="data-table" style="font-size:0.76rem">
            <thead><tr><th>Sem</th><th>Fase</th><th>Séries</th><th>Reps</th><th>%1RM</th><th>RPE</th><th>Exercícios A</th><th>Exercícios B</th></tr></thead>
            <tbody>${m.weekDetails.map(wd => {
              const isCur = wd.week === currentWeek && isActive;
              const c = wd.phase === 'Deload' ? '#3b82f6' : (wd.intensity||0) >= 85 ? '#ef4444' : (wd.intensity||0) >= 75 ? '#f97316' : (wd.intensity||0) >= 65 ? '#eab308' : '#22c55e';
              return `<tr style="${isCur ? `background:${c}11;font-weight:600;` : ''}">
                <td><strong style="color:${c}">S${wd.week}${isCur ? ' ←' : ''}</strong></td>
                <td style="color:${c}">${wd.phase}</td>
                <td>${wd.sets}</td>
                <td>${wd.reps}</td>
                <td style="color:${c};font-weight:700">${wd.intensity}%</td>
                <td>${wd.rpe}</td>
                <td class="text-xs" style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${wd.trainA || '-'}</td>
                <td class="text-xs" style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${wd.trainB || '-'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>` : '<p class="text-xs text-muted mt-sm">Detalhamento não disponível</p>'}
      </details>

      <!-- Gráfico de linha Chart.js -->
      <div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px">
        <canvas id="macroChart_${m.id}" height="100"></canvas>
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

  // Finalizar macrociclo
  document.querySelectorAll('.finish-macro').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Marcar este macrociclo como finalizado?')) return;
      const macro = await db.get('macrocycles', btn.dataset.id);
      if (macro) {
        await db.put('macrocycles', { ...macro, status: 'finished' });
        notify.success('Macrociclo finalizado!');
        navigateFn('/periodizacao');
      }
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

  document.getElementById('addMacroBtnEmpty')?.addEventListener('click', () => {
    document.getElementById('addMacroBtn')?.click();
  });

  initMacroCharts();

  document.getElementById('addMacroBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    const settings = await db.get('settings', 'trainer') || {};
    const defaultWeeks = settings.defaultMacrocycleWeeks || 12;
    // Busca modelos personalizados da aba Exercícios → Meus Modelos (store cycles com isTemplate)
    const customCycles = (await db.getAll('cycles')).filter(c => c.isTemplate);
    const allMet = await db.getAll('methods');
    const allEx = await db.getAll('exercises');

    let selectedTemplate = null;

    // Agrupar templates por categoria
    const tplByCategory = {};
    BUILT_IN_WORKOUT_TEMPLATES.forEach(t => {
      const cat = t.category || 'Musculação';
      if (!tplByCategory[cat]) tplByCategory[cat] = [];
      tplByCategory[cat].push(t);
    });

    function tplCardHTML(t) {
      const isCardio = t.category === 'Cardio / Endurance';
      const exCount  = t.sessions.reduce((a,s) => a + s.exercises.length, 0);
      const catColor = isCardio ? 'var(--accent)' : 'var(--primary)';
      return `
        <label class="periodo-tpl-card" data-tpl-id="${t.id}" style="
          display:flex;align-items:center;gap:10px;
          padding:7px 10px;border:1px solid var(--border-color);
          border-radius:var(--radius-md);cursor:pointer;
          transition:border-color 0.15s,background 0.15s;background:var(--bg-card)">
          <span class="tpl-radio" style="
            width:16px;height:16px;border-radius:50%;border:2px solid var(--border-color);
            flex-shrink:0;display:flex;align-items:center;justify-content:center;
            transition:border-color 0.15s,background 0.15s">
          </span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="font-weight:600;font-size:0.8rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</div>
              ${isCardio ? `<span style="font-size:0.55rem;background:rgba(6,182,212,0.12);color:var(--accent);padding:1px 5px;border-radius:8px;font-weight:600;flex-shrink:0">Cardio</span>` : ''}
            </div>
            <div style="font-size:0.64rem;color:var(--text-muted);display:flex;gap:6px;margin-top:1px;flex-wrap:wrap">
              <span style="color:${catColor}">${t.sessions.length} sessão(ões)</span>
              <span>·</span><span>${exCount} ex.</span>
              ${t.days ? `<span>·</span><span>${t.days}×/sem</span>` : ''}
            </div>
          </div>
        </label>`;
    }

    const CAT_ORDER = ['Iniciante', 'Intermediário', 'Avançado', 'Hipertrofia', 'Força', 'Emagrecimento', 'Funcional', 'Reabilitação', 'Cardio / Endurance'];
    const builtInHTML = CAT_ORDER
      .filter(cat => tplByCategory[cat]?.length)
      .map(cat => `
        <div style="margin-bottom:8px">
          <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid var(--border-color)">${cat}</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${tplByCategory[cat].map(tplCardHTML).join('')}
          </div>
        </div>`).join('');

    const personalHTML = customCycles.length
      ? customCycles.map(c => {
          const totalEx = (c.workouts || []).reduce((a, w) => a + (w.exercises || []).length, 0);
          return `
          <div class="periodo-tpl-card" data-tpl-id="cycle_${c.id}" style="
            padding:10px 14px;border:1px solid var(--border-color);
            border-radius:var(--radius-md);cursor:pointer;
            transition:border-color 0.15s,background 0.15s;background:var(--bg-card)">
            <div style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">${c.name}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;display:flex;gap:8px">
              <span style="color:var(--primary)">${c.goal || 'Geral'}</span>
              <span>·</span><span>${(c.workouts||[]).length} treinos</span>
              <span>·</span><span>${totalEx} exercícios</span>
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
            <div id="standardTplList">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span style="display:inline-block;width:3px;height:16px;background:var(--primary);border-radius:2px"></span>
                <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">Modelo de Treino</span>
              </div>

              <!-- Cartão do Builder Personalizado -->
              <div class="periodo-tpl-card" id="customBuilderCard" data-tpl-id="custom_builder" style="
                padding:12px 14px;border:2px dashed var(--primary);
                border-radius:var(--radius-md);cursor:pointer;margin-bottom:16px;
                transition:border-color 0.15s,background 0.15s;background:var(--bg-card)">
                <div style="font-weight:700;font-size:0.88rem;color:var(--primary)">✨ Criar Periodização Personalizada (Do Zero)</div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-top:3px">Selecione para montar sua própria periodização, selecionando os exercícios da biblioteca um por um.</div>
              </div>

              <p class="text-xs text-muted mb-sm">Templates padrão do sistema <span style="color:var(--text-muted);font-size:0.65rem">(Musculação + Cardio)</span></p>
              <div style="display:flex;flex-direction:column;gap:0;margin-bottom:16px;max-height:280px;overflow-y:auto;padding-right:2px" id="builtInTpls">${builtInHTML}</div>

              <div style="border-top:1px solid var(--border-color);padding-top:14px;margin-top:4px">
                <p class="text-xs text-muted mb-sm">Seus modelos <span style="color:var(--text-muted);font-size:0.65rem">(Exercícios → Meus Modelos)</span></p>
                <div style="display:flex;flex-direction:column;gap:5px" id="personalTpls">${personalHTML}</div>
              </div>
            </div>

            <!-- Builder customizado oculto inicialmente -->
            <div id="customBuilderList" style="display:none">
              <button type="button" class="btn btn-ghost btn-sm mb-sm" id="cancelCustomBuilderBtn" style="font-size:0.75rem;padding:4px">← Escolher Template Pronto</button>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span style="display:inline-block;width:3px;height:16px;background:var(--primary);border-radius:2px"></span>
                <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">Periodização Personalizada</span>
              </div>
              <div id="customPeriodizationBuilder" style="max-height:450px;overflow-y:auto;padding-right:4px">
                <!-- Preenchido dinamicamente -->
              </div>
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
                <div class="custom-select-container" id="perioModelSelectContainer">
                  <select class="form-select" name="type" style="display:none">
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
                    <optgroup label="── Personalizado ──">
                      <option value="manual">Periodização Personalizada (Ajuste Manual)</option>
                    </optgroup>
                  </select>

                  <div class="custom-select-trigger" id="customPerioTrigger">
                    <div style="display:flex; align-items:center; gap:10px" id="customPerioVal">
                      <span class="option-icon" style="color:#3b82f6; display:flex; align-items:center">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                      </span>
                      <div style="display:flex; flex-direction:column; text-align:left">
                        <span class="option-title" style="font-size:0.82rem; font-weight:600; color:var(--text-primary)">Linear Clássica</span>
                        <span class="option-desc" style="font-size:0.7rem; color:var(--text-muted)">Volume↓ Intensidade↑</span>
                      </div>
                    </div>
                    <span class="arrow">▼</span>
                  </div>

                  <div class="custom-select-dropdown" id="customPerioDropdown"></div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Duração (semanas)</label>
                  <input class="form-input" name="totalWeeks" type="number" min="4" max="52" value="${defaultWeeks}" />
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
                <div style="display:flex;flex-wrap:wrap;gap:6px" id="builderDaysSelector">
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

          <!-- Planejamento de Cargas e Fases Semana a Semana -->
          <div style="grid-column: span 2; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 8px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="display:inline-block;width:3px;height:16px;background:var(--accent);border-radius:2px"></span>
              <span style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">Planejamento de Fases e Cargas Semana a Semana</span>
            </div>
            <p style="font-size:0.72rem;color:var(--text-muted);margin-bottom:10px">Ajuste os blocos de treinamento, fases, intensidades %, volumes % e repetições de cada semana antes de gerar os treinos.</p>
            <div id="weeklyPlanGrid" style="max-height: 280px; overflow-y: auto; background: var(--bg-page); border-radius: 8px; border: 1px solid var(--border-color); padding: 8px;">
              <!-- Preenchido dinamicamente -->
            </div>
          </div>
        </div>

        <datalist id="tplExList">${allEx.map(e=>`<option value="${e.name}">`).join('')}</datalist>
      `,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: () => closeModal() },
        {
          label: 'Gerar Macrociclo', class: 'btn-primary', onClick: async () => {
            const fd = new FormData(document.getElementById('macroForm'));
            const d = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione um aluno'); return; }
            if (!selectedTemplate) { notify.error('Selecione um modelo de treino ou crie um personalizado'); return; }

            d.totalWeeks  = parseInt(d.totalWeeks) || 12;
            d.deloadEvery = d.deloadEvery === '' ? 4 : parseInt(d.deloadEvery);
            d.trainingDays    = fd.getAll('trainingDays').map(Number);
            d.sessionDuration = parseInt(d.sessionDuration) || 60;
            d.status    = 'active';
            d.createdAt = new Date().toISOString();

            if (d.startDate) {
              const endD = new Date(d.startDate + 'T12:00');
              endD.setDate(endD.getDate() + (d.totalWeeks * 7));
              d.endDate = endD.toISOString().slice(0, 10);
            }

            let sessions = [];
            const exerciseLoads = {};

            if (selectedTemplate.id === 'custom_builder') {
              d.workoutModelName = 'Personalizado';
              // Build dynamic sessions array from builder inputs
              for (let di = 0; di < d.trainingDays.length; di++) {
                const exercises = [];
                const wkEl = document.querySelector(`#customPeriodizationBuilder .tpl-workout[data-wi="${di}"]`);
                if (wkEl) {
                  wkEl.querySelectorAll('.tpl-ex-row').forEach((exEl, ei) => {
                    const name = document.querySelector(`[name="wk_${di}_ex_${ei}"]`)?.value || '';
                    if (name) {
                      const sets = parseInt(document.querySelector(`[name="wk_${di}_sets_${ei}"]`)?.value) || 3;
                      const reps = document.querySelector(`[name="wk_${di}_reps_${ei}"]`)?.value || '12';
                      const rest = document.querySelector(`[name="wk_${di}_rest_${ei}"]`)?.value || '60';
                      const method = document.querySelector(`[name="wk_${di}_method_${ei}"]`)?.value || '';
                      const ex1rm = parseFloat(document.querySelector(`[name="wk_${di}_1rm_${ei}"]`)?.value) || 60;
                      
                      exercises.push({ name, sets, reps, rest, method });
                      exerciseLoads[name] = ex1rm;
                    }
                  });
                }
                const name = document.querySelector(`[name="wk_name_${di}"]`)?.value || `Treino ${String.fromCharCode(65 + di)}`;
                sessions.push({ name, exercises });
              }
              selectedTemplate = { name: 'Personalizado', sessions };
            } else {
              d.workoutModelName = selectedTemplate.name;
              const localSel = document.getElementById('cardioLocalSel');
              if (localSel) d.cardioLocal = localSel.value;

              const loadInputs = document.querySelectorAll('.load-input');
              loadInputs.forEach(inp => { exerciseLoads[inp.dataset.exKey] = parseFloat(inp.value) || 20; });
              sessions = selectedTemplate.sessions || [{ name: selectedTemplate.name, exercises: selectedTemplate.exercises || [] }];
            }

            if (sessions.length === 0 || sessions.every(s => s.exercises.length === 0)) {
              notify.error('Configure pelo menos um exercício nos seus treinos.');
              return;
            }

            // Obter plano semanal ajustado no grid pelo treinador
            const weeks = [];
            const weekRows = document.querySelectorAll('#weeklyPlanGrid .week-row');

            // Bug fix: se o grid não tem linhas (não foi renderizado ainda), gerar internamente
            if (weekRows.length === 0) {
              const typeVal = document.querySelector('#macroForm [name="type"]')?.value || 'linear';
              const deloadVal = d.deloadEvery ?? 4;
              const generated = generateInternalWeeklyPlan(typeVal, d.totalWeeks, deloadVal);
              weeks.push(...generated);
            } else {
              weekRows.forEach(row => {
                const weekNum = parseInt(row.dataset.week);
                const phase = row.querySelector('.week-phase').value;
                const intensityPct = parseInt(row.querySelector('.week-intensity').value) || 70;
                const volumePct = parseInt(row.querySelector('.week-volume').value) || 70;
                const repsRange = row.querySelector('.week-reps').value || '10-12';
                weeks.push({
                  week: weekNum,
                  phase: phase.toLowerCase() === 'deload' ? 'deload' : phase,
                  label: `Semana ${weekNum} — ${phase}`,
                  intensityPct,
                  volumePct,
                  repsRange
                });
              });
            }

            // Garantir que o número de semanas bate com totalWeeks
            if (weeks.length < d.totalWeeks) {
              const typeVal = document.querySelector('#macroForm [name="type"]')?.value || 'linear';
              const extra = generateInternalWeeklyPlan(typeVal, d.totalWeeks, d.deloadEvery ?? 4);
              for (let wi = weeks.length; wi < d.totalWeeks; wi++) {
                weeks.push(extra[wi] || { week: wi+1, phase:'Hipertrofia', label:`Semana ${wi+1}`, intensityPct:70, volumePct:75, repsRange:'10-12' });
              }
            }
            d.weeks = weeks;

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
              // Usar o plano da semana por índice (weeks[w]) pois weeks é ordenado por semana
              const weekPlan = d.weeks[w] || {
                week: w + 1, phase: 'Hipertrofia', label: `Semana ${w+1} — Hipertrofia`,
                intensityPct: 65 + Math.round((w / d.totalWeeks) * 25),
                volumePct: 70, repsRange: '10-12'
              };
              const weekStart = new Date(d.startDate + 'T12:00');
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

                let diff = dayOfWeek - currentDay;
                if (w === 0 && diff < 0) diff += 7;
                else if (diff < 0) diff += 7;
                date.setDate(date.getDate() + diff);

                const wkExercises = session.exercises.map(ex => {
                  const oneRM = exerciseLoads[ex.name] || 60;
                  const dbEx = allEx.find(e => e.name.toLowerCase().trim() === ex.name.toLowerCase().trim());
                  const exType = dbEx?.loadType || 'weight';

                  let load;
                  if (exType === 'time') {
                    load = Math.round(oneRM * loadMultiplier);
                  } else if (exType === 'bodyweight') {
                    load = Math.round(oneRM * loadMultiplier * 2) / 2;
                  } else {
                    load = Math.round(oneRM * (weekPlan.intensityPct / 100) * 2) / 2;
                    if (isDeload) load = Math.round(oneRM * 0.5 * 2) / 2;
                  }

                  const progression = METHOD_PROGRESSIONS[ex.method];
                  if (progression) {
                    const seriesProgression = progression.series.map((s, si) => {
                      let sLoad;
                      if (exType === 'time') {
                        sLoad = Math.round(oneRM * loadMultiplier * s.loadPct);
                      } else if (exType === 'bodyweight') {
                        sLoad = Math.round(oneRM * loadMultiplier * s.loadPct * 2) / 2;
                      } else {
                        sLoad = Math.round(load * s.loadPct * 2) / 2;
                      }
                      const sRest = s.rest != null ? s.rest : parseInt(ex.rest || 60);
                      return {
                        set: si + 1,
                        reps: s.reps,
                        load: sLoad,
                        rest: sRest,
                        label: s.label || `Série ${si + 1}`
                      };
                    });

                    return {
                      ...ex,
                      load: seriesProgression[0]?.load || load,
                      oneRM,
                      week: w + 1,
                      sets: seriesProgression.length,
                      reps: seriesProgression.map(s => s.reps).join('→'),
                      rest: seriesProgression[0]?.rest || ex.rest || 60,
                      seriesProgression
                    };
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
            notify.success(`Macrociclo gerado — ${d.generatedWorkouts} treinos criados`);
            closeModal();
            navigateFn('/periodizacao');
          }
        }
      ]
    });

    // Custom periodization builder logic
    const customBuilderContainer = document.getElementById('customPeriodizationBuilder');
    const updateCustomBuilder = async () => {
      if (selectedTemplate?.id === 'custom_builder') {
        const checkedDays = Array.from(document.querySelectorAll('#macroForm [name="trainingDays"]:checked')).map(el => parseInt(el.value));
        const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        
        let html = '';
        checkedDays.forEach((day, idx) => {
          html += `
            <div class="card mb-md tpl-workout" data-wi="${idx}" style="border:1px solid var(--border-active);padding:12px;margin-bottom:12px">
              <div class="card-header" style="padding:4px 0 8px">
                <input class="form-input" name="wk_name_${idx}" value="Treino ${String.fromCharCode(65 + idx)} (${dayNames[day]})" placeholder="Nome do Treino" style="font-weight:600;flex:1;font-size:0.82rem;padding:4px" />
              </div>
              <div class="tpl-exercises" data-wi="${idx}">
                <div class="flex items-center gap-xs mb-xs tpl-ex-row" data-ei="0" style="flex-wrap:wrap">
                  <input class="form-input" name="wk_${idx}_ex_0" list="tplExList" placeholder="Exercício" style="flex:2;min-width:130px;font-size:0.8rem;padding:4px" required />
                  <input class="form-input" name="wk_${idx}_sets_0" type="number" value="3" min="1" style="width:40px;text-align:center;font-size:0.8rem;padding:4px" title="Séries" />
                  <input class="form-input" name="wk_${idx}_reps_0" value="12" style="width:50px;text-align:center;font-size:0.8rem;padding:4px" title="Reps" />
                  <input class="form-input" name="wk_${idx}_rest_0" value="60" style="width:40px;text-align:center;font-size:0.8rem;padding:4px" title="Descanso" />
                  <select class="form-select" name="wk_${idx}_method_0" style="width:150px;font-size:0.75rem;padding:4px">
                    <option value="">— Método —</option>
                    ${allMet.map(m=>`<option value="${m.name}" data-sets="${m.sets||''}" data-reps="${m.repsHint||''}" data-rest="${m.restHint||''}" data-desc="${m.description||''}">${m.name}</option>`).join('')}
                  </select>
                  <input class="form-input load-input" name="wk_${idx}_1rm_0" type="number" step="0.5" value="60" style="width:50px;text-align:center;font-size:0.8rem;padding:4px" title="1RM Estimado (kg)" />
                  <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger);padding:2px 4px">✕</button>
                </div>
              </div>
              <button type="button" class="btn btn-ghost btn-sm add-tpl-ex mt-xs" data-wi="${idx}" style="font-size:0.75rem;padding:2px 6px">+ Exercício</button>
            </div>`;
        });

        if (checkedDays.length === 0) {
          html = `<div style="padding:20px;text-align:center;color:var(--text-muted)">Selecione pelo menos um dia de treino na coluna de Configuração à direita.</div>`;
        }

        customBuilderContainer.innerHTML = html;

        // Bind events
        customBuilderContainer.querySelectorAll('.add-tpl-ex').forEach(btn => {
          btn.onclick = () => {
            const wi = btn.dataset.wi;
            const cnt = customBuilderContainer.querySelector(`.tpl-exercises[data-wi="${wi}"]`);
            if (!cnt) return;
            const ei = cnt.querySelectorAll('.tpl-ex-row').length;
            cnt.insertAdjacentHTML('beforeend', `
              <div class="flex items-center gap-xs mb-xs tpl-ex-row" data-ei="${ei}" style="flex-wrap:wrap">
                <input class="form-input" name="wk_${wi}_ex_${ei}" list="tplExList" placeholder="Exercício" style="flex:2;min-width:130px;font-size:0.8rem;padding:4px" required />
                <input class="form-input" name="wk_${wi}_sets_${ei}" type="number" value="3" min="1" style="width:40px;text-align:center;font-size:0.8rem;padding:4px" title="Séries" />
                <input class="form-input" name="wk_${wi}_reps_${ei}" value="12" style="width:50px;text-align:center;font-size:0.8rem;padding:4px" title="Reps" />
                <input class="form-input" name="wk_${wi}_rest_${ei}" value="60" style="width:40px;text-align:center;font-size:0.8rem;padding:4px" title="Descanso" />
                <select class="form-select" name="wk_${wi}_method_${ei}" style="width:150px;font-size:0.75rem;padding:4px">
                  <option value="">— Método —</option>
                  ${allMet.map(m=>`<option value="${m.name}" data-sets="${m.sets||''}" data-reps="${m.repsHint||''}" data-rest="${m.restHint||''}" data-desc="${m.description||''}">${m.name}</option>`).join('')}
                </select>
                <input class="form-input load-input" name="wk_${wi}_1rm_${ei}" type="number" step="0.5" value="60" style="width:50px;text-align:center;font-size:0.8rem;padding:4px" title="1RM Estimado (kg)" />
                <button type="button" class="btn btn-ghost btn-sm rm-tpl-ex" style="color:var(--danger);padding:2px 4px">✕</button>
              </div>
            `);
            const lastRow = cnt.lastElementChild;
            if (lastRow) bindPeriodoMethodAutoFill(lastRow);
            customBuilderContainer.querySelectorAll('.rm-tpl-ex').forEach(b => {
              b.onclick = () => b.closest('.tpl-ex-row')?.remove();
            });
          };
        });

        customBuilderContainer.querySelectorAll('.rm-tpl-ex').forEach(b => {
          b.onclick = () => b.closest('.tpl-ex-row')?.remove();
        });
        
        customBuilderContainer.querySelectorAll('.tpl-ex-row').forEach(row => bindPeriodoMethodAutoFill(row));
      }
    };

    setTimeout(() => {
      // ── INICIALIZAR SELETOR CUSTOMIZADO DE PERIODIZAÇÃO ──
      const optionsData = [
        {
          group: 'Musculação',
          options: [
            { value: 'linear', label: 'Linear Clássica', desc: 'Volume↓ Intensidade↑', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>` },
            { value: 'reverse_linear', label: 'Linear Reversa', desc: 'RML / Resistência', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>` },
            { value: 'undulating', label: 'Ondulatória (DUP)', desc: 'Oscilações diárias', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>` },
            { value: 'block', label: 'Em Blocos (MST)', desc: 'Acumulação → Intensificação → Realização', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>` },
            { value: 'conjugate', label: 'Conjugada', desc: 'Esforço Máximo + Dinâmico', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>` },
            { value: 'concurrent', label: 'Concorrente', desc: 'Força + Metabólico', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>` }
          ]
        },
        {
          group: 'Cardio / Endurance',
          options: [
            { value: 'polarized', label: 'Polarizado', desc: '80% Z1/Z2 + 20% Z4/Z5', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4L12 12M20 20L12 12M4 12h8"></path></svg>` },
            { value: 'hiit', label: 'HIIT', desc: 'Intervalado de Alta Intensidade', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 0-4 4-4 8a4 4 0 0 0 8 0c0-4-4-8-4-8z"></path><path d="M12 10c0 0-2 2-2 4a2 2 0 0 0 4 0c0-2-2-2-2-2z"></path></svg>` },
            { value: 'lsd', label: 'LSD', desc: 'Longa Duração e Baixa Intensidade', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>` },
            { value: 'threshold', label: 'Limiar Anaeróbio', desc: 'Treino no limiar de lactato', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>` },
            { value: 'fartlek', label: 'Fartlek', desc: 'Variações de ritmo livres', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>` }
          ]
        },
        {
          group: 'Personalizado',
          options: [
            { value: 'manual', label: 'Periodização Personalizada', desc: 'Ajuste Manual', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>` }
          ]
        }
      ];

      const selectContainer = document.getElementById('perioModelSelectContainer');
      const trigger = document.getElementById('customPerioTrigger');
      const dropdown = document.getElementById('customPerioDropdown');
      const realSelect = document.querySelector('#macroForm [name="type"]');

      if (selectContainer && trigger && dropdown && realSelect) {
        let dropdownHTML = '';
        optionsData.forEach(grp => {
          dropdownHTML += `<div class="custom-select-group-title">${grp.group}</div>`;
          grp.options.forEach(opt => {
            dropdownHTML += `
              <div class="custom-select-option" data-value="${opt.value}">
                <span class="option-icon">${opt.icon}</span>
                <div class="option-content">
                  <div class="option-title">${opt.label}</div>
                  <div class="option-desc">${opt.desc}</div>
                </div>
              </div>
            `;
          });
        });
        dropdown.innerHTML = dropdownHTML;

        const syncCustomSelect = (val) => {
          const allOpts = optionsData.flatMap(g => g.options);
          const found = allOpts.find(o => o.value === val) || allOpts[0];
          
          const triggerVal = document.getElementById('customPerioVal');
          if (triggerVal) {
            triggerVal.innerHTML = `
              <span class="option-icon" style="display:flex; align-items:center">${found.icon}</span>
              <div style="display:flex; flex-direction:column; text-align:left">
                <span class="option-title" style="font-size:0.82rem; font-weight:600; color:var(--text-primary)">${found.label}</span>
                <span class="option-desc" style="font-size:0.7rem; color:var(--text-muted)">${found.desc}</span>
              </div>
            `;
          }

          dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
            if (opt.dataset.value === val) {
              opt.classList.add('selected');
            } else {
              opt.classList.remove('selected');
            }
          });
        };

        syncCustomSelect(realSelect.value);

        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          selectContainer.classList.toggle('open');
        });

        dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
          opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const newVal = opt.dataset.value;
            realSelect.value = newVal;
            realSelect.dispatchEvent(new Event('change'));
            selectContainer.classList.remove('open');
          });
        });

        document.addEventListener('click', (e) => {
          if (!selectContainer.contains(e.target)) {
            selectContainer.classList.remove('open');
          }
        });

        realSelect.addEventListener('change', () => {
          syncCustomSelect(realSelect.value);
        });
      }

      // ── GERADOR DE GRID SEMANAL INTERATIVO ──
      const renderWeeklyPlanGrid = () => {
        const typeSelect = document.querySelector('#macroForm [name="type"]');
        const type = typeSelect ? typeSelect.value : 'linear';
        const totalWeeksInput = document.querySelector('#macroForm [name="totalWeeks"]');
        const totalWeeks = totalWeeksInput ? (parseInt(totalWeeksInput.value) || 12) : 12;
        const deloadInput = document.querySelector('#macroForm [name="deloadEvery"]');
        const deloadEvery = deloadInput ? (parseInt(deloadInput.value) || 0) : 0;

        const baseWeeks = generateInternalWeeklyPlan(type, totalWeeks, deloadEvery);
        const gridContainer = document.getElementById('weeklyPlanGrid');
        if (!gridContainer) return;

        const phases = ['Adaptação', 'Hipertrofia', 'Força', 'Pico/RML', 'Deload', 'Resistência', 'Aeróbico', 'Cardio HIIT'];

        let html = `
          <table class="data-table" style="font-size:0.8rem; margin:0; border:none; width:100%">
            <thead>
              <tr style="background:var(--bg-card)">
                <th style="width:70px; padding:6px">Semana</th>
                <th style="padding:6px">Fase / Trabalho Principal</th>
                <th style="width:100px; padding:6px">Intensidade %</th>
                <th style="width:100px; padding:6px">Volume %</th>
                <th style="width:110px; padding:6px">Repetições</th>
              </tr>
            </thead>
            <tbody>
        `;

        baseWeeks.forEach(w => {
          html += `
            <tr class="week-row" data-week="${w.week}">
              <td style="padding:6px"><strong>Sem ${w.week}</strong></td>
              <td style="padding:6px">
                <select class="form-select week-phase" style="padding:4px 6px; font-size:0.75rem; width:100%; height:auto; background:var(--bg-card)">
                  ${phases.map(p => {
                    const selected = w.phase.toLowerCase().includes(p.toLowerCase().substring(0, 4)) || 
                                     (p === 'Deload' && w.phase === 'deload');
                    return `<option value="${p}" ${selected ? 'selected' : ''}>${p}</option>`;
                  }).join('')}
                </select>
              </td>
              <td style="padding:6px">
                <input class="form-input week-intensity" type="number" min="30" max="100" value="${w.intensityPct}" style="padding:4px 6px; font-size:0.75rem; text-align:center; width:100%; height:auto; background:var(--bg-card)" />
              </td>
              <td style="padding:6px">
                <input class="form-input week-volume" type="number" min="10" max="100" value="${w.volumePct}" style="padding:4px 6px; font-size:0.75rem; text-align:center; width:100%; height:auto; background:var(--bg-card)" />
              </td>
              <td style="padding:6px">
                <input class="form-input week-reps" value="${w.repsRange}" style="padding:4px 6px; font-size:0.75rem; text-align:center; width:100%; height:auto; background:var(--bg-card)" />
              </td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;

        gridContainer.innerHTML = html;
      };

      // Bind events to update grid automatically
      document.querySelector('#macroForm [name="type"]')?.addEventListener('change', (e) => {
        renderWeeklyPlanGrid();
        // Auto-selecionar template padrão conforme método de periodização
        const method = e.target.value;
        const DEFAULT_TEMPLATES_BY_METHOD = {
          'linear':          'hipertrofia_feminino_inter',
          'reverse_linear':  'funcional_iniciante',
          'undulating':      'hipertrofia_avancado',
          'block':           'forca_maxima_uni',
          'conjugate':       'forca_maxima_uni',
          'concurrent':      'hipertrofia_avancado',
          'polarized':       'cardio_polarizado',
          'hiit':            'cardio_hiit',
          'lsd':             'cardio_lsd',
          'threshold':       'cardio_limiar',
          'fartlek':         'cardio_fartlek',
        };
        const defaultTplId = DEFAULT_TEMPLATES_BY_METHOD[method];
        if (defaultTplId && !selectedTemplate) {
          const card = document.querySelector(`.periodo-tpl-card[data-tpl-id="${defaultTplId}"]`);
          if (card) card.click();
        }
      });
      document.querySelector('#macroForm [name="totalWeeks"]')?.addEventListener('input', renderWeeklyPlanGrid);
      document.querySelector('#macroForm [name="deloadEvery"]')?.addEventListener('input', renderWeeklyPlanGrid);

      // Render initially
      renderWeeklyPlanGrid();

      // Listener on student selection to load their force data if available
      document.querySelector('#macroForm [name="studentId"]')?.addEventListener('change', () => {
        if (selectedTemplate && selectedTemplate.id !== 'custom_builder') {
          const isCardio = selectedTemplate.category === 'Cardio / Endurance';
          if (!isCardio) {
            const allEx = selectedTemplate.sessions.flatMap(s => s.exercises)
              .filter(e => (e.loadType || 'weight') === 'weight');
            renderLoadInputs(allEx);
          }
        }
      });

      // Bind trainingDays checkboxes changes to update the builder dynamically
      document.querySelectorAll('#builderDaysSelector input[name="trainingDays"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateCustomBuilder);
      });

      // Card custom builder selection
      document.getElementById('customBuilderCard')?.addEventListener('click', () => {
        document.querySelectorAll('.periodo-tpl-card').forEach(c => {
          c.classList.remove('selected');
          c.style.borderColor = 'var(--border-color)';
          c.style.background = 'var(--bg-card)';
        });
        document.getElementById('customBuilderCard').classList.add('selected');
        document.getElementById('customBuilderCard').style.borderColor = 'var(--primary)';

        selectedTemplate = { id: 'custom_builder', name: 'Personalizado' };
        document.getElementById('standardTplList').style.display = 'none';
        document.getElementById('customBuilderList').style.display = 'block';
        document.getElementById('tplPreview').style.display = 'none';
        updateCustomBuilder();
      });

      document.getElementById('cancelCustomBuilderBtn')?.addEventListener('click', () => {
        selectedTemplate = null;
        document.getElementById('customBuilderList').style.display = 'none';
        document.getElementById('standardTplList').style.display = 'block';
      });

      // Standard templates selection
      document.querySelectorAll('.periodo-tpl-card:not(#customBuilderCard)').forEach(card => {
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
          // Reset all cards
          document.querySelectorAll('.periodo-tpl-card').forEach(c => {
            c.classList.remove('selected');
            c.style.borderColor = 'var(--border-color)';
            c.style.background = 'var(--bg-card)';
            const radio = c.querySelector('.tpl-radio');
            if (radio) { radio.style.borderColor = 'var(--border-color)'; radio.style.background = ''; radio.innerHTML = ''; }
          });
          // Highlight selected
          card.classList.add('selected');
          card.style.borderColor = 'var(--primary)';
          card.style.background = 'var(--primary-glow)';
          const radio = card.querySelector('.tpl-radio');
          if (radio) {
            radio.style.borderColor = 'var(--primary)';
            radio.style.background = 'var(--primary)';
            radio.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#fff;display:block"></span>';
          }

          const tplId = card.dataset.tplId;
          if (tplId.startsWith('cycle_')) {
            const cycleId = tplId.replace('cycle_', '');
            db.get('cycles', cycleId).then(cycle => {
              if (!cycle) return;
              selectedTemplate = {
                name: cycle.name,
                sessions: (cycle.workouts || []).map(w => ({
                  name: w.name,
                  exercises: (w.exercises || []).map(ex => ({
                    name: ex.name,
                    sets: ex.sets || 3,
                    reps: ex.reps || '10-12',
                    rest: ex.rest || 60,
                    method: ex.method || '',
                  }))
                }))
              };
              const allEx = selectedTemplate.sessions.flatMap(s => s.exercises);
              renderLoadInputs(allEx);
            });
          } else {
            selectedTemplate = BUILT_IN_WORKOUT_TEMPLATES.find(t => t.id === tplId);
            if (selectedTemplate) {
              if (selectedTemplate.perioModel) {
                const typeSelect = document.querySelector('#macroForm [name="type"]');
                if (typeSelect) {
                  typeSelect.value = selectedTemplate.perioModel;
                  typeSelect.dispatchEvent(new Event('change'));
                }
              }

              const isCardio   = selectedTemplate.category === 'Cardio / Endurance';
              const loadsEl    = document.getElementById('tplExerciseLoads');
              
              if (!selectedTemplate.sessions && selectedTemplate.workouts) {
                selectedTemplate = {
                  ...selectedTemplate,
                  sessions: selectedTemplate.workouts.map(w => ({
                    name: w.name,
                    exercises: w.exercises.map(ex => ({...ex}))
                  }))
                };
              }
              const allSess = selectedTemplate.allSessions || selectedTemplate.sessions || [];

              if (isCardio && loadsEl) {
                const hasMultiSess = allSess.length > 1;
                loadsEl.innerHTML = `
                  <div style="padding:12px;background:rgba(6,182,212,0.07);border-radius:8px;border-left:3px solid var(--accent);margin-bottom:10px">
                    <div style="font-size:0.78rem;color:var(--accent);font-weight:600;margin-bottom:3px">Template Cardio/Endurance</div>
                    <div class="text-xs text-muted">Sessões baseadas em tempo e zonas de FC/VO₂max.</div>
                  </div>
                  ${hasMultiSess ? `
                  <div class="form-group">
                    <label class="form-label">Protocolo principal a gerar <span class="text-xs text-muted">(sessão a repetir no macrociclo)</span></label>
                    <select class="form-select" id="cardioProtocolSel">
                      ${allSess.map((s,i) => `<option value="${i}">${s.name}</option>`).join('')}
                    </select>
                  </div>` : ''}
                  <div class="form-group">
                    <label class="form-label">Local / Equipamento principal</label>
                    <select class="form-select" id="cardioLocalSel">
                      <option value="Ao ar livre">Ao ar livre (corrida/caminhada)</option>
                      <option value="Esteira">Esteira</option>
                      <option value="Bicicleta ergométrica">Bicicleta ergométrica</option>
                      <option value="Ciclismo outdoor">Ciclismo outdoor</option>
                    </select>
                  </div>`;

                if (hasMultiSess) {
                  setTimeout(() => {
                    document.getElementById('cardioProtocolSel')?.addEventListener('change', e => {
                      const idx = parseInt(e.target.value);
                      selectedTemplate = { ...selectedTemplate, sessions: [allSess[idx]] };
                    });
                  }, 50);
                }
                selectedTemplate = { ...selectedTemplate, sessions: [allSess[0]] };
              } else {
                const allEx = selectedTemplate.sessions.flatMap(s => s.exercises)
                  .filter(e => (e.loadType || 'weight') === 'weight');
                renderLoadInputs(allEx);
              }
            }
          }
        });
      });
    }, 80);
  });
}

async function renderLoadInputs(exercises) {
  const preview = document.getElementById('tplPreview');
  const container = document.getElementById('tplExerciseLoads');
  if (!preview || !container || !exercises.length) return;
  preview.style.display = '';

  const BODYWEIGHT_KEYWORDS = ['prancha','flexão','burpee','barra fixa','pull-up','dip','afundo','superman','bird dog','russian twist','abdominal','crunch','mountain climber','jumping jack','polichinelo','ponte'];
  const TIMED_PATTERN = /^\d+s$/i;

  // Obter aluno selecionado
  const studentId = document.querySelector('#macroForm [name="studentId"]')?.value;
  let forceAssessments = [];
  if (studentId) {
    try {
      const allAssessments = await db.getAll('assessments');
      forceAssessments = allAssessments.filter(a => a.studentId === studentId && a.type === 'forca');
    } catch (e) {
      console.warn('Erro ao carregar avaliações do aluno para 1RM:', e);
    }
  }

  let html = '';
  for (const ex of exercises) {
    const nameLower = ex.name.toLowerCase();
    const isTimed = ex.loadType === 'time' || TIMED_PATTERN.test(String(ex.reps || ''));
    const isBodyweight = ex.loadType === 'bodyweight' || BODYWEIGHT_KEYWORDS.some(k => nameLower.includes(k));

    if (isTimed) {
      const defaultSec = parseInt(String(ex.reps).replace('s','')) || 30;
      html += `
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
      continue;
    }

    if (isBodyweight) {
      html += `
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
      continue;
    }

    // Tenta encontrar avaliação física para esse exercício (match parcial ou exato)
    const match = forceAssessments.find(a => 
      a.exercise && (
        a.exercise.toLowerCase() === nameLower ||
        nameLower.includes(a.exercise.toLowerCase()) ||
        a.exercise.toLowerCase().includes(nameLower)
      )
    );
    const defaultValue = match && match.rm1 ? match.rm1 : 60;
    const isFromAssessment = !!(match && match.rm1);

    html += `
      <div style="padding:7px 0;border-bottom:1px solid var(--border-color)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="flex:1">
            <div style="font-size:0.82rem;font-weight:500;color:var(--text-primary)">${ex.name}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:1px">
              ${ex.sets} séries × ${ex.reps} · ${ex.rest}s descanso
              ${isFromAssessment ? ` <span style="color:#22c55e;font-weight:600">📊 1RM Avaliado (${match.rm1}kg)</span>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-left:12px">
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
              <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:0.68rem;color:var(--text-muted)">1RM</span>
                <input class="form-input load-input" data-ex-key="${ex.name}" data-type="weight"
                  type="number" min="0" step="2.5" value="${defaultValue}"
                  style="width:68px;text-align:center;padding:4px 8px;font-size:0.82rem; ${isFromAssessment ? 'border-color:var(--success);box-shadow:0 0 4px rgba(16,185,129,0.3);' : ''}"
                  oninput="
                    const pct = 65;
                    const load = Math.round(parseFloat(this.value || 0) * (pct/100) * 2) / 2;
                    const el = this.closest('div').parentNode.querySelector('.load-preview');
                    if(el) el.textContent = 'Semana 1: ~' + load + 'kg (' + pct + '% 1RM)';
                  " />
                <span style="font-size:0.72rem;color:var(--text-muted)">kg</span>
              </div>
              <span class="load-preview" style="font-size:0.65rem;color:var(--primary)">Semana 1: ~${Math.round(defaultValue * 0.65 * 2) / 2}kg (65% 1RM)</span>
            </div>
          </div>
        </div>
      </div>`;
  }
  container.innerHTML = html;
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

function bindPeriodoMethodAutoFill(row) {
  const methodSelect = row.querySelector('select[name*="_method_"]');
  if (!methodSelect) return;
  methodSelect.addEventListener('change', () => {
    const opt = methodSelect.selectedOptions[0];
    const methodName = opt?.value || '';

    // Remove previous panels/tips
    row.querySelectorAll('.method-series-panel').forEach(p => p.remove());
    row.querySelectorAll('.method-tip').forEach(p => p.remove());

    const setsEl = row.querySelector('input[name*="_sets_"]');
    const repsEl = row.querySelector('input[name*="_reps_"]');
    const restEl = row.querySelector('input[name*="_rest_"]');

    if (!methodName) {
      return;
    }

    const sets = opt?.dataset.sets;
    const reps = opt?.dataset.reps;
    const rest = opt?.dataset.rest;

    if (sets && setsEl) setsEl.value = sets.replace(/[^0-9]/g, '') || '3';
    if (reps && repsEl) repsEl.value = reps;
    if (rest && restEl) {
      const match = rest.match(/(\d+)/);
      if (match) restEl.value = match[1];
    }

    // ── Verificar progressão ──
    const progression = METHOD_PROGRESSIONS[methodName];
    if (!progression) {
      const desc = opt?.dataset.desc;
      if (desc) {
        const tip = document.createElement('div');
        tip.className = 'method-tip';
        tip.style.cssText = 'font-size:0.72rem;color:var(--accent);margin-top:4px;width:100%;padding:6px 8px;background:rgba(6,182,212,0.07);border-radius:6px;border-left:2px solid var(--accent)';
        tip.innerHTML = `<strong>${methodName}</strong> — ${desc}`;
        row.appendChild(tip);
      }
      return;
    }

    // ── Método com progressão: gerar painel de sub-séries ──
    if (setsEl) setsEl.value = progression.series.length;

    const base1RMEl = row.querySelector('input[name*="_1rm_"]');
    const base1RM = parseFloat(base1RMEl?.value) || 60;

    const panel = document.createElement('div');
    panel.className = 'method-series-panel';
    panel.style.cssText = 'width:100%;margin-top:6px;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:10px 12px';

    const seriesHeader = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div>
          <span style="font-size:0.75rem;font-weight:700;color:var(--primary)">${methodName}</span>
          <span style="font-size:0.65rem;color:var(--text-muted);margin-left:6px">${progression.desc}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:0.65rem;color:var(--text-muted)">1RM Base (kg):</span>
          <input type="number" step="0.5" value="${base1RM}" placeholder="kg"
            class="form-input method-base-load"
            style="width:64px;padding:3px 6px;font-size:0.78rem;text-align:center" />
        </div>
      </div>`;

    const seriesLegend = `
      <div style="display:grid;grid-template-columns:80px 1fr 72px 72px 56px;gap:6px;margin-bottom:4px">
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Série</div>
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Descrição</div>
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Carga %</div>
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Reps</div>
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase">Desc.(s)</div>
      </div>`;

    const seriesHTML = progression.series.map((s, si) => {
      const calcLoad = base1RM > 0 ? Math.round(base1RM * s.loadPct * 2) / 2 : '';
      const restVal  = s.rest != null ? s.rest : (restEl?.value || '60');
      return `
        <div style="display:grid;grid-template-columns:80px 1fr 72px 72px 56px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(148,163,184,0.1)" data-serie="${si}">
          <div style="font-size:0.7rem;font-weight:600;color:var(--text-secondary)">${s.label}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${Math.round(s.loadPct * 100)}% 1RM</div>
          <div>
            <input type="number" step="0.5" value="${calcLoad}" placeholder="kg"
              class="form-input serie-load" data-serie="${si}"
              style="width:100%;padding:3px 6px;font-size:0.82rem;text-align:center;font-weight:600;${calcLoad?`color:var(--primary)`:''}"/>
          </div>
          <div style="font-size:0.72rem;color:var(--primary);font-weight:600;text-align:center">
            ${s.reps} reps
          </div>
          <div>
            <input type="number" value="${restVal}"
              class="form-input serie-rest" data-serie="${si}"
              style="width:100%;padding:3px 6px;font-size:0.78rem;text-align:center;color:var(--text-muted)"
              placeholder="s" title="Descanso (s)"/>
          </div>
        </div>`;
    }).join('');

    panel.innerHTML = seriesHeader + seriesLegend + seriesHTML;
    row.appendChild(panel);

    // Sync load changes
    const baseLoadInp = panel.querySelector('.method-base-load');
    baseLoadInp?.addEventListener('input', e => {
      const new1RM = parseFloat(e.target.value) || 0;
      if (base1RMEl) base1RMEl.value = new1RM || '';
      panel.querySelectorAll('.serie-load').forEach((inp, si) => {
        const s = progression.series[si];
        if (s && new1RM > 0) {
          inp.value = Math.round(new1RM * s.loadPct * 2) / 2;
          inp.style.color = 'var(--primary)';
        }
      });
    });

    if (base1RMEl) {
      base1RMEl.addEventListener('input', e => {
        const new1RM = parseFloat(e.target.value) || 0;
        if (baseLoadInp) baseLoadInp.value = new1RM || '';
        panel.querySelectorAll('.serie-load').forEach((inp, si) => {
          const s = progression.series[si];
          if (s && new1RM > 0) {
            inp.value = Math.round(new1RM * s.loadPct * 2) / 2;
            inp.style.color = 'var(--primary)';
          }
        });
      });
    }
  });
}
