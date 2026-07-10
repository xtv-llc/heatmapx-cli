import type { Command } from 'commander'
import { defaultCredentialsPath, loadCredentials } from '../lib/credentials'
import {
  createSite,
  listSites,
  type CreateSiteResponse,
  type SiteListItem,
} from '../lib/api-client'

function stripProtocol(u: string): string {
  return u.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export interface SitesAddOptions {
  credentialsPath?: string
  url?: string
  name?: string
  json?: boolean
}

export function formatSiteCreated(data: CreateSiteResponse): string {
  return [
    `Site registered: ${data.site.name} (${data.site.url})`,
    ` id: ${data.site.id}`,
    '',
    'Paste this tag right before </head> on the pages you want to track:',
    data.tracker_snippet,
    '',
    '→ Once installed, the dashboard flips from "Waiting for data" to "Receiving data".',
  ].join('\n')
}

export async function runSitesAdd(
  opts: SitesAddOptions,
): Promise<{ data: CreateSiteResponse; text: string }> {
  const creds = loadCredentials(opts.credentialsPath ?? defaultCredentialsPath())
  if (!creds) throw new Error('Not logged in. Run `heatmapx login`.')
  if (!opts.url) throw new Error('url is required')

  const data = await createSite(creds.api_key, { url: opts.url, name: opts.name })
  const text = opts.json ? JSON.stringify(data, null, 2) : formatSiteCreated(data)
  return { data, text }
}

export function formatSitesList(sites: SiteListItem[]): string {
  if (sites.length === 0) {
    return 'No sites yet. Register one with `heatmapx sites add <url>`.'
  }
  const lines = sites.map((s) => {
    const status = s.first_event_at ? 'receiving' : 'waiting for data'
    return [`• ${s.name}  (${stripProtocol(s.url)})`, `  id: ${s.id}   status: ${status}`].join('\n')
  })
  return [`Your sites (${sites.length}):`, ...lines].join('\n')
}

export interface SitesListOptions {
  credentialsPath?: string
  json?: boolean
}

export async function runSitesList(
  opts: SitesListOptions = {},
): Promise<{ sites: SiteListItem[]; text: string }> {
  const creds = loadCredentials(opts.credentialsPath ?? defaultCredentialsPath())
  if (!creds) throw new Error('Not logged in. Run `heatmapx login`.')

  const { sites } = await listSites(creds.api_key)
  const text = opts.json ? JSON.stringify(sites, null, 2) : formatSitesList(sites)
  return { sites, text }
}

export function sitesCommand(program: Command): void {
  const cmd = program.command('sites').description('List and manage tracked sites')

  // Bare `heatmapx sites` lists sites (friendly default instead of showing help).
  cmd
    .option('--json', 'output raw JSON')
    .action(async (flags: { json?: boolean }) => {
      try {
        const { text } = await runSitesList({ json: flags.json })
        console.log(text)
      } catch (e) {
        console.error(`[heatmapx] ${(e as Error).message}`)
        process.exitCode = 1
      }
    })

  cmd
    .command('list')
    .description('List your registered sites')
    .option('--json', 'output raw JSON')
    .action(async (flags: { json?: boolean }) => {
      try {
        const { text } = await runSitesList({ json: flags.json })
        console.log(text)
      } catch (e) {
        console.error(`[heatmapx] ${(e as Error).message}`)
        process.exitCode = 1
      }
    })

  cmd
    .command('add <url>')
    .description('Register a new site and get its install tag')
    .option('--name <name>', 'display name (defaults to hostname)')
    .option('--json', 'output raw JSON')
    .action(async (url: string, flags: { name?: string; json?: boolean }) => {
      try {
        const { text } = await runSitesAdd({ url, name: flags.name, json: flags.json })
        console.log(text)
      } catch (e) {
        console.error(`[heatmapx] ${(e as Error).message}`)
        process.exitCode = 1
      }
    })
}
