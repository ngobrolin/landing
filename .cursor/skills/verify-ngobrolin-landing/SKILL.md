---
name: verify-ngobrolin-landing
description: Verify the Ngobrolin WEB static site (Astro + Tailwind landing/archive for Indonesian web development podcast episodes) by launching preview, driving the interface, and capturing proof artifacts
---

# verify-ngobrolin-landing

Verify the **Ngobrolin WEB** site — a static Astro + Tailwind landing page and episode archive for an Indonesian web development video podcast. The site showcases episodes sourced from a YouTube playlist, with full transcripts and search capabilities.

**When to use this:** After feature changes, before release, or when validating the build/preview/deploy pipeline. Use this to prove the site works end-to-end from a production build.

---

## Launch

Build and serve the production site locally:

```bash
cd /workspace
pnpm run build
pnpm run preview --host 127.0.0.1 --port 4173
```

The preview server runs on `http://127.0.0.1:4173`. Leave it running in a tmux session for the duration of verification.

**Requirements:**
- Node.js and pnpm installed (`packageManager` field in `package.json` pins the version)
- `src/data/episodes.json` must exist and contain episode data (never delete this)
- Build outputs to `dist/`

**Smoke check after launch:**
```bash
curl -s http://127.0.0.1:4173 | grep -q "Ngobrolin WEB" && echo "✓ Server responding"
```

---

## Doctor

Validate the build before driving:

1. **Check build artifacts exist:**
   ```bash
   test -d dist && echo "✓ dist/ exists"
   test -f dist/index.html && echo "✓ Homepage built"
   test -f dist/episodes/index.html && echo "✓ Episodes listing built"
   ```

2. **Check data source is intact:**
   ```bash
   test -f src/data/episodes.json && echo "✓ episodes.json exists"
   jq 'length' src/data/episodes.json  # Should show episode count (100+ expected)
   ```

3. **Verify Playwright is available (for Drive option):**
   ```bash
   npx playwright --version
   ```

4. **Check server is responding:**
   ```bash
   curl -f -s http://127.0.0.1:4173 > /dev/null && echo "✓ Server healthy"
   ```

**Success criteria:** All checks pass. If episodes.json is missing or build failed, DO NOT proceed — fix the issue first.

---

## Drive

### Harness Options

**Option A: Existing Playwright suite (preferred when applicable)**

The repo has comprehensive e2e tests under `e2e/` covering home, episodes, search, transcripts, SEO, and more. Run the full suite or targeted specs:

```bash
# Full suite (requires preview server running on port derived from workspace)
pnpm run test:e2e

# Specific feature
npx playwright test e2e/home.spec.ts --headed
npx playwright test e2e/search.spec.ts --headed
npx playwright test e2e/episode.spec.ts --headed
```

**Note:** Playwright config (`playwright.config.ts`) derives the port from the workspace path via `scripts/lib/e2e-port.ts`. For manual verification against a running preview on 4173, either:
- Set `E2E_PORT=4173` in environment, or
- Use Option B (browser CDP) below

**Option B: Browser automation (for ad-hoc flows)**

Use Playwright in standalone mode or CDP-based tools to drive the running preview server at `http://127.0.0.1:4173`:

```bash
npx playwright codegen http://127.0.0.1:4173
```

**Option C: Manual browser testing**

Open `http://127.0.0.1:4173` in a browser and manually verify flows. Capture screenshots or screen recordings as evidence.

### Key Flows to Drive

Pick ONE or more features from the feature map (see `features/` directory):

1. **Homepage** (`features/homepage.md`) — Load `/`, verify hero, recent episodes grid, search bar
2. **Episode Listing** (`features/episode-listing.md`) — Load `/episodes`, verify grid, year tabs, search
3. **Episode Detail** (`features/episode-detail.md`) — Navigate to an episode, verify video embed, transcript, metadata
4. **Search** (`features/search.md`) — Use search from homepage or `/episodes`, verify results
5. **Tags** (`features/tags.md`) — Navigate to `/tags`, click a tag, verify filtered episodes

---

## Evidence

Capture proof artifacts after driving:

1. **Screenshots:** Save to `.cursor/skills/verify-ngobrolin-landing/evidence/screenshots/`
   - Homepage loaded
   - Episodes listing
   - Individual episode page
   - Search results
   - Any feature verified

2. **Logs:** If using Playwright, test output and traces go to `playwright-report/` and `test-results/`

3. **HTTP checks:** Capture curl responses:
   ```bash
   mkdir -p .cursor/skills/verify-ngobrolin-landing/evidence/http
   curl -s http://127.0.0.1:4173 > .cursor/skills/verify-ngobrolin-landing/evidence/http/homepage.html
   curl -s http://127.0.0.1:4173/episodes > .cursor/skills/verify-ngobrolin-landing/evidence/http/episodes.html
   ```

4. **Playwright report (if used):**
   ```bash
   npx playwright show-report  # Opens HTML report in browser
   ```

**Minimum evidence:** At least one screenshot or HTML artifact proving the driven feature loaded successfully.

---

## Cleanup

After verification is complete:

1. **Stop the preview server:**
   ```bash
   # If running in tmux session named 'preview':
   tmux kill-session -t preview
   
   # Or if running in foreground, Ctrl+C
   ```

2. **Verify evidence persists:**
   ```bash
   ls -lh .cursor/skills/verify-ngobrolin-landing/evidence/
   ```

3. **Leave artifacts in place** — do not delete evidence/ directory. These prove the verification ran.

4. **Optional: Clean build artifacts (only if needed for space):**
   ```bash
   rm -rf dist/
   ```

**Do NOT delete:**
- `src/data/episodes.json`
- Evidence artifacts
- Any test reports

---

## Helpers

### Start preview in tmux

```bash
cd /workspace
SESSION_NAME="preview"; tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$PWD" -- "${SHELL:-zsh}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" 'pnpm run preview --host 127.0.0.1 --port 4173' C-m
```

### Check if preview is ready

```bash
timeout 30 bash -c 'until curl -f -s http://127.0.0.1:4173 > /dev/null; do sleep 1; done' && echo "✓ Preview ready"
```

### Quick smoke test via curl

```bash
curl -s http://127.0.0.1:4173 | grep -o '<title>.*</title>'
curl -s http://127.0.0.1:4173/episodes | grep -o '<h1.*h1>'
```

### Take screenshot with Playwright

```bash
npx playwright screenshot --device="Desktop Chrome" --full-page http://127.0.0.1:4173 homepage.png
```

### Count episodes in data

```bash
jq 'length' src/data/episodes.json
jq '.[0] | keys' src/data/episodes.json  # Show structure of first episode
```

---

## Notes

- **Never run YouTube fetch/transcribe/S3 upload scripts** as part of verification
- **Never delete or shrink episodes.json** — it is the source of truth
- The site is Astro + Tailwind; do not expect Next.js or React patterns
- Playwright tests in `e2e/` are the primary harness — prefer reusing them over new automation
- For quick checks, curl + grep is sufficient to prove pages render
- Preview server must be built first (`pnpm run build`) — `pnpm run preview` serves the `dist/` directory
