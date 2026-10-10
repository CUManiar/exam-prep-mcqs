import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '../components/PwaRegister';

export const metadata: Metadata = {
  title: 'UPSC Prep & Exam Hub • Prelims & Mains',
  description: 'Track, practice and monitor UPSC Prelims and Mains preparation with real-time test evaluation and notes.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UPSC Practice',
  },
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#030712',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
