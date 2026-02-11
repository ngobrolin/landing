export interface CacheStrategy {
  type: 'network-first' | 'cache-first' | 'network-only';
  cacheName: string | null;
}

const SITE_ORIGIN = 'https://ngobrol.in';

export function isSameOrigin(request: Request): boolean {
  const url = new URL(request.url);
  return url.origin === SITE_ORIGIN;
}

export function isHtmlRequest(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

export function isStaticAsset(url: URL): boolean {
  return url.pathname.match(/\.(css|js|woff|woff2|svg|png|jpg|jpeg|webp|gif|ico)$/) !== null;
}

export function determineCacheStrategy(request: Request): CacheStrategy {
  const url = new URL(request.url);

  // Skip external assets
  if (!isSameOrigin(request)) {
    return { type: 'network-only', cacheName: null };
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return { type: 'network-only', cacheName: null };
  }

  // HTML pages - network first
  if (isHtmlRequest(request)) {
    return { type: 'network-first', cacheName: 'ngobrol-pages-v1' };
  }

  // Static assets - cache first
  if (isStaticAsset(url)) {
    return { type: 'cache-first', cacheName: 'ngobrol-static-v1' };
  }

  // Default - network only
  return { type: 'network-only', cacheName: null };
}

export function getCacheName(request: Request): string | null {
  const strategy = determineCacheStrategy(request);
  return strategy.cacheName;
}
