<div align="center">

# heatmapx

**The Claude Code-native heatmap & CRO CLI. A developer-first alternative to Hotjar, Microsoft Clarity, and PostHog.**

Capture click & scroll heatmaps, pull the aggregated data into your terminal, and let YOUR AI agent (Claude Code / Codex) analyze it and ship the fix as a PR.

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
| Output | A PR opened by your AI agent | A screenshot for your Linear ticket |
| Analysis | Your AI agent (Claude Code / Codex) over real heatmap data | Manual interpretation |
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

### 3. Fetch the heatmap data

```bash
heatmapx data /pricing
# → returns aggregated click zones, scroll reach, and session counts
#   for the page — ready to hand to your AI agent
```

### 4. Let your AI agent do the CRO

Since v0.4.0, analysis and code edits run in **your** AI agent (BYO-AI) — no
server-side AI. In Claude Code / Codex:

```
heatmapx data /pricing --json -o /tmp/heatmapx-data.json
# → ask your agent to read the JSON, suggest CRO improvements,
#   edit the code, and open a PR
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

Claude will check your login, fetch the heatmap data, analyze it, propose CRO suggestions, edit the code, and offer to open a PR.

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

### `heatmapx data [path]`
Fetches aggregated heatmap data (click zones, scroll reach, session counts) for
the page (or `<path>` resolved against `heatmap.config.ts.site`). No AI runs on
the server — pass the output to your own AI agent for analysis.

```bash
heatmapx data /pricing                            # default (last 30 days)
heatmapx data /pricing --days 7                   # last 7 days
heatmapx data /pricing --from 2026-05-01 --to 2026-05-31
heatmapx data https://other.com/lp                # absolute URL override
heatmapx data /pricing --json > data.json         # raw JSON for your agent
heatmapx data /pricing -o data.txt                # write output to a file
heatmapx data /pricing --screenshot               # include a screenshot URL
```

If the site isn't registered (or the tracker tag isn't installed), the output
tells you to add it in the dashboard. If measured data is sparse (under ~50
clicks / 30 sessions), the output is marked low-data.

### `heatmapx analyze [path]`

Alias of `data` (same options). Since v0.4.0, analysis runs in **your** AI
agent — the server no longer runs Claude. A migration notice is printed to
stderr.

### `heatmapx patch` (retired)

Retired in v0.4.0. Your AI agent now edits code directly: run `heatmapx data`,
let Claude Code / Codex analyze it, and ask it to apply the change and open a
PR (the official HeatMapX skill automates this).

---

## Pointing at a local dev server

```bash
HEATMAPX_API_URL=http://localhost:3000 heatmapx login
HEATMAPX_API_URL=http://localhost:3000 heatmapx data /pricing
```

---

## FAQ

**Is HeatMapX a Hotjar alternative?**
Yes — same core capability (click & scroll heatmaps via one `<script>` tag) but
designed for developers who live in the terminal and Claude Code, not marketers
in a dashboard. The output is a PR from your AI agent instead of a Linear ticket.

**Is it a Microsoft Clarity alternative?**
Clarity is free but stops at "here's the heatmap." HeatMapX hands the data
straight to your AI agent, so the loop ends in a PR rather than a screenshot.

**Is it a PostHog alternative?**
PostHog is a broad analytics suite (events, funnels, experiments). HeatMapX is
narrower and deeper: heatmaps + AI-agent-driven CRO fixes. Use both if you need
event analytics too.

**Does it work without Claude Code?**
Yes — the CLI runs anywhere Node 20+ runs, and `heatmapx data` output works
with any AI agent (Claude Code, Codex, or your own). Claude Code + the official
skill makes the loop one-shot.

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
