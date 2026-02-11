# Floating Scroll Buttons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add floating "go to top" and "go to bottom" navigation buttons to all pages for improved UX on long-scrolling content.

**Architecture:** Create a new Astro component `ScrollButtons.astro` with client-side scroll behavior, using fixed positioning and following the established view-transition patterns (IIFE + `data-astro-rerun`). Add the component to the shared `Layout.astro` so it appears on all pages.

**Tech Stack:** Astro, TypeScript, Tailwind CSS v4, Playwright (E2E testing)

---

## Task 1: Write E2E test for scroll buttons (initial load)

**Files:**
- Create: `e2e/scroll-buttons.spec.ts`

**Step 1: Write the failing test**

```typescript
import { test, expect } from '@playwright/test';

test.describe('ScrollButtons', () => {
  test('should render scroll buttons on initial page load', async ({ page }) => {
    await page.goto('/');

    // Both buttons should be present
    const scrollToTop = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
    const scrollToBottom = page.getByLabel('Scroll to bottom').or(page.getByTitle('Scroll to bottom'));

    await expect(scrollToTop).toBeVisible();
    await expect(scrollToBottom).toBeVisible();
  });

  test('should scroll to top when button is clicked', async ({ page }) => {
    await page.goto('/');

    // Scroll down first
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(page.evaluate(() => window.scrollY)).toBeGreaterThan(400);

    // Click scroll to top button
    const scrollToTop = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
    await scrollToTop.click();

    // Should be at top
    await expect(page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('should scroll to bottom when button is clicked', async ({ page }) => {
    await page.goto('/');

    // Click scroll to bottom button
    const scrollToBottom = page.getByLabel('Scroll to bottom').or(page.getByTitle('Scroll to bottom'));
    await scrollToBottom.click();

    // Should be at or near bottom
    const scrollY = await page.evaluate(() => window.scrollY);
    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await expect(scrollY).toBeGreaterThan(documentHeight - window.innerHeight - 100);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:e2e -- e2e/scroll-buttons.spec.ts
```

Expected: FAIL - Buttons not found, component doesn't exist yet

---

## Task 2: Create ScrollButtons component structure

**Files:**
- Create: `src/components/ScrollButtons.astro`

**Step 1: Create the component with HTML structure**

```astro
---
// ScrollButtons.astro
// Floating scroll-to-top and scroll-to-bottom buttons
---

<div id="scroll-buttons" class="scroll-buttons-container" data-scroll-buttons-container>
  <!-- Scroll to Top Button -->
  <button
    id="scroll-to-top"
    class="scroll-button scroll-button-top"
    aria-label="Scroll to top"
    title="Scroll to top"
    type="button"
    data-scroll-to-top
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </button>

  <!-- Scroll to Bottom Button -->
  <button
    id="scroll-to-bottom"
    class="scroll-button scroll-button-bottom"
    aria-label="Scroll to bottom"
    title="Scroll to bottom"
    type="button"
    data-scroll-to-bottom
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>
</div>

<style>
  .scroll-buttons-container {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 40;
  }

  .scroll-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background-color: hsl(var(--color-primary));
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .scroll-button:hover {
    opacity: 0.85;
    transform: scale(1.05);
  }

  .scroll-button:focus-visible {
    outline: 2px solid hsl(var(--color-primary));
    outline-offset: 2px;
  }

  /* Hidden state for scroll-to-top (initially hidden at top) */
  .scroll-button-top[aria-hidden="true"] {
    opacity: 0;
    pointer-events: none;
  }

  /* Hidden state for scroll-to-bottom (hidden when at bottom) */
  .scroll-button-bottom[aria-hidden="true"] {
    opacity: 0;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    .scroll-buttons-container {
      bottom: 0.75rem;
      right: 0.75rem;
    }

    .scroll-button {
      width: 2.25rem;
      height: 2.25rem;
    }
  }
</style>

<script is:inline data-astro-rerun>
  (function initScrollButtons() {
    const container = document.querySelector('[data-scroll-buttons-container]');
    if (!container) return;

    // Guard against duplicate initialization
    if (container.hasAttribute('data-scroll-buttons-initialized')) return;
    container.setAttribute('data-scroll-buttons-initialized', 'true');

    const scrollToTopBtn = document.querySelector('[data-scroll-to-top]');
    const scrollToBottomBtn = document.querySelector('[data-scroll-to-bottom]');

    if (!scrollToTopBtn || !scrollToBottomBtn) return;

    // Scroll to top function
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };

    // Scroll to bottom function
    const scrollToBottom = () => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    };

    // Update button visibility based on scroll position
    const updateButtonVisibility = () => {
      const scrollY = window.scrollY;
      const isAtTop = scrollY < 100;
      const isAtBottom = scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100;

      // Hide scroll-to-top when at top
      scrollToTopBtn.setAttribute('aria-hidden', isAtTop.toString());

      // Hide scroll-to-bottom when at bottom
      scrollToBottomBtn.setAttribute('aria-hidden', isAtBottom.toString());
    };

    // Event listeners
    scrollToTopBtn.addEventListener('click', scrollToTop);
    scrollToBottomBtn.addEventListener('click', scrollToBottom);

    // Update visibility on scroll
    window.addEventListener('scroll', updateButtonVisibility);
    updateButtonVisibility(); // Initial state
  })();
</script>
```

