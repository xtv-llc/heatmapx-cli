# HeatMapX Troubleshooting

CLI errors print to stderr as `[heatmapx] error: <message>` (server-side errors come through as `<code>: <message>`). Match the message below and give the user the fix. Messages are the actual strings emitted by `heatmapx` v0.4.0.

## Auth

| Message (contains) | Cause | Fix |
|---|---|---|
| `Not logged in. Run \`heatmapx login\`.` | No saved credentials | `heatmapx login` |
| `whoami --json` exits non-zero | Not logged in | `heatmapx login` |
| `usage_failed: 401` / `403` | API key revoked or invalid | `heatmapx logout && heatmapx login` |

## analyze

| Message (contains) | Cause | Fix |
|---|---|---|
| `Monthly quota exceeded` / `quota_exceeded` | Monthly analysis quota used up | Upgrade at https://heatmapx.com/pricing, or wait for next month |
| `server_misconfigured` | Server's `ANTHROPIC_API_KEY` not set | Contact the HeatMapX operator (server-side) |
| `claude_api_error: ... credit_balance_too_low` | Server's Anthropic credit exhausted | Contact the HeatMapX operator |
| `capture_failed` / `http_5xx` | Screenshot capture failed | Verify the page URL is reachable; retry |

## patch

| Message (contains) | Cause | Fix |
|---|---|---|
| `no suggestions found in <file>` | analysis.md has no suggestion section | Re-run `analyze`, or pass the correct analysis file |
| `suggestion #<n> not found` | `--suggestion` index out of range | Use an index shown in the analysis summary |
| `heatmap.config.ts に targets を設定してください` | `targets` empty/missing in config | Add globs, e.g. `targets: ["src/**/*.tsx"]` |
| `targets glob にマッチするファイルがありません` | Globs match no files | Fix the `targets` globs to point at real files |
| `該当テキストが見つかりません` | Suggested copy not present in target file | Likely a thin wrapper `page.tsx`; pass `--target` to the real component or i18n dictionary |
| `is not in the candidate set` | Model picked a file outside `targets` (rejected) | Pass `--target` explicitly |
| `cwd の外を指しています` | `--target` is an absolute path outside cwd | Use a path inside the repo |
| (hangs, no output) | `patch` is prompting interactively | Always pass `--suggestion <n>` (and `--target`) |

## Applying the patch / opening the PR (Claude's `git`/`gh` step)

This CLI does not create PRs. After `git apply <patch_path>`:

| Symptom | Cause | Fix |
|---|---|---|
| `git apply` fails (`patch does not apply`) | File changed since analysis | Re-run `analyze` → `patch` against current code |
| working tree dirty before applying | Uncommitted changes | Ask the user; `git stash` or commit first |
| `gh: command not found` | GitHub CLI not installed | https://cli.github.com |
| `gh auth status` not logged in | `gh` not authenticated | `gh auth login` |
| origin is not GitHub | PR target not on GitHub | Push the branch and open the PR manually |
