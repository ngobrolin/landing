# Rendering and verification

## Inputs and scope

Use the approved kit, a real source video, and an episode-specific edit recipe. Never infer source identity from dimensions alone. Check the source URL, original extract start, spoken excerpt and expected shot composition. A 1280×720 video from another episode can satisfy the technical checks and still be the wrong source.

The approved editorial v3 recipe expects a source extract beginning at episode time 26:35.000. Its source-relative edit is 22.000–57.400 seconds. Do not feed the complete episode without converting the timestamps. The output preserves the full 35.4-second excerpt, starts immediately on the speaker, and adds a 1.5-second episode card, for 36.9 seconds total. The older v2 recipe adds a 0.6-second intro and remains available only for legacy reproduction.

Generate into a fresh output directory outside the checkout. Do not replace a previous approved MP4. Retain the previous version until Ivan explicitly requests cleanup. The renderer refuses an existing final filename.

## Local render

Prerequisites: FFmpeg/ffprobe on PATH; an isolated Python environment with Pillow. The kit includes Archivo fonts and transparent logo PNGs, so rendering needs no font download or browser.

Through the terminal tool, from the checkout root:

```sh
uv run --no-project --with pillow python .claude/skills/podcast-shorts/scripts/render_editorial.py --source <source-extract.mp4> --output-dir <fresh-directory-outside-repo> --preview-only
```

Inspect all preview states before running the same command without `--preview-only`. Use `--edit` for another reviewed recipe and `--kit` for a packaged local copy of the kit. The renderer writes the MP4, SRT, caption JSON, preview PNGs, picture-only intermediate and final manifest. Source downloads and ASR are separate steps, not implemented by this command.

## Cropping and motion

The source composite has chat burned into the right host's camera view, near the chin. Preserve the complete face even if that retains source comments. Never claim comments have been removed. Tight top-panel crops can cut the mouth when the speaker moves; review beginning, middle and end, not one representative frame.

Use the source's actual face/hand movements. The approved pilot alternates large speaker views, brief reaction insets and graphic-led explanation. Place reactions below the active mouth/chin and above the captions; inspect leaning faces as well as the nominal crop. The conceptual branch paths, control labels and final goal reveal are tied to spoken phrases. This is manual editorial selection, not automatic active-speaker tracking. Do not extrapolate bodies or paint missing footage.

Keep the small logo and captions anchored while the picture changes. Use selective orange emphasis on concept words and no separate opening bumper. Close on the real episode thumbnail/title after the spoken thought finishes. Preserve logo proportions. The source audio is unchanged apart from encoding and brief edge fades. No synthetic speech, music, or sound effect is added.

## Verify the delivered MP4

1. Run ffprobe against the final file, not just the picture-only intermediate. Check 1080×1920, square pixels, 30 fps, yuv420p H.264, AAC at 48 kHz, 36.9 seconds, and 1,107 decoded video frames for the approved v3 recipe.
2. Run a full FFmpeg decode to a null sink. An encoder exit zero does not establish the MP4 is decodable.
3. Validate all 20 caption cues: positive duration, ordered, no overlap, at most two lines, within the 0–35.4-second spoken section, with no intro offset. Check measured text and backing-plate bounds against the kit's safe area.
4. Decode stills from the final file across the cold open, every speaker/reaction state, all graphic stages, the final spoken phrase, and the episode card. Inspect at phone size for clipped faces, illegible captions and baked-in source overlays.
5. Compare graphic-only regions in the encoded file to prove branch motion, phrase-timed control reveals and the final goal-state change. Exclude live-camera and caption regions from those checks. Source movement alone does not prove explanatory animation ran.
6. Compare decoded output speech against the same original excerpt, accounting for the intro offset. Near-unity waveform correlation establishes audio preservation, not intelligibility or listening quality. Do not claim auditory review from ASR, waveform correlation, or screenshots.
7. Retain exact source cut boundaries, recipe, artifact hash, verification receipts and a playable MP4. Deliver it natively for Ivan to watch and listen. Publication requires separate approval.

## Delivery package

For an editable ZIP, include the script, recipe, original source extract, fonts/license, required logo PNGs and tokens, the real episode thumbnail, SRT and verification receipt. Include both render_editorial.py and its render_short.py dependency. Keep dependencies, secrets and unrelated media out. Exercise the packaged command in a fresh extraction before claiming the package is reproducible. Explicit `--kit` and `--edit` flags avoid assumptions about checkout paths.
