'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe } from './Globe';
import { CityPicker } from './CityPicker';
import { Logo } from './Logo';
import { L } from './Label';
import { ALL as PAIRS } from '@/lib/pairs';
import { Clocks, Overlap, useReveal } from './Story';
import { Cta, Faq, Features } from './Extras';
import type { City } from '@/lib/cities';
import { CITIES } from '@/lib/cities';
import { cell, ranked, rotation, slots, CELLS, STEP, type Person, type Range, type Slot } from '@/lib/plan';
import { decode, encode } from '@/lib/share';
import { google, ics } from '@/lib/ics';
import { here, hhmm, offset, today, utcLabel } from '@/lib/tz';

const WORK: Range = [540, 1020];
const OK: Range = [420, 1320];
const fromCity = ([city, tz, la, lo]: City): Person => ({ name: city, city, tz, la, lo, work: WORK, ok: OK });
const find = (n: string) => CITIES.find((c) => c[0] === n)!;
// the team this was built for: someone in Indonesia working with London and New York
const EXAMPLE: Person[] = ['Jakarta', 'London', 'New York'].map((n) => fromCity(find(n)));
const DURS = [30, 60, 90];
const TIMES = Array.from({ length: CELLS }, (_, i) => i * STEP);

const hours = (h: number) => (h === 0 ? '0 h' : `${Number.isInteger(h) ? h : h.toFixed(1)} h`);
const dayTag = (d: number) => (d === 0 ? '' : d > 0 ? ' +1 day' : ' −1 day');
const who = (p: Person) => p.name || p.city;
// whether a half hour falls inside a meeting that starts at `at` and runs `dur` minutes, wrapping past midnight
const within = (m: number, at: number | null | undefined, dur: number) => at != null && (m - at + 1440) % 1440 < dur;
// whether a slot outside work runs past the end of someone's day or into its start, whichever edge is nearer
const edge = (p: Person, min: number) => ((min - p.work[1] + 1440) % 1440 <= (p.work[0] - min + 1440) % 1440 ? 'late' : 'early');
const cost = (p: Person, x: { min: number; out: number; off: boolean }) => (x.off ? `${who(p)} off hours` : `${who(p)} ${hours(x.out)} ${edge(p, x.min)}`);

