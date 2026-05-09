import { useState } from 'react';
import type { Objectif, TypeObjectif, NiveauEffort } from '../models/objective';
import { parseDuree } from '../engine/format';

interface Props {
  onSubmit: (objectif: Objectif) => void;
}

export function ObjectiveForm({ onSubmit }: Props) {
  const [type, setType] = useState<TypeObjectif>('temps');
  const [tempsStr, setTempsStr] = useState('');
  const [effort, setEffort] = useState<NiveauEffort>('performance');
  const [pctVMA, setPctVMA] = useState(80);

  function handleSubmit() {
    switch (type) {
      case 'temps': {
        const t = parseDuree(tempsStr);
        if (!t) return;
        onSubmit({ type: 'temps', tempsCible: t });
        break;
      }
      case 'effort':
        onSubmit({ type: 'effort', niveauEffort: effort });
        break;
      case 'pourcentageVMA':
        onSubmit({ type: 'pourcentageVMA', pourcentageVMA: pctVMA });
        break;
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Objectif</h2>

      <div className="flex gap-2">
        {(['temps', 'effort', 'pourcentageVMA'] as TypeObjectif[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              type === t
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'temps' ? 'Temps cible' : t === 'effort' ? "Niveau d'effort" : '% VMA'}
          </button>
        ))}
      </div>

      {type === 'temps' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Temps cible (hh:mm:ss)
          </label>
          <input
            type="text"
            value={tempsStr}
            onChange={(e) => setTempsStr(e.target.value)}
            placeholder="3:30:00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      )}

      {type === 'effort' && (
        <div className="flex gap-2">
          {(['confort', 'performance', 'record'] as NiveauEffort[]).map((n) => (
            <button
              key={n}
              onClick={() => setEffort(n)}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                effort === n
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {n === 'confort' ? 'Confort' : n === 'performance' ? 'Performance' : 'Record'}
            </button>
          ))}
        </div>
      )}

      {type === 'pourcentageVMA' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            % de VMA : {pctVMA}%
          </label>
          <input
            type="range"
            min={60}
            max={100}
            value={pctVMA}
            onChange={(e) => setPctVMA(+e.target.value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>60% (récup)</span>
            <span>80% (marathon)</span>
            <span>100% (VMA)</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="w-full bg-gray-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        Définir l'objectif
      </button>
    </div>
  );
}
