# Episodes by Year Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add year-based navigation to organize episodes by year while maintaining good UX and performance.

**Architecture:** Add dynamic routes for year views, new data layer functions for year filtering, and a YearTabs component for navigation. Main page shows latest 25 episodes.

**Tech Stack:** Astro (SSG), TypeScript, Tailwind CSS, Vitest (unit tests), Playwright (E2E tests)

---

## Task 1: Add `getEpisodesByYear` function to `src/lib/episodes.ts`

**Files:**
- Modify: `src/lib/episodes.ts`
- Test: `src/lib/episodes.test.ts` (NEW)

**Step 1: Write the failing test**

Create `src/lib/episodes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getEpisodesByYear, getAvailableYears, getYearCount } from './episodes';

describe('getEpisodesByYear', () => {
  it('should return episodes from a specific year', () => {
    const episodes = getEpisodesByYear(2026);
    expect(Array.isArray(episodes)).toBe(true);
    // All episodes should be from 2026
    episodes.forEach(ep => {
      expect(ep.publishedAt).toMatch(/^2026-/);
    });
  });

  it('should return episodes sorted by published date descending', () => {
    const episodes = getEpisodesByYear(2025);
    for (let i = 0; i < episodes.length - 1; i++) {
      const current = new Date(episodes[i].publishedAt).getTime();
      const next = new Date(episodes[i + 1].publishedAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('should return empty array for year with no episodes', () => {
    const episodes = getEpisodesByYear(2020);
    expect(episodes).toEqual([]);
  });
});

describe('getAvailableYears', () => {
  it('should return array of years with episodes', () => {
    const years = getAvailableYears();
    expect(Array.isArray(years)).toBe(true);
    expect(years.length).toBeGreaterThan(0);
  });

  it('should return years sorted descending (newest first)', () => {
    const years = getAvailableYears();
    for (let i = 0; i < years.length - 1; i++) {
      expect(years[i]).toBeGreaterThan(years[i + 1]);
    }
  });

  it('should contain unique years only', () => {
    const years = getAvailableYears();
    const uniqueYears = new Set(years);
    expect(years.length).toBe(uniqueYears.size);
  });
});

describe('getYearCount', () => {
  it('should return number of episodes in a year', () => {
    const count = getYearCount(2026);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 for year with no episodes', () => {
    const count = getYearCount(2020);
    expect(count).toBe(0);
  });

  it('should match length of getEpisodesByYear', () => {
    const year = getAvailableYears()[0];
    const count = getYearCount(year);
    const episodes = getEpisodesByYear(year);
    expect(count).toBe(episodes.length);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit src/lib/episodes.test.ts`
Expected: FAIL with "getEpisodesByYear is not defined"

**Step 3: Write minimal implementation**

Add to `src/lib/episodes.ts` (after `getEpisodeByVideoId` function):

```typescript
// Cache for year-based queries
let _episodesByYearCache: Map<number, Episode[]> | null = null;

export function getEpisodesByYear(year: number): Episode[] {
  const episodes = getEpisodes();

  // Initialize cache if needed
  if (!_episodesByYearCache) {
    _episodesByYearCache = new Map();

    // Group episodes by year
    for (const ep of episodes) {
      const epYear = new Date(ep.publishedAt).getFullYear();
      if (!_episodesByYearCache.has(epYear)) {
        _episodesByYearCache.set(epYear, []);
      }
      _episodesByYearCache.get(epYear)!.push(ep);
    }
  }

  return _episodesByYearCache.get(year) || [];
}

export function getAvailableYears(): number[] {
  const episodes = getEpisodes();
  const years = new Set<number>();

  for (const ep of episodes) {
    const year = new Date(ep.publishedAt).getFullYear();
    years.add(year);
  }

  return Array.from(years).sort((a, b) => b - a);
}

export function getYearCount(year: number): number {
  return getEpisodesByYear(year).length;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit src/lib/episodes.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/episodes.ts src/lib/episodes.test.ts
git commit -m "feat: add year filtering functions to episodes lib"
```

---

## Task 2: Create `YearTabs.astro` component

**Files:**
- Create: `src/components/YearTabs.astro`

**Step 1: Create the component**

Create `src/components/YearTabs.astro`:

