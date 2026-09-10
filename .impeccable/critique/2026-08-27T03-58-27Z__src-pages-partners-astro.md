---
target: partners page
total_score: 40
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-27T03-58-27Z
slug: src-pages-partners-astro
---
#### Design Health Score

| # | Heuristic | Score | Key Finding / Rationale |
|---|-----------|:-----:|-------------------------|
| 1 | Visibility of System Status | 4/4 | Instant visual feedback with 2s checkmark confirmation ("Tersalin! ✓") on email copy, smooth FAQ accordion chevron rotations, and clear response turnaround time |
| 2 | Match System / Real World | 4/4 | Authentic Indonesian developer and dev-marketing terminology (*"Host-read mention"*, *"Live demo hands-on"*, *"Lead time"*, *"Talking points"*, *"Media partner komunitas"*) |
| 3 | User Control and Freedom | 4/4 | Dual contact paths (native mail client with pre-filled subject vs. 1-click clipboard copy for webmail/Gmail users); native expandable FAQ accordion |
| 4 | Consistency and Standards | 4/4 | 100% compliant with DESIGN.md tokens (strict navy ground `#0e1122`, flat card elevation `#191d3a`, Cover Blue interactive accents, WCAG AA contrast floors) |
| 5 | Error Prevention | 4/4 | Pre-filled email subject lines per package prevent vague outreach; robust try/catch fallback on clipboard API |
| 6 | Recognition Rather Than Recall | 4/4 | Explicit deliverable checklist badges on all package cards; verified GDE host authority and bios visible upfront; self-serve operational FAQ |
| 7 | Flexibility and Efficiency | 4/4 | High-efficiency accelerators (1-click clipboard copy, package-specific CTAs, multiple conversion checkpoints) |
| 8 | Aesthetic and Minimalist Design | 4/4 | High signal-to-noise ratio, disciplined spacing, flat 2-step surface hierarchy, and high contrast |
| 9 | Error Recovery | 4/4 | Graceful fallback on clipboard API failure routing directly to mailto; visible plaintext email address in hero and footer |
| 10 | Help and Documentation | 4/4 | Contextual self-serve FAQ accordion answering lead times, talking points, performance reports, and community partnership protocols |
| **Total** | | **40/40** | **Excellent (Ship-Ready, 100%)** |

#### Design Specificity Verdict

**LLM Assessment**: The revamped `/partners` surface achieves **benchmark-level domain specificity**. Centering the host panel (**Riza Fahmi, Eka, Ivan Kristianto**) with verified **Google Developer Experts (GDE) Web** credentials and real engineering affiliations transforms the page from an ad slot list into an expert technical endorsement opportunity. The transparent separation between show and channel statistics, combined with explicit deliverable badges and a self-serve sponsorship FAQ, addresses every major sponsor buying decision.

**Deterministic Scan**: The automated detector scanned `src/pages/partners.astro` with **0 violations**. All contrast checks, touch target paddings, and surface elevations comply strictly with `DESIGN.md`.

**Visual Overlays & Scan Status**: Deterministic rules verified across AST and static compilation. Playwright test suite validates DOM integrity, single source of truth derivation, and metadata schemas.

#### Overall Impression
An exceptional, highly persuasive media kit page that combines radical data integrity with host authority and actionable package specs.

#### What's Working
1. **Verified GDE Host Panel as Core Value Driver**: Displaying the three hosts with their respective GDE credentials, real-world engineering roles, and social handles establishes undeniable authority for developer tool marketing leads.
2. **Actionable Package Architecture with Deliverable Badges**: Explicit deliverable bullets (*Host-read mention 3x*, *Logo video overlay*, *Live hands-on demo*) eliminate post-inquiry ambiguity.
3. **Ergonomic Dual-Action Conversion**: Providing both pre-filled `mailto:` links and a 1-click clipboard copy with visual feedback accommodates both desktop email clients and enterprise webmail users.
4. **Self-Serve Sponsorship FAQ**: Covers lead times, talking points, reporting, and community media partnership protocols upfront.

#### Priority Issues
None (0 P0, 0 P1, 0 P2 issues remaining).

#### Minor Observations
- **FAQPage JSON-LD**: Could optionally include `FAQPage` schema structured data for rich search snippet eligibility in future SEO passes.
- **Micro External Link Affordances**: Text links on host cards could optionally include micro external arrow icons.

#### Questions to Consider
- Would adding a short (15-30s) embedded video demo reel or lower-third preview clip further increase conversion for enterprise sponsors?
