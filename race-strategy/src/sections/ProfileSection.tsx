import { useState } from 'react';
import type { ProfilAthlete, CourseHistorique, ZonesCardiaques } from '../models/athlete';
import { useAthleteStore } from '../store/athlete-store';
import { parseDuree, formaterAllure } from '../engine/format';
import { calculerVMA, calculerVO2max, allureSeuil, allureMarathon, allureEndurance, fcMaxTanaka } from '../engine/vma';

function formatSecToMMSS(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatSecToHMS(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function parseAllureInput(input: string): number | null {
  const m1 = input.match(/^(\d+)[':.](\d{1,2})"?$/);
  if (m1) return parseInt(m1[1]) * 60 + parseInt(m1[2].padEnd(2, '0'));
  const m2 = input.match(/^(\d+)$/);
  if (m2) return parseInt(m2[1]) * 60;
  return null;
}

const DEFAUT: ProfilAthlete = {
  age: 30,
  sexe: 'H',
  taille: 175,
  poids: 70,
  cadence: 170,
  temps1500m: 390,
  historique: [],
};

export function ProfileSection() {
  const { profil: saved, setProfil, historique, ajouterCourse, supprimerCourse } = useAthleteStore();
  const [profil, setProfilLocal] = useState<ProfilAthlete>(saved ?? DEFAUT);
  const [temps1500mStr, setTemps1500mStr] = useState(saved ? formatSecToMMSS(saved.temps1500m) : '6:30');
  const [showZones, setShowZones] = useState(!!saved?.zones);
  const [newCourse, setNewCourse] = useState({ distance: '', dplus: '', dmoins: '', temps: '' });
  const [dirty, setDirty] = useState(false);

  // Champs texte libres pour les overrides — on ne parse qu'au save
  const [vmaStr, setVmaStr] = useState(saved?.vmaOverride != null ? String(saved.vmaOverride) : '');
  const [seuilStr, setSeuilStr] = useState(saved?.allureSeuilOverride != null ? formaterAllure(saved.allureSeuilOverride) : '');
  const [marathonStr, setMarathonStr] = useState(saved?.allureMarathonOverride != null ? formaterAllure(saved.allureMarathonOverride) : '');
  const [enduranceStr, setEnduranceStr] = useState(saved?.allureEnduranceOverride != null ? formaterAllure(saved.allureEnduranceOverride) : '');

  function update<K extends keyof ProfilAthlete>(key: K, value: ProfilAthlete[K]) {
    setProfilLocal((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }

  function updateZone(zone: keyof ZonesCardiaques, index: 0 | 1, value: number) {
    const current = profil.zones ?? defaultZones(profil.fcMax ?? fcMaxTanaka(profil.age), profil.fcRepos ?? 60);
    const updated = { ...current, [zone]: [index === 0 ? value : current[zone][0], index === 1 ? value : current[zone][1]] };
    update('zones', updated);
  }

  function sauvegarder() {
    const t = parseDuree(temps1500mStr);
    if (!t) return;

    const vmaOv = vmaStr ? parseFloat(vmaStr.replace(',', '.')) : undefined;
    const seuilOv = seuilStr ? parseAllureInput(seuilStr) ?? undefined : undefined;
    const marathonOv = marathonStr ? parseAllureInput(marathonStr) ?? undefined : undefined;
    const enduranceOv = enduranceStr ? parseAllureInput(enduranceStr) ?? undefined : undefined;

    const p: ProfilAthlete = {
      ...profil,
      temps1500m: t,
      vmaOverride: vmaOv && !isNaN(vmaOv) ? vmaOv : undefined,
      allureSeuilOverride: seuilOv,
      allureMarathonOverride: marathonOv,
      allureEnduranceOverride: enduranceOv,
    };
    setProfil(p);
    setProfilLocal(p);
    setDirty(false);
  }

  function handleAjouterCourse() {
    const temps = parseDuree(newCourse.temps);
    if (!temps || !newCourse.distance) return;
    const course: CourseHistorique = {
      id: crypto.randomUUID(),
      distance: parseFloat(newCourse.distance),
      denivelePositif: parseFloat(newCourse.dplus) || 0,
      deniveleNegatif: parseFloat(newCourse.dmoins) || 0,
      temps,
    };
    ajouterCourse(course);
    setNewCourse({ distance: '', dplus: '', dmoins: '', temps: '' });
  }

  const t1500 = parseDuree(temps1500mStr);
  const vmaCalculee = t1500 ? calculerVMA(t1500) : null;
  const vmaEffective = (vmaStr ? parseFloat(vmaStr.replace(',', '.')) : null) ?? vmaCalculee;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Profil athlète</h1>
        <button
          onClick={sauvegarder}
          disabled={!dirty}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            dirty ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Sauvegarder
        </button>
      </div>

      {/* Infos de base */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Âge" type="number" value={profil.age} onChange={(v) => update('age', +v)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
          <select
            value={profil.sexe}
            onChange={(e) => update('sexe', e.target.value as 'H' | 'F')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="H">Homme</option>
            <option value="F">Femme</option>
          </select>
        </div>
        <Field label="Taille (cm)" type="number" value={profil.taille} onChange={(v) => update('taille', +v)} />
        <Field label="Poids (kg)" type="number" value={profil.poids} onChange={(v) => update('poids', +v)} />
      </div>

      {/* FC & Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="FC max (bpm)" type="number" value={profil.fcMax ?? ''} onChange={(v) => update('fcMax', v ? +v : undefined)} placeholder={`Auto: ${fcMaxTanaka(profil.age)}`} />
        <Field label="FC repos (bpm)" type="number" value={profil.fcRepos ?? ''} onChange={(v) => update('fcRepos', v ? +v : undefined)} placeholder="60" />
        <Field label="Cadence (pas/min)" type="number" value={profil.cadence} onChange={(v) => update('cadence', +v)} />
        <Field label="Temps 1500m" type="text" value={temps1500mStr} onChange={(v) => { setTemps1500mStr(v); setDirty(true); }} placeholder="6:30" />
      </div>

      {/* Données déduites — éditables avec champs texte libres */}
      {vmaCalculee && (
        <div className="bg-gray-50 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Données déduites</h3>
            <span className="text-xs text-gray-400">Saisissez une valeur pour surcharger le calcul</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <OverrideField
              label="VMA (km/h)"
              placeholder={vmaCalculee.toFixed(1)}
              value={vmaStr}
              onChange={(v) => { setVmaStr(v); setDirty(true); }}
              onClear={() => { setVmaStr(''); setDirty(true); }}
            />
            <div>
              <p className="text-gray-500 text-xs mb-1">VO2max</p>
              <p className="font-semibold text-gray-900 py-1.5">{vmaEffective ? calculerVO2max(vmaEffective).toFixed(0) : '-'}</p>
            </div>
            <OverrideField
              label="Allure seuil"
              placeholder={vmaEffective ? formaterAllure(allureSeuil(vmaEffective)) : '-'}
              value={seuilStr}
              onChange={(v) => { setSeuilStr(v); setDirty(true); }}
              onClear={() => { setSeuilStr(''); setDirty(true); }}
            />
            <OverrideField
              label="Allure marathon"
              placeholder={vmaEffective ? formaterAllure(allureMarathon(vmaEffective)) : '-'}
              value={marathonStr}
              onChange={(v) => { setMarathonStr(v); setDirty(true); }}
              onClear={() => { setMarathonStr(''); setDirty(true); }}
            />
            <OverrideField
              label="Allure endurance"
              placeholder={vmaEffective ? formaterAllure(allureEndurance(vmaEffective)) : '-'}
              value={enduranceStr}
              onChange={(v) => { setEnduranceStr(v); setDirty(true); }}
              onClear={() => { setEnduranceStr(''); setDirty(true); }}
            />
          </div>
        </div>
      )}

      {/* Zones cardiaques */}
      <div>
        <button
          onClick={() => {
            if (!showZones && !profil.zones) {
              const fc = profil.fcMax ?? fcMaxTanaka(profil.age);
              const repos = profil.fcRepos ?? 60;
              update('zones', defaultZones(fc, repos));
            }
            setShowZones(!showZones);
          }}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {showZones ? 'Masquer les zones cardiaques' : 'Définir les zones cardiaques (optionnel)'}
        </button>

        {showZones && profil.zones && (
          <div className="mt-4 space-y-2">
            {(['z1', 'z2', 'z3', 'z4', 'z5'] as const).map((z, i) => (
              <div key={z} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-16 text-center py-1 rounded ${ZONE_COLORS[i]}`}>
                  {ZONE_LABELS[i]}
                </span>
                <input
                  type="number"
                  value={profil.zones![z][0]}
                  onChange={(e) => updateZone(z, 0, +e.target.value)}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-center"
                />
                <span className="text-gray-400 text-sm">—</span>
                <input
                  type="number"
                  value={profil.zones![z][1]}
                  onChange={(e) => updateZone(z, 1, +e.target.value)}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-center"
                />
                <span className="text-xs text-gray-400">bpm</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique courses — indépendant du profil */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Historique de courses</h3>
        {historique.length > 0 && (
          <div className="space-y-2 mb-4">
            {historique.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-2.5 text-sm">
                <span className="text-gray-900">
                  <span className="font-medium">{c.distance} km</span>
                  <span className="text-gray-400 mx-2">—</span>
                  {formatSecToHMS(c.temps)}
                  {c.denivelePositif > 0 && (
                    <span className="text-gray-500 ml-2">D+{c.denivelePositif}m D-{c.deniveleNegatif}m</span>
                  )}
                </span>
                <button
                  onClick={() => supprimerCourse(c.id)}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <input type="number" placeholder="Distance (km)" value={newCourse.distance} onChange={(e) => setNewCourse((c) => ({ ...c, distance: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="D+ (m)" value={newCourse.dplus} onChange={(e) => setNewCourse((c) => ({ ...c, dplus: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input type="number" placeholder="D- (m)" value={newCourse.dmoins} onChange={(e) => setNewCourse((c) => ({ ...c, dmoins: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input type="text" placeholder="Temps (hh:mm:ss)" value={newCourse.temps} onChange={(e) => setNewCourse((c) => ({ ...c, temps: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <button onClick={handleAjouterCourse} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
          + Ajouter une course
        </button>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string | number; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
    </div>
  );
}

function OverrideField({ label, placeholder, value, onChange, onClear }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const hasOverride = value.length > 0;
  return (
    <div>
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-md px-2 py-1.5 text-sm font-semibold ${
          hasOverride ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-900'
        }`}
      />
      {hasOverride && (
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600 mt-0.5">
          Réinitialiser
        </button>
      )}
    </div>
  );
}

const ZONE_LABELS = ['Z1 Récup', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Seuil', 'Z5 VO2max'];
const ZONE_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-orange-100 text-orange-700',
  'bg-red-100 text-red-700',
];

function defaultZones(fcMax: number, fcRepos: number): ZonesCardiaques {
  const r = (pct: number) => Math.round(fcRepos + (fcMax - fcRepos) * pct);
  return {
    z1: [r(0.5), r(0.6)],
    z2: [r(0.6), r(0.7)],
    z3: [r(0.7), r(0.8)],
    z4: [r(0.8), r(0.9)],
    z5: [r(0.9), fcMax],
  };
}
