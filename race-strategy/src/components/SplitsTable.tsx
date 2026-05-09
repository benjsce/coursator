import type { Split } from '../models/strategy';
import { formaterAllure, formaterTempsPassage } from '../engine/format';

interface Props {
  splits: Split[];
}

export function SplitsTable({ splits }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-2 font-medium text-gray-500">km</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">D+/D-</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Allure plate</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Allure ajustée</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Passage</th>
            <th className="text-left py-3 px-2 font-medium text-gray-500">Nutrition</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((split) => (
            <tr
              key={split.km}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-2.5 px-2 font-medium text-gray-900">{split.km}</td>
              <td className="py-2.5 px-2 text-gray-600">
                <span className="text-green-600">+{split.denivelePositif}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-red-500">-{split.deniveleNegatif}</span>
              </td>
              <td className="py-2.5 px-2 text-gray-500">{formaterAllure(split.allurePlate)}</td>
              <td className="py-2.5 px-2 font-medium text-gray-900">
                {formaterAllure(split.allureAjustee)}
              </td>
              <td className="py-2.5 px-2 text-gray-700">
                {formaterTempsPassage(split.tempsPassage)}
              </td>
              <td className="py-2.5 px-2">
                {split.nutrition && (
                  <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">
                    {split.nutrition}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
