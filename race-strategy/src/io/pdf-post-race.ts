import jsPDF from 'jspdf';
import type { AnalysePostCourse } from '../models/analysis';
import { formaterAllure, formaterTempsPassage, formaterDureeCompacte } from '../engine/format';

export function genererPDFPostCourse(analyse: AnalysePostCourse): Blob {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text('Analyse post-course', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  let y = 30;

  doc.setFont('helvetica', 'bold');
  doc.text('Indicateurs', 15, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(`Temps prévu : ${formaterTempsPassage(analyse.indicateurs.tempsPrevuTotal)}`, 15, y);
  y += 5;
  doc.text(`Temps réalisé : ${formaterTempsPassage(analyse.indicateurs.tempsReelTotal)}`, 15, y);
  y += 5;
  doc.text(`Écart : ${formaterDureeCompacte(analyse.indicateurs.ecartTotal)}`, 15, y);
  y += 5;
  doc.text(`Régularité (σ) : ${analyse.indicateurs.regularite} sec/km`, 15, y);
  y += 5;
  const splitLabels = { negative: 'Negative split', positive: 'Positive split', even: 'Even split' };
  doc.text(`Split : ${splitLabels[analyse.indicateurs.splitReel]}`, 15, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Diagnostic', 15, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  for (const diag of analyse.diagnostics) {
    const lines = doc.splitTextToSize(`• ${diag}`, pageWidth - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5;
  }
  y += 5;

  const headers = ['km', 'Prévu', 'Réalisé', 'Écart', 'Passage prévu', 'Passage réel', 'Écart cumulé'];
  const colWidths = [12, 22, 22, 20, 28, 28, 25];
  const startX = 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += colWidths[i];
  });
  doc.setFont('helvetica', 'normal');
  y += 6;

  for (const comp of analyse.comparaisons) {
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
    x = startX;
    const row = [
      `${comp.km}`,
      formaterAllure(comp.allurePrevue),
      formaterAllure(comp.allureRealisee),
      formaterDureeCompacte(comp.ecart),
      formaterTempsPassage(comp.tempsPassagePrevu),
      formaterTempsPassage(comp.tempsPassageReel),
      formaterDureeCompacte(comp.ecartCumule),
    ];
    row.forEach((cell, i) => {
      doc.text(cell, x, y);
      x += colWidths[i];
    });
    y += 5;
  }

  return doc.output('blob');
}
