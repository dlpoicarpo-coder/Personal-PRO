// ========================================
// PERSONAL PRO — Periodization Page (v3)
// Auto-generate macrocycle with exercises from library
// Days/times + auto-create workouts for tracker
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { PERIODIZATION_TYPES, MESOCYCLE_PHASES, generateWeeklyPlan } from '../utils/periodization-models.js';
import { generateWorkouts } from '../utils/workout-generator.js';
import { openModal, closeModal } from '../components/modal.js';
import { notify } from '../components/toast.js';

const TRAINING_DAYS = [
  { id: 0, label: 'Dom' }, { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' }, { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' },
];

const HOURS = ['05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export async function renderPeriodization() {
  const students = await db.getAll('students');
  const macros = await db.getAll('macrocycles');
  const active = students.filter(s => s.status === 'Ativo');
  macros.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return `
    <div class="page-header"><div><h1>Periodização</h1><p class="subtitle">Planejamento de macrociclos e variação de volume/intensidade</p></div>
      <button class="btn btn-primary" id="addMacroBtn">+ Novo Macrociclo</button>
    </div>
    ${macros.length ? macros.map(m => {
    const st = students.find(s => s.id === m.studentId);
    const typeInfo = PERIODIZATION_TYPES.find(t => t.id === m.type) || {};
    const currentWeek = Math.ceil((Date.now() - new Date(m.startDate).getTime()) / (7 * 86400000));
    return `
      <div class="card mb-lg">
        <div class="card-header">
          <span class="card-title"><span class="avatar avatar-sm">${st ? st.name[0] : '?'}</span> ${st ? st.name : '?'} — ${m.name}</span>
          <div class="flex gap-sm">
            <span class="badge badge-${m.status === 'active' ? 'success' : 'warning'}">${m.status === 'active' ? 'Ativo' : 'Finalizado'}</span>
            <button class="btn btn-ghost btn-sm delete-macro" data-id="${m.id}" style="color:var(--danger)" title="Excluir">✕</button>
          </div>
        </div>
        <div class="flex gap-lg text-sm text-muted mb-md" style="flex-wrap:wrap">
          <span>${m.totalWeeks} semanas</span>
          <span>${typeInfo.name || m.type}</span>
          <span>Início: ${Calc.formatDate(m.startDate)}</span>
          <span>Deload: cada ${m.deloadEvery || 4} sem.</span>
          ${m.trainingDays ? `<span>Dias: ${m.trainingDays.map(d => TRAINING_DAYS.find(t => t.id === d)?.label || d).join(', ')}</span>` : ''}
          ${m.trainingTime ? `<span>Horário: ${m.trainingTime}</span>` : ''}
          ${m.generatedWorkouts ? `<span class="badge badge-success">Treinos gerados: ${m.generatedWorkouts}</span>` : ''}
        </div>
        <div style="overflow-x:auto">
          <div class="week-timeline">${(m.weeks || []).map((w, i) => {
      const phase = MESOCYCLE_PHASES.find(p => p.id === w.phase);
      const bgColor = phase ? phase.color : '#64748b';
      // Intensity-based color: green(low) → yellow → orange → red(high) → blue(deload)
      const intColor = w.phase === 'deload' ? '#3b82f6' : w.intensityPct >= 85 ? '#ef4444' : w.intensityPct >= 75 ? '#f97316' : w.intensityPct >= 65 ? '#eab308' : '#22c55e';
      const intLabel = w.phase === 'deload' ? '🧊 Deload' : w.intensityPct >= 85 ? '🔴 Muito Alta' : w.intensityPct >= 75 ? '🟠 Alta' : w.intensityPct >= 65 ? '🟡 Moderada' : '🟢 Leve';
      return `<div class="week-block ${i + 1 === currentWeek ? 'week-current' : ''}" style="--week-color:${intColor};border-bottom:3px solid ${intColor}" title="Sem ${w.week}: ${w.label}\nVolume: ${w.volumePct}% | Intensidade: ${w.intensityPct}%\n${intLabel}\nReps: ${w.repsRange}">
              <div class="week-num" style="color:${intColor}">S${w.week}</div>
              <div class="week-bar-vol" style="height:${w.volumePct * 0.5}px;background:${intColor}40"></div>
              <div class="week-bar-int" style="height:${w.intensityPct * 0.5}px;background:${intColor}"></div>
              <div class="week-label" style="font-size:0.6rem">${w.label?.substring(0, 4) || ''}</div>
            </div>`;
    }).join('')}</div>
        </div>
        <div class="flex gap-lg mt-md text-xs text-muted" style="flex-wrap:wrap">
          <span style="color:#22c55e">● Leve (&lt;65%)</span>
          <span style="color:#eab308">● Moderada (65-74%)</span>
          <span style="color:#f97316">● Alta (75-84%)</span>
          <span style="color:#ef4444">● Muito Alta (≥85%)</span>
          <span style="color:#3b82f6">● Deload</span>
        </div>
        <div class="mt-md"><canvas id="macroChart_${m.id}" height="150"></canvas></div>
        ${m.weekDetails ? `
        <div class="mt-lg" style="border-top:1px solid var(--border-color);padding-top:16px">
          <h4 class="mb-md">Detalhamento Semanal</h4>
          <div class="table-container"><table class="data-table"><thead><tr>
            <th>Sem</th><th>Fase</th><th>Séries</th><th>Reps</th><th>%1RM</th><th>RPE</th><th>Vol Δ</th><th>Treino A</th><th>Treino B</th>
          </tr></thead><tbody>
          ${m.weekDetails.map(wd => {
            const intColor = wd.phase === 'Deload' ? '#3b82f6' : wd.intensity >= 85 ? '#ef4444' : wd.intensity >= 75 ? '#f97316' : wd.intensity >= 65 ? '#eab308' : '#22c55e';
            const intEmoji = wd.phase === 'Deload' ? '🧊' : wd.intensity >= 85 ? '🔴' : wd.intensity >= 75 ? '🟠' : wd.intensity >= 65 ? '🟡' : '🟢';
            return `<tr style="${wd.phase === 'Deload' ? 'opacity:0.7' : ''};border-left:3px solid ${intColor}">
            <td><strong style="color:${intColor}">S${wd.week}</strong></td>
            <td><span class="badge" style="background:${intColor}20;color:${intColor}">${intEmoji} ${wd.phase}</span></td>
            <td>${wd.sets}</td><td>${wd.reps}</td><td style="color:${intColor};font-weight:600">${wd.intensity}%</td><td>${wd.rpe}</td>
            <td style="color:${wd.volDelta > 0 ? 'var(--success)' : wd.volDelta < 0 ? 'var(--danger)' : 'var(--text-secondary)'}">${wd.volDelta > 0 ? '+' : ''}${wd.volDelta}%</td>
            <td class="text-sm">${wd.trainA || '-'}</td><td class="text-sm">${wd.trainB || '-'}</td>
          </tr>`;
          }).join('')}
          </tbody></table></div>
        </div>`: ''}
      </div>`;
  }).join('') : `<div class="empty-state"><div class="empty-icon" style="font-size:2rem">—</div><h3>Nenhum macrociclo criado</h3><p>Crie um planejamento de periodização para seus alunos</p></div>`}
  `;
}

