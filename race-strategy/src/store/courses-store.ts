import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Parcours } from '../models/gpx';
import type { Objectif } from '../models/objective';

// =============================================================================
// Course persistante
// =============================================================================
// Une "course" sauvegardée = parcours + objectif.
// Persistée en localStorage pour ne pas perdre quand on modifie le profil.
// Les scénarios (splits) sont régénérés à chaque chargement car ils dépendent
// du profil athlète courant.
// =============================================================================

export interface CourseSauvegardee {
  id: string;
  nom: string;
  parcours: Parcours;
  objectif: Objectif | null;
  type: 'gpx' | 'manuel';
  dateCreation: number; // timestamp
  dateMaj: number;
}

interface CoursesStore {
  courses: CourseSauvegardee[];
  courseActiveId: string | null;

  ajouter: (course: Omit<CourseSauvegardee, 'id' | 'dateCreation' | 'dateMaj'>) => string;
  mettreAJour: (id: string, patch: Partial<CourseSauvegardee>) => void;
  supprimer: (id: string) => void;
  selectionner: (id: string | null) => void;
  renommer: (id: string, nom: string) => void;
}

export const useCoursesStore = create<CoursesStore>()(
  persist(
    (set) => ({
      courses: [],
      courseActiveId: null,

      ajouter: (course) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((state) => ({
          courses: [
            ...state.courses,
            { ...course, id, dateCreation: now, dateMaj: now },
          ],
          courseActiveId: id,
        }));
        return id;
      },

      mettreAJour: (id, patch) => set((state) => ({
        courses: state.courses.map((c) =>
          c.id === id ? { ...c, ...patch, dateMaj: Date.now() } : c
        ),
      })),

      supprimer: (id) => set((state) => ({
        courses: state.courses.filter((c) => c.id !== id),
        courseActiveId: state.courseActiveId === id ? null : state.courseActiveId,
      })),

      selectionner: (id) => set({ courseActiveId: id }),

      renommer: (id, nom) => set((state) => ({
        courses: state.courses.map((c) =>
          c.id === id ? { ...c, nom, dateMaj: Date.now() } : c
        ),
      })),
    }),
    {
      name: 'coursator-courses',
      // Reviver pour restaurer les Date objects dans Parcours.points[].time
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state?.courses) {
          state.courses = state.courses.map((c) => ({
            ...c,
            parcours: {
              ...c.parcours,
              points: (c.parcours.points ?? []).map((p) => ({
                ...p,
                time: p.time ? new Date(p.time) : undefined,
              })),
            },
          }));
        }
      },
    }
  )
);
