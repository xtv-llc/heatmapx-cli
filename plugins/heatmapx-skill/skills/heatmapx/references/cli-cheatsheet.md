# HeatMapX CLI Cheatsheet (v0.4.0)

All commands print human-readable text to stdout/stderr; pass `--json` (where available) for machine-readable stdout. Progress/usage lines go to **stderr**, so in `--json` mode stdout stays pure JSON.

| Command | Flags | Description |
|---|---|---|
| `heatmapx init` | `--yes` `--force` | Generate `heatmap.config.ts` scaffold |
| `heatmapx config get <key>` | dot-path (`site`, `variants.0.name`) | Read a config value |
| `heatmapx config set <key> <value>` | dot-path | Write a config value (preserves comments) |
| `heatmapx login` | | Browser (device-code) auth; saves API key |
| `heatmapx logout` | | Delete saved credentials |
| `heatmapx whoami` | `--json` | Login status / plan / monthly usage |
| `heatmapx analyze [path]` | `--json` `-o, --output <file>` | Capture the page + run Claude CRO analysis |
| `heatmapx patch <analysis.md>` | `--suggestion <n>` `--target <path>` `--output-dir <dir>` `--dry-run` `--json` | Generate a unified-diff patch for one suggestion |
| `heatmapx --version` | | Print version (machine-parseable) |

## Notes for skill use

- **Non-interactive patch:** always pass `--suggestion <n>`. Without it, `patch` opens an interactive prompt and will hang in a non-TTY. Add `--target <path>` if you already know the file to skip the file-detection prompt too.
- **`analyze` is slow:** ~60–90s (screenshot capture + Claude). Use `-o <file>` then read the file, or `--json` to parse `{ markdown, usage, duration_ms, cost_usd }`.
- **`patch --json` output:** `{ suggestion: {index,title}, target_file, dry_run, patch_path, diff, usage }`. `patch_path` is `null` when `--dry-run`.
- **No PR flags.** This CLI version does **not** create PRs. Inside Claude Code, apply the patch with `git apply <patch_path>` and open the PR yourself with `gh pr create`.
- **Quota weights:** `analyze` = 1.0, patch file-find = 0.2, patch diff-gen = 0.3 per the user's monthly quota.
- **Config keys** (`heatmap.config.ts`): `site`, `page`, `goal`, `variants[]`, `targets[]` (globs like `["src/**/*.tsx"]` — required for `patch`).
- **Env:** `HEATMAPX_API_URL` overrides the API base (default `https://heatmapx.com`).
