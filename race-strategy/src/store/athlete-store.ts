import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProfilAthlete, CourseHistorique } from '../models/athlete';

interface AthleteStore {
  profil: ProfilAthlete | null;
  historique: CourseHistorique[];
  setProfil: (profil: ProfilAthlete) => void;
  ajouterCourse: (course: CourseHistorique) => void;
  supprimerCourse: (id: string) => void;
  reset: () => void;
}

export const useAthleteStore = create<AthleteStore>()(
  persist(
    (set) => ({
      profil: null,
      historique: [],
      setProfil: (profil) => set({ profil }),
      ajouterCourse: (course) =>
        set((state) => ({
          historique: [...state.historique, course],
        })),
      supprimerCourse: (id) =>
        set((state) => ({
          historique: state.historique.filter((c) => c.id !== id),
        })),
      reset: () => set({ profil: null }),
    }),
    { name: 'athlete-profil' }
  )
);
