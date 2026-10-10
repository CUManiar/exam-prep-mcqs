// Lightweight Service Worker for UPSC Exam Prep PWA
const CACHE_NAME = 'upsc-prep-v1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/vendor/pdfjs/pdf.min.js',
  '/vendor/pdfjs/pdf.worker.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('Pre-caching non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle GET requests for http(s)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  // Don't intercept API endpoints
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Cache successful responses for vendor assets and images
        if (
          networkResponse.status === 200 &&
          (event.request.url.includes('/vendor/') || event.request.url.includes('/icon'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
