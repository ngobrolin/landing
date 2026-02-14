# GitHub Repository Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GitHub repository link to the footer to invite contributors to the landing page project.

**Architecture:** Add a single link element with inline SVG octocat icon to the footer section of `src/layouts/Layout.astro`. The link will point to `https://github.com/ngobrolin/landing` and include analytics tracking consistent with existing footer links.

**Tech Stack:** Astro (v5), TypeScript, Tailwind CSS v4, Vitest (unit tests), Playwright (E2E tests)

---

### Task 1: Add GitHub link to footer (desktop and mobile)

**Files:**
- Modify: `src/layouts/Layout.astro:384-412` (footer section, between Spotify and RSS links)

**Step 1: Add the GitHub link element**

Add the following link after the Spotify `</a>` tag (around line 400) and before the RSS link:

```astro
            <a
              href="https://github.com/ngobrolin/landing"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-400 hover:text-white transition flex items-center gap-1"
              title="GitHub Repository"
              data-analytics-event="outbound_click"
              data-analytics-props={JSON.stringify({
                dest: "github_repo",
                location: "footer",
              })}
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 2.649-.399.667 0 1.236.024 1.651.133 1.651 1.133 0 2.854-.989 3.17-1.673 2.864-5.219 5.299-4.866 5.299-5.903 0-5.713-2.854-5.713-6.347 0-1.253.442-2.595 1.537-3.687-1.053-.306-2.163-.822-3.932-1.193-5.762-.594-1.416.511-2.361 1.695-4.576.594 1.068-.667 1.537-1.188 1.537-1.188 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 2.649-.399.667 0 1.236.024 1.651.133 1.651 1.133 0 2.854-.989 3.17-1.673 2.864-5.219 5.299-4.866 5.299-5.903 0-5.713-2.854-5.713-6.347 0-1.253.442-2.595 1.537-3.687-1.053-.306-2.163-.822-3.932-1.193-5.762-.594-1.416.511-2.361 1.695-4.576.594 1.068-.667 1.537-1.188 1.537-1.188z"/>
              </svg>
              GitHub
            </a>
```

**Step 2: Verify the change**

Run: `npm run dev` and visit http://localhost:4321
Expected: Footer shows YouTube, X, Spotify, **GitHub**, RSS links in that order

**Step 3: Click test**

Click the GitHub link in the footer
Expected: Opens https://github.com/ngobrolin/landing in a new tab

**Step 4: Check analytics attributes**

Inspect the GitHub link element in browser DevTools
Expected: `data-analytics-event="outbound_click"` and `data-analytics-props` containing `{"dest":"github_repo","location":"footer"}`

**Step 5: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add GitHub repo link to footer

Add GitHub repository link to footer alongside existing social links
(YouTube, X, Spotify, RSS). Includes inline octocat SVG icon and
analytics tracking.

Refs #39"
```

---

### Task 2: Add E2E test for GitHub footer link

**Files:**
- Create: `e2e/github-footer-link.spec.ts`

**Step 1: Create E2E test file**

```typescript
import { test, expect } from '@playwright/test';

test('GitHub footer link exists and navigates correctly', async ({ page }) => {
  // Navigate to home page
  await page.goto('/');

  // Find the GitHub footer link
  const githubLink = page.locator('footer a[href="https://github.com/ngobrolin/landing"]');

  // Verify link exists
  await expect(githubLink, 'GitHub link should exist in footer').toBeVisible();

  // Verify link has correct text
  await expect(githubLink, 'GitHub link should have text label').toContainText('GitHub');

  // Verify link has correct href
  const href = await githubLink.getAttribute('href');
  expect(href, 'GitHub link should point to correct URL').toBe('https://github.com/ngobrolin/landing');

  // Verify analytics attributes
  const analyticsEvent = await githubLink.getAttribute('data-analytics-event');
  expect(analyticsEvent, 'GitHub link should have analytics event').toBe('outbound_click');

  // Verify link opens in new tab
  const target = await githubLink.getAttribute('target');
  expect(target, 'GitHub link should open in new tab').toBe('_blank');

  // Verify rel attribute for security
  const rel = await githubLink.getAttribute('rel');
  expect(rel, 'GitHub link should have security rel attributes').toContain('noopener');
  expect(rel, 'GitHub link should have security rel attributes').toContain('noreferrer');

  // Verify link is in footer
  const footer = page.locator('footer');
  await expect(githubLink, 'GitHub link should be within footer').toBeAttached();

  // Verify icon exists (SVG)
  const icon = githubLink.locator('svg');
  await expect(icon, 'GitHub link should have an icon').toBeVisible();
});
```

**Step 2: Run E2E test**

Run: `npm run test:e2e -- e2e/github-footer-link.spec.ts`
Expected: PASS (all assertions should pass)

**Step 3: Commit**

```bash
git add e2e/github-footer-link.spec.ts
git commit -m "test: add E2E test for GitHub footer link

Add Playwright test to verify GitHub repository link in footer:
- Link exists and is visible
- Correct URL and text label
- Analytics tracking attributes
- Security attributes (target, rel)
- SVG icon presence

Refs #39"
```

---

### Task 3: Run all tests to verify no regressions

**Files:**
- No file changes

**Step 1: Run unit tests**

Run: `npm run test:unit`
Expected: All unit tests pass

**Step 2: Run all E2E tests**

Run: `npm run test:e2e`
Expected: All E2E tests pass (including new GitHub footer link test)

**Step 3: Build verification**

Run: `npm run build`
Expected: Build completes successfully with no errors

**Step 4: Commit test results (optional, if any test files were updated)**

```bash
# Only run if tests needed updates (snapshots, fixtures, etc.)
git add .
git commit -m "test: update test fixtures/expectations"
```

---

## Implementation Complete

**Summary of changes:**
1. Added GitHub repository link to footer with inline octocat SVG icon
2. Included analytics tracking (`outbound_click` event with `github_repo` destination)
3. Added E2E test coverage for the new footer link
4. All existing tests continue to pass

**Verification checklist:**
- [ ] Link appears in footer between Spotify and RSS
- [ ] Clicking link opens https://github.com/ngobrolin/landing in new tab
- [ ] Icon displays correctly using `currentColor`
- [ ] Hover effect changes color from gray-400 to white
- [ ] Analytics attributes present
- [ ] Security attributes (target="_blank", rel="noopener noreferrer") present
- [ ] E2E test passes
- [ ] All unit tests pass
- [ ] Build succeeds

**Related issue:** #39
