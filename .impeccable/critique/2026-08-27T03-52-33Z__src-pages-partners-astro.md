---
target: partners page
total_score: 22
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 1
timestamp: 2026-08-27T03-52-33Z
slug: src-pages-partners-astro
---
#### Design Health Score

| # | Heuristic | Score | Key Finding / Rationale |
|---|-----------|:-----:|-------------------------|
| 1 | Visibility of System Status | 3/4 | Strong timestamps for verified data (`Agustus 2026`, API fetch dates) and response SLA ("dibalas dalam 2 hari kerja"), but lacks visual confirmation or clipboard fallback for `mailto:` clicks |
| 2 | Match System / Real World | 3/4 | Authentic Indonesian developer terminology throughout, though raw YouTube Studio analytics taxonomy (`"High-End Computer Aficionados"`) leaks untranslated into body copy |
| 3 | User Control and Freedom | 3/4 | Standard global navigation and external YouTube exit paths, but relying strictly on OS `mailto:` links restricts users who lack a configured default email client |
| 4 | Consistency and Standards | 4/4 | Flawless alignment with DESIGN.md: strict navy ground (`#0e1122`), card elevation (`#191d3a`), Cover Blue interactive fills, Purple accents, flat resting floor, and 100% WCAG AA contrast compliance |
| 5 | Error Prevention | 3/4 | Pre-filled email subject lines prevent blank outreach, but lacks an inquiry briefing checklist or guidance on what sponsors should provide, leading to vague outreach |
| 6 | Recognition Rather Than Recall | 3/4 | Explicit scope labels (`Ngobrolin WEB` vs `Kanal YouTube`) prevent metric confusion, but package tiers rely on text bullets rather than visual placement previews |
| 7 | Flexibility and Efficiency | n/a | *Persuade landing page with a single conversion funnel; power-user accelerators and keyboard workflows do not apply.* |
| 8 | Aesthetic and Minimalist Design | 3/4 | Disciplined palette and strict flat elevation, but repetitive checkmark icons across package cards (11 identical icons) and dense inline secondary stats reduce scanability |
| 9 | Error Recovery | n/a | *Persuade static landing page with no client-side form submissions, stateful inputs, or error boundaries.* |
| 10 | Help and Documentation | n/a | *Persuade surface designed for direct conversion rather than task documentation; sponsorship FAQs and direct email contact serve this function.* |
| **Total** | | **22/28** | **Good (78.6%)** |

*Note: Heuristics 7, 9, and 10 are marked `n/a` per Persuade surface rules. Re-normalized against an applicable maximum of 28 points (7 scored heuristics).*

#### Design Specificity Verdict

**LLM Assessment**: The page demonstrates **strong data authenticity paired with generic SaaS packaging**. The analytical backbone is uniquely honest: it separates show tenure from channel metrics and derives all statistics from automated stores (`episodes.json`, `media-kit.json`, `channel-subscribers.json`) with explicit dates. However, the value proposition and package sections rely on generic B2B SaaS tropes (repetitive green checkmark lists, abstract icons), while completely omitting the show's primary trust asset: the **three hosts (Riza Fahmi, Eka, Ivan) and their Google Developer Expert authority**.

**Deterministic Scan**: The automated detector scanned `src/pages/partners.astro` with **0 violations**. All typography, spacing, and surface elevations strictly use the project tokens. Build-time rasterized share card (`/partners-og.png`) and data-guard test suites (38 unit tests, 21 Playwright E2E browser tests) pass 100%.

**Visual Overlays & Scan Status**: Deterministic rules verified across AST and static compilation. Playwright test suite validates DOM integrity, single source of truth derivation, and metadata schemas.

#### Overall Impression
An exceptionally honest and credible media kit that avoids fake vanity numbers and adheres strictly to the dark palette tokens. However, its conversion power is held back by generic SaaS package cards, buried secondary demographic metrics, anonymous initials on high-profile creator testimonials, and the absence of host credentials.

#### What's Working
1. **Radical Metric Integrity and Scoping Transparency**: Explicitly differentiating between show reach and channel reach with dated snapshots (`Agustus 2026`) creates unassailable trust with analytical dev-marketing decision makers.
2. **Strict Design Token & Contrast Floor Compliance**: Deep navy background (`#0e1122`), card steps (`#191d3a`), Cover Blue buttons, and high-contrast typography meet 100% WCAG AA standards.
3. **Authentic Community Testimonials**: Quotes from real developers and tech educators in the community demonstrate deep organic engagement.

