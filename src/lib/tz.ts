const fmts = new Map<string, Intl.DateTimeFormat>();
const fmt = (tz: string) => {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    fmts.set(tz, f);
  }
  return f;
};

/** Minutes east of UTC in a zone at an instant, read from the browser's own tz database, so DST is always right. */
export function offset(tz: string, t: number) {
  const p: Record<string, number> = {};
  for (const { type, value } of fmt(tz).formatToParts(t)) p[type] = Number(value);
  const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((local - Math.floor(t / 60000) * 60000) / 60000);
}

/** The instant a local date ("2026-10-19") starts in a zone. */
export function dayStart(tz: string, date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d);
  const guess = wall - offset(tz, wall) * 60000;
  return wall - offset(tz, guess) * 60000;
}

/** Minutes since local midnight, and how many days the local date sits from a reference date (-1, 0, +1). */
export function local(tz: string, t: number, ref?: string) {
  const l = new Date(t + offset(tz, t) * 60000);
  const min = l.getUTCHours() * 60 + l.getUTCMinutes();
  if (!ref) return { min, day: 0 };
  const [y, m, d] = ref.split('-').map(Number);
  const day = Math.round((Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()) - Date.UTC(y, m - 1, d)) / 864e5);
  return { min, day };
}

export const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** "UTC+7", "UTC−3:30" */
export function utcLabel(off: number) {
  const s = off < 0 ? '−' : '+';
  const a = Math.abs(off);
  return `UTC${s}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''}`;
}

export const today = (tz: string) => {
  const l = new Date(Date.now() + offset(tz, Date.now()) * 60000);
  return l.toISOString().slice(0, 10);
};

export const here = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};
