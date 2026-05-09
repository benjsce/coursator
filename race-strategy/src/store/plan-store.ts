import { create } from 'zustand';
import type { Parcours } from '../models/gpx';
import type { Objectif } from '../models/objective';
import type { Scenario, TypeScenario, ValidationObjectif } from '../models/strategy';
import type { AnalysePostCourse } from '../models/analysis';

interface PlanStore {
  parcours: Parcours | null;
  objectif: Objectif | null;
  scenarios: Scenario[];
  scenarioActif: TypeScenario;
  validation: ValidationObjectif | null;
  analyse: AnalysePostCourse | null;

  setParcours: (parcours: Parcours) => void;
  setObjectif: (objectif: Objectif) => void;
  setScenarios: (scenarios: Scenario[]) => void;
  setScenarioActif: (type: TypeScenario) => void;
  setValidation: (validation: ValidationObjectif) => void;
  setAnalyse: (analyse: AnalysePostCourse) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>()((set) => ({
  parcours: null,
  objectif: null,
  scenarios: [],
  scenarioActif: 'regulier',
  validation: null,
  analyse: null,

  setParcours: (parcours) => set({ parcours }),
  setObjectif: (objectif) => set({ objectif }),
  setScenarios: (scenarios) => set({ scenarios }),
  setScenarioActif: (type) => set({ scenarioActif: type }),
  setValidation: (validation) => set({ validation }),
  setAnalyse: (analyse) => set({ analyse }),
  reset: () =>
    set({
      parcours: null,
      objectif: null,
      scenarios: [],
      scenarioActif: 'regulier',
      validation: null,
      analyse: null,
    }),
}));
