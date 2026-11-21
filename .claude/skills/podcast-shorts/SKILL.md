---
name: podcast-shorts
description: "Use when preparing branded Ngobrolin podcast shorts."
---

# Podcast shorts

Create Ngobrolin WEB shorts using the approved identity and editorial v3 treatment. The local renderer is exercised for the horse-analogy pilot; it is not an automatic end-to-end clip generator.

## When to use

Use for short selection, caption styling, explanatory graphics, portrait editing, and branded video rendering for this podcast. Do not treat this skill as authorization to upload, deploy, replace the website identity, commit, push, or overwrite an approved video.

## Approved default

Ivan approved the final editorial v3 video. Carry this treatment forward when asked for another short with the same requirements. Do not fall back to the plain v1/v2 shell or reopen the approved logo/design direction unless asked.

- **Cold open:** start directly on the speaker's hook. Use a small logo bug; no separate logo bumper delaying the speech.
- **Picture first:** make the active speaker or explanatory material occupy the portrait. UI-safe text margins do not require shrinking the whole camera picture. Avoid tiny stacked panes inside large empty navy margins.
- **Explain visually:** build a few purposeful graphic beats from the actual idea. In the pilot, branches become a guided `LLM → Harness → Tujuan` path. Reveal each control when its spoken phrase arrives and resolve the graphic at the payoff. Create graphics for the new excerpt's meaning, not the horse diagram regardless of topic.
- **Caption hierarchy:** short phrases, maximum two lines, stable position, Archivo 800 and near-white text. Emphasise selected concept words in orange. No word-by-word bouncing, flashing or changing what was said.
- **Editorial rhythm:** alternate a large speaker, a brief reaction and graphic-led explanation when the conversation warrants it. Motion must change what viewers understand, not merely rearrange boxes.
- **Faces stay clear:** inspect moving mouths, chins, gestures and reaction overlays across the complete excerpt. A smaller reaction inset is preferable to covering the main speaker. Preserve source chat where avoiding it would cut the face; never claim baked-in chat has been removed.
- **Specific ending:** finish the spoken thought, then show the real episode thumbnail, verified title and a concise continuation to `ngobrol.in`. The pilot uses a 1.5-second ending.
- **Identity:** preserve navy, blue, orange, Archivo, and the two-speech-bubble logo. Borrow editorial methods from references, not another channel's branding or neon set.

The pilot's approved render identity and technical receipt are in [Approved pilot](references/approved-pilot.json). Approval of the video format does not authorize publication.

## Assets and context

All links are relative to this canonical `.claude/skills/podcast-shorts/` directory. `.agents/skills/podcast-shorts` is a symlink to it.

- [Video design system](assets/brand-kit/DESIGN.md), [video tokens](assets/brand-kit/tokens.json), and [DTCG tokens](assets/brand-kit/tokens.dtcg.json).
- [Kit inventory](assets/brand-kit/README.md), [local review board](assets/brand-kit/index.html), [logos and layout studies](assets/brand-kit/assets/), and [Archivo fonts/license](assets/brand-kit/fonts/).
- [Rendering and verification](references/rendering.md): source boundaries, caption timing, crop constraints and delivery checks.
- [WPU comparison](references/visual-editing-wpu.md): evidence behind the composition changes, not a specification to copy another identity.
- [Editorial v3 recipe](references/kyzTP34JNao-horse-v3.json): exercised timings and graphic reveals.
- [Legacy v2 recipe](references/kyzTP34JNao-horse.json): retained for reproducing the older pane-only version, not the default.

The website's root DESIGN.md remains authoritative for the website. The kit's original design-only handoff and early layout studies predate the approved editorial v3 treatment; follow the approved default above for video composition and opening/ending behaviour.

## Procedure

