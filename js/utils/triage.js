import { computeReadiness, computeLoad } from './readiness.js';

export function buildTriage({ students, sessions, biofeedback, financial, allBf }) {
  const activeStudents = (students || []).filter(s => s.status === 'Ativo');
  const signals = [];
  const now = new Date();
  
  // Normalizar hoje para comparar datas
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  activeStudents.forEach(st => {
    // 1 & 2. Prontidão e Carga
    const r = computeReadiness(st.id, allBf || biofeedback || [], st.name);
    const l = computeLoad(st.id, sessions || [], st.name);

    if (r.level === 'danger') {
      signals.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'readiness',
        level: 'danger',
        reason: 'Prontidão bem abaixo do normal — vale confirmar antes de manter a carga',
        icon: 'activity'
      });
    } else if (r.level === 'warning') {
      signals.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'readiness',
        level: 'warning',
        reason: 'Prontidão abaixo do padrão — vale acompanhar',
        icon: 'activity'
      });
    }

    if (l.level === 'danger') {
      signals.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'load',
        level: 'danger',
        reason: 'Carga da semana muito acima da base — avaliar ajuste',
        icon: 'chart-bar'
      });
    } else if (l.level === 'warning') {
      signals.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'load',
        level: 'warning',
        reason: 'Carga da semana acima do padrão — vale acompanhar',
        icon: 'chart-bar'
      });
    }

    // Sessões do aluno
    const studentSessions = (sessions || []).filter(s => s.studentId === st.id);
    const completedSessions = studentSessions.filter(s => s.status === 'completed');

    // 3. Inatividade
    if (completedSessions.length > 0) {
      completedSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastSession = completedSessions[0];
      
      const lastDateParts = lastSession.date.split('-');
      if (lastDateParts.length === 3) {
        const lastDate = new Date(lastDateParts[0], lastDateParts[1] - 1, lastDateParts[2]);
        const diffMs = todayStart - lastDate;
        const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (daysSince > 7) {
          signals.push({
            studentId: st.id,
            studentName: st.name,
            signal: 'inactivity',
            level: 'warning',
            reason: `Sem treinar há ${daysSince} dias — risco de evasão`,
            icon: 'calendar-off'
          });
        }
      }
    }

    // 4. Checkout pendente
    const pendingCheckouts = completedSessions.filter(s => 
      !s.postBiofeedback || !s.postBiofeedback.submittedByStudent
    );

    if (pendingCheckouts.length > 0) {
      signals.push({
        studentId: st.id,
        studentName: st.name,
        signal: 'checkout',
        level: 'info',
        reason: 'Treino(s) sem feedback pós-treino',
        icon: 'message-circle-question'
      });
    }

    // 5. Pagamento em atraso
    const studentBills = (financial || []).filter(f => f.studentId === st.id && f.status === 'pending');
    studentBills.forEach(bill => {
      const parts = bill.dueDate.split('-');
      if (parts.length === 3) {
        const billDate = new Date(parts[0], parts[1] - 1, parts[2]);
        if (billDate < todayStart) {
          signals.push({
            studentId: st.id,
            studentName: st.name,
            signal: 'payment',
            level: 'warning',
            reason: 'Mensalidade em atraso',
            icon: 'currency-dollar'
          });
        }
      }
    });
  });

  // Ordenação:
  // 1º: Level (danger > warning > info)
  // 2º: Signal (readiness > load > payment > inactivity > checkout)
  const levelScore = { danger: 3, warning: 2, info: 1 };
  const signalScore = { readiness: 5, load: 4, payment: 3, inactivity: 2, checkout: 1 };

  signals.sort((a, b) => {
    if (levelScore[a.level] !== levelScore[b.level]) {
      return levelScore[b.level] - levelScore[a.level];
    }
    return signalScore[b.signal] - signalScore[a.signal];
  });

  return signals;
}
