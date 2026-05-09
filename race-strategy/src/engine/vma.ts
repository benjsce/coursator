export function calculerVMA(temps1500mSecondes: number): number {
  return (1500 / temps1500mSecondes) * 3.6;
}

export function calculerVO2max(vma: number): number {
  return vma * 3.5;
}

// Retourne l'allure en sec/km depuis un % de VMA
export function allureDepuisVMA(vma: number, pourcentage: number): number {
  const vitesse = vma * (pourcentage / 100);
  return 3600 / vitesse;
}

export function allureSeuil(vma: number): number {
  return allureDepuisVMA(vma, 85);
}

export function allureMarathon(vma: number): number {
  return allureDepuisVMA(vma, 80);
}

export function allureEndurance(vma: number): number {
  return allureDepuisVMA(vma, 70);
}

export function fcMaxTanaka(age: number): number {
  return Math.round(207 - 0.7 * age);
}
