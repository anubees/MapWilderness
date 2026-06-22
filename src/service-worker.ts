/**
 * Offline-first service worker.
 *
 * - App shell (HTML, JS, CSS, icons): cache-first via install + fetch fallback.
 * - YouTube / ytimg: network-first with cache fallback for repeat views offline.
 *
 * Bump CACHE_NAME when static assets change so clients drop stale caches on activate.
 */
const CACHE_NAME = 'mapwilderness-v8';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  '/assets/icons/favicon.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

/** Precaches the app shell on service worker install. */
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
    })()
  );
  self.skipWaiting();
});

/** Deletes old caches and claims open clients. */
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => (name !== CACHE_NAME ? caches.delete(name) : Promise.resolve(false)))
      );
      await self.clients.claim();
    })()
  );
});

/** Serves cached assets; network-first for YouTube with cache fallback. */
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // YouTube embeds and thumbnails: try network, fall back to cache when offline.
  if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be') || url.hostname.includes('ytimg.com')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then(r => r ?? new Response('', { status: 503 })))
    );
    return;
  }

  // Everything else: serve from cache when available, otherwise fetch and store.
  event.respondWith(
    caches.match(event.request).then(res => {
      if (res) return res;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'error') return res;
        caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        return res;
      });
    })
  );
});
