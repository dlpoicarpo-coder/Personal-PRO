// ========================================
// PERSONAL PRO — Periodization Page (v4)
// Modelos completos + seleção de treinos reorganizada
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

// ── TEMPLATES PADRÃO DO SISTEMA (agrupados por categoria) ────────
const SYSTEM_TEMPLATES = [
  {
    category: 'Hipertrofia',
    icon: '💪',
    items: [
      { name: 'Hipertrofia Linear 12 Sem.', type: 'linear', goal: 'hypertrophy', totalWeeks: 12, deloadEvery: 4, desc: 'Volume↓ Intensidade↑ · Ideal para iniciantes/intermediários' },
      { name: 'Hipertrofia Ondulatória DUP 8 Sem.', type: 'undulating', goal: 'hypertrophy', totalWeeks: 8, deloadEvery: 4, desc: 'DUP diário · Força / Hipertrofia / Metabólico · Quebra platôs' },
      { name: 'Hipertrofia Ondulatória 12 Sem.', type: 'undulating', goal: 'hypertrophy', totalWeeks: 12, deloadEvery: 4, desc: 'Oscilações semanais · Estímulo variado · Avançados' },
    ]
  },
  {
    category: 'Força',
    icon: '🏋️',
    items: [
      { name: 'Força Máxima em Blocos 16 Sem.', type: 'block', goal: 'strength', totalWeeks: 16, deloadEvery: 4, desc: 'Acumulação → Intensificação → Realização · Alto rendimento' },
      { name: 'Força Conjugada 12 Sem.', type: 'conjugate', goal: 'strength', totalWeeks: 12, deloadEvery: 4, desc: 'Múltiplas capacidades simultâneas · Powerlifting / Avançados' },
      { name: 'Força Linear Clássica 8 Sem.', type: 'linear', goal: 'strength', totalWeeks: 8, deloadEvery: 4, desc: 'Progressão direta ao pico de 1RM · Intermediários' },
    ]
  },
  {
    category: 'Emagrecimento & Condicionamento',
    icon: '🔥',
    items: [
      { name: 'Emagrecimento Concorrente 12 Sem.', type: 'concurrent', goal: 'fat_loss', totalWeeks: 12, deloadEvery: 4, desc: 'Força + Metabólico · EPOC · Recomposição corporal' },
      { name: 'Condicionamento Polarizado 16 Sem.', type: 'polarized', goal: 'endurance', totalWeeks: 16, deloadEvery: 4, desc: '80% baixa intensidade + 20% alta · Endurance / Atletas' },
      { name: 'HIIT Progressivo 8 Sem.', type: 'hiit', goal: 'fat_loss', totalWeeks: 8, deloadEvery: 4, desc: 'Intervalado de alta intensidade · VO2Máx · Rápido e eficiente' },
    ]
  },
  {
    category: 'Saúde & Iniciantes',
    icon: '🌱',
    items: [
      { name: 'Adaptação Anatômica 4 Sem.', type: 'linear', goal: 'health', totalWeeks: 4, deloadEvery: 0, desc: 'Iniciantes · Reforço articular · Base motora segura' },
      { name: 'Saúde & Qualidade de Vida 12 Sem.', type: 'linear', goal: 'health', totalWeeks: 12, deloadEvery: 4, desc: 'Progressão controlada · Sem DOMS extrema · Alta aderência' },
      { name: 'Resistência Muscular (RML) 8 Sem.', type: 'reverse_linear', goal: 'rml', totalWeeks: 8, deloadEvery: 4, desc: 'Linear Reversa · Volume crescente · Tolerância ao lactato' },
    ]
  },
  {
    category: 'Potência & Performance',
    icon: '⚡',
    items: [
      { name: 'Potência em Blocos 12 Sem.', type: 'block', goal: 'power', totalWeeks: 12, deloadEvery: 4, desc: 'Força máx → Potência · Efeito residual · Explosão' },
      { name: 'SIT — Sprint Interval 6 Sem.', type: 'hiit', goal: 'power', totalWeeks: 6, deloadEvery: 3, desc: 'Sprints supramáximos · Adaptações enzimáticas · Avançados' },
    ]
  },
];

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
  const studentFilterSel = document.getElementById('perioStudentFilter');
  const macroFilterSel = document.getElementById('perioMacroFilter');

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

  // ── MODAL NOVO MACROCICLO ────────────────────────────────────
