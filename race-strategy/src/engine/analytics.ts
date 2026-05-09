// =============================================================================
// MODULE D'ANALYSE DU PROFIL COUREUR
// =============================================================================
// Combine TOUTES les données disponibles (1500m, override, courses passées)
// pour produire le meilleur profil possible avec niveau de confiance.
//
// Principe statistique :
// 1. Estimer VMA et k depuis chaque source disponible
// 2. Pondérer chaque estimation par : récence, distance plate (faible D+),
//    distance pertinente, données complètes
// 3. Combiner par moyenne pondérée robuste
// 4. Calculer un intervalle de confiance basé sur la variance
//
// L'override utilisateur reste prioritaire, mais on affiche ce que le modèle
// aurait estimé pour comparaison.
// =============================================================================

import type { CourseHistorique, ProfilAthlete } from '../models/athlete';
import {
  calculerVMA as calculerVMADepuis1500m,
  predireTempsRiegel,
  estimerExposantRiegel,
  pourcentageVMAPourDistance,
} from './vma';
import { coutMinetti } from './elevation';

// =============================================================================
// Types
// =============================================================================

export type Confiance = 'faible' | 'moyenne' | 'élevée';

export interface ProfilCoureur {
  // ───── VMA ─────
  vma: number; // km/h, meilleure estimation
  vmaSourceDescr: string; // ex: "1500m + 3 courses (5km, 10km, semi)"
  vmaConfiance: Confiance;
  vmaPlage: [number, number]; // intervalle ±1σ

  // ───── Endurance (Riegel k) ─────
  k: number;
  kConfiance: Confiance;
  kSourceDescr: string;

  // ───── Coefficient de montée ─────
  coefMontee: number;
  coefMonteeConfiance: Confiance;
  coefMonteeSourceDescr: string;

  // ───── Fatigue ─────
  facteurFatigue: number;

  // ───── Estimations VMA par source (pour debug/UI) ─────
  estimationsVMA: { source: string; vma: number; poids: number; date?: number }[];

  // ───── Predictions standards ─────
  predictions: {
    distance: number; // km
    label: string;
    tempsPredit: number; // secondes (course plate)
    allurePredite: number; // sec/km
  }[];
}

export interface PredictionCourse {
  tempsPredit: number; // sec
  tempsPlatPredit: number; // sec, sans dénivelé
  allurePredite: number; // sec/km moyenne
  surcoutDenivele: number; // sec totaux dûs au D+
  plageBasse: number; // sec (-3% optimiste)
  plageHaute: number; // sec (+5% conservateur)
}

// =============================================================================
// Calcul du profil complet
// =============================================================================

const DEFAULT_K = 1.06;
const DEFAULT_COEF_MONTEE = 1.0;
const DEFAULT_FATIGUE = 8;

// Demi-vie temporelle des courses passées (90 jours)
// Une course de 90j compte 50%, 180j compte 25%, etc.
const DEMI_VIE_JOURS = 90;
const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

function poidsTemporel(date: number | undefined): number {
  if (!date) return 0.5; // si pas de date, poids modéré
  const ageJours = (Date.now() - date) / MS_PAR_JOUR;
  if (ageJours < 0) return 1.0; // futur (improbable)
  return Math.pow(0.5, ageJours / DEMI_VIE_JOURS);
}

/**
 * Estime la VMA depuis une course en utilisant le %VMA attendu pour cette
 * distance + un correctif pour le dénivelé via Minetti.
 */
export function estimerVMADepuisCourse(c: CourseHistorique, k: number = DEFAULT_K): number {
  if (c.distance <= 0 || c.temps <= 0) return 0;

  // 1. Vitesse "équivalente plate" en utilisant Minetti pour soustraire le surcoût D+
  const distanceM = c.distance * 1000;
  // pente moyenne montée (en supposant la moitié du parcours en montée)
  const penteUp = c.denivelePositif > 0 ? (2 * c.denivelePositif) / distanceM : 0;
  const penteDown = c.deniveleNegatif > 0 ? -(2 * c.deniveleNegatif) / distanceM : 0;
  // ratio de coût moyen vs plat
  const ratioUp = penteUp > 0 ? coutMinetti(penteUp) / 3.6 : 1;
  const ratioDown = penteDown < 0 ? coutMinetti(penteDown) / 3.6 : 1;
  const ratioMoyen = c.denivelePositif > 0 || c.deniveleNegatif > 0
    ? 0.5 * ratioUp + 0.5 * ratioDown
    : 1;

  // Temps équivalent plat = temps réel / ratioMoyen (à puissance constante)
  const tempsPlatEquiv = c.temps / ratioMoyen;

  // 2. Vitesse plate équivalente
  const vitessePlatKmh = (c.distance / tempsPlatEquiv) * 3600;

  // 3. % VMA pour cette distance
  const pctVMA = pourcentageVMAPourDistance(c.distance, k);

  // 4. VMA = vitesse_plate / pct
  return vitessePlatKmh / (pctVMA / 100);
}

