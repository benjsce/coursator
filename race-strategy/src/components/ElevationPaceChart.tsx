import type { Parcours } from '../models/gpx';
import type { Split, PlanNutrition } from '../models/strategy';
import { formaterAllure } from '../engine/format';

interface Props {
  parcours: Parcours;
  splits?: Split[];
  nutrition?: PlanNutrition;
  width?: number;
  height?: number;
}

export function ElevationPaceChart({
  parcours,
  splits,
  nutrition,
  width = 760,
  height = 240,
}: Props) {
  const segments = parcours.segments;
  const distKm = parcours.distanceTotale / 1000;

  const padL = 40, padR = 40, padT = 18, padB = 28;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  let cumulEle = 0;
  const elevations = segments.map((seg) => {
    cumulEle += seg.deniveleNet;
    return cumulEle;
  });
  const baseEle = 0;
  const allEle = [baseEle, ...elevations];
  const minEle = Math.min(...allEle);
  const maxEle = Math.max(...allEle);
  const eleRange = maxEle - minEle || 1;
  const padEle = eleRange * 0.08;
  const minEleP = minEle - padEle;
  const maxEleP = maxEle + padEle;

  const xAt = (km: number) => padL + (km / distKm) * chartW;
  const yEle = (ele: number) => padT + chartH - ((ele - minEleP) / (maxEleP - minEleP)) * chartH;

  let elePath = `M ${padL} ${yEle(baseEle)} `;
  elevations.forEach((ele, i) => {
    elePath += `L ${xAt(segments[i].km)} ${yEle(ele)} `;
  });
  const eleAreaPath = elePath + `L ${xAt(distKm)} ${padT + chartH} L ${padL} ${padT + chartH} Z`;

  let pacePath = '';
  let paceMin = Infinity, paceMax = -Infinity;
  if (splits && splits.length > 0) {
    splits.forEach((s) => {
      if (s.allureAjustee < paceMin) paceMin = s.allureAjustee;
      if (s.allureAjustee > paceMax) paceMax = s.allureAjustee;
    });
    paceMin *= 0.95;
    paceMax *= 1.05;
    const yPace = (p: number) => padT + ((p - paceMin) / (paceMax - paceMin)) * chartH * 0.95;

    splits.forEach((s, i) => {
      const x = xAt(s.km - 0.5);
      const y = yPace(s.allureAjustee);
      pacePath += i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
    });
  }

  const sectionA = distKm * 0.3;
  const sectionB = distKm * 0.7;

  const gelKms = nutrition?.gels.map((g) => g.km) ?? [];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ele-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3631" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#1a1815" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={padL} x2={padL + chartW}
          y1={padT + chartH * t} y2={padT + chartH * t}
          stroke="#2a2622" strokeDasharray="2 4" />
      ))}

      <line x1={xAt(sectionA)} x2={xAt(sectionA)} y1={padT} y2={padT + chartH}
        stroke="#3a3631" strokeDasharray="3 3" />
      <line x1={xAt(sectionB)} x2={xAt(sectionB)} y1={padT} y2={padT + chartH}
        stroke="#3a3631" strokeDasharray="3 3" />

      <path d={eleAreaPath} fill="url(#ele-grad)" stroke="#5a544a" strokeWidth="0.8" />

      {pacePath && (
        <path d={pacePath} fill="none" stroke="#ff3a3a" strokeWidth="1.6" strokeLinejoin="round" />
      )}

      {gelKms.map((km) => (
        <g key={`gel-${km}`}>
          <line x1={xAt(km)} x2={xAt(km)} y1={padT} y2={padT + chartH}
            stroke="#ff3a3a" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx={xAt(km)} cy={padT + 8} r="3" fill="#ff3a3a" />
        </g>
      ))}

      <g style={{ font: '10px "Geist Mono", monospace', fill: '#8a8479' }}>
        <text x={padL} y={height - 8}>0</text>
        <text x={xAt(sectionA) - 6} y={height - 8}>{Math.round(sectionA)}</text>
        <text x={xAt(sectionB) - 6} y={height - 8}>{Math.round(sectionB)}</text>
        <text x={xAt(distKm) - 18} y={height - 8}>{distKm.toFixed(1)}km</text>
        <text x={4} y={padT + 8}>{Math.round(maxEleP)}m</text>
        <text x={4} y={padT + chartH + 4}>{Math.round(minEleP)}m</text>
        {splits && splits.length > 0 && (
          <>
            <text x={width - padR + 4} y={padT + 8} fill="#ff3a3a">{formaterAllure(paceMin)}</text>
            <text x={width - padR + 4} y={padT + chartH + 4} fill="#ff3a3a">{formaterAllure(paceMax)}</text>
          </>
        )}
      </g>

      <g style={{ font: '9px "Geist Mono", monospace', fill: '#6b6760', letterSpacing: '0.08em' }}>
        <text x={padL + 4} y={padT - 4}>DEPART</text>
        <text x={xAt(sectionA) + 4} y={padT - 4}>MILIEU</text>
        <text x={xAt(sectionB) + 4} y={padT - 4}>FIN</text>
      </g>
    </svg>
  );
}
