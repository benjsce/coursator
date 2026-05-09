import { useState } from 'react';
import type { Objectif, TypeObjectif, NiveauEffort } from '../models/objective';
import { TimeInput } from './TimeInput';
import { useAthleteStore } from '../store/athlete-store';
import { analyserProfilCoureur, predireTempsCourse } from '../engine/analytics';
import { formaterTempsPassage, formaterAllure } from '../engine/format';

interface Props {
  onSubmit: (objectif: Objectif) => void;
  /** Prediction du temps adapté à la course en cours (utilise dénivelé). */
  distanceKm?: number;
  denivelePosM?: number;
  deniveleNegM?: number;
}

export function ObjectiveForm({ onSubmit, distanceKm, denivelePosM = 0, deniveleNegM = 0 }: Props) {
  const { profil, historique } = useAthleteStore();
  const [type, setType] = useState<TypeObjectif>('temps');
  const [tempsStr, setTempsStr] = useState('');
  const [tempsParsed, setTempsParsed] = useState<number | null>(null);
  const [effort, setEffort] = useState<NiveauEffort>('performance');
  const [pctVMA, setPctVMA] = useState(80);

  // Prédiction adaptée à la course
  const prediction = profil && distanceKm
    ? predireTempsCourse(
        analyserProfilCoureur({ ...profil, historique }),
        distanceKm,
        denivelePosM,
        deniveleNegM
      )
    : null;

  function handleSubmit() {
    switch (type) {
      case 'temps': {
        if (tempsParsed === null) return;
        onSubmit({ type: 'temps', tempsCible: tempsParsed });
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

  function appliquerPrediction(temps: number) {
    setTempsStr(formaterTempsPassage(temps));
    setTempsParsed(temps);
  }

  const submitDisabled = type === 'temps' && tempsParsed === null;

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-lg">Objectif</h2>

      {/* Prediction adaptée */}
      {prediction && type === 'temps' && (
        <div className="bg-bg-raised border border-border p-4">
          <div className="font-mono text-[10px] text-accent tracking-[0.16em] mb-2">
            PREDICTION BASEE SUR VOTRE PROFIL
          </div>
          <div className="flex items-baseline gap-4 flex-wrap">
            <div>
              <div className="font-display font-extrabold text-2xl text-text leading-none">
                {formaterTempsPassage(prediction.tempsPredit)}
              </div>
              <div className="font-mono text-[10px] text-text-muted mt-1">
                {formaterAllure(prediction.allurePredite)}/km moyen
              </div>
            </div>
            <div className="font-mono text-[11px] text-text-secondary">
              <div>plage : {formaterTempsPassage(prediction.plageBasse)} – {formaterTempsPassage(prediction.plageHaute)}</div>
              {prediction.surcoutDenivele > 30 && (
                <div className="text-text-muted mt-0.5">
                  surcoût dénivelé : +{Math.floor(prediction.surcoutDenivele / 60)}min{(prediction.surcoutDenivele % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
            <div className="ml-auto flex gap-1.5">
              <button onClick={() => appliquerPrediction(prediction.plageBasse)}
                className="px-2 py-1 text-[10px] font-mono border border-border-strong text-text-secondary hover:text-text hover:border-accent bg-transparent cursor-pointer">
                ambitieux
              </button>
              <button onClick={() => appliquerPrediction(prediction.tempsPredit)}
                className="px-2 py-1 text-[10px] font-mono border border-accent text-accent hover:bg-bg-active bg-transparent cursor-pointer">
                réaliste
              </button>
              <button onClick={() => appliquerPrediction(prediction.plageHaute)}
                className="px-2 py-1 text-[10px] font-mono border border-border-strong text-text-secondary hover:text-text hover:border-accent bg-transparent cursor-pointer">
                conservateur
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-0">
        {(['temps', 'effort', 'pourcentageVMA'] as TypeObjectif[]).map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`flex-1 px-4 py-2.5 text-sm border cursor-pointer transition-colors ${
              type === t
                ? 'bg-bg-active border-accent text-text'
                : 'bg-transparent border-border-strong text-text-muted hover:text-text-secondary'
            }`}>
            {t === 'temps' ? 'Temps cible' : t === 'effort' ? "Niveau d'effort" : '% VMA'}
          </button>
        ))}
      </div>

      {type === 'temps' && (
        <div>
          <label className="block text-xs font-mono text-text-muted tracking-[0.12em] mb-1">
            TEMPS CIBLE
          </label>
          <TimeInput
            value={tempsStr}
            onChange={(v, p) => { setTempsStr(v); setTempsParsed(p); }}
            placeholder="3h30 ou 3:30:00"
            className="w-full bg-bg-surface border text-text px-3 py-2 text-sm font-mono focus:outline-none"
          />
        </div>
      )}

      {type === 'effort' && (
        <div className="flex gap-0">
          {(['confort', 'performance', 'record'] as NiveauEffort[]).map((n) => (
            <button key={n} onClick={() => setEffort(n)}
              className={`flex-1 px-4 py-3 text-sm border cursor-pointer transition-colors ${
                effort === n
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-transparent border-border-strong text-text-muted hover:text-text'
              }`}>
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
          <input type="range" min={60} max={100} value={pctVMA}
            onChange={(e) => setPctVMA(+e.target.value)} className="w-full" />
          <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1">
            <span>60% (récup)</span>
            <span>80% (marathon)</span>
            <span>100% (VMA)</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitDisabled}
        className={`w-full py-2.5 text-sm font-semibold tracking-[0.08em] cursor-pointer transition-all border-none ${
          submitDisabled
            ? 'bg-border-strong text-text-muted cursor-not-allowed'
            : 'bg-accent text-bg hover:brightness-110'
        }`}
      >
        DEFINIR L'OBJECTIF
      </button>
    </div>
  );
}
