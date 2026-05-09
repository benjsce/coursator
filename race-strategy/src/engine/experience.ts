import type { CourseHistorique } from '../models/athlete';

// Coefficient montée : sec ajoutées par mètre de D+ par km
// 0.4 = très bon grimpeur, 0.6 = moyen, 1.0+ = faible en montée
const COEFF_MONTEE_DEFAUT = 0.6;
// Ratio allure longue / allure courte. 1.05 = excellent endurant, 1.15 = faible
const INDICE_ENDURANCE_DEFAUT = 1.08;
// Sec/km perdues dans le dernier tiers d'une course longue
const FACTEUR_FATIGUE_DEFAUT = 8;

export interface CoefficientsExperience {
  coefficientMontee: number;
  indiceEndurance: number;
  facteurFatigue: number;
}

function pourcentageVMAEstime(distance: number): number {
  if (distance <= 5) return 95;
  if (distance <= 10) return 90;
  if (distance <= 21.1) return 85;
  if (distance <= 42.2) return 80;
  return 75;
}

export function analyserHistorique(
  historique: CourseHistorique[],
  vma: number
): CoefficientsExperience {
  if (historique.length === 0) {
    return {
      coefficientMontee: COEFF_MONTEE_DEFAUT,
      indiceEndurance: INDICE_ENDURANCE_DEFAUT,
      facteurFatigue: FACTEUR_FATIGUE_DEFAUT,
    };
  }

  // Coefficient de montée : compare temps réel vs temps théorique à plat
  let coeffMontee = COEFF_MONTEE_DEFAUT;
  const coursesAvecDplus = historique.filter((c) => c.denivelePositif > 50);
  if (coursesAvecDplus.length > 0) {
    const coeffs = coursesAvecDplus.map((c) => {
      const pctVMA = pourcentageVMAEstime(c.distance);
      const vitessePlat = vma * (pctVMA / 100);
      const tempsPlat = (c.distance / vitessePlat) * 3600;
      const tempsSupplementaire = c.temps - tempsPlat;
      if (tempsSupplementaire <= 0 || c.denivelePositif === 0) return COEFF_MONTEE_DEFAUT;
      // sec supplémentaires / mètres de D+ = coeff montée
      return tempsSupplementaire / c.denivelePositif;
    });
    const somme = coeffs.reduce((a, b) => a + b, 0);
    coeffMontee = Math.max(0.3, Math.min(1.5, somme / coeffs.length));
  }

  // Indice d'endurance : ratio allure longue distance / allure courte distance
  let indiceEnd = INDICE_ENDURANCE_DEFAUT;
  const coursesCourtes = historique.filter((c) => c.distance >= 5 && c.distance <= 15 && c.denivelePositif < 100);
  const coursesLongues = historique.filter((c) => c.distance >= 20 && c.denivelePositif < 200);
  if (coursesCourtes.length > 0 && coursesLongues.length > 0) {
    const meilleureCourte = coursesCourtes.reduce((best, c) => {
      const allure = c.temps / c.distance;
      return allure < best.temps / best.distance ? c : best;
    });
    const meilleureLongue = coursesLongues.reduce((best, c) => {
      const allure = c.temps / c.distance;
      return allure < best.temps / best.distance ? c : best;
    });
    indiceEnd = (meilleureLongue.temps / meilleureLongue.distance) / (meilleureCourte.temps / meilleureCourte.distance);
  }

  // Facteur de fatigue : déduit de l'indice d'endurance
  // Un coureur avec un bon indice d'endurance fatigue moins
  // indiceEnd 1.05 → fatigue ~4 sec/km, indiceEnd 1.15 → fatigue ~15 sec/km
  const fatigue = Math.max(2, Math.min(20, (indiceEnd - 1) * 120));

  return {
    coefficientMontee: Math.round(coeffMontee * 100) / 100,
    indiceEndurance: Math.round(indiceEnd * 100) / 100,
    facteurFatigue: Math.round(fatigue),
  };
}
