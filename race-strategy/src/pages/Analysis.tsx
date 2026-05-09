import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../store/plan-store';
import { GpxUpload } from '../components/GpxUpload';
import { ComparisonTable } from '../components/ComparisonTable';
import { analyserPostCourse } from '../engine/post-race';
import { formaterTempsPassage, formaterDureeCompacte } from '../engine/format';
import type { Parcours } from '../models/gpx';
import { genererPDFPostCourse } from '../io/pdf-post-race';

export function Analysis() {
  const navigate = useNavigate();
  const { scenarios, scenarioActif, analyse, setAnalyse } = usePlanStore();
  const [erreur, setErreur] = useState<string | null>(null);

  const scenario = scenarios.find((s) => s.type === scenarioActif);

  function handleGPXRealise(parcours: Parcours) {
    if (!scenario) {
      setErreur('Générez d\'abord un plan de course avant d\'analyser.');
      return;
    }
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
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analyse post-course</h1>
            <p className="text-sm text-gray-500 mt-1">
              Comparez votre course réelle avec le plan prévu
            </p>
          </div>
          <button
            onClick={() => navigate('/plan')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Retour au plan
          </button>
        </div>

        {!scenario && (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">Aucun plan de course disponible.</p>
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Créer un plan de course
            </button>
          </div>
        )}

        {scenario && !analyse && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Plan de référence : <span className="font-medium">{scenario.label}</span> —{' '}
              {formaterTempsPassage(scenario.tempsFinal)}
            </p>
            <GpxUpload onParcours={handleGPXRealise} label="Importer le GPX de votre course" />
            {erreur && <p className="text-sm text-red-600">{erreur}</p>}
          </div>
        )}

        {analyse && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <Card
                label="Temps prévu"
                value={formaterTempsPassage(analyse.indicateurs.tempsPrevuTotal)}
              />
              <Card
                label="Temps réalisé"
                value={formaterTempsPassage(analyse.indicateurs.tempsReelTotal)}
              />
              <Card
                label="Écart total"
                value={formaterDureeCompacte(analyse.indicateurs.ecartTotal)}
                color={analyse.indicateurs.ecartTotal > 0 ? 'text-red-600' : 'text-green-600'}
              />
              <Card
                label="Régularité"
                value={`${analyse.indicateurs.regularite} sec/km`}
                color={analyse.indicateurs.regularite < 10 ? 'text-green-600' : 'text-amber-600'}
              />
              <Card label="Split réel" value={splitLabels[analyse.indicateurs.splitReel]} />
              <Card
                label="km le + rapide / lent"
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
    </div>
  );
}

function Card({
  label,
  value,
  color = 'text-gray-900',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
