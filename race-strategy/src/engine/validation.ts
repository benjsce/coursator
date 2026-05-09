import type { CourseHistorique } from '../models/athlete';
import type { ValidationObjectif } from '../models/strategy';
import { allureDepuisVMA } from './vma';

export function validerObjectif(
  tempsCible: number,
  distanceKm: number,
  vma: number,
  historique: CourseHistorique[]
): ValidationObjectif {
  const allureCible = tempsCible / distanceKm;
  const allureMaxSoutenable = allureDepuisVMA(vma, 90);
  const allureConfort = allureDepuisVMA(vma, 70);

  const fourchetteBasse = Math.round(allureMaxSoutenable * distanceKm);
  const fourchetteHaute = Math.round(allureConfort * distanceKm);

  if (allureCible < allureMaxSoutenable) {
    return {
      valide: false,
      fourchetteBasse,
      fourchetteHaute,
      message: `Objectif trop ambitieux par rapport à votre VMA. Fourchette réaliste : ${formaterTemps(fourchetteBasse)} - ${formaterTemps(fourchetteHaute)}.`,
    };
  }

  const coursesComparables = historique.filter(
    (c) => Math.abs(c.distance - distanceKm) < distanceKm * 0.3
  );
  if (coursesComparables.length > 0) {
    const meilleurTemps = Math.min(...coursesComparables.map((c) => c.temps));
    const progression = (meilleurTemps - tempsCible) / meilleurTemps;
    if (progression > 0.1) {
      return {
        valide: false,
        fourchetteBasse: Math.round(meilleurTemps * 0.95),
        fourchetteHaute: meilleurTemps,
        message: `Objectif ambitieux : ${Math.round(progression * 100)}% plus rapide que votre meilleur temps sur distance comparable. Visez plutôt ${formaterTemps(Math.round(meilleurTemps * 0.95))} - ${formaterTemps(meilleurTemps)}.`,
      };
    }
  }

  return {
    valide: true,
    fourchetteBasse,
    fourchetteHaute,
    message: 'Objectif cohérent avec votre profil.',
  };
}

function formaterTemps(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = Math.round(secondes % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}'${s.toString().padStart(2, '0')}"`;
}
