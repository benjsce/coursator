import { useState } from 'react';
import { useAthleteStore } from '../store/athlete-store';
import { calculerVMA, allureDepuisVMA } from '../engine/vma';
import { formaterAllure } from '../engine/format';

export function CalculatorSection() {
  const { profil } = useAthleteStore();
  const vma = profil ? calculerVMA(profil.temps1500m) : null;

  const [kmh, setKmh] = useState('');
  const [minKm, setMinKm] = useState('');
  const [pctVMA, setPctVMA] = useState(80);

  function kmhToMinKm(v: number): string {
    if (v <= 0) return '-';
    const secPerKm = 3600 / v;
    return formaterAllure(secPerKm);
  }

  function minKmToKmh(input: string): string {
    const match = input.match(/^(\d+)[':.](\d{2})$/);
    if (!match) return '-';
    const sec = parseInt(match[1]) * 60 + parseInt(match[2]);
    if (sec <= 0) return '-';
    return (3600 / sec).toFixed(2);
  }

  const VMA_PCTS = [60, 65, 70, 75, 80, 85, 90, 95, 100];
  const inputClass = "w-full bg-bg-surface border border-border-strong text-text px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none";

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h1 className="font-display font-extrabold text-2xl">Calculateur d'allures</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-raised border border-border p-5 space-y-4">
          <div className="font-mono text-[10px] text-text-muted tracking-[0.16em]">KM/H → MIN/KM</div>
          <input type="number" step="0.1" value={kmh} onChange={(e) => setKmh(e.target.value)}
            placeholder="Ex: 12.5" className={inputClass} />
          {kmh && parseFloat(kmh) > 0 && (
            <div className="text-center">
              <p className="text-3xl font-display font-extrabold text-accent">{kmhToMinKm(parseFloat(kmh))}</p>
              <p className="text-[10px] font-mono text-text-muted mt-1">par kilomètre</p>
            </div>
          )}
        </div>

        <div className="bg-bg-raised border border-border p-5 space-y-4">
          <div className="font-mono text-[10px] text-text-muted tracking-[0.16em]">MIN/KM → KM/H</div>
          <input type="text" value={minKm} onChange={(e) => setMinKm(e.target.value)}
            placeholder="Ex: 4:48" className={inputClass} />
          {minKm && minKmToKmh(minKm) !== '-' && (
            <div className="text-center">
              <p className="text-3xl font-display font-extrabold text-accent">{minKmToKmh(minKm)} km/h</p>
              <p className="text-[10px] font-mono text-text-muted mt-1">vitesse</p>
            </div>
          )}
        </div>
      </div>

      {vma && (
        <div>
          <div className="flex items-baseline gap-3 mb-3">
            <div className="font-mono text-[10px] text-text-muted tracking-[0.16em]">ALLURES PAR % DE VMA</div>
            <span className="font-mono text-[11px] text-text-secondary">VMA : {vma.toFixed(1)} km/h</span>
          </div>
          <div className="border border-border overflow-hidden">
            <table className="w-full font-mono text-[11px]" style={{ borderCollapse: 'collapse' }}>
              <thead className="bg-bg-surface">
                <tr className="text-text-muted text-left tracking-[0.08em]">
                  <th className="py-2.5 px-4 border-b border-border font-medium">% VMA</th>
                  <th className="py-2.5 px-4 border-b border-border font-medium">VITESSE</th>
                  <th className="py-2.5 px-4 border-b border-border font-medium">ALLURE</th>
                  <th className="py-2.5 px-4 border-b border-border font-medium">ZONE</th>
                </tr>
              </thead>
              <tbody>
                {VMA_PCTS.map((pct) => {
                  const speed = vma * (pct / 100);
                  const allure = allureDepuisVMA(vma, pct);
                  return (
                    <tr key={pct} className="border-b border-border/40 hover:bg-bg-hover transition-colors">
                      <td className="py-2 px-4 text-text font-medium">{pct}%</td>
                      <td className="py-2 px-4 text-text-secondary">{speed.toFixed(1)} km/h</td>
                      <td className="py-2 px-4 text-text font-medium">{formaterAllure(allure)}</td>
                      <td className="py-2 px-4">
                        <span className={`text-[9px] px-1.5 py-0.5 border ${zoneStyle(pct)}`}>
                          {zoneLabel(pct)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vma && (
        <div className="bg-bg-raised border border-border p-5 space-y-4">
          <div className="font-mono text-[10px] text-text-muted tracking-[0.16em]">CALCUL PERSONNALISE</div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">% de VMA : <span className="text-accent">{pctVMA}%</span></label>
            <input type="range" min={50} max={110} value={pctVMA}
              onChange={(e) => setPctVMA(+e.target.value)} className="w-full" />
            <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1">
              <span>50%</span><span>80%</span><span>110%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-display font-extrabold text-text">{(vma * pctVMA / 100).toFixed(1)} km/h</p>
              <p className="text-[10px] font-mono text-text-muted mt-1">vitesse</p>
            </div>
            <div>
              <p className="text-3xl font-display font-extrabold text-accent">{formaterAllure(allureDepuisVMA(vma, pctVMA))}</p>
              <p className="text-[10px] font-mono text-text-muted mt-1">allure</p>
            </div>
          </div>
        </div>
      )}

      {!vma && (
        <div className="border border-border p-6 text-center">
          <p className="text-text-muted text-sm">
            Renseignez votre profil (temps au 1500m) pour accéder aux calculs par % de VMA.
          </p>
        </div>
      )}
    </div>
  );
}

function zoneStyle(pct: number): string {
  if (pct <= 65) return 'border-accent-blue text-accent-blue';
  if (pct <= 75) return 'border-green-500 text-green-500';
  if (pct <= 85) return 'border-yellow-500 text-yellow-500';
  if (pct <= 92) return 'border-accent-orange text-accent-orange';
  return 'border-accent text-accent';
}

function zoneLabel(pct: number): string {
  if (pct <= 65) return 'Récup';
  if (pct <= 75) return 'Endurance';
  if (pct <= 85) return 'Tempo';
  if (pct <= 92) return 'Seuil';
  return 'VO2max';
}
