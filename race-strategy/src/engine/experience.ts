import type { ProfilAthlete } from '../models/athlete';
import { analyserProfilCoureur } from './analytics';

// =============================================================================
// Coefficients d'expérience — façade sur le module analytics
// =============================================================================
// Ces coefficients sont maintenant tous dérivés du profil complet du coureur,
// avec pondération temporelle, régression sur multiples données, et niveaux
// de confiance.
//
// Voir `analytics.ts` pour les détails statistiques.
// =============================================================================

export interface CoefficientsExperience {
  coefficientMontee: number;
  exposantRiegel: number;
  facteurFatigue: number;
}

/**
 * Façade rétrocompatible. Préférer `analyserProfilCoureur(profil)` pour avoir
 * accès aux niveaux de confiance et estimations détaillées.
 */
export function analyserHistorique(
  historique: ProfilAthlete['historique'],
  _vma?: number
): CoefficientsExperience {
  // On reconstruit un profil minimal pour l'analyse
  const profilMinimal: ProfilAthlete = {
    age: 30,
    sexe: 'H',
    taille: 175,
    poids: 70,
    cadence: 170,
    temps1500m: 0,
    historique,
  };
  const profilCoureur = analyserProfilCoureur(profilMinimal);
  return {
    coefficientMontee: profilCoureur.coefMontee,
    exposantRiegel: profilCoureur.k,
    facteurFatigue: profilCoureur.facteurFatigue,
  };
}
