import { useState } from 'react';
import type { ProfilAthlete, CourseHistorique } from '../models/athlete';
import { parseDuree } from '../engine/format';

interface Props {
  initial?: ProfilAthlete | null;
  onSubmit: (profil: ProfilAthlete) => void;
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

export function ProfileForm({ initial, onSubmit }: Props) {
  const [profil, setProfil] = useState<ProfilAthlete>(initial ?? DEFAUT);
  const [temps1500mStr, setTemps1500mStr] = useState(
    initial ? formatSecToMMSS(initial.temps1500m) : '6:30'
  );
  const [newCourse, setNewCourse] = useState({ distance: '', dplus: '', dmoins: '', temps: '' });

  function update<K extends keyof ProfilAthlete>(key: K, value: ProfilAthlete[K]) {
    setProfil((p) => ({ ...p, [key]: value }));
  }

  function ajouterCourse() {
    const temps = parseDuree(newCourse.temps);
    if (!temps || !newCourse.distance) return;
    const course: CourseHistorique = {
      id: crypto.randomUUID(),
      distance: parseFloat(newCourse.distance),
      denivelePositif: parseFloat(newCourse.dplus) || 0,
      deniveleNegatif: parseFloat(newCourse.dmoins) || 0,
      temps,
    };
    update('historique', [...profil.historique, course]);
    setNewCourse({ distance: '', dplus: '', dmoins: '', temps: '' });
  }

  function supprimerCourse(id: string) {
    update(
      'historique',
      profil.historique.filter((c) => c.id !== id)
    );
  }

  function handleSubmit() {
    const t = parseDuree(temps1500mStr);
    if (t) {
      onSubmit({ ...profil, temps1500m: t });
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Profil athlète</h2>

      <div className="grid grid-cols-2 gap-4">
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
        <Field label="FC max (bpm)" type="number" value={profil.fcMax ?? ''} onChange={(v) => update('fcMax', v ? +v : undefined)} />
        <Field label="FC repos (bpm)" type="number" value={profil.fcRepos ?? ''} onChange={(v) => update('fcRepos', v ? +v : undefined)} />
        <Field label="Cadence (pas/min)" type="number" value={profil.cadence} onChange={(v) => update('cadence', +v)} />
        <Field
          label="Temps 1500m (mm:ss)"
          type="text"
          value={temps1500mStr}
          onChange={setTemps1500mStr}
          placeholder="6:30"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Historique de courses</h3>
        {profil.historique.length > 0 && (
          <div className="space-y-2 mb-4">
            {profil.historique.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 text-sm">
                <span>
                  {c.distance} km — {formatSecToHMS(c.temps)}
                  {c.denivelePositif > 0 && ` — D+${c.denivelePositif}m`}
                </span>
                <button
                  onClick={() => supprimerCourse(c.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <input
            type="number"
            placeholder="Distance (km)"
            value={newCourse.distance}
            onChange={(e) => setNewCourse((c) => ({ ...c, distance: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="D+ (m)"
            value={newCourse.dplus}
            onChange={(e) => setNewCourse((c) => ({ ...c, dplus: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="D- (m)"
            value={newCourse.dmoins}
            onChange={(e) => setNewCourse((c) => ({ ...c, dmoins: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Temps (hh:mm:ss)"
            value={newCourse.temps}
            onChange={(e) => setNewCourse((c) => ({ ...c, temps: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={ajouterCourse}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Ajouter une course
        </button>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full bg-gray-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        Valider le profil
      </button>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
    </div>
  );
}

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
