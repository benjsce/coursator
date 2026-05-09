import { useEffect, useState } from 'react';
import { parseDuree, formaterTempsPassage } from '../engine/format';

interface Props {
  value: string;
  onChange: (text: string, parsedSec: number | null) => void;
  placeholder?: string;
  className?: string;
  showParsed?: boolean;
  examples?: string[];
  /** Si true, préfère MM:SS pour les valeurs ambiguës (1500m, allures). Défaut: false (HH:MM). */
  preferShort?: boolean;
}

const DEFAULT_EXAMPLES = [
  '3h30',
  '3:30:00',
  '1h25m',
  '90m',
  '5400s',
  "30'45\"",
];

/**
 * Champ de saisie de durée tolérant.
 * Affiche en dessous le temps parsé pour confirmer que la valeur est interprétée
 * correctement, ainsi que des exemples de formats acceptés.
 */
export function TimeInput({
  value,
  onChange,
  placeholder = '3h30 ou 3:30:00',
  className = '',
  showParsed = true,
  examples = DEFAULT_EXAMPLES,
  preferShort = false,
}: Props) {
  const [focus, setFocus] = useState(false);
  const parsed = parseDuree(value, preferShort);

  useEffect(() => {
    onChange(value, parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const valid = parsed !== null && value.length > 0;
  const invalid = value.length > 0 && parsed === null;

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next, parseDuree(next, preferShort));
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        className={`${className} ${
          invalid
            ? 'border-accent-orange'
            : valid
            ? 'border-accent'
            : 'border-border-strong'
        }`}
      />
      {showParsed && (value.length > 0 || focus) && (
        <div className="mt-1 text-[10px] font-mono leading-tight">
          {valid ? (
            <span className="text-accent">= {formaterTempsPassage(parsed)}</span>
          ) : invalid ? (
            <span className="text-accent-orange">format non reconnu</span>
          ) : (
            <span className="text-text-muted">
              Formats : {examples.join(' · ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
