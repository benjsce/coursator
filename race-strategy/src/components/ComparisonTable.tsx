import type { ComparaisonKm } from '../models/analysis';
import { formaterAllure, formaterTempsPassage, formaterDureeCompacte } from '../engine/format';

interface Props {
  comparaisons: ComparaisonKm[];
}

export function ComparisonTable({ comparaisons }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-2 font-medium text-gray-500">km</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Prévu</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Réalisé</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Écart</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Passage prévu</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Passage réel</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Écart cumulé</th>
          </tr>
        </thead>
        <tbody>
          {comparaisons.map((c) => (
            <tr
              key={c.km}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-2.5 px-2 font-medium text-gray-900">{c.km}</td>
              <td className="py-2.5 px-2 text-gray-600">{formaterAllure(c.allurePrevue)}</td>
              <td className="py-2.5 px-2 text-gray-900">{formaterAllure(c.allureRealisee)}</td>
              <td className={`py-2.5 px-2 font-medium ${c.ecart > 5 ? 'text-red-600' : c.ecart < -5 ? 'text-green-600' : 'text-gray-500'}`}>
                {formaterDureeCompacte(c.ecart)}
              </td>
              <td className="py-2.5 px-2 text-gray-500">{formaterTempsPassage(c.tempsPassagePrevu)}</td>
              <td className="py-2.5 px-2 text-gray-700">{formaterTempsPassage(c.tempsPassageReel)}</td>
              <td className={`py-2.5 px-2 font-medium ${c.ecartCumule > 30 ? 'text-red-600' : c.ecartCumule < -30 ? 'text-green-600' : 'text-gray-500'}`}>
                {formaterDureeCompacte(c.ecartCumule)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