function fiabiliteCourse(c: CourseHistorique): number {
  // Une course est plus fiable si :
  // - elle est sur distance "standard" (5km, 10km, 21.1km, 42.2km)
  // - elle a peu de dénivelé (< 100m de D+)
  // - elle a une date récente
  let f = 1.0;

  // Bonus pour distances standards
  const dist = c.distance;
  const standards = [5, 10, 15, 21.1, 30, 42.2];
  const proximite = Math.min(...standards.map((s) => Math.abs(dist - s) / s));
  if (proximite < 0.05) f *= 1.2;

  // Pénalité pour fort dénivelé (la VMA estimée est moins fiable)
  if (c.denivelePositif > 50) {
    const ratio = c.denivelePositif / (c.distance * 1000);
    f *= Math.max(0.4, 1 - ratio * 8); // 1% pente réduit le poids de 8%
  }

  // Pénalité pour distances très courtes (< 3km) : trop sensibles
  if (c.distance < 3) f *= 0.5;
  // Pénalité pour ultra (> 60km) : régime énergétique différent
  if (c.distance > 60) f *= 0.6;

  // Pondération temporelle
  f *= poidsTemporel(c.date);

  return Math.max(0, f);
}

/**
 * Régression linéaire en log-log pour estimer k de Riegel à partir de
 * toutes les paires de courses (T_i, D_i) :
 *     log(T) = log(a) + k · log(D)
 * où le coefficient de régression est k.
 *
 * On filtre les courses peu fiables et on pondère par la fiabilité.
 */
function estimerKParRegression(
  historique: CourseHistorique[]
): { k: number; n: number; r2: number } {
  // Ne garder que les courses plates (peu de D+ relatif)
  const courses = historique.filter((c) => {
    const denivRel = c.denivelePositif / (c.distance * 1000);
    return denivRel < 0.015 && c.distance >= 3 && c.temps > 0;
  });

  if (courses.length < 2) return { k: DEFAULT_K, n: 0, r2: 0 };

  // Régression linéaire pondérée en log-log
  const points = courses.map((c) => ({
    x: Math.log(c.distance),
    y: Math.log(c.temps),
    w: fiabiliteCourse(c),
  }));

  const sumW = points.reduce((a, p) => a + p.w, 0);
  if (sumW === 0) return { k: DEFAULT_K, n: courses.length, r2: 0 };

  const meanX = points.reduce((a, p) => a + p.w * p.x, 0) / sumW;
  const meanY = points.reduce((a, p) => a + p.w * p.y, 0) / sumW;

  let num = 0, den = 0, totSS = 0, resSS = 0;
  for (const p of points) {
    num += p.w * (p.x - meanX) * (p.y - meanY);
    den += p.w * (p.x - meanX) ** 2;
  }
  if (den === 0) return { k: DEFAULT_K, n: courses.length, r2: 0 };
  const k = num / den;
  const intercept = meanY - k * meanX;

  // R² pondéré
  for (const p of points) {
    const yPred = intercept + k * p.x;
    totSS += p.w * (p.y - meanY) ** 2;
    resSS += p.w * (p.y - yPred) ** 2;
  }
  const r2 = totSS > 0 ? Math.max(0, 1 - resSS / totSS) : 0;

  // Clamp dans une plage physiologique
  const kClamp = Math.max(1.02, Math.min(1.18, k));

  return { k: kClamp, n: courses.length, r2 };
}

/**
 * Estime le coefficient de montée personnel par régression :
 * pour chaque course en montagne, compare le temps réel au temps prédit
 * (Riegel depuis course plate de référence + Minetti pour le D+).
 */
