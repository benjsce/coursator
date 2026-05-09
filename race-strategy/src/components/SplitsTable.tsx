import type { Split } from '../models/strategy';
import { formaterAllure, formaterTempsPassage } from '../engine/format';

interface Props {
  splits: Split[];
}

export function SplitsTable({ splits }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[11px]" style={{ borderCollapse: 'collapse' }}>
        <thead className="sticky top-0 bg-bg-surface">
          <tr className="text-text-muted text-left tracking-[0.08em]">
            {['KM', 'D+', 'D-', 'ALLURE', 'PASSAGE', 'NUTRITION'].map((h) => (
              <th key={h} className="py-2 px-2.5 border-b border-border font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {splits.map((split) => {
            const hasNutrition = !!split.nutrition;
            return (
              <tr key={split.km} className="border-b border-border/40">
                <td className="py-1.5 px-2.5 text-text">
                  {String(split.km).padStart(2, '0')}
                </td>
                <td className={`py-1.5 px-2.5 ${split.denivelePositif > 30 ? 'text-accent-orange' : 'text-text-secondary'}`}>
                  +{split.denivelePositif}
                </td>
                <td className="py-1.5 px-2.5 text-text-secondary">
                  -{split.deniveleNegatif}
                </td>
                <td className="py-1.5 px-2.5 text-text">
                  {formaterAllure(split.allureAjustee)}
                </td>
                <td className="py-1.5 px-2.5 text-text">
                  {formaterTempsPassage(split.tempsPassage)}
                </td>
                <td className={`py-1.5 px-2.5 ${hasNutrition ? 'text-accent' : 'text-text-muted'}`}>
                  {hasNutrition ? `◆ ${split.nutrition}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
