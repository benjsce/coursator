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

export function parseDuree(input: string): number | null {
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
