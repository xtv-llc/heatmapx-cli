# heatmapx

CLI for [HeatMapX](https://heatmapx.com) — Claude Code-native heatmap analysis.

> **Phase 3b (alpha)** — `analyze` + `patch` commands shipped. analyze runs
> Claude vision on a captured page; patch turns analyze output into a
> git-applyable unified diff.
> See the [Phase 3b design spec](../docs/superpowers/specs/2026-05-08-heatmapx-cli-phase3b-design.md).

## What's new in Phase 3b

- `heatmapx patch <analysis.md>` — picks a suggestion, asks Claude to find
  the target file + a minimal text edit, writes a unified diff to `./patches/`
- `heatmap.config.ts` gains a `targets` field (glob array) used to scope which
  files the patcher considers
- Patch quota is shared with `analyze` (weighted: find=0.2, diff=0.3 per call)

Earlier phases (`init` / `config` / `login` / `logout` / `whoami` / `analyze`)
keep working as before.

## Quick start

```bash
# from the heatmapx repo root
cd cli
npm install
npm run build
npm link

# in any project directory:
heatmapx init --yes
heatmapx login                  # OAuth Device Flow
heatmapx analyze /pricing       # capture + analyze + print Markdown
heatmapx whoami                 # see plan + usage
```

### Pointing at a non-production heatmapx.com

```bash
HEATMAPX_API_URL=http://localhost:3000 heatmapx login
HEATMAPX_API_URL=http://localhost:3000 heatmapx analyze /pricing
```

## Commands

### `heatmapx init [--yes] [--force]`
Scaffolds `heatmap.config.ts` interactively (or with defaults via `--yes`).

### `heatmapx config get <key>`
Reads a value via dot-path (`variants.0.name`).

### `heatmapx config set <key> <value>`
Updates a value. Existing comments and formatting are preserved (ts-morph AST).

### `heatmapx login`
Authenticates via OAuth Device Flow + Supabase magic link. API key stored at
`~/.heatmapx/credentials.json` (mode 0600).

### `heatmapx logout`
Removes local credentials.

### `heatmapx whoami`
Prints email + truncated key + plan + monthly usage.

```
$ heatmapx whoami
Logged in as: user@example.com
API key: hmx_live_abcdefgh...
Plan: free (10 / month)
This month: 3/10 used
```

### `heatmapx analyze [path]`
Captures the page (or `<path>` resolved against `heatmap.config.ts.site`) and
runs a Claude Sonnet 4.6 vision analysis. When the site is registered and has
enough measured events, the report is grounded in **real heatmap data**
(click hotspots + scroll reach); otherwise it falls back to screenshot-only
prediction. Prints a Markdown report with observations, prioritized
improvements, and next-test ideas.

```bash
heatmapx analyze /pricing                            # default (last 30 days, en)
heatmapx analyze /pricing --days 7                   # last 7 days
heatmapx analyze /pricing --from 2026-05-01 --to 2026-05-31
heatmapx analyze /pricing --lang ja                  # Japanese report
heatmapx analyze https://other.com/lp                # absolute URL override
heatmapx analyze /pricing --json > report.json       # JSON includes summary
heatmapx analyze /pricing -o report.md
```

If measured data is sparse (under ~50 clicks / 30 sessions), the report is
marked prediction-based. If you exceed your monthly quota, `analyze` exits
with `quota_exceeded` and a link to the pricing page.

### `heatmapx patch <analysis-markdown>`

Reads the markdown produced by `analyze`, lets you pick a suggestion, asks
Claude to locate the target file + propose a minimal text edit, and writes a
git-applyable unified diff to `./patches/`.

**Prerequisite:** add a `targets` glob array to `heatmap.config.ts`:

```ts
import { defineHypothesis } from 'heatmapx'

export default defineHypothesis({
  site: 'https://example.com',
  page: '/',
  goal: 'Lift CTA reach rate',
  variants: [{ name: 'control' }],
  targets: ['src/components/marketing/**/*.tsx'],
})
```

```bash
# interactive (asks which suggestion + confirms target)
heatmapx patch ./analysis.md

# fully non-interactive
heatmapx patch ./analysis.md --suggestion 1 --target src/Hero.tsx

# preview the diff without writing a file
heatmapx patch ./analysis.md --suggestion 1 --target src/Hero.tsx --dry-run
```

Apply the generated patch:

```bash
git apply patches/2026-05-08-hero-headline.patch
```

Notes:
- Only **text-only** edits — JSX structure / className / attributes are kept
  untouched by the prompt contract on the server side.
- The patch flow consumes quota at lower weight than `analyze` (find=0.2,
  diff=0.3 per call).
- If Claude's confidence on the target file is below 0.4, the CLI asks you to
  type the path manually.

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | `init` / `config` — local only | ✅ shipped |
| 2 | `login` / `logout` / `whoami` + AST config-loader | ✅ shipped |
| 3a | `analyze` — server-driven Claude analysis + plan limits | ✅ shipped |
| 3b (this) | `patch` — analyze → unified diff via Claude | ✅ shipped |
| 3c | GitHub PR auto-creation from generated patches | next |
| 4 | Claude Code Skill (`plugins/heatmapx-skill/`) | after Phase 3 |

## Tests

```bash
cd cli
npm test
```

Phase 3b adds tests for `analysis-loader`, `target-resolver`, `diff-writer`,
`patch` command, and the new `patchFindFile` / `patchGenerateDiff` API client
calls. Server-side adds `find-target-file` / `generate-text-diff` Claude
wrappers + `/api/cli/patch` route + `recordPatchRun` usage helper.

## License

MIT — see the heatmapx repo LICENSE.
