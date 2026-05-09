import type { Split, PlanNutrition } from '../models/strategy';

const MET_COURSE = 10;
const CALORIES_PAR_GEL = 100;
const INTERVALLE_GEL_MINUTES = 35;

export function genererPlanNutrition(
  poids: number,
  dureeTotaleSecondes: number,
  splits: Split[]
): PlanNutrition {
  const dureeHeures = dureeTotaleSecondes / 3600;
  const caloriesTotales = Math.round(MET_COURSE * poids * dureeHeures);
  const hydratationMlParHeure = Math.round(poids * 10);

  const gels: { km: number; temps: number }[] = [];
  const intervalleSecondes = INTERVALLE_GEL_MINUTES * 60;
  let prochainGel = intervalleSecondes;

  for (const split of splits) {
    if (split.tempsPassage >= prochainGel) {
      gels.push({ km: split.km, temps: split.tempsPassage });
      prochainGel += intervalleSecondes;
    }
  }

  const gelsPossibles = Math.floor(caloriesTotales * 0.3 / CALORIES_PAR_GEL);
  const gelsFinaux = gels.slice(0, gelsPossibles);

  return {
    caloriesTotales,
    gels: gelsFinaux,
    hydratationMlParHeure,
  };
}
