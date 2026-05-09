import type { Objectif } from '../models/objective';
import { allureDepuisVMA } from './vma';

const EFFORT_VMA_MAP = {
  confort: 70,
  performance: 80,
  record: 90,
} as const;

export function calculerAllurePlate(
  objectif: Objectif,
  distanceTotaleM: number,
  vma: number
): number {
  const distanceKm = distanceTotaleM / 1000;

  switch (objectif.type) {
    case 'temps':
      return objectif.tempsCible! / distanceKm;
    case 'effort':
      return allureDepuisVMA(vma, EFFORT_VMA_MAP[objectif.niveauEffort!]);
    case 'pourcentageVMA':
      return allureDepuisVMA(vma, objectif.pourcentageVMA!);
  }
}

export function calculerTempsCible(
  objectif: Objectif,
  distanceTotaleM: number,
  vma: number
): number {
  const allure = calculerAllurePlate(objectif, distanceTotaleM, vma);
  return allure * (distanceTotaleM / 1000);
}
