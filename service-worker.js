const CACHE_NAME = 'filefusion-v1';
const CACHE_URLS = ['/', '/index.html', '/css/styles.css', '/js/app.js', '/js/workers.js', '/manifest.json'];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FileFusion – Offline</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; text-align: center; padding: 1rem; }
    .card { background: #1e293b; border-radius: 1rem; padding: 2.5rem; max-width: 380px; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    p  { color: #94a3b8; margin-bottom: 1.5rem; }
    a  { background: #3b82f6; color: #fff; padding: 0.6rem 1.25rem;
         border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
    a:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:3rem;margin-bottom:1rem">📡</div>
    <h1>You're Offline</h1>
    <p>FileFusion needs to load once while online to enable offline support. Please reconnect and reload the page.</p>
    <a href="/">Try Again</a>
  </div>
</body>
</html>`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // CDN resources: network-first
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  // Local assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Return a user-friendly offline HTML page for navigation requests
        if (event.request.mode === 'navigate') {
          return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
        return new Response('Offline – resource not cached', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});
