import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLogout } from '../commands/logout'
import { saveCredentials } from '../lib/credentials'

let workdir: string
beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'heatmapx-logout-'))
})

describe('runLogout', () => {
  it('deletes credentials when present', async () => {
    const path = join(workdir, 'credentials.json')
    saveCredentials(path, { api_key: 'x', email: 'a@b.com' })
    expect(existsSync(path)).toBe(true)
    await runLogout({ credentialsPath: path, onMessage: () => {} })
    expect(existsSync(path)).toBe(false)
  })
  it('is no-op when not logged in', async () => {
    const path = join(workdir, 'absent.json')
    await runLogout({ credentialsPath: path, onMessage: () => {} })
    expect(existsSync(path)).toBe(false)
  })
})
