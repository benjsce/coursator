export type TypeObjectif = 'temps' | 'effort' | 'pourcentageVMA';

export type NiveauEffort = 'confort' | 'performance' | 'record';

export interface Objectif {
  type: TypeObjectif;
  tempsCible?: number; // secondes
  niveauEffort?: NiveauEffort;
  pourcentageVMA?: number; // 0-100
}
