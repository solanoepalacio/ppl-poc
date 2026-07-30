import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Oswald, Inter } from 'next/font/google';
import { UmamiScript } from './UmamiScript';
import './globals.css';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-oswald',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pannico',
  description: 'Recepción de órdenes',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${oswald.variable} ${inter.variable}`}>
      <body>
        <main>{children}</main>
        <UmamiScript />
      </body>
    </html>
  );
}
