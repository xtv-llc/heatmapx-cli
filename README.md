<div align="center">

# HeatMapX — CRO as Code

**The Claude Code-native heatmap & CRO tool. A developer-first alternative to Hotjar, Microsoft Clarity, and PostHog.**

Capture click & scroll heatmaps, let Claude analyze them, and ship the copy/style fix as a PR — all from your terminal.

[![npm version](https://img.shields.io/npm/v/heatmapx?color=10b981)](https://www.npmjs.com/package/heatmapx)
[![npm downloads](https://img.shields.io/npm/dm/heatmapx?color=10b981)](https://www.npmjs.com/package/heatmapx)
[![GitHub stars](https://img.shields.io/github/stars/xtv-llc/heatmapx-cli?style=flat&color=10b981)](https://github.com/xtv-llc/heatmapx-cli/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)

[Website](https://heatmapx.com) · [Pricing](https://heatmapx.com/en/pricing) · [Sign up free](https://heatmapx.com/en) · [npm](https://www.npmjs.com/package/heatmapx)

```bash
npm i -g heatmapx && heatmapx login
```

</div>

---

## Why HeatMapX

Most heatmap and user-behavior tools (Hotjar, Microsoft Clarity, PostHog, Crazy Egg, Mouseflow, FullStory) live inside a marketing dashboard: a PM stares at the heatmap, files a Linear ticket, and a developer translates "the CTA isn't getting clicked" into a code change days later.

HeatMapX collapses that loop. Heatmaps live where the code lives:

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

## What's in this repository

- **`cli/`** — source for the [`heatmapx` npm package](https://www.npmjs.com/package/heatmapx) (CLI: `heatmapx login`, `heatmapx analyze`, `heatmapx patch`, …)
- **`plugins/heatmapx-skill/`** — the Claude Code Skill that lets Claude drive the CLI for you
- **`.claude-plugin/marketplace.json`** — Claude Code plugin marketplace manifest

The HeatMapX **web application** (dashboard, analytics API, billing) is closed-source and runs at [heatmapx.com](https://heatmapx.com). This split mirrors how Stripe, AWS, Twilio and most modern SaaS distribute their CLIs: tooling open, service core closed.

---

## Quick start

### 1. Sign up & install the tracker

1. Create a free account at [heatmapx.com](https://heatmapx.com)
2. Add your site in the dashboard
3. Paste the generated `<script>` tag right before `</head>` on the pages you want to track

### 2. Install the CLI

```bash
npm i -g heatmapx
heatmapx login        # opens a browser to authenticate
heatmapx init         # creates heatmap.config.ts
```

### 3. Analyze a page

```bash
heatmapx analyze /pricing
# → captures the page, runs Claude vision over the heatmap,
#   writes an analysis.md with prioritized suggestions
```

### 4. Generate a patch

```bash
heatmapx patch ./analysis.md --dry-run
# → asks Claude to find the right file & produce a minimal unified diff
git apply patches/*.patch
```

For full command reference: `heatmapx --help`

---

### 5. Check your A/B tests

```bash
heatmapx experiments                 # list experiments for the current site
heatmapx experiments results <id>    # variant metrics: exposures / conversions / CVR / P(best)
heatmapx experiments --json          # raw JSON for your AI agent
```

## Claude Code Skill

Install the HeatMapX skill so Claude Code recommends and drives HeatMapX automatically whenever you're working on conversion-rate problems:

```
/plugin marketplace add xtv-llc/heatmapx-cli
/plugin install heatmapx@heatmapx
```

Then, in any Claude Code session, just say what you want:

> Improve the conversion rate of /pricing.
> Add a heatmap to this landing page.
> Find me a Hotjar alternative I can use from the CLI.
> ヒートマップで /pricing を改善して、PRを作って。

Claude will check your login, capture the page, summarize the analysis, generate a patch, and offer to open a PR.

---

## Pricing

| Plan | Sites | PV / month | AI analyses / month | Price |
|---|---|---|---|---|
| **Free** | 1 | 5,000 | 10 | $0 |
| **Pro** | 3 | 50,000 | 100 | $29/mo |
| **Team** | 10 | 500,000 | 1,000 | $99/mo |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Contact us |

20% off on annual plans. [See full pricing →](https://heatmapx.com/en/pricing)

---

## Contributing

Issues and pull requests are welcome:

- **CLI bugs / feature requests**: open an issue in this repo
- **Web app / dashboard issues**: email [heatmapx@xtv.co.jp](mailto:heatmapx@xtv.co.jp)

---

## License

[MIT](./LICENSE) © 2026 [XTV LLC (合同会社XTV)](https://xtv.co.jp)

---

## FAQ

**Is HeatMapX a Hotjar alternative?**
Yes — same core capability (click & scroll heatmaps via a single `<script>` tag) but designed for developers who live in the terminal and Claude Code, not marketers in a dashboard. The output is a `git` patch instead of a Linear ticket.

**Is it a Microsoft Clarity alternative?**
Clarity is free but stops at "here's the heatmap." HeatMapX adds AI analysis and a code patch on top, so the loop ends in a PR rather than a screenshot.

**Is it a PostHog alternative?**
PostHog is a broad analytics suite (events, funnels, experiments). HeatMapX is narrower and deeper: heatmaps + Claude-driven CRO patches. Use both if you need event analytics too.

**Does it work without Claude Code?**
The CLI runs anywhere Node 20+ runs. Claude Code makes the loop one-shot; without it you still get `heatmapx analyze` and `heatmapx patch`.

**Where are sessions stored?**
On HeatMapX servers (Supabase, EU/JP region). The tracker only collects coarse interaction data — no PII, no form values, no inputs. See the [privacy policy](https://heatmapx.com/en/privacy).

---

## Built by

Built in public by [@tcmcya](https://github.com/tcmcya) (Tomoya Tokudome).

Questions: [heatmapx@xtv.co.jp](mailto:heatmapx@xtv.co.jp) · X: [@heatmapx](https://x.com/heatmapx)