export function Morrow() {
  const [viewer, setViewer] = useState('UTC');
  const [date, setDate] = useState('2026-10-19');
  const [people, setPeople] = useState<Person[]>(EXAMPLE);
  const [dur, setDur] = useState(60);
  const [example, setExample] = useState(true);
  const [pick, setPick] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  useReveal();

  // the browser's own zone and date, and a shared team from the link, only exist on the client
  useEffect(() => {
    const tz = here();
    setViewer(tz);
    setDate(today(tz));
    const t = decode(location.hash);
    if (t) { setPeople(t.people); setDur(t.dur); setExample(false); }
  }, []);

  useEffect(() => {
    if (example) return;
    const h = people.length ? `#${encode({ people, dur })}` : ' ';
    history.replaceState(null, '', h === ' ' ? location.pathname : h);
  }, [people, dur, example]);

  const edit = (f: (p: Person[]) => Person[]) => {
    setPeople((p) => f(p).slice(0, 12));
    setExample(false);
    setPick(null);
  };
  // the first city typed replaces the example team with the viewer (from their browser's zone) plus that city
  const add = (c: City) => {
    if (example) {
      const mine = CITIES.find((x) => x[1] === viewer && viewer.endsWith(x[0].replace(/ /g, '_'))) ?? CITIES.find((x) => x[1] === viewer);
      const start = mine && mine[1] !== c[1] ? [{ ...fromCity(mine), name: 'You' }] : [];
      edit(() => [...start, fromCity(c)]);
    } else edit((p) => [...p, fromCity(c)]);
    document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const set = (i: number, patch: Partial<Person>) => {
    setPeople((p) => p.map((x, k) => (k === i ? { ...x, ...patch } : x)));
    setExample(false);
  };

  const all = useMemo(() => (people.length ? slots(people, viewer, date, dur) : []), [people, viewer, date, dur]);
  const order = useMemo(() => ranked(all), [all]);
  const top = useMemo(() => {
    const out: Slot[] = [];
    for (const s of order) {
      if (out.length === 4) break;
      if (out.every((q) => Math.abs(q.start - s.start) > STEP)) out.push(s);
    }
    return out;
  }, [order]);
  const rot = useMemo(() => rotation(all), [all]);
  const chosen = all.find((s) => s.start === (pick ?? top[0]?.start)) ?? top[0];
  const viewerOff = all[0] ? offset(viewer, all[0].t + 12 * 3600000) : 0;

  const notes = (s: Slot) => people.map((p, j) => `${who(p)}: ${hhmm(s.seats[j].min)}${dayTag(s.seats[j].day)}`).join('\n') + '\n\nPlanned with Morrow';
  const downloadIcs = (list: Slot[]) => {
    const text = ics(list.map((s) => ({ start: s.start, title: 'Team meeting', notes: notes(s) })), { tz: viewer, date, dur });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    a.download = list.length > 1 ? 'morrow-rotation.ics' : 'morrow-meeting.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copy = async () => {
    setExample(false);
    const url = `${location.origin}${location.pathname}#${encode({ people, dur })}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { location.hash = encode({ people, dur }); }
  };

  const payers = chosen ? people.filter((_, j) => chosen.seats[j].out > 0) : [];

  return (
    <div className="site">
      <section className="hero" id="top">
        <Globe people={people} onPick={add} />
        <header className="nav">
          <nav className="nav-l"><a href="#planner">Planner</a><a href="#how">How it works</a><a href="#faq">FAQ</a></nav>
          <a href="#top" className="logo"><Logo />Morrow</a>
          <span className="nav-r"><a href="#why">Why</a><a className="btn" href="#planner"><L>Plan a meeting</L></a></span>
        </header>
        <h1><span>Nine to five,</span><em>everywhere at once.</em></h1>
        <div className="hero-side">
          <p>Morrow is a free time zone meeting planner. It finds the hours a spread-out team actually shares, and when there are none, it takes turns, so nobody takes every call at midnight.</p>
          <a className="btn btn-a" href="#planner"><L>Find our hours</L></a>
        </div>
        <span className="chip"><b />Sun line drawn for right now</span>
      </section>

      <Overlap people={people} best={top[0]} dur={dur} at={all[0]?.t ?? 0} />
      <Clocks people={people} />

      <section className="plan sec" id="planner" aria-labelledby="plan-h">
        <div className="plan-top">
          <p className="k">The planner</p>
          <h2 id="plan-h">Plan your team&rsquo;s meeting.</h2>
          <p className="mute">
            {example ? 'This is an example team. Add a city and it becomes yours.' : 'Your team lives in the link. Nothing you type leaves your browser.'}
          </p>
        </div>

        <div className="plan-grid">
          <div className="team">
            <ol>
              {people.map((p, i) => (
                <li key={i} className="person">
                  <div className="person-h">
                    <input aria-label="Name" value={p.name} onChange={(e) => set(i, { name: e.target.value.slice(0, 40) })} />
                    <button className="x" aria-label={`Remove ${who(p)}`} onClick={() => edit((ps) => ps.filter((_, k) => k !== i))}>×</button>
                  </div>
                  <p className="mute mono">{p.city} · {utcLabel(offset(p.tz, all[0]?.t ?? Date.now()))}</p>
                  <div className="hrs">
                    <label>Works <Hours v={p.work[0]} on={(v) => set(i, { work: [v, p.work[1]] })} />–<Hours v={p.work[1]} on={(v) => set(i, { work: [p.work[0], v] })} /></label>
                    <label>Will stretch <Hours v={p.ok[0]} on={(v) => set(i, { ok: [v, p.ok[1]] })} />–<Hours v={p.ok[1]} on={(v) => set(i, { ok: [p.ok[0], v] })} /></label>
                  </div>
                </li>
              ))}
            </ol>
            {people.length < 12 && <CityPicker onPick={add} placeholder={people.length ? 'Add someone: type a city' : 'Type a city to start'} />}
          </div>

          <div className="board">
            <div className="ctrl">
              <label>Week of <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
              <span className="seg" role="group" aria-label="Meeting length" style={{ '--i': DURS.indexOf(dur) } as React.CSSProperties}>
                <i aria-hidden="true" />
                {DURS.map((d) => <button key={d} aria-pressed={dur === d} onClick={() => setDur(d)}>{d} min</button>)}
              </span>
            </div>

            {people.length > 0 && (
              <>
                <div className="strips" style={{ '--n': CELLS } as React.CSSProperties} onPointerLeave={() => setHover(null)}>
                  {(() => {
                    const r = all.find((x) => x.start === (hover ?? chosen?.start));
                    if (!r) return null;
                    return (
                      <p className="read" aria-live="polite">
                        <b>{hhmm(r.start)}–{hhmm((r.start + dur) % 1440)}</b><span className="mute"> your time</span>
                        {people.map((p, j) => {
                          const x = r.seats[j];
                          return <span key={j} className={`rd ${x.off ? 'off' : x.out ? 'ok' : 'work'}`}><i />{who(p)} {hhmm(x.min)}–{hhmm((x.min + dur) % 1440)}{dayTag(x.day)}</span>;
                        })}
                        <span className="mute rd-h">{hover === null ? 'Hover the strips to read any time. Click to pick it.' : 'Click to pick this time.'}</span>
                      </p>
                    );
                  })()}
                  <div className="axis" aria-hidden="true">
                    <span className="lab mono">Your time · {utcLabel(viewerOff)}</span>
                    <span className="ticks">{TIMES.filter((m) => m % 180 === 0).map((m) => <i key={m}>{hhmm(m)}</i>)}</span>
                  </div>
                  {people.map((p, j) => (
                    <div className="row" key={j}>
                      <span className="lab">{who(p)}</span>
                      <span className="cells">
                        {all.map((s) => {
                          const c = cell(p, s.seats[j].min);
                          return (
                            <button
                              key={s.start}
                              className={`c ${c}${within(s.start, chosen?.start, dur) ? ' sel' : ''}${within(s.start, hover, dur) ? ' hov' : ''}`}
                              aria-label={`${hhmm(s.start)} your time, ${hhmm(s.seats[j].min)} for ${who(p)}`}
                              onPointerEnter={() => setHover(s.start)}
                              onClick={() => setPick(s.start)}
                              tabIndex={j === 0 ? 0 : -1}
                            />
                          );
                        })}
                      </span>
                    </div>
                  ))}
                  <p className="legend mono" aria-hidden="true"><i className="work" />Working <i className="ok" />Will stretch <i className="off" />Asleep or off</p>
                </div>

                <div className="best">
                  <h3>Best times</h3>
                  <ol>
                    {top.map((s) => (
                      <li key={s.start}>
                        <button aria-pressed={chosen?.start === s.start} onClick={() => setPick(s.start)}>
                          <b>{hhmm(s.start)}</b>
                          <span>{s.out === 0 ? 'Everyone in working hours' : s.seats.map((x, j) => (x.out ? cost(people[j], x) : '')).filter(Boolean).join(', ')}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>

                {chosen && (
                  <div className="slot" key={chosen.start}>
                    <h3>{hhmm(chosen.start)}–{hhmm((chosen.start + dur) % 1440)} your time</h3>
                    <ul>
                      {people.map((p, j) => {
                        const x = chosen.seats[j];
                        return (
                          <li key={j} className={x.off ? 'off' : x.out ? 'ok' : 'work'}>
                            <span>{who(p)}</span>
                            <b className="mono">{hhmm(x.min)}–{hhmm((x.min + dur) % 1440)}<small>{dayTag(x.day)}</small></b>
                            <em>{x.off ? 'Outside the hours they’ll stretch to' : x.out ? `${hours(x.out)} outside work, ${edge(people[j], x.min) === 'late' ? 'after their day ends' : 'before their day starts'}` : 'In working hours'}</em>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="pays">{payers.length === 0 ? 'Nobody pays for this one.' : payers.length === 1 ? `${who(payers[0])} pays for this one, every time it repeats.` : `${payers.map(who).join(' and ')} pay for this one.`}</p>
                    <div className="acts">
                      <a className="btn" href={google({ t: chosen.t, dur, title: 'Team meeting', notes: notes(chosen), tz: viewer })} target="_blank" rel="noreferrer"><L>Add weekly to Google Calendar</L></a>
                      <button className="btn btn-l" onClick={() => downloadIcs([chosen])}><L>Download .ics</L></button>
                      <button className="btn btn-l" onClick={copy}><L>{copied ? 'Link copied' : 'Copy share link'}</L></button>
                    </div>
                  </div>
                )}

                <div className={`turns${rot ? '' : ' none'}`}>
                  <h3>Take turns</h3>
                  {rot ? (
                    <>
                      <p>No single time is fair to this team. Rotate between {rot.slots.length === 2 ? 'these two' : 'these three'}, one a week:</p>
                      <ol className="turns-s">
                        {rot.slots.map((s, k) => (
                          <li key={s.start}>
                            <small className="mono">Week {k + 1}</small>
                            <b>{hhmm(s.start)}</b>
                            <span>{s.out === 0 ? 'Everyone in hours' : s.seats.map((x, j) => (x.out ? who(people[j]) : '')).filter(Boolean).join(', ') + ' stretch'}</span>
                          </li>
                        ))}
                      </ol>
                      <table>
                        <caption className="mono">When each person meets, in their own time</caption>
                        <thead><tr><th scope="col">Person</th><th scope="col">Same time every week</th><th scope="col">Taking turns</th></tr></thead>
                        <tbody>
                          {people.map((p, j) => {
                            const at = (s: Slot) => s.seats[j];
                            const mark = (s: Slot) => (at(s).off ? ' (off hours)' : '');
                            return (
                              <tr key={j} className={rot.best.seats[j].out || rot.slots.some((s) => at(s).out) ? 'pays' : ''}>
                                <th scope="row">{who(p)}</th>
                                <td className="mono">{hhmm(at(rot.best).min)}{mark(rot.best)}</td>
                                <td className="mono">{rot.slots.map((s) => hhmm(at(s).min) + mark(s)).join(' / ')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="mute2">Same time every week, {who(people[rot.fixed.indexOf(Math.max(...rot.fixed))])} always takes the worst of it. Taking turns, the late or early end moves around.</p>
                      <button className="btn btn-a" onClick={() => downloadIcs(rot.slots)}><L>Download the rotation (.ics)</L></button>
                    </>
                  ) : (
                    <p className="mute">
                      {top[0]?.out === 0
                        ? 'Everyone overlaps inside working hours, so there is nothing to rotate.'
                        : people.length < 2
                          ? 'Add at least two people to compare.'
                          : 'No rotation here cuts the worst-off person’s share by a quarter or more, so Morrow won’t ask the team to rotate. Widening someone’s stretch hours can change that.'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="how sec" id="how" aria-labelledby="how-h">
        <p className="k">03 · How fairness works</p>
        <h2 id="how-h">Fair, not just free.</h2>
        <ol>
          <li><small className="mono">01</small><h3>Score every half hour</h3><p>Each hour a meeting spends outside someone&rsquo;s working day counts against it, more the later or earlier it falls. Hours outside the time they said they&rsquo;d stretch to count three times.</p></li>
          <li><small className="mono">02</small><h3>Say who pays</h3><p>The best single time is often the one where one person takes all of it. Morrow names them instead of calling it a perfect slot.</p></li>
          <li><small className="mono">03</small><h3>Take turns, only if it helps</h3><p>For a weekly meeting, Morrow looks for two or three times to alternate. It suggests a rotation only when that cuts the worst-off person&rsquo;s share by at least a quarter.</p></li>
        </ol>
      </section>

      <Features />

      <section className="why sec" id="why" aria-labelledby="why-h">
        <h2 id="why-h" className="k">05 · Why this exists</h2>
        <p>I&rsquo;m Denny, a product designer in Indonesia. Most of the teams I work with are hours behind me, so the late call is usually mine. Every time zone tool I tried could find a slot. None of them noticed it was always the same person staying up for it. So I built the one I wanted.</p>
        <a href="https://dennypratama.com" className="btn btn-l"><L>dennypratama.com</L></a>
      </section>

      <Faq />
      <Cta onPick={add} />

      <nav className="foot-pairs" aria-label="Popular city pairs">
        <h2 className="k">Best meeting times for popular pairs</h2>
        {PAIRS.map((p) => <a key={p.slug} href={`/meeting/${p.slug}`}>{p.a} and {p.b}</a>)}
      </nav>
      <footer className="foot">
        <span className="logo"><Logo />Morrow</span>
        <span className="mute">Free. No account. Your team lives in the link and nothing you type leaves your browser.</span>
        <span className="mute">Built by <a href="https://dennypratama.com">Denny Pratama</a></span>
      </footer>
    </div>
  );
}

function Hours({ v, on }: { v: number; on: (v: number) => void }) {
  return (
    <select value={v} onChange={(e) => on(Number(e.target.value))}>
      {TIMES.map((m) => <option key={m} value={m}>{hhmm(m)}</option>)}
    </select>
  );
}