function estimerCoefMontee(
  historique: CourseHistorique[],
  k: number
): { coef: number; n: number; sourceDescr: string } {
  const coursesPlates = historique.filter(
    (c) => c.denivelePositif < 30 && c.distance >= 5
  );
  if (coursesPlates.length === 0) {
    return { coef: DEFAULT_COEF_MONTEE, n: 0, sourceDescr: 'défaut (pas de course plate de référence)' };
  }

  // Course plate de référence : la meilleure pondérée
  const ref = coursesPlates.reduce((best, c) =>
    fiabiliteCourse(c) * (c.distance / c.temps) >
    fiabiliteCourse(best) * (best.distance / best.temps)
      ? c
      : best
  );

  const coursesMontagne = historique.filter((c) => c.denivelePositif >= 100);
  if (coursesMontagne.length === 0) {
    return { coef: DEFAULT_COEF_MONTEE, n: 0, sourceDescr: 'défaut (pas de course en montagne)' };
  }

  const estimations = coursesMontagne.map((c) => {
    // Temps prédit "plat" via Riegel
    const tempsPlatPredit = predireTempsRiegel(ref.temps, ref.distance, c.distance, k);
    // Surcoût Minetti pour le D+
    const distanceM = c.distance * 1000;
    const penteUp = (2 * c.denivelePositif) / distanceM;
    const penteDown = -(2 * c.deniveleNegatif) / distanceM;
    const ratioMoyen = 0.5 * (coutMinetti(penteUp) / 3.6) + 0.5 * (coutMinetti(penteDown) / 3.6);
    const tempsAttendu = tempsPlatPredit * ratioMoyen;

    if (tempsAttendu <= 0 || c.denivelePositif === 0) {
      return { coef: DEFAULT_COEF_MONTEE, poids: 0 };
    }

    // Le ratio temps_réel / temps_attendu, ajusté à 1.0 si Minetti = parfait,
    // donne le coefficient personnel
    const surcoutPart = (c.temps - tempsPlatPredit) / Math.max(1, tempsAttendu - tempsPlatPredit);
    const coef = Math.max(0.5, Math.min(2.0, surcoutPart));
    return { coef, poids: fiabiliteCourse(c) };
  });

  const sumP = estimations.reduce((a, e) => a + e.poids, 0);
  if (sumP === 0) return { coef: DEFAULT_COEF_MONTEE, n: 0, sourceDescr: 'défaut' };

  const coef = estimations.reduce((a, e) => a + e.poids * e.coef, 0) / sumP;
  return {
    coef: Math.round(coef * 100) / 100,
    n: coursesMontagne.length,
    sourceDescr: `${coursesMontagne.length} course(s) avec D+`,
  };
}

/**
 * Combine plusieurs estimations VMA pondérées en une estimation finale
 * + intervalle de confiance.
 */
function combinerEstimations(
  estimations: { source: string; vma: number; poids: number; date?: number }[]
): { vma: number; plage: [number, number]; confiance: Confiance } {
  if (estimations.length === 0) {
    return { vma: 0, plage: [0, 0], confiance: 'faible' };
  }
  const sumP = estimations.reduce((a, e) => a + e.poids, 0);
  if (sumP === 0) {
    return { vma: estimations[0].vma, plage: [estimations[0].vma, estimations[0].vma], confiance: 'faible' };
  }

  const vmaMoy = estimations.reduce((a, e) => a + e.poids * e.vma, 0) / sumP;
  const variance = estimations.reduce((a, e) => a + e.poids * (e.vma - vmaMoy) ** 2, 0) / sumP;
  const sigma = Math.sqrt(variance);

  // Confiance : nombre d'estimations × poids cumulé / sigma
  let confiance: Confiance = 'faible';
  if (estimations.length >= 3 && sigma < 0.5) confiance = 'élevée';
  else if (estimations.length >= 2 && sigma < 0.8) confiance = 'moyenne';

  return {
    vma: Math.round(vmaMoy * 10) / 10,
    plage: [
      Math.round((vmaMoy - sigma) * 10) / 10,
      Math.round((vmaMoy + sigma) * 10) / 10,
    ],
    confiance,
  };
}

/**
 * Analyse complète du profil coureur.
 */
