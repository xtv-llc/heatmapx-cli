import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('../lib/api-client', () => ({
  getUsage: vi.fn(),
}))

import { getUsage } from '../lib/api-client'
import { runWhoami } from '../commands/whoami'
import { saveCredentials } from '../lib/credentials'

let workdir: string
beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'heatmapx-whoami-'))
  vi.clearAllMocks()
})

describe('runWhoami', () => {
  it('returns loggedIn=false when not present', async () => {
    const r = await runWhoami({ credentialsPath: join(workdir, 'absent.json') })
    expect(r.loggedIn).toBe(false)
  })

  it('returns loggedIn=true with usage on success', async () => {
    const path = join(workdir, 'credentials.json')
    saveCredentials(path, { api_key: 'hmx_live_abcdefghijklmno', email: 'a@b.com' })
    vi.mocked(getUsage).mockResolvedValue({
      email: 'a@b.com',
      plan: 'free',
      usage: { used: 3, quota: 10 },
    })
    const r = await runWhoami({ credentialsPath: path })
    expect(r.loggedIn).toBe(true)
    expect(r.email).toBe('a@b.com')
    expect(r.plan).toBe('free')
    expect(r.usage).toEqual({ used: 3, quota: 10 })
    expect(r.usageUnavailable).toBeUndefined()
  })

  it('flags usageUnavailable when getUsage throws', async () => {
    const path = join(workdir, 'credentials.json')
    saveCredentials(path, { api_key: 'hmx_live_xxxxx', email: 'a@b.com' })
    vi.mocked(getUsage).mockRejectedValue(new Error('network'))
    const r = await runWhoami({ credentialsPath: path })
    expect(r.loggedIn).toBe(true)
    expect(r.email).toBe('a@b.com')
    expect(r.usageUnavailable).toBe(true)
    expect(r.plan).toBeUndefined()
  })
})
