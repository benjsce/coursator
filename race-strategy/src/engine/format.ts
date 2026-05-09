// =============================================================================
// Formatage et parsing de durées
// =============================================================================

export function formaterAllure(secParKm: number): string {
  const min = Math.floor(secParKm / 60);
  const sec = Math.round(secParKm % 60);
  return `${min}'${sec.toString().padStart(2, '0')}"`;
}

export function formaterTempsPassage(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = Math.round(secondes % 60);
  if (h > 0) {
    return `${h}h${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formaterDureeCompacte(secondes: number): string {
  const abs = Math.abs(secondes);
  const signe = secondes >= 0 ? '+' : '-';
  const m = Math.floor(abs / 60);
  const s = Math.round(abs % 60);
  if (m === 0) return `${signe}${s}s`;
  return `${signe}${m}m${s.toString().padStart(2, '0')}`;
}

// =============================================================================
// Parsing tolérant des durées
// =============================================================================
// Formats acceptés (insensible à la casse, espaces ignorés) :
//   3:30:00       → 3h30m00s
//   3:30          → 3h30m si > 1h plausible, sinon 3min30s (heuristique)
//                   On utilise un parseur explicite : MM:SS par défaut, sauf si
//                   des heures sont indiquées avec "h" ou la valeur dépasse 60min.
//   3h30          → 3h30m00s
//   3h30m         → 3h30m00s
//   3h30m45s      → 3h30m45s
//   3h30:45       → 3h30m45s
//   1h            → 1h00m00s
//   90m           → 90 min
//   90:45         → 90 min 45 sec (90 dépasse 60, donc minutes)
//   45:30         → 45 min 30 sec
//   5:30          → 5 min 30 sec (par défaut MM:SS car peu probable d'être 5h30)
//   5400s         → 5400 secondes
//   5400          → 5400 secondes (entier seul = secondes)
//   1.5h          → 1h30m
//   2,5h          → 2h30m (virgule comme séparateur décimal)
//   1h30'45"      → 1h30m45s (notation allure)
//   30'45"        → 30m45s
// =============================================================================

/**
 * Parse une durée tolérante. Pour les formats ambigus (M:SS vs H:MM), utiliser
 * `preferShort` :
 *   - `true`  → préférer MM:SS (durées courtes : 1500m, allures, 5km)
 *   - `false` → préférer HH:MM (durées longues : marathon, ultra)
 *
 * Quand le format est explicite (avec h, m, s, '), `preferShort` n'a pas
 * d'effet.
 */
export function parseDuree(input: string, preferShort: boolean = false): number | null {
  if (!input) return null;
  // Normalisation : minuscules, sans espaces, virgule → point
  const s = input.toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/['′]/g, "'").replace(/["″]/g, '"');

  if (!s) return null;

  // 1) Format avec lettres explicites : 3h30m45s, 1h30m, 90m, 45s, 1.5h, etc.
  const lettreRegex = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m(?!s))?(?:(\d+(?:\.\d+)?)s)?$/;
  const lettreMatch = s.match(lettreRegex);
  if (lettreMatch && (lettreMatch[1] || lettreMatch[2] || lettreMatch[3])) {
    const h = parseFloat(lettreMatch[1] ?? '0');
    const m = parseFloat(lettreMatch[2] ?? '0');
    const sec = parseFloat(lettreMatch[3] ?? '0');
    return Math.round(h * 3600 + m * 60 + sec);
  }

  // 2) Format mixte avec h et : ou ' : 3h30:45, 3h30'45", 1h30:00
  const mixteH = s.match(/^(\d+)h(\d+)(?:[:'](\d+))?"?$/);
  if (mixteH) {
    const h = parseInt(mixteH[1]);
    const m = parseInt(mixteH[2]);
    const sec = mixteH[3] ? parseInt(mixteH[3]) : 0;
    return h * 3600 + m * 60 + sec;
  }

  // 3) Format allure m'ss" : 4'30", 30'45"
  const allure = s.match(/^(\d+)'(\d{1,2})"?$/);
  if (allure) {
    const m = parseInt(allure[1]);
    const sec = parseInt(allure[2]);
    return m * 60 + sec;
  }

  // 4) Format H:MM:SS strict : 3:30:00
  const hms = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (hms) {
    return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3]);
  }

  // 5) Format M:SS ou H:MM (ambigu — heuristique selon contexte)
  const deuxParts = s.match(/^(\d+):(\d{1,2})$/);
  if (deuxParts) {
    const a = parseInt(deuxParts[1]);
    const b = parseInt(deuxParts[2]);
    // Si premier nombre >= 10 → forcément MM:SS (rare d'avoir > 10h en course)
    if (a >= 10) return a * 60 + b;
    // Si premier nombre < 10 ET la 2e partie >= 60 → impossible en MM:SS, donc HH:MM
    // (mais la regex limite déjà à \d{1,2}, donc b < 100)
    // Pour le cas ambigu, on suit le hint contextuel.
    if (preferShort) {
      return a * 60 + b; // MM:SS
    }
    return a * 3600 + b * 60; // HH:MM
  }

  // 6) Décimal seul avec h : 1.5h
  const decimalH = s.match(/^(\d+(?:\.\d+)?)h?$/);
  if (decimalH) {
    const v = parseFloat(decimalH[1]);
    if (s.endsWith('h')) return Math.round(v * 3600);
    // Entier ou décimal sans unité : par défaut, secondes si > 60, sinon ambigu
    if (Number.isInteger(v) && v > 60) return v;
    if (Number.isInteger(v) && v <= 60) return v * 60; // assume minutes
    return Math.round(v * 3600); // décimal sans unité = heures (ex: 3.5)
  }

  return null;
}

// =============================================================================
// Tests / exemples (utilisables aussi pour aide visuelle dans l'UI)
// =============================================================================

export const EXEMPLES_DUREE = [
  { input: '3:30:00', valeur: 12600, libelle: '3h30m00s' },
  { input: '3h30', valeur: 12600, libelle: '3h30m' },
  { input: '3h30m45s', valeur: 12645, libelle: '3h30m45s' },
  { input: '1h', valeur: 3600, libelle: '1h' },
  { input: '90m', valeur: 5400, libelle: '90 min' },
  { input: "30'45\"", valeur: 1845, libelle: '30 min 45 sec' },
  { input: '4:48', valeur: 17280, libelle: '4h48 (HH:MM)' },
  { input: '45:30', valeur: 2730, libelle: '45 min 30 sec' },
  { input: '1.5h', valeur: 5400, libelle: '1h30 (décimal)' },
];

export function parseDuree_strict(input: string): number | null {
  // Garde l'ancien parser strict pour les tests si besoin
  const hhmmss = input.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hhmmss) {
    return parseInt(hhmmss[1]) * 3600 + parseInt(hhmmss[2]) * 60 + parseInt(hhmmss[3]);
  }
  const mmss = input.match(/^(\d+):(\d{2})$/);
  if (mmss) {
    return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
  }
  return null;
}
