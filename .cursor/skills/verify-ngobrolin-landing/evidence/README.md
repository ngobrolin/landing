# Evidence Artifacts

This directory holds **runtime proof artifacts** generated during verification runs.

## Directory Structure

```
evidence/
├── screenshots/    # PNG screenshots from Playwright or browser
└── http/          # HTML captures from curl (local inspection only)
```

## Important: Do Not Commit HTML Files

**HTML dumps must NOT be committed to the skill tree.**

### Why?

The site's episode content (descriptions, transcripts) can contain forbidden package-manager invocations in natural language text. Indonesian episode transcripts discussing development security may include phrases about running package executables.

These match `scripts/lib/package-manager.test.ts`, which enforces the pnpm-only policy by grepping for forbidden patterns. The test correctly flags HTML evidence files as violations, even though the banned substring appears in site content, not skill instructions.

### What to Commit

- ✅ **Screenshots (PNG files)** — Binary images don't contain searchable text patterns
- ❌ **HTML files** — Site content can trip package-manager guards
- ✅ **This README** — Documents the runtime-only policy

### What to Do

When verifying:
1. Generate screenshots and HTML locally
2. Inspect them to confirm features work
3. Commit only screenshots (if any)
4. Do NOT commit HTML captures

The skill's Evidence section already documents this — these are **local runtime artifacts** for your verification session only.
