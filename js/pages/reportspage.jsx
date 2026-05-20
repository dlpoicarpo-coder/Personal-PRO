// ============================================================
// ReportsPage.jsx — Personal PRO (React, v4 — Bug corrigido)
// BUG CORRIGIDO: 'workouts is not defined' na linha 545
// A variável `workouts` não existia no escopo do handler do PDF.
// Agora é buscada corretamente dentro do handler via allWorkouts.
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Utilitários inline (substitua pelos seus imports reais) ────────────────
const Calc = {
  formatDate: (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return "—"; }
  },
  formatNum: (n) => (n != null ? Number(n).toFixed(1) : "—"),
  calcularIdade: (birthDate) => {
    if (!birthDate) return 0;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  },
  tmb: (peso, altura, age, sexo, massaMagra) => {
    if (!peso || !age) return null;
    let valor;
    let formula = "Harris-Benedict";
    if (massaMagra) {
      valor = Math.round(370 + 21.6 * massaMagra);
      formula = "Katch-McArdle";
    } else if (sexo === "F" || sexo === "Feminino") {
      valor = Math.round(447.6 + 9.2 * peso + 3.1 * (altura || 165) - 4.3 * age);
    } else {
      valor = Math.round(88.4 + 13.4 * peso + 4.8 * (altura || 175) - 5.7 * age);
    }
    return { valor, formula };
  },
  tdee: (tmb, nivel) => {
    const fatores = { sedentario: 1.2, leve: 1.375, moderado: 1.55, ativo: 1.725, muitoAtivo: 1.9 };
    const fator = fatores[nivel] || 1.55;
    return { valor: Math.round(tmb * fator), fator };
  },
  metaCalorica: (tdee, obj) => {
    const map = {
      emagrecimento: { kcal: Math.round(tdee * 0.8), label: "Déficit 20%" },
      hipertrofia:   { kcal: Math.round(tdee * 1.1), label: "Superávit 10%" },
      manutencao:    { kcal: tdee,                    label: "Manutenção" },
    };
    return map[obj] || map.manutencao;
  },
  macros: (kcal, peso, obj) => {
    const protPorKg = obj === "hipertrofia" ? 2.2 : obj === "emagrecimento" ? 2.0 : 1.8;
    const protG = Math.round(peso * protPorKg);
    const fatPct = 0.25;
    const fatKcal = Math.round(kcal * fatPct);
    const fatG = Math.round(fatKcal / 9);
    const carbKcal = kcal - protG * 4 - fatKcal;
    const carbG = Math.round(carbKcal / 4);
    return {
      protPorKg,
      proteina:    { g: protG,  kcal: protG * 4,  pct: Math.round((protG * 4 / kcal) * 100) },
      carboidrato: { g: carbG,  kcal: carbKcal,    pct: Math.round((carbKcal / kcal) * 100) },
      gordura:     { g: fatG,   kcal: fatKcal,     pct: Math.round((fatKcal / kcal) * 100) },
    };
  },
  caloriasAtividade: (peso, minutos, tipo) => {
    const met = tipo === "musculacao" ? 5.0 : 4.0;
    return Math.round((met * peso * 3.5 / 200) * minutos);
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const objMap = {
  Emagrecimento: "emagrecimento", "Perda de peso": "emagrecimento",
  Hipertrofia: "hipertrofia",    "Ganho de massa": "hipertrofia",
  Manutenção: "manutencao",      Saúde: "manutencao", Condicionamento: "manutencao",
};

const pseColor = (v) => {
  if (!v || v === "-") return "var(--text-muted, #9ca3af)";
  const n = parseFloat(v);
  return n > 8 ? "#ef4444" : n > 6 ? "#f59e0b" : "#10b981";
};
const sleepColor = (v) => {
  const n = parseFloat(v);
  return n < 5 ? "#ef4444" : n < 7 ? "#f59e0b" : "#10b981";
};

// ─── Componente de card de stat ──────────────────────────────────────────────
const StatCard = ({ label, value, sub, color }) => (
  <div style={{
    background: "var(--bg-card, #1e2530)",
    border: "1px solid var(--border, #2d3748)",
    borderRadius: 10, padding: "14px 10px", textAlign: "center",
  }}>
    <div style={{ fontSize: "0.65rem", color: "var(--text-muted, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: color || "#10b981", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: "0.68rem", color: "var(--text-muted, #9ca3af)", marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── Componente principal ────────────────────────────────────────────────────
export default function ReportsPage({ db, notify, analyzeBiofeedback, overallStatus, trainingRecommendation }) {
  const [students, setStudents]       = useState([]);
  const [selectedId, setSelectedId]   = useState("");
  const [macrocycles, setMacrocycles] = useState([]);
  const [macroId, setMacroId]         = useState("");
  const [report, setReport]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const chartsRef                     = useRef({});

  // Carregar alunos ativos
  useEffect(() => {
    if (!db) return;
    db.getAll("students").then((all) => setStudents(all.filter((s) => s.status === "Ativo")));
  }, [db]);

  // Selecionar aluno → buscar macrociclos
  const handleStudentChange = useCallback(async (sid) => {
    setSelectedId(sid);
    setMacroId("");
    setReport(null);
    if (!sid || !db) return;
    const macros = (await db.getAll("macrocycles")).filter((m) => m.studentId === sid);
    setMacrocycles(macros);
    await buildReport(sid, "", null, null);
  }, [db]);

  // Filtrar por macrociclo
  const handleMacroChange = useCallback(async (mid) => {
    setMacroId(mid);
    if (!selectedId || !db) return;
    let dateFrom = null, dateTo = null;
    if (mid) {
      const macros = await db.getAll("macrocycles");
      const macro  = macros.find((m) => m.id === mid);
      if (macro?.startDate) {
        dateFrom = new Date(macro.startDate + "T00:00:00");
        dateTo   = new Date(dateFrom.getTime() + (macro.totalWeeks || 12) * 7 * 86400000);
      }
    }
    await buildReport(selectedId, "", dateFrom, dateTo);
  }, [selectedId, db]);

  // ── Construir relatório ────────────────────────────────────────────────────
  const buildReport = useCallback(async (studentId, cycleFilter = "", dateFrom = null, dateTo = null) => {
    if (!db || !studentId) return;
    setLoading(true);
    try {
      const student     = await db.get("students", studentId);
      if (!student) return;

      // ─── CORREÇÃO DO BUG: buscar workouts aqui para usar no PDF também ───
      const allWorkouts = (await db.getAll("workouts")).filter((w) => w.studentId === studentId);
      const workouts    = cycleFilter ? allWorkouts.filter((w) => w.cycle === cycleFilter) : allWorkouts;
      // ────────────────────────────────────────────────────────────────────

      const allSessions = (await db.getAll("sessions")).filter((s) => s.studentId === studentId);
      const sessions    = allSessions.filter((s) => {
        if (dateFrom && new Date(s.date) < dateFrom) return false;
        if (dateTo   && new Date(s.date) > dateTo)   return false;
        return true;
      });
      const allBf  = (await db.getAll("biofeedback")).filter((b) => b.studentId === studentId);
      const bf     = allBf.filter((b) => {
        if (dateFrom && new Date(b.date) < dateFrom) return false;
        if (dateTo   && new Date(b.date) > dateTo)   return false;
        return true;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
      const assessments = (await db.getAll("assessments")).filter((a) => a.studentId === studentId);
      const completed   = sessions.filter((s) => s.status === "completed");
      const recent10    = bf.slice(-10);

      const avgPse   = recent10.length ? (recent10.reduce((s, b) => s + (b.pse   || 0), 0) / recent10.length).toFixed(1) : "-";
      const avgSleep = recent10.length ? (recent10.reduce((s, b) => s + (b.sleep || 0), 0) / recent10.length).toFixed(1) : "-";
      const avgMood  = recent10.length ? (recent10.reduce((s, b) => s + (b.mood  || 0), 0) / recent10.length).toFixed(1) : "-";
      const avgTqr   = recent10.length ? (recent10.reduce((s, b) => s + (b.tqr || b.energy || 0), 0) / recent10.length).toFixed(1) : "-";
      const totalLoad = bf.reduce((s, b) => s + (b.trainingLoad || 0), 0);
      const pseNum    = parseFloat(avgPse)   || 0;
      const sleepNum  = parseFloat(avgSleep) || 0;

      // Stats de volume
      const totalVolAllSessions = completed.reduce((t, s) => t + Math.round(s.totalVolume || 0), 0);
      const avgVolPerSession    = completed.length ? Math.round(totalVolAllSessions / completed.length) : 0;
      const maxVolSession       = completed.length ? Math.max(...completed.map((s) => Math.round(s.totalVolume || 0))) : 0;
      const avgDuration         = completed.length ? Math.round(completed.reduce((t, s) => t + (s.totalDuration || 0), 0) / completed.length / 60) : 0;

      // Cálculos nutricionais
      const lastComp  = assessments.filter((a) => a.type === "composicao").sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const age       = student?.birthDate ? Calc.calcularIdade(student.birthDate) : (student?.age || 0);
      const sexo      = student?.gender || "M";
      const obj       = objMap[student?.goal] || "manutencao";
      const tmbResult = lastComp?.peso && age ? Calc.tmb(lastComp.peso, lastComp.altura, age, sexo, lastComp.massaMagra) : null;
      const sessPerWeek = completed.length > 1
        ? completed.length / Math.max(1, Math.ceil((new Date(completed[0].date) - new Date(completed[completed.length - 1].date)) / (7 * 86400000)))
        : 3;
      const nivelAtiv  = sessPerWeek >= 5 ? "ativo" : sessPerWeek >= 3 ? "moderado" : sessPerWeek >= 1 ? "leve" : "sedentario";
      const tdeeResult = tmbResult ? Calc.tdee(tmbResult.valor, nivelAtiv) : null;
      const metaResult = tdeeResult ? Calc.metaCalorica(tdeeResult.valor, obj) : null;
      const macrosRes  = metaResult && lastComp?.peso ? Calc.macros(metaResult.kcal, lastComp.peso, obj) : null;

      // Progressão de carga por exercício
      const loadProgression = {};
      [...completed]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach((s) => {
          (s.setLog || []).forEach((set) => {
            const exName = (s.exercises || [])[set.exIdx]?.name;
            if (!exName || !set.load || set.load <= 0) return;
            if (!loadProgression[exName]) loadProgression[exName] = [];
            loadProgression[exName].push({ date: s.date, load: set.load, reps: set.reps || 0, vol: set.load * (set.reps || 1) });
          });
        });

      const progressionItems = Object.entries(loadProgression)
        .filter(([, sets]) => sets.length >= 2)
        .map(([name, sets]) => {
          const first   = sets[0];
          const last    = sets[sets.length - 1];
          const maxLoad = Math.max(...sets.map((s) => s.load));
          const delta   = last.load - first.load;
          const pct     = first.load > 0 ? Math.round((delta / first.load) * 100) : 0;
          const totalVol = sets.reduce((t, s) => t + s.vol, 0);
          return { name, first, last, maxLoad, delta, pct, totalVol, sessions: sets.length };
        })
        .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
        .slice(0, 8);

      // Pareceres
      let parecerAluno = "";
      if (pseNum > 8)      parecerAluno += "Atenção: Seus treinos estão muito intensos! Vamos reduzir um pouco o ritmo para seu corpo se recuperar melhor. ";
      else if (pseNum > 6) parecerAluno += "Você está treinando no nível ideal! Continue assim, seu corpo está respondendo muito bem. ";
      else                 parecerAluno += "Você ainda tem bastante fôlego! Podemos aumentar a intensidade gradualmente. ";
      if (sleepNum < 6)    parecerAluno += "Seu sono está abaixo do ideal — tente dormir entre 7 e 9 horas para otimizar seus resultados. ";
      else if (sleepNum >= 7) parecerAluno += "Ótimo sono! Isso ajuda muito na recuperação e nos ganhos. ";
      if (completed.length > 0) parecerAluno += `Parabéns! Você completou ${completed.length} sessão(ões) no período. `;
      parecerAluno += totalLoad > 2000 ? "Sua carga acumulada está alta — estamos monitorando para evitar excesso." : "Sua carga está dentro do esperado. Tudo sob controle!";

      let parecerTecnico = "";
      if (pseNum > 8)      parecerTecnico += "PSE média elevada (>8), indicando possível fadiga acumulada. Recomenda-se reduzir volume em 20-30%. ";
      else if (pseNum > 6) parecerTecnico += "PSE em nível adequado para progressão. Aluno responde bem ao estímulo. ";
      else                 parecerTecnico += "PSE baixa, margem para aumento progressivo de intensidade. ";
      if (sleepNum < 6)    parecerTecnico += "Sono comprometido — orientar higiene do sono. ";
      if (totalLoad > 2000) parecerTecnico += "Carga acumulada significativa. Monitorar sinais de overreaching.";

      // Deduplicar treinos (para PDF)
      const uniqueWorkouts = [];
      const seen = new Set();
      workouts.forEach((w) => {
        const key = `${w.cycle || "Geral"}__${w.name}`;
        if (!seen.has(key)) { seen.add(key); uniqueWorkouts.push(w); }
      });

      setReport({
        student, workouts, allWorkouts, uniqueWorkouts,
        sessions, completed, bf, recent10, assessments,
        avgPse, avgSleep, avgMood, avgTqr, totalLoad,
        pseNum, sleepNum,
        totalVolAllSessions, avgVolPerSession, maxVolSession, avgDuration,
        tmbResult, tdeeResult, metaResult, macrosRes, lastComp,
        sessPerWeek, obj,
        progressionItems,
        parecerAluno, parecerTecnico,
        cycleLabel: cycleFilter || "Todos os Ciclos",
        cycleFilter,
        dateFrom, dateTo,
      });
    } finally {
      setLoading(false);
    }
  }, [db]);

  // ── Gerar PDF (bug corrigido: workouts vem de report.uniqueWorkouts) ──────
  const handleExportPdf = useCallback(async () => {
    if (!report || !db) return;
    const { student, uniqueWorkouts, sessions, completed, bf, assessments,
            avgPse, avgSleep, avgTqr, totalLoad, pseNum, sleepNum,
            totalVolAllSessions, avgVolPerSession, avgDuration,
            progressionItems, parecerAluno, parecerTecnico, cycleLabel } = report;

    const settings    = await db.get("settings", "trainer").catch(() => ({})) || {};
    const trainerName = settings?.trainerName || "Personal PRO";

    const recent10 = bf.slice(-10);
    const avgTqrPDF = recent10.length ? (recent10.reduce((t, b) => t + (b.tqr || b.energy || 0), 0) / recent10.length).toFixed(1) : "-";
    const avgDisp   = recent10.length ? (recent10.reduce((t, b) => t + (b.mood || 0), 0) / recent10.length).toFixed(1) : "-";

    // Capturar gráficos dos canvas
    const chartIds = [
      { id: "wellnessChart",  title: "Evolução do Bem-estar",        desc: "Sono (roxo), TQR (verde), Estresse (amarelo). Valores acima de 7 indicam boa recuperação." },
      { id: "loadChart",      title: "Carga de Treino Semanal",      desc: "Carga semanal = PSE × Duração (min). Picos excessivos indicam risco de overtraining." },
      { id: "pseChart",       title: "PSE por Sessão",               desc: "Percepção Subjetiva de Esforço (1–10). Zona ideal para hipertrofia: 6–8." },
      { id: "radarChart",     title: "Radar de Wellness",            desc: "Média dos últimos 5 check-ins. Quanto maior a área, melhor o estado geral." },
      { id: "freqChart",      title: "Frequência Semanal",           desc: "Sessões realizadas por semana. Consistência ≥3x/semana é fundamental." },
      { id: "measuresChart",  title: "Evolução de Medidas Corporais", desc: "Tendência de peso e % de gordura ao longo das avaliações." },
      { id: "cycleDiffChart", title: "Comparação de Períodos",       desc: "Comparação entre a primeira e segunda metade dos dados coletados." },
    ];

    let chartsHTML = "";
    chartIds.forEach(({ id, title, desc }) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      try {
        const img = canvas.toDataURL("image/png");
        const blank = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
        if (img === blank) return;
        chartsHTML += `<div class="chart-block"><h3>${title}</h3><p class="chart-desc">${desc}</p><img src="${img}" /></div>`;
      } catch { /* canvas vazio */ }
    });

    const sessionsRows = sessions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20)
      .map((se) => {
        const durMin   = se.totalDuration ? Math.round(se.totalDuration / 60) : 0;
        const vol      = se.totalVolume   ? Math.round(se.totalVolume)        : 0;
        const pse      = se.postBiofeedback?.pse    || "-";
        const tqrPost  = se.postBiofeedback?.tqrPost || "-";
        const setLog   = se.setLog || [];
        const rirSets  = setLog.filter((s) => s.rir != null);
        const avgRir   = rirSets.length ? Math.round(rirSets.reduce((t, s) => t + (s.rir || 0), 0) / rirSets.length * 10) / 10 : "-";
        const peso     = se.studentWeight || se.preBiofeedback?.peso || null;
        const kcalEst  = peso && durMin ? Calc.caloriasAtividade(peso, durMin, "musculacao") : "-";
        const dens     = vol && durMin   ? Math.round(vol / durMin) : "-";
        const pColor   = typeof pse === "number" ? (pse >= 9 ? "#ef4444" : pse >= 7 ? "#f59e0b" : "#10b981") : "#888";
        return `<tr>
          <td>${new Date(se.date).toLocaleDateString("pt-BR")}</td>
          <td><strong>${se.workoutName || "-"}</strong></td>
          <td>${durMin ? durMin + "min" : "-"}</td>
          <td>${vol ? vol + " kg" : "-"}</td>
          <td>${se.totalSets || "-"}</td>
          <td style="color:${pColor};font-weight:600">${pse}</td>
          <td>${tqrPost}/10</td>
          <td>${avgRir}</td>
          <td>${kcalEst !== "-" ? kcalEst + "kcal" : "-"}</td>
          <td style="font-size:10px;color:#888">${dens !== "-" ? dens + " kg/min" : "-"}</td>
        </tr>`;
      }).join("");

    const progressionRows = progressionItems.map((p) => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td style="color:#888">${p.first.load}kg</td>
        <td style="font-weight:700">${p.last.load}kg</td>
        <td style="color:#f59e0b;font-weight:600">${p.maxLoad}kg</td>
        <td style="color:${p.delta >= 0 ? "#10b981" : "#ef4444"};font-weight:700">${p.delta > 0 ? "+" : ""}${p.delta}kg</td>
        <td style="color:${p.delta >= 0 ? "#10b981" : "#ef4444"};font-weight:700">${p.delta > 0 ? "↑" : "↓"} ${Math.abs(p.pct)}%</td>
        <td style="color:#666">${(p.totalVol / 1000).toFixed(1)}t</td>
      </tr>`).join("");

    const htmlContent = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>Dossiê — ${student.name}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:28px 36px;max-width:820px;margin:0 auto;font-size:13px;line-height:1.55}
        .doc-header{border-bottom:3px solid #10b981;padding-bottom:10px;margin-bottom:6px}
        .doc-header h1{font-size:22px;color:#10b981;font-weight:800}
        .doc-subtitle{font-size:11px;color:#888;margin-top:3px}
        .student-block{display:flex;align-items:center;gap:14px;background:#f0fdf8;border-radius:8px;padding:14px 16px;margin:14px 0}
        .avatar{width:52px;height:52px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;flex-shrink:0}
        .student-info h2{font-size:17px;color:#111;margin-bottom:2px}
        .student-info p{font-size:11px;color:#666}
        .cycle-tag{display:inline-block;background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;margin-top:4px}
        .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:14px 0}
        .stat{text-align:center;padding:10px 6px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa}
        .stat-val{font-size:22px;font-weight:800;color:#10b981}
        .stat-lbl{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
        h2{font-size:15px;color:#10b981;margin:20px 0 6px;border-bottom:1px solid #d1fae5;padding-bottom:5px;font-weight:700}
        .section-desc{font-size:11px;color:#888;margin:3px 0 10px}
        .parecer{background:#f0fdf8;border-left:4px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0;margin:8px 0;font-size:13px;line-height:1.7}
        .tecnico{background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;margin:8px 0;font-size:12px;line-height:1.6;color:#1e3a5f}
        table{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:12px}
        th{background:#f3f4f6;padding:7px 10px;text-align:left;font-weight:700;border-bottom:2px solid #e5e7eb;font-size:10px;text-transform:uppercase;color:#555}
        td{padding:7px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top}
        tr:nth-child(even) td{background:#fafafa}
        .chart-block{margin:16px 0;page-break-inside:avoid}
        .chart-block h3{font-size:13px;color:#10b981;margin-bottom:2px;font-weight:700}
        .chart-block .chart-desc{font-size:10px;color:#888;margin:0 0 7px;line-height:1.4}
        .chart-block img{max-width:100%;height:auto;border:1px solid #e5e7eb;border-radius:6px}
        .charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .footer{text-align:center;font-size:10px;color:#aaa;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:10px}
        @media print{body{padding:14px 18px}.stats{gap:5px}.stat-val{font-size:18px}}
      </style>
      <script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script>
    </head><body>
      <div class="doc-header">
        <h1>Personal PRO — Dossiê de Performance</h1>
        <p class="doc-subtitle">Gerado em ${new Date().toLocaleDateString("pt-BR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} por ${trainerName}</p>
      </div>
      <div class="student-block">
        <div class="avatar">${student.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}</div>
        <div class="student-info">
          <h2>${student.name}</h2>
          <p>${student.code || ""} · Objetivo: ${student.goal || "-"} · ${student.age || (student.birthDate ? new Date().getFullYear() - new Date(student.birthDate).getFullYear() : "-")} anos</p>
          <span class="cycle-tag">${cycleLabel}</span>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${uniqueWorkouts.length}</div><div class="stat-lbl">Treinos Prescritos</div></div>
        <div class="stat"><div class="stat-val">${sessions.length}</div><div class="stat-lbl">Sessões Realizadas</div></div>
        <div class="stat"><div class="stat-val" style="color:${pseNum>8?"#ef4444":pseNum>6?"#f59e0b":"#10b981"}">${avgPse}</div><div class="stat-lbl">PSE Média</div></div>
        <div class="stat"><div class="stat-val" style="color:${sleepNum>0&&sleepNum<6?"#ef4444":sleepNum>=7?"#10b981":"#f59e0b"}">${avgSleep}</div><div class="stat-lbl">Sono Médio</div></div>
        <div class="stat"><div class="stat-val" style="color:${parseFloat(avgTqrPDF||0)<5?"#ef4444":parseFloat(avgTqrPDF||0)<7?"#f59e0b":"#10b981"}">${avgTqrPDF||"-"}</div><div class="stat-lbl">TQR Médio</div></div>
        <div class="stat"><div class="stat-val">${Math.round(totalLoad)}</div><div class="stat-lbl">Carga Total</div></div>
      </div>
      <h2>Resumo para o Aluno</h2><p class="section-desc">Análise em linguagem acessível.</p>
      <div class="parecer">${parecerAluno}</div>
      <h2>Análise Técnica</h2><p class="section-desc">Avaliação baseada nos indicadores de carga e bem-estar.</p>
      <div class="tecnico">${parecerTecnico}</div>
      ${sessions.length ? `
      <h2>Sessões Realizadas</h2>
      <p class="section-desc">${sessions.length} sessão(ões) · Volume total: ${totalVolAllSessions.toLocaleString("pt-BR")} kg · Média/sessão: ${avgVolPerSession.toLocaleString("pt-BR")} kg · Duração média: ${avgDuration}min</p>
      <table><thead><tr><th>Data</th><th>Treino</th><th>Dur.</th><th>Volume</th><th>Séries</th><th>PSE</th><th>TQR pós</th><th>RIR méd.</th><th>Kcal est.</th><th>Densidade</th></tr></thead>
      <tbody>${sessionsRows}</tbody></table>` : ""}
      ${progressionItems.length ? `
      <h2>Progressão de Carga por Exercício</h2>
      <p class="section-desc">Evolução da carga ao longo das sessões. A sobrecarga progressiva é o principal motor do ganho de força.</p>
      <table><thead><tr><th>Exercício</th><th>1ª Carga</th><th>Última</th><th>Máximo</th><th>Δ Carga</th><th>Evolução</th><th>Vol. Total</th></tr></thead>
      <tbody>${progressionRows}</tbody></table>` : ""}
      ${chartsHTML ? `<h2>Gráficos de Evolução</h2><p class="section-desc">Visualização dos indicadores coletados.</p><div class="charts-grid">${chartsHTML}</div>` : ""}
      <div class="footer">Dossiê gerado por ${trainerName} — ${new Date().toLocaleDateString("pt-BR")} — Personal PRO · Sistema Profissional de Treinamento</div>
    </body></html>`;

    const blob    = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href     = blobUrl;
    a.download = `relatorio_${(student.name || "aluno").replace(/\s/g, "_")}_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.html`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    notify?.success?.("Arquivo baixado! Abra no navegador e use Ctrl+P → Salvar como PDF.");
  }, [report, db, notify]);

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const handleWhatsApp = useCallback(async () => {
    if (!report || !db) return;
    const { student, sessions, bf, avgPse, avgSleep } = report;
    if (!student?.phone) { notify?.warning?.("Aluno sem telefone cadastrado"); return; }
    const recent10 = bf.slice(-10);
    const avgTqrWA = recent10.length ? (recent10.reduce((t, b) => t + (b.tqr || b.energy || 0), 0) / recent10.length).toFixed(1) : "-";
    const totalVol = sessions.reduce((t, s) => t + (s.totalVolume || 0), 0);
    const msg = [
      `📊 *Seu Relatório de Performance — Personal PRO*`, ``,
      `👤 Aluno: *${student.name}*`, `📅 Ciclo: Geral`, ``,
      `🏋 *Treinos*`, `• Sessões realizadas: ${sessions.length}`, `• Volume total acumulado: ${Math.round(totalVol)}kg`, ``,
      `📈 *Indicadores (últimos ${recent10.length} check-ins)*`,
      `• Sono médio: ${avgSleep}/10`, `• TQR médio: ${avgTqrWA}/10`, `• PSE médio: ${avgPse}/10`, ``,
      `✅ Continue assim! Resultados consistentes vêm da consistência nos treinos e no descanso.`, ``,
      `_Relatório gerado pelo Personal PRO_`,
    ].join("\n");
    const phone = student.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }, [report, notify]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Relatórios de Performance</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted, #9ca3af)", fontSize: "0.88rem" }}>
            Dossiê compacto com gráficos de evolução e comparação entre ciclos
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            className="form-select"
            value={selectedId}
            onChange={(e) => handleStudentChange(e.target.value)}
            style={{ minWidth: 220 }}
          >
            <option value="">Selecione um aluno</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {selectedId && (
            <select
              className="form-select"
              value={macroId}
              onChange={(e) => handleMacroChange(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="">Todos os macrociclos</option>
              {macrocycles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || `Macrociclo ${m.totalWeeks || "?"}sem`}
                  {m.startDate ? ` (${Calc.formatDate(m.startDate)})` : ""}
                </option>
              ))}
            </select>
          )}

          {report && (
            <>
              <button
                className="btn btn-sm"
                onClick={handleWhatsApp}
                style={{ color: "#25d366", border: "1px solid #25d366", background: "transparent", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: "0.84rem" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: -2, marginRight: 4 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleExportPdf}
                style={{ borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: "0.84rem" }}
              >
                Gerar PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div className="spinner" />
        </div>
      ) : !report ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted, #9ca3af)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>—</div>
          <h3 style={{ margin: "0 0 6px" }}>Selecione um aluno</h3>
          <p>Escolha um aluno para ver o relatório completo</p>
        </div>
      ) : (
        <ReportBody report={report} db={db} analyzeBiofeedback={analyzeBiofeedback} overallStatus={overallStatus} trainingRecommendation={trainingRecommendation} />
      )}
    </div>
  );
}

// ─── Corpo do relatório ───────────────────────────────────────────────────────
function ReportBody({ report, db, analyzeBiofeedback, overallStatus, trainingRecommendation }) {
  const {
    student, sessions, completed, bf, recent10, assessments,
    avgPse, avgSleep, avgTqr, totalLoad,
    pseNum, sleepNum,
    totalVolAllSessions, avgVolPerSession, maxVolSession, avgDuration,
    tmbResult, tdeeResult, metaResult, macrosRes, lastComp, sessPerWeek, obj,
    progressionItems, parecerAluno, parecerTecnico, cycleLabel,
  } = report;

  const initials = student.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div id="pdfArea">
      {/* Cabeçalho do aluno */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--primary, #10b981)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 800, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{student.name}</h2>
          <div style={{ color: "var(--text-muted, #9ca3af)", fontSize: "0.83rem" }}>
            {student.code} · {student.goal || "-"} · {student.age || "-"} anos
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #9ca3af)", marginTop: 2 }}>
            Ciclo: <strong style={{ color: "var(--primary, #10b981)" }}>{cycleLabel}</strong>
          </div>
        </div>
      </div>

      {/* Stats principais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Sessões"      value={completed.length}                         sub="realizadas" />
        <StatCard label="Volume Total" value={`${(totalVolAllSessions / 1000).toFixed(1)}t`} sub={`${totalVolAllSessions.toLocaleString("pt-BR")} kg`} />
        <StatCard label="PSE Média"    value={avgPse}   color={pseColor(avgPse)}   sub={pseNum > 8 ? "Alta — atenção" : pseNum > 6 ? "Adequada" : "Leve"} />
        <StatCard label="Sono Médio"   value={avgSleep} color={sleepColor(avgSleep)} sub={sleepNum < 5 ? "Insuficiente" : sleepNum < 7 ? "Regular" : "Bom"} />
        <StatCard label="Carga Total"  value={Math.round(totalLoad)} sub="PSE × duração" />
      </div>

      {/* Sub-stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        <StatCard label="Média/Sessão"  value={`${avgVolPerSession.toLocaleString("pt-BR")} kg`} sub="volume por treino"   color="var(--accent, #06b6d4)" />
        <StatCard label="Maior Volume"  value={`${maxVolSession.toLocaleString("pt-BR")} kg`}    sub="em uma sessão"       color="#f59e0b" />
        <StatCard label="Duração Média" value={`${avgDuration} min`}                              sub="por sessão"          color="var(--primary, #10b981)" />
      </div>

      {/* Gasto energético */}
      {tmbResult && tdeeResult && metaResult && (
        <div style={{ background: "var(--bg-card, #1e2530)", border: "1px solid var(--border, #2d3748)", borderLeft: "3px solid var(--primary, #10b981)", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Gasto Energético Estimado</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #9ca3af)" }}>{tmbResult.formula} · Base: {lastComp ? Calc.formatDate(lastComp.date) : "—"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: macrosRes ? 10 : 0 }}>
            {[
              { label: "TMB", value: `${tmbResult.valor} kcal`, sub: `Basal · ${tmbResult.formula}`, color: "var(--text-secondary, #cbd5e1)" },
              { label: "TDEE", value: `${tdeeResult.valor} kcal`, sub: `×${tdeeResult.fator} · ~${Math.round(sessPerWeek * 10) / 10}×/sem`, color: "var(--primary, #10b981)" },
              { label: `Meta (${student?.goal || "Manutenção"})`, value: `${metaResult.kcal} kcal`, sub: metaResult.label, color: obj.includes("emagr") ? "#f59e0b" : obj.includes("hipert") ? "#10b981" : "var(--accent, #06b6d4)" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: "var(--bg-page, #111827)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 800, color, fontSize: "1.2rem" }}>{value}</div>
                <div style={{ fontSize: "0.67rem", color: "var(--text-muted, #9ca3af)" }}>{sub}</div>
              </div>
            ))}
          </div>
          {macrosRes && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[
                ["Proteína",    macrosRes.proteina,    "#10b981"],
                ["Carboidrato", macrosRes.carboidrato, "#f59e0b"],
                ["Gordura",     macrosRes.gordura,     "#8b5cf6"],
              ].map(([name, m, color]) => (
                <div key={name} style={{ padding: "10px 12px", background: "var(--bg-page, #111827)", borderRadius: 8, borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{name}</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color }}>{m.g}g</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted, #9ca3af)" }}>{m.kcal}kcal · {m.pct}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pareceres */}
      <Card title="Resumo para o Aluno" accent="var(--primary, #10b981)" desc="Análise em linguagem acessível.">
        <p style={{ lineHeight: 1.8, fontSize: "0.9rem" }}>{parecerAluno}</p>
      </Card>

      <Card title="Análise Técnica do Treinador" accent="var(--accent, #06b6d4)" desc="Baseada nos indicadores de carga e bem-estar.">
        <p style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>{parecerTecnico}</p>
      </Card>

      {/* Progressão de carga */}
      {progressionItems.length > 0 ? (
        <Card title="Progressão de Carga por Exercício" desc={`${progressionItems.length} exercícios com dados suficientes. Verde = progresso, vermelho = regressão.`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr>
                  {["Exercício", "1ª Carga", "Última Carga", "Máximo", "Δ Carga", "Evolução", "Vol. Total", "Séries"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: h === "Exercício" ? "left" : "center", background: "var(--bg-page, #111827)", borderBottom: "2px solid var(--border, #2d3748)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted, #9ca3af)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {progressionItems.map((p, i) => {
                  const dc = p.delta > 0 ? "#10b981" : p.delta < 0 ? "#ef4444" : "var(--text-muted, #9ca3af)";
                  const arrow = p.delta > 0 ? "↑" : p.delta < 0 ? "↓" : "=";
                  const barW = Math.min(100, Math.abs(p.pct));
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border, #2d3748)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--text-muted, #9ca3af)" }}>{p.first.load}kg</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>{p.last.load}kg</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>{p.maxLoad}kg</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: dc, fontWeight: 700 }}>{p.delta > 0 ? "+" : ""}{p.delta}kg</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", minWidth: 100 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                          <div style={{ width: 60, height: 6, background: "var(--border, #2d3748)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barW}%`, background: dc, borderRadius: 3 }} />
                          </div>
                          <span style={{ color: dc, fontWeight: 700, fontSize: "0.78rem" }}>{arrow} {Math.abs(p.pct)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontSize: "0.8rem" }}>{(p.totalVol / 1000).toFixed(1)}t</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--text-muted, #9ca3af)", fontSize: "0.8rem" }}>{p.sessions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, height: 200, position: "relative" }}>
            <canvas id="loadProgressChart" />
          </div>
        </Card>
      ) : (
        <Card title="Progressão de Carga">
          <p style={{ color: "var(--text-muted, #9ca3af)", fontSize: "0.9rem", padding: "12px 0" }}>
            Sem sessões com setLog suficiente para análise de progressão. Registre sessões via Treino ao Vivo para ver a evolução.
          </p>
        </Card>
      )}

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card title="Evolução do Bem-estar" desc="Sono (roxo), TQR/Recuperação (verde) e Estresse (amarelo tracejado). Valores acima de 7 indicam boa recuperação.">
          <div style={{ height: 280, position: "relative" }}><canvas id="wellnessChart" /></div>
        </Card>
        <Card title="Carga de Treino Semanal" desc="Carga semanal = PSE × Duração (min). Picos excessivos ou aumento >10% entre semanas indicam risco de overtraining.">
          <div style={{ height: 280, position: "relative" }}><canvas id="loadChart" /></div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card title="PSE por Sessão" desc="Percepção Subjetiva de Esforço (1–10). Zona ideal para hipertrofia: 6–8.">
          <div style={{ height: 250, position: "relative" }}><canvas id="pseChart" /></div>
        </Card>
        <Card title="Radar de Wellness" desc="Média dos últimos 5 check-ins. Quanto mais expandido, melhor o estado geral.">
          <div style={{ height: 250, position: "relative" }}><canvas id="radarChart" /></div>
        </Card>
      </div>

      {sessions.length >= 2 && (
        <Card title="Gasto Calórico Estimado por Sessão" desc="Estimativa de calorias por sessão (MET 5.0 · ACSM 2011). Útil para ajuste nutricional.">
          <div style={{ height: 220, position: "relative" }}><canvas id="kcalChart" /></div>
        </Card>
      )}

      <Card title="Comparação entre Ciclos" desc="Média de cada indicador dividida em primeira vs segunda metade dos dados. Barras maiores na segunda metade = melhora.">
        <div style={{ height: 280, position: "relative" }}><canvas id="cycleDiffChart" /></div>
      </Card>

      {assessments.length > 0 && (
        <Card title="Evolução de Medidas Corporais" desc="Acompanhamento de peso e % de gordura ao longo das avaliações.">
          <div style={{ height: 280, position: "relative" }}><canvas id="measuresChart" /></div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card title="Frequência — Últimas 8 Semanas" desc="Sessões por semana. Consistência ≥3x/semana é o fator mais importante para resultados.">
          <div style={{ height: 220, position: "relative" }}><canvas id="freqChart" /></div>
        </Card>
        <Card title="Alertas Recentes" desc="Resumo dos últimos check-ins com classificação automática.">
          {recent10.length > 0
            ? recent10.slice(-5).reverse().map((e, i) => {
                const alerts = analyzeBiofeedback?.(e) || [];
                const status = overallStatus?.(e) || { color: "primary", icon: "•", label: "OK" };
                const rec    = trainingRecommendation?.(e) || { label: "" };
                return (
                  <div key={i} style={{ borderLeft: `3px solid var(--${status.color}, #10b981)`, paddingLeft: 10, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem" }}>{status.icon} {Calc.formatDate(e.date)}</span>
                      <span style={{ background: `var(--${status.color}-bg, rgba(16,185,129,0.15))`, color: `var(--${status.color}, #10b981)`, borderRadius: 20, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>{status.label}</span>
                    </div>
                    {alerts.length > 0 && (
                      <div style={{ fontSize: "0.8rem", marginTop: 4, color: "var(--text-secondary, #cbd5e1)" }}>
                        {alerts.map((a) => `${a.icon} ${a.metric}: ${a.value}`).join(" · ")}
                      </div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #9ca3af)", marginTop: 2 }}>{rec.label}</div>
                  </div>
                );
              })
            : <p style={{ color: "var(--text-muted, #9ca3af)", textAlign: "center", padding: "20px 0" }}>Sem dados</p>
          }
        </Card>
      </div>

      {/* Inicializar gráficos após render */}
      <ChartsInitializer report={report} db={db} />
    </div>
  );
}

// ─── Card reutilizável ───────────────────────────────────────────────────────
function Card({ title, desc, accent, children }) {
  return (
    <div style={{
      background: "var(--bg-card, #1e2530)",
      border: "1px solid var(--border, #2d3748)",
      borderLeft: accent ? `3px solid ${accent}` : "1px solid var(--border, #2d3748)",
      borderRadius: 10, padding: "16px 18px", marginBottom: 16,
    }}>
      <div style={{ marginBottom: desc ? 4 : 10, fontWeight: 700, fontSize: "0.95rem" }}>{title}</div>
      {desc && <p style={{ fontSize: "0.75rem", color: "var(--text-muted, #9ca3af)", marginBottom: 10, lineHeight: 1.5 }}>{desc}</p>}
      {children}
    </div>
  );
}

// ─── Inicializador de gráficos (useEffect após mount) ───────────────────────
function ChartsInitializer({ report, db }) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.Chart === "undefined") return;
    if (!report) return;

    const Chart = window.Chart;
    const { bf, sessions, assessments, student } = report;
    const studentId = report.student.id;

    const co = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#94a3b8", font: { size: 11 } } } },
      scales: {
        y: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
        x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
      },
    };

    const charts = [];
    const make = (id, config) => {
      const el = document.getElementById(id);
      if (!el) return;
      // Destruir instância anterior se existir
      const existing = Chart.getChart(el);
      if (existing) existing.destroy();
      charts.push(new Chart(el, config));
    };

    // Wellness
    const bfWellness = bf.filter((b) => b.sleep || b.mood || b.energy || b.stress);
    if (bfWellness.length > 1) {
      make("wellnessChart", {
        type: "line",
        data: {
          labels: bfWellness.map((b) => Calc.formatDate(b.date).slice(0, 5)),
          datasets: [
            { label: "Sono",     data: bfWellness.map((b) => b.sleep || null),             borderColor: "#8b5cf6", tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true },
            { label: "TQR",      data: bfWellness.map((b) => b.tqr ?? b.energy ?? null),   borderColor: "#10b981", tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true },
            { label: "Estresse", data: bfWellness.map((b) => b.stress || null),            borderColor: "#f59e0b", tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, borderDash: [5, 3], spanGaps: true },
          ],
        },
        options: { ...co, scales: { ...co.scales, y: { ...co.scales.y, min: 0, max: 10 } } },
      });
    }

    // Carga semanal
    if (bf.length > 1) {
      const weeks = {};
      bf.forEach((b) => {
        if (!b.trainingLoad) return;
        const d = new Date(b.date); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
        const k = ws.toISOString().slice(0, 10); weeks[k] = (weeks[k] || 0) + b.trainingLoad;
      });
      const wKeys = Object.keys(weeks).sort().slice(-12);
      make("loadChart", {
        type: "bar",
        data: { labels: wKeys.map((k) => new Date(k + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })), datasets: [{ label: "Carga", data: wKeys.map((k) => weeks[k]), backgroundColor: "rgba(16,185,129,0.5)", borderColor: "#10b981", borderWidth: 1, borderRadius: 4 }] },
        options: { ...co, plugins: { legend: { display: false } } },
      });

      // PSE
      const pd = bf.filter((b) => b.pse);
      if (pd.length > 1) {
        make("pseChart", {
          type: "line",
          data: { labels: pd.map((b) => Calc.formatDate(b.date)), datasets: [{ label: "PSE", data: pd.map((b) => b.pse), borderColor: "#f43f5e", backgroundColor: "rgba(244,63,94,0.1)", fill: true, tension: 0.3 }] },
          options: { ...co, scales: { ...co.scales, y: { ...co.scales.y, min: 0, max: 10 } } },
        });
      }

      // Radar
      if (bf.length > 0) {
        const l5 = bf.slice(-5);
        const avg = (k) => l5.reduce((s, b) => s + (b[k] || 0), 0) / l5.length;
        make("radarChart", {
          type: "radar",
          data: {
            labels: ["Sono", "TQR", "Baixo Estresse", "Sem Dor"],
            datasets: [{ label: "Média (últimos 5)", data: [avg("sleep"), avg("tqr") || avg("energy"), 10 - avg("stress"), 10 - (avg("pain") || 0)], backgroundColor: "rgba(16,185,129,0.2)", borderColor: "#10b981", pointBackgroundColor: "#10b981" }],
          },
          options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, color: "#64748b", backdropColor: "transparent" }, grid: { color: "rgba(255,255,255,0.1)" }, pointLabels: { color: "#94a3b8", font: { size: 11 } } } }, plugins: { legend: { display: false } } },
        });
      }

      // Comparação de períodos
      if (bf.length >= 4) {
        const mid = Math.floor(bf.length / 2);
        const first2 = bf.slice(0, mid), second = bf.slice(mid);
        const avgOf = (arr, key) => arr.length ? arr.reduce((s, b) => s + (b[key] || 0), 0) / arr.length : 0;
        const metrics = ["sleep", "tqr", "stress", "pse"];
        const labels  = ["Sono", "TQR", "Estresse", "PSE"];
        make("cycleDiffChart", {
          type: "bar",
          data: {
            labels,
            datasets: [
              { label: `Período 1 (${first2.length} reg.)`,  data: metrics.map((k) => parseFloat(avgOf(first2, k).toFixed(1))), backgroundColor: "rgba(148,163,184,0.5)", borderColor: "#94a3b8", borderWidth: 1, borderRadius: 4 },
              { label: `Período 2 (${second.length} reg.)`,  data: metrics.map((k) => parseFloat(avgOf(second, k).toFixed(1))), backgroundColor: "rgba(16,185,129,0.6)",  borderColor: "#10b981", borderWidth: 1, borderRadius: 4 },
            ],
          },
          options: { ...co, scales: { ...co.scales, y: { ...co.scales.y, min: 0, max: 10 } } },
        });
      }
    }

    // Frequência
    const done = sessions.filter((s) => s.status === "completed");
    if (done.length > 0) {
      const wc = {};
      done.forEach((s) => {
        const d = new Date(s.date || s.createdAt); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
        const k = ws.toISOString().slice(0, 10); wc[k] = (wc[k] || 0) + 1;
      });
      const wKeys = Object.keys(wc).sort().slice(-8);
      make("freqChart", {
        type: "bar",
        data: { labels: wKeys.map((k) => new Date(k + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })), datasets: [{ label: "Sessões", data: wKeys.map((k) => wc[k]), backgroundColor: "rgba(6,182,212,0.5)", borderColor: "#06b6d4", borderWidth: 1, borderRadius: 4 }] },
        options: { ...co, plugins: { legend: { display: false } }, scales: { ...co.scales, y: { ...co.scales.y, beginAtZero: true, ticks: { ...co.scales.y.ticks, stepSize: 1 } } } },
      });
    }

    // Medidas corporais
    if (assessments.length > 1) {
      const sorted = [...assessments].sort((a, b) => new Date(a.date) - new Date(b.date));
      const ds = [];
      if (sorted.some((a) => a.weight)) ds.push({ label: "Peso (kg)", data: sorted.map((a) => a.weight || null), borderColor: "#10b981", tension: 0.3, yAxisID: "y" });
      if (sorted.some((a) => a.bodyFat)) ds.push({ label: "BF %", data: sorted.map((a) => a.bodyFat || null), borderColor: "#f59e0b", tension: 0.3, yAxisID: "y1" });
      if (ds.length) {
        make("measuresChart", {
          type: "line",
          data: { labels: sorted.map((a) => Calc.formatDate(a.date)), datasets: ds },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#94a3b8" } } }, scales: { y: { position: "left", ticks: { color: "#10b981" }, grid: { color: "rgba(255,255,255,0.05)" } }, y1: { position: "right", ticks: { color: "#f59e0b" }, grid: { display: false } }, x: { ticks: { color: "#94a3b8" }, grid: { display: false } } } },
        });
      }
    }

    // Progressão de carga — top 3
    if (done.length >= 2) {
      const logMap = {};
      [...done].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((s) => {
        (s.setLog || []).forEach((set) => {
          const name = (s.exercises || [])[set.exIdx]?.name;
          if (!name || !set.load || set.load <= 0) return;
          if (!logMap[name]) logMap[name] = [];
          logMap[name].push({ date: s.date, load: set.load });
        });
      });
      const top3 = Object.entries(logMap).filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 3);
      if (top3.length) {
        const colors = ["#10b981", "#06b6d4", "#f59e0b"];
        const allDates = [...new Set(top3.flatMap(([, v]) => v.map((p) => p.date)))].sort();
        make("loadProgressChart", {
          type: "line",
          data: {
            labels: allDates.map((d) => Calc.formatDate(d).slice(0, 5)),
            datasets: top3.map(([name, points], i) => ({
              label: name,
              data: allDates.map((d) => { const pt = points.find((p) => p.date === d); return pt ? pt.load : null; }),
              borderColor: colors[i], backgroundColor: colors[i] + "15", tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true,
            })),
          },
          options: {
            ...co,
            scales: {
              x: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { display: false } },
              y: { ticks: { color: "#64748b", font: { size: 9 }, callback: (v) => v + "kg" }, grid: { color: "rgba(148,163,184,0.07)" } },
            },
            plugins: { legend: { labels: { color: "#94a3b8", font: { size: 10 }, boxWidth: 12 } } },
          },
        });
      }
    }

    // Kcal por sessão
    if (done.length >= 2) {
      const peso = student?.weight || null;
      const kcalSess = done
        .filter((s) => s.totalDuration)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-20)
        .map((s) => ({
          label: Calc.formatDate(s.date).slice(0, 5),
          kcal:  peso ? Calc.caloriasAtividade(peso, Math.round(s.totalDuration / 60), "musculacao") : Math.round(s.totalDuration / 60 * 5),
          vol:   Math.round(s.totalVolume || 0),
        }));
      if (kcalSess.length >= 2) {
        make("kcalChart", {
          type: "bar",
          data: {
            labels: kcalSess.map((s) => s.label),
            datasets: [
              { label: "Kcal estimada", data: kcalSess.map((s) => s.kcal), backgroundColor: "rgba(245,158,11,0.7)", borderColor: "#f59e0b", borderWidth: 1, borderRadius: 4, yAxisID: "y" },
              { label: "Volume (kg)",   data: kcalSess.map((s) => s.vol),  type: "line", borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", tension: 0.3, pointRadius: 3, borderWidth: 2, fill: true, yAxisID: "y2" },
            ],
          },
          options: {
            ...co,
            scales: {
              y:  { position: "left",  ticks: { color: "#f59e0b", font: { size: 9 }, callback: (v) => v + "kcal" }, grid: { color: "rgba(148,163,184,0.07)" } },
              y2: { position: "right", ticks: { color: "#10b981", font: { size: 9 }, callback: (v) => v + "kg"   }, grid: { display: false } },
              x:  { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { display: false } },
            },
            plugins: { legend: { labels: { color: "#94a3b8", font: { size: 10 }, boxWidth: 12 } } },
          },
        });
      }
    }

    return () => { charts.forEach((c) => c.destroy()); };
  }, [report]);

  return null;
}
