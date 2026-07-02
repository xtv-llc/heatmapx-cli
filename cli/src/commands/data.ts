import type { Command } from 'commander'
import { join } from 'node:path'
import { loadConfig } from '../lib/config-loader'
import { defaultCredentialsPath, loadCredentials } from '../lib/credentials'
import {
  fetchData,
  type AnalyzePeriod,
  type DataResponse,
  type HeatmapSummaryDTO,
} from '../lib/api-client'

export interface DataOptions {
  cwd?: string
  credentialsPath?: string
  pathOrUrl?: string
  json?: boolean
  output?: string
  period?: AnalyzePeriod
  screenshot?: boolean
  onMessage?: (msg: string) => void
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

export function resolveUrl(site: string, page: string, override?: string): string {
  if (!override) {
    const path = page.startsWith('/') ? page : `/${page}`
    return `${site.replace(/\/$/, '')}${path}`
  }
  if (/^https?:\/\//.test(override)) return override
  const path = override.startsWith('/') ? override : `/${override}`
  return `${site.replace(/\/$/, '')}${path}`
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

export function formatDataOutput(data: DataResponse): string {
  const lines: string[] = []
  lines.push(`HeatMapX data for ${data.url} (${data.period.from} → ${data.period.to})`)
  if (!data.site_found) {
    lines.push('')
    lines.push('! Site not found. Register this site in the HeatMapX dashboard')
    lines.push('  (https://heatmapx.com/dashboard) and make sure the tracker tag')
    lines.push('  is installed on the page.')
  } else if (data.summary) {
    lines.push('')
    lines.push(...formatSummaryLines(data.summary))
  }
  if (data.screenshot_url) {
    lines.push('')
    lines.push(`Screenshot: ${data.screenshot_url}`)
  }
  lines.push('')
  lines.push('→ Pass this data to your AI agent (Claude Code / Codex) for CRO analysis.')
  return lines.join('\n')
}

export interface DataRunResult {
  data: DataResponse
  /** stdout payload (JSON string when opts.json, human-readable text otherwise) */
  text: string
}

export async function runData(opts: DataOptions = {}): Promise<DataRunResult> {
  const log = opts.onMessage ?? ((m) => console.error(m))
  const credPath = opts.credentialsPath ?? defaultCredentialsPath()
  const creds = loadCredentials(credPath)
  if (!creds) throw new Error('Not logged in. Run `heatmapx login`.')

  const cwd = opts.cwd ?? process.cwd()
  const cfg = await loadConfig(join(cwd, 'heatmap.config.ts'))

  const url = resolveUrl(cfg.site, cfg.page, opts.pathOrUrl)

  log(`[heatmapx] Fetching heatmap data for ${url}...`)

  const data = await fetchData(creds.api_key, {
    url,
    period: opts.period,
    include_screenshot: opts.screenshot ? true : undefined,
  })

  const text = opts.json ? JSON.stringify(data, null, 2) : formatDataOutput(data)
  return { data, text }
}

export interface DataCliFlags {
  json?: boolean
  output?: string
  days?: string
  from?: string
  to?: string
  screenshot?: boolean
}

export async function runDataCli(path: string | undefined, opts: DataCliFlags): Promise<void> {
  const result = await runData({
    pathOrUrl: path,
    json: opts.json,
    output: opts.output,
    period: buildPeriod(opts),
    screenshot: opts.screenshot,
  })
  if (opts.output) {
    const fs = await import('node:fs')
    fs.writeFileSync(opts.output, result.text, 'utf8')
    console.error(`[heatmapx] Wrote ${opts.output}`)
  } else {
    console.log(result.text)
  }
}

export function handleDataError(e: unknown): never {
  const msg = (e as Error).message
  if (msg.startsWith('rate_limited')) {
    console.error('[heatmapx] Rate limited. Wait a minute and retry.')
  } else {
    console.error(`[heatmapx] error: ${msg}`)
  }
  process.exit(1)
}

export function dataCommand(program: Command): void {
  program
    .command('data [path]')
    .description('Fetch aggregated heatmap data for a page (analyze it with your AI agent)')
    .option('--json', 'Output raw JSON instead of a human-readable summary')
    .option('-o, --output <file>', 'Write the output to a file')
    .option('--days <n>', 'Heatmap period: last N days (default 30)')
    .option('--from <date>', 'Heatmap period start (YYYY-MM-DD)')
    .option('--to <date>', 'Heatmap period end (YYYY-MM-DD)')
    .option('--screenshot', 'Include a page screenshot URL in the response')
    .action(async (path: string | undefined, opts: DataCliFlags) => {
      try {
        await runDataCli(path, opts)
      } catch (e) {
        handleDataError(e)
      }
    })
}
