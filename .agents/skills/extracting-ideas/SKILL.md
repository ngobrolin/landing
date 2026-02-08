---
name: extracting-ideas
description: "Extracts 1-2 digital product, startup, or content ideas from podcast episode transcripts. Use when asked to extract ideas, generate product concepts, or mine episodes for business opportunities."
---

# Extracting Ideas from Episode Transcripts

Extract actionable ideas for digital products, startups, or content from Ngobrolin WEB podcast episode transcripts.

## Overview

This skill reads episode transcripts from `src/data/transcripts/`, analyzes them, and extracts 1-2 concrete ideas per episode. Results are saved to `src/data/ideas.json`.

## Output Format

The output file `src/data/ideas.json` is a JSON array with entries:

```json
[
  {
    "videoId": "abc123",
    "title": "Episode Title",
    "ideas": [
      {
        "idea": "A short, actionable description of the idea",
        "category": "product"
      }
    ]
  }
]
```

Categories: `product` (digital product/SaaS/tool), `startup` (business/startup opportunity), `content` (content creation/course/community idea).

## Workflow

### Step 1: Identify target episodes

- If user specifies an episode (by videoId, title, or slug), use that one.
- If user says "all", process all episodes with transcripts in `src/data/transcripts/`.
- **Default: automatically pick unextracted episodes.** List transcript files in `src/data/transcripts/`, read `src/data/ideas.json`, and find videoIds that have a transcript but are NOT yet in `ideas.json`. Pick the first unextracted episode and process it. If all episodes are already extracted, inform the user.

### Step 2: Read the transcript

Read the transcript JSON from `src/data/transcripts/{videoId}.json`. The transcript contains segments with `text` fields. Concatenate all segment texts to get the full transcript.

### Step 3: Extract ideas

Analyze the transcript and extract 1-2 ideas. For each idea:

1. **Identify pain points, wishes, or opportunities** discussed in the episode.
2. **Formulate a concrete idea** — not vague ("build an app") but specific ("a browser extension that auto-generates alt text for images using AI").
3. **Categorize** as `product`, `startup`, or `content`.

Guidelines for categorization:
- **product**: Tools, SaaS, browser extensions, libraries, CLI tools, mobile apps that solve a developer or user problem.
- **startup**: Business models, marketplace ideas, service companies, platforms with revenue potential.
- **content**: Course ideas, newsletter topics, YouTube series, community/event concepts, blog series.

### Step 4: Save results

- Read existing `src/data/ideas.json` if it exists.
- Merge new ideas (update existing entries by videoId, append new ones).
- Write back to `src/data/ideas.json` with pretty formatting (2-space indent).

### Step 5: Report

Show the user the extracted ideas in a readable format.

## Running the extraction script

For batch processing all episodes, run: `npx tsx .agents/skills/extracting-ideas/scripts/extract-ideas.ts`

This script reads all transcripts, concatenates segment texts, and outputs a template `ideas.json` with episode titles and empty idea arrays for the agent to fill in.

## Important Notes

- Transcripts are in Indonesian (Bahasa Indonesia). Ideas should be written in **English**.
- Focus on ideas that are **actionable and specific**, not generic.
- Each episode should have exactly 1-2 ideas — pick the strongest ones.
- Look for moments where hosts discuss problems, wishlists, missing tools, or market gaps.
