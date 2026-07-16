import { computeReadiness, computeLoad } from './readiness.js';

/**
 * Módulo de Triagem - Parte 1/6
 * Avalia os sinais de urgência de cada aluno ativo e consolida
 * num único array ordenado.
 */
export function buildTriage({ students, sessions, biofeedback, financial, workouts, macrocycles }) {
  const activeStudents = (students || []).filter(s => s.status === 'active');
  const triage = [];

  const now = new Date();
  const todayStr = (() => { 
    const d = new Date(), o = d.getTimezoneOffset(), l = new Date(d.getTime() - o * 60000); 
    return l.toISOString().split('T')[0]; 
  })();

  for (const st of activeStudents) {
    const studentBf = (biofeedback || []).filter(b => b.studentId === st.id);
    const studentSessions = (sessions || []).filter(s => s.studentId === st.id && s.status === 'completed');
    const studentFinancial = (financial || []).filter(f => f.studentId === st.id);

    // 1. Prontidão
    const readiness = computeReadiness(st.id, studentBf, st.name);
    if (readiness && readiness.level !== 'ok' && readiness.level !== 'maturing') {
      triage.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'readiness',
        level: readiness.level, // 'danger' ou 'warning'
        reason: `Métricas de prontidão abaixo do padrão. Vale confirmar antes de manter a carga.`,
        icon: 'heart-rate-monitor',
        _priority: 1
      });
    }

    // 2. Carga
    const load = computeLoad(st.id, studentSessions, st.name);
    if (load && load.level !== 'ok' && load.level !== 'maturing') {
      triage.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'load',
        level: load.level,
        reason: `Carga da semana acima do padrão. Vale acompanhar.`,
        icon: 'activity',
        _priority: 2
      });
    }

    // 3. Pagamento em atraso
    const overdue = studentFinancial.filter(f => f.status === 'pending' && f.dueDate && f.dueDate < todayStr);
    if (overdue.length > 0) {
      triage.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'payment',
        level: 'warning',
        reason: 'Mensalidade em atraso. Envie um lembrete amigável.',
        icon: 'coin',
        _priority: 3
      });
    }

    // 4. Inatividade (dias desde o último treino > 7)
    if (studentSessions.length > 0) {
      const lastSession = [...studentSessions].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const lastDate = new Date(lastSession.date + (lastSession.date.includes('T') ? '' : 'T12:00'));
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
      
      if (daysSince > 7) {
        triage.push({
          studentId: st.id,
          studentName: st.name,
          signal: 'inactivity',
          level: 'danger',
          reason: `Sem treinar há ${daysSince} dias. Mande uma mensagem para resgatar o engajamento.`,
          icon: 'clock-x',
          _priority: 4
        });
      }
    }

    // 5. Checkout Pendente
    // Pega as sessões completadas nos últimos X dias (ex: últimos 7) para não entulhar com passado muito remoto
    const recentSessions = studentSessions.filter(s => {
      const d = new Date(s.date + 'T12:00');
      return Math.floor((now.getTime() - d.getTime()) / 86400000) <= 7;
    });
    const missingCheckout = recentSessions.filter(s => !s.postBiofeedback || !s.postBiofeedback.submittedByStudent);
    if (missingCheckout.length > 0) {
      triage.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'checkout',
        level: 'info',
        reason: `${missingCheckout.length} treino(s) recente(s) sem feedback. Oriente o aluno a preencher.`,
        icon: 'message-circle-question',
        _priority: 5
      });
    }
  }

  // Ordenação
  // 1º Por nível de urgência (danger > warning > info)
  // 2º Pela prioridade do sinal (readiness > load > payment > inactivity > checkout)
  const levelScore = { 'danger': 1, 'warning': 2, 'info': 3 };
  
  triage.sort((a, b) => {
    const scoreA = levelScore[a.level] || 99;
    const scoreB = levelScore[b.level] || 99;
    
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return a._priority - b._priority;
  });

  // Limpa o campo auxiliar _priority antes de retornar para ficar clean
  return triage.map(t => {
    const { _priority, ...rest } = t;
    return rest;
  });
}
