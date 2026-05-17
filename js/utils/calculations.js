// ========================================
// PERSONAL PRO — Calculations Utility
// Todas as fórmulas científicas do sistema
// ========================================

export const Calc = {

  // ── DATAS ────────────────────────────────────────────────
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  },

  formatNum(n, decimals = 1) {
    if (n == null || isNaN(n)) return '—';
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

  // ── COMPOSIÇÃO CORPORAL ──────────────────────────────────
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

  // ── FORÇA / 1RM ──────────────────────────────────────────
  // Epley (padrão)
  rm1Estimado(carga, reps, formula = 'epley') {
    const l = parseFloat(carga), r = parseInt(reps);
    if (!l || !r || r < 1) return null;
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

  // ── PROTOCOLO 1RM SUBMAX ─────────────────────────────────
  // Protocolo progressivo de 3-5 séries submáximas para estimar 1RM
  // Usado na ficha de avaliação de força
  protocolo1RM: {
    steps: [
      { set: 1, pct: 50, reps: '10-12', desc: 'Aquecimento leve — nunca falha' },
      { set: 2, pct: 65, reps: '6-8',   desc: 'Aquecimento moderado' },
      { set: 3, pct: 80, reps: '3-5',   desc: 'Série pesada — esforço real' },
      { set: 4, pct: 90, reps: '2-3',   desc: 'Série muito pesada' },
      { set: 5, pct: 95, reps: '1-2',   desc: 'Próximo do máximo (opcional)' },
    ],
    instructions: [
      'Escolha uma carga com a qual consiga realizar as repetições indicadas com boa técnica',
      'Descanse 3-5 minutos entre cada série',
      'Registre a carga e as repetições realizadas em cada série',
      'O 1RM será estimado pela fórmula de Epley a partir da sua melhor relação carga × reps',
      'Não é necessário chegar ao máximo absoluto — a estimativa é precisa a partir de 2-5 reps',
    ],
    safetyNotes: [
      'Nunca tente o 1RM verdadeiro sem spotter qualificado',
      'O protocolo submax é suficiente para prescrição de treino',
      'Recomendado para alunos com ≥ 3 meses de treino contínuo',
      'Não realizar após treino intenso — descanso de 48h mínimo',
    ],
  },

  // Calcular melhor estimativa de 1RM a partir de múltiplas séries
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

  // ── FREQUÊNCIA CARDÍACA ──────────────────────────────────
  // Tanaka: mais precisa que 220 - idade
  fcMax(idade) {
    return Math.round(208 - 0.7 * idade);
  },

  zonasTreino(fcMax, fcRep) {
    const reserva = fcMax - fcRep;
    return [
      { zona: 1, nome: 'Recuperação',        min: 50, max: 60, cor: '#94a3b8', objetivo: 'Recuperação ativa e aquecimento' },
      { zona: 2, nome: 'Base Aeróbia',        min: 60, max: 70, cor: '#3b82f6', objetivo: 'Resistência básica e queima de gordura' },
      { zona: 3, nome: 'Aeróbia',             min: 70, max: 80, cor: '#10b981', objetivo: 'Condicionamento aeróbio geral' },
      { zona: 4, nome: 'Limiar Anaeróbio',    min: 80, max: 90, cor: '#f59e0b', objetivo: 'Tolerância ao lactato e performance' },
      { zona: 5, nome: 'VO2 Máximo',          min: 90, max: 100,cor: '#ef4444', objetivo: 'Capacidade máxima — intervalados curtos' },
    ].map(z => ({
      ...z,
      fcMin: Math.round(fcRep + reserva * (z.min / 100)),
      fcMax: Math.round(fcRep + reserva * (z.max / 100)),
    }));
  },

  // ── VO2MAX ───────────────────────────────────────────────
  vo2maxConconi(vma) {
    // Estimativa: VO2max ≈ VMA × 3.5
    if (!vma) return null;
    return Math.round(vma * 3.5 * 10) / 10;
  },

  vo2maxCooper(distanciaMetros) {
    // Teste de Cooper: distância percorrida em 12 min
    if (!distanciaMetros) return null;
    return Math.round(((distanciaMetros - 504.9) / 44.73) * 10) / 10;
  },

  vo2maxBeepTest(nivel, shuttle) {
    // Beep Test estimado
    return Math.round((nivel * 0.5 + shuttle * 0.1 + 3.46) * 10) / 10;
  },

  // ── CARGA DE TREINO ──────────────────────────────────────
  cargaTreino(pse, duracaoMin) {
    // Foster (1996): Carga = PSE × Duração (min)
    if (!pse || !duracaoMin) return 0;
    return Math.round(pse * duracaoMin);
  },

  // ── ACWR ─────────────────────────────────────────────────
  acwr(cargaAguda, cargaCronica) {
    if (!cargaAguda || !cargaCronica || cargaCronica === 0) return 0;
    return Math.round((cargaAguda / cargaCronica) * 100) / 100;
  },

  acwrClassificacao(acwr) {
    if (acwr === 0)    return { label: 'Sem dados',      color: 'info' };
    if (acwr < 0.8)    return { label: 'Destreino',      color: 'info' };
    if (acwr <= 1.3)   return { label: 'Zona ótima',     color: 'success' };
    if (acwr <= 1.5)   return { label: 'Atenção',        color: 'warning' };
    return              { label: 'Risco de lesão',   color: 'danger' };
  },

};
