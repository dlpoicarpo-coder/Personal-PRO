// ========================================
// VETOR â€” Scientific Biofeedback Alerts
// ========================================

export const ALERT_THRESHOLDS = {
  sleep: { green: 7, yellow: 5, metric: 'Sono', lowAction: 'Reduzir volume e intensidade. Priorizar qualidade do sono.', highAction: null },
  mood: { green: 7, yellow: 4, metric: 'Humor', lowAction: 'Avaliar motivaÃ§Ã£o e fatores externos de estresse.', highAction: null },
  energy: { green: 7, yellow: 3, metric: 'DisposiÃ§Ã£o', lowAction: 'Considerar deload ou treino regenerativo.', highAction: null },
  stress: { green: 3, yellow: 8, metric: 'Estresse', lowAction: null, highAction: 'Priorizar exercÃ­cios de recuperaÃ§Ã£o e mobilidade. Reduzir carga.' },
  pain: { green: 2, yellow: 5, metric: 'Dor', lowAction: null, highAction: 'ATENÃ‡ÃƒO: Avaliar regiÃ£o da dor. Evitar exercÃ­cios que recrutem a Ã¡rea afetada.' },
};

export const PAIN_REGIONS = [
  // CabeÃ§a / PescoÃ§o
  { id: 'head',        label: 'CabeÃ§a',              group: 'CabeÃ§a/PescoÃ§o'  },
  { id: 'neck',        label: 'PescoÃ§o',              group: 'CabeÃ§a/PescoÃ§o'  },
  { id: 'cervical',    label: 'Cervical',             group: 'CabeÃ§a/PescoÃ§o'  },
  // Ombros / BraÃ§os
  { id: 'shoulder_r',  label: 'Ombro Direito',        group: 'Ombros/BraÃ§os'   },
  { id: 'shoulder_l',  label: 'Ombro Esquerdo',       group: 'Ombros/BraÃ§os'   },
  { id: 'biceps_r',    label: 'BÃ­ceps Direito',       group: 'Ombros/BraÃ§os'   },
  { id: 'biceps_l',    label: 'BÃ­ceps Esquerdo',      group: 'Ombros/BraÃ§os'   },
  { id: 'triceps_r',   label: 'TrÃ­ceps Direito',      group: 'Ombros/BraÃ§os'   },
  { id: 'triceps_l',   label: 'TrÃ­ceps Esquerdo',     group: 'Ombros/BraÃ§os'   },
  { id: 'elbow_r',     label: 'Cotovelo Direito',     group: 'Ombros/BraÃ§os'   },
  { id: 'elbow_l',     label: 'Cotovelo Esquerdo',    group: 'Ombros/BraÃ§os'   },
  { id: 'forearm_r',   label: 'AntebraÃ§o Direito',    group: 'Ombros/BraÃ§os'   },
  { id: 'forearm_l',   label: 'AntebraÃ§o Esquerdo',   group: 'Ombros/BraÃ§os'   },
  { id: 'wrist_r',     label: 'Punho/MÃ£o Dir.',       group: 'Ombros/BraÃ§os'   },
  { id: 'wrist_l',     label: 'Punho/MÃ£o Esq.',       group: 'Ombros/BraÃ§os'   },
  // Tronco
  { id: 'chest_r',     label: 'Peitoral Direito',     group: 'Tronco'          },
  { id: 'chest_l',     label: 'Peitoral Esquerdo',    group: 'Tronco'          },
  { id: 'upper_back',  label: 'Dorsal Superior',      group: 'Tronco'          },
  { id: 'mid_back',    label: 'TorÃ¡cica',             group: 'Tronco'          },
  { id: 'lower_back',  label: 'Lombar',               group: 'Tronco'          },
  { id: 'abdomen',     label: 'Abdominal',            group: 'Tronco'          },
  { id: 'obliques',    label: 'OblÃ­quos/Lateral',     group: 'Tronco'          },
  { id: 'ribs',        label: 'Costelas',             group: 'Tronco'          },
  // Quadril / GlÃºteos
  { id: 'hip_r',       label: 'Quadril Direito',      group: 'Quadril/GlÃºteos' },
  { id: 'hip_l',       label: 'Quadril Esquerdo',     group: 'Quadril/GlÃºteos' },
  { id: 'glute_r',     label: 'GlÃºteo Direito',       group: 'Quadril/GlÃºteos' },
  { id: 'glute_l',     label: 'GlÃºteo Esquerdo',      group: 'Quadril/GlÃºteos' },
  { id: 'groin',       label: 'Virilha/Adutores',     group: 'Quadril/GlÃºteos' },
  // Pernas
  { id: 'quad_r',      label: 'QuadrÃ­ceps Dir.',      group: 'Pernas'          },
  { id: 'quad_l',      label: 'QuadrÃ­ceps Esq.',      group: 'Pernas'          },
  { id: 'hamstring_r', label: 'Posterior Dir.',        group: 'Pernas'          },
  { id: 'hamstring_l', label: 'Posterior Esq.',        group: 'Pernas'          },
  { id: 'knee_r',      label: 'Joelho Direito',        group: 'Pernas'          },
  { id: 'knee_l',      label: 'Joelho Esquerdo',       group: 'Pernas'          },
  { id: 'calf_r',      label: 'Panturrilha Dir.',      group: 'Pernas'          },
  { id: 'calf_l',      label: 'Panturrilha Esq.',      group: 'Pernas'          },
  { id: 'shin_r',      label: 'Canela Dir.',            group: 'Pernas'          },
  { id: 'shin_l',      label: 'Canela Esq.',            group: 'Pernas'          },
  { id: 'ankle_r',     label: 'Tornozelo Dir.',         group: 'Pernas'          },
  { id: 'ankle_l',     label: 'Tornozelo Esq.',         group: 'Pernas'          },
  { id: 'foot_r',      label: 'PÃ© Direito',             group: 'Pernas'          },
  { id: 'foot_l',      label: 'PÃ© Esquerdo',            group: 'Pernas'          },
  { id: 'other',       label: 'Outro',                  group: 'Outro'           },
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
          icon: val >= (cfg.yellow + 2) ? 'â—' : 'â—‹',
        });
      }
    } else {
      if (val <= cfg.yellow) {
        alerts.push({
          level: val <= (cfg.yellow - 2) ? 'danger' : 'warning',
          metric: cfg.metric,
          value: val,
          action: cfg.lowAction,
          icon: val <= (cfg.yellow - 2) ? 'â—' : 'â—‹',
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
      action: `RegiÃ£o: ${region ? region.icon + ' ' + region.label : entry.painRegion}. ${entry.pain >= 6 ? 'EVITAR exercÃ­cios desta regiÃ£o. Encaminhar para avaliaÃ§Ã£o mÃ©dica se persistir.' : 'Monitorar. Adaptar exercÃ­cios para nÃ£o agravar.'}`,
      icon: entry.pain >= 6 ? '!!' : '!',
    });
  }

  // ACWR alert
  if (entry.acwr != null) {
    if (entry.acwr > 1.5) {
      alerts.push({ level: 'danger', metric: 'ACWR', value: entry.acwr.toFixed(2), action: 'Risco alto de lesÃ£o! Reduzir volume e intensidade imediatamente.', icon: 'â—' });
    } else if (entry.acwr > 1.3) {
      alerts.push({ level: 'warning', metric: 'ACWR', value: entry.acwr.toFixed(2), action: 'AtenÃ§Ã£o com a progressÃ£o de carga. Monitorar sinais de overtraining.', icon: 'â—‹' });
    } else if (entry.acwr < 0.8 && entry.acwr > 0) {
      alerts.push({ level: 'info', metric: 'ACWR', value: entry.acwr.toFixed(2), action: 'Subtreinamento. O aluno pode suportar mais volume.', icon: 'â—¦' });
    }
  }

  // Menstrual Cycle alert
  if (entry.menstrualCycle) {
    if (entry.menstrualCycle === 'Lutea' || entry.menstrualCycle === 'Menstruacao') {
      alerts.push({
        level: 'warning',
        metric: 'Ciclo Menstrual',
        value: entry.menstrualCycle === 'Lutea' ? 'Fase LÃºtea' : 'MenstruaÃ§Ã£o',
        action: 'PossÃ­vel queda de forÃ§a e aumento de fadiga. Ajustar volume e carga se necessÃ¡rio.',
        icon: 'â—‹'
      });
    } else if (entry.menstrualCycle === 'Folicular' || entry.menstrualCycle === 'Ovulatoria') {
      alerts.push({
        level: 'info',
        metric: 'Ciclo Menstrual',
        value: entry.menstrualCycle === 'Folicular' ? 'Fase Folicular' : 'Fase OvulatÃ³ria',
        action: 'Fase de alta energia. Momento ideal para picos de intensidade e quebra de recordes.',
        icon: 'â—¦'
      });
    }
  }

  // Food alert
  if (entry.food != null && entry.food <= 2) {
    alerts.push({
      level: 'warning',
      metric: 'AlimentaÃ§Ã£o',
      value: entry.food,
      action: 'Baixa ingestÃ£o de nutrientes nas Ãºltimas 24h. Risco de hipoglicemia e baixa performance.',
      icon: 'â—‹'
    });
  }

  return alerts;
}

