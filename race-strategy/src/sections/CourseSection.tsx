import { useState, useMemo } from 'react';
import type { Parcours, Segment } from '../models/gpx';
import type { Objectif } from '../models/objective';
import { useAthleteStore } from '../store/athlete-store';
import { usePlanStore } from '../store/plan-store';
import { GpxUpload } from '../components/GpxUpload';
import { ObjectiveForm } from '../components/ObjectiveForm';
import { SplitsTable } from '../components/SplitsTable';
import { ElevationChart } from '../components/ElevationChart';
import type { TypeScenario } from '../models/strategy';
import { calculerVMA } from '../engine/vma';
import { analyserHistorique } from '../engine/experience';
import { calculerAllurePlate, calculerTempsCible } from '../engine/pacing';
import { genererTousScenarios } from '../engine/splits';
import { validerObjectif } from '../engine/validation';
import { formaterTempsPassage } from '../engine/format';
import { genererPDFPreCourse } from '../io/pdf-pre-race';
import { genererFichierGarmin } from '../io/fit-export';
import { encoderPlan } from '../io/share-link';

interface ParcoursEntry {
  id: string;
  nom: string;
  parcours: Parcours;
  type: 'gpx' | 'manuel';
}

export function CourseSection() {
  const { profil, historique } = useAthleteStore();
  const { scenarios, scenarioActif, setScenarios, setScenarioActif, validation, setValidation, setParcours, setObjectif } = usePlanStore();

  const [entries, setEntries] = useState<ParcoursEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ nom: '', distance: '', dplus: '', dmoins: '' });
  const [copied, setCopied] = useState(false);

  const selectedEntry = entries.find((e) => e.id === selectedId);
  const selectedParcours = selectedEntry?.parcours ?? null;
  const scenario = scenarios.find((s) => s.type === scenarioActif);

  function addGPX(parcours: Parcours) {
    const id = crypto.randomUUID();
    const entry: ParcoursEntry = { id, nom: parcours.nom, parcours, type: 'gpx' };
    setEntries((prev) => [...prev, entry]);
    setSelectedId(id);
    resetPlan();
  }

  function addManual() {
    const dist = parseFloat(manualForm.distance);
    if (!dist || !manualForm.nom) return;
    const dplus = parseFloat(manualForm.dplus) || 0;
    const dmoins = parseFloat(manualForm.dmoins) || 0;
    const distM = dist * 1000;
    const nbKm = Math.ceil(dist);
    const dpParKm = dplus / nbKm;
    const dmParKm = dmoins / nbKm;

    const segments: Segment[] = Array.from({ length: nbKm }, (_, i) => ({
      km: i + 1,
      distance: i === nbKm - 1 ? distM - i * 1000 : 1000,
      denivelePositif: Math.round(dpParKm),
      deniveleNegatif: Math.round(dmParKm),
      deniveleNet: Math.round(dpParKm - dmParKm),
      pente: Math.round(((dpParKm - dmParKm) / 1000) * 10000) / 100,
    }));

    const parcours: Parcours = {
      nom: manualForm.nom,
      distanceTotale: distM,
      denivelePositifTotal: dplus,
      deniveleNegatifTotal: dmoins,
      points: [],
      segments,
    };

    const id = crypto.randomUUID();
    setEntries((prev) => [...prev, { id, nom: manualForm.nom, parcours, type: 'manuel' }]);
    setSelectedId(id);
    setShowManual(false);
    setManualForm({ nom: '', distance: '', dplus: '', dmoins: '' });
    resetPlan();
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      resetPlan();
    }
  }

  function resetPlan() {
    setScenarios([]);
    setValidation(null);
  }

  function generer(objectif: Objectif) {
    if (!profil || !selectedParcours) return;

    setObjectif(objectif);
    setParcours(selectedParcours);

    const vma = profil.vmaOverride ?? calculerVMA(profil.temps1500m);
    const coefficients = analyserHistorique(historique, vma);
    const allurePlate = calculerAllurePlate(objectif, selectedParcours.distanceTotale, vma);
    const tempsCible = calculerTempsCible(objectif, selectedParcours.distanceTotale, vma);
    const distanceKm = selectedParcours.distanceTotale / 1000;

    const v = validerObjectif(tempsCible, distanceKm, vma, profil.historique);
    setValidation(v);

    const s = genererTousScenarios(selectedParcours.segments, allurePlate, coefficients, profil.poids);
    setScenarios(s);
  }

  function exportPDF() {
    if (!scenario || !selectedParcours) return;
    const blob = genererPDFPreCourse(scenario, selectedParcours);
    download(blob, `plan-course-${scenario.type}.pdf`);
  }

  function exportGarmin() {
    if (!scenario || !selectedParcours) return;
    const blob = genererFichierGarmin(scenario.splits, selectedParcours);
    download(blob, `course-${selectedParcours.nom}.tcx`);
  }

  function copierLien() {
    if (!scenario) return;
    navigator.clipboard.writeText(encoderPlan(scenario));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!profil) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">Configurez d'abord votre profil athlète.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Parcours & Stratégie</h1>

      {/* GPX upload + liste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <GpxUpload onParcours={addGPX} label="Ajouter un fichier GPX" />
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showManual ? 'Annuler' : '+ Saisie manuelle (sans GPX)'}
          </button>
          {showManual && (
            <div className="space-y-2 bg-gray-50 rounded-lg p-4">
              <input type="text" placeholder="Nom du parcours" value={manualForm.nom} onChange={(e) => setManualForm((f) => ({ ...f, nom: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Distance (km)" value={manualForm.distance} onChange={(e) => setManualForm((f) => ({ ...f, distance: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                <input type="number" placeholder="D+ (m)" value={manualForm.dplus} onChange={(e) => setManualForm((f) => ({ ...f, dplus: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                <input type="number" placeholder="D- (m)" value={manualForm.dmoins} onChange={(e) => setManualForm((f) => ({ ...f, dmoins: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <button onClick={addManual} className="w-full bg-gray-900 text-white rounded-md py-2 text-sm font-medium hover:bg-gray-800">
                Ajouter
              </button>
            </div>
          )}
        </div>

        {/* Liste des parcours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Parcours disponibles</label>
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun parcours ajouté</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div
                  key={e.id}
                  onClick={() => { setSelectedId(e.id); resetPlan(); }}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 cursor-pointer transition-colors border ${
                    selectedId === e.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{e.nom}</p>
                    <p className="text-xs text-gray-500">
                      {(e.parcours.distanceTotale / 1000).toFixed(1)} km
                      {e.parcours.denivelePositifTotal > 0 && ` — D+${e.parcours.denivelePositifTotal}m`}
                      <span className="ml-2 text-gray-400">{e.type === 'gpx' ? 'GPX' : 'Manuel'}</span>
                    </p>
                  </div>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); removeEntry(e.id); }}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Altimétrie */}
      {selectedParcours && selectedEntry?.type === 'gpx' && selectedParcours.points.length > 0 && (
        <ElevationChart parcours={selectedParcours} />
      )}

      {/* Résumé parcours sélectionné */}
      {selectedParcours && (
        <div className="bg-gray-50 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Parcours sélectionné : {selectedParcours.nom}</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <Stat label="Distance" value={`${(selectedParcours.distanceTotale / 1000).toFixed(1)} km`} />
            <Stat label="D+" value={`${selectedParcours.denivelePositifTotal} m`} />
            <Stat label="D-" value={`${selectedParcours.deniveleNegatifTotal} m`} />
          </div>
        </div>
      )}

      {/* Objectif + génération */}
      {selectedParcours && (
        <ObjectiveForm onSubmit={generer} />
      )}

      {/* Validation warning */}
      {validation && !validation.valide && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          {validation.message}
        </div>
      )}

      {/* Scénarios + splits */}
      {scenarios.length > 0 && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {scenarios.map((s) => (
              <button
                key={s.type}
                onClick={() => setScenarioActif(s.type as TypeScenario)}
                className={`flex-1 px-4 py-3 rounded-lg text-sm transition-colors ${
                  scenarioActif === s.type ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <p className="font-medium">{s.label}</p>
                <p className={`text-xs mt-0.5 ${scenarioActif === s.type ? 'text-gray-300' : 'text-gray-400'}`}>
                  {formaterTempsPassage(s.tempsFinal)}
                </p>
              </button>
            ))}
          </div>

          {scenario && (
            <>
              <div>
                <p className="text-sm text-gray-500 mb-1">{scenario.description}</p>
                <p className="text-sm font-medium text-gray-900">
                  Temps estimé : {formaterTempsPassage(scenario.tempsFinal)}
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <SplitsTable splits={scenario.splits} />
              </div>

              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Nutrition & Hydratation</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <Stat label="Calories" value={`${scenario.nutrition.caloriesTotales} kcal`} />
                  <Stat label="Hydratation" value={`${scenario.nutrition.hydratationMlParHeure} ml/h`} />
                  <Stat label="Gels" value={scenario.nutrition.gels.length > 0 ? scenario.nutrition.gels.map((g) => `km ${g.km}`).join(', ') : 'Aucun'} />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={exportPDF} className="flex-1 bg-gray-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors">
                  Exporter PDF
                </button>
                <button onClick={exportGarmin} className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                  Export Garmin (.tcx)
                </button>
                <button onClick={copierLien} className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                  {copied ? 'Copié !' : 'Copier le lien'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
