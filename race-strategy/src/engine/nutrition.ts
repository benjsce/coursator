import type { Split, PlanNutrition } from '../models/strategy';

// =============================================================================
// Plan nutrition & hydratation
// =============================================================================
// CALORIES :
// HYPOTHÈSE : la course consomme ~1.036 kcal/kg/km (Margaria 1938, Cavagna,
// di Prampero 1986), quasi-indépendamment de la vitesse sur terrain plat.
// C'est plus précis que la formule MET × poids × heures, qui donne 10 MET
// ≈ 10 km/h alors que la dépense énergétique varie peu avec la vitesse en
// course (l'efficacité métabolique est constante ~25%).
//
// Référence : di Prampero P.E. (1986). The energy cost of human locomotion.
// Int J Sports Med, 7(2), 55-72.
//
// HYDRATATION :
// HYPOTHÈSE : ACSM recommande 400-800 ml/h selon climat & sudation.
// En climat tempéré : 6-8 ml/kg/h. En climat chaud : 10-12 ml/kg/h.
// Défaut : 7 ml/kg/h (tempéré, modulable par le paramètre `climat`).
//
// Référence : ACSM Position Stand: Exercise and Fluid Replacement (2007).
//
// GLUCIDES (gels) :
// HYPOTHÈSE : pour effort > 1h, 30-60 g glucides/h ; pour effort > 2.5h,
// jusqu'à 90 g/h en mélange glucose+fructose. 1 gel ≈ 25 g glucides ≈ 100 kcal.
// On positionne un gel toutes les 30-40 min après la première heure.
//
// Référence : Jeukendrup A. (2014). A step towards personalized sports
// nutrition. Sports Med, 44, S25-S33.
// =============================================================================

const KCAL_PAR_KG_PAR_KM = 1.036;
const KCAL_PAR_GEL = 100;
const ML_HYDRA_PAR_KG_TEMPERE = 7;
const INTERVALLE_GEL_MINUTES = 35; // démarrage à T0+35 min
const SEUIL_NUTRITION_MIN = 60; // pas de gels pour course < 60 min

export type Climat = 'tempere' | 'chaud' | 'froid';

const FACTEUR_CLIMAT: Record<Climat, number> = {
  froid: 0.85,
  tempere: 1.0,
  chaud: 1.5,
};

export function genererPlanNutrition(
  poids: number,
  dureeTotaleSecondes: number,
  splits: Split[],
  distanceKm?: number,
  climat: Climat = 'tempere'
): PlanNutrition {
  const dureeHeures = dureeTotaleSecondes / 3600;
  const dureeMinutes = dureeTotaleSecondes / 60;

  // Calcul calories : préférence à la formule "kcal/kg/km" si on a la distance
  let caloriesTotales: number;
  if (distanceKm && distanceKm > 0) {
    caloriesTotales = Math.round(KCAL_PAR_KG_PAR_KM * poids * distanceKm);
  } else {
    // Fallback : MET × poids × heures (moins précis, utilisé si pas de distance)
    caloriesTotales = Math.round(10 * poids * dureeHeures);
  }

  const hydratationMlParHeure = Math.round(
    poids * ML_HYDRA_PAR_KG_TEMPERE * FACTEUR_CLIMAT[climat]
  );

  const gels: { km: number; temps: number }[] = [];

  // Pas de gel si la course est trop courte
  if (dureeMinutes >= SEUIL_NUTRITION_MIN) {
    const intervalleSecondes = INTERVALLE_GEL_MINUTES * 60;
    let prochainGel = intervalleSecondes;

    for (const split of splits) {
      if (split.tempsPassage >= prochainGel) {
        gels.push({ km: split.km, temps: split.tempsPassage });
        prochainGel += intervalleSecondes;
      }
    }

    // Cap réaliste : on ne propose pas plus de gels que ce que l'organisme
    // peut absorber. À 30-90 g/h × heures restantes / 25 g par gel.
    const gelsMaxAbsorbables = Math.floor((dureeHeures - 0.5) * 90 / 25);
    if (gels.length > gelsMaxAbsorbables) {
      gels.splice(gelsMaxAbsorbables);
    }
  }

  return {
    caloriesTotales,
    gels,
    hydratationMlParHeure,
  };
}
