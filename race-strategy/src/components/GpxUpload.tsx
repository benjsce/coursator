import { useCallback, useState } from 'react';
import type { Parcours } from '../models/gpx';
import { parserGPX } from '../io/gpx-parser';

interface Props {
  onParcours: (parcours: Parcours) => void;
  label?: string;
}

export function GpxUpload({ onParcours, label = 'Importer un fichier GPX' }: Props) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const traiterFichier = useCallback(
    (file: File) => {
      setErreur(null);
      if (!file.name.endsWith('.gpx')) {
        setErreur('Le fichier doit être au format .gpx');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const contenu = e.target?.result as string;
          const parcours = parserGPX(contenu);
          setNomFichier(file.name);
          onParcours(parcours);
        } catch {
          setErreur('Impossible de lire le fichier GPX. Vérifiez le format.');
        }
      };
      reader.readAsText(file);
    },
    [onParcours]
  );

  return (
    <div>
      <label className="block text-xs font-mono text-text-muted tracking-[0.12em] mb-2">
        {label.toUpperCase()}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) traiterFichier(file);
        }}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-accent bg-bg-active'
            : 'border-border-strong hover:border-text-muted'
        }`}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.gpx';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) traiterFichier(file);
          };
          input.click();
        }}
      >
        {nomFichier ? (
          <p className="text-sm text-text-secondary">{nomFichier}</p>
        ) : (
          <p className="text-sm text-text-muted">
            Glissez un fichier .gpx ici ou cliquez pour sélectionner
          </p>
        )}
      </div>
      {erreur && <p className="mt-2 text-sm text-accent">{erreur}</p>}
    </div>
  );
}
