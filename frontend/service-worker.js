const CACHE_NAME = 'cellworld-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=14',
  './ui.js?v=14',
  './game.js?v=14',
  './api.js?v=14',
  './tutorial.js?v=14',
  './notifications.js?v=14',
  './firebase-config.js?v=14',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install event: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network-first approach for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For API calls, try network first, then fallback to cache if available
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For everything else (static assets), try cache first, then network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
