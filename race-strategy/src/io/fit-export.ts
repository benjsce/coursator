import type { Split } from '../models/strategy';
import type { Parcours } from '../models/gpx';

// Generates a simplified .FIT-compatible course file as a TCX (Training Center XML)
// TCX is universally supported by Garmin Connect for course import
export function genererFichierGarmin(splits: Split[], parcours: Parcours): Blob {
  const startTime = new Date();
  let currentTime = new Date(startTime);

  let tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenter/v2">
  <Courses>
    <Course>
      <Name>${parcours.nom}</Name>
      <Lap>
        <TotalTimeSeconds>${splits[splits.length - 1]?.tempsPassage ?? 0}</TotalTimeSeconds>
        <DistanceMeters>${parcours.distanceTotale}</DistanceMeters>
      </Lap>
      <Track>`;

  for (const split of splits) {
    const kmIndex = split.km - 1;
    const segment = parcours.segments[kmIndex];
    if (!segment) continue;

    const pointsInSegment = parcours.points.filter(
      (p) =>
        p.distanceCumulee >= (split.km - 1) * 1000 &&
        p.distanceCumulee < split.km * 1000
    );

    const midPoint = pointsInSegment[Math.floor(pointsInSegment.length / 2)] ?? parcours.points[0];
    currentTime = new Date(startTime.getTime() + split.tempsPassage * 1000);

    tcx += `
        <Trackpoint>
          <Time>${currentTime.toISOString()}</Time>
          <Position>
            <LatitudeDegrees>${midPoint.lat}</LatitudeDegrees>
            <LongitudeDegrees>${midPoint.lon}</LongitudeDegrees>
          </Position>
          <AltitudeMeters>${midPoint.ele}</AltitudeMeters>
          <DistanceMeters>${split.km * 1000}</DistanceMeters>
        </Trackpoint>`;
  }

  tcx += `
      </Track>
    </Course>
  </Courses>
</TrainingCenterDatabase>`;

  return new Blob([tcx], { type: 'application/xml' });
}
