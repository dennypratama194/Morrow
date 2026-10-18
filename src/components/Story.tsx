'use client';

import { useEffect, useRef } from 'react';
import { cell, type Person, type Slot } from '@/lib/plan';
import { hhmm, local, offset, utcLabel } from '@/lib/tz';

const who = (p: Person) => p.name || p.city;

/**
 * 01 · Overlap: each person's day as 24 hours, first stacked as if everyone lived in one zone, then slid to where it
 * really sits in UTC when the section comes into view, with the best slot framed.
 */
export function Overlap({ people, best, dur, at }: { people: Person[]; best?: Slot; dur: number; at: number }) {
  const rows = people.slice(0, 5);
  const utc = best ? ((best.t / 60000) % 1440 + 1440) % 1440 : 0;
  const payers = best ? rows.filter((_, j) => best.seats[j]?.out).map(who) : [];
  return (
    <section className="sec ov" id="overlap">
      <p className="k">01 · Overlap</p>
      <h2 className="h">Everyone&rsquo;s nine to five,<br />slid into line.</h2>
      <div className="ov-rows" style={{ '--rows': rows.length } as React.CSSProperties}>
        {rows.map((p, i) => {
          const off = offset(p.tz, at) / 60;
          return (
            <div className="ov-row" key={i} style={{ '--off': off, '--dl': `${0.3 + i * 0.12}s` } as React.CSSProperties}>
              <span className="ov-city">{who(p)}<small>{utcLabel(off * 60)}</small></span>
              <span className="ov-strip">
                {Array.from({ length: 24 }, (_, u) => {
                  const c = cell(p, ((u * 60 + off * 60) % 1440 + 1440) % 1440);
                  return <i key={u} className={c} />;
                })}
              </span>
            </div>
          );
        })}
        {best && (
          <span className={`ov-win${utc > 720 ? ' r' : ''}`} style={{ '--at': utc / 60, '--w': dur / 60 } as React.CSSProperties}>
            <small>
              {hhmm(utc)}–{hhmm((utc + dur) % 1440)} UTC · {payers.length ? `${payers.join(' and ')} ${payers.length > 1 ? 'stretch' : 'stretches'}` : 'everyone in hours'}
            </small>
          </span>
        )}
      </div>
      <p className="note">Rows show your team, in UTC. Change the team in the planner and they follow.</p>
    </section>
  );
}

/** 02 · Time: the line that sums the problem up, over clocks that keep the real time for the team. */
export function Clocks({ people }: { people: Person[] }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const set = () => el.querySelectorAll<HTMLElement>('[data-tz]').forEach((n) => (n.textContent = hhmm(local(n.dataset.tz!, Date.now()).min)));
    set();
    const id = window.setInterval(set, 5000);
    return () => window.clearInterval(id);
  }, [people]);
  return (
    <section className="sec ty">
      <p className="k">02 · Time</p>
      <h2 className="big"><span>Your 9 am</span><span>is their <em>midnight.</em></span></h2>
      <div className="clocks" ref={box}>
        {people.slice(0, 4).map((p, i) => <p key={i}><small>{who(p)}</small><b data-tz={p.tz}>--:--</b></p>)}
      </div>
      <p className="note">These clocks show the real time for your team, right now.</p>
    </section>
  );
}

/** Sections animate in the first time they come into view. */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: 0.3 });
    document.querySelectorAll('.sec').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
}
