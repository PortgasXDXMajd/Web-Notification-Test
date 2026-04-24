import type { Metadata, Viewport } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Web Push PoC',
  description: 'Targeted web push notification proof of concept',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Push PoC',
    statusBarStyle: 'default'
  }
};

export const viewport: Viewport = {
  themeColor: '#0f766e'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