/**
 * Get overall status color for a biofeedback entry
 */
export function overallStatus(entry) {
  const alerts = analyzeBiofeedback(entry);
  if (alerts.some(a => a.level === 'danger')) return { color: 'danger', label: 'AtenÃ§Ã£o CrÃ­tica', icon: 'â—' };
  if (alerts.some(a => a.level === 'warning')) return { color: 'warning', label: 'Monitorar', icon: 'â—‹' };
  return { color: 'success', label: 'Tudo OK', icon: 'âœ“' };
}

/**
 * Generate training recommendation based on biofeedback
 */
export function trainingRecommendation(entry) {
  const avgWellness = ((entry.sleep || 5) + (entry.mood || 5) + (entry.energy || 5)) / 3;
  const stress = entry.stress || 5;
  const pain = entry.pain || 1;

  if (pain >= 7) return { type: 'rest', label: 'Repouso/AvaliaÃ§Ã£o MÃ©dica', desc: 'Dor alta detectada. Priorizar descanso e buscar avaliaÃ§Ã£o profissional.', volumeMod: 0 };
  if (pain >= 5 || avgWellness <= 3) return { type: 'recovery', label: 'Treino Regenerativo', desc: 'Mobilidade, alongamento e exercÃ­cios leves. Evitar alta intensidade.', volumeMod: 0.4 };
  if (avgWellness <= 5 || stress >= 7) return { type: 'reduced', label: 'Treino Reduzido', desc: 'Manter exercÃ­cios principais mas reduzir volume em 30-40%.', volumeMod: 0.65 };
  if (avgWellness >= 8 && stress <= 3 && pain <= 1) return { type: 'peak', label: 'Dia de Pico', desc: 'CondiÃ§Ãµes ideais! Pode testar PRs ou aumentar intensidade.', volumeMod: 1.1 };
  return { type: 'normal', label: 'Treino Normal', desc: 'Seguir a programaÃ§Ã£o planejada.', volumeMod: 1.0 };
}

