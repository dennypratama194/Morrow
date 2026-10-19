'use client';

import { useEffect, useState } from 'react';
import { cell, CELLS, ranked, slots, type Slot } from '@/lib/plan';
import { city, person, seasons } from '@/lib/pairs';
import { hhmm, today } from '@/lib/tz';

const TICKS = Array.from({ length: 8 }, (_, i) => i * 180);

/**
 * The two working days side by side for this week, in the first city's time. The page is built with mid-January;
 * once in the browser it redraws for the actual week, so a daylight saving change since the build shows up.
 */
export function PairStrips({ a, b }: { a: string; b: string }) {
  const people = [person(city(a)), person(city(b))];
  const [date, setDate] = useState<string>(() => seasons(new Date().getUTCFullYear())[0]);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => setDate(today(people[0].tz)), [people[0].tz]);
  const all = slots(people, people[0].tz, date, 60);
  const best = ranked(all)[0];
  const r: Slot = all.find((s) => s.start === hover) ?? best;
  const on = (m: number, at: number) => (m - at + 1440) % 1440 < 60;
  return (
    <div className="strips pstrips" style={{ '--n': CELLS } as React.CSSProperties} onPointerLeave={() => setHover(null)}>
      <p className="read" aria-live="polite">
        <b>{hhmm(r.start)}–{hhmm((r.start + 60) % 1440)}</b><span className="mute"> in {a}</span>
        {people.map((p, j) => {
          const x = r.seats[j];
          return <span key={j} className={`rd ${x.off ? 'off' : x.out ? 'ok' : 'work'}`}><i />{p.name} {hhmm(x.min)}–{hhmm((x.min + 60) % 1440)}{x.day > 0 ? ' +1 day' : x.day < 0 ? ' −1 day' : ''}</span>;
        })}
        <span className="mute rd-h">{hover === null ? `Best hour this week. Hover to read any hour.` : ''}</span>
      </p>
      <div className="axis" aria-hidden="true">
        <span className="lab mono">{a} time</span>
        <span className="ticks">{TICKS.map((m) => <i key={m}>{hhmm(m)}</i>)}</span>
      </div>
      {people.map((p, j) => (
        <div className="row" key={j}>
          <span className="lab">{p.name}</span>
          <span className="cells">
            {all.map((s) => (
              <span
                key={s.start}
                className={`c ${cell(p, s.seats[j].min)}${on(s.start, best.start) ? ' sel' : ''}${hover !== null && on(s.start, hover) ? ' hov' : ''}`}
                onPointerEnter={() => setHover(s.start)}
              />
            ))}
          </span>
        </div>
      ))}
      <p className="legend mono" aria-hidden="true"><i className="work" />Working <i className="ok" />Will stretch <i className="off" />Asleep or off</p>
    </div>
  );
}
