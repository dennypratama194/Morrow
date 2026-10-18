import type { Person } from './plan.ts';

export type Team = { people: Person[]; dur: number };

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

/** The whole team in the URL hash, which browsers never send to a server, so a shared link is the only copy. */
export function encode({ people, dur }: Team) {
  const p = people.map((x) => [x.name, x.city, x.tz, x.la, x.lo, ...x.work, ...x.ok]);
  return `t=${b64(JSON.stringify({ p, d: dur }))}`;
}

const minute = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 1440;

/** Reads a shared hash back, dropping anything malformed instead of trusting it. */
export function decode(hash: string): Team | null {
  const m = hash.match(/[#&]?t=([\w-]+)/);
  if (!m) return null;
  try {
    const raw = JSON.parse(unb64(m[1]));
    const zones = new Set(Intl.supportedValuesOf('timeZone'));
    const people: Person[] = [];
    for (const r of Array.isArray(raw.p) ? raw.p.slice(0, 12) : []) {
      const [name, city, tz, la, lo, ws, we, os, oe] = r;
      if (typeof tz !== 'string' || !(zones.has(tz) || tz === 'UTC') || ![ws, we, os, oe].every(minute)) continue;
      people.push({
        name: String(name ?? '').slice(0, 40),
        city: String(city ?? '').slice(0, 40),
        tz,
        la: Number(la) || 0,
        lo: Number(lo) || 0,
        work: [ws, we],
        ok: [os, oe],
      });
    }
    if (!people.length) return null;
    const dur = [30, 60, 90].includes(raw.d) ? raw.d : 60;
    return { people, dur };
  } catch {
    return null;
  }
}