export function analyserProfilCoureur(profil: ProfilAthlete): ProfilCoureur {
  const historique = profil.historique ?? [];

  // ─── 1. Estimer k (exposant Riegel) ───
  const kEst = estimerKParRegression(historique);
  const k = kEst.k;
  const kConfiance: Confiance =
    kEst.n >= 4 && kEst.r2 > 0.95 ? 'élevée' :
    kEst.n >= 2 && kEst.r2 > 0.85 ? 'moyenne' :
    'faible';
  const kSourceDescr =
    kEst.n === 0 ? 'défaut populationnel (1.06)' :
    `régression sur ${kEst.n} course(s) plate(s), R²=${kEst.r2.toFixed(2)}`;

  // ─── 2. Estimer VMA depuis toutes les sources ───
  const estimationsVMA: { source: string; vma: number; poids: number; date?: number }[] = [];

  // Source 1 : 1500m
  if (profil.temps1500m > 0) {
    estimationsVMA.push({
      source: '1500m',
      vma: calculerVMADepuis1500m(profil.temps1500m),
      poids: 1.0, // référence test physiologique direct
    });
  }

  // Source 2 : chaque course passée
  for (const c of historique) {
    const vma = estimerVMADepuisCourse(c, k);
    if (vma > 5 && vma < 30) {
      // Cap physiologique réaliste
      estimationsVMA.push({
        source: `${c.distance}km en ${formaterDureeCourte(c.temps)}`,
        vma,
        poids: fiabiliteCourse(c),
        date: c.date,
      });
    }
  }

  const combined = combinerEstimations(estimationsVMA);
  let vma = combined.vma;
  let vmaConfiance = combined.confiance;
  let vmaPlage = combined.plage;
  let vmaSourceDescr = vmaConfiance === 'faible' && estimationsVMA.length === 1
    ? estimationsVMA[0].source
    : `${estimationsVMA.length} source(s)`;

  // Override utilisateur prioritaire
  if (profil.vmaOverride && profil.vmaOverride > 0) {
    vma = profil.vmaOverride;
    vmaConfiance = 'élevée';
    vmaPlage = [vma, vma];
    vmaSourceDescr = 'valeur saisie manuellement';
  }

  // ─── 3. Coefficient de montée ───
  const coefMonteeEst = estimerCoefMontee(historique, k);
  const coefMonteeConfiance: Confiance =
    coefMonteeEst.n >= 3 ? 'élevée' :
    coefMonteeEst.n >= 1 ? 'moyenne' :
    'faible';

  // ─── 4. Fatigue ───
  const facteurFatigue = Math.max(2, Math.min(25, Math.round((k - 1.0) * 200)));

  // ─── 5. Predictions standards ───
  const distancesStandards = [
    { d: 5, label: '5 km' },
    { d: 10, label: '10 km' },
    { d: 21.1, label: 'Semi' },
    { d: 42.2, label: 'Marathon' },
  ];
  const predictions = distancesStandards
    .map(({ d, label }) => {
      const vitesse = (vma * pourcentageVMAPourDistance(d, k)) / 100;
      const tempsPredit = (d / vitesse) * 3600;
      return {
        distance: d,
        label,
        tempsPredit: Math.round(tempsPredit),
        allurePredite: tempsPredit / d,
      };
    });

  return {
    vma,
    vmaSourceDescr,
    vmaConfiance,
    vmaPlage,
    k: Math.round(k * 1000) / 1000,
    kConfiance,
    kSourceDescr,
    coefMontee: coefMonteeEst.coef,
    coefMonteeConfiance,
    coefMonteeSourceDescr: coefMonteeEst.sourceDescr,
    facteurFatigue,
    estimationsVMA,
    predictions,
  };
}

/**
 * Prédit le temps sur une course donnée à partir du profil.
 * Utilise Riegel (extrapolation distance) + Minetti (correction dénivelé).
 */
export function predireTempsCourse(
  profil: ProfilCoureur,
  distanceKm: number,
  denivelePosM: number = 0,
  deniveleNegM: number = 0
): PredictionCourse {
  // Vitesse plate prédite via le couple (VMA, k)
  const pct = pourcentageVMAPourDistance(distanceKm, profil.k);
  const vitessePlat = (profil.vma * pct) / 100; // km/h
  const tempsPlatPredit = (distanceKm / vitessePlat) * 3600;

  // Correction dénivelé via Minetti × coefficient personnel
  const distanceM = distanceKm * 1000;
  let surcoutDenivele = 0;
  if (denivelePosM > 0 || deniveleNegM > 0) {
    const penteUp = (2 * denivelePosM) / distanceM;
    const penteDown = -(2 * deniveleNegM) / distanceM;
    const ratioUp = 1 + (coutMinetti(penteUp) / 3.6 - 1) * profil.coefMontee;
    const ratioDown = coutMinetti(penteDown) / 3.6;
    const ratioMoyen = 0.5 * ratioUp + 0.5 * ratioDown;
    surcoutDenivele = tempsPlatPredit * (ratioMoyen - 1);
  }

  const tempsPredit = tempsPlatPredit + surcoutDenivele + profil.facteurFatigue * Math.max(0, distanceKm - 21);

  return {
    tempsPredit: Math.round(tempsPredit),
    tempsPlatPredit: Math.round(tempsPlatPredit),
    allurePredite: tempsPredit / distanceKm,
    surcoutDenivele: Math.round(surcoutDenivele),
    plageBasse: Math.round(tempsPredit * 0.97),
    plageHaute: Math.round(tempsPredit * 1.05),
  };
}

function formaterDureeCourte(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}'${sec.toString().padStart(2, '0')}`;
}
