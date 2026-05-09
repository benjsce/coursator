import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '../store/plan-store';
import { SplitsTable } from '../components/SplitsTable';
import type { TypeScenario } from '../models/strategy';
import { formaterTempsPassage } from '../engine/format';
import { genererPDFPreCourse } from '../io/pdf-pre-race';
import { genererFichierGarmin } from '../io/fit-export';
import { encoderPlan } from '../io/share-link';

export function Plan() {
  const navigate = useNavigate();
  const { parcours, scenarios, scenarioActif, setScenarioActif, validation } = usePlanStore();

  const scenario = scenarios.find((s) => s.type === scenarioActif);

  if (!scenario || !parcours) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Aucun plan généré.</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Retour à la configuration
          </button>
        </div>
      </div>
    );
  }

  function exportPDF() {
    if (!scenario || !parcours) return;
    const blob = genererPDFPreCourse(scenario, parcours);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-course-${scenario.type}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportGarmin() {
    if (!scenario || !parcours) return;
    const blob = genererFichierGarmin(scenario.splits, parcours);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-${parcours.nom}.tcx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copierLien() {
    if (!scenario) return;
    const lien = encoderPlan(scenario);
    navigator.clipboard.writeText(lien);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plan de course</h1>
            <p className="text-sm text-gray-500 mt-1">
              {parcours.nom} — {(parcours.distanceTotale / 1000).toFixed(1)} km
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Nouvelle stratégie
          </button>
        </div>

        {validation && !validation.valide && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
            {validation.message}
          </div>
        )}

        <div className="flex gap-2 mb-8">
          {scenarios.map((s) => (
            <button
              key={s.type}
              onClick={() => setScenarioActif(s.type as TypeScenario)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm transition-colors ${
                scenarioActif === s.type
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <p className="font-medium">{s.label}</p>
              <p className={`text-xs mt-0.5 ${scenarioActif === s.type ? 'text-gray-300' : 'text-gray-400'}`}>
                {formaterTempsPassage(s.tempsFinal)}
              </p>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">{scenario.description}</p>
          <p className="text-sm font-medium text-gray-900">
            Temps estimé : {formaterTempsPassage(scenario.tempsFinal)}
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
          <SplitsTable splits={scenario.splits} />
        </div>

        <div className="bg-gray-50 rounded-lg p-5 mb-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Nutrition & Hydratation</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Calories</p>
              <p className="font-medium text-gray-900">{scenario.nutrition.caloriesTotales} kcal</p>
            </div>
            <div>
              <p className="text-gray-500">Hydratation</p>
              <p className="font-medium text-gray-900">{scenario.nutrition.hydratationMlParHeure} ml/h</p>
            </div>
            <div>
              <p className="text-gray-500">Gels</p>
              <p className="font-medium text-gray-900">
                {scenario.nutrition.gels.length > 0
                  ? scenario.nutrition.gels.map((g) => `km ${g.km}`).join(', ')
                  : 'Aucun'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportPDF}
            className="flex-1 bg-gray-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Exporter PDF
          </button>
          <button
            onClick={exportGarmin}
            className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Export Garmin (.tcx)
          </button>
          <button
            onClick={copierLien}
            className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Copier le lien
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/analysis')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Analyser une course terminée
          </button>
        </div>
      </div>
    </div>
  );
}
