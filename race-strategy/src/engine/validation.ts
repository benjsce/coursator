import type { CourseHistorique } from '../models/athlete';
import type { ValidationObjectif } from '../models/strategy';
import { allureDepuisVMA, predireTempsRiegel } from './vma';

// =============================================================================
// Validation de l'objectif
// =============================================================================
// Trois critères :
// 1. Cohérence avec la VMA : l'allure cible doit être physiologiquement
//    soutenable (>= 70% VMA, <= 95% VMA selon distance).
// 2. Cohérence avec l'historique via Riegel : objectif réaliste si écart
//    avec prédiction Riegel < 5%.
// 3. Estimation d'une fourchette d'objectifs réalistes.
// =============================================================================

export function validerObjectif(
  tempsCible: number,
  distanceKm: number,
  vma: number,
  historique: CourseHistorique[],
  exposantRiegel: number = 1.06
): ValidationObjectif {
  const allureCible = tempsCible / distanceKm;
  // Allure max physiologiquement soutenable selon la distance
  const pctVMASoutenable =
    distanceKm <= 5 ? 92 :
    distanceKm <= 10 ? 88 :
    distanceKm <= 21.1 ? 85 :
    distanceKm <= 42.2 ? 80 :
    75;
  const allureMaxSoutenable = allureDepuisVMA(vma, pctVMASoutenable);
  const allureConfort = allureDepuisVMA(vma, Math.max(60, pctVMASoutenable - 15));

  const fourchetteBasse = Math.round(allureMaxSoutenable * distanceKm);
  const fourchetteHaute = Math.round(allureConfort * distanceKm);

  if (allureCible < allureMaxSoutenable) {
    return {
      valide: false,
      fourchetteBasse,
      fourchetteHaute,
      message: `Objectif trop ambitieux par rapport à votre VMA (${vma.toFixed(1)} km/h). Fourchette réaliste : ${formaterTemps(fourchetteBasse)} - ${formaterTemps(fourchetteHaute)}.`,
    };
  }

  // Validation par Riegel sur courses comparables
  if (historique.length > 0) {
    const meilleureRef = historique
      .filter((c) => c.denivelePositif < 200) // exclure trail
      .sort((a, b) => a.temps / a.distance - b.temps / b.distance)[0];

    if (meilleureRef) {
      const tempsPredit = predireTempsRiegel(
        meilleureRef.temps,
        meilleureRef.distance,
        distanceKm,
        exposantRiegel
      );
      const ecart = (tempsPredit - tempsCible) / tempsPredit;
      // Si l'objectif est >10% plus rapide que la prédiction, c'est ambitieux
      if (ecart > 0.10) {
        return {
          valide: false,
          fourchetteBasse: Math.round(tempsPredit * 0.95),
          fourchetteHaute: Math.round(tempsPredit * 1.05),
          message: `Objectif ambitieux : ${Math.round(ecart * 100)}% plus rapide que la prédiction Riegel (k=${exposantRiegel.toFixed(2)}) basée sur votre meilleure performance (${meilleureRef.distance}km en ${formaterTemps(meilleureRef.temps)}). Visez plutôt ${formaterTemps(Math.round(tempsPredit * 0.97))} - ${formaterTemps(Math.round(tempsPredit * 1.05))}.`,
        };
      }
      // Si l'objectif est >15% plus lent que prédiction, peut-être pas optimal
      if (ecart < -0.15) {
        return {
          valide: true,
          fourchetteBasse: Math.round(tempsPredit * 0.95),
          fourchetteHaute: Math.round(tempsPredit * 1.05),
          message: `Objectif conservateur : ${Math.round(-ecart * 100)}% plus lent que la prédiction Riegel. Vous pourriez viser ${formaterTemps(Math.round(tempsPredit))}.`,
        };
      }
    }
  }

  return {
    valide: true,
    fourchetteBasse,
    fourchetteHaute,
    message: 'Objectif cohérent avec votre profil.',
  };
}

function formaterTemps(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = Math.round(secondes % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}'${s.toString().padStart(2, '0')}"`;
}
