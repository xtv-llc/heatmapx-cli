import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { saveCredentials, loadCredentials, deleteCredentials, defaultCredentialsPath } from '../lib/credentials'

let workdir: string
beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'heatmapx-creds-'))
})

describe('credentials', () => {
  it('saves with mode 0600', () => {
    const path = join(workdir, 'credentials.json')
    saveCredentials(path, { api_key: 'hmx_live_abc', email: 'a@b.com' })
    const stat = statSync(path)
    expect(stat.mode & 0o777).toBe(0o600)
  })
  it('roundtrips api_key + email', () => {
    const path = join(workdir, 'credentials.json')
    saveCredentials(path, { api_key: 'hmx_live_x', email: 'a@b.com' })
    const loaded = loadCredentials(path)
    expect(loaded?.api_key).toBe('hmx_live_x')
    expect(loaded?.email).toBe('a@b.com')
  })
  it('returns null when missing', () => {
    expect(loadCredentials(join(workdir, 'nope.json'))).toBeNull()
  })
  it('returns null when malformed JSON', () => {
    const path = join(workdir, 'bad.json')
    writeFileSync(path, 'not json')
    expect(loadCredentials(path)).toBeNull()
  })
  it('deleteCredentials removes file', () => {
    const path = join(workdir, 'credentials.json')
    saveCredentials(path, { api_key: 'x', email: 'a@b.com' })
    deleteCredentials(path)
    expect(loadCredentials(path)).toBeNull()
  })
  it('deleteCredentials is no-op if file missing', () => {
    expect(() => deleteCredentials(join(workdir, 'nope.json'))).not.toThrow()
  })
  it('defaultCredentialsPath includes ~/.heatmapx/credentials.json', () => {
    expect(defaultCredentialsPath()).toMatch(/\.heatmapx[\\/]credentials\.json$/)
  })
})