export function initPeriodization(navigateFn) {
  document.getElementById('addMacroBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    const exercises = await db.getAll('exercises');
    const muscleGroups = [...new Set(exercises.map(e => e.muscleGroup).filter(Boolean))];

    openModal({
      title: '+ Novo Macrociclo Completo', size: 'xl',
      content: `<form id="macroForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Aluno *</label><select class="form-select" name="studentId" required><option value="">Selecione</option>${students.map(s => `<option value="${s.id}">${s.name} — ${s.goal || 'Geral'}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Nome do Macrociclo</label><input class="form-input" name="name" value="Macrociclo 1" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Modelo de Periodização *</label><select class="form-select" name="type">${PERIODIZATION_TYPES.map(t => `<option value="${t.id}">${t.name} — ${t.desc}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Objetivo</label><select class="form-select" name="goal"><option>Hipertrofia</option><option>Força</option><option>Resistência</option><option>Condicionamento</option><option>Saúde</option></select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Duração (semanas)</label><input class="form-input" name="totalWeeks" type="number" min="4" max="52" value="12" /></div>
          <div class="form-group"><label class="form-label">Data de Início</label><input class="form-input" name="startDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
          <div class="form-group"><label class="form-label">Deload a cada (sem)</label><input class="form-input" name="deloadEvery" type="number" min="0" max="8" value="4" /><div class="form-hint">0 = sem deload</div></div>
        </div>

        <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
          <h4 class="mb-sm">Dias e Horários de Treino</h4>
          <p class="text-muted text-sm mb-md">Selecione os dias da semana e horário de treino do aluno</p>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Dias da Semana</label>
              <div class="flex gap-sm" style="flex-wrap:wrap">
                ${TRAINING_DAYS.map(d => `<label class="flex items-center gap-xs" style="padding:6px 12px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer">
                  <input type="checkbox" name="trainingDays" value="${d.id}" ${[1, 3, 5].includes(d.id) ? 'checked' : ''}/>
                  ${d.label}
                </label>`).join('')}
              </div>
            </div>
            <div class="form-group"><label class="form-label">Horário</label>
              <select class="form-select" name="trainingTime">${HOURS.map(h => `<option value="${h}" ${h === '07:00' ? 'selected' : ''}>${h}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label class="form-label">Duração da Sessão</label>
              <select class="form-select" name="sessionDuration"><option value="45">45 min</option><option value="60" selected>60 min</option><option value="75">75 min</option><option value="90">90 min</option></select>
            </div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
          <h4 class="mb-sm">Modelo de Treino</h4>
          <p class="text-muted text-sm mb-md">Selecione treinos existentes do aluno ou use exercícios da biblioteca</p>
          <div class="form-group mb-md">
            <label class="form-label">Usar treinos criados pelo personal</label>
            <select class="form-select" id="workoutModelSelect"><option value="">Gerar automaticamente da biblioteca</option></select>
          </div>
          <h4 class="mb-sm">Grupos Musculares (se geração automática)</h4>
          <div class="flex gap-sm" style="flex-wrap:wrap">
            ${muscleGroups.map(g => `<label class="flex items-center gap-xs" style="padding:5px 10px;border:1px solid var(--border-color);border-radius:6px;cursor:pointer">
              <input type="checkbox" name="muscleGroups" value="${g}" checked/> ${g}
            </label>`).join('')}
          </div>
          <p class="text-muted text-xs mt-sm">${exercises.length} exercícios na biblioteca</p>
        </div>

        <div id="blockPhasesGroup" style="display:none;border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
          <label class="form-label">Fases do Bloco</label>
          <div class="flex gap-sm" style="flex-wrap:wrap">${MESOCYCLE_PHASES.filter(p => p.id !== 'deload').map(p => `<label class="flex items-center gap-sm" style="padding:4px 8px;border:1px solid var(--border-color);border-radius:6px;cursor:pointer"><input type="checkbox" name="phases" value="${p.id}" ${['adaptacao', 'hipertrofia', 'forca'].includes(p.id) ? 'checked' : ''}/><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color}"></span>${p.name}</label>`).join('')}</div>
        </div>
      </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', id: 'cancelMacro', onClick: () => closeModal() },
        {
          label: 'Gerar Macrociclo Completo', class: 'btn-primary', id: 'saveMacro', onClick: async () => {
            const fd = new FormData(document.getElementById('macroForm'));
            const d = Object.fromEntries(fd);
            if (!d.studentId) { notify.error('Selecione um aluno'); return; }
            const phases = fd.getAll('phases');
            const selectedGroups = fd.getAll('muscleGroups');
            const selectedDays = fd.getAll('trainingDays').map(Number);
            d.totalWeeks = parseInt(d.totalWeeks) || 12;
            d.deloadEvery = parseInt(d.deloadEvery) || 4;
            d.trainingDays = selectedDays;
            d.trainingTime = d.trainingTime || '07:00';
            d.sessionDuration = parseInt(d.sessionDuration) || 60;
            d.status = 'active';
            d.createdAt = new Date().toISOString();

            // Generate weekly plan
            d.weeks = generateWeeklyPlan(d.type, d.totalWeeks, phases.length ? phases : null, d.deloadEvery);

            // Check if personal selected existing workout model (item 14)
            const selectedModelId = document.getElementById('workoutModelSelect')?.value;
            let filteredExercises;
            if (selectedModelId) {
              const modelWk = await db.get('workouts', selectedModelId);
              filteredExercises = modelWk?.exercises || [];
              d.workoutModelName = modelWk?.name || '';
            } else {
              // Get exercises from library for selected muscle groups
              const allExercises = await db.getAll('exercises');
              filteredExercises = selectedGroups.length > 0
                ? allExercises.filter(ex => selectedGroups.includes(ex.muscleGroup))
                : allExercises;
            }

            // Generate week details for display
            const weekDetails = d.weeks.map((w, i) => {
              const isDeload = w.phase === 'deload';
              const prevWeek = i > 0 ? d.weeks[i - 1] : null;
              const volDelta = prevWeek ? Math.round(w.volumePct - prevWeek.volumePct) : 0;
              return {
                week: w.week,
                phase: w.label || w.phase,
                sets: isDeload ? '2-3' : w.volumePct > 80 ? '4-5' : w.volumePct > 60 ? '3-4' : '3',
                reps: w.repsRange || '10-12',
                intensity: w.intensityPct,
                rpe: isDeload ? '4-5' : w.intensityPct >= 85 ? '8-9' : w.intensityPct >= 70 ? '7-8' : '6-7',
                volDelta,
                trainA: filteredExercises.length > 0 ? filteredExercises.slice(0, 3).map(e => e.name).join(', ') : '-',
                trainB: filteredExercises.length > 3 ? filteredExercises.slice(3, 6).map(e => e.name).join(', ') : '-',
              };
            });
            d.weekDetails = weekDetails;

            // Generate actual workouts for each week
            const daysPerWeek = selectedDays.length || 3;
            const workoutConfig = {
              studentId: d.studentId,
              type: d.type,
              totalWeeks: d.totalWeeks,
              daysPerWeek,
              deloadEvery: d.deloadEvery,
              exercises: filteredExercises,
              weeklyPlan: d.weeks,
              startDate: d.startDate,
            };

            const generatedWorkouts = generateWorkouts(workoutConfig);

            // Assign correct dates based on selected days
            let workoutCount = 0;
            for (let w = 0; w < d.totalWeeks; w++) {
              const weekStart = new Date(d.startDate);
              weekStart.setDate(weekStart.getDate() + (w * 7));

              for (let di = 0; di < selectedDays.length; di++) {
                const dayOfWeek = selectedDays[di];
                const date = new Date(weekStart);
                const currentDay = date.getDay();
                const diff = dayOfWeek - currentDay;
                date.setDate(date.getDate() + (diff >= 0 ? diff : diff + 7));

                const gw = generatedWorkouts[workoutCount];
                if (gw) {
                  gw.date = date.toISOString().slice(0, 10);
                  gw.macrocycleId = 'pending'; // will be set after save
                  gw.trainingTime = d.trainingTime;
                  gw.sessionDuration = d.sessionDuration;
                  workoutCount++;
                }
              }
            }

            // Save macrocycle
            const savedMacro = await db.add('macrocycles', d);
            d.generatedWorkouts = 0;

            // Save generated workouts to DB
            for (const wk of generatedWorkouts) {
              if (wk.exercises && wk.exercises.length > 0) {
                wk.macrocycleId = savedMacro.id;
                await db.add('workouts', wk);
                d.generatedWorkouts++;
              }
            }

            // Update macro with workout count
            d.id = savedMacro.id;
            await db.put('macrocycles', d);

            // Also create schedule entries for the calendar
            for (const wk of generatedWorkouts) {
              if (wk.exercises && wk.exercises.length > 0) {
                await db.add('schedules', {
                  studentId: d.studentId,
                  workoutId: wk.id,
                  date: wk.date,
                  time: d.trainingTime,
                  duration: d.sessionDuration,
                  workoutName: wk.name,
                  status: 'scheduled',
                  repeat: 'none',
                });
              }
            }

            notify.success(`Macrociclo gerado! ${d.generatedWorkouts} treinos criados automaticamente.`);
            closeModal();
            navigateFn('/periodizacao');
          }
        }
      ]
    });

    // Show/hide block phases + populate workout models when student changes
    setTimeout(() => {
      const typeSel = document.querySelector('[name="type"]');
      const blockGroup = document.getElementById('blockPhasesGroup');
      typeSel?.addEventListener('change', () => {
        blockGroup.style.display = typeSel.value === 'block' ? '' : 'none';
      });

      // Populate workout model dropdown when student is selected (item 14)
      const studentSel = document.querySelector('[name="studentId"]');
      const modelSel = document.getElementById('workoutModelSelect');
      studentSel?.addEventListener('change', async () => {
        const sid = studentSel.value;
        if (!sid || !modelSel) return;
        const wks = (await db.getAll('workouts')).filter(w => w.studentId === sid);
        modelSel.innerHTML = '<option value="">Gerar automaticamente da biblioteca</option>' +
          wks.map(w => `<option value="${w.id}">${w.name} (${(w.exercises||[]).length} exercícios)</option>`).join('');
      });
    }, 100);
  });

  // Delete
  document.querySelectorAll('.delete-macro').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir macrociclo e todos os treinos gerados?')) {
        const macroId = btn.dataset.id;
        // Delete associated workouts
        const workouts = await db.getAll('workouts');
        for (const w of workouts.filter(w => w.macrocycleId === macroId)) {
          await db.delete('workouts', w.id);
        }
        await db.delete('macrocycles', macroId);
        notify.success('Macrociclo e treinos removidos');
        navigateFn('/periodizacao');
      }
    });
  });

  initMacroCharts();
}

async function initMacroCharts() {
  const macros = await db.getAll('macrocycles');
  macros.forEach(m => {
    const canvas = document.getElementById(`macroChart_${m.id}`);
    if (!canvas || typeof Chart === 'undefined' || !m.weeks) return;
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: m.weeks.map(w => `S${w.week}`),
        datasets: [
          { label: 'Volume %', data: m.weeks.map(w => w.volumePct), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, fill: true },
          { label: 'Intensidade %', data: m.weeks.map(w => w.intensityPct), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.3, fill: true },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          y: { min: 0, max: 110, ticks: { color: '#64748b', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        }
      }
    });
  });
}
