import type { Command } from 'commander'
import { join } from 'node:path'
import { loadConfig } from '../lib/config-loader'
import { defaultCredentialsPath, loadCredentials } from '../lib/credentials'
import {
  fetchExperiments,
  fetchExperimentResults,
  type ExperimentsResponse,
  type ExperimentResultsResponse,
} from '../lib/api-client'

export interface ExperimentsOptions {
  cwd?: string
  credentialsPath?: string
  site?: string
  json?: boolean
  onMessage?: (msg: string) => void
}

const STATUS_ICON: Record<string, string> = {
  running: '●',
  draft: '◌',
  paused: '⏸',
  stopped: '■',
}

export function formatExperimentsOutput(data: ExperimentsResponse): string {
  const lines: string[] = []
  if (!data.site_found) {
    lines.push('! Site not found. Check the URL, or register the site in the dashboard.')
    return lines.join('\n')
  }
  if (data.experiments.length === 0) {
    lines.push('No experiments yet. Create one at https://heatmapx.com/dashboard/experiments')
    return lines.join('\n')
  }
  lines.push(`== A/B experiments (${data.experiments.length}) ==`)
  for (const e of data.experiments) {
    const icon = STATUS_ICON[e.status] ?? '·'
    lines.push(`${icon} [${e.status}] ${e.name} — ${e.target_url_pattern} (goal: ${e.goal_type})`)
    lines.push(`    id: ${e.id}${e.site_url ? `  site: ${e.site_url}` : ''}`)
  }
  lines.push('')
  lines.push('→ heatmapx experiments results <id> for variant metrics.')
  return lines.join('\n')
}

export function formatResultsOutput(resp: ExperimentResultsResponse): string {
  const lines: string[] = []
  const e = resp.experiment
  lines.push(`== ${e.name} [${e.status}] — ${e.target_url_pattern} (goal: ${e.goal_type}) ==`)
  for (const r of resp.results.rows) {
    const rate = (r.rate * 100).toFixed(2)
    const prob = Math.round(r.probBest * 100)
    const upliftStr =
      r.isControl || r.uplift == null ? '' : `  uplift ${r.uplift >= 0 ? '+' : ''}${(r.uplift * 100).toFixed(1)}%`
    lines.push(
      ` ${r.isControl ? '(control) ' : ''}${r.name}: ${r.conversions}/${r.exposures} cv (${rate}%)${upliftStr}  P(best) ${prob}%`,
    )
  }
  if (resp.results.winnerSuggestion) {
    const winner = resp.results.rows.find((r) => r.variantId === resp.results.winnerSuggestion)
    lines.push(` ★ Suggested winner: ${winner?.name ?? resp.results.winnerSuggestion}`)
  } else {
    lines.push(' (no statistically confident winner yet)')
  }
  lines.push('')
  lines.push('→ Pass this data to your AI agent (Claude Code / Codex) for interpretation.')
  return lines.join('\n')
}

function requireApiKey(credentialsPath?: string): string {
  const creds = loadCredentials(credentialsPath ?? defaultCredentialsPath())
  if (!creds) throw new Error('Not logged in. Run `heatmapx login`.')
  return creds.api_key
}

// --site 未指定時は heatmap.config.ts の site を使う（無ければ全サイト分）
async function resolveSiteFilter(opts: ExperimentsOptions): Promise<string | undefined> {
  if (opts.site) return opts.site
  try {
    const cfg = await loadConfig(join(opts.cwd ?? process.cwd(), 'heatmap.config.ts'))
    return cfg.site
  } catch {
    return undefined
  }
}

export async function runExperimentsList(
  opts: ExperimentsOptions = {},
): Promise<{ data: ExperimentsResponse; text: string }> {
  const apiKey = requireApiKey(opts.credentialsPath)
  const site = await resolveSiteFilter(opts)
  const data = await fetchExperiments(apiKey, site)
  const text = opts.json ? JSON.stringify(data, null, 2) : formatExperimentsOutput(data)
  return { data, text }
}

export async function runExperimentResults(
  experimentId: string,
  opts: ExperimentsOptions = {},
): Promise<{ data: ExperimentResultsResponse; text: string }> {
  const apiKey = requireApiKey(opts.credentialsPath)
  const data = await fetchExperimentResults(apiKey, experimentId)
  const text = opts.json ? JSON.stringify(data, null, 2) : formatResultsOutput(data)
  return { data, text }
}

export function experimentsCommand(program: Command): void {
  const cmd = program
    .command('experiments')
    .description('List A/B experiments (use `experiments results <id>` for metrics)')
    .option('--site <url>', 'filter by site URL (defaults to heatmap.config.ts site)')
    .option('--json', 'output raw JSON')
    .action(async (flags: { site?: string; json?: boolean }) => {
      try {
        const { text } = await runExperimentsList({ site: flags.site, json: flags.json })
        console.log(text)
      } catch (e) {
        console.error(`[heatmapx] ${(e as Error).message}`)
        process.exitCode = 1
      }
    })

  cmd
    .command('results <experimentId>')
    .description('Show variant metrics (exposures / conversions / CVR / P(best))')
    .option('--json', 'output raw JSON')
    .action(async (experimentId: string, flags: { json?: boolean }) => {
      try {
        const { text } = await runExperimentResults(experimentId, { json: flags.json })
        console.log(text)
      } catch (e) {
        console.error(`[heatmapx] ${(e as Error).message}`)
        process.exitCode = 1
      }
    })
}
