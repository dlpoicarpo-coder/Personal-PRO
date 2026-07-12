// ============================================================
// VETOR â€” Periodization Engine (Scientific)
// Baseado em: "Bases CientÃ­ficas e Modelos de PeriodizaÃ§Ã£o v3"
// Gera progressÃ£o cientÃ­fica de carga/reps/sÃ©ries por semana
// ============================================================

// â”€â”€ MODELOS CIENTÃFICOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const PERIODIZATION_MODELS = {

  // 1. LINEAR CLÃSSICA â€” Iniciantes/IntermediÃ¡rios
  // Volume â†“ semana a semana | Intensidade â†‘
  linear: {
    id: 'linear', label: 'Linear ClÃ¡ssica',
    color: '#3b82f6', icon: 'ðŸ“ˆ',
    desc: 'Volume decresce, intensidade aumenta progressivamente. Ideal para iniciantes.',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const phases = [
        { label: 'AdaptaÃ§Ã£o',   sets: 3, repsMin: 15, repsMax: 20, intensityPct: 55, restSeconds: 60,  rpe: '5-6' },
        { label: 'Hipertrofia', sets: 4, repsMin: 10, repsMax: 12, intensityPct: 68, restSeconds: 90,  rpe: '7-8' },
        { label: 'ForÃ§a',       sets: 4, repsMin: 6,  repsMax: 8,  intensityPct: 78, restSeconds: 120, rpe: '8-9' },
        { label: 'Pico',        sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: 87, restSeconds: 180, rpe: '9' },
      ];
      const idx = Math.min(Math.floor(progress * phases.length), phases.length - 1);
      return { phase: phases[idx].label, ...phases[idx], volDelta: idx === 0 ? 0 : -5 };
    }
  },

  // 2. LINEAR REVERSA â€” RML / ResistÃªncia / Emagrecimento
  // Ref: Fleck & Kraemer (2014)
  reverse_linear: {
    id: 'reverse_linear', label: 'Linear Reversa',
    color: '#8b5cf6', icon: 'ðŸ“‰',
    desc: 'Inicia com alta intensidade e migra para alto volume. Ideal para RML e emagrecimento.',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        // Deload correto: ~50% da fase ativa anterior (nÃ£o fixo em 55%)
        const progress = (week - 1) / (totalWeeks - 1);
        const activeIntensity = Math.round(85 - progress * 35); // espelha a progressÃ£o inversa
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: Math.max(42, Math.round(activeIntensity * 0.55)), restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const phases = [
        { label: 'ForÃ§a Base',      sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: 85, restSeconds: 180, rpe: '8-9' },
        { label: 'Hipertrofia',     sets: 4, repsMin: 8,  repsMax: 10, intensityPct: 72, restSeconds: 120, rpe: '7-8' },
        { label: 'ResistÃªncia',     sets: 3, repsMin: 12, repsMax: 15, intensityPct: 62, restSeconds: 75,  rpe: '6-7' },
        { label: 'ResistÃªncia Max', sets: 3, repsMin: 18, repsMax: 25, intensityPct: 50, restSeconds: 45,  rpe: '6' },
      ];
      const idx = Math.min(Math.floor(progress * phases.length), phases.length - 1);
      return { phase: phases[idx].label, ...phases[idx], volDelta: idx === 0 ? 0 : +5 };
    }
  },

  // 3. ONDULATÃ“RIA DIÃRIA (DUP) â€” IntermediÃ¡rio/AvanÃ§ado
  // Alterna ForÃ§a/Hipertrofia/MetabÃ³lico em cada sessÃ£o da semana
  // Ref: Rhea et al. (2002) â€” J Strength Cond Res
  undulating: {
    id: 'undulating', label: 'OndulatÃ³ria (DUP)',
    color: '#f59e0b', icon: 'ðŸŒŠ',
    desc: 'Daily Undulating Periodization: oscila entre sessÃµes de forÃ§a, hipertrofia e metabÃ³lico na mesma semana.',
    // 3 sub-sessÃµes por semana â€” o buildWeek retorna a sessÃ£o correta por Ã­ndice de dia
    sessions: [
      { type: 'A', label: 'ForÃ§a',       sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: 85, restSeconds: 180, rpe: '8-9',  icon: 'ðŸ’ª' },
      { type: 'B', label: 'Hipertrofia', sets: 4, repsMin: 8,  repsMax: 12, intensityPct: 72, restSeconds: 90,  rpe: '7-8',  icon: 'ðŸ‹ï¸' },
      { type: 'C', label: 'MetabÃ³lico',  sets: 3, repsMin: 15, repsMax: 20, intensityPct: 60, restSeconds: 45,  rpe: '6-7',  icon: 'ðŸ”¥' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 10, repsMax: 15, intensityPct: 55, restSeconds: 60, rpe: '4-5', volDelta: -40, dupSessions: null };
      }
      // ProgressÃ£o de carga: +2.5% por semana em cada sub-sessÃ£o (Rhea et al.)
      const loadMultiplier = 1 + ((week - 1) * 0.025);
      return {
        phase: 'DUP',
        // Retornar as 3 sub-sessÃµes com intensidade progressiva
        dupSessions: [
          { type: 'A', label: 'ForÃ§a',       sets: 5, repsMin: 3,  repsMax: 5,  intensityPct: Math.min(95, Math.round(85 * loadMultiplier)), restSeconds: 180, rpe: '8-9' },
          { type: 'B', label: 'Hipertrofia', sets: 4, repsMin: 8,  repsMax: 12, intensityPct: Math.min(85, Math.round(72 * loadMultiplier)), restSeconds: 90,  rpe: '7-8' },
          { type: 'C', label: 'MetabÃ³lico',  sets: 3, repsMin: 15, repsMax: 20, intensityPct: Math.min(75, Math.round(60 * loadMultiplier)), restSeconds: 45,  rpe: '6-7' },
        ],
        // Valores mÃ©dios para o grid semanal (representaÃ§Ã£o visual)
        sets: '3-5', repsMin: 3, repsMax: 20,
        intensityPct: Math.round(72 * loadMultiplier),
        restSeconds: 90, rpe: '7-9',
        loadMultiplier, volDelta: 0
      };
    }
  },

  // 4. BLOCOS (Block Periodization / MST) â€” Alto Rendimento
  // Ref: Issurin (2010) â€” Sports Med
  block: {
    id: 'block', label: 'Blocos (MST)',
    color: '#ef4444', icon: 'ðŸ§±',
    desc: 'Mesociclos especÃ­ficos: AcumulaÃ§Ã£o (volume), IntensificaÃ§Ã£o (carga), RealizaÃ§Ã£o (pico).',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      const third = Math.ceil(totalWeeks / 3);
      if (week <= third) {
        // AcumulaÃ§Ã£o: 3-4 sÃ©ries (nÃ£o 5) para ser compatÃ­vel com iniciantes/intermediÃ¡rios
        return { phase: 'AcumulaÃ§Ã£o', sets: 4, repsMin: 10, repsMax: 15, intensityPct: 63, restSeconds: 75, rpe: '6-7', volDelta: +5 };
      } else if (week <= third * 2) {
        return { phase: 'IntensificaÃ§Ã£o', sets: 4, repsMin: 5, repsMax: 8, intensityPct: 78, restSeconds: 150, rpe: '8-9', volDelta: -10 };
      } else {
        return { phase: 'RealizaÃ§Ã£o', sets: 3, repsMin: 1, repsMax: 4, intensityPct: 92, restSeconds: 300, rpe: '9-10', volDelta: -20 };
      }
    }
  },

  // 5. CONJUGADA â€” ForÃ§a/Powerlifting
  // Ref: Simmons (1999) â€” Westside Barbell
  conjugate: {
    id: 'conjugate', label: 'Conjugada',
    color: '#ec4899', icon: 'âš¡',
    desc: 'Westside-based: alterna EsforÃ§o MÃ¡ximo (90-100% 1RM) e EsforÃ§o DinÃ¢mico (50-60% 1RM, mÃ¡x velocidade).',
    sessions: [
      { type: 'ME', label: 'EsforÃ§o MÃ¡ximo',   sets: 5, repsMin: 1, repsMax: 3,  intensityPct: 95, restSeconds: 300, rpe: '9-10', icon: 'ðŸ†', note: 'Trabalho na falha concÃªntrica. Rotacionar exercÃ­cio variante a cada semana.' },
      { type: 'DE', label: 'EsforÃ§o DinÃ¢mico', sets: 8, repsMin: 2, repsMax: 3,  intensityPct: 55, restSeconds: 60,  rpe: '5-6',  icon: 'ðŸ’¨', note: 'Velocidade mÃ¡xima de barra â€” nÃ£o de esforÃ§o. Bar speed Ã© o critÃ©rio, nÃ£o RPE alto.' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 5, repsMax: 8, intensityPct: 55, restSeconds: 120, rpe: '5', volDelta: -40 };
      }
      // Conjugada: mesma semana tem ME + DE. Intensidade ME sobe ~2% a cada 3 semanas
      const meCycle = Math.floor((week - 1) / 3);
      const meIntensity = Math.min(100, 90 + meCycle * 2);
      return {
        phase: 'Conjugada',
        sets: '5-8', repsMin: 1, repsMax: 3,
        intensityPct: Math.round((meIntensity + 55) / 2), // mÃ©dia ME+DE para visualizaÃ§Ã£o
        restSeconds: 180, rpe: '5-10',
        dupSessions: [
          { type: 'ME', label: 'EsforÃ§o MÃ¡ximo',   sets: 5, repsMin: 1, repsMax: 3, intensityPct: meIntensity, restSeconds: 300, rpe: '9-10', note: 'Rotacionar variante do exercÃ­cio principal a cada semana.' },
          { type: 'DE', label: 'EsforÃ§o DinÃ¢mico', sets: 8, repsMin: 2, repsMax: 3, intensityPct: 55, restSeconds: 60, rpe: '5-6', note: 'CritÃ©rio: velocidade mÃ¡xima de barra, nÃ£o esforÃ§o.' },
        ],
        volDelta: 0
      };
    }
  },

  // 6. CONCORRENTE â€” Emagrecimento/RecomposiÃ§Ã£o
  // Ref: Wilson et al. (2012) â€” J Strength Cond Res
  concurrent: {
    id: 'concurrent', label: 'Concorrente',
    color: '#10b981', icon: 'ðŸŒ€',
    desc: 'ForÃ§a e cardio na mesma semana, alternando por dia. ForÃ§a ANTES do cardio para minimizar interferÃªncia.',
    sessions: [
      { type: 'S', label: 'ForÃ§a',      sets: 4, repsMin: 8,  repsMax: 12, intensityPct: 70, restSeconds: 90,  rpe: '7-8', icon: 'ðŸ’ª', note: 'Sempre realizar antes do cardio (mÃ­nimo 6h de separaÃ§Ã£o recomendado).' },
      { type: 'M', label: 'Cardio',     sets: 1, repsMin: 20, repsMax: 45, intensityPct: 65, restSeconds: 0,   rpe: '5-7', icon: 'ðŸ”¥', note: 'Z2 (65% FCmÃ¡x) ou HIIT curto (30s/60s). NÃ£o realizar imediatamente apÃ³s forÃ§a.' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      // Correto: alterna forÃ§a/cardio DENTRO da semana, nÃ£o semanas inteiras
      const progress = (week - 1) / (totalWeeks - 1);
      // A cada mÃªs, aumenta intensidade da forÃ§a e duraÃ§Ã£o do cardio
      const strengthIntensity = Math.round(65 + progress * 15); // 65% â†’ 80%
      const cardioIntensity = Math.round(60 + progress * 10);   // 60% â†’ 70%
      return {
        phase: 'Concorrente',
        sets: '3-4', repsMin: 8, repsMax: 20,
        intensityPct: Math.round((strengthIntensity + cardioIntensity) / 2),
        restSeconds: 60, rpe: '6-8',
        dupSessions: [
          { type: 'S', label: 'ForÃ§a',  sets: 4, repsMin: 8, repsMax: 12, intensityPct: strengthIntensity, restSeconds: 90, rpe: '7-8', note: 'ForÃ§a antes do cardio. MÃ­n. 6h de separaÃ§Ã£o.' },
          { type: 'M', label: 'Cardio', sets: 1, repsMin: 20, repsMax: 40, intensityPct: cardioIntensity, restSeconds: 0, rpe: '5-7', note: 'Z2 contÃ­nuo ou HIIT 30/60. NÃ£o imediatamente apÃ³s forÃ§a.' },
        ],
        volDelta: progress > 0.5 ? -5 : +3
      };
    }
  },

  // 7. PERSONALIZADO / MANUAL
  manual: {
    id: 'manual', label: 'Personalizado (Ajuste Manual)',
    color: '#94a3b8', icon: 'âš™ï¸',
    desc: 'PeriodizaÃ§Ã£o personalizada. Permite ajuste manual de cada semana.',
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload', sets: 2, repsMin: 12, repsMax: 15, intensityPct: 50, restSeconds: 60, rpe: '4-5', volDelta: -40 };
      }
      return { phase: 'Hipertrofia', sets: 3, repsMin: 10, repsMax: 12, intensityPct: 70, restSeconds: 90, rpe: '7-8', volDelta: 0 };
    }
  },

  // â”€â”€ MODELOS DE CARDIO / ENDURANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // 8. POLARIZADO â€” 80% Z1/Z2 + 20% Z4/Z5
  // Ref: Seiler & TÃ¸nnessen (2009) â€” Int J Sports Physiol Perform
  polarized: {
    id: 'polarized', label: 'Polarizado',
    color: '#06b6d4',
    desc: '80% do volume em Z1/Z2 (< VT1) e 20% em Z4/Z5 (> VT2). Evita Z3 (zona cinzenta). Modelo de atletas de elite.',
    isCardio: true,
    sessions: [
      { type: 'Z2', label: 'Longa Z2 (Ã—4)', sets: 1, repsMin: 60, repsMax: 90, intensityPct: 70, restSeconds: 0, rpe: '3-4', note: '65-75% FCmÃ¡x. Lactato < 2 mmol/L. DiÃ¡logo em frases completas. 4 sessÃµes por semana.' },
      { type: 'Z5', label: 'Intensa Z4/Z5 (Ã—1)', sets: 5, repsMin: 4, repsMax: 5, intensityPct: 90, restSeconds: 180, rpe: '8-9', note: '85-92% FCmÃ¡x (Z4) ou 90-100% (Z5). 5 tiros de 4 min. 1 sessÃ£o por semana.' },
    ],
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload AerÃ³bico', sets: 1, repsMin: 30, repsMax: 45, intensityPct: 60, restSeconds: 0, rpe: '3-4', volDelta: -40, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const duration = Math.round(60 + progress * 30);
      return { phase: 'Polarizado 80/20', sets: 1, repsMin: duration, repsMax: duration, intensityPct: 72, restSeconds: 0, rpe: '4-9', volDelta: +3, isCardio: true,
        dupSessions: [
          { type: 'Z2', label: `Z2 Longa (${duration} min)`, sets: 1, repsMin: duration, repsMax: duration, intensityPct: 68, restSeconds: 0, rpe: '3-4', note: '80% do volume semanal. 65-75% FCmÃ¡x. Lactato < 2 mmol/L.' },
          { type: 'Z5', label: 'Intervalado Z4/Z5', sets: 5, repsMin: 4, repsMax: 5, intensityPct: 90, restSeconds: 180, rpe: '8-9', note: '20% do volume. 85-100% FCmÃ¡x. Evitar Z3.' },
        ]
      };
    }
  },

  // 9. HIIT â€” Intervalado de Alta Intensidade
  // Ref: Gibala et al. (2012) â€” J Physiol
  hiit: {
    id: 'hiit', label: 'HIIT',
    color: '#f97316',
    desc: 'Tiros em Z4-Z5 (85-95% FCmÃ¡x), 30s esforÃ§o / 60s recuperaÃ§Ã£o (1:2). 6-12 rounds. MÃ¡x 2-3Ã—/semana.',
    isCardio: true,
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload HIIT', sets: 1, repsMin: 20, repsMax: 30, intensityPct: 65, restSeconds: 0, rpe: '3-4', volDelta: -40, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const tiros = Math.round(6 + progress * 4);
      return { phase: 'HIIT 1:2', sets: tiros, repsMin: 30, repsMax: 60, intensityPct: 90, restSeconds: 90, rpe: '8-9', volDelta: +1, isCardio: true };
    }
  },

  // 10. LSD â€” Longa DuraÃ§Ã£o e Baixa Intensidade
  // Ref: Maffetone (1980s), Z2 training (Seiler)
  lsd: {
    id: 'lsd', label: 'LSD',
    color: '#22c55e',
    desc: 'Treino contÃ­nuo em Z2 (65-75% FCmÃ¡x), 45-90 min. Desenvolve base aerÃ³bica, mitocÃ´ndrias e oxidaÃ§Ã£o de gordura. Lactato < 2 mmol/L.',
    isCardio: true,
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'RecuperaÃ§Ã£o Ativa', sets: 1, repsMin: 30, repsMax: 40, intensityPct: 55, restSeconds: 0, rpe: '3', volDelta: -30, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const duration = Math.round(45 + progress * 45);
      return { phase: 'LSD Z2', sets: 1, repsMin: duration, repsMax: duration, intensityPct: 68, restSeconds: 0, rpe: '3-4', volDelta: +3, isCardio: true };
    }
  },

  // 11. LIMIAR ANAERÃ“BIO â€” Threshold / Tempo Run
  // Ref: Billat (2001) â€” Sports Med. VT2 / OBLA.
  threshold: {
    id: 'threshold', label: 'Limiar AnaerÃ³bio',
    color: '#a855f7',
    desc: 'Treino no VT2/OBLA (85-92% FCmÃ¡x, lactato ~ 4 mmol/L). Aumenta velocidade sustentÃ¡vel. MÃ­nimo 20 min para adaptaÃ§Ã£o do tamponamento de lactato.',
    isCardio: true,
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'Deload Limiar', sets: 1, repsMin: 20, repsMax: 30, intensityPct: 65, restSeconds: 0, rpe: '3-4', volDelta: -35, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const duration = Math.round(20 + progress * 20);
      return { phase: 'Tempo Run VT2', sets: 1, repsMin: duration, repsMax: duration, intensityPct: 87, restSeconds: 0, rpe: '7-8', volDelta: +2, isCardio: true };
    }
  },

  // 12. FARTLEK â€” VariaÃ§Ãµes de ritmo livres
  // Ref: Gosta HolmÃ©r (1937)
  fartlek: {
    id: 'fartlek', label: 'Fartlek',
    color: '#ec4899',
    desc: 'VariaÃ§Ã£o livre de ritmo durante treino contÃ­nuo. Sem protocolo fixo â€” acelera e desacelera conforme sensaÃ§Ã£o, terreno ou marcadores visuais.',
    isCardio: true,
    buildWeek: (week, totalWeeks, deloadEvery) => {
      if (deloadEvery > 0 && week % deloadEvery === 0) {
        return { phase: 'RecuperaÃ§Ã£o Fartlek', sets: 1, repsMin: 25, repsMax: 35, intensityPct: 60, restSeconds: 0, rpe: '3-4', volDelta: -30, isCardio: true };
      }
      const progress = (week - 1) / (totalWeeks - 1);
      const duration = Math.round(30 + progress * 20);
      return {
        phase: 'Fartlek Livre',
        sets: 1, repsMin: duration, repsMax: duration,
        intensityPct: 75,
        restSeconds: 0, rpe: '4-8',
        note: 'Sem sÃ©rie/descanso definido. Variar ritmo livremente conforme sensaÃ§Ã£o â€” nÃ£o regulado por FC.',
        volDelta: +2, isCardio: true
      };
    }
  },
};

