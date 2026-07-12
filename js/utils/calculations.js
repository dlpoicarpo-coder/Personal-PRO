// ========================================
// VETOR â€” Calculations Utility
// Todas as fÃ³rmulas cientÃ­ficas do sistema
// ========================================

export const Calc = {

  // â”€â”€ DATAS E PRAZOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getMacrocycleStatus(m, now = new Date()) {
    if (m.status !== 'active' || !m.startDate || !m.totalWeeks) return { isCritical: false };
    const startMs = new Date(m.startDate + 'T12:00:00').getTime();
    const endMs = startMs + m.totalWeeks * 7 * 86400000;
    const diffMs = now.getTime() - startMs;
    
    const daysLeft = Math.ceil((endMs - now.getTime()) / 86400000);
    const currentWeek = Math.floor(diffMs / (7 * 86400000)) + 1;
    const daysIntoWeek = Math.floor((diffMs % (7 * 86400000)) / 86400000);

    const isEndingSoon = daysLeft <= 7;
    const isChangingWeek = currentWeek > 1 && currentWeek <= m.totalWeeks && daysIntoWeek <= 2;
    
    return {
      isCritical: isEndingSoon || isChangingWeek,
      isEndingSoon,
      isChangingWeek,
      daysLeft,
      currentWeek
    };
  },

  formatDate(dateStr) {
    if (!dateStr) return 'â€”';
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
    if (isNaN(d.getTime())) return 'â€”';
    return d.toLocaleDateString('pt-BR');
  },

  formatNum(n, decimals = 1) {
    if (n == null || isNaN(n)) return 'â€”';
    return Number(n).toFixed(decimals);
  },

  calcularIdade(birthDate) {
    if (!birthDate) return null;
    const hoje = new Date();
    const nasc = new Date(birthDate + 'T12:00:00');
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  },

  // â”€â”€ COMPOSIÃ‡ÃƒO CORPORAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  imc(peso, altura) {
    if (!peso || !altura) return null;
    const altM = altura > 10 ? altura / 100 : altura;
    return peso / (altM * altM);
  },

  imcClassificacao(imc) {
    if (imc < 18.5) return { label: 'Abaixo do peso',   color: 'info' };
    if (imc < 25)   return { label: 'Peso normal',       color: 'success' };
    if (imc < 30)   return { label: 'Sobrepeso',         color: 'warning' };
    if (imc < 35)   return { label: 'Obesidade I',       color: 'danger' };
    if (imc < 40)   return { label: 'Obesidade II',      color: 'danger' };
    return              { label: 'Obesidade III',      color: 'danger' };
  },

  // Jackson & Pollock 3 dobras
  percentualGordura3dobras(genero, idade, dobra1, dobra2, dobra3) {
    const soma = parseFloat(dobra1) + parseFloat(dobra2) + parseFloat(dobra3);
    const s2 = soma * soma;
    let densidade;
    if (genero === 'M' || genero === 'Masculino') {
      densidade = 1.10938 - (0.0008267 * soma) + (0.0000016 * s2) - (0.0002574 * idade);
    } else {
      densidade = 1.099492 - (0.0009929 * soma) + (0.0000023 * s2) - (0.0001392 * idade);
    }
    return Math.round(((4.95 / densidade) - 4.50) * 100 * 10) / 10;
  },

  // â”€â”€ CALORIAS â€” Gasto EnergÃ©tico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Mifflin-St Jeor (1990) â€” mais precisa para pop. geral
  // Ref: Mifflin MD et al. Am J Clin Nutr. 1990;51(2):241-7.
  tmbMifflin(peso, altura, idade, sexo) {
    const base = (10 * peso) + (6.25 * altura) - (5 * idade);
    return Math.round(sexo === 'F' ? base - 161 : base + 5);
  },

  // Katch-McArdle â€” usa massa magra, mais precisa quando hÃ¡ composiÃ§Ã£o
  // Ref: McArdle WD, Katch FI, Katch VL. Exercise Physiology. 2010.
  tmbKatch(massaMagra) {
    return Math.round(370 + (21.6 * massaMagra));
  },

  // Melhor TMB disponÃ­vel: Katch se tiver massa magra, senÃ£o Mifflin
  tmb(peso, altura, idade, sexo, massaMagra) {
    if (massaMagra > 0) {
      return { valor: this.tmbKatch(massaMagra), formula: 'Katch-McArdle' };
    }
    if (peso && altura && idade && sexo) {
      return { valor: this.tmbMifflin(peso, altura, idade, sexo), formula: 'Mifflin-St Jeor' };
    }
    return null;
  },

  // Fator de atividade (Harris-Benedict)
  FATOR_ATIVIDADE: {
    sedentario:  { label: 'SedentÃ¡rio (sem exercÃ­cio)',          fator: 1.2   },
    leve:        { label: 'Levemente ativo (1-2Ã—/sem)',          fator: 1.375 },
    moderado:    { label: 'Moderadamente ativo (3-4Ã—/sem)',      fator: 1.55  },
    ativo:       { label: 'Muito ativo (5-6Ã—/sem)',              fator: 1.725 },
    muito_ativo: { label: 'Extremamente ativo (2Ã—/dia)',         fator: 1.9   },
  },

  // TDEE = TMB Ã— Fator de Atividade
  tdee(tmbValor, nivelAtividade) {
    const fa = this.FATOR_ATIVIDADE[nivelAtividade] || this.FATOR_ATIVIDADE.moderado;
    return { valor: Math.round(tmbValor * fa.fator), fatorLabel: fa.label, fator: fa.fator };
  },

  // Meta calÃ³rica por objetivo
  // Ref: Helms ER et al. JISSN 2014; Barakat et al. JSCR 2020.
  metaCalorica(tdeeValor, objetivo) {
    const metas = {
      emagrecimento:      { deficit: -500, label: 'DÃ©ficit moderado (-500 kcal/dia)' },
      emagrecimento_leve: { deficit: -250, label: 'DÃ©ficit leve (-250 kcal/dia)'     },
      manutencao:         { deficit:    0, label: 'ManutenÃ§Ã£o'                        },
      hipertrofia_leve:   { deficit: +200, label: 'SuperÃ¡vit leve (+200 kcal/dia)'   },
      hipertrofia:        { deficit: +350, label: 'SuperÃ¡vit moderado (+350 kcal/dia)'},
    };
    const m = metas[objetivo] || metas.manutencao;
    return { kcal: tdeeValor + m.deficit, ...m };
  },

  // DistribuiÃ§Ã£o de macros
  // ProteÃ­na: 1.6-2.2g/kg â€” ISSN Position Stand (Stokes et al. 2018)
  // Gordura: 25-30% TDEE â€” DRI
  // Carboidrato: restante
  macros(kcalMeta, peso, objetivo) {
    const protPorKg = (objetivo === 'emagrecimento' || objetivo === 'emagrecimento_leve') ? 2.2 : 1.8;
    const protG    = Math.round(peso * protPorKg);
    const protKcal = protG * 4;
    const gordPct  = objetivo === 'emagrecimento' ? 0.25 : 0.28;
    const gordKcal = Math.round(kcalMeta * gordPct);
    const gordG    = Math.round(gordKcal / 9);
    const carbKcal = Math.max(0, kcalMeta - protKcal - gordKcal);
    const carbG    = Math.round(carbKcal / 4);
    return {
      proteina:    { g: protG, kcal: protKcal, pct: Math.round(protKcal / kcalMeta * 100) },
      gordura:     { g: gordG, kcal: gordKcal, pct: Math.round(gordKcal / kcalMeta * 100) },
      carboidrato: { g: carbG, kcal: carbKcal, pct: Math.round(carbKcal / kcalMeta * 100) },
      protPorKg,
    };
  },

  // Calorias estimadas da atividade (MET Ã— peso Ã— tempo)
  // Ref: Ainsworth BE et al. Compendium of Physical Activities. Med Sci Sports Exerc. 2011.
  caloriasAtividade(peso, minutos, tipo) {
    const MET = {
      musculacao: 5.0, hiit: 8.0, sit: 10.0, caminhada: 3.5,
      corrida: 9.8, ciclismo: 7.5, natacao: 7.0, funcional: 6.0,
    };
    return Math.round(((MET[tipo] || 5.0) * 3.5 * peso * minutos) / 200);
  },

  composicaoCorporal(peso, pctGordura) {
    if (!peso || !pctGordura) return { percentualGordura: pctGordura, massaMagra: null, massaGorda: null };
    const massaGorda = Math.round(peso * (pctGordura / 100) * 10) / 10;
    const massaMagra = Math.round((peso - massaGorda) * 10) / 10;
    return { percentualGordura: Math.round(pctGordura * 10) / 10, massaMagra, massaGorda };
  },

  rcq(cintura, quadril) {
    if (!cintura || !quadril) return null;
    return cintura / quadril;
  },

  rcqClassificacao(rcq, genero) {
    const isMale = genero === 'M' || genero === 'Masculino';
    if (isMale)  return rcq < 0.90 ? { label: 'Baixo risco',    color: 'success' } : rcq < 0.95 ? { label: 'Risco moderado', color: 'warning' } : { label: 'Alto risco', color: 'danger' };
    return rcq < 0.80 ? { label: 'Baixo risco', color: 'success' } : rcq < 0.85 ? { label: 'Risco moderado', color: 'warning' } : { label: 'Alto risco', color: 'danger' };
  },

  // â”€â”€ MASSA MUSCULAR ESQUELÃ‰TICA (Lee et al. 2000) â”€â”€â”€â”€â”€â”€â”€â”€â”€
  massaMuscularEsqueletica(peso, alturaCm, idade, sexo, raca = 0) {
    if (!peso || !alturaCm || !idade) return null;
    const altM = alturaCm / 100;
    const sexoNum = (sexo === 'M' || sexo === 'Masculino') ? 1 : 0;
    const racaNum = isNaN(parseFloat(raca)) ? 0 : parseFloat(raca);
    const smm = (0.244 * peso) + (7.8 * altM) + (6.6 * sexoNum) - (0.098 * idade) + racaNum - 3.3;
    return Math.round(smm * 10) / 10;
  },

  pctMassaMuscular(smm, peso) {
    if (!smm || !peso) return null;
    return Math.round((smm / peso) * 100 * 10) / 10;
  },

  nowISO() {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
  },

  todayLocal() {
    return this.nowISO().slice(0, 10);
  },

  // â”€â”€ FORÃ‡A / 1RM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Epley (padrÃ£o)
  rm1Estimado(carga, reps, formula = 'epley') {
    const l = parseFloat(carga);
    // Limitamos as repetiÃ§Ãµes a no mÃ¡ximo 15 para seguranÃ§a e precisÃ£o do cÃ¡lculo cientÃ­fico (Brzycki vai a zero/negativo com 37+)
    const r = Math.min(Math.max(parseInt(reps) || 1, 1), 15);
    if (!l || !r) return null;
    if (r === 1) return l;
    let rm1;
    switch (formula) {
      case 'brzycki': rm1 = l * (36 / (37 - r)); break;
      case 'lander':  rm1 = (100 * l) / (101.3 - 2.67123 * r); break;
      case 'lombardi':rm1 = l * Math.pow(r, 0.1); break;
      case 'mayhew':  rm1 = (100 * l) / (52.2 + 41.9 * Math.exp(-0.055 * r)); break;
      default:        rm1 = l * (1 + r / 30); // Epley
    }
    return Math.round(rm1 * 2) / 2; // arredondar para 0.5kg
  },

  // â”€â”€ PROTOCOLO 1RM SUBMAX â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Protocolo progressivo de 3-5 sÃ©ries submÃ¡ximas para estimar 1RM
  // Usado na ficha de avaliaÃ§Ã£o de forÃ§a
  protocolo1RM: {
    steps: [
      { set: 1, pct: 50, reps: '10-12', desc: 'Aquecimento leve â€” nunca falha' },
      { set: 2, pct: 65, reps: '6-8',   desc: 'Aquecimento moderado' },
      { set: 3, pct: 80, reps: '3-5',   desc: 'SÃ©rie pesada â€” esforÃ§o real' },
      { set: 4, pct: 90, reps: '2-3',   desc: 'SÃ©rie muito pesada' },
      { set: 5, pct: 95, reps: '1-2',   desc: 'PrÃ³ximo do mÃ¡ximo (opcional)' },
    ],
    instructions: [
      'Escolha uma carga com a qual consiga realizar as repetiÃ§Ãµes indicadas com boa tÃ©cnica',
      'Descanse 3-5 minutos entre cada sÃ©rie',
      'Registre a carga e as repetiÃ§Ãµes realizadas em cada sÃ©rie',
      'O 1RM serÃ¡ estimado pela fÃ³rmula de Epley a partir da sua melhor relaÃ§Ã£o carga Ã— reps',
      'NÃ£o Ã© necessÃ¡rio chegar ao mÃ¡ximo absoluto â€” a estimativa Ã© precisa a partir de 2-5 reps',
    ],
    safetyNotes: [
      'Nunca tente o 1RM verdadeiro sem spotter qualificado',
      'O protocolo submax Ã© suficiente para prescriÃ§Ã£o de treino',
      'Recomendado para alunos com â‰¥ 3 meses de treino contÃ­nuo',
      'NÃ£o realizar apÃ³s treino intenso â€” descanso de 48h mÃ­nimo',
    ],
  },

  // Calcular melhor estimativa de 1RM a partir de mÃºltiplas sÃ©ries
  melhorEstimativa1RM(series) {
    // series = [{carga, reps, formula?}]
    if (!series?.length) return null;
    const estimativas = series
      .filter(s => s.carga && s.reps && s.reps >= 1 && s.reps <= 12)
      .map(s => ({ ...s, rm1: Calc.rm1Estimado(s.carga, s.reps, s.formula || 'epley') }))
      .filter(s => s.rm1)
      .sort((a, b) => b.rm1 - a.rm1); // maior estimativa primeiro
    return estimativas[0] || null;
  },

  // â”€â”€ FREQUÃŠNCIA CARDÃACA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Tanaka: mais precisa que 220 - idade
  fcMax(idade) {
    return Math.round(208 - 0.7 * idade);
  },

  zonasTreino(fcMax, fcRep) {
    const reserva = fcMax - fcRep;
    return [
      { zona: 1, nome: 'RecuperaÃ§Ã£o',        min: 50, max: 60, cor: '#94a3b8', objetivo: 'RecuperaÃ§Ã£o ativa e aquecimento' },
      { zona: 2, nome: 'Base AerÃ³bia',        min: 60, max: 70, cor: '#3b82f6', objetivo: 'ResistÃªncia bÃ¡sica e queima de gordura' },
      { zona: 3, nome: 'AerÃ³bia',             min: 70, max: 80, cor: '#10b981', objetivo: 'Condicionamento aerÃ³bio geral' },
      { zona: 4, nome: 'Limiar AnaerÃ³bio',    min: 80, max: 90, cor: '#f59e0b', objetivo: 'TolerÃ¢ncia ao lactato e performance' },
      { zona: 5, nome: 'VO2 MÃ¡ximo',          min: 90, max: 100,cor: '#ef4444', objetivo: 'Capacidade mÃ¡xima â€” intervalados curtos' },
    ].map(z => ({
      ...z,
      fcMin: Math.round(fcRep + reserva * (z.min / 100)),
      fcMax: Math.round(fcRep + reserva * (z.max / 100)),
    }));
  },

  // â”€â”€ VO2MAX â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  vo2maxConconi(vma) {
    // Estimativa: VO2max â‰ˆ VMA Ã— 3.5
    if (!vma) return null;
    return Math.round(vma * 3.5 * 10) / 10;
  },

  vo2maxCooper(distanciaMetros) {
    // Teste de Cooper: distÃ¢ncia percorrida em 12 min
    if (!distanciaMetros) return null;
    return Math.round(((distanciaMetros - 504.9) / 44.73) * 10) / 10;
  },

  vo2maxBeepTest(nivel, shuttle) {
    // Beep Test estimado
    return Math.round((nivel * 0.5 + shuttle * 0.1 + 3.46) * 10) / 10;
  },

  // â”€â”€ CARGA DE TREINO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  cargaTreino(pse, duracaoMin) {
    // Foster (1996): Carga = PSE Ã— DuraÃ§Ã£o (min)
    if (!pse || !duracaoMin) return 0;
    return Math.round(pse * duracaoMin);
  },

  // â”€â”€ ACWR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  acwr(cargaAguda, cargaCronica) {
    if (!cargaAguda || !cargaCronica || cargaCronica === 0) return 0;
    return Math.round((cargaAguda / cargaCronica) * 100) / 100;
  },

  acwrClassificacao(acwr) {
    if (acwr === 0)    return { label: 'Sem dados',      color: 'info' };
    if (acwr < 0.8)    return { label: 'Destreino',      color: 'info' };
    if (acwr <= 1.3)   return { label: 'Zona Ã³tima',     color: 'success' };
    if (acwr <= 1.5)   return { label: 'AtenÃ§Ã£o',        color: 'warning' };
    return              { label: 'Risco de lesÃ£o',   color: 'danger' };
  },

};

