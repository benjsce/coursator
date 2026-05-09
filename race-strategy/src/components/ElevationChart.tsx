import { useMemo, useRef, useEffect } from 'react';
import type { Parcours } from '../models/gpx';

interface Props {
  parcours: Parcours;
}

export function ElevationChart({ parcours }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const points = useMemo(() => {
    const step = Math.max(1, Math.floor(parcours.points.length / 500));
    return parcours.points.filter((_, i) => i % step === 0 || i === parcours.points.length - 1);
  }, [parcours]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 35, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const elevations = points.map((p) => p.ele);
    const distances = points.map((p) => p.distanceCumulee / 1000);
    const minEle = Math.min(...elevations) - 10;
    const maxEle = Math.max(...elevations) + 10;
    const maxDist = distances[distances.length - 1];

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const eleSteps = 5;
    for (let i = 0; i <= eleSteps; i++) {
      const y = padding.top + (chartH / eleSteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const ele = maxEle - ((maxEle - minEle) / eleSteps) * i;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(ele)}m`, padding.left - 8, y + 4);
    }

    // Distance labels
    const distSteps = Math.min(10, Math.floor(maxDist));
    for (let i = 0; i <= distSteps; i++) {
      const d = (maxDist / distSteps) * i;
      const x = padding.left + (d / maxDist) * chartW;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${d.toFixed(0)}`, x, h - padding.bottom + 20);
    }
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('km', w - padding.right + 5, h - padding.bottom + 20);

    // Area fill
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);
    for (let i = 0; i < points.length; i++) {
      const x = padding.left + (distances[i] / maxDist) * chartW;
      const y = padding.top + ((maxEle - elevations[i]) / (maxEle - minEle)) * chartH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = padding.left + (distances[i] / maxDist) * chartW;
      const y = padding.top + ((maxEle - elevations[i]) / (maxEle - minEle)) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [points]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Profil altimétrique</label>
      <div className="border border-gray-200 rounded-lg p-2 bg-white">
        <canvas ref={canvasRef} className="w-full" style={{ height: 200 }} />
      </div>
    </div>
  );
}
