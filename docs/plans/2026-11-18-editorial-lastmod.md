# Editorial lastmod: record edits to episode summaries

## Problem

`src/lib/episode-lastmod.ts` set an episode's sitemap `lastmod` to the newest of
`publishedAt`, the summary's `generatedAt` and the transcript's `generatedAt`.
`generatedAt` records when a file was first written. When `seoTitle` and
`metaDescription` were added to every summary in November 2026, every
episode's page title and description changed and none of those dates moved. The
sitemap still dated those pages to when their summaries were first written.

Google treats `lastmod` as a crawl-scheduling hint when it is consistently
accurate. It does not guarantee indexing. So the date has to be truthful: no
build time, no file mtime, no daily "now".

## Design

1. **`updatedAt`, optional, on summaries only.** It records the last
   substantive edit. `generatedAt` stays as provenance and never moves. When
   present it must be an ISO 8601 timestamp with a timezone (`Z` or `±HH:MM`)
   on a real calendar date. It cannot be earlier than `generatedAt` or in the
   future. `parseContentTimestamp()` and `findUpdatedAtProblems()` in
   `src/lib/episode-lastmod.ts` hold the rule and
   `scripts/lib/summary-contract.ts` applies it. Files without the field keep
   working. Transcripts get no `updatedAt`: they are regenerated rather than
   edited, and regenerating writes a new `generatedAt`.
2. **Lastmod** is the newest valid value among `publishedAt`, both
   `generatedAt` and the summary's `updatedAt`. Only stored data feeds it, so
   two builds of one commit agree. A value without a timezone is ignored
   rather than read as the build machine's local time.
3. **`scripts/stamp-updated.ts`** stamps `updatedAt` on summary files named one
   by one. It checks every argument before writing any file, and it refuses:
   - a path outside `src/data/summaries/<videoId>.json`
   - a symlink
   - an unknown episode
   - a file that is not a JSON object
   - a stamp without a timezone, in the future, earlier than `generatedAt`,
     or earlier than an existing `updatedAt`

   Re-applying the same stamp is a no-op. It changes only `updatedAt` (adding
   it as the last property also puts a comma on the line before) and leaves the
   rest of the file byte for byte. `--dry-run` reports what it would write.
   There is no history or diff check: whether an edit is substantive is the
   editor's call, documented under "Recording an edit" in the
   `summarizing-episodes` skill.
4. **Evidence-backed backfill.** Two commits added `seoTitle` and
   `metaDescription` to every summary and changed nothing else in them. Both
   were verified by parsing each file before and after:

   | Commit | Committer date (UTC) | Summaries |
   | :--- | :--- | :--- |
   | ac997cc | 2026-11-13T06:57:06Z | 17 |
   | 8a2289b | 2026-11-14T14:12:51Z | 172 |

   The sets are disjoint, cover all 189 tracked summaries, and no commit has
   touched a summary since. Committer dates are used because that is when each
   change landed on `main`. The commands:

   ```bash
   pnpm exec tsx scripts/stamp-updated.ts --dry-run --at 2026-11-13T06:57:06Z \
     $(git diff-tree --no-commit-id -r --name-only ac997cc -- src/data/summaries)
   pnpm exec tsx scripts/stamp-updated.ts --dry-run --at 2026-11-14T14:12:51Z \
     $(git diff-tree --no-commit-id -r --name-only 8a2289b -- src/data/summaries)
   ```

   Then run the same two commands without `--dry-run`.

   Status on 2026-11-18: both dry runs pass (17 and 172 planned, nothing
   written). The write has not been applied to `src/data/summaries/` yet. It
   waits on an explicit go-ahead.

## Not covered

- A retitle that arrives through the playlist sync changes `episodes.json`, not
  a summary, so it does not move lastmod.
- The command cannot tell a meaningful edit from a trivial one. It only
  enforces that stamps are well formed and move forward.

## Verification

- Unit tests cover the timestamp rule, lastmod against fixture data, the
  contract, and the command against throwaway fixture folders.
- `pnpm run test:unit` and `pnpm run build` pass.
- In a scratch copy of the repo, the backfill commands were run and built. The
  sitemap carried 17 episodes at 2026-11-13T06:57:06Z and 172 at
  2026-11-14T14:12:51Z, and every summary parsed equal to its original apart
  from `updatedAt`. Then one summary stamped with no `--at` showed that time in
  the rebuilt sitemap.

## Head tags through astro-seo

The same branch moves the hand-written `<title>`, description, canonical, Open
Graph and Twitter tags in `Layout.astro` onto `astro-seo`, pinned at exactly
1.2.0. `src/lib/seo-head.ts` builds its props. JSON-LD and the sitemap are
untouched.

Three things in the package needed handling:

- It writes the title with `set:html`, so a YouTube title would land as raw
  HTML. `escapeTitle()` applies the five escapes Astro uses for text, and only
  to `title`. The Open Graph and Twitter titles get the raw string because
  Astro escapes attributes itself. The exact pin exists because this
  workaround depends on that `set:html`.
- Its default canonical keeps the query string. The canonical and `og:url` are
  always passed as the path-only URL, and `null` drops the canonical on 404.
- `openGraph.image` would add `og:image:url`, so the default card's size and
  alt go through `extend.meta`. /partners still declares its own in its head
  slot, and nothing is emitted twice.

It also emits `<meta name="robots" content="index, follow">` on every page with
no option to leave it out. That matches the crawler default, and no page had a
robots tag before. The `X-Robots-Tag: noindex` that `public/_headers` sends for
the pages.dev mirror now sits beside it there; crawlers apply the stricter of
the two. Whether 404 should say `noindex` is a policy call left open here.

`src/lib/seo-head.render.test.ts` renders the package through Astro's container
in its own vitest project (`vitest.astro.config.ts`), so the other tests keep
their plain pipeline. A head inventory of all 238 built HTML files against a
baseline from before the change showed the same title, description, canonical,
Open Graph, Twitter and JSON-LD on every page. The only difference was the
robots tag on the 237 layout pages.

The summary backfill in step 4 is still not applied. It waits on the same
go-ahead.
