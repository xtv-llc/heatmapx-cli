import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('../lib/config-loader', () => ({
  loadConfig: vi.fn(),
}))
vi.mock('../lib/credentials', () => ({
  defaultCredentialsPath: vi.fn(() => '/tmp/test-credentials.json'),
  loadCredentials: vi.fn(),
}))
vi.mock('../lib/api-client', () => ({
  cliAnalyze: vi.fn(),
}))

import { loadConfig } from '../lib/config-loader'
import { loadCredentials } from '../lib/credentials'
import { cliAnalyze } from '../lib/api-client'
import { runAnalyze, resolveUrl } from '../commands/analyze'

beforeEach(() => {
  vi.clearAllMocks()
})

const sampleConfig = {
  site: 'https://example.com',
  page: '/pricing',
  goal: 'Lift CTA',
  variants: [{ name: 'control' }],
}

describe('resolveUrl', () => {
  it('uses site+page when no override', () => {
    expect(resolveUrl('https://example.com', '/pricing')).toBe('https://example.com/pricing')
    expect(resolveUrl('https://example.com/', '/pricing')).toBe('https://example.com/pricing')
  })
  it('uses absolute URL override', () => {
    expect(resolveUrl('https://example.com', '/', 'https://other.com/lp')).toBe('https://other.com/lp')
  })
  it('uses relative path override against site', () => {
    expect(resolveUrl('https://example.com', '/old', '/new')).toBe('https://example.com/new')
    expect(resolveUrl('https://example.com', '/old', 'about')).toBe('https://example.com/about')
  })
})

describe('runAnalyze', () => {
  it('throws when not logged in', async () => {
    vi.mocked(loadCredentials).mockReturnValue(null)
    await expect(runAnalyze({ onMessage: () => {} })).rejects.toThrow(/Not logged in/)
  })

  it('returns markdown + usage on success', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'hmx_live_x', email: 'a@b.com' })
    vi.mocked(loadConfig).mockResolvedValue(sampleConfig)
    vi.mocked(cliAnalyze).mockResolvedValue({
      analysis_run_id: 'r1',
      markdown: '# obs',
      screenshot_url: '...',
      duration_ms: 5000,
      cost_usd: 0.05,
      usage: { used: 5, quota: 10, plan: 'free' },
    })
    const cwd = mkdtempSync(join(tmpdir(), 'hmx-analyze-'))
    const r = await runAnalyze({ cwd, onMessage: () => {} })
    expect(r.markdown).toBe('# obs')
    expect(r.usage).toEqual({ used: 5, quota: 10, plan: 'free' })
    // confirm cliAnalyze was called with resolved URL
    expect(cliAnalyze).toHaveBeenCalledWith('hmx_live_x', {
      url: 'https://example.com/pricing',
      hypothesis: { goal: 'Lift CTA', variants: [{ name: 'control' }] },
    })
  })

  it('uses pathOrUrl override when provided', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'hmx_live_x', email: 'a@b.com' })
    vi.mocked(loadConfig).mockResolvedValue(sampleConfig)
    vi.mocked(cliAnalyze).mockResolvedValue({
      analysis_run_id: 'r1', markdown: '...', screenshot_url: '...',
      duration_ms: 1, cost_usd: 0,
      usage: { used: 1, quota: 10, plan: 'free' },
    })
    const cwd = mkdtempSync(join(tmpdir(), 'hmx-analyze-'))
    await runAnalyze({ cwd, pathOrUrl: '/checkout', onMessage: () => {} })
    expect(cliAnalyze).toHaveBeenCalledWith('hmx_live_x', expect.objectContaining({
      url: 'https://example.com/checkout',
    }))
  })

  it('propagates quota_exceeded error from api-client', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'x', email: 'a@b.com' })
    vi.mocked(loadConfig).mockResolvedValue(sampleConfig)
    vi.mocked(cliAnalyze).mockRejectedValue(new Error('quota_exceeded'))
    const cwd = mkdtempSync(join(tmpdir(), 'hmx-analyze-'))
    await expect(runAnalyze({ cwd, onMessage: () => {} })).rejects.toThrow('quota_exceeded')
  })
})