```astro
---
interface Props {
  years: number[];
  activeYear?: number;
}

const { years, activeYear } = Astro.props;
const isActive = (year: number | undefined) => activeYear === year;
---

<nav aria-label="Navigasi tahun" class="mb-8">
  <div class="flex flex-wrap gap-2">
    <a
      href="/episodes"
      class={`px-4 py-2 rounded-lg font-medium transition ${
        isActive(undefined)
          ? 'bg-primary text-white'
          : 'bg-dark-card text-gray-400 hover:text-white hover:border-primary border border-dark-border'
      }`}
      aria-current={isActive(undefined) ? 'page' : undefined}
    >
      Semua
    </a>
    {years.map((year) => (
      <a
        href={`/episodes/${year}`}
        class={`px-4 py-2 rounded-lg font-medium transition ${
          isActive(year)
            ? 'bg-primary text-white'
            : 'bg-dark-card text-gray-400 hover:text-white hover:border-primary border border-dark-border'
        }`}
        aria-current={isActive(year) ? 'page' : undefined}
      >
        {year}
      </a>
    ))}
  </div>
</nav>
```

**Step 2: Commit**

```bash
git add src/components/YearTabs.astro
git commit -m "feat: add YearTabs navigation component"
```

---

## Task 3: Modify `SearchEpisodes.astro` to support year filtering

**Files:**
- Modify: `src/components/SearchEpisodes.astro`

**Step 1: Add year prop to component**

Modify `src/components/SearchEpisodes.astro` frontmatter:

```astro
---
import { getEpisodes } from "../lib/episodes";
import EpisodeCard from "./EpisodeCard.astro";

interface Props {
  year?: number;
}

const { year } = Astro.props;
const allEpisodes = getEpisodes();
const filteredEpisodes = year
  ? allEpisodes.filter(ep => new Date(ep.publishedAt).getFullYear() === year)
  : allEpisodes;

const searchData = filteredEpisodes.map((ep, idx) => ({
  title: ep.title,
  description: ep.description,
  brief: ep.brief,
  slug: ep.slug,
  episodeNumber: ep.episodeNumber,
  thumbnail: ep.thumbnail,
  publishedAt: ep.publishedAt,
  isNew: idx < 2,
}));
---
```

**Step 2: Update the initial grid rendering**

Update the `episodes-grid` div in `src/components/SearchEpisodes.astro` to use `filteredEpisodes`:

```astro
<div
  id="episodes-grid"
  class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
>
  {
    filteredEpisodes.map((episode, index) => (
      <EpisodeCard
        title={episode.title}
        description={episode.description}
        publishedAt={episode.publishedAt}
        thumbnail={episode.thumbnail}
        episodeNumber={episode.episodeNumber}
        slug={episode.slug}
        isNew={episode.isNew}
        loading={index < 4 ? "eager" : "lazy"}
        fetchPriority={index === 0 ? "high" : undefined}
        brief={episode.brief}
      />
    ))
  }
</div>
```

**Step 3: Commit**

```bash
git add src/components/SearchEpisodes.astro
git commit -m "feat: add year filtering to SearchEpisodes component"
```

---

## Task 4: Modify `src/pages/episodes/index.astro` to show latest 25 episodes

**Files:**
- Modify: `src/pages/episodes/index.astro`

**Step 1: Update page to show latest 25 with YearTabs**

Replace the entire content of `src/pages/episodes/index.astro` with:

```astro
---
import Layout from '../../layouts/Layout.astro';
import SearchEpisodes from '../../components/SearchEpisodes.astro';
import YearTabs from '../../components/YearTabs.astro';
import { getEpisodes, getAvailableYears } from '../../lib/episodes';
import { generateCollectionPageSchema } from '../../lib/seo';

const allEpisodes = getEpisodes();
const latestEpisodes = allEpisodes.slice(0, 25);
const availableYears = getAvailableYears();
const siteUrl = Astro.site?.toString().replace(/\/$/, '') || 'https://ngobrol.in';

const collectionSchema = generateCollectionPageSchema(
  'Semua Episode - Ngobrolin WEB',
  'Episode terbaru dari Ngobrolin WEB',
  `${siteUrl}/episodes`,
  latestEpisodes
);
---

<Layout
  title="Semua Episode - Ngobrolin WEB"
  description="Episode terbaru dari Ngobrolin WEB."
>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(collectionSchema)} />
  </Fragment>
  <section class="py-12">
    <div class="container mx-auto px-4">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Semua Episode</h1>
        <p class="text-gray-400">{allEpisodes.length} episode tersedia</p>
      </div>

      <YearTabs years={availableYears} />
      <SearchEpisodes />
    </div>
  </section>
</Layout>
```

