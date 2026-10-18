'use client';

import { useId, useMemo, useState } from 'react';
import { CITIES, type City } from '@/lib/cities';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const INDEX = CITIES.map((c) => ({ c, key: norm(`${c[0]} ${c[4]}`), name: norm(c[0]) }));

/** Type a city, pick it with the arrows or a tap. Matches on the city and its country, accents ignored. */
export function CityPicker({ onPick, placeholder = 'Add a city', label = 'Add a city' }: { onPick: (c: City) => void; placeholder?: string; label?: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const id = useId();
  const hits = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    const starts = INDEX.filter((x) => x.name.startsWith(n));
    const rest = INDEX.filter((x) => !x.name.startsWith(n) && x.key.includes(n));
    return [...starts, ...rest].slice(0, 7).map((x) => x.c);
  }, [q]);
  const choose = (c: City) => {
    onPick(c);
    setQ('');
    setOpen(false);
    setI(0);
  };
  const show = open && hits.length > 0;
  return (
    <div className="pick">
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={show}
        aria-controls={`${id}-l`}
        aria-activedescendant={show ? `${id}-${i}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setI(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(hits.length - 1, v + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(0, v - 1)); }
          else if (e.key === 'Enter' && hits[i]) { e.preventDefault(); choose(hits[i]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {show && (
        <ul className="pick-l" role="listbox" id={`${id}-l`}>
          {hits.map((c, k) => (
            <li
              key={c[0] + c[1]}
              id={`${id}-${k}`}
              role="option"
              aria-selected={k === i}
              onPointerDown={(e) => { e.preventDefault(); choose(c); }}
              onPointerEnter={() => setI(k)}
            >
              <b>{c[0]}</b>
              <small>{c[4]}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
