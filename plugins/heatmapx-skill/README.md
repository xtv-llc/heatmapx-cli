# HeatMapX — Claude Code Skill

Call the [`heatmapx`](https://www.npmjs.com/package/heatmapx) from Claude Code in natural language. Ask Claude to improve a page's conversion rate and it will analyze the page, summarize CRO suggestions, generate a copy/style patch, and open a PR.

> **CRO as Code** — analyze → patch → PR, driven from your editor.

## Prerequisites

```bash
npm install -g heatmapx
heatmapx login           # browser (device-code) auth
heatmapx init            # creates heatmap.config.ts in your project (set `targets`)
```

You also need `git` and the GitHub CLI [`gh`](https://cli.github.com) (authenticated via `gh auth login`) for the PR step.

## Install the skill

In Claude Code, add this repo as a plugin marketplace and install the plugin:

```
/plugin marketplace add xtv-llc/heatmapx-cli
/plugin install heatmapx@heatmapx
```

(For local development, `/plugin marketplace add` also accepts a path to a clone of this repo.)

## Usage

In Claude Code, just describe the goal:

> /pricing ページの転換率を改善する PR を作って

The skill auto-activates and runs:

1. `heatmapx whoami` — auth check (prompts you to log in if needed)
2. `heatmapx analyze /pricing` — capture + Claude CRO analysis (~60–90s)
3. Claude summarizes 3–5 suggestions and asks which to act on
4. `heatmapx patch … --suggestion <n> --json` — generates a unified-diff patch
5. Claude applies it (`git apply`) and opens a PR with `gh pr create`, then returns the PR URL

Say "preview only" / "don't push" to stop after the diff or after the local commit.

## What's where

| Path | Purpose |
|---|---|
| `skills/heatmapx/SKILL.md` | Skill instructions Claude follows |
| `skills/heatmapx/references/cli-cheatsheet.md` | All commands & flags (v0.4.0) |
| `skills/heatmapx/references/troubleshooting.md` | Error → fix mapping |

## Uninstall

```
/plugin uninstall heatmapx@heatmapx
```

## Notes

- This skill is a thin orchestration layer; all analysis/diff logic lives in `heatmapx`.
- PR creation is done by Claude (`git`/`gh`), not the CLI. Automatic PR creation from a bare terminal is planned for a later CLI phase.
- License: MIT.
