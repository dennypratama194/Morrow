import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });

export const metadata: Metadata = {
  title: 'Morrow: share the late call',
  description: 'Find the hours a spread-out team shares. When there are none, Morrow rotates the bad slot so the same person stops taking every late call. Free, no sign-up, nothing leaves your browser.',
  metadataBase: new URL('https://morrow-hazel.vercel.app'),
  openGraph: { title: 'Morrow', description: 'Somebody always takes the late call. Morrow makes it not always the same somebody.' },
};

export const viewport: Viewport = { themeColor: '#EEEAE1' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
