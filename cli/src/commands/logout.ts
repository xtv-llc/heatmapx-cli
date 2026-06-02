import type { Command } from 'commander'
import { defaultCredentialsPath, deleteCredentials, loadCredentials } from '../lib/credentials'

export interface LogoutOptions {
  credentialsPath?: string
  onMessage?: (msg: string) => void
}

export async function runLogout(opts: LogoutOptions = {}): Promise<void> {
  const log = opts.onMessage ?? ((m) => console.log(m))
  const path = opts.credentialsPath ?? defaultCredentialsPath()
  const creds = loadCredentials(path)
  if (!creds) {
    log('Not logged in.')
    return
  }
  // Server revoke endpoint not yet implemented — Phase 2 logout is local-only.
  // Phase 3+ will add a revoke call.
  deleteCredentials(path)
  log('Removed local credentials.')
}

export function logoutCommand(program: Command): void {
  program
    .command('logout')
    .description('Remove local credentials')
    .action(async () => {
      await runLogout()
    })
}
