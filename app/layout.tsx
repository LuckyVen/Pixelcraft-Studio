import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'PixelCraft Studio — Your canvas. Your possibilities.',
  description: 'A private browser-based image studio. Create with layers, painting, live adjustments, and local image export.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
