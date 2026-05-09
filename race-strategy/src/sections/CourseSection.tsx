import { useState } from 'react';
import type { Parcours, Segment } from '../models/gpx';
import type { Objectif } from '../models/objective';
import { useAthleteStore } from '../store/athlete-store';
import { usePlanStore } from '../store/plan-store';
import { GpxUpload } from '../components/GpxUpload';
import { ObjectiveForm } from '../components/ObjectiveForm';
import { SplitsTable } from '../components/SplitsTable';
import { ElevationPaceChart } from '../components/ElevationPaceChart';
import type { TypeScenario } from '../models/strategy';
import { calculerVMA } from '../engine/vma';
import { analyserHistorique } from '../engine/experience';
import { calculerAllurePlate, calculerTempsCible } from '../engine/pacing';
import { genererTousScenarios } from '../engine/splits';
import { validerObjectif } from '../engine/validation';
import { formaterTempsPassage, formaterAllure } from '../engine/format';
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

  const SCEN_LABELS: Record<string, { code: string; label: string }> = {
    conservateur: { code: 'CONS', label: 'Conservateur' },
    regulier: { code: 'REG', label: 'Régulier' },
    competition: { code: 'COMP', label: 'Compétition' },
  };

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
      <div className="p-12 text-center border border-border m-6">
        <p className="text-text-muted text-sm">Configurez d'abord votre profil athlète.</p>
      </div>
    );
  }

  // --- PLAN VIEW (V1 Cockpit) ---
  if (scenarios.length > 0 && selectedParcours && scenario) {
    const distKm = selectedParcours.distanceTotale / 1000;
    const allureMoy = scenario.tempsFinal / distKm;

    return (
      <div className="flex flex-col h-full">
        {/* Course header */}
        <section className="px-6 pt-4 pb-3 border-b border-border flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[10px] text-text-muted tracking-[0.18em]">
              COURSE — {selectedParcours.nom.toUpperCase()}
            </div>
            <h1 className="mt-1 font-display font-extrabold text-[38px] leading-none tracking-tight">
              {selectedParcours.nom}
            </h1>
          </div>
          <div className="flex gap-7 font-mono">
            <StatBlock label="DISTANCE" value={distKm.toFixed(1)} unit="km" />
            <StatBlock label="D+" value={selectedParcours.denivelePositifTotal} unit="m" />
            <StatBlock label="D-" value={selectedParcours.deniveleNegatifTotal} unit="m" />
            <StatBlock label="OBJECTIF" value={formaterTempsPassage(scenario.tempsFinal)} accent />
          </div>
        </section>

        {/* Scenario tabs */}
        <div className="px-6 py-2.5 border-b border-border flex gap-0">
          {scenarios.map((s) => {
            const active = scenarioActif === s.type;
            const info = SCEN_LABELS[s.type] ?? { code: s.type.slice(0, 4).toUpperCase(), label: s.label };
            return (
              <button key={s.type} onClick={() => setScenarioActif(s.type as TypeScenario)}
                className={`flex-1 px-3.5 py-2.5 text-left border cursor-pointer transition-colors ${
                  active ? 'bg-bg-active border-accent' : 'bg-transparent border-border-strong'
                }`}
                style={{ borderRight: 'none' }}
              >
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-[10px] tracking-[0.16em] ${active ? 'text-accent' : 'text-text-muted'}`}>
                    {info.code}
                  </span>
                  <span className="font-mono text-[13px]">{formaterTempsPassage(s.tempsFinal)}</span>
                </div>
                <div className="text-[13px] mt-0.5">{info.label}</div>
              </button>
            );
          })}
          <div className="border-r border-border-strong" />
        </div>

        {/* Main grid */}
        <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: '1fr 360px' }}>
          {/* Chart panel */}
          <div className="border-r border-border flex flex-col">
            <div className="px-6 pt-3.5 pb-1.5 flex justify-between items-baseline">
              <div className="font-mono text-[10px] text-text-muted tracking-[0.16em]">
                PROFIL · ALLURE PREVUE
              </div>
              <div className="flex gap-4 font-mono text-[11px] text-text-secondary">
                <span>
                  <span className="inline-block w-2.5 h-0.5 bg-text-dim align-middle mr-1" />
                  élévation
                </span>
                <span>
                  <span className="inline-block w-2.5 h-0.5 bg-accent align-middle mr-1" />
                  allure
                </span>
                {scenario.nutrition.gels.length > 0 && (
                  <span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1" />
                    gel
                  </span>
                )}
              </div>
            </div>
            <div className="px-3 pb-2">
              <ElevationPaceChart
                parcours={selectedParcours}
                splits={scenario.splits}
                nutrition={scenario.nutrition}
                width={760}
                height={240}
              />
            </div>

            {/* Section breakdown */}
            <div className="grid grid-cols-3 border-t border-b border-border">
              {[
                {
                  code: '01', label: 'Départ',
                  range: `0 — ${Math.round(distKm * 0.3)} km`,
                  cible: `${formaterAllure(allureMoy * 1.04)}/km`,
                  note: 'Patience — ne pas se laisser emporter'
                },
                {
                  code: '02', label: 'Milieu',
                  range: `${Math.round(distKm * 0.3)} — ${Math.round(distKm * 0.7)} km`,
                  cible: `${formaterAllure(allureMoy)}/km`,
                  note: 'Régularité, FC stable'
                },
                {
                  code: '03', label: 'Fin',
                  range: `${Math.round(distKm * 0.7)} — ${distKm.toFixed(1)} km`,
                  cible: `${formaterAllure(allureMoy * 0.97)}/km`,
                  note: 'Tout donner, mental sur les derniers km'
                },
              ].map((sec, i) => (
                <div key={sec.code}
                  className={`px-4.5 py-3.5 ${i < 2 ? 'border-r border-border' : ''}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-accent">{sec.code}</span>
                    <span className="font-display font-bold text-lg">{sec.label}</span>
                  </div>
                  <div className="font-mono text-[10px] text-text-muted mt-0.5 tracking-[0.06em]">
                    {sec.range.toUpperCase()}
                  </div>
                  <div className="font-mono text-xs mt-2">{sec.cible}</div>
                  <div className="text-[11px] text-text-secondary mt-1 leading-relaxed">{sec.note}</div>
                </div>
              ))}
            </div>

            {/* Splits table */}
            <div className="flex-1 overflow-y-auto">
              <SplitsTable splits={scenario.splits} />
            </div>
          </div>

          {/* Right rail */}
          <aside className="flex flex-col">
            <RailBlock title="ATHLETE">
              <KV k="Poids" v={`${profil.poids} kg`} />
              <KV k="Cadence" v={`${profil.cadence} pas/min`} />
              {profil.fcMax && <KV k="FC max" v={`${profil.fcMax} bpm`} />}
              {profil.fcRepos && <KV k="FC repos" v={`${profil.fcRepos} bpm`} />}
            </RailBlock>
            <RailBlock title="CIBLES COURSE">
              <KV k="Allure moy." v={formaterAllure(allureMoy) + '/km'} accent />
              <KV k="Temps total" v={formaterTempsPassage(scenario.tempsFinal)} accent />
            </RailBlock>
            <RailBlock title="NUTRITION & HYDRA.">
              <KV k="Calories" v={`${scenario.nutrition.caloriesTotales} kcal`} />
              <KV k="Hydratation" v={`${scenario.nutrition.hydratationMlParHeure} ml/h`} />
              <KV k="Gels" v={scenario.nutrition.gels.length > 0
                ? `${scenario.nutrition.gels.length} (km ${scenario.nutrition.gels.map(g => g.km).join(', ')})`
                : 'Aucun'
              } />
            </RailBlock>
            <div className="px-4.5 py-3.5 border-t border-border mt-auto flex flex-col gap-2">
              <div className="flex gap-2">
                <button onClick={exportPDF}
                  className="flex-1 py-2.5 bg-accent text-bg border-none text-xs font-semibold tracking-[0.08em] cursor-pointer hover:brightness-110">
                  EXPORTER PDF
                </button>
                <button onClick={exportGarmin}
                  className="flex-1 py-2.5 bg-transparent text-text border border-border-strong text-xs tracking-[0.08em] cursor-pointer hover:border-text-muted">
                  GARMIN .TCX
                </button>
              </div>
              <button onClick={copierLien}
                className="w-full py-2 bg-transparent text-text-secondary border border-border-strong text-xs tracking-[0.08em] cursor-pointer hover:border-text-muted">
                {copied ? 'COPIE !' : 'COPIER LE LIEN'}
              </button>
              <button onClick={() => { resetPlan(); }}
                className="w-full py-2 bg-transparent text-text-muted border border-border text-xs tracking-[0.08em] cursor-pointer hover:text-text-secondary">
                NOUVEAU PLAN
              </button>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // --- SETUP VIEW ---
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h1 className="font-display font-extrabold text-2xl">Parcours & Stratégie</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <GpxUpload onParcours={addGPX} label="Ajouter un fichier GPX" />
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-sm text-accent hover:brightness-125 bg-transparent border-none cursor-pointer"
          >
            {showManual ? 'Annuler' : '+ Saisie manuelle (sans GPX)'}
          </button>
          {showManual && (
            <div className="space-y-2 bg-bg-raised border border-border p-4">
              <input type="text" placeholder="Nom du parcours" value={manualForm.nom}
                onChange={(e) => setManualForm((f) => ({ ...f, nom: e.target.value }))}
                className="w-full bg-bg-surface border border-border-strong text-text px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Distance (km)" value={manualForm.distance}
                  onChange={(e) => setManualForm((f) => ({ ...f, distance: e.target.value }))}
                  className="bg-bg-surface border border-border-strong text-text px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none" />
                <input type="number" placeholder="D+ (m)" value={manualForm.dplus}
                  onChange={(e) => setManualForm((f) => ({ ...f, dplus: e.target.value }))}
                  className="bg-bg-surface border border-border-strong text-text px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none" />
                <input type="number" placeholder="D- (m)" value={manualForm.dmoins}
                  onChange={(e) => setManualForm((f) => ({ ...f, dmoins: e.target.value }))}
                  className="bg-bg-surface border border-border-strong text-text px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none" />
              </div>
              <button onClick={addManual}
                className="w-full bg-accent text-bg py-2 text-sm font-semibold tracking-[0.08em] cursor-pointer border-none hover:brightness-110">
                AJOUTER
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-mono text-text-muted tracking-[0.12em] mb-2">PARCOURS DISPONIBLES</label>
          {entries.length === 0 ? (
            <p className="text-sm text-text-muted">Aucun parcours ajouté</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id}
                  onClick={() => { setSelectedId(e.id); resetPlan(); }}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border ${
                    selectedId === e.id
                      ? 'border-accent bg-bg-active'
                      : 'border-border hover:bg-bg-hover'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{e.nom}</p>
                    <p className="text-xs text-text-secondary">
                      {(e.parcours.distanceTotale / 1000).toFixed(1)} km
                      {e.parcours.denivelePositifTotal > 0 && ` — D+${e.parcours.denivelePositifTotal}m`}
                      <span className="ml-2 text-text-muted">{e.type === 'gpx' ? 'GPX' : 'Manuel'}</span>
                    </p>
                  </div>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); removeEntry(e.id); }}
                    className="text-accent text-xs bg-transparent border-none cursor-pointer hover:brightness-125"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedParcours && selectedEntry?.type === 'gpx' && selectedParcours.points.length > 0 && (
        <div>
          <label className="block text-xs font-mono text-text-muted tracking-[0.12em] mb-2">PROFIL ALTIMETRIQUE</label>
          <div className="border border-border bg-bg-raised p-3">
            <ElevationPaceChart parcours={selectedParcours} width={760} height={200} />
          </div>
        </div>
      )}

      {selectedParcours && (
        <div className="bg-bg-raised border border-border p-5">
          <div className="font-mono text-[10px] text-text-muted tracking-[0.16em] mb-3">
            PARCOURS SELECTIONNE
          </div>
          <div className="flex gap-8 font-mono">
            <StatBlock label="DISTANCE" value={(selectedParcours.distanceTotale / 1000).toFixed(1)} unit="km" />
            <StatBlock label="D+" value={selectedParcours.denivelePositifTotal} unit="m" />
            <StatBlock label="D-" value={selectedParcours.deniveleNegatifTotal} unit="m" />
          </div>
        </div>
      )}

      {selectedParcours && <ObjectiveForm onSubmit={generer} />}

      {validation && !validation.valide && (
        <div className="border border-accent-orange bg-bg-raised p-4 text-sm text-accent-orange">
          {validation.message}
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value, unit, accent }: {
  label: string; value: string | number; unit?: string; accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[9px] text-text-muted tracking-[0.18em]">{label}</div>
      <div className={`font-display font-bold text-2xl leading-none mt-1 ${accent ? 'text-accent' : 'text-text'}`}>
        {value}
        {unit && <span className="text-xs text-text-muted ml-0.5 font-mono font-normal">{unit}</span>}
      </div>
    </div>
  );
}

function RailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4.5 py-3.5 border-b border-border">
      <div className="font-mono text-[10px] text-text-muted tracking-[0.16em] mb-2">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function KV({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-1 text-xs">
      <span className="text-text-secondary">{k}</span>
      <span className={`font-mono ${accent ? 'text-accent' : 'text-text'}`}>{v}</span>
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
