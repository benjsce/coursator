export type TypeScenario = 'conservateur' | 'regulier' | 'competition';

export interface Split {
  km: number;
  denivelePositif: number; // m
  deniveleNegatif: number; // m
  allurePlate: number; // sec/km
  allureAjustee: number; // sec/km
  tempsPassage: number; // sec cumulé
  nutrition?: string;
}

export interface PlanNutrition {
  caloriesTotales: number;
  gels: { km: number; temps: number }[];
  hydratationMlParHeure: number;
}

export interface Scenario {
  type: TypeScenario;
  label: string;
  description: string;
  splits: Split[];
  nutrition: PlanNutrition;
  tempsFinal: number; // sec
}

export interface ValidationObjectif {
  valide: boolean;
  fourchetteBasse: number; // sec
  fourchetteHaute: number; // sec
  message: string;
}
