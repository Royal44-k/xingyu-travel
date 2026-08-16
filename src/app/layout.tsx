import type { Metadata, Viewport } from 'next';
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import './globals.css';

const sans = Noto_Sans_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-sc',
});

const serif = Noto_Serif_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-serif-sc',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: { default: '行屿 XINGYU', template: '%s | 行屿 XINGYU' },
  description: '透明比价、可信搭子、攻略转行程与主动式旅行守护。',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
