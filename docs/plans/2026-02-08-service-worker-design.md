# Service Worker for Offline Access - Design Document

**Date:** 2026-02-08
**Issue:** [#46](https://github.com/ngobrolin/landing/issues/46)
**Status:** Design Approved

## Overview

Implement Service Worker + Cache API to enable offline reading of episode transcripts and summaries. Users can visit episodes while online, then access content later without internet connection.

## Goals

1. Enable pure offline reading of visited episodes (transcripts, summaries)
2. Improve resilience for users on flaky connections
3. Maintain compatibility with Astro's View Transitions
4. Provide clear UX indicators for offline-available content

## Non-Goals

1. Caching YouTube videos or embeds (requires network anyway)
2. Caching YouTube thumbnails (saves significant cache space)
3. Push notifications or background sync
4. Full PWA installation (future enhancement)

## Architecture

### Service Worker Placement

- **Location:** `public/sw.js` (served from root, full site scope)
- **Registration:** Inline script in `Layout.astro` head
- **Scope:** Entire site (`https://ngobrol.in/`)

### Cache Strategy

| Content Type | Strategy | Cache Name |
|--------------|----------|------------|
| HTML pages | Network-first, cache fallback | `ngobrol-pages-v1` |
| CSS/JS/Fonts | Cache-first | `ngobrol-static-v1` |
| Images (local) | Cache-first | `ngobrol-static-v1` |
| YouTube thumbnails | Network-only (not cached) | - |
| External assets | Network-only | - |

### Cache Lifecycle

```
Install Phase:
  ├─ Create ngobrol-static-v1 cache
  ├─ Pre-cache static assets from public/
  └─ Skip waiting (activate immediately)

Fetch Phase (HTML):
  ├─ Try network
  ├─ On success: cache response, return to user
  └─ On failure: serve from cache or offline page

Fetch Phase (Static):
  ├─ Check cache first
  ├─ On miss: fetch from network, cache it
  └─ Return cached or fresh response

Activate Phase:
  ├─ Delete very old caches (non-ngobrol- prefix)
  └─ Claim all clients
```

## Components

### New Files

1. **`public/sw.js`** - Service Worker logic (~150-200 lines)
2. **`public/offline.html`** - Offline fallback page
3. **`src/components/OfflineIndicator.astro`** - Visual badge (optional)

### Modified Files

1. **`src/layouts/Layout.astro`** - Add SW registration script

### New Test Files

1. **`e2e/service-worker.spec.ts`** - E2E tests
2. **`src/lib/sw-utils.test.ts`** - Unit tests for cache utilities
3. **`src/lib/sw-utils.ts`** - Cache strategy utilities

## Data Flow

### Page Visit (Online)

```
User clicks episode link
    ↓
View transition to /episodes/{slug}
    ↓
SW intercepts fetch
    ↓
Network request succeeds
    ↓
Response cached in ngobrol-pages-v1
    ↓
Page renders with fresh content
```

### Page Visit (Offline)

```
User clicks episode link (offline)
    ↓
SW intercepts fetch
    ↓
Network request fails
    ↓
Serve from ngobrol-pages-v1 cache
    ↓
Page renders with cached content
    ↓
YouTube embed shows error (expected)
```

### Offline Fallback

```
User visits uncached page (offline)
    ↓
Network request fails
    ↓
No cache entry found
    ↓
Serve /offline.html
    ↓
JS queries ngobrol-pages-v1 cache
    ↓
Display list of cached episodes
```

## Offline UX

### Indicators

1. **Episode Cards:** Optional dot/checkmark badge showing cache status
2. **Offline Page:** Dedicated `/offline.html` with cached content listing

### Offline Page Features

- "You're offline" message with friendly icon
- List of cached episodes (clickable links)
- Link to homepage
- Minimal inline styles (works without external CSS)

## Error Handling

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Cache quota exceeded | Delete oldest 10% of pages cache, retry |
| SW update | New version replaces old, caches persist |
| View transition | SW re-evaluates fetch on each navigation |
| YouTube embed offline | Shows native browser error or custom message |
| SW registration failure | Silent fail, log to console |

### Quota Management

```javascript
// Approximate storage for typical user
- 1 episode HTML: ~50-100 KB
- 50 episodes: ~5 MB
- Static assets: ~500 KB
- Total: ~5-10 MB (well within 50-100 MB quota)
```

## Testing Strategy

### E2E Tests (Playwright)

- SW registration verification
- Cache population after page visit
- Offline content serving
- Offline page rendering
- (Optional) Offline indicator visibility

### Unit Tests (Vitest)

- Cache strategy determination logic
- Cache name selection
- URL pattern matching
- Request type detection

## Compatibility

| Feature | Support |
|---------|---------|
| Service Worker | All modern browsers (Chrome, Firefox, Safari, Edge) |
| Cache API | All modern browsers |
| View Transitions | Already implemented, compatible with SW |

## Security Considerations

- SW only intercepts same-origin requests
- External assets (YouTube) not cached
- No sensitive data cached (all public content)
- Cache namespace (`ngobrol-`) prevents conflicts

## Performance Impact

| Metric | Impact |
|--------|--------|
| Initial page load | +50ms (SW registration) |
| Repeat visit (online) | ~0ms (network-first) |
| Repeat visit (offline) | <50ms (served from cache) |
| Storage overhead | ~5-10 MB for 50 episodes |

## Deployment

- No deployment changes required
- SW is a static file in `public/`
- Existing build process includes it in `dist/`
- Works on all static hosting platforms

## Acceptance Criteria

- [ ] Service Worker registered on all pages
- [ ] Static assets cached on install
- [ ] Episode pages cached on visit
- [ ] Offline page shows cached episodes
- [ ] Offline indicator appears on cached episodes (optional)
- [ ] Unregister/update mechanism for new versions

## Future Enhancements

1. PWA manifest for installable app
2. Background sync for analytics
3. Prefetch next episode in list
4. Cache statistics/management UI
5. Service Worker update notification

## References

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Astro View Transitions](https://docs.astro.build/en/guides/view-transitions/)
- Issue [#46](https://github.com/ngobrolin/landing/issues/46)
