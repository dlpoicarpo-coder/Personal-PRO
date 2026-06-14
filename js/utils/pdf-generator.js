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
  
  const W = 100; // Mobile friendly width
  const H = 180; // Mobile friendly height
  const doc = new jsPDF({
    unit: 'mm',
    format: [W, H]
  });

  // Header gradient bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, W, 22, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Personal PRO', 8, 9);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const workoutNameLines = doc.splitTextToSize(`Ficha: ${workout.name}`, 50);
  workoutNameLines.forEach((line, li) => {
    doc.text(line, 8, 14.5 + (li * 3));
  });

  if (workout._trainerName) {
    doc.setFontSize(6.5);
    const trainerText = `Prof. ${workout._trainerName}`;
    const crefText = workout._trainerCref ? `CREF ${workout._trainerCref}` : '';
    doc.text(trainerText, W - 8, 9, { align: 'right' });
    if (crefText) {
      doc.text(crefText, W - 8, 12.5, { align: 'right' });
    }
  }

  // Student info card
  const notesLines = workout.notes ? doc.splitTextToSize(`Obs: ${workout.notes}`, 78) : [];
  const notesHeight = notesLines.length * 3;
  const infoHeight = 14 + notesHeight + (workout.notes ? 2 : 0);

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(243, 244, 246);
  doc.rect(8, 26, 84, infoHeight, 'FD');

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Aluno: ${student.name}`, 11, 31);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Código: ${student.code}  |  Objetivo: ${student.goal || '-'}`, 11, 35);
  doc.text(`Data: ${Calc.formatDate(workout.date)}`, 11, 38);

  if (workout.notes) {
    doc.setTextColor(...COLORS.muted);
    notesLines.forEach((line, li) => {
      doc.text(line, 11, 42 + (li * 3));
    });
  }

  let y = 26 + infoHeight + 4;

  // Exercises
  (exercises || []).forEach((ex, idx) => {
    // Collect series details
    const seriesList = [];
    const setsCount = parseInt(ex.sets) || 3;
    for (let si = 0; si < setsCount; si++) {
      let repsVal = '';
      let loadVal = '-';
      let restVal = ex.rest ? `${ex.rest}s` : '-';
      
      if (ex.seriesProgression && ex.seriesProgression[si]) {
        const sp = ex.seriesProgression[si];
        repsVal = String(sp.reps || '');
        loadVal = sp.load !== undefined && sp.load !== null ? `${sp.load}kg` : '-';
        restVal = sp.rest !== undefined && sp.rest !== null ? `${sp.rest}s` : restVal;
      } else {
        if (ex.reps && typeof ex.reps === 'string' && ex.reps.includes('→')) {
          const parts = ex.reps.split('→');
          repsVal = parts[si] || ex.reps;
        } else {
          repsVal = ex.reps || '12';
        }
        loadVal = ex.load ? `${ex.load}kg` : '-';
      }

      // Normalize reps format
      repsVal = repsVal.replace(/→/g, ' - ');
      
      seriesList.push({
        label: `Série ${si+1}`,
        reps: repsVal,
        load: loadVal,
        rest: restVal
      });
    }

    const titleLines = doc.splitTextToSize(`${idx + 1}. ${ex.name || '-'}`, 76);
    const titleHeight = titleLines.length * 4;
    const detailsStr = `Método: ${ex.method || 'Padrão'} · Tipo: ${ex.loadType === 'time' ? 'Tempo' : ex.loadType === 'bodyweight' ? 'P. Corporal' : 'Peso'}`;
    
    const headerHeight = titleHeight + 8;
    const tableHeaderHeight = 5;
    const rowsHeight = seriesList.length * 4.5;
    const paddingBottom = 4;
    const cardHeight = headerHeight + tableHeaderHeight + rowsHeight + paddingBottom;

    if (y + cardHeight > H - 10) {
      doc.addPage();
      y = 10;
    }

    // Draw card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.rect(8, y, 84, cardHeight, 'FD');

    // Colored indicator bar on the left
    doc.setFillColor(...COLORS.primary);
    doc.rect(8, y, 1.5, cardHeight, 'F');

    // Draw Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.dark);
    titleLines.forEach((line, li) => {
      doc.text(line, 11, y + 4.5 + (li * 4));
    });

    // Draw Details line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(detailsStr, 11, y + titleHeight + 4.5);

    // Draw table headers
    let ty = y + titleHeight + 9;
    doc.setFillColor(248, 250, 252);
    doc.rect(11, ty, 78, 4, 'F');
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('SÉRIE', 13, ty + 3);
    doc.text('REPETIÇÕES', 30, ty + 3);
    doc.text('CARGA', 52, ty + 3);
    doc.text('DESCANSO', 72, ty + 3);

    // Draw Rows
    ty += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    seriesList.forEach((s, si) => {
      if (si % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(11, ty, 78, 4.5, 'F');
      }
      doc.setTextColor(...COLORS.dark);
      doc.text(s.label, 13, ty + 3.2);
      doc.text(String(s.reps), 30, ty + 3.2);
      
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(s.load, 52, ty + 3.2);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(s.rest, 72, ty + 3.2);
      
      ty += 4.5;
    });

    y += cardHeight + 4;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, H - 7, W, 7, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(6);
    doc.text(`Personal PRO — Página ${i}/${pageCount}`, W / 2, H - 3, { align: 'center' });
  }

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
