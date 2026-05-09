import type { ComparaisonKm } from '../models/analysis';
import { formaterAllure, formaterTempsPassage, formaterDureeCompacte } from '../engine/format';

interface Props {
  comparaisons: ComparaisonKm[];
}

export function ComparisonTable({ comparaisons }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[11px]" style={{ borderCollapse: 'collapse' }}>
        <thead className="sticky top-0 bg-bg-surface">
          <tr className="text-text-muted text-left tracking-[0.08em]">
            {['KM', 'PREVU', 'REALISE', 'ECART', 'PASSAGE PREVU', 'PASSAGE REEL', 'ECART CUMULE'].map((h) => (
              <th key={h} className="py-2 px-2.5 border-b border-border font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparaisons.map((c) => (
            <tr key={c.km} className="border-b border-border/40">
              <td className="py-1.5 px-2.5 text-text">{c.km}</td>
              <td className="py-1.5 px-2.5 text-text-secondary">{formaterAllure(c.allurePrevue)}</td>
              <td className="py-1.5 px-2.5 text-text">{formaterAllure(c.allureRealisee)}</td>
              <td className={`py-1.5 px-2.5 font-medium ${
                c.ecart > 5 ? 'text-accent' : c.ecart < -5 ? 'text-accent-blue' : 'text-text-secondary'
              }`}>
                {formaterDureeCompacte(c.ecart)}
              </td>
              <td className="py-1.5 px-2.5 text-text-secondary">{formaterTempsPassage(c.tempsPassagePrevu)}</td>
              <td className="py-1.5 px-2.5 text-text">{formaterTempsPassage(c.tempsPassageReel)}</td>
              <td className={`py-1.5 px-2.5 font-medium ${
                c.ecartCumule > 30 ? 'text-accent' : c.ecartCumule < -30 ? 'text-accent-blue' : 'text-text-secondary'
              }`}>
                {formaterDureeCompacte(c.ecartCumule)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
