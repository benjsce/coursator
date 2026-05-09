export interface ComparaisonKm {
  km: number;
  allurePrevue: number; // sec/km
  allureRealisee: number; // sec/km
  ecart: number; // sec (+ = plus lent)
  tempsPassagePrevu: number; // sec cumulé
  tempsPassageReel: number; // sec cumulé
  ecartCumule: number; // sec
}

export interface IndicateursGlobaux {
  tempsPrevuTotal: number;
  tempsReelTotal: number;
  ecartTotal: number;
  regularite: number; // écart-type des écarts
  splitReel: 'negative' | 'positive' | 'even';
  kmPlusRapide: number;
  kmPlusLent: number;
}

export interface AnalysePostCourse {
  comparaisons: ComparaisonKm[];
  indicateurs: IndicateursGlobaux;
  diagnostics: string[];
}
