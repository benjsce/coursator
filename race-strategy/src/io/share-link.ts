import type { Scenario } from '../models/strategy';

export function encoderPlan(scenario: Scenario): string {
  const data = JSON.stringify(scenario);
  const encoded = btoa(encodeURIComponent(data));
  const url = `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
  return url;
}

export function decoderPlan(url: string): Scenario | null {
  try {
    const params = new URL(url).searchParams;
    const encoded = params.get('plan');
    if (!encoded) return null;
    const data = decodeURIComponent(atob(encoded));
    return JSON.parse(data) as Scenario;
  } catch {
    return null;
  }
}
