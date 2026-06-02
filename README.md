<div align="center">

# HeatMapX CLI + Claude Code Skill

**Heatmaps you run from Claude Code.**

This repository hosts the `heatmapx` npm package and the Claude Code Skill that drives it.

[![npm version](https://img.shields.io/npm/v/heatmapx?color=10b981)](https://www.npmjs.com/package/heatmapx)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)

[Website](https://heatmapx.com) · [Pricing](https://heatmapx.com/en/pricing) · [Sign up free](https://heatmapx.com/en)

</div>

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

## Claude Code Skill

Install the HeatMapX skill so Claude can run the whole loop for you:

```
/plugin marketplace add xtv-llc/heatmapx-cli
/plugin install heatmapx@heatmapx
```

Then, in any Claude Code session, ask:

> Improve the conversion rate of /pricing.

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

## Built by

Built in public by [@tcmcya](https://github.com/tcmcya) (Tomoya Tokudome).

Questions: [heatmapx@xtv.co.jp](mailto:heatmapx@xtv.co.jp) · X: [@heatmapx](https://x.com/heatmapx)
