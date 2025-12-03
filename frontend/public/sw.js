/* eslint-env serviceworker */
/* eslint-disable */
// Disabled service worker. All previous offline/caching logic removed to fix reload and stale offline responses.
// If offline support is desired later, implement a fresh, minimal version.

self.addEventListener('install', (evt) => {
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    fetch(evt.request).catch(() => new Response('', { status: 503 }))
  );
});