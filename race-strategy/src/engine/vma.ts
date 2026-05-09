// =============================================================================
// VMA — Vitesse Maximale Aérobie
// =============================================================================
// La VMA est définie comme la vitesse minimale soutenue qui sollicite VO2max.
// Elle est typiquement maintenable 4-7 min selon le coureur.
//
// HYPOTHÈSES :
// - Le 1500m est couru à ~104-106% de VMA (Mercier, Léger 1996).
// - Donc VMA = vitesse_1500m / 1.06 (et non pas = vitesse_1500m).
// - L'ancienne formule (1500/T)*3.6 donnait directement la vitesse 1500m,
//   ce qui SURESTIMAIT la VMA de ~6%.
//
// Référence : Léger L., Mercier D. (1984). Gross energy cost of horizontal
// treadmill and track running. Sports Medicine, 1(4), 270-277.
// =============================================================================

const RATIO_1500M_VMA = 1.06; // vitesse 1500m / VMA

/**
 * Calcule la VMA (km/h) à partir du temps au 1500m (secondes).
 * Formule de Mercier : VMA = vitesse_1500m / 1.06
 */
export function calculerVMA(temps1500mSecondes: number): number {
  const vitesse1500m = (1500 / temps1500mSecondes) * 3.6; // km/h
  return vitesse1500m / RATIO_1500M_VMA;
}

/**
 * Calcule la VMA (km/h) à partir d'un temps sur n'importe quelle distance,
 * en utilisant la loi de Riegel pour estimer le temps équivalent à VMA
 * (~5min d'effort), puis en déduisant la vitesse.
 *
 * Plus robuste que `calculerVMA` quand on n'a pas le 1500m.
 *
 * Référence : Riegel P.S. (1981). Athletic records and human endurance.
 * American Scientist, 69(3), 285-290.
 */
export function calculerVMADepuisDistance(distanceKm: number, tempsSec: number): number {
  // Riegel : T2 = T1 × (D2/D1)^1.06
  // On cherche la vitesse à T_VMA ≈ 5 min (= 300s)
  // D_VMA = (300/tempsSec)^(1/1.06) × distanceKm
  const tempsRefSec = 300;
  const distanceVMA = Math.pow(tempsRefSec / tempsSec, 1 / 1.06) * distanceKm;
  return (distanceVMA / (tempsRefSec / 3600));
}

// =============================================================================
// VO2max
// =============================================================================
// HYPOTHÈSE : coût énergétique de la course = 3.5 ml O2/kg/km
// (Léger & Mercier 1984). Varie en réalité de 3.3 à 3.8 selon l'économie
// de course de l'athlète. C'est donc une estimation à ±10%.
// =============================================================================

const COUT_OXYGENE_COURSE = 3.5; // ml O2 / kg / km

export function calculerVO2max(vma: number): number {
  return vma * COUT_OXYGENE_COURSE;
}

// =============================================================================
// Allures par % de VMA
// =============================================================================
// HYPOTHÈSES (valeurs médianes — varient selon le niveau d'endurance) :
// - Seuil lactique (FTP/seuil 2) : 85% VMA (plage 80-90%)
// - Allure marathon : 80% VMA (plage 75-87% selon niveau)
// - Allure endurance fondamentale : 70% VMA (plage 65-75%)
// - Allure récupération : 60% VMA
// =============================================================================

export function allureDepuisVMA(vma: number, pourcentage: number): number {
  if (vma <= 0 || pourcentage <= 0) return 0;
  const vitesse = vma * (pourcentage / 100);
  return 3600 / vitesse; // sec/km
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

// =============================================================================
// FC max — Formule de Tanaka et al. (2001)
// =============================================================================
// HYPOTHÈSE : étude méta-analyse Tanaka, Monahan & Seals (JACC 2001).
// Plus précise que la formule de Fox (220-âge), surtout après 40 ans.
// Erreur standard : ±10-12 bpm. Privilégier une mesure réelle si disponible.
// =============================================================================

export function fcMaxTanaka(age: number): number {
  return Math.round(208 - 0.7 * age);
  // Note: 208 (et non 207) est la valeur publiée par Tanaka et al.
}

/**
 * Formule alternative de Gellish (2007), légèrement plus conservatrice
 * pour les sujets âgés. Utile en seconde estimation.
 */
export function fcMaxGellish(age: number): number {
  return Math.round(207 - 0.7 * age);
}

// =============================================================================
// Loi de Riegel — Prédiction de temps entre distances
// =============================================================================
// HYPOTHÈSE : T2 = T1 × (D2/D1)^k avec k ≈ 1.06 pour la course à pied.
// Précision : excellente pour D2/D1 ∈ [0.5, 2], se dégrade au-delà.
// k = 1.06 = défaut populationnel ; varie de 1.04 (très endurant)
// à 1.10 (faible endurant).
//
// Référence : Riegel P.S. (1981).
// =============================================================================

export function predireTempsRiegel(
  tempsConnuSec: number,
  distanceConnueKm: number,
  distanceCibleKm: number,
  k: number = 1.06
): number {
  return tempsConnuSec * Math.pow(distanceCibleKm / distanceConnueKm, k);
}

/**
 * Estime l'exposant de Riegel d'un coureur depuis 2 performances.
 * k > 1.06 = endurance faible ; k < 1.06 = bonne endurance.
 */
export function estimerExposantRiegel(
  d1Km: number, t1Sec: number,
  d2Km: number, t2Sec: number
): number {
  if (d1Km <= 0 || d2Km <= 0 || d1Km === d2Km) return 1.06;
  return Math.log(t2Sec / t1Sec) / Math.log(d2Km / d1Km);
}

// =============================================================================
// % VMA estimé pour une distance donnée (continuum via Riegel)
// =============================================================================
// HYPOTHÈSE : à VMA on tient ~5min (1500m pour un coureur de 18km/h).
// On dérive le %VMA d'une distance par : si T_distance / T_VMA est connu,
// on peut estimer la vitesse moyenne en fraction de VMA.
//
// Tableau approximatif (validé empiriquement) :
//   1500m : 103-105% (effort > VMA bref)
//   3000m : 95-100%
//   5km   : 90-94%
//   10km  : 86-90%
//   semi  : 82-87%
//   marathon : 76-83%
//   100km : 65-72%
// =============================================================================

export function pourcentageVMAPourDistance(distanceKm: number, k: number = 1.06): number {
  // Référence : à 5min d'effort = 100% VMA
  // Distance "VMA" en km = vitesse * (5/60). On modélise par Riegel inversé.
  // Vitesse(d) / VMA = (5/T(d) en min)^((k-1)/k) selon Riegel rearrangée
  // Mais on simplifie via un tableau interpolé empiriquement.
  if (distanceKm <= 0.4) return 110;
  if (distanceKm <= 1.5) return 105 - (distanceKm - 0.4) * 1.8;
  if (distanceKm <= 3) return 102 - (distanceKm - 1.5) * 2.0;
  if (distanceKm <= 5) return 99 - (distanceKm - 3) * 2.5;
  if (distanceKm <= 10) return 94 - (distanceKm - 5) * 0.8;
  if (distanceKm <= 21.1) return 90 - (distanceKm - 10) * 0.36;
  if (distanceKm <= 42.2) return 86 - (distanceKm - 21.1) * 0.2;
  if (distanceKm <= 100) return 82 - (distanceKm - 42.2) * 0.15;
  return Math.max(60, 73 - (distanceKm - 100) * 0.05);
}