**Step 2: Commit**

```bash
git add src/pages/episodes/index.astro
git commit -m "feat: update episodes index to show latest 25 with year tabs"
```

---

## Task 5: Create `src/pages/episodes/[year].astro` dynamic route

**Files:**
- Create: `src/pages/episodes/[year].astro`

**Step 1: Create the year page**

Create `src/pages/episodes/[year].astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import SearchEpisodes from '../../components/SearchEpisodes.astro';
import YearTabs from '../../components/YearTabs.astro';
import { getEpisodesByYear, getAvailableYears, getYearCount } from '../../lib/episodes';
import { generateCollectionPageSchema } from '../../lib/seo';

export function getStaticPaths() {
  const years = getAvailableYears();
  return years.map((year) => ({
    params: { year: year.toString() },
  }));
}

const { year } = Astro.params;
const yearNum = Number(year);

// Validate format
if (!year || isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
  return Astro.redirect('/404');
}

// Validate content - this should never happen in static build due to getStaticPaths
// but keeps the page type-safe if called dynamically
const yearEpisodes = getEpisodesByYear(yearNum);
if (yearEpisodes.length === 0) {
  return Astro.redirect('/404');
}

const availableYears = getAvailableYears();
const siteUrl = Astro.site?.toString().replace(/\/$/, '') || 'https://ngobrol.in';

const collectionSchema = generateCollectionPageSchema(
  `Episode ${year} - Ngobrolin WEB`,
  `Daftar episode Ngobrolin WEB dari tahun ${year}. ${yearEpisodes.length} episode tersedia.`,
  `${siteUrl}/episodes/${year}`,
  yearEpisodes
);
---

<Layout
  title={`Episode ${year} - Ngobrolin WEB`}
  description={`Daftar episode Ngobrolin WEB dari tahun ${year}. ${yearEpisodes.length} episode tersedia.`}
>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(collectionSchema)} />
  </Fragment>
  <section class="py-12">
    <div class="container mx-auto px-4">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Episode {year}</h1>
        <p class="text-gray-400">{yearEpisodes.length} episode tersedia</p>
      </div>

      <YearTabs years={availableYears} activeYear={yearNum} />
      <SearchEpisodes year={yearNum} />
    </div>
  </section>
</Layout>
```

**Step 2: Commit**

```bash
git add src/pages/episodes/[year].astro
git commit -m "feat: add year-specific episode pages"
```

---

## Task 6: Add unit tests for edge cases

**Files:**
- Modify: `src/lib/episodes.test.ts`

**Step 1: Add edge case tests**

Add to `src/lib/episodes.test.ts`:

```typescript
describe('getEpisodesByYear edge cases', () => {
  it('should handle year 0 correctly', () => {
    const episodes = getEpisodesByYear(0);
    expect(episodes).toEqual([]);
  });

  it('should handle negative years', () => {
    const episodes = getEpisodesByYear(-1);
    expect(episodes).toEqual([]);
  });

  it('should handle future years', () => {
    const episodes = getEpisodesByYear(9999);
    expect(episodes).toEqual([]);
  });
});
```

**Step 2: Run tests**

Run: `npm run test:unit src/lib/episodes.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/episodes.test.ts
git commit -m "test: add edge case tests for year filtering"
```

---

## Task 7: Add E2E tests for episodes by year

**Files:**
- Create: `e2e/episodes-by-year.spec.ts`

**Step 1: Write E2E tests**

