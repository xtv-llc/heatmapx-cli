---
name: heatmapx
description: Use when the user wants to analyze a web page's conversion rate, get CRO (conversion rate optimization) improvement ideas, rewrite marketing copy based on heatmap/behavior data, or open a PR with copy/style changes for a landing/pricing page. Triggers on phrases like "improve conversion", "analyze the pricing page", "ヒートマップで改善", "コピー改善のPRを作って", "CROの提案を出して", "LPの転換率を上げたい".
---

# HeatMapX — CRO analysis & copy-patch PR

Drive the `heatmapx` CLI to analyze a page, surface CRO suggestions, generate a code patch for the chosen suggestion, and (inside Claude Code) apply it and open a PR. The CLI does capture + Claude analysis + diff generation; **you (Claude) handle applying the patch and opening the PR with `git`/`gh`** — the CLI itself does not create PRs.

## 0. Prerequisite checks (always run first)

Run via Bash, in order. If one fails, stop and give the user the fix, then continue once resolved.

| Check | Command | If it fails |
|---|---|---|
| CLI installed | `which heatmapx` | "`npm install -g heatmapx` を実行してください" |
| Logged in | `heatmapx whoami --json` (exit 0 = OK) | "`heatmapx login` でブラウザ認証してください" |
| Config exists | `test -f heatmap.config.ts` | "`heatmapx init` で heatmap.config.ts を作ります" |

`whoami --json` returns `{ logged_in, email, plan, usage }`. Non-zero exit ⇒ not logged in.

## 1. Analyze

1. Get the target page path from the user (skip if already explicit, e.g. "/pricing").
2. Point config at it: `heatmapx config set page <path>`
3. Run: `heatmapx analyze <path> -o /tmp/heatmapx-analysis-$(date +%s).md`
   - **This takes ~60–90s** (screenshot capture + Claude analysis). Tell the user to wait.
4. Read the output Markdown with the Read tool and **summarize 3–5 suggestions as a numbered list** for the user. Keep each to one line. Ask which to act on.

## 2. Patch the chosen suggestion

Always pass `--suggestion` (and `--target` if you already know the file) so the CLI runs **non-interactively** — without them it prompts and will hang.

1. `heatmapx patch <analysis.md> --suggestion <n> --json`
   - Output JSON: `{ suggestion, target_file, dry_run, patch_path, diff, usage }`.
   - To preview without writing a file, add `--dry-run` (then `patch_path` is null and the diff is in `diff`).
2. Show the user the `target_file` and a short diff summary.

## 3. Apply & open a PR (your job, not the CLI's)

Once the user approves:

1. Make sure the working tree is clean (`git status`); if dirty, ask before proceeding.
2. Create a branch: `git checkout -b cro/<short-slug>`
3. Apply: `git apply <patch_path>` (the path from step 2's JSON).
4. Review the applied change, then commit.
5. `gh pr create --fill` (or with a title/body summarizing the CRO rationale). Return the PR URL to the user.
6. If the user wants to stop before pushing, apply + commit only and skip `gh pr create`.

## 4. On error

CLI errors print to stderr as `[heatmapx] error: <message>`. Read it and consult `references/troubleshooting.md` to explain the cause and the fix (re-login, set `targets`, upgrade plan, etc.). For full command/flag details see `references/cli-cheatsheet.md`.

## Tools you use

- **Bash** — run the `heatmapx` CLI and `git`/`gh`
- **Read** — read the analysis Markdown
- **Edit** — only if you need to tweak `heatmap.config.ts`

Avoid Write/destructive operations. The patch is applied with `git apply`, never by hand-editing.
