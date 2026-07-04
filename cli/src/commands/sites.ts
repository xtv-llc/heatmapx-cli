import type { Command } from 'commander'
import { defaultCredentialsPath, loadCredentials } from '../lib/credentials'
import { createSite, type CreateSiteResponse } from '../lib/api-client'

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

export function sitesCommand(program: Command): void {
  const cmd = program.command('sites').description('Manage tracked sites')

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
