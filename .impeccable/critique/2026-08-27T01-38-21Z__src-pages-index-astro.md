---
target: /
total_score: 29
max_score: 32
na_heuristics: 9,10
p0_count: 0
p1_count: 1
timestamp: 2026-08-27T01-38-21Z
slug: src-pages-index-astro
---
Method: dual-agent (A: d015a478-045e-4b1d-a71f-579fe2f347d6 · B: 670e67f5-b192-43c9-88b1-bd23203b1abe)

#### Design Health Score

| # | Heuristic | Score | Key Issue / Observation |
|---|-----------|:---:|-------------------------|
| 1 | Visibility of System Status | 4/4 | `BARU` badges indicate freshness; `OfflineIndicator` communicates cached status; exact episode and transcript counts are derived live. |
| 2 | Match Between System and Real World | 4/4 | Fluent Indonesian copy throughout; standard podcast/video conventions (EP badges, mm:ss duration indicators, 16:9 aspect ratio). |
| 3 | User Control and Freedom | 3/4 | Native GET search form allows frictionless back-navigation; skip link provided. Hero search input lacks an inline clear button (`×`). |
| 4 | Consistency and Standards | 4/4 | Strict compliance with design tokens and 4-up card grid shared across all archive views (`/episodes`, `/episodes/[year]`, `/tags/[tag]`). |
| 5 | Error Prevention | 4/4 | No-JS form fallback; topic chips dynamically derived from real tag pages to prevent 404 dead ends. |
| 6 | Recognition Rather Than Recall | 4/4 | Rich thumbnails, durations, dates, and blurbs eliminate guessing. Dynamic placeholder (`Cari di 178 episode...`) reinforces catalog depth. |
| 7 | Flexibility and Efficiency of Use | 3/4 | Instant search from hero with speculative prerendering. Lacks a keyboard accelerator (e.g. `/` or `Cmd+K`) to jump directly to search. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean navy aesthetic with strong contrast. Minor visual clutter in hero subtitle coloring; oversized year cards dominate vertical rhythm. |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | n/a | Landing/persuade surface with no in-situ error-prone inputs; search query delegates to `/episodes` empty state. |
| 10 | Help and Documentation | n/a | Self-explanatory media catalog surface; external documentation not applicable. |
| **Total** | | **29/32** | **Excellent (90.6%)** |

#### Design Specificity Verdict

**Verdict:** *Grounded & Coherent, with Untapped Media & Human Potential*

The visual identity is firmly anchored in the podcast cover art (`public/podcast-cover.jpg`). The four-tiered navy surface system (`#0e1122` ground, `#191d3a` card step, `#242b4d` overlay, `#333c66` hairline) and the functional division of accent colors (Cover Blue `#4c6fff` for interactive affordances, Cover Purple `#9048e0` for categories and hover states) prevent the site from feeling like a generic template.

- **LLM Assessment:** Stating *"{episodeCount} episode, semuanya dengan transkrip lengkap"* immediately frames the site's unique positioning as Indonesia's largest transcribed web-dev encyclopedia. However, the hero remains text-centric rather than media-centric, the page lacks host photos/credentials (Riza Fahmi, Eka, Ivan — all Google Developer Experts), and the year cards take excessive visual prominence compared to technical topics.
- **Deterministic Scan:** 7 findings reported across the repository (all `design-system-color` advisory). Only 1 hit exists in the homepage dependency tree (`color: #10b981` in `OfflineIndicator.astro`), while 6 findings in `ShareButtons.astro` and `YouTubeEmbed.astro` are false positives for third-party brand logos (WhatsApp, LinkedIn, X, YouTube) authorized by the Borrowed-Colour Rule in `DESIGN.md`.
- **Visual Overlays:** No live overlay injection performed in this run; analysis based on static source inspection and CLI detector results.

#### Overall Impression

The homepage is an exceptionally clean, well-engineered, and accessible catalog front door with high technical discipline (0 CLS, LCP preloading, 100% WCAG AA contrast). Its biggest growth opportunity is transitioning from a text-heavy archive index into a vibrant media front door with an immediate episode spotlight and authentic host presence.

