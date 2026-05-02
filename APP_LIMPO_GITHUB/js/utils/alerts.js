// ========================================
// PERSONAL PRO — Scientific Biofeedback Alerts
// ========================================

export const ALERT_THRESHOLDS = {
  sleep: { green: 7, yellow: 5, metric: 'Sono', lowAction: 'Reduzir volume e intensidade. Priorizar qualidade do sono.', highAction: null },
  mood: { green: 7, yellow: 4, metric: 'Humor', lowAction: 'Avaliar motivação e fatores externos de estresse.', highAction: null },
  energy: { green: 7, yellow: 4, metric: 'Disposição', lowAction: 'Considerar deload ou treino regenerativo.', highAction: null },
  stress: { green: 3, yellow: 6, metric: 'Estresse', lowAction: null, highAction: 'Priorizar exercícios de recuperação e mobilidade. Reduzir carga.' },
  pain: { green: 2, yellow: 5, metric: 'Dor', lowAction: null, highAction: 'ATENÇÃO: Avaliar região da dor. Evitar exercícios que recrutem a área afetada.' },
};

export const PAIN_REGIONS = [
  // Cabeça / Pescoço
  { id: 'head', label: 'Cabeça', group: 'Cabeça/Pescoço' },
  { id: 'neck', label: 'Pescoço', group: 'Cabeça/Pescoço' },
  { id: 'cervical', label: 'Cervical', group: 'Cabeça/Pescoço' },
  // Ombros / Braços
  { id: 'shoulder_r', label: 'Ombro Direito', group: 'Ombros/Braços' },
  { id: 'shoulder_l', label: 'Ombro Esquerdo', group: 'Ombros/Braços' },
  { id: 'biceps_r', label: 'Bíceps Direito', group: 'Ombros/Braços' },
  { id: 'biceps_l', label: 'Bíceps Esquerdo', group: 'Ombros/Braços' },
  { id: 'triceps_r', label: 'Tríceps Direito', group: 'Ombros/Braços' },
  { id: 'triceps_l', label: 'Tríceps Esquerdo', group: 'Ombros/Braços' },
  { id: 'elbow_r', label: 'Cotovelo Direito', group: 'Ombros/Braços' },
  { id: 'elbow_l', label: 'Cotovelo Esquerdo', group: 'Ombros/Braços' },
  { id: 'forearm_r', label: 'Antebraço Direito', group: 'Ombros/Braços' },
  { id: 'forearm_l', label: 'Antebraço Esquerdo', group: 'Ombros/Braços' },
  { id: 'wrist_r', label: 'Punho/Mão Direita', group: 'Ombros/Braços' },
  { id: 'wrist_l', label: 'Punho/Mão Esquerda', group: 'Ombros/Braços' },
  // Tronco
  { id: 'chest_r', label: 'Peitoral Direito', group: 'Tronco' },
  { id: 'chest_l', label: 'Peitoral Esquerdo', group: 'Tronco' },
  { id: 'upper_back', label: 'Dorsal Superior', group: 'Tronco' },
  { id: 'mid_back', label: 'Torácica (Meio Costas)', group: 'Tronco' },
  { id: 'lower_back', label: 'Lombar', group: 'Tronco' },
  { id: 'abdomen', label: 'Abdominal', group: 'Tronco' },
  { id: 'obliques', label: 'Oblíquos/Lateral', group: 'Tronco' },
  { id: 'ribs', label: 'Costelas', group: 'Tronco' },
  // Quadril / Glúteos
  { id: 'hip_r', label: 'Quadril Direito', group: 'Quadril/Glúteos' },
  { id: 'hip_l', label: 'Quadril Esquerdo', group: 'Quadril/Glúteos' },
  { id: 'glute_r', label: 'Glúteo Direito', group: 'Quadril/Glúteos' },
  { id: 'glute_l', label: 'Glúteo Esquerdo', group: 'Quadril/Glúteos' },
  { id: 'groin', label: 'Virilha/Adutores', group: 'Quadril/Glúteos' },
  // Pernas
  { id: 'quad_r', label: 'Quadríceps Direito', group: 'Pernas' },
  { id: 'quad_l', label: 'Quadríceps Esquerdo', group: 'Pernas' },
  { id: 'hamstring_r', label: 'Posterior Dir.', group: 'Pernas' },
  { id: 'hamstring_l', label: 'Posterior Esq.', group: 'Pernas' },
  { id: 'knee_r', label: 'Joelho Direito', group: 'Pernas' },
  { id: 'knee_l', label: 'Joelho Esquerdo', group: 'Pernas' },
  { id: 'calf_r', label: 'Panturrilha Dir.', group: 'Pernas' },
  { id: 'calf_l', label: 'Panturrilha Esq.', group: 'Pernas' },
  { id: 'shin_r', label: 'Canela Dir.', group: 'Pernas' },
  { id: 'shin_l', label: 'Canela Esq.', group: 'Pernas' },
  { id: 'ankle_r', label: 'Tornozelo Dir.', group: 'Pernas' },
  { id: 'ankle_l', label: 'Tornozelo Esq.', group: 'Pernas' },
  { id: 'foot_r', label: 'Pé Direito', group: 'Pernas' },
  { id: 'foot_l', label: 'Pé Esquerdo', group: 'Pernas' },
  { id: 'other', label: 'Outro', group: 'Outro' },
];

