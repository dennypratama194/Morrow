import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <main className="nf">
      <Link href="/" className="logo"><Logo />Morrow</Link>
      <h1>It&rsquo;s a different hour<br /><em>somewhere else.</em></h1>
      <p>This page doesn&rsquo;t exist in any time zone.</p>
      <Link href="/" className="btn btn-a">Back to the planner</Link>
    </main>
  );
}
