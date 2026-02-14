# GitHub Repository Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GitHub repository link to the footer to invite contributors to the landing page project.

**Architecture:** Add a single link element with inline SVG octocat icon to the footer section of `src/layouts/Layout.astro`. The link will point to `https://github.com/ngobrolin/landing` and include analytics tracking consistent with existing footer links.

**Tech Stack:** Astro (v5), TypeScript, Tailwind CSS v4, Vitest (unit tests), Playwright (E2E tests)

---

## Task 1: Add GitHub link to footer (desktop and mobile)

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
                <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm3.163 21.783h-.093a.513.513 0 0 1-.382-.14.513.513 0 0 1-.14-.372v-1.406c.006-.467.01-.94.01-1.416a3.693 3.693 0 0 0-.151-1.028 1.832 1.832 0 0 0-.542-.875 8.014 8.014 0 0 0 2.038-.471 4.051 4.051 0 0 0 1.466-.964c.407-.427.71-.943.885-1.506a6.77 6.77 0 0 0 .3-2.13 4.138 4.138 0 0 0-.26-1.476 3.892 3.892 0 0 0-.795-1.284 2.81 2.81 0 0 0 .162-.582c.033-.2.05-.402.05-.604 0-.26-.03-.52-.09-.773a5.309 5.309 0 0 0-.221-.763.293.293 0 0 0-.111-.02h-.11c-.23.002-.456.04-.674.111a5.34 5.34 0 0 0-.703.26 6.503 6.503 0 0 0-.661.343c-.215.127-.405.249-.573.362a9.578 9.578 0 0 0-5.143 0 13.507 13.507 0 0 0-.572-.362 6.022 6.022 0 0 0-.672-.342 4.516 4.516 0 0 0-.705-.261 2.203 2.203 0 0 0-.662-.111h-.11a.29.29 0 0 0-.11.02 5.844 5.844 0 0 0-.23.763c-.054.254-.08.513-.081.773 0 .202.017.404.051.604.033.199.086.394.16.582A3.888 3.888 0 0 0 5.702 10a4.142 4.142 0 0 0-.263 1.476 6.871 6.871 0 0 0 .292 2.12c.181.563.483 1.08.884 1.516.415.422.915.75 1.466.964.653.25 1.337.41 2.033.476a1.828 1.828 0 0 0-.452.633 2.99 2.99 0 0 0-.2.744 2.754 2.754 2.754 0 0 1-1.175.27 1.788 1.788 0 0 1-1.065-.3 2.904 2.904 0 0 1-.752-.824 3.1 3.1 0 0 0-.292-.382 2.693 2.693 0 0 0-.372-.343 1.841 1.841 0 0 0-.432-.24 1.2 1.2 0 0 0-.481-.101c-.04.001-.08.005-.12.01a.649.649 0 0 0-.162.02.408.408 0 0 0-.13.06.116.116 0 0 0-.06.1.33.33 0 0 0 .14.242c.093.074.17.131.232.171l.03.021c.133.103.261.214.382.333.112.098.213.209.3.33.09.119.168.246.231.381.073.134.15.288.231.463.188.474.522.875.954 1.145.453.243.961.364 1.476.351.174 0 .349-.01.522-.03.172-.028.343-.057.515-.091v1.743a.5.5 0 0 1-.533.521h-.062a10.286 10.286 0 1 1 6.324 0v.005z"/>
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

## Task 2: Add E2E test for GitHub footer link

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

## Task 3: Run all tests to verify no regressions

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
