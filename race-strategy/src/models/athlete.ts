export interface ZonesCardiaques {
  z1: [number, number];
  z2: [number, number];
  z3: [number, number];
  z4: [number, number];
  z5: [number, number];
}

export interface CourseHistorique {
  id: string;
  distance: number; // km
  denivelePositif: number; // m
  deniveleNegatif: number; // m
  temps: number; // secondes
  date?: number; // timestamp (optionnel, utilisé pour pondération temporelle)
  nom?: string; // optionnel
  fcMoyenne?: number; // bpm, optionnel (pour calibrer % VMA réel)
}

export interface ProfilAthlete {
  age: number;
  sexe: 'H' | 'F';
  taille: number; // cm
  poids: number; // kg
  fcMax?: number; // bpm
  fcRepos?: number; // bpm
  zones?: ZonesCardiaques;
  cadence: number; // pas/min
  temps1500m: number; // secondes
  historique: CourseHistorique[];
  // Surcharges optionnelles des données déduites
  vmaOverride?: number; // km/h
  allureSeuilOverride?: number; // sec/km
  allureMarathonOverride?: number; // sec/km
  allureEnduranceOverride?: number; // sec/km
}

export interface DeductionsProfil {
  vma: number; // km/h
  vo2max: number;
  allureSeuil: number; // sec/km
  allureMarathon: number; // sec/km
  allureEndurance: number; // sec/km
  fcMax: number;
  zonesCardiaques: ZonesCardiaques;
  coefficientMontee: number;
  indiceEndurance: number;
  facteurFatigue: number;
  fouleeEstimee: number; // m
}
