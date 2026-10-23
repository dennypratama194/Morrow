'use client';

import { useEffect, useRef } from 'react';
import { LAND } from '@/lib/land';
import { hhmm, local } from '@/lib/tz';
import type { Person } from '@/lib/plan';

type V = [number, number, number];
const vec = (lat: number, lon: number): V => {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
};

/** Where the sun is overhead at an instant, so the night side drawn is the real night side. */
function sunAt(t: number): V {
  const d = new Date(t);
  const utc = d.getUTCHours() + d.getUTCMinutes() / 60;
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  const dec = -23.44 * Math.cos(((2 * Math.PI) / 365) * ((t - jan1) / 864e5 + 10));
  return vec(dec, (12 - utc) * 15);
}

/**
 * A globe of dots rising from the bottom of the hero like a horizon, lit by the real sun line, with the team on it at
 * their real local time and arcs between them. It tilts to keep the southernmost person in view, and only draws while
 * it is on screen and the tab is visible; on touch screens it draws every other frame.
 */
export function Globe({ people }: { people: Person[] }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const team = useRef(people);
  team.current = people;

  useEffect(() => {
    const c = cv.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = matchMedia('(pointer: coarse)').matches;

    const bits = Uint8Array.from(atob(LAND), (ch) => ch.charCodeAt(0));
    const land = (x: number, y: number, z: number) => {
      const i = Math.min(179, Math.floor(((Math.atan2(x, z) * 180) / Math.PI + 180) / 2));
      const j = Math.min(89, Math.floor((90 - (Math.asin(y) * 180) / Math.PI) / 2));
      const k = j * 180 + i;
      return (bits[k >> 3] >> (k & 7)) & 1;
    };
    // an even spread over the sphere, kept where there is land, with a sparse few over the sea
    const N = coarse ? 6000 : 9000;
    const pts: number[] = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const x = Math.cos(ga * i) * rr;
      const z = Math.sin(ga * i) * rr;
      const l = land(x, y, z);
      if (l || i % 7 === 0) pts.push(x, y, z, l);
    }

    let w = 0;
    let h = 0;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.max(2, Math.round(w * dpr));
      c.height = Math.max(2, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const ro = new ResizeObserver(() => { size(); if (!running) draw(0); });
    ro.observe(c);

    // the pointer nudges the spin and tilt; read from events, applied in the draw
    let px = 0.5;
    let py = 0.5;
    let pin = false;
    // only a mouse steers it: a finger scrolling the page also sends pointer moves, from far outside the globe
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = c.getBoundingClientRect();
      px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      pin = true;
    };
    const leave = () => { pin = false; };
    const host = c.parentElement!;
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointercancel', leave);

    let sun = sunAt(Date.now());
    let labels: { n: string; v: V; t: string }[] = [];
    let key = '';
    const refresh = () => {
      const now = Date.now();
      sun = sunAt(now);
      labels = team.current.map((p) => ({ n: p.name || p.city, v: vec(p.la, p.lo), t: hhmm(local(p.tz, now).min) }));
    };
    refresh();

    // start with the team turned toward the viewer: the circular mean of their longitudes, front and centre
    const lons = team.current.map((p) => (p.lo * Math.PI) / 180);
    const mean = lons.length ? (Math.atan2(lons.reduce((a, l) => a + Math.sin(l), 0), lons.reduce((a, l) => a + Math.cos(l), 0)) * 180) / Math.PI : 0;
    let spin = mean - 90 - 25;
    let tilt = 0.42;
    const draw = (dt: number) => {
      if (w < 2 || h < 2) return;
      const k = `${team.current.map((p) => p.tz + p.la + p.name).join()}`;
      if (k !== key) { key = k; refresh(); }
      // the frame is laid out for 1440 wide; a phone gets a globe as wide as the screen, not a sliver
      const s = Math.max(w / 1440, Math.min(1, h / 900) * 0.62);
      const minLat = Math.min(40, ...team.current.map((p) => p.la));
      const tiltTo = Math.max(-0.45, Math.min(0.42, ((minLat - 12) * Math.PI) / 180)) + (pin ? (py - 0.5) * 0.2 : 0);
      spin += dt * (pin ? 4 + (px - 0.5) * 40 : 5);
      tilt += (tiltTo - tilt) * Math.min(1, dt * 3 || 1);
      const cx = w / 2;
      const R = 660 * s;
      const cy = h + R - 470 * s;
      const ry = (-spin * Math.PI) / 180 - Math.PI / 2;
      const cyw = Math.cos(ry);
      const syw = Math.sin(ry);
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const proj = (x: number, y: number, z: number): V => {
        const x1 = x * cyw + z * syw;
        const z1 = -x * syw + z * cyw;
        return [cx + x1 * R, cy - (y * ct - z1 * st) * R, y * st + z1 * ct];
      };
      ctx.clearRect(0, 0, w, h);
      const [sx, sy, sz] = proj(...sun);
      const halo = ctx.createRadialGradient(sx, sy, 0, cx, cy, R * 1.25);
      halo.addColorStop(0, `rgba(255,107,44,${0.1 + Math.max(0, sz) * 0.12})`);
      halo.addColorStop(1, 'rgba(255,107,44,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i += 4) {
        const [x, y, z] = proj(pts[i], pts[i + 1], pts[i + 2]);
        if (z < -0.05 || y > h + 4) continue;
        const lit = pts[i] * sun[0] + pts[i + 1] * sun[1] + pts[i + 2] * sun[2];
        const depth = 0.3 + z * 0.7;
        let r = 1.4 * s * (0.6 + z * 0.6);
        if (!pts[i + 3]) ctx.fillStyle = `rgba(21,19,15,${0.12 * depth})`;
        else if (Math.abs(lit) < 0.06) { ctx.fillStyle = `rgba(255,107,44,${depth})`; r *= 1.6; }
        else { ctx.fillStyle = `rgba(21,19,15,${Math.min(1, depth * 1.3) * (lit > 0 ? 0.95 : 0.4)})`; r *= 1.6; }
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // every pair on the team linked, lifted off the surface, drawing on and off in turn
      const tt = performance.now() / 1000;
      ctx.strokeStyle = 'rgba(255,107,44,.85)';
      ctx.lineWidth = Math.max(1, 1.6 * s);
      let arc = 0;
      for (let a = 0; a < labels.length; a++)
        for (let b = a + 1; b < labels.length; b++, arc++) {
          const A = labels[a].v;
          const B = labels[b].v;
          const om = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
          if (om < 0.01) continue;
          const head = reduce ? 1 : (tt * 0.35 + arc * 0.17) % 1.4;
          ctx.beginPath();
          let pen = false;
          for (let q = 0; q <= 40; q++) {
            const f = q / 40;
            if (!reduce && (f > head || f < head - 0.6)) { pen = false; continue; }
            const ka = Math.sin((1 - f) * om) / Math.sin(om);
            const kb = Math.sin(f * om) / Math.sin(om);
            const lift = 1 + Math.sin(Math.PI * f) * 0.18;
            const [x, y, z] = proj((A[0] * ka + B[0] * kb) * lift, (A[1] * ka + B[1] * kb) * lift, (A[2] * ka + B[2] * kb) * lift);
            if (z < -0.1) { pen = false; continue; }
            if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
          }
          ctx.stroke();
        }
      const fs = Math.max(11, 13 * s);
      ctx.font = `500 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (const l of labels) {
        const [x, y, z] = proj(...l.v);
        if (z < 0.05 || y > h - fs) continue;
        ctx.fillStyle = '#FF6B2C';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(3.5, 4.5 * s), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(21,19,15,${Math.min(1, z * 2)})`;
        const text = `${l.n} ${l.t}`;
        const tw = ctx.measureText(text).width;
        // labels sit to the right, or the left when that would run off the edge
        ctx.fillText(text, x + 10 + tw > w - 8 ? x - 10 - tw : x + 10, y - 8);
      }
    };

    let raf = 0;
    let last = performance.now();
    let n = 0;
    let running = false;
    let seen = false;
    let lastRefresh = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (coarse && ++n % 2) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (now - lastRefresh > 15000) { lastRefresh = now; refresh(); }
      draw(dt);
    };
    const sync = () => {
      const go = seen && !reduce && !document.hidden;
      if (go === running) return;
      running = go;
      if (go) { last = performance.now(); raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
    io.observe(c);
    document.addEventListener('visibilitychange', sync);
    draw(0);
    // reduced motion still gets a globe that follows edits, just not one that turns
    const still = reduce ? window.setInterval(() => draw(0), 1000) : 0;

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(still);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointercancel', leave);
    };
  }, []);

  return <canvas className="globe" ref={cv} aria-hidden="true" />;
}
