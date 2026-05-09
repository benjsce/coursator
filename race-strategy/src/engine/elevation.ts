import type { Segment } from '../models/gpx';

// =============================================================================
// Modèle d'ajustement d'allure selon le dénivelé
// =============================================================================
// Implémentation basée sur Minetti et al. (2002) : le coût énergétique de la
// course est une fonction polynomiale de la pente i (en fraction, pas %).
//
// C(i) = 155.4·i⁵ − 30.4·i⁴ − 43.3·i³ + 46.3·i² + 19.5·i + 3.6  (J·kg⁻¹·m⁻¹)
//
// Au plat (i=0), C ≈ 3.6 J/kg/m. Le ratio C(i) / C(0) donne le facteur de
// ralentissement (à puissance constante).
//
// Pour passer du facteur de coût à un ralentissement d'allure, on suppose que
// la puissance métabolique reste constante (= P à allure plate), donc :
//     vitesse(i) = vitesse_plate × C(0) / C(i)
//     allure(i)  = allure_plate × C(i) / C(0)
//
// HYPOTHÈSES :
// - Le coureur maintient sa puissance métabolique constante.
// - Le coût "additionnel" est multiplié par un coefficient personnel
//   `coefficientMontee` qui module la pénalité (0.7 = bon grimpeur,
//   1.3 = faible en montée). 1.0 = athlète médian de Minetti.
// - En descente, on plafonne le gain à -25% de l'allure (au-delà = freinage,
//   technique, etc.)
//
// Référence : Minetti A.E. et al. (2002). Energy cost of walking and running
// at extreme uphill and downhill slopes. J Appl Physiol, 93(3), 1039-1046.
// =============================================================================

const C_PLAT = 3.6; // J/kg/m au plat (Minetti)

/** Coût énergétique de Minetti pour une pente i (fraction, ex 0.05 = 5%) */
export function coutMinetti(i: number): number {
  // Domaine validé : i ∈ [-0.45, 0.45]
  const ic = Math.max(-0.45, Math.min(0.45, i));
  return (
    155.4 * Math.pow(ic, 5) -
    30.4 * Math.pow(ic, 4) -
    43.3 * Math.pow(ic, 3) +
    46.3 * Math.pow(ic, 2) +
    19.5 * ic +
    3.6
  );
}

/** Ratio de coût (vs plat) pour une pente donnée */
export function ratioCoutPente(i: number): number {
  return coutMinetti(i) / C_PLAT;
}

/**
 * Ajuste l'allure plate à un segment donné selon la pente.
 *
 * @param allurePlateSecKm allure en sec/km au plat
 * @param segment segment du parcours (1 km ou moins)
 * @param coefficientMontee coefficient personnel (1.0 = médian, <1 = bon grimpeur)
 */
export function ajusterAllure(
  allurePlateSecKm: number,
  segment: Segment,
  coefficientMontee: number
): number {
  const distanceKm = segment.distance / 1000;
  if (distanceKm === 0) return allurePlateSecKm;

  // Pour les segments avec montée ET descente (km mixte), on calcule
  // la pénalité moyenne pondérée sur les deux portions.
  const dPlus = segment.denivelePositif;
  const dMoins = segment.deniveleNegatif;
  const distM = segment.distance;

  if (dPlus > 0 && dMoins > 0) {
    // Approximation : on suppose que la moitié du segment monte, l'autre descend
    // (sans information sur la répartition exacte des points GPX).
    // Pente moyenne montée = 2·dPlus / distM, pente moyenne descente = -2·dMoins / distM.
    const penteUp = (2 * dPlus) / distM;
    const penteDown = -(2 * dMoins) / distM;
    const ratioUp = ratioCoutPente(penteUp);
    const ratioDown = ratioCoutPente(penteDown);
    // Pondération 50/50, ajustement par le coefficient personnel sur la portion montée
    const ratioUpAjuste = 1 + (ratioUp - 1) * coefficientMontee;
    const ratioMoyen = 0.5 * ratioUpAjuste + 0.5 * ratioDown;
    return allurePlateSecKm * Math.max(0.65, ratioMoyen);
  }

  // Segment essentiellement uphill ou downhill
  const pente = segment.deniveleNet / distM; // fraction
  let ratio = ratioCoutPente(pente);

  if (pente > 0) {
    // Modulation par le coefficient personnel sur la portion supplémentaire
    ratio = 1 + (ratio - 1) * coefficientMontee;
  }
  // En descente, on garde Minetti tel quel (la technique est moins individuelle
  // dans le coût énergétique pur — varie surtout dans la limite haute du gain).

  // Plafond : on ne descend jamais en dessous de 65% de l'allure plate (descente)
  // ni au-dessus de 250% (montée extrême — l'athlète marcherait).
  const allureAjustee = allurePlateSecKm * ratio;
  return Math.max(allurePlateSecKm * 0.65, Math.min(allurePlateSecKm * 2.5, allureAjustee));
}
