import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileForm } from '../components/ProfileForm';
import { GpxUpload } from '../components/GpxUpload';
import { ObjectiveForm } from '../components/ObjectiveForm';
import { useAthleteStore } from '../store/athlete-store';
import { usePlanStore } from '../store/plan-store';
import type { ProfilAthlete } from '../models/athlete';
import type { Objectif } from '../models/objective';
import type { Parcours } from '../models/gpx';
import { calculerVMA } from '../engine/vma';
import { analyserHistorique } from '../engine/experience';
import { calculerAllurePlate, calculerTempsCible } from '../engine/pacing';
import { genererTousScenarios } from '../engine/splits';
import { validerObjectif } from '../engine/validation';

export function Setup() {
  const navigate = useNavigate();
  const { profil: profilSauvegarde, setProfil } = useAthleteStore();
  const { setParcours, setObjectif, setScenarios, setValidation } = usePlanStore();

  const [profilLocal, setProfilLocal] = useState<ProfilAthlete | null>(profilSauvegarde);
  const [parcoursLocal, setParcoursLocal] = useState<Parcours | null>(null);
  const [objectifLocal, setObjectifLocal] = useState<Objectif | null>(null);
  const [etape, setEtape] = useState<1 | 2 | 3>(profilSauvegarde ? 2 : 1);

  function validerProfil(p: ProfilAthlete) {
    setProfilLocal(p);
    setProfil(p);
    setEtape(2);
  }

  function validerGPX(parcours: Parcours) {
    setParcoursLocal(parcours);
    setEtape(3);
  }

  function generer(objectif: Objectif) {
    if (!profilLocal || !parcoursLocal) return;

    setObjectifLocal(objectif);
    setObjectif(objectif);
    setParcours(parcoursLocal);

    const vma = calculerVMA(profilLocal.temps1500m);
    const coefficients = analyserHistorique(profilLocal.historique, vma);
    const allurePlate = calculerAllurePlate(objectif, parcoursLocal.distanceTotale, vma);
    const tempsCible = calculerTempsCible(objectif, parcoursLocal.distanceTotale, vma);
    const distanceKm = parcoursLocal.distanceTotale / 1000;

    const validation = validerObjectif(tempsCible, distanceKm, vma, profilLocal.historique);
    setValidation(validation);

    const scenarios = genererTousScenarios(
      parcoursLocal.segments,
      allurePlate,
      coefficients,
      profilLocal.poids
    );
    setScenarios(scenarios);

    navigate('/plan');
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Race Strategy</h1>
        <p className="text-gray-500 text-sm mb-10">
          Générez une stratégie de course personnalisée à partir de votre profil et du parcours.
        </p>

        <div className="flex items-center gap-3 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  etape >= s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {s}
              </div>
              <span className={`text-sm ${etape >= s ? 'text-gray-900' : 'text-gray-400'}`}>
                {s === 1 ? 'Profil' : s === 2 ? 'Parcours' : 'Objectif'}
              </span>
              {s < 3 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {etape === 1 && <ProfileForm initial={profilSauvegarde} onSubmit={validerProfil} />}

        {etape === 2 && (
          <div className="space-y-6">
            <GpxUpload onParcours={validerGPX} />
            {parcoursLocal && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-medium text-gray-900">{parcoursLocal.nom}</p>
                <p className="text-gray-600">
                  {(parcoursLocal.distanceTotale / 1000).toFixed(1)} km — D+
                  {parcoursLocal.denivelePositifTotal}m / D-{parcoursLocal.deniveleNegatifTotal}m
                </p>
              </div>
            )}
            {profilLocal && (
              <button
                onClick={() => setEtape(1)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Modifier le profil
              </button>
            )}
          </div>
        )}

        {etape === 3 && (
          <div className="space-y-6">
            <ObjectiveForm onSubmit={generer} />
            <button
              onClick={() => setEtape(2)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Modifier le parcours
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
