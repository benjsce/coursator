import type { Split } from '../models/strategy';
import type { Parcours } from '../models/gpx';
import type { AnalysePostCourse, ComparaisonKm, IndicateursGlobaux } from '../models/analysis';

function calculerAlluresReelles(parcours: Parcours): number[] {
  const allures: number[] = [];
  const points = parcours.points;

  for (const segment of parcours.segments) {
    const kmDebut = (segment.km - 1) * 1000;
    const kmFin = segment.km * 1000;

    const pointsSegment = points.filter(
      (p) => p.distanceCumulee >= kmDebut && p.distanceCumulee < kmFin && p.time
    );

    if (pointsSegment.length >= 2) {
      const premier = pointsSegment[0];
      const dernier = pointsSegment[pointsSegment.length - 1];
      const duree = (dernier.time!.getTime() - premier.time!.getTime()) / 1000;
      const distance = (dernier.distanceCumulee - premier.distanceCumulee) / 1000;
      allures.push(distance > 0 ? duree / distance : 0);
    } else {
      allures.push(0);
    }
  }

  return allures;
}

export function analyserPostCourse(
  splitsPrevus: Split[],
  parcoursRealise: Parcours
): AnalysePostCourse {
  const alluresReelles = calculerAlluresReelles(parcoursRealise);
  const nbKm = Math.min(splitsPrevus.length, alluresReelles.length);

  let tempsCumulePrevu = 0;
  let tempsCumuleReel = 0;
  const comparaisons: ComparaisonKm[] = [];

  for (let i = 0; i < nbKm; i++) {
    const split = splitsPrevus[i];
    const allureReelle = alluresReelles[i];

    tempsCumulePrevu = split.tempsPassage;
    tempsCumuleReel += allureReelle;

    comparaisons.push({
      km: i + 1,
      allurePrevue: split.allureAjustee,
      allureRealisee: Math.round(allureReelle),
      ecart: Math.round(allureReelle - split.allureAjustee),
      tempsPassagePrevu: tempsCumulePrevu,
      tempsPassageReel: Math.round(tempsCumuleReel),
      ecartCumule: Math.round(tempsCumuleReel - tempsCumulePrevu),
    });
  }

  const ecarts = comparaisons.map((c) => c.ecart);
  const moyenne = ecarts.reduce((a, b) => a + b, 0) / ecarts.length;
  const variance = ecarts.reduce((a, b) => a + (b - moyenne) ** 2, 0) / ecarts.length;
  const regularite = Math.round(Math.sqrt(variance));

  const moitie = Math.floor(nbKm / 2);
  const allurePremiereMoitie =
    comparaisons.slice(0, moitie).reduce((a, c) => a + c.allureRealisee, 0) / moitie;
  const allureSecondeMoitie =
    comparaisons.slice(moitie).reduce((a, c) => a + c.allureRealisee, 0) / (nbKm - moitie);

  let splitReel: 'negative' | 'positive' | 'even';
  const diff = allureSecondeMoitie - allurePremiereMoitie;
  if (diff < -3) splitReel = 'negative';
  else if (diff > 3) splitReel = 'positive';
  else splitReel = 'even';

  const kmPlusRapide =
    comparaisons.reduce((min, c) => (c.allureRealisee < min.allureRealisee ? c : min)).km;
  const kmPlusLent =
    comparaisons.reduce((max, c) => (c.allureRealisee > max.allureRealisee ? c : max)).km;

  const indicateurs: IndicateursGlobaux = {
    tempsPrevuTotal: splitsPrevus[splitsPrevus.length - 1]?.tempsPassage ?? 0,
    tempsReelTotal: Math.round(tempsCumuleReel),
    ecartTotal: Math.round(tempsCumuleReel - (splitsPrevus[splitsPrevus.length - 1]?.tempsPassage ?? 0)),
    regularite,
    splitReel,
    kmPlusRapide,
    kmPlusLent,
  };

  const diagnostics = genererDiagnostics(comparaisons, indicateurs);

  return { comparaisons, indicateurs, diagnostics };
}

function genererDiagnostics(
  comparaisons: ComparaisonKm[],
  indicateurs: IndicateursGlobaux
): string[] {
  const diags: string[] = [];
  const nbKm = comparaisons.length;

  const premiers5 = comparaisons.slice(0, Math.min(5, nbKm));
  const ecartMoyenDebut =
    premiers5.reduce((a, c) => a + c.ecart, 0) / premiers5.length;

  if (ecartMoyenDebut < -10) {
    diags.push(
      `Départ trop rapide : ${Math.abs(Math.round(ecartMoyenDebut))} sec/km plus vite que prévu sur les ${premiers5.length} premiers km.`
    );
  } else if (ecartMoyenDebut > 10) {
    diags.push(
      `Départ conservateur : ${Math.round(ecartMoyenDebut)} sec/km plus lent que prévu sur les ${premiers5.length} premiers km.`
    );
  }

  const dernierTiers = comparaisons.slice(Math.floor(nbKm * 0.66));
  const ecartMoyenFin =
    dernierTiers.reduce((a, c) => a + c.ecart, 0) / dernierTiers.length;
  if (ecartMoyenFin > 15) {
    diags.push(
      `Fin de course difficile : +${Math.round(ecartMoyenFin)} sec/km sur le dernier tiers.`
    );
  }

  if (indicateurs.ecartTotal > 0) {
    diags.push(
      `Objectif manqué de ${formaterDuree(indicateurs.ecartTotal)}.`
    );
  } else if (indicateurs.ecartTotal < -30) {
    diags.push(
      `Objectif dépassé de ${formaterDuree(Math.abs(indicateurs.ecartTotal))}. Vous pouviez viser plus ambitieux.`
    );
  } else {
    diags.push('Objectif atteint. Excellente exécution du plan de course.');
  }

  if (indicateurs.regularite < 5) {
    diags.push('Régularité excellente : allure très stable tout au long de la course.');
  } else if (indicateurs.regularite > 20) {
    diags.push('Allure irrégulière. Travailler la régularité améliorerait le résultat.');
  }

  return diags;
}

function formaterDuree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = Math.round(secondes % 60);
  if (m === 0) return `${s} sec`;
  return `${m} min ${s.toString().padStart(2, '0')}`;
}
