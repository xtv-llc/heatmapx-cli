import type { Command } from 'commander'
import { join } from 'node:path'
import { loadConfig } from '../lib/config-loader'
import { defaultCredentialsPath, loadCredentials } from '../lib/credentials'
import {
  fetchData,
  type AnalyzePeriod,
  type DataResponse,
  type HeatmapSummaryDTO,
  type TagFilter,
} from '../lib/api-client'

export interface DataOptions {
  cwd?: string
  credentialsPath?: string
  pathOrUrl?: string
  json?: boolean
  output?: string
  period?: AnalyzePeriod
  screenshot?: boolean
  /** Custom tag filter (key → value), e.g. { ab_variant: 'B' } */
  tags?: TagFilter
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

// Parse repeated `--tag key=value` (or `key:value`) flags into a tag filter.
// Validation of key/value format happens on the server (same rules as the MCP
// tool); here we only reject flags with no separator or an empty key, and
// contradictory values for the same key.
export function parseTagFlags(flags: string[] | undefined): TagFilter | undefined {
  if (!flags || flags.length === 0) return undefined
  const tags: TagFilter = {}
  for (const raw of flags) {
    const sep = raw.search(/[=:]/)
    if (sep < 1) {
      throw new Error(`invalid --tag "${raw}" (expected key=value, e.g. --tag ab_variant=B)`)
    }
    const key = raw.slice(0, sep).trim().toLowerCase()
    const value = raw.slice(sep + 1).trim()
    if (!key || !value) {
      throw new Error(`invalid --tag "${raw}" (expected key=value, e.g. --tag ab_variant=B)`)
    }
    if (key in tags && tags[key] !== value) {
      throw new Error(`conflicting --tag values for "${key}": "${tags[key]}" and "${value}"`)
    }
    tags[key] = value
  }
  return tags
}

export function formatTagFilter(tags: TagFilter): string {
  return Object.entries(tags)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
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
  if (data.tags && Object.keys(data.tags).length > 0) {
    lines.push(`Filtered by tags: ${formatTagFilter(data.tags)}`)
  }
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

  const tagNote = opts.tags ? ` (tags: ${formatTagFilter(opts.tags)})` : ''
  log(`[heatmapx] Fetching heatmap data for ${url}${tagNote}...`)

  const data = await fetchData(creds.api_key, {
    url,
    period: opts.period,
    include_screenshot: opts.screenshot ? true : undefined,
    ...(opts.tags ? { tags: opts.tags } : {}),
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
  /** repeated --tag key=value */
  tag?: string[]
}

export async function runDataCli(path: string | undefined, opts: DataCliFlags): Promise<void> {
  const result = await runData({
    pathOrUrl: path,
    json: opts.json,
    output: opts.output,
    period: buildPeriod(opts),
    screenshot: opts.screenshot,
    tags: parseTagFlags(opts.tag),
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
  } else if (msg.startsWith('invalid_tags')) {
    console.error(
      '[heatmapx] Invalid --tag filter. Keys: a-z 0-9 _ - (max 32 chars); values: up to 64 chars; max 10 tags.',
    )
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
    .option(
      '--tag <key=value>',
      'Filter by a custom tag set via hmx(\'set\', key, value) (repeatable, e.g. --tag ab_variant=B)',
      (value: string, previous: string[] = []) => [...previous, value],
    )
    .action(async (path: string | undefined, opts: DataCliFlags) => {
      try {
        await runDataCli(path, opts)
      } catch (e) {
        handleDataError(e)
      }
    })
}
