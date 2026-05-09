import type { Segment } from '../models/gpx';

// Chaque mètre de D+ ajoute ~coefficientMontee secondes par km
// Chaque mètre de D- retire ~0.3 secondes par km (descente modérée)
// Au-delà de -15% de pente, la descente ralentit (technique)
export function ajusterAllure(
  allurePlateSecKm: number,
  segment: Segment,
  coefficientMontee: number
): number {
  const distanceKm = segment.distance / 1000;
  if (distanceKm === 0) return allurePlateSecKm;

  const pentePercent = (segment.deniveleNet / segment.distance) * 100;

  let ajustementParKm: number;

  if (pentePercent >= 0) {
    // Montée : chaque mètre de D+ ajoute coefficientMontee sec
    ajustementParKm = (segment.denivelePositif / distanceKm) * coefficientMontee;
  } else if (pentePercent > -15) {
    // Descente modérée : on gagne du temps
    ajustementParKm = -(segment.deniveleNegatif / distanceKm) * 0.3;
  } else {
    // Descente raide (> 15%) : on perd du temps (freinage, technique)
    ajustementParKm = (segment.deniveleNegatif / distanceKm) * 0.15;
  }

  // Pour les segments mixtes (montée + descente dans le même km)
  if (segment.denivelePositif > 0 && segment.deniveleNegatif > 0) {
    const gainMontee = (segment.denivelePositif / distanceKm) * coefficientMontee;
    const gainDescente = (segment.deniveleNegatif / distanceKm) * 0.3;
    ajustementParKm = gainMontee - gainDescente;
  }

  const allureAjustee = allurePlateSecKm + ajustementParKm;
  return Math.max(allurePlateSecKm * 0.65, allureAjustee);
}
