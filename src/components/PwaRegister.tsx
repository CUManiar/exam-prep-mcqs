'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {
          console.log('PWA ServiceWorker registered successfully:', reg.scope);
        })
        .catch(err => {
          console.warn('PWA ServiceWorker registration failed:', err);
        });
    }
  }, []);

  return null;
}
