# Source Drift Findings

## Summary
Source inspection wave completed for all 5 features. Found 4 instances of drift between feature files and actual implementation/tests.

## Drift Items

### 1. Tags - Sort order incorrect (tags.md line 91)
**Feature file claims:** "On `/tags`, tags are alphabetically sorted."
**Actual behavior:** Tags sorted by popularity (count DESC) with alphabetical as tiebreaker only.
**Source:** `src/lib/tags.ts:32` — `.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))`
**Impact:** User-facing documentation inaccuracy. The index page shows most popular tags first, not A-Z.

### 2. Episode Listing - "New" badge logic wrong (episode-listing.md line 7, line 75)
**Feature file claims:** "New badges on recently published episodes (within 14 days)" and references `NEW_BADGE_THRESHOLD_DAYS`
**Actual behavior:** Marks the 2 newest episodes by position, not by date threshold.
**Source:** `src/lib/episodes.ts:140-157` — `const NEW_EPISODE_COUNT = 2;`
**Impact:** User-facing documentation inaccuracy. No 14-day window exists; badges are positional.

### 3. Search - Debounce timing incorrect (search.md line 95)
**Feature file claims:** "Client-side search has a small debounce (typically 300-500ms)"
**Actual behavior:** Debounce is 120ms.
**Source:** `src/components/SearchEpisodes.astro:425` — `debounceTimer = window.setTimeout(handleSearch, 120);`
**Impact:** Minor technical inaccuracy. Actual UX is faster than documented.

### 4. Homepage - Playwright examples cite wrong test file (homepage.md lines 26-69)
**Feature file claims:** Examples reference behavior in `e2e/home.spec.ts`
**Actual behavior:** Several cited assertions (archive scale, 4-card count, topic/year testids) are in `e2e/home-archive.spec.ts`
**Impact:** Harness documentation drift. Examples work but point to wrong file for verification.

## Items Confirmed Accurate

### Episode Detail
- ✅ All sub-features present
- ✅ All testids match
- ✅ Selectors accurate
- ✅ Flow descriptions accurate
- ✅ Slug storage vs derivation correctly described
- ✅ Related episodes fallback behavior documented

### All Features (General)
- ✅ All source entry points located
- ✅ No missing user-facing surfaces detected
- ✅ E2E test coverage comprehensive
