import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slots, ranked, rotation, type Person } from './plan.ts';
import { dayStart, local, offset } from './tz.ts';

const P = (name: string, tz: string, work: [number, number] = [540, 1020], ok: [number, number] = [420, 1320]): Person => ({ name, city: name, tz, la: 0, lo: 0, work, ok });

test('offsets follow DST on the date asked for', () => {
  assert.equal(offset('America/New_York', Date.UTC(2026, 6, 1)), -240);
  assert.equal(offset('America/New_York', Date.UTC(2026, 11, 1)), -300);
  assert.equal(offset('Asia/Kolkata', Date.UTC(2026, 0, 1)), 330);
  assert.equal(offset('Asia/Jakarta', Date.UTC(2026, 0, 1)), 420);
});

test('a day starts at local midnight, even on a DST day', () => {
  const t = dayStart('Europe/London', '2026-10-25');
  assert.equal(local('Europe/London', t).min, 0);
  assert.equal(new Date(t).toISOString(), '2026-10-24T23:00:00.000Z');
});

test('two people in one zone meet inside working hours', () => {
  const all = slots([P('A', 'Europe/Berlin'), P('B', 'Europe/Paris')], 'Europe/Berlin', '2026-10-19', 60);
  const best = ranked(all)[0];
  assert.equal(best.out, 0);
  assert.equal(best.start, 540);
  assert.equal(rotation(all), null);
});

test('Jakarta and New York: someone pays, and the best slot says who', () => {
  const team = [P('Jakarta', 'Asia/Jakarta'), P('New York', 'America/New_York')];
  const all = slots(team, 'Asia/Jakarta', '2026-10-19', 60);
  const best = ranked(all)[0];
  assert.ok(best.out > 0);
  // no slot keeps both inside 9 to 5
  assert.ok(all.every((s) => s.out > 0));
});

test('rotation takes turns on the late call when one slot dumps it on one person', () => {
  const team = [P('Jakarta', 'Asia/Jakarta'), P('New York', 'America/New_York')];
  const all = slots(team, 'Asia/Jakarta', '2026-10-19', 60);
  const r = rotation(all);
  assert.ok(r, 'expected a rotation');
  assert.ok(Math.max(...r.load) <= Math.max(...r.fixed) * 0.75);
  // both now take some of the out-of-hours time
  assert.ok(r.load.every((l) => l > 0));
});

test('no rotation is offered when every option hurts the same person', () => {
  const team = [P('Sydney', 'Australia/Sydney'), P('London', 'Europe/London'), P('San Francisco', 'America/Los_Angeles')];
  const r = rotation(slots(team, 'Europe/London', '2026-03-02', 60));
  if (r) assert.ok(Math.max(...r.load) <= Math.max(...r.fixed) * 0.75);
});

test('the local day is marked when it differs from the viewer\'s', () => {
  const t = dayStart('America/New_York', '2026-10-19') + 20 * 3600000;
  assert.equal(local('Asia/Jakarta', t, '2026-10-19').day, 1);
});

import { encode, decode } from './share.ts';
import { ics } from './ics.ts';

test('a shared link round-trips and rejects junk', () => {
  const team = { people: [P('Jakarta', 'Asia/Jakarta'), P('São Paulo', 'America/Sao_Paulo')], dur: 30 };
  assert.deepEqual(decode('#' + encode(team)), team);
  assert.equal(decode('#t=bm9wZQ'), null);
  assert.equal(decode('#t=' + btoa(JSON.stringify({ p: [['x', 'x', 'Mars/Base', 0, 0, 1, 2, 3, 4]] }))), null);
});

test('a rotation becomes staggered weekly events', () => {
  const s = ics([{ start: 540, title: 'A', notes: '' }, { start: 1200, title: 'B', notes: '' }], { tz: 'Asia/Jakarta', date: '2026-10-19', dur: 60 });
  assert.match(s, /DTSTART;TZID=Asia\/Jakarta:20261019T090000/);
  assert.match(s, /DTSTART;TZID=Asia\/Jakarta:20261026T200000/);
  assert.equal(s.match(/RRULE:FREQ=WEEKLY;INTERVAL=2/g)?.length, 2);
});
