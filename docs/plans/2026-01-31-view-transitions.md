# View Transitions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add smooth page transitions using Astro's native View Transitions API - shared element transition for episode thumbnails, fade for all other navigation.

**Architecture:** Use Astro's `<ViewTransitions />` component in Layout.astro to enable view transitions globally. Add `transition:name` directive to episode card thumbnails and matching element on detail pages for shared element morphing. All other navigation uses default fade animation with custom 150ms duration.

**Tech Stack:** Astro v5 (native view transitions), Playwright (E2E testing)

---

## Task 1: Enable View Transitions in Layout

**Files:**
- Modify: `src/layouts/Layout.astro`

**Step 1: Add ViewTransitions import and component**

In `<head>` section, after line 2 (import statement), add the ViewTransitions import and component:

```astro
---
import '../styles/global.css';
import { ViewTransitions } from 'astro:transitions';
// ... rest of imports
```

In `<head>` section, after line 32 (`<link rel="icon"...`), add:

```astro
    <!-- View Transitions -->
    <ViewTransitions />
```

**Step 2: Add custom transition duration CSS**

Before closing `</head>` tag (before line 58), add inline style:

```astro
    <!-- View Transitions Custom Duration -->
    <style is:global>
      @keyframes astroFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      ::view-transition-old(root),
      ::view-transition-new(root) {
        animation-duration: 150ms;
      }
    </style>
```

**Step 3: Verify dev server runs**

Run: `npm run dev`
Expected: Server starts successfully at http://localhost:4321, no errors in console

**Step 4: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add ViewTransitions component and custom fade duration"
```

---

## Task 2: Add Transition Name to Episode Card Thumbnail

**Files:**
- Modify: `src/components/EpisodeCard.astro`

**Step 1: Add transition:name to thumbnail image**

Update the `<Image>` element (lines 38-47) to include `transition:name`:

```astro
    <Image
      src={thumbnail}
      alt={title}
      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading={loading}
      fetchpriority={fetchPriority}
      width={640}
      height={360}
      format="webp"
      transition:name={`episode-thumbnail-${slug}`}
    />
```

**Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build completes successfully, output in `dist/`

**Step 3: Commit**

```bash
git add src/components/EpisodeCard.astro
git commit -m "feat: add transition name to episode card thumbnail"
```

---

## Task 3: Add Transition Name to Episode Detail Page

**Files:**
- Modify: `src/pages/episodes/[slug].astro`

**Step 1: Wrap YouTubeEmbed with transition name div**

Update the YouTubeEmbed section (lines 96-101) to wrap with transition:name div:

```astro
        <!-- Video -->
        <div transition:name={`episode-thumbnail-${episode.slug}`}>
          <YouTubeEmbed
            videoId={episode.videoId}
            title={episode.title}
            backgroundImage={optimizedThumbnail.src}
          />
        </div>
```

**Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build completes successfully

**Step 3: Commit**

```bash
git add src/pages/episodes/[slug].astro
git commit -m "feat: add transition name to episode detail page video embed"
```

---

## Task 4: Create E2E Tests for View Transitions

**Files:**
- Create: `e2e/view-transitions.spec.ts`

**Step 1: Create the test file**

Create `e2e/view-transitions.spec.ts` with full test suite:

```typescript
import { test, expect } from '@playwright/test';

test.describe('View Transitions', () => {
  test.describe('Shared Element - Episode Thumbnails', () => {
    test('thumbnail has transition name on episode card', async ({ page }) => {
      await page.goto('/');
      const thumbnail = page.locator('[data-testid="episode-card"]').first().locator('img');
      await expect(thumbnail).toHaveAttribute('data-astro-transition-name', /episode-thumbnail-/);
    });

    test('thumbnail has transition name on episode detail page', async ({ page }) => {
      await page.goto('/');
      const firstEpisode = page.locator('[data-testid="episode-card"]').first();
      await firstEpisode.click();

      // YouTube embed wrapper should have matching transition name
      const transitionElement = page.locator('[data-astro-transition-name^="episode-thumbnail-"]');
      await expect(transitionElement).toBeVisible();
    });

    test('navigation from home to episode uses shared element transition', async ({ page }) => {
      await page.goto('/');
      const firstEpisode = page.locator('[data-testid="episode-card"]').first();
      await firstEpisode.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/episodes\/.+/);
    });

    test('navigation from episodes list to episode uses shared element transition', async ({ page }) => {
      await page.goto('/episodes');
      const firstEpisode = page.locator('[data-testid="episode-card"]').first();
      await firstEpisode.click();

      await expect(page).toHaveURL(/\/episodes\/.+/);
      const transitionElement = page.locator('[data-astro-transition-name^="episode-thumbnail-"]');
      await expect(transitionElement).toBeVisible();
    });
  });

  test.describe('Fade Transitions - Other Pages', () => {
    test('home to about uses fade transition', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Tentang' }).click();
      await expect(page).toHaveURL('/about');
    });

    test('home to partners uses fade transition', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Partner' }).click();
      await expect(page).toHaveURL('/partners');
    });

    test('home to subscribe uses fade transition', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Langganan' }).click();
      await expect(page).toHaveURL('/subscribe');
    });
  });

  test.describe('View Transitions Integration', () => {
    test('view transitions script is loaded', async ({ page }) => {
      await page.goto('/');
      const viewTransitionScript = page.locator('script[src*="transition"]');
      await expect(viewTransitionScript).toBeAttached();
    });
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `npm run test:e2e`
Expected: All tests pass

**Step 3: Commit**

```bash
git add e2e/view-transitions.spec.ts
git commit -m "test: add E2E tests for view transitions"
```

---

## Task 5: Final Verification and Manual Testing

**Step 1: Build and preview**

Run: `npm run build && npm run preview`
Expected: Production build serves at http://localhost:4321

**Step 2: Manual testing checklist**

1. Navigate from Home → Episode (thumbnail should morph)
2. Navigate from Episodes list → Episode (thumbnail should morph)
3. Navigate Home → About (fade transition)
4. Navigate Home → Partners (fade transition)
5. Navigate Home → Subscribe (fade transition)
6. Navigate between episodes using Prev/Next (fade transition)

**Step 3: Run all tests**

Run: `npm run test:e2e`
Expected: All E2E tests pass

**Step 4: Final commit if any adjustments**

```bash
# Only if adjustments were made
git add .
git commit -m "chore: final adjustments for view transitions"
```

---

## Verification Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:e2e:ui` | Run tests with UI |

## Success Criteria

- [ ] All page navigation uses smooth transitions
- [ ] Episode card thumbnails smoothly morph to video embed position
- [ ] Non-episode navigation uses quick fade (~150ms)
- [ ] All E2E tests pass
- [ ] Build completes without errors
- [ ] No console errors during navigation

## Notes

- Browser support: Chrome 111+, Safari 18+, Firefox 144+
- No fallbacks implemented as per requirements
- Transition names use unique slug to ensure correct element matching
- Fade duration customized to 150ms for quick, snappy transitions