1. Read the full exact episode transcript before proposing moments. Inspect the chosen source footage and verify its identity and time origin. Auto-caption timestamps are candidate boundaries, not frame-accurate cuts.
2. Preserve original speech, provenance and necessary context. Derive phrase timing from actual speech. Caption cleanup must not rewrite the argument.
3. Keep the source media and generated outputs outside the checkout. Store only deliberate recipes, scripts, reference documentation and small reusable assets in this skill folder. No dependency folders, full episode downloads, duplicate ZIPs or credentials.
4. Build a reviewed edit recipe. Choose a hook, meaningful shot changes, a few explanatory beats, concept-word emphasis and an episode-specific ending. Existing scripts are source-composite and metaphor specific; adapt and verify them for another excerpt rather than assuming any input will work.
5. Render previews, inspect all scene states at phone size, then render the complete short. Keep the previous versions intact and use a fresh output directory.
6. Verify the actual final MP4 as described in the rendering reference. Deliver it natively for watching/listening review, with SRT. Report render verification separately from auditory review, publication and repository delivery.

Handle video work directly in Rei's current Codex-backed session. Do not delegate to Rex or spawn additional coding agents unless Ivan explicitly requests it.

## Run the approved pilot

Through the terminal tool, from the repository root:

```sh
uv run --no-project --with pillow python .claude/skills/podcast-shorts/scripts/render_editorial.py --source <source-extract.mp4> --output-dir <fresh-directory-outside-repo>
```

Add `--preview-only` for stills. The expected source is the original 1280×720 extract beginning at episode time 26:35.000. The source-relative cut is 22.000–57.400 seconds. Do not use the full episode or a different extract offset without converting and reviewing the recipe. The final is 1080×1920 at 30 fps, 36.9 seconds, with 20 caption cues and original Indonesian audio. The renderer adds no synthetic speech, music or sound effects.

`render_editorial.py` uses `render_short.py` for source decoding, timing and encoding. The latter remains the legacy v2 entrypoint. The scripts refuse an existing final filename. The thumbnail is retained under `assets/episode-thumbnails/`, with its source URL in the recipe.

## Skill-overload excerpt

The next exercised cut uses [its own recipe](references/kyzTP34JNao-skill-overload.json) and new skill-selection graphics, not the horse diagram. It opens on “Semua skill yang ada di internet…” and keeps the casual-question/brainstorming example, Grill example, old code-review skill and random-selection payoff. This cut awaits Ivan's review; it does not replace the approved pilot reference.

From the repository root, through the terminal tool:

```sh
uv run --no-project --with pillow python .claude/skills/podcast-shorts/scripts/render_skill_overload.py --source <skill-overload-source.mp4> --output-dir <fresh-directory-outside-repo>
```

Add `--preview-only` for stills. This recipe expects a different source extract: 1280×720 beginning at episode time 32:40.000. It cuts source-relative 7.000–41.200 seconds, corresponding to 32:47.000–33:21.200 in the original episode. The result is 35.7 seconds including a 1.5-second episode card, with 15 speech-aligned phrase captions. Never feed the horse-pilot extract to this command. The renderer reuses `render_editorial.py` and `render_short.py` for the approved visual language and encoding.

For this excerpt, the left host leans low enough that the earlier 575-pixel crop cuts his chin. Preserve the full 720-pixel left camera height in both main and inset views; contain the cold-open/payoff picture where necessary. Verify each excerpt's movement rather than reusing crop bounds because the episode ID is the same. The wrong-skill cards illustrate the spoken examples and must not be presented as captured agent/tool output.

## Brand asset maintenance

Only regenerate the brand assets when asked. From `assets/brand-kit/`, through the terminal tool:

```sh
uv run --no-project --with fonttools --with brotli --with pillow python build_brand.py
node verify.mjs
```

The builder uses the included fonts and source still. Browser verification uses landing's installed Playwright and system Chrome. Static boards do not prove video motion or speech synchronization.

## Limits

Automatic speaker tracking, candidate selection, source download, caption alignment and general layouts for arbitrary episodes are not implemented by these render commands. Document only exercised capabilities. A request to update the skill alone does not authorize committing, pushing or editing the open PR.
