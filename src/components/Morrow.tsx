'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe } from './Globe';
import { CityPicker } from './CityPicker';
import { Logo } from './Logo';
import { L } from './Label';
import { DateField, Menu } from './Pickers';
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
// one-click teams for a first look; the copy names the shape, the cities are where such teams usually sit
const PRESETS: { label: string; cities: string[] }[] = [
  { label: 'US East + Europe + Asia', cities: ['New York', 'London', 'Singapore'] },
  { label: 'Indonesia + Europe + US', cities: ['Jakarta', 'Amsterdam', 'San Francisco'] },
  { label: 'India + UK + US West', cities: ['Mumbai', 'London', 'Los Angeles'] },
];
// a slot's start as a UTC minute of the day: what a pick and a shared link hold, so both survive a change of zone
const um = (s: Slot) => ((s.t / 60000) % 1440 + 1440) % 1440;
const gap = (a: number, b: number) => Math.min((a - b + 1440) % 1440, (b - a + 1440) % 1440);
// zones people often schedule in even when nobody on the team lives there
const COMMON: [string, string, string][] = [
  ['Europe/Berlin', 'en-GB', 'Central Europe'], ['Europe/London', 'en-GB', 'UK'], ['America/New_York', 'en-US', 'US East'],
  ['America/Los_Angeles', 'en-US', 'US West'], ['UTC', 'en-GB', 'UTC'],
];
// a zone's everyday short name on a given day: CET or CEST, EST or EDT
const abbr = (tz: string, t: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: 'short' }).formatToParts(t).find((x) => x.type === 'timeZoneName')?.value ?? tz;
const TIMES = Array.from({ length: CELLS }, (_, i) => i * STEP);

const hours = (h: number) => (h === 0 ? '0 h' : `${Number.isInteger(h) ? h : h.toFixed(1)} h`);
const dayTag = (d: number) => (d === 0 ? '' : d > 0 ? ' +1 day' : ' −1 day');
const who = (p: Person) => p.name || p.city;
// a short tag for who pays for a slot: "Jakarta +1 h late", or "off hours" past what they'd stretch to
const tag = (p: Person, x: { min: number; out: number; off: boolean }) => (x.off ? `${who(p)} · off hours` : `${who(p)} +${hours(x.out)} ${edge(p, x.min)}`);
// whether a half hour falls inside a meeting that starts at `at` and runs `dur` minutes, wrapping past midnight
const within = (m: number, at: number | null | undefined, dur: number) => at != null && (m - at + 1440) % 1440 < dur;
// whether a slot outside work runs past the end of someone's day or into its start, whichever edge is nearer
const edge = (p: Person, min: number) => ((min - p.work[1] + 1440) % 1440 <= (p.work[0] - min + 1440) % 1440 ? 'late' : 'early');

