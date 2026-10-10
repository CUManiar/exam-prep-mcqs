import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExamPrep MCQs • Prelims Practice & Exam Analytics',
  description: 'Track, practice and monitor UPSC Prelims and competitive exam preparation with live OMR testing, notes, and negative marking analysis.',
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