// â”€â”€ OBJETIVOS DISPONÃVEIS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const TRAINING_GOALS = [
  { id: 'hypertrophy',    label: 'Hipertrofia Muscular',    suggested: ['linear', 'undulating'],        icon: 'ðŸ’ª' },
  { id: 'fat_loss',       label: 'Emagrecimento',           suggested: ['concurrent', 'undulating'],    icon: 'ðŸ”¥' },
  { id: 'strength',       label: 'ForÃ§a MÃ¡xima',            suggested: ['block', 'conjugate'],          icon: 'ðŸ‹ï¸' },
  { id: 'power',          label: 'PotÃªncia/ExplosÃ£o',       suggested: ['conjugate', 'block'],          icon: 'âš¡' },
  { id: 'endurance',      label: 'ResistÃªncia AerÃ³bia',     suggested: ['reverse_linear'],              icon: 'ðŸƒ' },
  { id: 'rml',            label: 'ResistÃªncia Muscular',    suggested: ['reverse_linear', 'concurrent'],icon: 'ðŸ”„' },
  { id: 'health',         label: 'SaÃºde e Qualidade de Vida',suggested: ['linear', 'undulating'],       icon: 'â¤ï¸' },
  { id: 'body_recomp',    label: 'RecomposiÃ§Ã£o Corporal',   suggested: ['concurrent', 'undulating'],    icon: 'âš–ï¸' },
];

