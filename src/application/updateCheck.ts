export interface VersionInfo {
  version: string;
  minSupported: string;
  notes: string;
}

export type UpdateDecision = 'none' | 'optional' | 'required';

/** Compares dotted numeric versions ("0.10.1" > "0.9.9"); missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function parseVersionInfo(data: unknown): VersionInfo | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  const valid = (v: unknown): v is string => typeof v === 'string' && /^\d+(\.\d+){0,3}$/.test(v);
  if (!valid(d['version']) || !valid(d['minSupported'])) return null;
  return {
    version: d['version'],
    minSupported: d['minSupported'],
    notes: typeof d['notes'] === 'string' ? d['notes'].slice(0, 300) : '',
  };
}

export function decideUpdate(current: string, info: VersionInfo): UpdateDecision {
  if (compareVersions(current, info.minSupported) < 0) return 'required';
  return compareVersions(current, info.version) < 0 ? 'optional' : 'none';
}
