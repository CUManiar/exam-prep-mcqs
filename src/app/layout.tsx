import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UPSC Prep & Exam Hub • Prelims & Mains',
  description: 'Track, practice and monitor UPSC Prelims and Mains preparation with real-time test evaluation and notes.',
  icons: {
    icon: '/upsc_logo.png',
    shortcut: '/upsc_logo.png',
    apple: '/upsc_logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