// â”€â”€ GERADOR DE PROGRESSÃƒO CIENTÃFICA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Gera a tabela completa de progressÃ£o por exercÃ­cio e por semana
 * @param {Object} config
 * @param {string} config.model - id do modelo (linear, block, undulating, etc.)
 * @param {string} config.goal - id do objetivo
 * @param {number} config.totalWeeks - total de semanas do macrociclo
 * @param {number} config.deloadEvery - deload a cada N semanas (0 = sem deload)
 * @param {Array} config.exercises - [{ id, name, initialLoadKg }]
 * @returns {Object} { weekSchedule[], exerciseProgression[] }
 */
export function generateProgression(config) {
  const { model, totalWeeks, deloadEvery, exercises = [] } = config;
  const modelDef = PERIODIZATION_MODELS[model] || PERIODIZATION_MODELS.linear;

  // 1. Gerar schedule semanal (sem exercÃ­cios especÃ­ficos)
  const weekSchedule = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const wk = modelDef.buildWeek(w, totalWeeks, deloadEvery || 0);
    weekSchedule.push({ week: w, ...wk });
  }

  // 2. Para cada exercÃ­cio, gerar progressÃ£o de carga semana a semana
  const exerciseProgression = exercises.map(ex => {
    const baseLoad = parseFloat(ex.initialLoadKg) || 20;
    const weeks = weekSchedule.map(wk => {
      const isDeload = wk.phase === 'Deload';
      // Calcular carga baseada no % de intensidade relativo Ã  carga inicial
      // Assumimos que a carga inicial = 70% 1RM (estimativa padrÃ£o)
      const estimated1RM = baseLoad / 0.70;
      const loadKg = isDeload
        ? Math.round(baseLoad * 0.6 * 2) / 2  // deload: -40% da carga inicial
        : Math.round((estimated1RM * (wk.intensityPct / 100)) * 2) / 2; // arredonda p/ 0.5kg

      const repsDisplay = isDeload
        ? `${wk.repsMin}-${wk.repsMax}`
        : (typeof wk.repsMin === 'number' && wk.repsMin === wk.repsMax
          ? String(wk.repsMin)
          : `${wk.repsMin}-${wk.repsMax}`);

      return {
        week: wk.week,
        phase: wk.phase,
        sets: wk.sets,
        reps: repsDisplay,
        loadKg: Math.max(loadKg, 5), // mÃ­nimo 5kg
        intensityPct: wk.intensityPct,
        restSeconds: wk.restSeconds,
        rpe: wk.rpe,
        isDeload,
      };
    });
    return { exerciseId: ex.id, name: ex.name, initialLoadKg: baseLoad, weeks };
  });

  return { weekSchedule, exerciseProgression, modelDef };
}

// â”€â”€ UTILITÃRIOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function formatRest(seconds) {
  if (seconds >= 60) return `${Math.floor(seconds / 60)}min${seconds % 60 ? ` ${seconds % 60}s` : ''}`;
  return `${seconds}s`;
}

export function getModelById(id) {
  return PERIODIZATION_MODELS[id] || null;
}

export function getGoalById(id) {
  return TRAINING_GOALS.find(g => g.id === id) || null;
}

// Fase intensidade â†’ cor visual
export function intensityColor(pct, isDeload) {
  if (isDeload) return '#3b82f6';
  if (pct >= 90) return '#ef4444';
  if (pct >= 80) return '#f97316';
  if (pct >= 70) return '#eab308';
  return '#22c55e';
}

