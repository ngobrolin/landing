# Design: Add GitHub Repository Link to Footer

**Issue:** [#39](https://github.com/ngobrolin/landing/issues/39)
**Date:** 2026-02-14
**Author:** Brainstorming Session

## Overview

Add a GitHub repository link to the website footer to invite contributors to the landing page project. The link will point to `https://github.com/ngobrolin/landing`.

## Requirements

1. Add GitHub repo link to footer alongside existing social links (YouTube, X, Spotify, RSS)
2. Use GitHub's octocat icon + "GitHub" text label
3. Include analytics tracking consistent with other footer links
4. Follow existing code patterns (inline SVG, same styling)

## Design Decisions

### Location
- **File:** `src/layouts/Layout.astro`
- **Section:** Footer, between Spotify and RSS links (alphabetically ordered)
- **Placement:** After Spotify icon, before RSS link

### Styling
- Uses same classes as other footer links: `text-gray-400 hover:text-white transition flex items-center gap-1`
- Icon size: `w-4 h-4` (matches Spotify/RSS icons)
- External link behavior: `target="_blank"` + `rel="noopener noreferrer"`

### Icon
- Inline SVG of GitHub's octocat logo
- `fill="currentColor"` for color inheritance
- `viewBox="0 0 24 24"` standard viewBox

### Analytics
- Event: `outbound_click`
- Props: `{ dest: "github_repo", location: "footer" }`
- Matches pattern of YouTube, X, and Spotify links

### Accessibility
- `title="GitHub Repository"` for screen readers
- Icon has accompanying text, so no `aria-hidden` needed

## Footer Link Order (Final)

YouTube → X → Spotify → **GitHub** → RSS

## Implementation Notes

This is a simple single-file change adding one link element. No new components, dependencies, or data structures required.

## Testing

1. E2E: Verify link exists and navigates to correct URL
2. Visual: Footer layout remains consistent
