import type { Command } from 'commander'
import { join } from 'node:path'
import { loadConfig } from '../lib/config-loader'
import { defaultCredentialsPath, loadCredentials } from '../lib/credentials'
import { cliAnalyze, type AnalyzePeriod, type HeatmapSummaryDTO } from '../lib/api-client'

export interface AnalyzeOptions {
  cwd?: string
  credentialsPath?: string
  pathOrUrl?: string
  json?: boolean
  output?: string
  period?: AnalyzePeriod
  lang?: 'en' | 'ja'
  onMessage?: (msg: string) => void
}

export interface AnalyzeRunResult {
  markdown: string
  usage: { used: number; quota: number; plan: string }
  duration_ms: number
  cost_usd: number
  summary?: HeatmapSummaryDTO
}

export function buildPeriod(opts: {
  days?: string
  from?: string
  to?: string
}): AnalyzePeriod | undefined {
  if (opts.from && opts.to) return { from: opts.from, to: opts.to }
  if (opts.days) return { days: parseInt(opts.days, 10) }
  return undefined
}

export function formatSummaryLines(s: HeatmapSummaryDTO): string[] {
  const lines: string[] = []
  const clicks = s.totalClicks.toLocaleString('en-US')
  const sessions = s.totalSessions.toLocaleString('en-US')
  lines.push(`== Heatmap Summary (${clicks} clicks / ${sessions} sessions) ==`)
  const top = s.clickZones
    .flatMap((z) => z.cols.map((p, i) => ({ label: `${z.row}/${['L', 'C', 'R'][i]}`, p })))
    .sort((a, b) => b.p - a.p)
    .slice(0, 3)
    .map((x) => `${x.label} ${x.p}%`)
    .join(', ')
  lines.push(` Clicks: ${top}`)
  lines.push(
    ` Scroll: 25%->${s.scrollReach[25]}% 50%->${s.scrollReach[50]}% 75%->${s.scrollReach[75]}% 100%->${s.scrollReach[100]}%`,
  )
  if (s.lowData) lines.push(' ! Low data - suggestions are prediction-based')
  return lines
}

export async function runAnalyze(opts: AnalyzeOptions = {}): Promise<AnalyzeRunResult> {
  const log = opts.onMessage ?? ((m) => console.error(m))
  const credPath = opts.credentialsPath ?? defaultCredentialsPath()
  const creds = loadCredentials(credPath)
  if (!creds) throw new Error('Not logged in. Run `heatmapx login`.')

  const cwd = opts.cwd ?? process.cwd()
  const cfg = await loadConfig(join(cwd, 'heatmap.config.ts'))

  const url = resolveUrl(cfg.site, cfg.page, opts.pathOrUrl)

  log(`[heatmapx] Capturing ${url}...`)
  if (opts.period) log(`[heatmapx] Aggregating heatmap data...`)
  log(`[heatmapx] Running Claude analysis...`)

  const result = await cliAnalyze(creds.api_key, {
    url,
    hypothesis: { goal: cfg.goal, variants: cfg.variants },
    period: opts.period,
    lang: opts.lang,
  })

  if (result.summary) {
    for (const line of formatSummaryLines(result.summary)) log(line)
  }

  log(`[heatmapx] Done. (${(result.duration_ms / 1000).toFixed(1)}s, $${result.cost_usd.toFixed(2)})`)

  return {
    markdown: result.markdown,
    usage: result.usage,
    duration_ms: result.duration_ms,
    cost_usd: result.cost_usd,
    summary: result.summary,
  }
}

export function resolveUrl(site: string, page: string, override?: string): string {
  if (!override) {
    const path = page.startsWith('/') ? page : `/${page}`
    return `${site.replace(/\/$/, '')}${path}`
  }
  if (/^https?:\/\//.test(override)) return override
  const path = override.startsWith('/') ? override : `/${override}`
  return `${site.replace(/\/$/, '')}${path}`
}

export function analyzeCommand(program: Command): void {
  program
    .command('analyze [path]')
    .description('Capture a page and run Claude analysis')
    .option('--json', 'Output JSON instead of Markdown')
    .option('-o, --output <file>', 'Write Markdown to a file')
    .option('--days <n>', 'Heatmap period: last N days (default 30)')
    .option('--from <date>', 'Heatmap period start (YYYY-MM-DD)')
    .option('--to <date>', 'Heatmap period end (YYYY-MM-DD)')
    .option('--lang <lang>', 'Report language: en or ja (default: en)')
    .action(
      async (
        path: string | undefined,
        opts: {
          json?: boolean
          output?: string
          days?: string
          from?: string
          to?: string
          lang?: string
        },
      ) => {
        try {
          const lang: 'en' | 'ja' | undefined =
            opts.lang === 'ja' || opts.lang === 'en' ? opts.lang : undefined
          const result = await runAnalyze({
            pathOrUrl: path,
            json: opts.json,
            output: opts.output,
            period: buildPeriod(opts),
            lang,
          })
          if (opts.json) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            if (opts.output) {
              const fs = await import('node:fs')
              fs.writeFileSync(opts.output, result.markdown, 'utf8')
              console.error(`[heatmapx] Wrote ${opts.output}`)
            } else {
              console.log(result.markdown)
            }
            console.error(
              `\nThis month: ${result.usage.used}/${result.usage.quota} used (${result.usage.plan} plan)`,
            )
          }
        } catch (e) {
          const msg = (e as Error).message
          if (msg === 'quota_exceeded') {
            console.error('[heatmapx] Monthly quota exceeded. Upgrade at https://heatmapx.com/pricing')
          } else {
            console.error(`[heatmapx] error: ${msg}`)
          }
          process.exit(1)
        }
      },
    )
}
