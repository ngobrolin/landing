---
name: verify-ngobrolin-landing
description: Verify the Ngobrolin WEB static site (Astro + Tailwind landing/archive for Indonesian web development podcast episodes) by launching preview, driving the interface, and capturing proof artifacts
---

# verify-ngobrolin-landing

Verify the **Ngobrolin WEB** site — a static Astro + Tailwind landing page and episode archive for an Indonesian web development video podcast. The site showcases episodes sourced from a YouTube playlist, with full transcripts and search capabilities.

**When to use this:** After feature changes, before release, or when validating the build/preview/deploy pipeline. Use this to prove the site works end-to-end from a production build.

---

## Launch

Build the production site:

```bash
cd /workspace
pnpm run build
```

**Requirements:**
- Node.js and pnpm installed (`packageManager` field in `package.json` pins the version)
- `src/data/episodes.json` must exist and contain episode data (never delete this)
- Build outputs to `dist/`

**Note:** The Playwright test suite (recommended Drive harness) starts its own preview server automatically on a worktree-derived port. For manual verification only (Option B/C in Drive section), see Helpers for how to start a preview on a free port.

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
   pnpm exec playwright --version
   ```

**Success criteria:** All checks pass. If episodes.json is missing or build failed, DO NOT proceed — fix the issue first.

---

## Drive

### Harness Options

**Option A: Existing Playwright suite (preferred)**

The repo has comprehensive e2e tests under `e2e/` covering home, episodes, search, transcripts, SEO, and more. **The suite manages its own preview server** (`reuseExistingServer: false`) on a worktree-derived port.

```bash
# Full suite — Playwright builds, serves, and tests automatically
pnpm run test:e2e

# Specific feature — Playwright still manages its own server
pnpm exec playwright test e2e/home.spec.ts --headed
pnpm exec playwright test e2e/search.spec.ts --headed
pnpm exec playwright test e2e/episode.spec.ts --headed
```

**Important:** Do NOT manually start a preview server before running the suite. Playwright starts and stops its own server on a worktree-derived port (range 10000–29999). The suite never adopts foreign servers (`reuseExistingServer: false`).

**Option B: Manual preview + ad-hoc automation (for flows not in the suite)**

If you need to verify something NOT covered by the existing Playwright tests, start a manual preview server on a free port and drive it with tools. See Helpers section for port resolution and server commands.

**Option C: Manual browser testing**

Start a manual preview (using Helpers) and open the URL in a browser. Manually verify flows and capture screenshots or screen recordings as evidence.

### Key Flows to Drive

Pick ONE or more features from the feature map (see `features/` directory):

1. **Homepage** (`features/homepage.md`) — Load `/`, verify hero, recent episodes grid, search bar
2. **Episode Listing** (`features/episode-listing.md`) — Load `/episodes`, verify grid, year tabs, search
3. **Episode Detail** (`features/episode-detail.md`) — Navigate to an episode, verify video embed, transcript, metadata
4. **Search** (`features/search.md`) — Use search from homepage or `/episodes`, verify results
5. **Tags/Topik** (`features/tags.md`) — Navigate to `/tags`, click a tag, verify filtered episodes

---

## Evidence

Capture proof artifacts after driving. **Evidence is runtime-only** — do not commit HTML dumps to the skill tree (site content can trip package-manager guards).

1. **Screenshots:** Save to `.cursor/skills/verify-ngobrolin-landing/evidence/screenshots/` (runtime artifacts)
   - Homepage loaded
   - Episodes listing
   - Individual episode page
   - Search results
   - Any feature verified

2. **Logs:** If using Playwright, test output and traces go to `playwright-report/` and `test-results/`

3. **HTTP checks (if using manual preview):** Capture curl responses for local verification only:
   ```bash
   mkdir -p .cursor/skills/verify-ngobrolin-landing/evidence/http
   # Use $PORT from Helpers (worktree-derived port)
   # These are LOCAL runtime artifacts — do NOT commit HTML files
   curl -s http://127.0.0.1:$PORT > .cursor/skills/verify-ngobrolin-landing/evidence/http/homepage.html
   curl -s http://127.0.0.1:$PORT/episodes > .cursor/skills/verify-ngobrolin-landing/evidence/http/episodes.html
   ```

4. **Playwright report (if used):**
   ```bash
   pnpm exec playwright show-report  # Opens HTML report in browser
   ```

**Minimum evidence:** At least one screenshot proving the driven feature loaded successfully.

**Important:** HTML captures are for local inspection only. Do not commit them — episode content can contain "npx" in prose (e.g., Indonesian transcripts) and fail `scripts/lib/package-manager.test.ts`.

---

## Cleanup

After verification is complete:

1. **Stop any manual preview server (if you started one for Option B/C):**
   ```bash
   # If running in tmux session named 'preview':
   tmux kill-session -t preview
   
   # Or if running in foreground, Ctrl+C
   ```

   **Note:** If you used the Playwright suite (Option A), there's nothing to stop — Playwright cleaned up its own server.

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

### Resolve a free port for manual preview (Option B/C only)

The port must be derived from the worktree path (same mechanism as Playwright suite, range 10000–29999):

```bash
cd /workspace
# Derive and probe for a free port
PORT=$(pnpm exec tsx -e "
import { resolveE2EServer } from './scripts/lib/e2e-port.ts';
const server = await resolveE2EServer({ workspacePath: process.cwd() });
console.log(server.port);
")
echo "Using port: $PORT"
```

### Start manual preview in tmux (only for Option B/C)

```bash
cd /workspace
# First resolve the port (see above)
PORT=$(pnpm exec tsx -e "import { resolveE2EServer } from './scripts/lib/e2e-port.ts'; const server = await resolveE2EServer({ workspacePath: process.cwd() }); console.log(server.port);")

SESSION_NAME="preview"; tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$PWD" -- "${SHELL:-zsh}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" "pnpm run preview --host 127.0.0.1 --port $PORT" C-m
```

### Check if manual preview is ready

```bash
# Use the $PORT variable from above
timeout 30 bash -c "until curl -f -s http://127.0.0.1:$PORT > /dev/null; do sleep 1; done" && echo "✓ Preview ready at http://127.0.0.1:$PORT"
```

### Quick smoke test via curl (against manual preview)

```bash
# Use the $PORT variable from port resolution
curl -s http://127.0.0.1:$PORT | grep -o '<title>.*</title>'
curl -s http://127.0.0.1:$PORT/episodes | grep -o '<h1.*h1>'
```

### Take screenshot with Playwright (against manual preview)

```bash
# Write to evidence directory, use $PORT from resolution
mkdir -p .cursor/skills/verify-ngobrolin-landing/evidence/screenshots
pnpm exec playwright screenshot --device="Desktop Chrome" --full-page \
  http://127.0.0.1:$PORT \
  .cursor/skills/verify-ngobrolin-landing/evidence/screenshots/homepage.png
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
- **Use pnpm, never npm/npx** — the repo enforces pnpm via `packageManager` field and guards
- **Playwright suite manages its own server** — do not start a manual preview before running `pnpm run test:e2e`
- Playwright tests in `e2e/` are the primary harness — prefer reusing them over new automation
- For quick manual checks, start a preview server and use curl + grep to prove pages render
- Preview server must be built first (`pnpm run build`) — `pnpm run preview` serves the `dist/` directory
