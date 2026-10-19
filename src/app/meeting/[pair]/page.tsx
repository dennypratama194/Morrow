import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { L } from '@/components/Label';
import { PairStrips } from '@/components/PairStrips';
import { ALL, bySlug, facts, related, seasons } from '@/lib/pairs';
import { encode } from '@/lib/share';

export const dynamicParams = false;
export const generateStaticParams = () => ALL.map((p) => ({ pair: p.slug }));

const YEAR = new Date().getUTCFullYear();

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  const p = bySlug((await params).pair);
  if (!p) return {};
  const f = facts(p, seasons(YEAR)[0]);
  const title = `Best meeting time for ${p.a} and ${p.b}`;
  const description = f.shared
    ? `${p.a} and ${p.b} share ${f.sharedText} of the working day. See the best meeting time, who stretches for it, and plan it free.`
    : `${p.a} and ${p.b} share no 9-to-5 hours, so someone always stretches. See the best meeting time, who pays for it, and how to take turns.`;
  return { title: `${title} | Morrow`, description, alternates: { canonical: `/meeting/${p.slug}` }, openGraph: { title, description, url: `/meeting/${p.slug}` } };
}

export default async function PairPage({ params }: { params: Promise<{ pair: string }> }) {
  const p = bySlug((await params).pair);
  if (!p) notFound();
  const [jan, jul] = seasons(YEAR).map((d) => facts(p, d));
  const f = jan;
  const sameDiff = jan.diff === jul.diff;
  const sameBest = jan.best[0].from === jul.best[0].from && jan.best[1].from === jul.best[1].from;
  const team = `/#${encode({ people: [f.A, f.B], dur: 60 })}`;
  const day = (d: number) => (d > 0 ? ' the next day' : d < 0 ? ' the day before' : '');
  return (
    <div className="site pair">
      <header className="pnav">
        <Link href="/" className="logo"><Logo />Morrow</Link>
        <Link className="btn" href={team}><L>Open in the planner</L></Link>
      </header>
      <main>
        <p className="k">Meeting planner · {p.a} &amp; {p.b}</p>
        <h1>Best meeting time for {p.a} and {p.b}</h1>
        <p className="lead">
          {sameBest ? 'In both January and July, the' : 'In January, the'} kindest hour is <b>{jan.best[0].from}–{jan.best[0].to} in {p.a}</b>, which is <b>{jan.best[1].from}–{jan.best[1].to} in {p.b}</b>{day(jan.best[1].day)}.{' '}
          {!sameBest && <>In July it moves to <b>{jul.best[0].from} in {p.a}</b> and <b>{jul.best[1].from} in {p.b}</b>{day(jul.best[1].day)}. </>}
          {f.payers.length === 0 ? 'Both of you are inside a 9-to-5 day.' : `${f.payers.join(' and ')} ${f.payers.length > 1 ? 'stretch' : 'stretches'} past the working day for it.`}
        </p>

        <dl className="facts">
          <div><dt>Time difference</dt><dd>{p.b} is {jan.diffText}{sameDiff ? ' in both January and July' : ` in January, and ${jul.diffText} in July`}.</dd></div>
          <div><dt>Shared 9-to-5 hours</dt><dd>{f.shared ? `${f.sharedText} a day` : 'None. Someone always stretches.'}</dd></div>
          <div><dt>Zones</dt><dd>{p.a}: {zone(f.A.tz)} · {p.b}: {zone(f.B.tz)}</dd></div>
          <div><dt>Weekly meeting</dt><dd>{f.rotates ? 'Taking turns between two or three times shares the late call more fairly. The planner shows which.' : f.payers.length ? `No rotation beats this hour, so ${f.payers.join(' and ')} carries it. Say so out loud.` : 'No need to rotate.'}</dd></div>
        </dl>

        <PairStrips a={p.a} b={p.b} />

        <section className="pcta">
          <h2>Add the rest of your team.</h2>
          <p className="mute">Open this pair in the planner, add more cities, set real working hours, and export a weekly invite. Free, no sign-up.</p>
          <Link className="btn btn-a" href={team}><L>{`Plan ${p.a} and ${p.b}`}</L></Link>
        </section>

        <nav className="prel" aria-label="Other city pairs">
          <h2 className="k">Other pairs</h2>
          <ul>{related(p).map((q) => <li key={q.slug}><Link href={`/meeting/${q.slug}`}>{q.a} and {q.b}</Link></li>)}</ul>
        </nav>
      </main>
      <footer className="foot">
        <Link href="/" className="logo"><Logo />Morrow</Link>
        <span className="mute">Times are worked out with the same scoring as the planner, for 9-to-5 days that stretch from 07:00 to 22:00.</span>
        <span className="mute">Built by <a href="https://dennypratama.com">Denny Pratama</a></span>
      </footer>
    </div>
  );
}

const zone = (tz: string) => tz.replace(/_/g, ' ');
