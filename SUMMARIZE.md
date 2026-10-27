# Episode Summarization Instructions

These instructions now live in the `summarizing-episodes` agent skill:
[`.agents/skills/summarizing-episodes/SKILL.md`](.agents/skills/summarizing-episodes/SKILL.md).

Read that file and follow it. It holds the summary contract (shape, Bahasa
Indonesia, grounding rules) and the workflow (pick an episode, write, check,
regenerate tags, test).

Agents that support skills find it on their own: Codex, Cursor and GitHub
Copilot read `.agents/skills/`, and Claude Code reads `.claude/skills/`, where
`summarizing-episodes` is a symlink to the same directory. This file stays so
that prompts like `@SUMMARIZE.md please summarize the next episode` keep
working. Do not add rules here; change the skill.
