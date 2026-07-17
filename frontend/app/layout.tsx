import type { Metadata } from 'next';
import { Inria_Serif, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { SessionProvider } from '@/entities/session';

import './globals.css';

// Self-hosted by Next (no runtime request, no layout shift). Exposes the CSS
// variables consumed by shared/ui/theme/theme.css.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const inriaSerif = Inria_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-inria-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Turbo Notes',
  description: 'A tiny notes app for the Turbo AI challenge.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${inriaSerif.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
