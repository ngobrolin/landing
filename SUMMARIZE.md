# Episode Summarization Instructions

These instructions now live in the `summarizing-episodes` agent skill:
[`.claude/skills/summarizing-episodes/SKILL.md`](.claude/skills/summarizing-episodes/SKILL.md).

Read that file and follow it. It holds the summary contract (shape, Bahasa
Indonesia, grounding rules) and the workflow (pick an episode, write, check,
regenerate tags, test).

Project skills live in `.claude/skills/`. Codex, Cursor and GitHub Copilot
read the per-skill symlinks in `.agents/skills/`; Claude Code reads the
canonical directories directly. This file stays so
that prompts like `@SUMMARIZE.md please summarize the next episode` keep
working. Do not add rules here; change the skill.