**Step 3: Add the component to Layout.astro**

**Files:**
- Modify: `src/layouts/Layout.astro`

Read the file first to find where to insert the component (before closing `</body>` tag).

Add this import near the top (after other component imports if present):

```astro
import ScrollButtons from '../components/ScrollButtons.astro';
```

Add this before the `</body>` tag (after the footer):

```astro
<ScrollButtons />
```

**Step 4: Run the dev server to verify visually**

```bash
npm run dev
```

Visit http://localhost:4321 and verify:
- Buttons appear in bottom-right corner
- Scroll to top button shows when scrolled down
- Scroll to bottom button shows when not at bottom
- Clicking buttons scrolls smoothly

**Step 5: Run E2E tests**

```bash
npm run test:e2e -- e2e/scroll-buttons.spec.ts
```

Expected: PASS (all tests should pass now)

**Step 6: Commit**

```bash
git add src/components/ScrollButtons.astro src/layouts/Layout.astro e2e/scroll-buttons.spec.ts
git commit -m "feat: add floating scroll-to-top and scroll-to-bottom buttons"
```

---

## Task 3: Write E2E test for view transitions

**Files:**
- Modify: `e2e/scroll-buttons.spec.ts`

**Step 1: Add test for post-navigation functionality**

Add this test to the existing file:

```typescript
test('should work after view transition navigation', async ({ page }) => {
  // Start on home page
  await page.goto('/');

  // Scroll down to verify scroll-to-top button appears
  await page.evaluate(() => window.scrollTo(0, 500));
  const scrollToTopOnHome = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
  await expect(scrollToTopOnHome).toBeVisible();

  // Navigate to about page (uses view transitions)
  await page.getByRole('link', { name: /about/i }).click();

  // Wait for navigation and script re-execution
  await page.waitForTimeout(150); // Allow for inline script execution after view transition

  // Verify buttons exist on new page
  const scrollToTopOnAbout = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
  const scrollToBottomOnAbout = page.getByLabel('Scroll to bottom').or(page.getByTitle('Scroll to bottom'));

  await expect(scrollToTopOnAbout).toBeVisible();
  await expect(scrollToBottomOnAbout).toBeVisible();

  // Test scroll functionality on new page
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);

  // Scroll down
  await page.evaluate(() => window.scrollTo(0, 300));

  // Click scroll to top
  await scrollToTopOnAbout.click();

  // Verify we're at top
  await expect(page.evaluate(() => window.scrollY)).toBe(0);
});
```

**Step 2: Run the new test**

```bash
npm run test:e2e -- e2e/scroll-buttons.spec.ts
```

Expected: PASS (test confirms view transition compatibility)

**Step 3: Commit**

```bash
git add e2e/scroll-buttons.spec.ts
git commit -m "test: add view transition test for scroll buttons"
```

---

## Task 4: Verify all tests pass

**Step 1: Run all E2E tests**

```bash
npm run test:e2e
```

Expected: All tests pass

**Step 2: Run all unit tests (if any exist)**

```bash
npm run test:unit
```

Expected: All tests pass

**Step 3: Build production bundle**

```bash
npm run build
```

Expected: Build succeeds without errors

---

## Task 5: Manual verification checklist

**Step 1: Test on different page types**

```bash
npm run preview
```

Verify on:
- [ ] Home page (/)
- [ ] About page (/about)
- [ ] Episode detail page (click any episode)
- [ ] 404 page (visit /non-existent)

**Step 2: Test accessibility**

- [ ] Tab navigation reaches buttons
- [ ] Focus indicators are visible
- [ ] ARIA labels are announced by screen reader
- [ ] Keyboard Enter/Space activates buttons

**Step 3: Test responsive behavior**

- [ ] Desktop (1920x1080) - buttons positioned correctly
- [ ] Tablet (768x1024) - buttons still accessible
- [ ] Mobile (375x667) - buttons not covering content

**Step 4: Test edge cases**

- [ ] Very short page (scroll buttons shouldn't block content)
- [ ] Very long page (smooth scrolling works)
- [ ] Rapid clicking (no jank or errors)

---

## Task 6: Final commit and cleanup

**Step 1: Check git status**

```bash
git status
```

**Step 2: Ensure all changes are committed**

```bash
git add .
git commit -m "test: complete floating scroll buttons feature"
```

**Step 3: View final commit**

```bash
git log --oneline -3
```

---

## Implementation Notes

**Reference files for patterns:**
- `src/components/ShareButtons.astro` - IIFE + `data-astro-rerun` pattern
- `src/layouts/Layout.astro` - Where to add the component
- `docs/plans/2026-01-31-view-transitions.md` - View transition best practices

**Project conventions followed:**
- IIFE pattern for script isolation
- `data-astro-rerun` for view transition compatibility
- Initialization guard with `data-scroll-buttons-initialized`
- Tailwind CSS for styling (can be converted to utility classes)
- Smooth scroll behavior
- Accessibility (ARIA labels, keyboard support)
- Mobile-first responsive design
