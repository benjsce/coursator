import gpxParser from 'gpxparser';
import type { PointGPX, Segment, Parcours } from '../models/gpx';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parserGPX(contenu: string): Parcours {
  const gpx = new gpxParser();
  gpx.parse(contenu);

  const track = gpx.tracks[0];
  if (!track) throw new Error('Aucune trace trouvée dans le fichier GPX');

  const rawPoints = track.points;
  let distanceCumulee = 0;

  const points: PointGPX[] = rawPoints.map((p: { lat: number; lon: number; ele: number; time: Date }, i: number) => {
    if (i > 0) {
      const prev = rawPoints[i - 1];
      distanceCumulee += haversine(prev.lat, prev.lon, p.lat, p.lon);
    }
    return {
      lat: p.lat,
      lon: p.lon,
      ele: p.ele ?? 0,
      time: p.time ? new Date(p.time) : undefined,
      distanceCumulee,
    };
  });

  const distanceTotale = distanceCumulee;
  const nbKm = Math.ceil(distanceTotale / 1000);
  const segments: Segment[] = [];

  for (let km = 1; km <= nbKm; km++) {
    const debut = (km - 1) * 1000;
    const fin = Math.min(km * 1000, distanceTotale);
    const pointsSegment = points.filter(
      (p) => p.distanceCumulee >= debut && p.distanceCumulee < fin
    );

    let dPlus = 0;
    let dMoins = 0;
    for (let i = 1; i < pointsSegment.length; i++) {
      const diff = pointsSegment[i].ele - pointsSegment[i - 1].ele;
      if (diff > 0) dPlus += diff;
      else dMoins += Math.abs(diff);
    }

    const distance = fin - debut;
    segments.push({
      km,
      distance,
      denivelePositif: Math.round(dPlus),
      deniveleNegatif: Math.round(dMoins),
      deniveleNet: Math.round(dPlus - dMoins),
      pente: distance > 0 ? Math.round(((dPlus - dMoins) / distance) * 10000) / 100 : 0,
    });
  }

  let dpTotal = 0;
  let dnTotal = 0;
  segments.forEach((s) => {
    dpTotal += s.denivelePositif;
    dnTotal += s.deniveleNegatif;
  });

  return {
    nom: track.name || 'Parcours importé',
    distanceTotale,
    denivelePositifTotal: dpTotal,
    deniveleNegatifTotal: dnTotal,
    points,
    segments,
  };
}
