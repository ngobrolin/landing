# Episodes by Year Design

**Date:** 2026-02-06
**Author:** Design brainstorming session
**Status:** Approved

## Problem

The episodes page is growing long and will impact performance as the podcast continues. Need to organize episodes by year while maintaining good UX and performance.

## Solution

Add year-based navigation with separate routes for each year. Main page shows latest 25 episodes regardless of year.

## URL Structure

| Route | Purpose | Content |
|-------|---------|---------|
| `/episodes` | Main/Recent | Latest 25 episodes |
| `/episodes/2026` | Year view | All episodes from 2026 |
| `/episodes/2025` | Year view | All episodes from 2025 |
| `/episodes/[invalid]` | Error | 404 |

## Data Layer

### New functions in `src/lib/episodes.ts`

```typescript
export function getEpisodesByYear(year: number): Episode[]
```
Returns all episodes from the specified year, sorted by published date descending.

```typescript
export function getAvailableYears(): number[]
```
Returns sorted array of years that have episodes, newest first (e.g., `[2026, 2025, 2024]`).

```typescript
export function getYearCount(year: number): number
```
Returns the number of episodes in a given year.

### Implementation approach
- Runtime computation (no pre-generated JSON)
- Extract year from `publishedAt` ISO date string
- Cache results like existing `getEpisodes()`

## Components

### New: `YearTabs.astro`

Tab navigation component placed at the top of episodes pages.

**Props:**
- `years: number[]` - Available years
- `activeYear?: number` - Currently active year (undefined on main page)

**Behavior:**
- "Semua" tab links to `/episodes`
- Year tabs link to `/episodes/[year]`
- Highlights active tab with `aria-current="page"`
- Uses `<nav>` with `aria-label="Navigasi tahun"`

### Modified: `SearchEpisodes.astro`

**New prop:**
- `year?: number` - Optional year filter

**Behavior:**
- When `year` is provided: filters search data to that year only
- Search results only include episodes from the specified year
- Existing UI and functionality unchanged

### Page: `src/pages/episodes/index.astro`

**Content:**
1. `YearTabs` component (no active year)
2. Latest 25 episodes via `getEpisodes().slice(0, 25)`
3. `SearchEpisodes` with no year filter (searches all)
4. Updated description: "Episode terbaru dari Ngobrolin WEB"

### New: `src/pages/episodes/[year].astro`

Dynamic route for year-specific pages.

**Content:**
1. Validate year (2000-2100 range)
2. Check if year has episodes (404 if empty)
3. `YearTabs` with active year
4. All episodes for that year
5. `SearchEpisodes` with year filter

## Error Handling

**In `episodes/[year].astro`:**
```typescript
const yearNum = Number(year);

// Validate format
if (!year || isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
  return Astro.redirect('/404');
}

// Validate content
const yearEpisodes = getEpisodesByYear(yearNum);
if (yearEpisodes.length === 0) {
  return Astro.redirect('/404');
}
```

**Edge cases covered:**
- `/episodes/9999` → 404 (invalid year)
- `/episodes/2020` → 404 (no episodes)
- `/episodes/abc` → 404 (not a number)

## SEO & Schema

**Main page:**
- Keep `CollectionPage` schema
- Update description to mention "episode terbaru"

**Year pages:**
- `CollectionPage` schema filtered to that year
- Title: `Episode ${year} - Ngobrolin WEB`
- Description: `Daftar episode Ngobrolin WEB dari tahun ${year}. ${count} episode tersedia.`

## Testing

### Unit tests (Vitest)
- `getEpisodesByYear` filters correctly
- `getAvailableYears` returns sorted unique years
- Edge cases: invalid years, empty years

### E2E tests (Playwright)
- Main page shows exactly 25 episodes
- Year pages show only episodes from that year
- Tabs navigate to correct URLs
- Invalid years return 404
- Search filters to current year on year pages

## File Changes Summary

| File | Change |
|------|--------|
| `src/lib/episodes.ts` | Add `getEpisodesByYear`, `getAvailableYears`, `getYearCount` |
| `src/components/YearTabs.astro` | **NEW** |
| `src/components/SearchEpisodes.astro` | Add optional `year` prop |
| `src/pages/episodes/index.astro` | Show latest 25, add `YearTabs` |
| `src/pages/episodes/[year].astro` | **NEW** |
| Tests | Add unit and E2E tests for new functionality |

## Performance Considerations

- Main page: ~25 episodes × 10KB = ~250KB initial load
- Year pages: Only load episodes for that year
- Images: Already using lazy loading (first 4 eager)
- View Transitions: Astro's default behavior handles navigation smoothly

## Accessibility

- Year tabs in `<nav>` with proper ARIA labels
- Active tab marked with `aria-current="page"`
- Keyboard navigation between tabs
- Search maintains existing accessibility features
