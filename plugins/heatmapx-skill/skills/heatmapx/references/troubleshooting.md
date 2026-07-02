# HeatMapX Troubleshooting

CLI errors print to stderr as `[heatmapx] error: <message>` (server-side errors come through as `<code>: <message>`). Match the message below and give the user the fix. Messages are the actual strings emitted by `heatmapx` v0.4.0.

## Auth

| Message (contains) | Cause | Fix |
|---|---|---|
| `Not logged in. Run \`heatmapx login\`.` | No saved credentials | `heatmapx login` |
| `whoami --json` exits non-zero | Not logged in | `heatmapx login` |
| `invalid_api_key` (401) | API key revoked or invalid | `heatmapx logout && heatmapx login` |
| `usage_failed: 401` / `403` | API key revoked or invalid | `heatmapx logout && heatmapx login` |

## data / analyze

| Message (contains) | Cause | Fix |
|---|---|---|
| `server_ai_retired` (410) | An old CLI (< 0.4.0) is calling the retired server-AI endpoints | `npm i -g heatmapx@latest`, then use `heatmapx data` |
| `rate_limited` (429) | Too many requests | Wait a minute and retry |
| `invalid_url` (422) | URL isn't an absolute http(s) URL | Check `site`/`page` in `heatmap.config.ts` or the path argument |
| `invalid_period` (422) | Bad `--days` / `--from` / `--to` values | Use `--days <n>` or `--from`/`--to` as YYYY-MM-DD |
| `data_failed` (502) | Server failed to aggregate data | Retry; if persistent, contact the HeatMapX operator |
| `site_found: false` in output | Site not registered / tracker tag missing | Add the site in the dashboard (https://heatmapx.com/dashboard) and install the `<script>` tag |
| `Low data` warning / `lowData: true` | Under ~50 clicks / 30 sessions in the period | Treat suggestions as low-confidence; try a longer period (`--days 90`) |

## patch (retired)

`heatmapx patch` always prints retirement guidance and exits 1. There is no fix — the flow is now: `heatmapx data` → you (the AI agent) analyze → Edit the code → PR.

## Applying the change / opening the PR (Claude's `git`/`gh` step)

| Symptom | Cause | Fix |
|---|---|---|
| working tree dirty before editing | Uncommitted changes | Ask the user; `git stash` or commit first |
| `gh: command not found` | GitHub CLI not installed | https://cli.github.com |
| `gh auth status` not logged in | `gh` not authenticated | `gh auth login` |
| origin is not GitHub | PR target not on GitHub | Push the branch and open the PR manually |
