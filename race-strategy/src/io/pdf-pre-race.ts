import jsPDF from 'jspdf';
import type { Scenario } from '../models/strategy';
import type { Parcours } from '../models/gpx';
import { formaterAllure, formaterTempsPassage } from '../engine/format';

export function genererPDFPreCourse(scenario: Scenario, parcours: Parcours): Blob {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text('Plan de course', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Parcours : ${parcours.nom}`, 15, 25);
  doc.text(`Distance : ${(parcours.distanceTotale / 1000).toFixed(1)} km`, 15, 31);
  doc.text(`D+ : ${parcours.denivelePositifTotal}m / D- : ${parcours.deniveleNegatifTotal}m`, 15, 37);
  doc.text(`Stratégie : ${scenario.label}`, 15, 43);
  doc.text(`Temps estimé : ${formaterTempsPassage(scenario.tempsFinal)}`, 15, 49);

  const headers = ['km', 'D+/D-', 'Allure plate', 'Allure ajustée', 'Passage', 'Nutrition'];
  const colWidths = [15, 25, 30, 30, 30, 25];
  const startX = 15;
  let y = 60;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += colWidths[i];
  });

  doc.setFont('helvetica', 'normal');
  y += 6;

  for (const split of scenario.splits) {
    if (y > 280) {
      doc.addPage();
      y = 15;
    }

    x = startX;
    const row = [
      `${split.km}`,
      `+${split.denivelePositif}/-${split.deniveleNegatif}`,
      formaterAllure(split.allurePlate),
      formaterAllure(split.allureAjustee),
      formaterTempsPassage(split.tempsPassage),
      split.nutrition || '',
    ];

    row.forEach((cell, i) => {
      doc.text(cell, x, y);
      x += colWidths[i];
    });
    y += 5;
  }

  y += 10;
  if (y > 270) {
    doc.addPage();
    y = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Nutrition', 15, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(`Calories estimées : ${scenario.nutrition.caloriesTotales} kcal`, 15, y);
  y += 5;
  doc.text(`Hydratation : ${scenario.nutrition.hydratationMlParHeure} ml/h`, 15, y);
  y += 5;
  doc.text(`Gels : ${scenario.nutrition.gels.map((g) => `km ${g.km}`).join(', ')}`, 15, y);

  return doc.output('blob');
}
