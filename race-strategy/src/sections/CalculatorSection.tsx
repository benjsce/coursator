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

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Calculateur d'allures</h1>

      {/* Conversion km/h → min/km */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">km/h → min/km</h3>
          <input
            type="number"
            step="0.1"
            value={kmh}
            onChange={(e) => setKmh(e.target.value)}
            placeholder="Ex: 12.5"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {kmh && parseFloat(kmh) > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{kmhToMinKm(parseFloat(kmh))}</p>
              <p className="text-xs text-gray-500">par kilomètre</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">min/km → km/h</h3>
          <input
            type="text"
            value={minKm}
            onChange={(e) => setMinKm(e.target.value)}
            placeholder="Ex: 4:48"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {minKm && minKmToKmh(minKm) !== '-' && (
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{minKmToKmh(minKm)} km/h</p>
              <p className="text-xs text-gray-500">vitesse</p>
            </div>
          )}
        </div>
      </div>

      {/* Tableau % VMA */}
      {vma && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Allures par % de VMA
            <span className="font-normal text-gray-500 ml-2">(votre VMA : {vma.toFixed(1)} km/h)</span>
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">% VMA</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Vitesse</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Allure</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Zone</th>
                </tr>
              </thead>
              <tbody>
                {VMA_PCTS.map((pct) => {
                  const speed = vma * (pct / 100);
                  const allure = allureDepuisVMA(vma, pct);
                  return (
                    <tr key={pct} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-medium text-gray-900">{pct}%</td>
                      <td className="py-2.5 px-4 text-gray-700">{speed.toFixed(1)} km/h</td>
                      <td className="py-2.5 px-4 font-medium text-gray-900">{formaterAllure(allure)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded ${zoneForPct(pct)}`}>{zoneLabelForPct(pct)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calcul % VMA personnalisé */}
      {vma && (
        <div className="bg-gray-50 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Calcul personnalisé</h3>
          <div>
            <label className="block text-sm text-gray-700 mb-1">% de VMA : {pctVMA}%</label>
            <input
              type="range"
              min={50}
              max={110}
              value={pctVMA}
              onChange={(e) => setPctVMA(+e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>50%</span>
              <span>80%</span>
              <span>110%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{(vma * pctVMA / 100).toFixed(1)} km/h</p>
              <p className="text-xs text-gray-500">vitesse</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formaterAllure(allureDepuisVMA(vma, pctVMA))}</p>
              <p className="text-xs text-gray-500">allure</p>
            </div>
          </div>
        </div>
      )}

      {!vma && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500 text-sm">
            Renseignez votre profil (temps au 1500m) pour accéder aux calculs par % de VMA.
          </p>
        </div>
      )}
    </div>
  );
}

function zoneForPct(pct: number): string {
  if (pct <= 65) return 'bg-blue-100 text-blue-700';
  if (pct <= 75) return 'bg-green-100 text-green-700';
  if (pct <= 85) return 'bg-yellow-100 text-yellow-700';
  if (pct <= 92) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function zoneLabelForPct(pct: number): string {
  if (pct <= 65) return 'Récup';
  if (pct <= 75) return 'Endurance';
  if (pct <= 85) return 'Tempo';
  if (pct <= 92) return 'Seuil';
  return 'VO2max';
}
