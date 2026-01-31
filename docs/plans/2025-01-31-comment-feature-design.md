# Comment Feature with Utterances - Design Document

**Date:** 2025-01-31
**Issue:** [#9](https://github.com/ngobrolin/landing/issues/9)
**Status:** Design Approved

## Overview

Add a comment feature to Ngobrolin episode pages using **utterances**, a lightweight GitHub Issues-based commenting widget. Visitors authenticate with GitHub to comment, and comments are stored as issues in the `ngobrolin/landing` repository.

**Key characteristics:**
- No database needed - comments live as GitHub issues
- Only GitHub users can comment (prevents spam)
- Comments are Markdown formatted
- Issues labeled with `comment` for easy filtering
- Auto-detects dark/light theme from user's system preference
- Comments only on episode pages (`/episodes/[slug]`)

## How It Works

1. Utterances loads a script on each episode page
2. The script maps page URL to a GitHub issue title
3. First visitor to comment → a new issue is created
4. Subsequent comments → replies to that issue
5. The widget displays the issue discussion as comments

## Architecture & Components

### 1. Comment Component (`src/components/Comments.astro`)

A new component that:
- Accepts the episode slug as a prop for unique identification
- Injects the utterances script with proper configuration
- Handles the loading state (shows while script initializes)
- Uses the page URL as the issue title (utterances default behavior)

### 2. Integration in Episode Page

Modify `src/pages/episodes/[slug].astro` to:
- Import the Comments component
- Place it between the "Related Episodes" section and the "Navigation" section
- This creates a natural flow: video → info → related → comments → navigation

### Utterances Configuration

| Setting | Value |
|---------|-------|
| Repo | `ngobrolin/landing` |
| Issue term | `pathname` (each URL slug gets its own issue) |
| Label | `comment` |
| Theme | `preferred-color-scheme` |
| Lazy loading | Yes (loads when user scrolls near) |

### Data Flow

```
User visits /episodes/ep-001
    ↓
Comments component loads
    ↓
Utterances checks for issue titled "/episodes/ep-001"
    ↓
If exists → display comments | If not → show "be first to comment"
    ↓
User clicks "Sign in with GitHub"
    ↓
Comment posted as GitHub issue reply
```

## Styling

The comments section will match the existing dark theme:

```astro
<section class="mt-12 pt-8 border-t border-dark-border">
  <h2 class="text-xl font-bold text-white mb-6">Komentar</h2>
  <!-- utterances widget loads here -->
</section>
```

The utterances widget itself handles most styling:
- Container uses existing spacing tokens (`mt-12`, `pt-8`)
- Heading matches section titles (`text-xl font-bold text-white`)
- Border matches existing separators (`border-dark-border`)
- Theme `preferred-color-scheme` ensures dark/light mode matches user's system

## Error Handling

Since this is a static site with Astro, utterances handles all error cases:

1. **Script fails to load** - Utterances has built-in fallbacks and retries. Container stays empty if it completely fails (graceful degradation).

2. **User not logged into GitHub** - Widget shows "Sign in with GitHub" button. No custom handling needed.

3. **Rate limiting** - GitHub's built-in rate limiting applies. Users see GitHub's standard error messages.

4. **Repo configuration issues** - If utterances GitHub app isn't installed, widget shows an inline error message.

**No custom error handling code needed.**

## Testing

### E2E Tests (Playwright)

Add `e2e/comments.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Comments Section', () => {
  test('comments section is displayed on episode page', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    await expect(page.getByRole('heading', { name: 'Komentar' })).toBeVisible();
  });

  test('utterances script is loaded', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    // Check that utterances iframe is present
    const utterancesFrame = page.frame('utterances');
    expect(utterancesFrame).toBeTruthy();
  });

  test('comments section appears before navigation', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    // Comments section should be visible
    const commentsSection = page.getByRole('heading', { name: 'Komentar' });
    await expect(commentsSection).toBeVisible();

    // Navigation should appear after comments
    const navText = page.getByText('Episode Selanjutnya');
    const commentsBox = await commentsSection.boundingBox();
    const navBox = await navText.boundingBox();

    expect(commentsBox.y).toBeLessThan(navBox.y);
  });
});
```

### Manual Testing Checklist

1. Widget loads and displays correctly
2. Theme switching (dark/light mode)
3. GitHub authentication flow works
4. First comment creates a new GitHub issue with `comment` label
5. Replies appear correctly in the thread
6. Cross-page isolation (EP-001 comments ≠ EP-002 comments)

## Implementation Considerations

### Prerequisites

1. **Install utterances GitHub App** - Must be installed on `ngobrolin/landing` repo with write access to issues
2. **Enable Discussions** - Not needed for utterances (it uses Issues, not Discussions)

### Files to Create/Modify

1. `src/components/Comments.astro` - New component
2. `src/pages/episodes/[slug].astro` - Add comments section (1 import + component placement)
3. `e2e/comments.spec.ts` - New E2E test file

### Environment Variables

None needed.

### Deployment

No changes needed to build/deployment config. Utterances loads client-side via script, no SSG complications.

### Future Enhancements (YAGNI - Defer Unless Needed)

- Comment count badge on episode cards
- RSS feed integration with comment counts
- Moderation tools / auto-moderation
- Webmention support for external mentions
