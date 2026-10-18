'use client';

import { useState } from 'react';
import { L } from './Label';
import { CityPicker } from './CityPicker';
import type { City } from '@/lib/cities';

const FEATURES: [string, string][] = [
  ['Daylight saving, handled', 'Offsets come from your browser’s own time zone database for the week you pick, so a meeting planned in October is still right in November.'],
  ['Share it with a link', 'The whole team lives in the link. Send it in Slack and everyone sees the same plan, no account needed.'],
  ['Straight to the calendar', 'Add a weekly Google Calendar event, or download an .ics with the whole rotation already staggered week by week.'],
  ['Hours that fit real people', 'Set each person’s working hours and how far they’ll stretch. Night shifts that run past midnight work too.'],
  ['Your team on the globe', 'The globe at the top shows your own people at their real local time, under where the sun really is right now.'],
  ['Nothing to sign up for', 'No account and no database. What you type stays in your browser and the link you share.'],
];

export function Features() {
  return (
    <section className="sec feat" id="features">
      <p className="k">04 · What you get</p>
      <h2 className="h">Small tool.<br />No sign-up.</h2>
      <ul>
        {FEATURES.map(([t, d], i) => (
          <li key={t} style={{ '--dl': `${0.1 + i * 0.06}s` } as React.CSSProperties}><small className="mono">{String(i + 1).padStart(2, '0')}</small><h3>{t}</h3><p>{d}</p></li>
        ))}
      </ul>
    </section>
  );
}

const FAQ: [string, string][] = [
  ['Is Morrow free?', 'Yes. There is no account and no paid plan.'],
  ['Where is my team stored?', 'Only in the link. The team is written into the part of the URL after the #, which browsers never send to a server. If you lose the link, the plan is gone.'],
  ['Why not use my calendar’s “find a time”?', 'It finds a slot where everyone is free. It doesn’t tell you that the slot is 9 pm for the same person every week, and it won’t suggest taking turns.'],
  ['How does it choose a rotation?', 'It tries every set of two or three of the best times and keeps the one that is kindest to the worst-off person. It only suggests rotating when that cuts their share by at least a quarter, and never pushes anyone outside the hours they said they’d stretch to.'],
  ['Does it work across a daylight saving change?', 'Times are right for the week you pick. Zones change their clocks on different dates, so check the plan again around a change; the calendar events follow your own zone.'],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="sec faq" id="faq">
      <p className="k">06 · Questions</p>
      <div className="faq-l">
        {FAQ.map(([q, a], i) => (
          <div key={q} className={`qa${open === i ? ' on' : ''}`}>
            <h3>
              <button aria-expanded={open === i} aria-controls={`qa-${i}`} id={`qq-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                {q}<i aria-hidden="true" />
              </button>
            </h3>
            <div className="qa-b" id={`qa-${i}`} role="region" aria-labelledby={`qq-${i}`}>
              <div><p>{a}</p></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Cta({ onPick }: { onPick: (c: City) => void }) {
  return (
    <section className="cta" id="start">
      <h2><span>Stop giving the late call</span><em>to the same person.</em></h2>
      <div className="cta-act">
        <CityPicker onPick={onPick} placeholder="Type a city to start" />
        <a className="btn btn-a" href="#planner"><L>Find our hours</L></a>
      </div>
      <p className="mute">Free. No account. Nothing leaves your browser.</p>
    </section>
  );
}