#### What's Working

1. **Moat-First Value Proposition:** Directly leading with the live-derived count of transcribed episodes immediately communicates authority and depth.
2. **Zero-JS Resilient Search Pipeline:** Standard GET form fallback with speculative prerendering ensures instant response times even prior to hydration.
3. **Harmonious Cover-Sampled Design System:** Rigorous surface-step contrast, system font stack with zero webfont payload, and coordinated card micro-interactions.

#### Priority Issues

- **[P1] Missing Hero Episode Spotlight (Missed Media Engagement)**
  - *Why it matters:* Returning visitors and livestream followers must scroll past text and search to find the latest show.
  - *Fix:* Introduce a 2-column hero or spotlight layout showcasing the latest episode card or player directly in the first viewport.
  - *Suggested command:* `$impeccable bolder` or `$impeccable layout`

- **[P2] Impersonal Closing Section & Absence of Host Profiles**
  - *Why it matters:* Podcast connection is driven by host rapport. The current page ends on a generic text box without naming the GDE panel (Riza, Eka, Ivan) or linking to community discussions.
  - *Fix:* Replace the generic about box with a "Kenalan dengan Host" block featuring host headshots (`/images/{riza,eka,ivan}.jpg`), GDE badges, and a direct CTA to join GitHub discussions.
  - *Suggested command:* `$impeccable delight` or `$impeccable polish`

- **[P3] Year Cards Over-Dominate Visual Weight**
  - *Why it matters:* Developers search and browse by technology and topic (React, AI, Performance), not calendar years. The 5 large year cards take disproportionate attention.
  - *Fix:* Condense year browsing into a compact horizontal filter strip or integrate it into a unified catalog filter.
  - *Suggested command:* `$impeccable distill` or `$impeccable layout`

- **[P3] Color Jitter in Archive Scale Subtitle**
  - *Why it matters:* The hero subtitle switches between 4 distinct text colors (`text-ink`, `text-ink-body`, `text-ink-muted`, `text-accent-text`) across two short sentences, causing reading friction.
  - *Fix:* Unify to `text-ink-body` with bold `text-ink` for numbers and standard `text-ink-muted` for schedule notes.
  - *Suggested command:* `$impeccable polish` or `$impeccable typeset`

#### Persona Red Flags

- **Alex (Power User / Tech Lead):** No keyboard shortcut (e.g., `/` to focus search) on the hero search bar. Requires manual mouse navigation.
- **Jordan (First-Timer / Early Learner):** The "Tentang" section does not explain the show format (casual conversation vs tutorial, target experience level).
- **Sam (Accessibility / Keyboard User):** The absolute-positioned submit button (`Cari`) inside the hero search input risks colliding with input text at 200%+ browser zoom.
- **Project Persona (Indonesian Web Dev):** "Jelajahi Topik" displays 12 raw count-sorted tags in an unclustered wrap, mixing broad categories ("Web Development", "Karir") with specific tools ("React", "Astro").

#### Minor Observations

1. **Undocumented Emerald Hex in OfflineIndicator:** `color: #10b981` in `OfflineIndicator.astro:48` introduces an untracked green literal outside `DESIGN.md`.
2. **Hardcoded Button Colors in Header:** `bg-red-600 hover:bg-red-700` used in `Layout.astro` instead of a semantic token.
3. **Hero Search Missing Clear Button:** The hero search input lacks the inline clear (`×`) button present on `/episodes`.

#### Questions to Consider

- *What if the hero featured a split layout with the newest episode embedded or spotlighted alongside the value proposition for immediate playback?*
- *What if the homepage introduced a "Meet the Hosts" section showcasing Riza, Eka, and Ivan with their GDE badges to build instant authority and community warmth?*
- *What if "Jelajahi per Tahun" and "Jelajahi Topik" were unified into an integrated, interactive discovery bar?*
