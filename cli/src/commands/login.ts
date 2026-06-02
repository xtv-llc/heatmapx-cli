import type { Command } from 'commander'
import { authInit, authPoll } from '../lib/api-client'
import { defaultCredentialsPath, saveCredentials } from '../lib/credentials'

export interface LoginOptions {
  credentialsPath?: string
  pollIntervalMs?: number  // override for tests
  maxPolls?: number          // override for tests
  onMessage?: (msg: string) => void
}

export async function runLogin(opts: LoginOptions = {}): Promise<void> {
  const log = opts.onMessage ?? ((m) => console.log(m))
  const path = opts.credentialsPath ?? defaultCredentialsPath()

  const init = await authInit()
  log(`Visit: ${init.verify_url}`)
  log(`Code:  ${init.user_code}`)
  log('Waiting for authentication...')

  const intervalMs = opts.pollIntervalMs ?? init.interval * 1000
  const maxPolls = opts.maxPolls ?? Math.ceil(init.expires_in / init.interval)
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))
    const result = await authPoll(init.device_code)
    if (result.status === 'approved') {
      saveCredentials(path, { api_key: result.api_key, email: result.email })
      log(`Logged in as ${result.email}`)
      return
    }
    if (result.status === 'expired' || result.status === 'not_found') {
      throw new Error(`Login failed: ${result.status}`)
    }
    // status === 'pending' → keep polling
  }
  throw new Error('Login timed out')
}

export function loginCommand(program: Command): void {
  program
    .command('login')
    .description('Authenticate the CLI with heatmapx.com (OAuth Device Flow)')
    .action(async () => {
      try {
        await runLogin()
      } catch (e) {
        console.error(`[heatmapx] error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