Create `e2e/episodes-by-year.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Episodes by Year', () => {
  test('main episodes page shows year tabs', async ({ page }) => {
    await page.goto('/episodes');

    // Should have "Semua" tab
    await expect(page.getByRole('link', { name: 'Semua' })).toBeVisible();

    // Should have at least one year tab
    const yearTabs = page.locator('nav[aria-label="Navigasi tahun"] a');
    await expect(yearTabs.first()).toBeVisible();
  });

  test('main episodes page shows exactly 25 episodes', async ({ page }) => {
    await page.goto('/episodes');

    const episodeCards = page.locator('[data-testid="episode-card"]');
    const count = await episodeCards.count();
    expect(count).toBe(25);
  });

  test('clicking year tab navigates to year page', async ({ page }) => {
    await page.goto('/episodes');

    // Click the first year tab (not "Semua")
    const yearTabs = page.locator('nav[aria-label="Navigasi tahun"] a');
    const firstYearTab = yearTabs.nth(1);
    const yearText = await firstYearTab.textContent();

    await firstYearTab.click();

    // Should navigate to year page
    await expect(page).toHaveURL(/\/episodes\/\d{4}/);

    // Should show the year in the heading
    await expect(page.getByRole('heading', { name: `Episode ${yearText}` })).toBeVisible();
  });

  test('year page shows only episodes from that year', async ({ page }) => {
    // Go to 2025 page (assuming it has episodes)
    await page.goto('/episodes/2025');

    // All episodes should be from 2025
    const episodeDates = page.locator('[data-testid="episode-date"]');
    const count = await episodeDates.count();

    for (let i = 0; i < count; i++) {
      const dateText = await episodeDates.nth(i).textContent();
      expect(dateText).toContain('2025');
    }
  });

  test('year page has correct active tab', async ({ page }) => {
    await page.goto('/episodes/2025');

    // 2025 tab should have aria-current="page"
    const tab2025 = page.getByRole('link', { name: '2025' });
    await expect(tab2025).toHaveAttribute('aria-current', 'page');
  });

  test('invalid year returns 404', async ({ page }) => {
    const response = await page.goto('/episodes/9999');
    expect(response?.status()).toBe(404);
  });

  test('non-numeric year returns 404', async ({ page }) => {
    const response = await page.goto('/episodes/abc');
    expect(response?.status()).toBe(404);
  });

  test('search on year page only searches that year', async ({ page }) => {
    await page.goto('/episodes/2025');

    // Enter search term
    const searchInput = page.getByLabel('Cari episode');
    await searchInput.fill('AI');

    // Wait for search results
    await page.waitForTimeout(300);

    // All results should be from 2025
    const resultsCount = await page.locator('#episodes-grid a').count();
    if (resultsCount > 0) {
      const dates = page.locator('[data-testid="episode-date"]');
      for (let i = 0; i < Math.min(resultsCount, 3); i++) {
        const dateText = await dates.nth(i).textContent();
        expect(dateText).toContain('2025');
      }
    }
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e e2e/episodes-by-year.spec.ts`
Expected: Some tests may fail if 2025 doesn't have enough episodes or test data differs - adjust as needed

**Step 3: Commit**

```bash
git add e2e/episodes-by-year.spec.ts
git commit -m "test: add E2E tests for episodes by year feature"
```

---

## Task 8: Verify build and fix any issues

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Fix any issues**

If any tests fail or build errors occur, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve build/test issues"
```

---

## Task 9: Manual smoke test in preview

**Step 1: Start preview server**

Run: `npm run preview`

**Step 2: Manual testing checklist**

- Visit `/episodes` - should show 25 episodes and year tabs
- Click a year tab - should navigate to that year's page
- On year page, verify all episodes are from that year
- Try `/episodes/9999` - should get 404
- Try `/episodes/abc` - should get 404
- Test search on main page and year page
- Check browser console for errors

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: issues found during smoke testing"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/lib/episodes.ts` | Add `getEpisodesByYear`, `getAvailableYears`, `getYearCount` |
| `src/lib/episodes.test.ts` | **NEW** - unit tests for year functions |
| `src/components/YearTabs.astro` | **NEW** |
| `src/components/SearchEpisodes.astro` | Add optional `year` prop |
| `src/pages/episodes/index.astro` | Show latest 25, add `YearTabs` |
| `src/pages/episodes/[year].astro` | **NEW** |
| `e2e/episodes-by-year.spec.ts` | **NEW** - E2E tests for year navigation |

---

## Notes for Implementation

1. **Data Structure**: Episodes use ISO 8601 dates like `"2026-01-27T22:28:08Z"` - extract year with `new Date(publishedAt).getFullYear()`

2. **Caching**: The plan uses a Map cache for year-based queries, initialized on first call

3. **View Transitions**: The site already has view transitions enabled - these will work automatically with the new routes

4. **Accessibility**: YearTabs uses proper ARIA attributes (`aria-label`, `aria-current`)

5. **SEO**: Each year page gets its own CollectionPage schema with appropriate titles/descriptions

6. **Error Handling**: Invalid years redirect to /404 via `Astro.redirect()`

7. **Performance**: Main page only loads 25 episodes (was loading all episodes before)
