// Service Worker for Ngobrolin WEB
// Implements offline caching for episodes and static assets

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `ngobrol-static-${CACHE_VERSION}`;
const PAGES_CACHE = `ngobrol-pages-${CACHE_VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/offline.html',
  '/favicon.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Cache assets one at a time to avoid total failure
      for (const url of PRECACHE_ASSETS) {
        try {
          await cache.add(url);
          console.log('[SW] Precached:', url);
        } catch (err) {
          console.error('[SW] Failed to precache:', url, err);
        }
      }
    })()
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            // Delete caches that don't match our current naming pattern
            return cacheName.startsWith('ngobrol-') &&
                   cacheName !== STATIC_CACHE &&
                   cacheName !== PAGES_CACHE;
          })
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const acceptHeader = event.request.headers.get('accept') || '';

  // Skip: non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip: external origins (YouTube, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML pages - network first with cache fallback
  if (acceptHeader.includes('text/html')) {
    event.respondWith(handleHtmlRequest(event.request));
    return;
  }

  // Static assets - cache first
  if (url.pathname.match(/\.(css|js|woff|woff2|svg|png|jpg|jpeg|webp|gif|ico)$/)) {
    event.respondWith(handleStaticRequest(event.request));
    return;
  }
});

// Handle HTML requests - network first, cache for offline
async function handleHtmlRequest(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful responses (not opaque, not error)
    if (response.ok && response.type === 'basic') {
      const clone = response.clone();
      cache.put(request, clone).catch(err => {
        console.warn('[SW] Failed to cache page:', err);
      });
    }

    return response;
  } catch (err) {
    // Network failed - try cache
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // No cache match - return offline page
    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('Offline. Please reconnect.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle static asset requests - cache first
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);

  // Check cache first
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from network
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const clone = response.clone();
      cache.put(request, clone).catch(err => {
        console.warn('[SW] Failed to cache asset:', err);
      });
    }

    return response;
  } catch (err) {
    // Network failed - return error
    return new Response('Network error', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
