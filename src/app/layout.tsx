import type { Metadata, Viewport } from 'next';
import { Lora, Nunito } from 'next/font/google';
import './globals.css';

const display = Lora({ subsets: ['latin', 'cyrillic'], variable: '--font-display', display: 'swap' });
const body = Nunito({ subsets: ['latin', 'cyrillic'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'Теплица — уютная игра о садоводстве',
  description: 'Верните к жизни заброшенную теплицу, росток за ростком.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2f4a38',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
