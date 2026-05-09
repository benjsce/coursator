import { useState } from 'react';
import { ProfileSection } from './sections/ProfileSection';
import { CourseSection } from './sections/CourseSection';
import { AnalysisSection } from './sections/AnalysisSection';
import { CalculatorSection } from './sections/CalculatorSection';

type Tab = 'profil' | 'parcours' | 'analyse' | 'calculateur';

const TABS: { id: Tab; label: string }[] = [
  { id: 'profil', label: 'Profil' },
  { id: 'parcours', label: 'Parcours & Stratégie' },
  { id: 'analyse', label: 'Analyse' },
  { id: 'calculateur', label: 'Calculateur' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('parcours');

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 flex items-center h-14">
          <span className="text-base font-bold text-gray-900 mr-8">Race Strategy</span>
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {tab === 'profil' && <ProfileSection />}
        {tab === 'parcours' && <CourseSection />}
        {tab === 'analyse' && <AnalysisSection />}
        {tab === 'calculateur' && <CalculatorSection />}
      </main>
    </div>
  );
}
