// ========================================
// PERSONAL PRO — Calculations Utility
// ========================================

export const Calc = {
  // --- IMC ---
  imc(peso, alturaCm) {
    const alturaM = alturaCm / 100;
    return peso / (alturaM * alturaM);
  },

  imcClassificacao(imc) {
    if (imc < 18.5) return { label: 'Abaixo do peso', color: 'info' };
    if (imc < 25) return { label: 'Peso normal', color: 'success' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'warning' };
    if (imc < 35) return { label: 'Obesidade Grau I', color: 'danger' };
    if (imc < 40) return { label: 'Obesidade Grau II', color: 'danger' };
    return { label: 'Obesidade Grau III', color: 'danger' };
  },

  // --- FC Máxima (Tanaka) ---
  fcMax(idade) {
    return Math.round(208 - (0.7 * idade));
  },

  // --- Zonas de Treino (ACSM) ---
  zonasTreino(fcMax, fcRepouso) {
    const reserva = fcMax - fcRepouso;
    return [
      { zona: 1, nome: 'Recuperação', min: 50, max: 60, fcMin: Math.round(fcRepouso + reserva * 0.50), fcMax: Math.round(fcRepouso + reserva * 0.60), cor: '#94a3b8' },
      { zona: 2, nome: 'Base Aeróbia', min: 60, max: 70, fcMin: Math.round(fcRepouso + reserva * 0.60), fcMax: Math.round(fcRepouso + reserva * 0.70), cor: '#3b82f6' },
      { zona: 3, nome: 'Aeróbia', min: 70, max: 80, fcMin: Math.round(fcRepouso + reserva * 0.70), fcMax: Math.round(fcRepouso + reserva * 0.80), cor: '#10b981' },
      { zona: 4, nome: 'Limiar Anaeróbio', min: 80, max: 90, fcMin: Math.round(fcRepouso + reserva * 0.80), fcMax: Math.round(fcRepouso + reserva * 0.90), cor: '#f59e0b' },
      { zona: 5, nome: 'VO2 Max', min: 90, max: 100, fcMin: Math.round(fcRepouso + reserva * 0.90), fcMax: fcMax, cor: '#ef4444' },
    ];
  },

  // --- % de Gordura (Jackson & Pollock 3 dobras) ---
  percentualGordura3dobras(genero, idade, dobra1, dobra2, dobra3) {
    const soma = dobra1 + dobra2 + dobra3;
    let dc;
    if (genero === 'M') {
      // Homem: Peitoral, Abdominal, Coxa
      dc = 1.10938 - (0.0008267 * soma) + (0.0000016 * soma * soma) - (0.0002574 * idade);
    } else {
      // Mulher: Tríceps, Suprailíaca, Coxa
      dc = 1.0994921 - (0.0009929 * soma) + (0.0000023 * soma * soma) - (0.0001392 * idade);
    }
    return (495 / dc) - 450;
  },

  // --- % de Gordura (7 dobras) ---
  percentualGordura7dobras(genero, idade, dobras) {
    const soma = dobras.reduce((a, b) => a + b, 0);
    let dc;
    if (genero === 'M') {
      dc = 1.112 - (0.00043499 * soma) + (0.00000055 * soma * soma) - (0.00028826 * idade);
    } else {
      dc = 1.097 - (0.00046971 * soma) + (0.00000056 * soma * soma) - (0.00012828 * idade);
    }
    return (495 / dc) - 450;
  },

  // --- Massa Magra e Gorda ---
  composicaoCorporal(peso, percentualGordura) {
    const massaGorda = peso * (percentualGordura / 100);
    const massaMagra = peso - massaGorda;
    return { massaGorda: Math.round(massaGorda * 10) / 10, massaMagra: Math.round(massaMagra * 10) / 10, percentualGordura: Math.round(percentualGordura * 10) / 10 };
  },

  // --- RCQ (Relação Cintura-Quadril) ---
  rcq(cintura, quadril) {
    return cintura / quadril;
  },

  rcqClassificacao(rcq, genero) {
    if (genero === 'M') {
      if (rcq < 0.90) return { label: 'Baixo risco', color: 'success' };
      if (rcq < 1.0) return { label: 'Risco moderado', color: 'warning' };
      return { label: 'Alto risco', color: 'danger' };
    } else {
      if (rcq < 0.80) return { label: 'Baixo risco', color: 'success' };
      if (rcq < 0.85) return { label: 'Risco moderado', color: 'warning' };
      return { label: 'Alto risco', color: 'danger' };
    }
  },

  // --- VO2max estimado (Conconi) ---
  vo2maxConconi(vma) {
    return vma * 3.5;
  },

  // --- 1RM Estimado (Brzycki) ---
  rm1Estimado(carga, reps) {
    if (reps === 1) return carga;
    return Math.round(carga / (1.0278 - (0.0278 * reps)));
  },

  // --- Percentuais de 1RM ---
  percentuaisRM(rm1) {
    const pcts = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
    return pcts.map(p => ({ percentual: p, carga: Math.round(rm1 * p / 100) }));
  },

  // --- Carga de Treino (PSE x Duração) ---
  cargaTreino(pse, duracao) {
    return pse * duracao;
  },

  // --- ACWR (Acute:Chronic Workload Ratio) ---
  acwr(cargaSemanaAtual, mediaCarga4semanas) {
    if (mediaCarga4semanas === 0) return 0;
    return cargaSemanaAtual / mediaCarga4semanas;
  },

  acwrClassificacao(acwr) {
    if (acwr < 0.8) return { label: 'Subtreinamento', color: 'info' };
    if (acwr <= 1.3) return { label: 'Zona ideal', color: 'success' };
    if (acwr <= 1.5) return { label: 'Atenção', color: 'warning' };
    return { label: 'Alto risco de lesão', color: 'danger' };
  },

  // --- Idade ---
  calcularIdade(dataNascimento) {
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  },

  // --- TMB (Harris-Benedict revisado) ---
  tmb(genero, peso, alturaCm, idade) {
    if (genero === 'M') {
      return 88.362 + (13.397 * peso) + (4.799 * alturaCm) - (5.677 * idade);
    }
    return 447.593 + (9.247 * peso) + (3.098 * alturaCm) - (4.330 * idade);
  },

  // --- GET (Gasto Energético Total) ---
  get(tmb, fatorAtividade) {
    return tmb * fatorAtividade;
  },

  // --- Formatação ---
  formatNum(n, decimals = 1) {
    return Number(n).toFixed(decimals);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  },

  // --- Gasto Calórico Estimado (MET × Peso × Duração) ---
  // Referência: ACSM Guidelines, McArdle et al.
  // MET varia conforme PSE reportada pelo aluno pós-treino
  metPorPse(pse) {
    const p = parseFloat(pse) || 5;
    if (p <= 3) return 3.5;  // Leve (recuperação ativa)
    if (p <= 5) return 5.0;  // Moderada
    if (p <= 7) return 7.0;  // Vigorosa
    if (p <= 9) return 9.0;  // Alta
    return 11.0;             // Máxima (VO2max)
  },

  calcGastoCalorico(pse, durationSec, weightKg) {
    const peso = parseFloat(weightKg) || 70;
    const isEstimate = !weightKg || weightKg <= 0;
    const durationH = (durationSec || 0) / 3600;
    const met = this.metPorPse(pse);
    const kcal = Math.round(met * peso * durationH);
    return { kcal, met, weightUsed: peso, isEstimate };
  },
};
