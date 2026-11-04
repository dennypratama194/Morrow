'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Opt<T> = { value: T; label: string };

/** Close when a pointer goes down outside `box`, or focus leaves it. */
function useOutside(box: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [open, box, close]);
}

/** Opens upward when there is no room below. */
function useFlip(box: React.RefObject<HTMLElement | null>, open: boolean, need: number) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!open || !box.current) return;
    const r = box.current.getBoundingClientRect();
    setUp(innerHeight - r.bottom < need && r.top > innerHeight - r.bottom);
  }, [open, box, need]);
  return up;
}

/** Slides the popover left when it would run off the right edge of the screen (never past the left edge). */
function useEdge(pop: React.RefObject<HTMLElement | null>, open: boolean) {
  const [shift, setShift] = useState(0);
  useEffect(() => {
    if (!open) { setShift(0); return; }
    const r = pop.current?.getBoundingClientRect();
    if (!r) return;
    const over = r.right - (document.documentElement.clientWidth - 8);
    if (over > 0) setShift(-Math.min(over, r.left - 8));
  }, [open, pop]);
  return shift ? { left: shift } : undefined;
}

const Chev = () => (
  <svg className="pk-chev pk-dn" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
);

/** A dropdown in the site's own style: a button that opens a listbox. Keyboard works like a native select. */
export function Menu<T extends string | number>({ value, options, onChange, label, size }: { value: T; options: Opt<T>[]; onChange: (v: T) => void; label: string; size?: 's' }) {
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const box = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ s: '', t: 0 });
  const id = useId();
  const cur = Math.max(0, options.findIndex((o) => o.value === value));
  const close = () => setOpen(false);
  useOutside(box, open, close);
  const up = useFlip(box, open, 280);
  const edge = useEdge(list, open);

  useEffect(() => {
    if (!open) return;
    list.current?.focus({ preventScroll: true });
    list.current?.children[act]?.scrollIntoView({ block: 'nearest' });
  }, [open, act]);

  const show = (i = cur) => { setAct(i); setOpen(true); };
  const pick = (i: number) => { onChange(options[i].value); setOpen(false); btn.current?.focus(); };

  const onBtnKey = (e: React.KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); }
  };
  const onListKey = (e: React.KeyboardEvent) => {
    const n = options.length;
    const go = (i: number) => { e.preventDefault(); setAct(Math.max(0, Math.min(n - 1, i))); };
    if (e.key === 'ArrowDown') go(act + 1);
    else if (e.key === 'ArrowUp') go(act - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(n - 1);
    else if (e.key === 'PageDown') go(act + 8);
    else if (e.key === 'PageUp') go(act - 8);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(act); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); btn.current?.focus(); }
    else if (e.key === 'Tab') close();
    else if (e.key.length === 1) {
      // type-ahead: "0", "9" finds 09:00; "u" finds UTC
      const now = Date.now();
      const s = (now - typed.current.t < 700 ? typed.current.s : '') + e.key.toLowerCase();
      typed.current = { s, t: now };
      const i = options.findIndex((o) => o.label.toLowerCase().replace(':', '').startsWith(s));
      if (i >= 0) setAct(i);
    }
  };

  return (
    <span className={`pk${size ? ' pk-s' : ''}${open ? ' open' : ''}`} ref={box}>
      <button ref={btn} type="button" className="pk-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${options[cur]?.label}`} onClick={() => (open ? close() : show())} onKeyDown={onBtnKey}>
        <span>{options[cur]?.label}</span><Chev />
      </button>
      {open && (
        <ul ref={list} className={`pk-pop pk-list${up ? ' up' : ''}`} style={edge} role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={`${id}-${act}`} onKeyDown={onListKey}>
          {options.map((o, i) => (
            <li key={String(o.value)} id={`${id}-${i}`} role="option" aria-selected={i === cur} className={i === act ? 'act' : ''} onPointerEnter={() => setAct(i)} onClick={() => pick(i)}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

// dates as YYYY-MM-DD strings, worked on at UTC noon so no zone can shift the day
const toD = (s: string) => new Date(`${s}T12:00:00Z`);
const toS = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = toD(s); d.setUTCDate(d.getUTCDate() + n); return toS(d); };
const addMonths = (s: string, n: number) => { const d = toD(s); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last)); return toS(d); };
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(toD(s));
const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** A date button with a month calendar. Shows "4 Nov 2026", which reads the same in every country. */
export function DateField({ value, onChange, label, today }: { value: string; onChange: (v: string) => void; label: string; today?: string }) {
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(value);
  const box = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useOutside(box, open, close);
  const up = useFlip(box, open, 340);
  const pop = useRef<HTMLDivElement>(null);
  const edge = useEdge(pop, open);

  useEffect(() => { if (open) grid.current?.focus({ preventScroll: true }); }, [open]);

  const show = () => { setAct(value); setOpen(true); };
  const pick = (s: string) => { onChange(s); setOpen(false); btn.current?.focus(); };

  // the visible month: Monday-first, padded to whole weeks
  const first = `${act.slice(0, 7)}-01`;
  const lead = (toD(first).getUTCDay() + 6) % 7;
  const start = addDays(first, -lead);
  const inMonth = (s: string) => s.slice(0, 7) === act.slice(0, 7);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) { const s = addDays(start, i); if (i >= 35 && !inMonth(s)) break; days.push(s); }
  // the week the planner will use, Monday to Sunday around the chosen day
  const wkStart = addDays(value, -((toD(value).getUTCDay() + 6) % 7));
  const inWeek = (s: string) => s >= wkStart && s <= addDays(wkStart, 6);

  const onKey = (e: React.KeyboardEvent) => {
    const go = (s: string) => { e.preventDefault(); setAct(s); };
    if (e.key === 'ArrowRight') go(addDays(act, 1));
    else if (e.key === 'ArrowLeft') go(addDays(act, -1));
    else if (e.key === 'ArrowDown') go(addDays(act, 7));
    else if (e.key === 'ArrowUp') go(addDays(act, -7));
    else if (e.key === 'PageDown') go(addMonths(act, 1));
    else if (e.key === 'PageUp') go(addMonths(act, -1));
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(act); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); btn.current?.focus(); }
    else if (e.key === 'Tab') close();
  };

  return (
    <span className={`pk${open ? ' open' : ''}`} ref={box}>
      <button ref={btn} type="button" className="pk-btn" aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${fmt(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} onClick={() => (open ? close() : show())}>
        <span>{fmt(value, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <svg className="pk-chev" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1.5" y="2.5" width="11" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 6h11M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" /></svg>
      </button>
      {open && (
        <div ref={pop} className={`pk-pop pk-cal${up ? ' up' : ''}`} style={edge} role="dialog" aria-label={label}>
          <div className="cal-h">
            <button type="button" aria-label="Previous month" onClick={() => setAct(addMonths(act, -1))}>‹</button>
            <b aria-live="polite">{fmt(act, { month: 'long', year: 'numeric' })}</b>
            <button type="button" aria-label="Next month" onClick={() => setAct(addMonths(act, 1))}>›</button>
          </div>
          <div className="cal-g" ref={grid} role="grid" tabIndex={0} aria-label={fmt(act, { month: 'long', year: 'numeric' })} onKeyDown={onKey}>
            {WEEK.map((w) => <span key={w} className="cal-w" aria-hidden="true">{w}</span>)}
            {days.map((s) => (
              <button
                key={s}
                type="button"
                tabIndex={-1}
                role="gridcell"
                aria-selected={s === value}
                aria-label={fmt(s, { weekday: 'long', day: 'numeric', month: 'long' })}
                className={[inMonth(s) ? '' : 'out', inWeek(s) ? 'wk' : '', s === value ? 'sel' : '', s === act ? 'act' : '', s === today ? 'now' : ''].filter(Boolean).join(' ')}
                onClick={() => pick(s)}
              >
                {Number(s.slice(8))}
              </button>
            ))}
          </div>
          {today && <button type="button" className="cal-today" onClick={() => pick(today)}>This week</button>}
        </div>
      )}
    </span>
  );
}
