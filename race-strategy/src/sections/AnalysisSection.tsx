import { useState } from 'react';
import { usePlanStore } from '../store/plan-store';
import { GpxUpload } from '../components/GpxUpload';
import { ComparisonTable } from '../components/ComparisonTable';
import { analyserPostCourse } from '../engine/post-race';
import { formaterTempsPassage, formaterDureeCompacte } from '../engine/format';
import type { Parcours } from '../models/gpx';
import { genererPDFPostCourse } from '../io/pdf-post-race';

export function AnalysisSection() {
  const { scenarios, scenarioActif, analyse, setAnalyse } = usePlanStore();
  const [erreur, setErreur] = useState<string | null>(null);

  const scenario = scenarios.find((s) => s.type === scenarioActif);

  function handleGPXRealise(parcours: Parcours) {
    if (!scenario) {
      setErreur("Générez d'abord un plan de course dans l'onglet Parcours.");
      return;
    }
    setErreur(null);
    const result = analyserPostCourse(scenario.splits, parcours);
    setAnalyse(result);
  }

  function exportPDF() {
    if (!analyse) return;
    const blob = genererPDFPostCourse(analyse);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analyse-post-course.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  const splitLabels = {
    negative: 'Negative split',
    positive: 'Positive split',
    even: 'Even split',
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h1 className="font-display font-extrabold text-2xl">Analyse post-course</h1>
      <p className="text-sm text-text-secondary">
        Importez le GPX enregistré par votre montre pour comparer votre course au plan prévu.
      </p>

      {!scenario && !analyse && (
        <div className="border border-border p-6 text-center">
          <p className="text-text-muted text-sm">
            Aucun plan de course disponible. Générez d'abord une stratégie dans l'onglet "Parcours".
          </p>
        </div>
      )}

      {scenario && !analyse && (
        <div className="space-y-4">
          <div className="bg-bg-raised border border-border p-4 text-sm">
            <p className="text-text-muted font-mono text-[10px] tracking-[0.16em]">PLAN DE REFERENCE</p>
            <p className="font-medium mt-1">
              {scenario.label} — <span className="font-mono text-accent">{formaterTempsPassage(scenario.tempsFinal)}</span>
            </p>
          </div>
          <GpxUpload onParcours={handleGPXRealise} label="Importer le GPX de votre course" />
          {erreur && <p className="text-sm text-accent">{erreur}</p>}
        </div>
      )}

      {analyse && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card label="TEMPS PREVU" value={formaterTempsPassage(analyse.indicateurs.tempsPrevuTotal)} />
            <Card label="TEMPS REALISE" value={formaterTempsPassage(analyse.indicateurs.tempsReelTotal)} />
            <Card label="ECART TOTAL" value={formaterDureeCompacte(analyse.indicateurs.ecartTotal)}
              color={analyse.indicateurs.ecartTotal > 0 ? 'text-accent' : 'text-accent-blue'} />
            <Card label="REGULARITE (σ)" value={`${analyse.indicateurs.regularite} sec/km`}
              color={analyse.indicateurs.regularite < 10 ? 'text-accent-blue' : 'text-accent-orange'} />
            <Card label="SPLIT REEL" value={splitLabels[analyse.indicateurs.splitReel]} />
            <Card label="KM +RAPIDE / +LENT"
              value={`${analyse.indicateurs.kmPlusRapide} / ${analyse.indicateurs.kmPlusLent}`} />
          </div>

          <div className="bg-bg-raised border border-border p-5">
            <div className="font-mono text-[10px] text-text-muted tracking-[0.16em] mb-3">DIAGNOSTIC</div>
            <ul className="space-y-2">
              {analyse.diagnostics.map((d, i) => (
                <li key={i} className="text-sm text-text-surface flex gap-2">
                  <span className="text-accent shrink-0">•</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-border overflow-hidden">
            <ComparisonTable comparaisons={analyse.comparaisons} />
          </div>

          <div className="flex gap-3">
            <button onClick={exportPDF}
              className="flex-1 bg-accent text-bg py-2.5 text-sm font-semibold tracking-[0.08em] cursor-pointer border-none hover:brightness-110">
              EXPORTER L'ANALYSE PDF
            </button>
            <button
              onClick={() => setAnalyse(null as unknown as typeof analyse)}
              className="flex-1 bg-transparent text-text border border-border-strong py-2.5 text-sm tracking-[0.08em] cursor-pointer hover:border-text-muted">
              ANALYSER UNE AUTRE COURSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color = 'text-text' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-raised border border-border p-4">
      <p className="text-[10px] font-mono text-text-muted tracking-[0.16em] mb-1">{label}</p>
      <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
    </div>
  );
}
