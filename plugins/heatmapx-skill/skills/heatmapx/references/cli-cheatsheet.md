# HeatMapX CLI Cheatsheet (v0.4.0)

All commands print human-readable text to stdout/stderr; pass `--json` (where available) for machine-readable stdout. Progress lines go to **stderr**, so in `--json` mode stdout stays pure JSON.

| Command | Flags | Description |
|---|---|---|
| `heatmapx init` | `--yes` `--force` | Generate `heatmap.config.ts` scaffold |
| `heatmapx config get <key>` | dot-path (`site`, `variants.0.name`) | Read a config value |
| `heatmapx config set <key> <value>` | dot-path | Write a config value (preserves comments) |
| `heatmapx login` | | Browser (device-code) auth; saves API key |
| `heatmapx logout` | | Delete saved credentials |
| `heatmapx whoami` | `--json` | Login status / plan / monthly usage |
| `heatmapx data [path]` | `--json` `-o, --output <file>` `--days <n>` `--from <date>` `--to <date>` `--screenshot` | Fetch aggregated heatmap data (no server AI — you analyze it) |
| `heatmapx analyze [path]` | same as `data` | **Alias of `data`** since v0.4.0 (prints a migration notice to stderr) |
| `heatmapx patch` | | **Retired** — prints guidance to stderr and exits 1. You edit the code yourself |
| `heatmapx --version` | | Print version (machine-parseable) |

## Notes for skill use

- **`data` is fast** (seconds — no AI on the server). Prefer `--json -o <file>` then Read the file.
- **`data --json` output:** `{ url, period: {from,to}, site_found, summary, screenshot_url? }` where `summary` = `{ period, clickZones: [{row, cols:[L,C,R]%}], totalClicks, scrollReach: {25,50,75,100}, totalSessions, lowData }` or `null`.
- **Period:** default is the last 30 days. `--days <n>` for last N days, or `--from`/`--to` (YYYY-MM-DD) for an exact range.
- **`--screenshot`** adds a `screenshot_url` to the response if you want visual context.
- **Analysis, code edits, and PRs are your job.** The CLI only fetches data. Edit with the Edit tool, then `git`/`gh` for the PR.
- **Config keys** (`heatmap.config.ts`): `site`, `page`, `goal`, `variants[]`.
- **Env:** `HEATMAPX_API_URL` overrides the API base (default `https://heatmapx.com`).
