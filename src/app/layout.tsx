import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { DESCRIPTION, FAQ, NAME, SITE_URL, TITLE } from '@/lib/site';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: NAME,
  keywords: ['time zone meeting planner', 'meeting time across time zones', 'time zone converter for teams', 'remote team scheduling', 'world clock meeting planner', 'fair meeting rotation'],
  authors: [{ name: 'Denny Pratama', url: 'https://dennypratama.com' }],
  creator: 'Denny Pratama',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: '/', siteName: NAME, title: 'Morrow: somebody always takes the late call', description: DESCRIPTION, locale: 'en_US' },
  twitter: { card: 'summary_large_image', title: 'Morrow: somebody always takes the late call', description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#EEEAE1' };

// what search engines read about the page: a free web app, and its FAQ, both describing only what is on the page
const LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: NAME,
    url: SITE_URL,
    description: DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any (web browser)',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    creator: { '@type': 'Person', name: 'Denny Pratama', url: 'https://dennypratama.com' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD).replace(/</g, '\\u003c') }} />
      </body>
    </html>
  );
}
