// ========================================
// PERSONAL PRO — PDF Generator (jsPDF)
// ========================================

import { Calc } from './calculations.js';

// Colors matching our design system
const COLORS = {
  primary: [16, 185, 129],
  accent: [6, 182, 212],
  dark: [10, 14, 23],
  text: [241, 245, 249],
  muted: [148, 163, 184],
  bg: [17, 24, 39],
  white: [255, 255, 255],
  danger: [239, 68, 68],
};

export async function generateWorkoutPDF(student, workout, exercises) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  // Header gradient bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, W, 28, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Personal PRO', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ficha de Treino — ${workout.name}`, 14, 22);
  doc.text(Calc.formatDate(workout.date), W - 14, 14, { align: 'right' });

  // Student info
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Aluno: ${student.name}`, 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Código: ${student.code} | Objetivo: ${student.goal || '-'}`, 14, 44);

  if (workout.notes) {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Obs: ${workout.notes}`, 14, 50);
  }

  // Exercise table
  let y = 58;
  const cols = [14, 80, 108, 128, 150, 172];
  const headers = ['Exercício', 'Séries', 'Reps', 'Carga', 'Descanso', 'Método'];

  // Table header
  doc.setFillColor(230, 240, 235);
  doc.rect(10, y - 5, W - 20, 8, 'F');
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, cols[i], y));
  y += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  (exercises || []).forEach((ex, idx) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y - 4, W - 20, 7, 'F');
    }
    doc.setTextColor(...COLORS.dark);
    doc.text(ex.name || '-', cols[0], y, { maxWidth: 62 });
    doc.text(String(ex.sets || '-'), cols[1], y);
    doc.text(String(ex.reps || '-'), cols[2], y);
    doc.text(ex.load ? `${ex.load}kg` : '-', cols[3], y);
    doc.text(ex.rest ? `${ex.rest}s` : '-', cols[4], y);
    doc.text(ex.method || '-', cols[5], y);
    y += 7;
  });

  // Footer
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 285, W, 12, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.text('Personal PRO — Sistema Profissional de Personal Trainer', W / 2, 292, { align: 'center' });

  return doc;
}

export async function generateReportPDF(student, data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  // Cover page
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, W, 297, 'F');

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, W, 6, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('DOSSIÊ DE', W / 2, 80, { align: 'center' });
  doc.text('PERFORMANCE', W / 2, 95, { align: 'center' });

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(16);
  doc.text(student.name, W / 2, 120, { align: 'center' });

  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(11);
  doc.text(`Código: ${student.code}`, W / 2, 135, { align: 'center' });
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, W / 2, 145, { align: 'center' });

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.text('Personal PRO', W / 2, 250, { align: 'center' });

  // Page 2 - Summary
  doc.addPage();
  let y = 20;
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Período', 14, y);
  y += 12;

  const summaryItems = [
    ['Treinos realizados', `${data.workoutCount || 0}`],
    ['Avaliações', `${data.assessmentCount || 0}`],
    ['Check-ins biofeedback', `${data.biofeedbackCount || 0}`],
    ['Período', data.period || '-'],
  ];

  doc.setFontSize(10);
  summaryItems.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(val, 100, y);
    y += 8;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 290, W, 7, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(7);
    doc.text(`Personal PRO — Página ${i}/${pageCount}`, W / 2, 295, { align: 'center' });
  }

  return doc;
}

export function downloadPDF(doc, filename) {
  doc.save(filename);
}
