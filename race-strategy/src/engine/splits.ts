import type { Segment } from '../models/gpx';
import type { Split, Scenario, TypeScenario } from '../models/strategy';
import type { CoefficientsExperience } from './experience';
import { ajusterAllure } from './elevation';
import { genererPlanNutrition } from './nutrition';

function appliquerStrategie(
  type: TypeScenario,
  allurePlate: number,
  km: number,
  totalKm: number,
  facteurFatigue: number
): number {
  const progression = km / totalKm;

  switch (type) {
    case 'conservateur': {
      // Départ 5-8% plus lent, accélère progressivement
      const ralentissementDebut = (1 - progression) * 0.08;
      // Fatigue plus tardive et moindre grâce au départ prudent
      const fatigue = Math.max(0, (progression - 0.8) * facteurFatigue * 0.5);
      return allurePlate * (1 + ralentissementDebut) + fatigue;
    }
    case 'regulier': {
      // Effort constant, fatigue progressive dans le dernier quart
      const fatigue = Math.max(0, (progression - 0.75) * facteurFatigue * 0.8);
      return allurePlate + fatigue;
    }
    case 'competition': {
      // Départ 3% plus rapide, fatigue plus marquée
      const acceleration = progression < 0.3 ? -0.03 : 0;
      const fatigue = Math.max(0, (progression - 0.5) * facteurFatigue * 1.2);
      return allurePlate * (1 + acceleration) + fatigue;
    }
  }
}

const LABELS: Record<TypeScenario, { label: string; description: string }> = {
  conservateur: {
    label: 'Conservateur',
    description: 'Départ prudent en Z2, accélération progressive (negative split)',
  },
  regulier: {
    label: 'Régulier',
    description: 'Effort constant, FC stable en Z3, allure variable selon terrain',
  },
  competition: {
    label: 'Compétition',
    description: 'Départ rapide Z3-Z4, gestion agressive de la fatigue',
  },
};

export function genererSplits(
  segments: Segment[],
  allurePlate: number,
  type: TypeScenario,
  coefficients: CoefficientsExperience,
  poids: number
): Scenario {
  const totalKm = segments.length;
  let tempsCumule = 0;

  const splits: Split[] = segments.map((segment) => {
    const allureStrategie = appliquerStrategie(
      type,
      allurePlate,
      segment.km,
      totalKm,
      coefficients.facteurFatigue
    );
    const allureAjustee = ajusterAllure(allureStrategie, segment, coefficients.coefficientMontee);
    const distanceKm = segment.distance / 1000;
    tempsCumule += allureAjustee * distanceKm;

    return {
      km: segment.km,
      denivelePositif: segment.denivelePositif,
      deniveleNegatif: segment.deniveleNegatif,
      allurePlate,
      allureAjustee: Math.round(allureAjustee),
      tempsPassage: Math.round(tempsCumule),
    };
  });

  const distanceKmTotal = segments.reduce((a, s) => a + s.distance, 0) / 1000;
  const nutrition = genererPlanNutrition(poids, tempsCumule, splits, distanceKmTotal);

  splits.forEach((split) => {
    const gel = nutrition.gels.find((g) => g.km === split.km);
    if (gel) {
      split.nutrition = `Gel`;
    }
  });

  return {
    type,
    label: LABELS[type].label,
    description: LABELS[type].description,
    splits,
    nutrition,
    tempsFinal: Math.round(tempsCumule),
  };
}

export function genererTousScenarios(
  segments: Segment[],
  allurePlate: number,
  coefficients: CoefficientsExperience,
  poids: number
): Scenario[] {
  const types: TypeScenario[] = ['conservateur', 'regulier', 'competition'];
  return types.map((type) => genererSplits(segments, allurePlate, type, coefficients, poids));
}
