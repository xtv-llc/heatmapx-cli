import type { Command } from 'commander'
import { defaultCredentialsPath, loadCredentials } from '../lib/credentials'
import { getUsage } from '../lib/api-client'

export interface WhoamiOptions {
  credentialsPath?: string
}

export interface WhoamiResult {
  loggedIn: boolean
  email?: string
  apiKeyTruncated?: string
  plan?: string
  usage?: { used: number; quota: number | null }
  usageUnavailable?: boolean
}

export async function runWhoami(opts: WhoamiOptions = {}): Promise<WhoamiResult> {
  const path = opts.credentialsPath ?? defaultCredentialsPath()
  const creds = loadCredentials(path)
  if (!creds) return { loggedIn: false }
  const apiKeyTruncated = creds.api_key.slice(0, 18) + '...'
  try {
    const u = await getUsage(creds.api_key)
    return {
      loggedIn: true, email: creds.email, apiKeyTruncated,
      plan: u.plan, usage: u.usage,
    }
  } catch {
    return {
      loggedIn: true, email: creds.email, apiKeyTruncated, usageUnavailable: true,
    }
  }
}

export function whoamiCommand(program: Command): void {
  program
    .command('whoami')
    .description('Show login status')
    .action(async () => {
      const r = await runWhoami()
      if (!r.loggedIn) {
        console.error('Not logged in. Run `heatmapx login`.')
        process.exit(1)
      }
      console.log(`Logged in as: ${r.email}`)
      console.log(`API key: ${r.apiKeyTruncated}`)
      if (r.usageUnavailable) {
        console.log('Plan/usage: (unavailable)')
      } else if (r.plan && r.usage) {
        const quotaLabel = r.usage.quota === null ? 'unlimited' : `${r.usage.quota} / month`
        console.log(`Plan: ${r.plan} (${quotaLabel})`)
        console.log(`This month: ${r.usage.used}${r.usage.quota === null ? '' : `/${r.usage.quota}`} used`)
      }
    })
}
