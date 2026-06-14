import db from './db.js';

/**
 * Filtra dados dos últimos N dias.
 */
function filterRecent(data, days, dateField = 'date') {
  const now = new Date();
  now.setHours(0,0,0,0);
  const cutoff = new Date(now.getTime() - days * 86400000);
  return data.filter(d => {
    if (!d[dateField]) return false;
    const dDate = new Date(d[dateField]);
    return dDate >= cutoff;
  });
}

/**
 * Gera os insights algorítmicos básicos cruzando dados dos últimos 7 dias.
 */
export function generateAlgorithmicInsight(student, sessions, biofeedbacks, days = 28) {
  const recentSessions = filterRecent(sessions.filter(s => s.status === 'completed'), days, 'endTime');
  const previousSessions = filterRecent(sessions.filter(s => s.status === 'completed'), days * 2, 'endTime').filter(s => !recentSessions.includes(s));
  
  const recentBio = filterRecent(biofeedbacks, days, 'date');
  const previousBio = filterRecent(biofeedbacks, days * 2, 'date').filter(b => !recentBio.includes(b));

  const volRecent = recentSessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
  const volPrev = previousSessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
  const volDiff = volPrev > 0 ? ((volRecent - volPrev) / volPrev) * 100 : 0;

  const avgTqr = recentBio.length ? recentBio.reduce((sum, b) => sum + (b.tqr || b.energy || 5), 0) / recentBio.length : 0;
  const avgSleep = recentBio.length ? recentBio.reduce((sum, b) => sum + (b.sleep || 5), 0) / recentBio.length : 0;
  const avgPain = recentBio.length ? recentBio.reduce((sum, b) => sum + (b.pain || 5), 0) / recentBio.length : 0;
  const avgMotiv = recentBio.length ? recentBio.reduce((sum, b) => sum + (b.motivation || 5), 0) / recentBio.length : 0;

  let text = `Nos últimos ${days} dias, você concluiu ${recentSessions.length} treino(s)`;
  if (volRecent > 0) {
    text += `, movimentando um total de ${volRecent.toLocaleString('pt-BR')} kg.`;
    if (volDiff > 5) text += ` Isso representa um aumento de ${volDiff.toFixed(1)}% no seu volume em relação ao período anterior! 💪`;
    else if (volDiff < -5) text += ` O volume foi ${Math.abs(volDiff).toFixed(1)}% menor que o período anterior.`;
  } else {
    text += `.`;
  }

  const bioInsights = [];
  if (avgTqr >= 7) bioInsights.push('Sua recuperação média esteve excelente');
  else if (avgTqr <= 4) bioInsights.push('Atenção: Sua recuperação média esteve baixa');

  if (avgSleep < 5) bioInsights.push('a qualidade do seu sono requer atenção');
  if (avgPain <= 4) bioInsights.push('você relatou dores articulares/musculares');
  if (avgMotiv >= 8) bioInsights.push('sua motivação esteve alta');

  if (bioInsights.length > 0) {
    text += ` Observando seus check-ins, ${bioInsights.join(', ')}.`;
  }

  if (recentSessions.length === 0 && recentBio.length === 0) {
    text = `Não há dados suficientes nos últimos ${days} dias para gerar uma evolução. Faça check-ins e treine para ver seus insights!`;
  }

  return {
    text,
    metrics: { volRecent, volDiff, avgTqr, avgSleep, avgPain, avgMotiv, sessionsCount: recentSessions.length }
  };
}

/**
 * Chama a API do Gemini para gerar uma análise profunda.
 */
export async function generateAIInsight(student, sessions, biofeedbacks, days = 28) {
  const settings = await db.get('settings', 'trainer') || {};
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    throw new Error('Chave de API do Gemini não configurada pelo treinador. Vá em Configurações > Integração de IA.');
  }

  const recentSessions = filterRecent(sessions.filter(s => s.status === 'completed'), days, 'endTime');
  const recentBio = filterRecent(biofeedbacks, days, 'date');

  // Prepara o payload de dados para a IA entender
  const promptData = {
    aluno: student.name,
    objetivo: student.goal || 'Geral',
    diasAnalisados: days,
    resumoTreinos: recentSessions.map(s => ({
      data: s.date,
      treino: s.workoutName || 'Sessão',
      volumeTotalKg: s.totalVolume,
      psePosTreino: s.postBiofeedback?.pse || 'N/A'
    })),
    resumoBemEstar: recentBio.map(b => ({
      data: b.date,
      sono: b.sleep ? Math.round(b.sleep / 2) : null,
      recuperacaoTQR: b.tqr || b.energy,
      dor: b.pain ? (b.pain > 8 ? 5 : b.pain > 6 ? 4 : b.pain > 4 ? 3 : b.pain > 2 ? 2 : 1) : null,
      motivacao: b.motivation ? Math.round(b.motivation / 2) : null
    }))
  };

  const systemPrompt = `Você é um assistente de treino objetivo e direto.
Analise os dados das últimas 4 semanas (${days} dias) do aluno e responda de forma CURTA e CLARA, como se explicasse para o próprio aluno olhando os gráficos.

Use EXATAMENTE esta estrutura, com frases curtas (1-2 linhas por seção):

📊 Bem-estar: [O que os números de sono, dor e recuperação mostram — bom, regular ou atenção?]

📈 Esforço (PSE): [O treino está na intensidade certa ou está pesado demais / leve demais?]

🏋️ Volume: [O volume está crescendo, estável ou caindo? É bom sinal ou precisa ajustar?]

🔥 Carga Total: [A carga de treino está equilibrada ou há risco de acúmulo de fadiga?]

💡 O que fazer agora: [1 ação concreta e direta para a próxima semana.]

Seja direto. Sem jargões técnicos. O aluno deve entender em 30 segundos.`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { text: JSON.stringify(promptData, null, 2) }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1200,
    }
  };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Erro ao comunicar com a API do Gemini.');
    }

    const data = await res.json();
    return data.candidates[0].content.parts.map(p => p.text).join('').trim();
  } catch (err) {
    console.error('Gemini API Error:', err);
    throw err;
  }
}
