<div align="center">

# heatmapx

**The Claude Code-native heatmap & CRO CLI. A developer-first alternative to Hotjar, Microsoft Clarity, and PostHog.**

Capture click & scroll heatmaps, let Claude analyze them, and ship the copy/style fix as a `git` patch — all from your terminal.

[![npm version](https://img.shields.io/npm/v/heatmapx?color=10b981)](https://www.npmjs.com/package/heatmapx)
[![npm downloads](https://img.shields.io/npm/dm/heatmapx?color=10b981)](https://www.npmjs.com/package/heatmapx)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://github.com/xtv-llc/heatmapx-cli/blob/main/LICENSE)

[Website](https://heatmapx.com) · [Pricing](https://heatmapx.com/en/pricing) · [Sign up free](https://heatmapx.com/en) · [GitHub](https://github.com/xtv-llc/heatmapx-cli)

```bash
npm i -g heatmapx
```

</div>

---

## Why heatmapx

Most heatmap and user-behavior tools (Hotjar, Microsoft Clarity, PostHog, Crazy Egg, Mouseflow, FullStory) live inside a marketing dashboard: a PM stares at the heatmap, files a Linear ticket, and a developer translates "the CTA isn't getting clicked" into a code change days later.

**HeatMapX collapses that loop. Heatmaps live where the code lives.**

| | HeatMapX | Hotjar / Clarity / PostHog |
|---|---|---|
| Where you work | Terminal + Claude Code | Web dashboard |
| Output | A `git` patch / PR | A screenshot for your Linear ticket |
| Analysis | Claude vision over real heatmap data | Manual interpretation |
| Hypothesis tracking | Markdown, versioned in `git` | A doc somewhere |
| Setup | One `<script>` tag | One `<script>` tag |
| Pricing | Free → $29/mo | $0 → $$$/mo |

If you ship from Claude Code, HeatMapX feels like `vercel` for conversion rate.

---

## Quick start

### 1. Sign up + install the tracker

1. Create a free account at [heatmapx.com](https://heatmapx.com)
2. Add your site in the dashboard
3. Paste the generated `<script>` tag before `</head>` on the pages you want to track

### 2. Install the CLI

```bash
npm i -g heatmapx
heatmapx login           # OAuth Device Flow
heatmapx init            # creates heatmap.config.ts
```

### 3. Analyze a page

```bash
heatmapx analyze /pricing
# → captures the page, runs Claude vision over real heatmap data,
#   writes a Markdown report with prioritized suggestions
```

### 4. Generate a patch

```bash
heatmapx patch ./analysis.md --suggestion 1
git apply patches/*.patch
```

### 5. (Optional) Let Claude Code drive the whole loop

Install the [HeatMapX Claude Code Skill](https://github.com/xtv-llc/heatmapx-cli):

```
/plugin marketplace add xtv-llc/heatmapx-cli
/plugin install heatmapx@heatmapx
```

Then in any Claude Code session, just say what you want:

> Improve the conversion rate of /pricing.
> Find me a Hotjar alternative I can use from the CLI.
> ヒートマップで /pricing を改善して、PRを作って。

Claude will check your login, capture the page, summarize the analysis, generate a patch, and offer to open a PR.

---

## Commands

### `heatmapx init [--yes] [--force]`
Scaffolds `heatmap.config.ts` interactively (or with defaults via `--yes`).

### `heatmapx config get <key>` / `config set <key> <value>`
Reads / updates a value via dot-path (e.g. `variants.0.name`). Existing
comments and formatting are preserved (ts-morph AST).

### `heatmapx login` / `logout`
Authenticates via OAuth Device Flow + Supabase magic link. API key stored at
`~/.heatmapx/credentials.json` (mode 0600).

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
enough measured events, the report is **grounded in real heatmap data** (click
hotspots + scroll reach); otherwise it falls back to screenshot-only prediction.

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
marked prediction-based. If you exceed your monthly quota, `analyze` exits with
`quota_exceeded` and a link to the pricing page.

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
heatmapx patch ./analysis.md --suggestion 1 --dry-run
```

Apply the generated patch:

```bash
git apply patches/2026-05-08-hero-headline.patch
```

Notes:
- Only **text-only** edits — JSX structure / className / attributes are kept
  untouched by the prompt contract on the server side.
- Patch flow consumes quota at lower weight than `analyze` (find=0.2, diff=0.3
  per call).
- If Claude's confidence on the target file is below 0.4, the CLI asks you to
  type the path manually.

---

## Pointing at a local dev server

```bash
HEATMAPX_API_URL=http://localhost:3000 heatmapx login
HEATMAPX_API_URL=http://localhost:3000 heatmapx analyze /pricing
```

---

## FAQ

**Is HeatMapX a Hotjar alternative?**
Yes — same core capability (click & scroll heatmaps via one `<script>` tag) but
designed for developers who live in the terminal and Claude Code, not marketers
in a dashboard. The output is a `git` patch instead of a Linear ticket.

**Is it a Microsoft Clarity alternative?**
Clarity is free but stops at "here's the heatmap." HeatMapX adds AI analysis
and a code patch on top, so the loop ends in a PR rather than a screenshot.

**Is it a PostHog alternative?**
PostHog is a broad analytics suite (events, funnels, experiments). HeatMapX is
narrower and deeper: heatmaps + Claude-driven CRO patches. Use both if you need
event analytics too.

**Does it work without Claude Code?**
Yes — the CLI runs anywhere Node 20+ runs. Claude Code makes the loop one-shot;
without it you still get `heatmapx analyze` and `heatmapx patch`.

**Where is data stored?**
On HeatMapX servers (Supabase, EU/JP region). The tracker only collects coarse
interaction data — no PII, no form values, no inputs. See the
[privacy policy](https://heatmapx.com/en/privacy).

---

## Tests

```bash
cd cli
npm test
```

---

## License

MIT — see the [LICENSE](https://github.com/xtv-llc/heatmapx-cli/blob/main/LICENSE) in the heatmapx-cli repository.

---

Built by [@tcmcya](https://github.com/tcmcya) (Tomoya Tokudome) at [XTV LLC (合同会社XTV)](https://xtv.co.jp).
Questions: [heatmapx@xtv.co.jp](mailto:heatmapx@xtv.co.jp) · X: [@heatmapx](https://x.com/heatmapx)