/**
 * Generates visual body map HTML for pain selection
 */
export function painRegionSelector(fieldName = 'painRegion') {
  const groups = {};
  PAIN_REGIONS.forEach(r => { if (!groups[r.group]) groups[r.group] = []; groups[r.group].push(r); });
  return `<div class="pain-body-map">
    ${Object.entries(groups).map(([group, regions]) => `
      <div class="pain-group">
        <div class="pain-group-title">${group}</div>
        <div class="pain-group-grid">
          ${regions.map(r => `
            <label class="pain-region-btn" data-region="${r.id}">
              <input type="radio" name="${fieldName}" value="${r.id}" style="display:none" />
              <span class="pain-btn-label">${r.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>`;
}


/**
 * Analyze a single biofeedback entry and return alerts
 */
export function analyzeBiofeedback(entry) {
  const alerts = [];

  for (const [key, cfg] of Object.entries(ALERT_THRESHOLDS)) {
    const val = entry[key];
    if (val == null) continue;

    const isInverse = key === 'stress' || key === 'pain'; // higher is worse

    if (isInverse) {
      if (val >= cfg.yellow) {
        alerts.push({
          level: val >= (cfg.yellow + 2) ? 'danger' : 'warning',
          metric: cfg.metric,
          value: val,
          action: cfg.highAction,
          icon: val >= (cfg.yellow + 2) ? '●' : '○',
        });
      }
    } else {
      if (val <= cfg.yellow) {
        alerts.push({
          level: val <= (cfg.yellow - 2) ? 'danger' : 'warning',
          metric: cfg.metric,
          value: val,
          action: cfg.lowAction,
          icon: val <= (cfg.yellow - 2) ? '●' : '○',
        });
      }
    }
  }

  // Pain region alert
  if (entry.pain >= 3 && entry.painRegion) {
    const region = PAIN_REGIONS.find(r => r.id === entry.painRegion);
    alerts.push({
      level: entry.pain >= 6 ? 'danger' : 'warning',
      metric: 'Dor Localizada',
      value: entry.pain,
      action: `Região: ${region ? region.icon + ' ' + region.label : entry.painRegion}. ${entry.pain >= 6 ? 'EVITAR exercícios desta região. Encaminhar para avaliação médica se persistir.' : 'Monitorar. Adaptar exercícios para não agravar.'}`,
      icon: entry.pain >= 6 ? '!!' : '!',
    });
  }

  // ACWR alert
  if (entry.acwr != null) {
    if (entry.acwr > 1.5) {
      alerts.push({ level: 'danger', metric: 'ACWR', value: entry.acwr.toFixed(2), action: 'Risco alto de lesão! Reduzir volume e intensidade imediatamente.', icon: '●' });
    } else if (entry.acwr > 1.3) {
      alerts.push({ level: 'warning', metric: 'ACWR', value: entry.acwr.toFixed(2), action: 'Atenção com a progressão de carga. Monitorar sinais de overtraining.', icon: '○' });
    } else if (entry.acwr < 0.8 && entry.acwr > 0) {
      alerts.push({ level: 'info', metric: 'ACWR', value: entry.acwr.toFixed(2), action: 'Subtreinamento. O aluno pode suportar mais volume.', icon: '◦' });
    }
  }

  return alerts;
}

/**
 * Get overall status color for a biofeedback entry
 */
export function overallStatus(entry) {
  const alerts = analyzeBiofeedback(entry);
  if (alerts.some(a => a.level === 'danger')) return { color: 'danger', label: 'Atenção Crítica', icon: '●' };
  if (alerts.some(a => a.level === 'warning')) return { color: 'warning', label: 'Monitorar', icon: '○' };
  return { color: 'success', label: 'Tudo OK', icon: '✓' };
}

/**
 * Generate training recommendation based on biofeedback
 */
export function trainingRecommendation(entry) {
  const avgWellness = ((entry.sleep || 5) + (entry.mood || 5) + (entry.energy || 5)) / 3;
  const stress = entry.stress || 5;
  const pain = entry.pain || 1;

  if (pain >= 7) return { type: 'rest', label: 'Repouso/Avaliação Médica', desc: 'Dor alta detectada. Priorizar descanso e buscar avaliação profissional.', volumeMod: 0 };
  if (pain >= 5 || avgWellness <= 3) return { type: 'recovery', label: 'Treino Regenerativo', desc: 'Mobilidade, alongamento e exercícios leves. Evitar alta intensidade.', volumeMod: 0.4 };
  if (avgWellness <= 5 || stress >= 7) return { type: 'reduced', label: 'Treino Reduzido', desc: 'Manter exercícios principais mas reduzir volume em 30-40%.', volumeMod: 0.65 };
  if (avgWellness >= 8 && stress <= 3 && pain <= 1) return { type: 'peak', label: 'Dia de Pico', desc: 'Condições ideais! Pode testar PRs ou aumentar intensidade.', volumeMod: 1.1 };
  return { type: 'normal', label: 'Treino Normal', desc: 'Seguir a programação planejada.', volumeMod: 1.0 };
}
