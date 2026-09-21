/**
 * InterviewMate service worker.
 *
 * Deliberately conservative about what it caches. Only the static app shell
 * (JS/CSS/icons) is cached so the app can launch offline. Anything that could
 * contain private data is NEVER cached:
 *   - /api/** responses (interview answers, scores, documents, user profile)
 *   - any request carrying an Authorization header
 *   - non-GET requests
 */

const CACHE_VERSION = 'interviewmate-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch anything that isn't a plain same-origin GET for a static asset.
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;      // private data - always network
  if (request.headers.has('Authorization')) return;  // authenticated - never cache

  // Navigations: network first so users get fresh app builds, cache as fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    );
    return;
  }

  // Static assets: cache first, then network (and store a copy).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
