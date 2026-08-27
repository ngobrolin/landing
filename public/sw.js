// Service Worker for Ngobrolin WEB
// Implements offline caching for episodes and static assets

/*
 * Bump this whenever a precached or cache-first asset changes its *contents*
 * under an unchanged URL - `/offline.html` and `/favicon.svg` below are
 * precached on install, and every same-origin image, svg, css and js is served
 * cache-first, so a returning visitor keeps the old bytes forever otherwise.
 * The v1 -> v2 bump was the site repaint: without it, half the visitors would
 * have kept the pre-cover favicon against the new palette.
 *
 * The name is duplicated as a literal in `src/lib/sw-utils.ts` (the routing
 * helper this file cannot import), its unit test, `e2e/service-worker.spec.ts`,
 * `src/components/OfflineBadgeRuntime.astro` and `public/offline.html`. Move
 * all of them together: nothing catches this drift automatically, because
 * `sw-utils.ts` has no production consumer and no unit test reads this file, so
 * every suite stays green while the literals disagree. Bump here and miss
 * `OfflineBadgeRuntime.astro` and it opens a cache the service worker never
 * writes, so the offline badge silently stops appearing. The activate handler
 * below deletes every `ngobrol-*` cache that is not the current pair, so
 * nothing is left behind.
 */
const CACHE_VERSION = 'v2';
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

  // Search index - network first with cache fallback.
  // It used to be inlined into every archive page, so the pages cache made
  // search work offline for free. Now that it is a separate file the service
  // worker has to hold it deliberately, or going offline silently downgrades
  // search to title-only matching. Path kept in step with SEARCH_INDEX_PATH in
  // src/lib/search.ts - this file cannot import it.
  if (url.pathname === '/search-index.json') {
    event.respondWith(handleSearchIndexRequest(event.request));
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

    // No cache match - return offline page from STATIC_CACHE
    const staticCache = await caches.open(STATIC_CACHE);
    const offlineResponse = await staticCache.match('/offline.html');
    return offlineResponse || new Response('Offline. Please reconnect.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle the search index - network first, cache for offline
async function handleSearchIndexRequest(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    // Network first, because CACHE_VERSION is not bumped per deploy and a
    // cache-first index would keep new episodes unfindable indefinitely.
    const response = await fetch(request);

    if (response.ok && response.type === 'basic') {
      const clone = response.clone();
      cache.put(request, clone).catch(err => {
        console.warn('[SW] Failed to cache the search index:', err);
      });
    }

    return response;
  } catch (err) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Nothing cached yet. Rethrowing lets the page's fetch reject, which is
    // what puts search into its stated title-only fallback rather than
    // leaving the input silently doing nothing.
    throw err;
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
