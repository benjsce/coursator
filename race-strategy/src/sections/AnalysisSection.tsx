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
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Analyse post-course</h1>
      <p className="text-sm text-gray-500">
        Importez le GPX enregistré par votre montre pour comparer votre course au plan prévu.
      </p>

      {!scenario && !analyse && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500 text-sm">
            Aucun plan de course disponible. Générez d'abord une stratégie dans l'onglet "Parcours & Stratégie".
          </p>
        </div>
      )}

      {scenario && !analyse && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <p className="text-gray-500">Plan de référence</p>
            <p className="font-medium text-gray-900">
              {scenario.label} — {formaterTempsPassage(scenario.tempsFinal)}
            </p>
          </div>
          <GpxUpload onParcours={handleGPXRealise} label="Importer le GPX de votre course" />
          {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        </div>
      )}

      {analyse && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card label="Temps prévu" value={formaterTempsPassage(analyse.indicateurs.tempsPrevuTotal)} />
            <Card label="Temps réalisé" value={formaterTempsPassage(analyse.indicateurs.tempsReelTotal)} />
            <Card
              label="Écart total"
              value={formaterDureeCompacte(analyse.indicateurs.ecartTotal)}
              color={analyse.indicateurs.ecartTotal > 0 ? 'text-red-600' : 'text-green-600'}
            />
            <Card
              label="Régularité (σ)"
              value={`${analyse.indicateurs.regularite} sec/km`}
              color={analyse.indicateurs.regularite < 10 ? 'text-green-600' : 'text-amber-600'}
            />
            <Card label="Split réel" value={splitLabels[analyse.indicateurs.splitReel]} />
            <Card
              label="km +rapide / +lent"
              value={`${analyse.indicateurs.kmPlusRapide} / ${analyse.indicateurs.kmPlusLent}`}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Diagnostic</h3>
            <ul className="space-y-2">
              {analyse.diagnostics.map((d, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-gray-400 shrink-0">•</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <ComparisonTable comparaisons={analyse.comparaisons} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportPDF}
              className="flex-1 bg-gray-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Exporter l'analyse PDF
            </button>
            <button
              onClick={() => setAnalyse(null as unknown as typeof analyse)}
              className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Analyser une autre course
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color = 'text-gray-900' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
