import { dayStart, local, offset } from './tz.ts';

/** Hours are minutes since local midnight; a range may wrap past midnight (a night shift, 22:00 to 06:00). */
export type Range = [number, number];
export type Person = { name: string; city: string; tz: string; la: number; lo: number; work: Range; ok: Range };
export type Cell = 'work' | 'ok' | 'off';

export const STEP = 30;
export const CELLS = 1440 / STEP;
/** An hour outside someone's stretch hours (asleep, or with their kids) counts this many times an hour outside work. */
export const OFF_WEIGHT = 3;

const inside = (m: number, [a, b]: Range) => (a <= b ? m >= a && m < b : m >= a || m < b);

export const cell = (p: Person, min: number): Cell => (inside(min, p.work) ? 'work' : inside(min, p.ok) ? 'ok' : 'off');

/** Hours from a local time to the nearest edge of a range, going round the clock. */
const away = (m: number, [a, b]: Range) => Math.min((a - m + 1440) % 1440, (m - b + 1440) % 1440) / 60;

export type Seat = { min: number; day: number; out: number; off: boolean; pain: number };
export type Slot = { start: number; t: number; seats: Seat[]; pain: number; out: number };

/**
 * Every half hour of the viewer's day as a meeting start. For each person: their local time, how many of the meeting's
 * hours fall outside their working hours (`out`), and whether any fall outside the hours they said they'd stretch to.
 * `pain` is the score slots are ranked by: each hour outside work weighs more the further it is from the working day
 * (21:00 hurts more than 17:30), and hours outside stretch count OFF_WEIGHT times.
 */
export function slots(people: Person[], viewer: string, date: string, dur: number): Slot[] {
  const t0 = dayStart(viewer, date);
  const out: Slot[] = [];
  for (let i = 0; i < CELLS; i++) {
    const t = t0 + i * STEP * 60000;
    let pain = 0;
    let total = 0;
    const seats = people.map((p) => {
      const { min, day } = local(p.tz, t, date);
      let o = 0;
      let mine = 0;
      let off = false;
      for (let k = 0; k < dur; k += STEP) {
        const m = (min + k) % 1440;
        const c = cell(p, m);
        if (c === 'work') continue;
        const h = Math.min(STEP, dur - k) / 60;
        const hurt = h * (1 + away((m + h * 30) % 1440, p.work) / 2);
        o += h;
        mine += c === 'off' ? hurt * OFF_WEIGHT : hurt;
        if (c === 'off') off = true;
      }
      total += o;
      pain += mine;
      return { min, day, out: o, off, pain: mine };
    });
    out.push({ start: i * STEP, t, seats, pain, out: total });
  }
  return out;
}

/** The best starts, least painful first; ties go to the earlier slot in the viewer's day. */
export const ranked = (all: Slot[]) => [...all].sort((a, b) => a.pain - b.pain || a.start - b.start);

export type Rotation = { slots: Slot[]; load: number[]; fixed: number[]; best: Slot };

/**
 * For a recurring meeting: 2 or 3 slots to take in turn that keep the worst-off person's average pain lowest, against
 * holding it at the single best slot every time. Pain, not raw hours: an 11-hour gap costs someone an hour outside
 * work whatever the slot, and what turns can share is how late or early that hour falls. A rotation may not push
 * anyone outside the hours they'll stretch to unless the best slot already does. Returns null when the best slot keeps
 * everyone in working hours, or when no rotation cuts the worst-off person's pain by at least a quarter.
 */
export function rotation(all: Slot[]): Rotation | null {
  const order = ranked(all);
  const best = order[0];
  if (!best || best.out === 0) return null;
  const n = best.seats.length;
  const offs = best.seats.filter((x) => x.off).length;
  const avg = (set: Slot[], f: (x: Seat) => number) => Array.from({ length: n }, (_, j) => set.reduce((a, s) => a + f(s.seats[j]), 0) / set.length);
  const worst = (l: number[]) => Math.max(...l);
  const sum = (l: number[]) => l.reduce((a, b) => a + b, 0);
  const fixed = avg([best], (x) => x.pain);
  // candidates: the twelve least painful starts at least an hour apart, so a rotation is never 09:00 then 09:30
  const pool: Slot[] = [];
  for (const s of order) {
    if (pool.length === 12) break;
    if (s.seats.filter((x) => x.off).length > offs) continue;
    if (pool.every((q) => Math.abs(q.start - s.start) >= 60 && 1440 - Math.abs(q.start - s.start) >= 60)) pool.push(s);
  }
  let pick: Slot[] = [best];
  let pl = fixed;
  let pp = sum(avg([best], (x) => x.pain));
  const consider = (set: Slot[]) => {
    const l = avg(set, (x) => x.pain);
    const p = sum(avg(set, (x) => x.pain));
    const d = worst(l) - worst(pl);
    if (d < -1e-9 || (Math.abs(d) < 1e-9 && p < pp - 1e-9)) { pick = set; pl = l; pp = p; }
  };
  for (let a = 0; a < pool.length; a++)
    for (let b = a + 1; b < pool.length; b++) {
      consider([pool[a], pool[b]]);
      for (let c = b + 1; c < pool.length; c++) consider([pool[a], pool[b], pool[c]]);
    }
  // only worth asking a team to rotate when it takes at least a quarter off the worst-off person's pain
  if (pick.length < 2 || worst(pl) > worst(fixed) * 0.75) return null;
  return { slots: [...pick].sort((x, y) => x.start - y.start), load: pl, fixed, best };
}

/** Offsets for a person on the planned day, for labels. */
export const personOffset = (p: Person, viewer: string, date: string) => offset(p.tz, dayStart(viewer, date) + 12 * 3600000);
