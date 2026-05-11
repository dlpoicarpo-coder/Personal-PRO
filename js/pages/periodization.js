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
import { generateProgression, PERIODIZATION_MODELS, TRAINING_GOALS, formatRest, intensityColor } from '../utils/periodization-engine.js';

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
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <select class="form-select" id="perioStudentFilter" style="min-width:180px">
          <option value="">Todos os alunos</option>
          ${active.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <select class="form-select" id="perioMacroFilter" style="min-width:200px" disabled>
          <option value="">Todos os macrociclos</option>
        </select>
        <button class="btn btn-primary" id="addMacroBtn">+ Novo Macrociclo</button>
      </div>
    </div>
    <div id="periodizationContent">
    ${macros.length ? macros.map(m => {
    const st = students.find(s => s.id === m.studentId);
    const typeInfo = PERIODIZATION_TYPES.find(t => t.id === m.type) || {};
    const currentWeek = Math.ceil((Date.now() - new Date(m.startDate).getTime()) / (7 * 86400000));
    return `
      <div class="card mb-lg" data-student="${m.studentId || ''}" data-macro="${m.id || ''}">
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
        <div class="mt-md" style="border-top:1px solid var(--border-color);padding-top:14px">
          <div class="flex gap-sm items-center">
            <span class="text-sm font-medium">📋 Fichas Prescritas</span>
            <button class="btn btn-primary btn-sm add-prescription-btn" data-macro-id="${m.id}" data-student-id="${m.studentId}" data-macro-weeks="${m.totalWeeks}" data-macro-type="${m.type}" data-macro-deload="${m.deloadEvery||4}">+ Adicionar Ficha</button>
          </div>
          <div class="prescription-list" id="prescList_${m.id}" style="margin-top:10px"></div>
        </div>
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
    </div>
  `;
}

export function initPeriodization(navigateFn) {
  // Item 1: Student filter → populate macrocycle dropdown
  const studentFilterSel = document.getElementById('perioStudentFilter');
  const macroFilterSel = document.getElementById('perioMacroFilter');
  const contentDiv = document.getElementById('periodizationContent');

  studentFilterSel?.addEventListener('change', async () => {
    const sid = studentFilterSel.value;
    macroFilterSel.disabled = !sid;
    macroFilterSel.innerHTML = '<option value="">Todos os macrociclos</option>';
    if (sid) {
      const macros = (await db.getAll('macrocycles')).filter(m => m.studentId === sid);
      macros.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id; opt.textContent = `${m.name} (${m.totalWeeks}sem)`;
        macroFilterSel.appendChild(opt);
      });
      macroFilterSel.disabled = false;
    }
    applyPeriodizationFilter(sid, '');
  });

  macroFilterSel?.addEventListener('change', () => {
    applyPeriodizationFilter(studentFilterSel?.value || '', macroFilterSel.value);
  });

  function applyPeriodizationFilter(sid, macroId) {
    document.querySelectorAll('#periodizationContent .card').forEach(card => {
      const cardSid = card.dataset.student || '';
      const cardMid = card.dataset.macro || '';
      const matchStu = !sid || cardSid === sid;
      const matchMac = !macroId || cardMid === macroId;
      card.style.display = matchStu && matchMac ? '' : 'none';
    });
  }

  document.getElementById('addMacroBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    const exercises = await db.getAll('exercises');
    const muscleGroups = [...new Set(exercises.map(e => e.muscleGroup).filter(Boolean))];

    openModal({
      title: '+ Novo Macrociclo Completo', size: 'xl',
      content: `
        <div style="margin-bottom:16px;border-bottom:1px solid var(--border-color);padding-bottom:16px">
          <label class="form-label mb-sm">Templates Padrão do Sistema (clique para preencher)</label>
          <div class="periodi-template-grid">
            <div class="periodi-template-card" data-tpl='{"name":"Hipertrofia 12 Semanas","type":"linear","goal":"Hipertrofia","totalWeeks":12,"deloadEvery":4}'>
              <div class="ptc-name">Hipertrofia 12 Sem.</div>
              <div class="ptc-desc">Linear · Deload a cada 4 sem · Foco em ganho de massa</div>
            </div>
            <div class="periodi-template-card" data-tpl='{"name":"Emagrecimento 12 Semanas","type":"undulating","goal":"Emagrecimento","totalWeeks":12,"deloadEvery":4}'>
              <div class="ptc-name">Emagrecimento 12 Sem.</div>
              <div class="ptc-desc">Ondulatório · Força + Condicionamento</div>
            </div>
            <div class="periodi-template-card" data-tpl='{"name":"Força Máxima 16 Semanas","type":"block","goal":"Força","totalWeeks":16,"deloadEvery":4}'>
              <div class="ptc-name">Força Máxima 16 Sem.</div>
              <div class="ptc-desc">Bloco · Fases: Adaptação → Hipertrofia → Força</div>
            </div>
            <div class="periodi-template-card" data-tpl='{"name":"Condicionamento 8 Semanas","type":"undulating","goal":"Condicionamento","totalWeeks":8,"deloadEvery":4}'>
              <div class="ptc-name">Condicionamento 8 Sem.</div>
              <div class="ptc-desc">Ondulatório diário · Cardio + Força</div>
            </div>
            <div class="periodi-template-card" data-tpl='{"name":"Iniciante 4 Semanas","type":"linear","goal":"Saúde","totalWeeks":4,"deloadEvery":0}'>
              <div class="ptc-name">Iniciante 4 Sem.</div>
              <div class="ptc-desc">Linear simples · Sem deload · Adaptação anatômica</div>
            </div>
            <div class="periodi-template-card" data-tpl='{"name":"Manutenção 8 Semanas","type":"linear","goal":"Saúde","totalWeeks":8,"deloadEvery":4}'>
              <div class="ptc-name">Manutenção 8 Sem.</div>
              <div class="ptc-desc">Linear · Volume moderado · Saúde e qualidade de vida</div>
            </div>
          </div>
        </div>
        <form id="macroForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Aluno *</label><select class="form-select" name="studentId" required><option value="">Selecione</option>${students.map(s => `<option value="${s.id}">${s.name} — ${s.goal || 'Geral'}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Nome do Macrociclo</label><input class="form-input" name="name" value="Macrociclo 1" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Modelo de Periodização *</label><select class="form-select" name="type">${PERIODIZATION_TYPES.map(t => `<option value="${t.id}">${t.name} — ${t.desc}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Objetivo</label><select class="form-select" name="goal">${TRAINING_GOALS.map(g => `<option value="${g.id}">${g.icon} ${g.label}</option>`).join('')}</select></div>
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
      // System template click handler (item 5)
      document.querySelectorAll('.periodi-template-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.periodi-template-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          try {
            const tpl = JSON.parse(card.dataset.tpl);
            const form = document.getElementById('macroForm');
            if (!form) return;
            if (tpl.name) form.querySelector('[name="name"]').value = tpl.name;
            if (tpl.type) form.querySelector('[name="type"]').value = tpl.type;
            if (tpl.goal) form.querySelector('[name="goal"]').value = tpl.goal;
            if (tpl.totalWeeks !== undefined) form.querySelector('[name="totalWeeks"]').value = tpl.totalWeeks;
            if (tpl.deloadEvery !== undefined) form.querySelector('[name="deloadEvery"]').value = tpl.deloadEvery;
            // Trigger block phases visibility
            const typeChange = new Event('change');
            form.querySelector('[name="type"]')?.dispatchEvent(typeChange);
          } catch(e) { console.warn('Template parse error', e); }
        });
      });

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
  initPrescriptions();
}

// ── PRESCRIPTION SYSTEM ──────────────────────────────────────
async function initPrescriptions() {
  // Load existing prescriptions into each macrocycle card
  const prescriptions = await db.getAll('prescriptions').catch(() => []);
  prescriptions.forEach(p => {
    const list = document.getElementById(`prescList_${p.macrocycleId}`);
    if (list) list.appendChild(buildPrescriptionChip(p));
  });

  // "+ Adicionar Ficha" click
  document.querySelectorAll('.add-prescription-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const macroId    = btn.dataset.macroId;
      const studentId  = btn.dataset.studentId;
      const totalWeeks = parseInt(btn.dataset.macroWeeks) || 12;
      const macroType  = btn.dataset.macroType || 'linear';
      const deloadEvery= parseInt(btn.dataset.macroDeload) || 4;

      // Load workout MODELS only (not sessions) for this student
      const allWorkouts = await db.getAll('workouts');
      const studentWorkouts = allWorkouts.filter(w =>
        (!w.studentId || w.studentId === studentId) && !w.sessionId
      );
      if (!studentWorkouts.length) {
        notify.warning('Nenhuma ficha de treino cadastrada para este aluno. Crie uma ficha em Treinos primeiro.');
        return;
      }

      openModal({
        title: '📋 Prescrição de Ficha com Periodização',
        size: 'xl',
        content: `
          <div class="form-group mb-md">
            <label class="form-label">Selecione a Ficha de Treino *</label>
            <select class="form-select" id="prescWorkoutSel">
              <option value="">— Escolha uma ficha —</option>
              ${studentWorkouts.map(w => `<option value="${w.id}">${w.name} (${(w.exercises||[]).length} exercícios)</option>`).join('')}
            </select>
          </div>
          <div class="form-group mb-md">
            <label class="form-label">Modelo de Periodização</label>
            <select class="form-select" id="prescModelSel">
              ${Object.values(PERIODIZATION_MODELS).map(m => `<option value="${m.id}">${m.icon} ${m.label} — ${m.desc}</option>`).join('')}
            </select>
            <div class="form-hint mt-xs" id="prescModelHint">Modelo do macrociclo: <strong>${macroType}</strong></div>
          </div>
          <div id="prescExercisesArea" style="display:none">
            <div style="border-top:1px solid var(--border-color);padding-top:14px;margin-top:4px">
              <h4 class="mb-sm">⚖️ Carga Inicial por Exercício (kg)</h4>
              <p class="text-muted text-sm mb-md">Informe a carga inicial de trabalho do aluno. O sistema calculará a progressão automaticamente.</p>
              <div id="prescLoadInputs"></div>
            </div>
          </div>
          <div id="prescPreview" style="margin-top:16px"></div>
        `,
        actions: [
          { label: 'Cancelar', class: 'btn-secondary', id: 'cancelPresc', onClick: () => closeModal() },
          { label: '✓ Salvar Prescrição', class: 'btn-primary', id: 'savePresc', onClick: async () => {
            const wkId = document.getElementById('prescWorkoutSel').value;
            const model = document.getElementById('prescModelSel').value;
            if (!wkId) { notify.error('Selecione uma ficha'); return; }

            const wk = await db.get('workouts', wkId);
            const exercises = (wk?.exercises || []).map(ex => ({
              id: ex.exerciseId || ex.id,
              name: ex.name,
              initialLoadKg: parseFloat(document.getElementById(`load_${ex.exerciseId||ex.id}`)?.value) || 20
            }));

            const { weekSchedule, exerciseProgression, modelDef } = generateProgression({
              model, totalWeeks, deloadEvery, exercises
            });

            const presc = {
              macrocycleId: macroId,
              studentId,
              workoutId: wkId,
              workoutName: wk.name,
              model,
              modelLabel: modelDef.label,
              totalWeeks,
              deloadEvery,
              exercises,
              weekSchedule,
              exerciseProgression,
              createdAt: new Date().toISOString(),
            };
            const saved = await db.add('prescriptions', presc);
            const list = document.getElementById(`prescList_${macroId}`);
            if (list) list.appendChild(buildPrescriptionChip(saved));
            notify.success(`Prescrição "${wk.name}" salva com progressão ${modelDef.label}!`);
            closeModal();
          }}
        ]
      });

      // Set default model = macrocycle type
      setTimeout(() => {
        const modelSel = document.getElementById('prescModelSel');
        if (modelSel && PERIODIZATION_MODELS[macroType]) modelSel.value = macroType;

        // Load exercises when workout selected
        document.getElementById('prescWorkoutSel')?.addEventListener('change', async e => {
          const wk = await db.get('workouts', e.target.value);
          const area = document.getElementById('prescExercisesArea');
          const inputs = document.getElementById('prescLoadInputs');
          if (!wk || !wk.exercises?.length) { area.style.display = 'none'; return; }
          area.style.display = '';
          inputs.innerHTML = wk.exercises.map(ex => `
            <div class="form-row" style="align-items:center;margin-bottom:8px">
              <div class="form-group" style="flex:2;margin-bottom:0">
                <label class="form-label text-sm">${ex.name}</label>
              </div>
              <div class="form-group" style="flex:1;margin-bottom:0">
                <input class="form-input" id="load_${ex.exerciseId||ex.id}" type="number" min="1" step="0.5" value="20" placeholder="kg" />
              </div>
            </div>`).join('');
          updatePrescPreview();
        });

        // Update preview when model changes
        document.getElementById('prescModelSel')?.addEventListener('change', updatePrescPreview);

        function updatePrescPreview() {
          const wkSel = document.getElementById('prescWorkoutSel').value;
          const mdl = document.getElementById('prescModelSel').value;
          const preview = document.getElementById('prescPreview');
          if (!wkSel || !mdl) return;
          const modelDef = PERIODIZATION_MODELS[mdl];
          if (!modelDef) return;
          const goalSuggested = Object.values(TRAINING_GOALS).filter(g => g.suggested.includes(mdl));
          preview.innerHTML = `
            <div class="card" style="background:rgba(16,185,129,0.04);border:1px solid var(--border-color)">
              <div class="flex gap-sm items-center mb-sm">
                <span style="font-size:1.5rem">${modelDef.icon}</span>
                <div>
                  <strong>${modelDef.label}</strong>
                  <div class="text-xs text-muted">${modelDef.desc}</div>
                </div>
              </div>
              <div class="text-xs text-muted">${goalSuggested.length ? `✅ Ideal para: ${goalSuggested.map(g=>`${g.icon} ${g.label}`).join(' · ')}` : ''}</div>
              <div class="text-xs mt-sm" style="color:var(--primary)">📅 ${totalWeeks} semanas · Deload a cada ${deloadEvery} sem.</div>
            </div>`;
        }
      }, 80);
    });
  });
}

// Chip visual para uma prescrição salva
function buildPrescriptionChip(p) {
  const div = document.createElement('div');
  div.className = 'prescription-chip';
  div.dataset.prescId = p.id;
  div.innerHTML = `
    <button class="prescription-chip-inner" style="all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;width:100%">
      <span class="badge" style="background:var(--primary-glow);color:var(--primary)">${PERIODIZATION_MODELS[p.model]?.icon || '📋'}</span>
      <span class="text-sm font-medium">${p.workoutName}</span>
      <span class="text-xs text-muted">· ${PERIODIZATION_MODELS[p.model]?.label || p.model}</span>
      <span class="text-xs text-muted">${p.exercises?.length || 0} exercícios · ${p.totalWeeks} sem.</span>
    </button>
    <button class="view-presc-btn btn btn-ghost btn-sm" data-presc-id="${p.id}" title="Ver progressão">📊 Ver</button>
    <button class="del-presc-btn btn btn-ghost btn-sm" data-presc-id="${p.id}" style="color:var(--danger)" title="Remover">✕</button>
  `;

  div.querySelector('.view-presc-btn').addEventListener('click', () => openPrescriptionView(p));
  div.querySelector('.del-presc-btn').addEventListener('click', async () => {
    if (window.confirm(`Remover prescrição "${p.workoutName}"?`)) {
      await db.delete('prescriptions', p.id);
      div.remove();
      notify.success('Prescrição removida.');
    }
  });
  return div;
}

// Modal de visualização da progressão científica
function openPrescriptionView(p) {
  const modelDef = PERIODIZATION_MODELS[p.model] || {};
  const weeks = p.weekSchedule || [];

  const tableRows = (p.exerciseProgression || []).map(ex => {
    const weekCols = ex.weeks.map(wk => {
      const color = intensityColor(wk.intensityPct, wk.isDeload);
      return `<td style="text-align:center;padding:6px 8px;border:1px solid var(--border-color);min-width:72px">
        <div style="font-weight:700;color:${color}">${wk.sets}×${wk.reps}</div>
        <div style="font-size:0.7rem;color:${color}">${wk.loadKg}kg</div>
        <div style="font-size:0.6rem;color:var(--text-muted)">${formatRest(wk.restSeconds)}</div>
        ${wk.isDeload ? '<div style="font-size:0.6rem;color:#3b82f6">🧊</div>' : ''}
      </td>`;
    }).join('');
    return `<tr>
      <td style="padding:6px 10px;border:1px solid var(--border-color);white-space:nowrap;font-weight:500">${ex.name}</td>
      ${weekCols}
    </tr>`;
  }).join('');

  const headerCols = weeks.map(wk => {
    const color = intensityColor(wk.intensityPct, wk.isDeload);
    return `<th style="text-align:center;padding:4px 6px;border:1px solid var(--border-color);color:${color};font-size:0.75rem">
      <div>S${wk.week}</div>
      <div style="font-size:0.6rem;font-weight:400">${wk.phase?.substring(0,6)}</div>
    </th>`;
  }).join('');

  openModal({
    title: `📊 Progressão — ${p.workoutName}`,
    size: 'xl',
    content: `
      <div class="flex gap-md mb-md" style="flex-wrap:wrap">
        <div class="badge" style="background:${modelDef.color}20;color:${modelDef.color}">${modelDef.icon||''} ${modelDef.label || p.model}</div>
        <div class="text-xs text-muted">📅 ${p.totalWeeks} semanas · Deload a cada ${p.deloadEvery} sem.</div>
        <div class="text-xs text-muted">${p.exercises?.length || 0} exercícios</div>
      </div>
      <div class="legend-row flex gap-md mb-md" style="flex-wrap:wrap">
        <span class="text-xs" style="color:#22c55e">● Leve (&lt;65%)</span>
        <span class="text-xs" style="color:#eab308">● Moderada (65-74%)</span>
        <span class="text-xs" style="color:#f97316">● Alta (75-84%)</span>
        <span class="text-xs" style="color:#ef4444">● Muito Alta (≥85%)</span>
        <span class="text-xs" style="color:#3b82f6">🧊 Deload</span>
      </div>
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse;min-width:100%;font-size:0.82rem">
          <thead><tr>
            <th style="padding:6px 10px;border:1px solid var(--border-color);text-align:left">Exercício</th>
            ${headerCols}
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <p class="text-xs text-muted mt-md">Formato: Séries × Reps · Carga · Descanso</p>
    `,
    actions: [{ label: 'Fechar', class: 'btn-secondary', id: 'closePrescView', onClick: () => closeModal() }]
  });
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
