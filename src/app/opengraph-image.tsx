import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const alt = 'Morrow. Nine to five, everywhere at once. A free time zone meeting planner that shares the late call.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// the hero in miniature: paper, the two-line headline, and a horizon of dots rising from the bottom
export default function OG() {
  const dots = [];
  for (let i = 0; i < 260; i++) {
    const a = Math.PI * (0.08 + (0.84 * (i % 52)) / 51);
    const r = 520 + Math.floor(i / 52) * 26;
    const x = 600 + Math.cos(a) * r;
    const y = 1040 - Math.sin(a) * r * 0.86;
    if (y < 630) dots.push({ x, y, o: i % 52 > 30 && i % 52 < 36 });
  }
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#EEEAE1', color: '#15130F', fontFamily: 'sans-serif' }}>
        {dots.map((d, i) => (
          <div key={i} style={{ position: 'absolute', left: d.x - 3, top: d.y - 3, width: 6, height: 6, background: d.o ? '#FF6B2C' : 'rgba(21,19,15,.55)' }} />
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '56px 64px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: '#FF6B2C' }} />
            Morrow
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56, fontSize: 108, lineHeight: 0.95, letterSpacing: -5 }}>
            <span>Nine to five,</span>
            <span style={{ color: '#FF6B2C', alignSelf: 'flex-end' }}>everywhere at once.</span>
          </div>
          <div style={{ marginTop: 36, fontSize: 28, color: 'rgba(21,19,15,.7)' }}>Free time zone meeting planner that shares the late call.</div>
        </div>
      </div>
    ),
    size,
  );
}