document.getElementById('addMacroBtn')?.addEventListener('click', async () => {
    const students = (await db.getAll('students')).filter(s => s.status === 'Ativo');
    const exercises = await db.getAll('exercises');
    const muscleGroups = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Quadríceps', 'Posterior', 'Glúteos', 'Core'];

    // Treinos criados pelo personal na aba Treinos (sem sessionId, sem macrocycleId = são modelos/templates)
    const trainerWorkouts = (await db.getAll('workouts')).filter(w => !w.sessionId && !w.macrocycleId);

    // Montar HTML dos templates padrão agrupados por categoria
    const systemTemplatesHTML = SYSTEM_TEMPLATES.map(cat => `
      <div class="mb-md">
        <div class="text-xs text-muted mb-sm" style="font-weight:600;letter-spacing:0.05em;text-transform:uppercase">${cat.icon} ${cat.category}</div>
        <div class="periodi-template-grid">
          ${cat.items.map(tpl => `
            <div class="periodi-template-card" data-tpl='${JSON.stringify({name:tpl.name,type:tpl.type,goal:tpl.goal,totalWeeks:tpl.totalWeeks,deloadEvery:tpl.deloadEvery})}'>
              <div class="ptc-name">${tpl.name}</div>
              <div class="ptc-desc">${tpl.desc}</div>
            </div>`).join('')}
        </div>
      </div>`).join('');

    // HTML dos modelos criados pelo personal (aba Treinos / Exercícios)
    const trainerTemplatesHTML = trainerWorkouts.length ? `
      <div style="border-top:2px solid var(--primary);padding-top:16px;margin-top:4px">
        <div class="flex items-center gap-sm mb-sm">
          <span style="font-size:1rem">📋</span>
          <span class="text-sm font-medium" style="color:var(--primary)">Modelos criados por você</span>
          <span class="badge badge-success text-xs">${trainerWorkouts.length} disponíveis</span>
        </div>
        <p class="text-muted text-xs mb-sm">Fichas salvas na aba <strong>Treinos</strong> (sem aluno vinculado ou sem ciclo). Clique para usar como base.</p>
        <div class="periodi-template-grid">
          ${trainerWorkouts.map(w => `
            <div class="periodi-template-card periodi-trainer-card" data-tpl='${JSON.stringify({name:w.name,type:w.type||'linear',goal:w.goal||'hypertrophy',totalWeeks:12,deloadEvery:4,workoutTemplateId:w.id})}'>
              <div class="ptc-name">${w.name}</div>
              <div class="ptc-desc">${(w.exercises||[]).length} exercícios · ${w.goal||'Geral'} ${w.studentId ? '' : '· Modelo global'}</div>
            </div>`).join('')}
        </div>
      </div>` : `
      <div style="border-top:2px dashed var(--border-color);padding-top:16px;margin-top:4px">
        <div class="text-xs text-muted text-center" style="padding:12px">
          <span style="font-size:1.5rem;display:block;margin-bottom:8px">📋</span>
          Você ainda não tem modelos de treino criados.<br>
          Vá em <a href="#/treinos" style="color:var(--primary)">Treinos → + Novo Treino</a> sem selecionar aluno para criar um modelo reutilizável.
        </div>
      </div>`;

    openModal({
      title: '+ Novo Macrociclo Completo', size: 'xl',
      content: `
        <!-- SEÇÃO 1: TEMPLATES DE PERIODIZAÇÃO -->
        <div style="margin-bottom:20px">
          <div class="flex items-center gap-sm mb-md">
            <span style="display:inline-block;width:4px;height:20px;background:var(--primary);border-radius:2px"></span>
            <h4 style="margin:0">1. Escolha o modelo de periodização</h4>
            <span class="text-xs text-muted">(opcional — preenche os campos abaixo automaticamente)</span>
          </div>
          ${systemTemplatesHTML}
          ${trainerTemplatesHTML}
        </div>

        <!-- SEÇÃO 2: FORMULÁRIO DO MACROCICLO -->
        <div style="border-top:2px solid var(--border-color);padding-top:20px">
          <div class="flex items-center gap-sm mb-md">
            <span style="display:inline-block;width:4px;height:20px;background:var(--primary);border-radius:2px"></span>
            <h4 style="margin:0">2. Configure o macrociclo</h4>
          </div>
          <form id="macroForm">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Aluno *</label>
                <select class="form-select" name="studentId" required>
                  <option value="">Selecione</option>
                  ${students.map(s => `<option value="${s.id}">${s.name} — ${s.goal || 'Geral'}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label class="form-label">Nome do Macrociclo</label>
                <input class="form-input" name="name" value="Macrociclo 1" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Modelo de Periodização *</label>
                <select class="form-select" name="type">
                  <optgroup label="── Musculação ──">
                    <option value="linear">Linear Tradicional — Volume↓ Intensidade↑</option>
                    <option value="reverse_linear">Linear Reversa — Volume↑ Intensidade↓ (RML)</option>
                    <option value="undulating">Ondulatória (WUP/DUP) — Oscilações diárias/semanais</option>
                    <option value="block">Em Blocos — Fases concentradas (Acum → Intens → Realiz)</option>
                    <option value="conjugate">Conjugada — Múltiplas capacidades simultâneas</option>
                  </optgroup>
                  <optgroup label="── Cardio / Endurance ──">
                    <option value="polarized">Polarizado — 80% Z1/Z2 + 20% Z4/Z5</option>
                    <option value="hiit">HIIT — Intervalado de Alta Intensidade</option>
                    <option value="concurrent">Concorrente — Força + Endurance combinados</option>
                  </optgroup>
                  <optgroup label="── Outros ──">
                    <option value="lsd">LSD — Longa Duração e Baixa Intensidade</option>
                    <option value="threshold">Limiar — Treino no Limiar Anaeróbio</option>
                    <option value="fartlek">Fartlek — Variações de ritmo livres</option>
                  </optgroup>
                </select>
              </div>
              <div class="form-group"><label class="form-label">Objetivo</label>
                <select class="form-select" name="goal">
                  ${TRAINING_GOALS.map ? TRAINING_GOALS.map(g => `<option value="${g.id}">${g.icon} ${g.label}</option>`).join('') :
                    Object.values(TRAINING_GOALS).map(g => `<option value="${g.id}">${g.icon || ''} ${g.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Duração (semanas)</label>
                <input class="form-input" name="totalWeeks" type="number" min="4" max="52" value="12" />
              </div>
              <div class="form-group"><label class="form-label">Data de Início</label>
                <input class="form-input" name="startDate" type="date" value="${new Date().toISOString().slice(0, 10)}" />
              </div>
              <div class="form-group"><label class="form-label">Deload a cada (sem)</label>
                <input class="form-input" name="deloadEvery" type="number" min="0" max="8" value="4" />
                <div class="form-hint">0 = sem deload</div>
              </div>
            </div>

            <!-- Dias e Horários -->
            <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
              <h4 class="mb-sm">Dias e Horários de Treino</h4>
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
                  <select class="form-select" name="trainingTime">
                    ${HOURS.map(h => `<option value="${h}" ${h === '07:00' ? 'selected' : ''}>${h}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group"><label class="form-label">Duração da Sessão</label>
                  <select class="form-select" name="sessionDuration">
                    <option value="45">45 min</option><option value="60" selected>60 min</option>
                    <option value="75">75 min</option><option value="90">90 min</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Grupos Musculares (geração automática) -->
            <div style="border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
              <h4 class="mb-sm">Grupos Musculares <span class="text-xs text-muted font-normal">(para geração automática de exercícios)</span></h4>
              <div class="flex gap-sm" style="flex-wrap:wrap">
                ${muscleGroups.map(g => `<label class="flex items-center gap-xs" style="padding:5px 10px;border:1px solid var(--border-color);border-radius:6px;cursor:pointer">
                  <input type="checkbox" name="muscleGroups" value="${g}" checked/> ${g}
                </label>`).join('')}
              </div>
              <p class="text-muted text-xs mt-sm">${exercises.length} exercícios na biblioteca</p>
            </div>

            <!-- Fases do bloco (condicional) -->
            <div id="blockPhasesGroup" style="display:none;border-top:1px solid var(--border-color);padding-top:16px;margin-top:12px">
              <label class="form-label">Fases do Bloco</label>
              <div class="flex gap-sm" style="flex-wrap:wrap">
                ${MESOCYCLE_PHASES.filter(p => p.id !== 'deload').map(p => `
                  <label class="flex items-center gap-sm" style="padding:4px 8px;border:1px solid var(--border-color);border-radius:6px;cursor:pointer">
                    <input type="checkbox" name="phases" value="${p.id}" ${['adaptacao', 'hipertrofia', 'forca'].includes(p.id) ? 'checked' : ''}/>
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color}"></span>
                    ${p.name}
                  </label>`).join('')}
              </div>
            </div>
            <input type="hidden" name="workoutTemplateId" id="workoutTemplateIdField" value="" />
          </form>
        </div>
      `,
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

            // Usar modelo do personal (se selecionado via template card) ou biblioteca
            const selectedTemplateId = d.workoutTemplateId || '';
            let filteredExercises;
            if (selectedTemplateId) {
              const templateWk = await db.get('workouts', selectedTemplateId);
              filteredExercises = templateWk?.exercises || [];
              d.workoutModelName = templateWk?.name || '';
            } else {
              const allExercises = await db.getAll('exercises');
              const goal = d.goal || 'hypertrophy';
              const cardioGoals = ['endurance', 'fat_loss', 'concurrent', 'polarized', 'hiit', 'lsd', 'threshold', 'fartlek'];
              filteredExercises = allExercises.filter(ex => {
                if (cardioGoals.includes(goal) || cardioGoals.includes(d.type)) return true;
                return ex.muscleGroup !== 'Cardio';
              });
              if (selectedGroups.length) {
                filteredExercises = filteredExercises.filter(ex => selectedGroups.includes(ex.muscleGroup) || ex.muscleGroup === 'Core');
              }
            }

            // Gerar detalhamento semanal
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

            // Gerar treinos reais para cada semana
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

            // Atribuir datas por dias selecionados
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
                  gw.macrocycleId = 'pending';
                  gw.trainingTime = d.trainingTime;
                  gw.sessionDuration = d.sessionDuration;
                  workoutCount++;
                }
              }
            }

            const savedMacro = await db.add('macrocycles', d);
            d.generatedWorkouts = 0;

            for (const wk of generatedWorkouts) {
              if (wk.exercises && wk.exercises.length > 0) {
                wk.macrocycleId = savedMacro.id;
                await db.add('workouts', wk);
                d.generatedWorkouts++;
              }
            }
            d.id = savedMacro.id;
            await db.put('macrocycles', d);

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

    // Handlers após abertura do modal
    setTimeout(() => {
      // Click nos cards de template (sistema + personal)
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
            if (tpl.goal) {
              const goalSel = form.querySelector('[name="goal"]');
              if (goalSel) goalSel.value = tpl.goal;
            }
            if (tpl.totalWeeks !== undefined) form.querySelector('[name="totalWeeks"]').value = tpl.totalWeeks;
            if (tpl.deloadEvery !== undefined) form.querySelector('[name="deloadEvery"]').value = tpl.deloadEvery;
            const tplField = document.getElementById('workoutTemplateIdField');
            if (tplField) tplField.value = tpl.workoutTemplateId || '';
            // Disparar evento de change no tipo para mostrar/esconder fases do bloco
            form.querySelector('[name="type"]')?.dispatchEvent(new Event('change'));
            // Scroll suave até o formulário
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch(e) { console.warn('Template parse error', e); }
        });
      });

      // Mostrar fases do bloco apenas quando tipo = 'block'
      const typeSel = document.querySelector('[name="type"]');
      const blockGroup = document.getElementById('blockPhasesGroup');
      typeSel?.addEventListener('change', () => {
        if (blockGroup) blockGroup.style.display = typeSel.value === 'block' ? '' : 'none';
      });
    }, 100);
  });

  // ── DELETE MACROCICLO ────────────────────────────────────────
  document.querySelectorAll('.delete-macro').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.confirm('Excluir macrociclo e todos os treinos gerados?')) {
        const macroId = btn.dataset.id;
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
  const prescriptions = await db.getAll('prescriptions').catch(() => []);
  prescriptions.forEach(p => {
    const list = document.getElementById(`prescList_${p.macrocycleId}`);
    if (list) list.appendChild(buildPrescriptionChip(p));
  });

  document.querySelectorAll('.add-prescription-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const macroId    = btn.dataset.macroId;
      const studentId  = btn.dataset.studentId;
      const totalWeeks = parseInt(btn.dataset.macroWeeks) || 12;
      const macroType  = btn.dataset.macroType || 'linear';
      const deloadEvery= parseInt(btn.dataset.macroDeload) || 4;

      const allWorkouts = await db.getAll('workouts');
      // Apenas modelos/fichas: sem sessionId
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
              <p class="text-muted text-sm mb-md">Informe a carga inicial. O sistema calculará a progressão automaticamente.</p>
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

      setTimeout(() => {
        const modelSel = document.getElementById('prescModelSel');
        if (modelSel && PERIODIZATION_MODELS[macroType]) modelSel.value = macroType;

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

        document.getElementById('prescModelSel')?.addEventListener('change', updatePrescPreview);

        function updatePrescPreview() {
          const wkSel = document.getElementById('prescWorkoutSel').value;
          const mdl = document.getElementById('prescModelSel').value;
          const preview = document.getElementById('prescPreview');
          if (!wkSel || !mdl) return;
          const modelDef = PERIODIZATION_MODELS[mdl];
          if (!modelDef) return;
          const goalSuggested = Object.values(TRAINING_GOALS).filter(g => g.suggested?.includes(mdl));
          preview.innerHTML = `
            <div class="card" style="background:rgba(16,185,129,0.04);border:1px solid var(--border-color)">
              <div class="flex gap-sm items-center mb-sm">
                <span style="font-size:1.5rem">${modelDef.icon}</span>
                <div>
                  <strong>${modelDef.label}</strong>
                  <div class="text-xs text-muted">${modelDef.desc}</div>
                </div>
              </div>
              <div class="text-xs text-muted">${goalSuggested.length ? `✅ Ideal para: ${goalSuggested.map(g=>`${g.icon||''} ${g.label}`).join(' · ')}` : ''}</div>
              <div class="text-xs mt-sm" style="color:var(--primary)">📅 ${totalWeeks} semanas · Deload a cada ${deloadEvery} sem.</div>
            </div>`;
        }
      }, 80);
    });
  });
}

// Chip visual de uma prescrição salva
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
      <div>S${wk.week}</div><div style="font-size:0.6rem;font-weight:400">${wk.phase?.substring(0,6)}</div>
    </th>`;
  }).join('');
  openModal({
    title: `📊 Progressão — ${p.workoutName}`, size: 'xl',
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
    actions: [{ label: 'Fechar', class: 'btn-secondary', onClick: () => closeModal() }]
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
