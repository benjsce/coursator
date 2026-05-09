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
      <h2 className="font-display font-bold text-lg">Objectif</h2>

      <div className="flex gap-0">
        {(['temps', 'effort', 'pourcentageVMA'] as TypeObjectif[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 px-4 py-2.5 text-sm border cursor-pointer transition-colors ${
              type === t
                ? 'bg-bg-active border-accent text-text'
                : 'bg-transparent border-border-strong text-text-muted hover:text-text-secondary'
            }`}
          >
            {t === 'temps' ? 'Temps cible' : t === 'effort' ? "Niveau d'effort" : '% VMA'}
          </button>
        ))}
      </div>

      {type === 'temps' && (
        <div>
          <label className="block text-xs font-mono text-text-muted tracking-[0.12em] mb-1">
            TEMPS CIBLE (HH:MM:SS)
          </label>
          <input
            type="text"
            value={tempsStr}
            onChange={(e) => setTempsStr(e.target.value)}
            placeholder="3:30:00"
            className="w-full bg-bg-surface border border-border-strong text-text px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none"
          />
        </div>
      )}

      {type === 'effort' && (
        <div className="flex gap-0">
          {(['confort', 'performance', 'record'] as NiveauEffort[]).map((n) => (
            <button
              key={n}
              onClick={() => setEffort(n)}
              className={`flex-1 px-4 py-3 text-sm border cursor-pointer transition-colors ${
                effort === n
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-transparent border-border-strong text-text-muted hover:text-text'
              }`}
            >
              {n === 'confort' ? 'Confort' : n === 'performance' ? 'Performance' : 'Record'}
            </button>
          ))}
        </div>
      )}

      {type === 'pourcentageVMA' && (
        <div>
          <label className="block text-xs font-mono text-text-muted tracking-[0.12em] mb-1">
            % DE VMA : {pctVMA}%
          </label>
          <input
            type="range"
            min={60}
            max={100}
            value={pctVMA}
            onChange={(e) => setPctVMA(+e.target.value)}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1">
            <span>60% (récup)</span>
            <span>80% (marathon)</span>
            <span>100% (VMA)</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="w-full bg-accent text-bg py-2.5 text-sm font-semibold tracking-[0.08em] cursor-pointer hover:brightness-110 transition-all border-none"
      >
        DEFINIR L'OBJECTIF
      </button>
    </div>
  );
}
