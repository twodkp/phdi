const CACHE_NAME = 'site-cache-v1';

// List of resources to pre-cache for offline access
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './alg.html',
  './books.html',
  './graph.html',
  './topo.html',
  './image.png'
];

// 1. Install Event: Robust pre-caching (individual caching prevents total failure)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return cache.add(url).catch((err) => {
            console.error(`[Service Worker] Failed to pre-cache asset: ${url}`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Remove old/outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Cache-first strategy with network fallback and error handling
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and standard HTTP/HTTPS schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Return cached asset if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Fallback to network
      return fetch(event.request)
        .then((networkResponse) => {
          // Check for valid response (allows 'basic' and 'cors' response types)
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((error) => {
          console.error('[Service Worker] Network request failed and item not in cache:', error);

          // 3. Optional offline fallback for navigation requests (HTML pages)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
