import { useState } from 'react';
import { ProfileSection } from './sections/ProfileSection';
import { CourseSection } from './sections/CourseSection';
import { AnalysisSection } from './sections/AnalysisSection';
import { CalculatorSection } from './sections/CalculatorSection';
import { useAthleteStore } from './store/athlete-store';
import { calculerVMA } from './engine/vma';

type Tab = 'profil' | 'parcours' | 'analyse' | 'calculateur';

const TABS: { id: Tab; label: string }[] = [
  { id: 'profil', label: 'Profil' },
  { id: 'parcours', label: 'Parcours' },
  { id: 'analyse', label: 'Analyse' },
  { id: 'calculateur', label: 'Calculateur' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('parcours');
  const { profil } = useAthleteStore();
  const vma = profil ? (profil.vmaOverride ?? calculerVMA(profil.temps1500m)) : null;

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border">
        <div className="flex items-center gap-7">
          <div className="flex items-center gap-2.5">
            <div
              className="w-[22px] h-[22px] bg-accent"
              style={{ clipPath: 'polygon(0 0, 70% 0, 100% 100%, 30% 100%)' }}
            />
            <span className="font-extrabold tracking-[0.16em] text-sm">COURSATOR</span>
            <span className="font-mono text-[10px] text-text-muted px-1.5 py-0.5 border border-border-strong">
              v0.4
            </span>
          </div>
          <nav className="flex gap-1 text-xs">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 border text-xs tracking-[0.04em] transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'bg-bg-hover text-text border-border-strong'
                    : 'bg-transparent text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] text-text-secondary">
          {profil && (
            <span>
              {profil.age}ans · {profil.poids}kg
              {vma && <> · VMA {vma.toFixed(1)}</>}
            </span>
          )}
          <span className="text-accent">● LIVE</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {tab === 'profil' && <ProfileSection />}
        {tab === 'parcours' && <CourseSection />}
        {tab === 'analyse' && <AnalysisSection />}
        {tab === 'calculateur' && <CalculatorSection />}
      </main>
    </div>
  );
}
