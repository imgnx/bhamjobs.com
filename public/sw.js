// Lightweight connectivity service worker: no request caching.
// Sends postMessage events on install/activate and when client requests status.

const CACHE_NAME = 'app-shell-v1';
const ASSETS = [
  '/',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for ping from pages to report connectivity
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'PING') {
    event.source?.postMessage({ type: 'PONG', online: navigator.onLine });
  }
});

// Cache-first for GET static assets; network-first for documents.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return; // same-origin only

  if (req.mode === 'navigate') {
    // Network-first for HTML
    event.respondWith(
      fetch(req).catch(() => caches.match('/'))
    );
    return;
  }

  // Don’t cache API routes
  if (url.pathname.startsWith('/api/')) return;

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
});
