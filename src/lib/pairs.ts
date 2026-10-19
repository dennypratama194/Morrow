import { CITIES, type City } from './cities.ts';
import { ranked, rotation, slots, type Person, type Range } from './plan.ts';
import { dayStart, hhmm, local, offset } from './tz.ts';

/**
 * City pairs that spread-out teams actually schedule across: the big hiring and client hubs against each other and
 * against the places remote work gets done. Each one gets its own page answering "best meeting time for A and B".
 */
const PAIRS: [string, string][] = [
  ['London', 'New York'], ['London', 'San Francisco'], ['London', 'Jakarta'], ['London', 'Bangalore'], ['London', 'Manila'],
  ['London', 'Singapore'], ['London', 'Sydney'], ['London', 'Dubai'], ['London', 'Lagos'], ['London', 'Toronto'],
  ['New York', 'San Francisco'], ['New York', 'Jakarta'], ['New York', 'Bangalore'], ['New York', 'Manila'], ['New York', 'Berlin'],
  ['New York', 'Tokyo'], ['New York', 'Sydney'], ['New York', 'São Paulo'], ['New York', 'Mexico City'], ['New York', 'Lisbon'],
  ['San Francisco', 'Bangalore'], ['San Francisco', 'Manila'], ['San Francisco', 'Jakarta'], ['San Francisco', 'Tokyo'], ['San Francisco', 'Sydney'],
  ['San Francisco', 'Berlin'], ['San Francisco', 'Singapore'], ['San Francisco', 'Buenos Aires'], ['Berlin', 'Bangalore'], ['Berlin', 'Jakarta'],
  ['Berlin', 'Singapore'], ['Amsterdam', 'Jakarta'], ['Paris', 'Ho Chi Minh City'], ['Sydney', 'Manila'], ['Sydney', 'Bangalore'],
  ['Singapore', 'Dubai'], ['Toronto', 'Manila'], ['Dubai', 'Manila'], ['Tokyo', 'Jakarta'], ['Melbourne', 'Jakarta'],
];

const WORK: Range = [540, 1020];
const OK: Range = [420, 1320];
export const city = (n: string): City => {
  const c = CITIES.find((x) => x[0] === n);
  if (!c) throw new Error(`no city ${n}`);
  return c;
};
export const person = (c: City): Person => ({ name: c[0], city: c[0], tz: c[1], la: c[2], lo: c[3], work: WORK, ok: OK });
export const slug = (a: string, b: string) => `${a}-and-${b}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-');

export type Pair = { a: string; b: string; slug: string };
export const ALL: Pair[] = PAIRS.map(([a, b]) => ({ a, b, slug: slug(a, b) }));
export const bySlug = (s: string) => ALL.find((p) => p.slug === s);
export const related = (p: Pair) => ALL.filter((q) => q !== p && (q.a === p.a || q.b === p.b || q.a === p.b || q.b === p.a)).slice(0, 8);

// "7 hours ahead of London", "3 hours behind New York", "on the same time as Paris"
const diffLabel = (h: number, of: string) => (h === 0 ? `on the same time as ${of}` : `${Math.abs(h)} hour${Math.abs(h) === 1 ? '' : 's'} ${h > 0 ? `ahead of ${of}` : `behind ${of}`}`);
const hrs = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} hour${h === 1 ? '' : 's'}`;

/**
 * The facts a pair page states, all computed from the same scoring as the planner for a given week, so the words on
 * the page are never written by hand: the time difference, how many of their 9-to-5 hours overlap, the best hour,
 * who stretches for it, and whether taking turns would help.
 */
export function facts(p: Pair, date: string) {
  const A = person(city(p.a));
  const B = person(city(p.b));
  const t = dayStart(A.tz, date) + 12 * 3600000;
  const diff = (offset(B.tz, t) - offset(A.tz, t)) / 60;
  const half = slots([A, B], A.tz, date, 30);
  const shared = half.filter((s) => s.out === 0).length / 2;
  const hour = slots([A, B], A.tz, date, 60);
  const best = ranked(hour)[0];
  const rot = rotation(hour);
  const at = (j: number) => ({ from: hhmm(best.seats[j].min), to: hhmm((best.seats[j].min + 60) % 1440), day: best.seats[j].day });
  const payers = [A, B].filter((_, j) => best.seats[j].out > 0).map((x) => x.name);
  return { A, B, diff, diffText: diffLabel(diff, A.name), shared, sharedText: hrs(shared), best: [at(0), at(1)], payers, rotates: !!rot, rot, hour };
}

/** Mid-January and mid-July of a year, the two sides of most daylight saving changes. */
export const seasons = (year: number) => [`${year}-01-14`, `${year}-07-14`] as const;

export const localNow = (tz: string) => hhmm(local(tz, Date.now()).min);