export function Morrow() {
  const [viewer, setViewer] = useState('UTC');
  // the zone the planner reads in: the viewer's own unless they pick another, such as the one a meeting was set in
  const [base, setBase] = useState<string | null>(null);
  const [date, setDate] = useState('2026-10-19');
  const [people, setPeople] = useState<Person[]>(EXAMPLE);
  const [dur, setDur] = useState(60);
  const [example, setExample] = useState(true);
  // the picked meeting, as a UTC minute of the day (see um); null means the best time
  const [pick, setPick] = useState<number | null>(null);
  // true once the person picked a time themselves, which brings the export bar up
  const [chose, setChose] = useState(false);
  const [toast, setToast] = useState('');
  const [hover, setHover] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  // the per-person hours editors stay folded away until asked for
  const [hrs, setHrs] = useState(false);
  useReveal();

  // the browser's own zone and date, and a shared team from the link, only exist on the client
  useEffect(() => {
    const tz = here();
    setViewer(tz);
    setDate(today(tz));
    const t = decode(location.hash);
    if (t) { setPeople(t.people); setDur(t.dur); setExample(false); setPick(t.at ?? null); }
  }, []);

  useEffect(() => {
    if (example) return;
    const h = people.length ? `#${encode({ people, dur, at: pick })}` : ' ';
    history.replaceState(null, '', h === ' ' ? location.pathname : h);
  }, [people, dur, example, pick]);

  const edit = (f: (p: Person[]) => Person[]) => {
    setPeople((p) => f(p).slice(0, 12));
    setExample(false);
    setPick(null);
    setChose(false);
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
  const mineCity = useMemo(() => (CITIES.find((x) => x[1] === viewer && viewer.endsWith(x[0].replace(/ /g, '_'))) ?? CITIES.find((x) => x[1] === viewer))?.[0], [viewer]);
  const set = (i: number, patch: Partial<Person>) => {
    setPeople((p) => p.map((x, k) => (k === i ? { ...x, ...patch } : x)));
    setExample(false);
  };

  const zone = base ?? viewer;
  const all = useMemo(() => (people.length ? slots(people, zone, date, dur) : []), [people, zone, date, dur]);
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
  // the picked slot, or the nearest one when the zone's half hours fall on other minutes (Nepal is UTC+5:45)
  const chosen = (pick == null ? null : [...all].sort((a, b) => gap(um(a), pick) - gap(um(b), pick))[0]) ?? top[0];
  const choose = (s: Slot) => { setPick(um(s)); setChose(true); setExample(false); };
  // the best rotation there is, even one too small to suggest, to say how little taking turns would help
  const near = useMemo(() => (rot ? null : rotation(all, 0)), [all, rot]);
  const zoneOff = all[0] ? offset(zone, all[0].t + 12 * 3600000) : 0;
  const noon = all[24]?.t ?? Date.now();
  const zones = useMemo(() => {
    const seen = new Set<string>();
    const out: { tz: string; label: string; short: string }[] = [];
    const put = (tz: string, label: string, short: string) => { if (!seen.has(tz)) { seen.add(tz); out.push({ tz, label, short }); } };
    put(viewer, 'Your time', 'your time');
    for (const p of people) put(p.tz, `${p.city} time`, `${p.city} time`);
    for (const [tz, loc, area] of COMMON) {
      const a = abbr(tz, noon, loc);
      put(tz, tz === 'UTC' ? 'UTC' : `${a} · ${area}`, a);
    }
    return out;
  }, [viewer, people, noon]);
  const zoneName = zones.find((z) => z.tz === zone)?.short ?? zone;

  const notes = (s: Slot) => people.map((p, j) => `${who(p)}: ${hhmm(s.seats[j].min)}${dayTag(s.seats[j].day)}`).join('\n') + '\n\nPlanned with Morrow';
  const downloadIcs = (list: Slot[]) => {
    const text = ics(list.map((s) => ({ start: s.start, title: 'Team meeting', notes: notes(s) })), { tz: zone, date, dur });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    a.download = list.length > 1 ? 'morrow-rotation.ics' : 'morrow-meeting.ics';
    a.click();
    URL.revokeObjectURL(a.href);
    say(list.length > 1 ? 'Rotation saved. Open the file to add every week.' : 'Calendar file saved. Open it to add the meeting.');
  };
  const say = (m: string) => { setToast(m); window.setTimeout(() => setToast((x) => (x === m ? '' : x)), 2600); };
  const copy = async () => {
    setExample(false);
    const h = encode({ people, dur, at: chosen ? um(chosen) : null });
    const url = `${location.origin}${location.pathname}#${h}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      say('Link copied. It opens this team on this time.');
    } catch { location.hash = h; say('Copy the address bar to share this plan.'); }
  };
  const preset = (cities: string[]) => {
    edit(() => cities.map((n) => fromCity(find(n))));
    setPick(null);
  };
  // drag along a row to read any time, let go to pick it; a tap picks straight away
  const at = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return all[Math.max(0, Math.min(all.length - 1, Math.floor(((e.clientX - r.left) / r.width) * all.length)))];
  };
  const drag = useRef(false);
  const acts = useRef<HTMLDivElement>(null);
  // the export bar shows once a time is picked, while the slot card's own buttons are off screen
  const [dock, setDock] = useState(false);
  useEffect(() => {
    const el = acts.current;
    if (!el || !chose) { setDock(false); return; }
    const io = new IntersectionObserver(([e]) => setDock(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, [chose, chosen?.start]);
  const down = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    drag.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setHover(at(e)?.start ?? null);
  };
  const move = (e: React.PointerEvent<HTMLElement>) => { if (drag.current || e.pointerType === 'mouse') setHover(at(e)?.start ?? null); };
  const up = (e: React.PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    drag.current = false;
    const s = at(e);
    if (s) choose(s);
    if (e.pointerType !== 'mouse') setHover(null);
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

      <Overlap people={people} best={top[0]} dur={dur} at={all[0]?.t ?? 0} zone={zone} zoneName={zoneName} />
      <Clocks people={people} />

      <section className="plan sec" id="planner" aria-labelledby="plan-h">
        <div className="plan-top">
          <p className="k">The planner</p>
          <h2 id="plan-h">Plan your team&rsquo;s meeting.</h2>
        </div>

        <div className="crew">
          <div className="crew-row">
            <ul className="chips" aria-label="Your team">
              {people.map((p, i) => (
                <li key={i}>
                  <span>{who(p)}</span>
                  <small>{utcLabel(offset(p.tz, all[0]?.t ?? Date.now()))}</small>
                  <button className="x" aria-label={`Remove ${who(p)}`} onClick={() => edit((ps) => ps.filter((_, k) => k !== i))}>×</button>
                </li>
              ))}
            </ul>
            {people.length < 12 && <CityPicker onPick={add} label="Add a teammate" placeholder={example || people.length === 0 ? 'Add your first teammate’s city' : 'Add a teammate'} />}
            {people.length > 0 && (
              <button className="lnk crew-t" aria-expanded={hrs} aria-controls="hours" onClick={() => setHrs(!hrs)}>{hrs ? 'Done editing' : 'Edit hours'}</button>
            )}
          </div>
          {(example || people.length === 0) && (
            <p className="crew-note">
              {example ? 'Example team. ' : ''}{mineCity ? `You’re added as ${mineCity}, from your browser’s time zone.` : 'You’re added from your browser’s time zone.'}
            </p>
          )}
          {(example || people.length === 0) && (
            <div className="presets" role="group" aria-label="Start from a team">
              <span>Or start from</span>
              {PRESETS.map((x) => <button key={x.label} onClick={() => preset(x.cities)}>{x.label}</button>)}
            </div>
          )}
          {hrs && people.length > 0 && (
            <ol className="people" id="hours">
              {people.map((p, i) => (
                <li key={i} className="person">
                  <div className="person-h">
                    <input aria-label="Name" value={p.name} onChange={(e) => set(i, { name: e.target.value.slice(0, 40) })} />
                    {p.name && p.name !== p.city && <span className="mute">{p.city}</span>}
                  </div>
                  <div className="hrs">
                    <span className="fld">Works <Hours l="Works from" v={p.work[0]} on={(v) => set(i, { work: [v, p.work[1]] })} />–<Hours v={p.work[1]} on={(v) => set(i, { work: [p.work[0], v] })} l="Works until" /></span>
                    <span className="fld">Will stretch <Hours l="Will stretch from" v={p.ok[0]} on={(v) => set(i, { ok: [v, p.ok[1]] })} />–<Hours v={p.ok[1]} on={(v) => set(i, { ok: [p.ok[0], v] })} l="Will stretch until" /></span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="board">
          <div className="ctrl">
            <span className="fld">Week of <DateField label="Week of" value={date} onChange={setDate} today={today(viewer)} /></span>
            <span className="fld">Times in <Menu label="Times in" value={zone} options={zones.map((z) => ({ value: z.tz, label: z.label }))} onChange={(v) => setBase(v === viewer ? null : v)} /></span>
            <span className="seg" role="group" aria-label="Meeting length" style={{ '--i': DURS.indexOf(dur) } as React.CSSProperties}>
              <i aria-hidden="true" />
              {DURS.map((d) => <button key={d} aria-pressed={dur === d} onClick={() => setDur(d)}>{d} min</button>)}
            </span>
          </div>

          {people.length > 0 && (
            <>
              <div className="strips" style={{ '--n': CELLS } as React.CSSProperties} onPointerLeave={() => { if (!drag.current) setHover(null); }}>
                {(() => {
                  const r = all.find((x) => x.start === (hover ?? chosen?.start));
                  if (!r) return null;
                  return (
                    <p className="read" aria-live="polite">
                      {people.map((p, j) => {
                        const x = r.seats[j];
                        return <span key={j} className={`rd ${x.off ? 'off' : x.out ? 'ok' : 'work'}`}><i />{who(p)} {hhmm(x.min)}{dayTag(x.day)}</span>;
                      })}
                    </p>
                  );
                })()}
                <div className="axis" aria-hidden="true">
                  <span className="lab">{zoneName === 'your time' ? 'Your time' : zoneName} · {utcLabel(zoneOff)}</span>
                  <span className="ticks">{TIMES.filter((m) => m % 180 === 0).map((m) => <i key={m}>{hhmm(m)}</i>)}</span>
                </div>
                {people.map((p, j) => (
                  <div className="row" key={j}>
                    <span className="lab">{who(p)}</span>
                    <span className="cells" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = false; setHover(null); }}>
                      {all.map((s, k) => {
                        const c = cell(p, s.seats[j].min);
                        // runs of the same kind join into one bar, rounded only at their ends
                        const prev = k > 0 && cell(p, all[k - 1].seats[j].min) === c;
                        const next = k < all.length - 1 && cell(p, all[k + 1].seats[j].min) === c;
                        return (
                          <button
                            key={s.start}
                            className={`c ${c}${prev ? '' : ' rs'}${next ? '' : ' re'}${within(s.start, chosen?.start, dur) ? ' sel' : ''}${within(s.start, hover, dur) ? ' hov' : ''}`}
                            aria-label={`${hhmm(s.start)} ${zoneName}, ${hhmm(s.seats[j].min)} for ${who(p)}`}
                            // pointers pick on release (see up); this is the keyboard's Enter or Space
                            onClick={(e) => { if (e.detail === 0) choose(s); }}
                            onFocus={() => setHover(s.start)}
                            onBlur={() => setHover(null)}
                            tabIndex={j === 0 ? 0 : -1}
                          />
                        );
                      })}
                    </span>
                  </div>
                ))}
                <p className="legend" aria-hidden="true"><i className="work" />Working <i className="ok" />Will stretch <i className="off" />Asleep or off<span className="hint">{hover === null ? 'Drag along a row to pick a time' : 'Let go to pick this time'}</span></p>
              </div>

              <div className="below">
                {chosen && (
                  <div className="slot" key={chosen.start}>
                    <h3>{hhmm(chosen.start)}–{hhmm((chosen.start + dur) % 1440)} <span>{zoneName}</span></h3>
                    <p className="tags slot-pay">
                      {payers.length === 0
                        ? <i className="pay none">Everyone in working hours</i>
                        : chosen.seats.map((x, j) => (x.out ? <i key={j} className={`pay ${x.off ? 'off' : 'ok'}`}>{tag(people[j], x)}</i> : null))}
                    </p>
                    <div className="acts" ref={acts}>
                      <a className="btn btn-a" href={google({ t: chosen.t, dur, title: 'Team meeting', notes: notes(chosen), tz: zone })} target="_blank" rel="noreferrer"><L>Add weekly to Google Calendar</L></a>
                      <button className="btn btn-l" onClick={() => downloadIcs([chosen])}><L>.ics</L></button>
                      <button className="btn btn-l" onClick={copy}><L>{copied ? 'Link copied' : 'Copy link'}</L></button>
                    </div>
                    <p className="fine">The link carries your team&rsquo;s cities and hours, so anyone with it can see them.</p>
                    <details className="why-d">
                      <summary>See why</summary>
                      <ul className="who">
                        {people.map((p, j) => {
                          const x = chosen.seats[j];
                          return (
                            <li key={j} className={x.off ? 'off' : x.out ? 'ok' : 'work'}>
                              <span>{who(p)}</span>
                              <b>{hhmm(x.min)}–{hhmm((x.min + dur) % 1440)}<small>{dayTag(x.day)}</small></b>
                              <em>{x.off ? 'Outside the hours they’ll stretch to' : x.out ? `${hours(x.out)} outside work, ${edge(people[j], x.min) === 'late' ? 'after their day ends' : 'before their day starts'}` : 'In working hours'}</em>
                            </li>
                          );
                        })}
                      </ul>
                      <p>Every half hour of the day gets a score. An hour outside someone&rsquo;s working day counts against it, and counts more the further it falls from their day. Past the hours they&rsquo;ll stretch to, it counts three times. Lower is kinder.</p>
                      <ul className="score">
                        {people.map((p, j) => <li key={j}><span>{who(p)}</span><b>{chosen.seats[j].pain.toFixed(1)}</b></li>)}
                        <li className="tot"><span>This time</span><b>{chosen.pain.toFixed(1)}</b></li>
                        {top[0] && top[0].start !== chosen.start && <li className="tot"><span>Best time, {hhmm(top[0].start)}</span><b>{top[0].pain.toFixed(1)}</b></li>}
                      </ul>
                      <a href="#how">How fairness works</a>
                    </details>
                  </div>
                )}

                <div className="best">
                  <h3>Best times</h3>
                  <ol>
                    {top.map((s) => {
                      const worst = s.seats.reduce((w, x, j) => (x.pain > s.seats[w].pain ? j : w), 0);
                      const more = s.seats.filter((x) => x.out).length - 1;
                      return (
                        <li key={s.start}>
                          <button aria-pressed={chosen?.start === s.start} onClick={() => choose(s)}>
                            <b>{hhmm(s.start)}</b>
                            {s.out === 0
                              ? <i className="pay none">Everyone in hours</i>
                              : <i className={`pay ${s.seats[worst].off ? 'off' : 'ok'}`}>{tag(people[worst], s.seats[worst])}</i>}
                            {more > 0 && <small className="more">+{more} more</small>}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              <div className={`turns${rot ? '' : ' none'}`}>
                <h3>Take turns</h3>
                {rot ? (() => {
                  const w = rot.fixed.indexOf(Math.max(...rot.fixed));
                  const most = Math.max(...rot.fixed, ...rot.load) || 1;
                  const cut = Math.round((1 - Math.max(...rot.load) / Math.max(...rot.fixed)) * 100);
                  return (
                    <>
                      <p>No single time is fair to this team. Rotate weekly, and <b>{who(people[w])}</b>&rsquo;s share of bad hours drops <b>{cut}%</b>.</p>
                      <ol className="turns-s">
                        {rot.slots.map((s, k) => (
                          <li key={s.start}>
                            <small>Week {k + 1}</small>
                            <b>{hhmm(s.start)}</b>
                            <span>{s.out === 0 ? 'Everyone in hours' : s.seats.map((x, j) => (x.off ? `${who(people[j])} off hours` : x.out ? `${who(people[j])} stretches` : '')).filter(Boolean).join(', ')}</span>
                          </li>
                        ))}
                      </ol>
                      <button className="btn btn-a" onClick={() => downloadIcs(rot.slots)}><L>Download the rotation (.ics)</L></button>
                      <details className="why-d">
                        <summary>See why</summary>
                        <div className="cmp">
                          <ul>
                            {people.map((p, j) => (
                              <li key={j} className={j === w ? 'worst' : ''}>
                                <span>{who(p)}</span>
                                <span className="bars" aria-label={`${who(p)}: ${rot.fixed[j].toFixed(1)} at one time, ${rot.load[j].toFixed(1)} taking turns`}>
                                  <i className="fix" style={{ width: `${(rot.fixed[j] / most) * 100}%` }} />
                                  <i className="rot" style={{ width: `${(rot.load[j] / most) * 100}%` }} />
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p className="legend2"><i className="fix" />Same time every week <i className="rot" />Taking turns</p>
                        </div>
                        <table>
                          <caption>When each person meets, in their own time</caption>
                          <thead><tr><th scope="col">Person</th><th scope="col">Same time every week</th><th scope="col">Taking turns</th></tr></thead>
                          <tbody>
                            {people.map((p, j) => {
                              const at = (s: Slot) => s.seats[j];
                              const mark = (s: Slot) => (at(s).off ? ' (off hours)' : '');
                              return (
                                <tr key={j} className={rot.best.seats[j].out || rot.slots.some((s) => at(s).out) ? 'pays' : ''}>
                                  <th scope="row">{who(p)}</th>
                                  <td>{hhmm(at(rot.best).min)}{mark(rot.best)}</td>
                                  <td>{rot.slots.map((s) => hhmm(at(s).min) + mark(s)).join(' / ')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <p>Morrow tries every set of two or three of the twelve best times and keeps the set where the worst-off person&rsquo;s average score is lowest. It only suggests one when that cuts their score by at least a quarter, and never sends anyone past the hours they&rsquo;ll stretch to unless the best single time already does.</p>
                      </details>
                    </>
                  );
                })() : (
                  <>
                    <p>
                      {top[0]?.out === 0
                        ? 'Everyone overlaps in working hours, so there’s nothing to rotate.'
                        : people.length < 2
                          ? 'Add at least two people to compare.'
                          : 'One fixed time is the fairest plan for this team.'}
                    </p>
                    {people.length >= 2 && top[0]?.out !== 0 && (
                      <details className="why-d">
                        <summary>See why</summary>
                        <p>
                          {near && Math.max(...near.fixed) > 0 && Math.max(...near.load) < Math.max(...near.fixed)
                            ? `Taking turns would only cut ${who(people[near.fixed.indexOf(Math.max(...near.fixed))])}’s share by ${Math.round((1 - Math.max(...near.load) / Math.max(...near.fixed)) * 100)}%. Morrow only suggests turns when they cut it by at least a quarter. Widening someone’s stretch hours can change that.`
                            : 'Every other time is as hard or harder on the worst-off person, so taking turns wouldn’t help. Widening someone’s stretch hours can change that.'}
                        </p>
                      </details>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {chosen && (
        <div className={`dock${dock ? ' on' : ''}`} aria-hidden={!dock}>
          <span><b>{hhmm(chosen.start)}</b><span className="dz">–{hhmm((chosen.start + dur) % 1440)} {zoneName}</span></span>
          <a className="btn btn-a" tabIndex={dock ? 0 : -1} href={google({ t: chosen.t, dur, title: 'Team meeting', notes: notes(chosen), tz: zone })} target="_blank" rel="noreferrer"><L>Google Calendar</L></a>
          <button className="btn btn-l" tabIndex={dock ? 0 : -1} onClick={() => downloadIcs([chosen])}><L>.ics</L></button>
          <button className="btn btn-l" tabIndex={dock ? 0 : -1} onClick={copy}><L>{copied ? 'Copied' : 'Copy link'}</L></button>
        </div>
      )}
      <p className={`toast${toast ? ' on' : ''}`} role="status" aria-live="polite">{toast}</p>

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
        <span className="mute">Free. No account. Team details stay in your browser until you share a link or export them.</span>
        <span className="mute">Built by <a href="https://dennypratama.com">Denny Pratama</a></span>
      </footer>
    </div>
  );
}

const HOUR_OPTS = TIMES.map((m) => ({ value: m, label: hhmm(m) }));
function Hours({ v, on, l }: { v: number; on: (v: number) => void; l: string }) {
  return <Menu size="s" label={l} value={v} options={HOUR_OPTS} onChange={on} />;
}
