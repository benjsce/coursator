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

  const inputClass = "w-full bg-bg-surface border border-border-strong text-text px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none";

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-extrabold text-2xl">Profil athlète</h1>
        <button
          onClick={sauvegarder}
          disabled={!dirty}
          className={`px-5 py-2 text-sm font-semibold tracking-[0.08em] transition-colors cursor-pointer border-none ${
            dirty ? 'bg-accent text-bg hover:brightness-110' : 'bg-border-strong text-text-muted cursor-not-allowed'
          }`}
        >
          SAUVEGARDER
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Age" type="number" value={profil.age} onChange={(v) => update('age', +v)} />
        <div>
          <label className="block text-xs font-mono text-text-muted tracking-[0.12em] mb-1">SEXE</label>
          <select value={profil.sexe} onChange={(e) => update('sexe', e.target.value as 'H' | 'F')}
            className={inputClass}>
            <option value="H">Homme</option>
            <option value="F">Femme</option>
          </select>
        </div>
        <Field label="Taille (cm)" type="number" value={profil.taille} onChange={(v) => update('taille', +v)} />
        <Field label="Poids (kg)" type="number" value={profil.poids} onChange={(v) => update('poids', +v)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="FC max (bpm)" type="number" value={profil.fcMax ?? ''}
          onChange={(v) => update('fcMax', v ? +v : undefined)}
          placeholder={`Auto: ${fcMaxTanaka(profil.age)}`} />
        <Field label="FC repos (bpm)" type="number" value={profil.fcRepos ?? ''}
          onChange={(v) => update('fcRepos', v ? +v : undefined)} placeholder="60" />
        <Field label="Cadence (pas/min)" type="number" value={profil.cadence}
          onChange={(v) => update('cadence', +v)} />
        <Field label="Temps 1500m" type="text" value={temps1500mStr}
          onChange={(v) => { setTemps1500mStr(v); setDirty(true); }} placeholder="6:30" />
      </div>

      {vmaCalculee && (
        <div className="bg-bg-raised border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] text-text-muted tracking-[0.16em]">DONNEES DEDUITES</div>
            <span className="text-[10px] text-text-muted">Saisissez une valeur pour surcharger le calcul</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <OverrideField label="VMA (km/h)" placeholder={vmaCalculee.toFixed(1)}
              value={vmaStr} onChange={(v) => { setVmaStr(v); setDirty(true); }}
              onClear={() => { setVmaStr(''); setDirty(true); }} />
            <div>
              <p className="text-[10px] font-mono text-text-muted tracking-[0.12em] mb-1">VO2MAX</p>
              <p className="font-mono text-text py-1.5">{vmaEffective ? calculerVO2max(vmaEffective).toFixed(0) : '-'}</p>
            </div>
            <OverrideField label="Allure seuil"
              placeholder={vmaEffective ? formaterAllure(allureSeuil(vmaEffective)) : '-'}
              value={seuilStr} onChange={(v) => { setSeuilStr(v); setDirty(true); }}
              onClear={() => { setSeuilStr(''); setDirty(true); }} />
            <OverrideField label="Allure marathon"
              placeholder={vmaEffective ? formaterAllure(allureMarathon(vmaEffective)) : '-'}
              value={marathonStr} onChange={(v) => { setMarathonStr(v); setDirty(true); }}
              onClear={() => { setMarathonStr(''); setDirty(true); }} />
            <OverrideField label="Allure endurance"
              placeholder={vmaEffective ? formaterAllure(allureEndurance(vmaEffective)) : '-'}
              value={enduranceStr} onChange={(v) => { setEnduranceStr(v); setDirty(true); }}
              onClear={() => { setEnduranceStr(''); setDirty(true); }} />
          </div>
        </div>
      )}

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
          className="text-sm text-accent hover:brightness-125 bg-transparent border-none cursor-pointer"
        >
          {showZones ? 'Masquer les zones cardiaques' : 'Définir les zones cardiaques (optionnel)'}
        </button>

        {showZones && profil.zones && (
          <div className="mt-4 space-y-2">
            {(['z1', 'z2', 'z3', 'z4', 'z5'] as const).map((z, i) => (
              <div key={z} className="flex items-center gap-3">
                <span className={`text-[10px] font-mono font-bold w-20 text-center py-1 border ${ZONE_STYLES[i]}`}>
                  {ZONE_LABELS[i]}
                </span>
                <input type="number" value={profil.zones![z][0]}
                  onChange={(e) => updateZone(z, 0, +e.target.value)}
                  className="w-20 bg-bg-surface border border-border-strong text-text px-2 py-1.5 text-sm font-mono text-center focus:border-accent focus:outline-none" />
                <span className="text-text-muted text-sm">—</span>
                <input type="number" value={profil.zones![z][1]}
                  onChange={(e) => updateZone(z, 1, +e.target.value)}
                  className="w-20 bg-bg-surface border border-border-strong text-text px-2 py-1.5 text-sm font-mono text-center focus:border-accent focus:outline-none" />
                <span className="text-[10px] text-text-muted font-mono">bpm</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="font-mono text-[10px] text-text-muted tracking-[0.16em] mb-3">HISTORIQUE DE COURSES</div>
        {historique.length > 0 && (
          <div className="space-y-2 mb-4">
            {historique.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-bg-raised border border-border px-4 py-2.5 text-sm">
                <span>
                  <span className="font-medium font-mono">{c.distance} km</span>
                  <span className="text-text-muted mx-2">—</span>
                  <span className="font-mono">{formatSecToHMS(c.temps)}</span>
                  {c.denivelePositif > 0 && (
                    <span className="text-text-secondary ml-2">D+{c.denivelePositif}m D-{c.deniveleNegatif}m</span>
                  )}
                </span>
                <button onClick={() => supprimerCourse(c.id)}
                  className="text-accent text-xs bg-transparent border-none cursor-pointer hover:brightness-125">
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <input type="number" placeholder="Distance (km)" value={newCourse.distance}
            onChange={(e) => setNewCourse((c) => ({ ...c, distance: e.target.value }))}
            className={inputClass} />
          <input type="number" placeholder="D+ (m)" value={newCourse.dplus}
            onChange={(e) => setNewCourse((c) => ({ ...c, dplus: e.target.value }))}
            className={inputClass} />
          <input type="number" placeholder="D- (m)" value={newCourse.dmoins}
            onChange={(e) => setNewCourse((c) => ({ ...c, dmoins: e.target.value }))}
            className={inputClass} />
          <input type="text" placeholder="Temps (hh:mm:ss)" value={newCourse.temps}
            onChange={(e) => setNewCourse((c) => ({ ...c, temps: e.target.value }))}
            className={inputClass} />
        </div>
        <button onClick={handleAjouterCourse}
          className="mt-2 text-sm text-accent hover:brightness-125 bg-transparent border-none cursor-pointer">
          + Ajouter une course
        </button>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string | number; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-mono text-text-muted tracking-[0.12em] mb-1">
        {label.toUpperCase()}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-bg-surface border border-border-strong text-text px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none" />
    </div>
  );
}

function OverrideField({ label, placeholder, value, onChange, onClear }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; onClear: () => void;
}) {
  const hasOverride = value.length > 0;
  return (
    <div>
      <p className="text-[10px] font-mono text-text-muted tracking-[0.12em] mb-1">{label.toUpperCase()}</p>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full border px-2 py-1.5 text-sm font-mono focus:outline-none ${
          hasOverride
            ? 'border-accent bg-bg-active text-accent focus:border-accent'
            : 'border-border-strong bg-bg-surface text-text focus:border-accent'
        }`} />
      {hasOverride && (
        <button onClick={onClear} className="text-[10px] text-text-muted hover:text-text-secondary mt-0.5 bg-transparent border-none cursor-pointer">
          Réinitialiser
        </button>
      )}
    </div>
  );
}

const ZONE_LABELS = ['Z1 Récup', 'Z2 Endur.', 'Z3 Tempo', 'Z4 Seuil', 'Z5 VO2max'];
const ZONE_STYLES = [
  'border-accent-blue text-accent-blue',
  'border-green-500 text-green-500',
  'border-yellow-500 text-yellow-500',
  'border-accent-orange text-accent-orange',
  'border-accent text-accent',
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