#### Priority Issues

- **[P1] Host Credibility & Authority Vacuum**
  - **Why it matters**: Podcast sponsorships are an endorsement and host-trust buy. Dev-tool companies sponsor Ngobrolin WEB because the hosts are trusted technical authorities (Google Developer Experts, seasoned software architects). Omitting the host panel forces sponsors to leave the page to vet who is behind the mic.
  - **Fix**: Introduce a compact "Panel Host & GDE" section featuring Riza Fahmi, Eka, and Ivan with verified Google Developer Expert badges, professional avatars, and technical focus areas.
  - **Suggested command**: `$impeccable shape`

- **[P2] Generic SaaS Feature Card Aesthetics in Packages & Value Props**
  - **Why it matters**: Package cards look like B2B software pricing tiers with 11 repetitive green checkmark icons and abstract vector boxes, rather than media sponsorship format specifications.
  - **Fix**: Replace generic checkmark lists with clear deliverable badges (*Host-Read Mention*, *Video Lower-Third*, *Permanent Show Notes Link*, *Community Shoutout*) and add workflow expectations (lead time, review drafts).
  - **Suggested command**: `$impeccable layout`

- **[P2] High-Impact Creator Testimonials Rendered as Anonymous Initials**
  - **Why it matters**: Prominent Indonesian tech educators (Dea Afrizal, Kelas Terbuka, Peter Kambey) provided testimonials, but appear as single-letter initials ("D", "K", "P"), squandering valuable third-party validation.
  - **Fix**: Elevate testimonials with real names, creator tags ("Creator & Tech Educator", "Founder PHP Indonesia"), and richer avatar badges.
  - **Suggested command**: `$impeccable clarify`

- **[P2] Secondary Demographic Metrics Buried in Inline Prose**
  - **Why it matters**: Indonesian audience concentration (87.7%) and average watch duration (5:58) are key buying criteria for dev-marketing leads, but are compressed into an unformatted inline string.
  - **Fix**: Restructure secondary metrics into a structured 2x2 grid of mini-stat cards or pill badges, and translate raw analytics taxonomy (`"High-End Computer Aficionados"` -> *"Penggemar Hardware & Komputasi"*).
  - **Suggested command**: `$impeccable layout`

- **[P3] Mailto Friction & Missing Sponsorship FAQ**
  - **Why it matters**: Relying exclusively on native `mailto:` links causes silent drop-offs for desktop webmail users, and unanswered logistical questions (lead times, asset formats, custom budgets) delay outreach.
  - **Fix**: Add a 1-click "Salin Email" button beside the CTA and add a 4-item FAQ accordion covering lead times, review processes, and package customization.
  - **Suggested command**: `$impeccable harden`

#### Persona Red Flags

- **Dimas (Marketing Lead at DevTools Startup)**: Evaluating sponsorship for a developer tool launch. Red flags: no budget framing/ballpark, no visual examples of on-screen sponsor placements, and `mailto:` launches an unconfigured desktop email client.
- **Maya (Corporate Developer Relations Lead)**: Vetting brand safety and technical audience caliber for an enterprise sponsorship. Red flags: cannot verify host technical credentials on this page, and the single-partner logo wall feels sparse without an inviting prompt.
- **Budi (Tech Community Meetup Organizer)**: Inquiring about non-profit community media partnership. Red flags: all 3 packages strictly target commercial sponsors with corporate deliverables, leaving non-monetary community collaborations unaddressed.

#### Minor Observations
- **Hero Subtitle Tone**: *"{episodesTile.value} episode sejak {firstYear}. Angka lengkapnya ada di bawah."* reads like an internal developer instruction rather than engaging marketing copy.
- **Testimonial Hover Trap**: Non-interactive testimonial cards trigger hover border changes (`hover:border-accent/30`), creating a false affordance of clickability.
- **Single Logo Loneliness**: Showing only 1 partner logo (`DomaiNesia`) in a large section feels barren; adding an inviting prompt (*"Ingin brand Anda tampil di sini? Hubungi kami"*) warms the space.

#### Questions to Consider
- What if the page led with the host panel's combined authority (Google Developer Experts & seasoned industry architects) right beside the verified analytics?
- What if prospective sponsors could preview a 15-second visual clip or screenshot of an actual sponsor placement (lower-third, live demo, show notes) directly in the package section?
- What if the partnership options included a dedicated "Komunitas & Non-Profit" pathway alongside commercial tiers to actively support the local developer ecosystem?
