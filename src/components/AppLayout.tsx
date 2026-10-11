'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppProvider } from '../context/AppContext';
import { Navbar } from './Navbar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInExam = pathname ? pathname.startsWith('/exam') : false;

  return (
    <AppProvider>
      {!isInExam && <Navbar />}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </AppProvider>
  );
}
