export interface PointGPX {
  lat: number;
  lon: number;
  ele: number;
  time?: Date;
  distanceCumulee: number; // m
}

export interface Segment {
  km: number;
  distance: number; // m
  denivelePositif: number; // m
  deniveleNegatif: number; // m
  deniveleNet: number; // m
  pente: number; // %
}

export interface Parcours {
  nom: string;
  distanceTotale: number; // m
  denivelePositifTotal: number; // m
  deniveleNegatifTotal: number; // m
  points: PointGPX[];
  segments: Segment[];
}
