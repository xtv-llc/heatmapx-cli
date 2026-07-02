import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('../../lib/config-loader', () => ({
  loadConfig: vi.fn(),
}))
vi.mock('../../lib/credentials', () => ({
  defaultCredentialsPath: vi.fn(() => '/tmp/test-credentials.json'),
  loadCredentials: vi.fn(),
}))
vi.mock('../../lib/api-client', () => ({
  fetchData: vi.fn(),
}))

import { loadConfig } from '../../lib/config-loader'
import { loadCredentials } from '../../lib/credentials'
import { fetchData, type DataResponse } from '../../lib/api-client'
import { runData, resolveUrl, buildPeriod, formatSummaryLines, formatDataOutput } from '../data'

beforeEach(() => {
  vi.clearAllMocks()
})

const sampleConfig = {
  site: 'https://example.com',
  page: '/pricing',
  goal: 'Lift CTA',
  variants: [{ name: 'control' }],
}

const sampleSummary = {
  period: { from: '2026-06-01', to: '2026-06-30' },
  clickZones: [{ row: 'hero', cols: [8, 41, 3] }],
  totalClicks: 1240,
  totalSessions: 980,
  scrollReach: { 25: 92, 50: 68, 75: 35, 100: 14 },
  lowData: false,
}

const sampleResponse: DataResponse = {
  url: 'https://example.com/pricing',
  period: { from: '2026-06-01', to: '2026-06-30' },
  site_found: true,
  summary: sampleSummary,
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

describe('buildPeriod', () => {
  it('prefers from/to when both present', () => {
    expect(buildPeriod({ days: '30', from: '2026-05-01', to: '2026-05-31' }))
      .toEqual({ from: '2026-05-01', to: '2026-05-31' })
  })
  it('uses days when from/to absent', () => {
    expect(buildPeriod({ days: '7' })).toEqual({ days: 7 })
  })
  it('returns undefined when nothing provided', () => {
    expect(buildPeriod({})).toBeUndefined()
  })
})

describe('formatSummaryLines', () => {
  it('renders click and scroll lines', () => {
    const out = formatSummaryLines(sampleSummary).join('\n')
    expect(out).toContain('1,240 clicks')
    expect(out).toContain('75%')
  })
  it('adds low-data warning when lowData', () => {
    const out = formatSummaryLines({ ...sampleSummary, lowData: true }).join('\n')
    expect(out).toMatch(/Low data/)
  })
})

describe('formatDataOutput', () => {
  it('renders header, summary and AI hand-off line', () => {
    const out = formatDataOutput(sampleResponse)
    expect(out).toContain(
      'HeatMapX data for https://example.com/pricing (2026-06-01 → 2026-06-30)',
    )
    expect(out).toContain('== Heatmap Summary')
    expect(out).toContain(
      '→ Pass this data to your AI agent (Claude Code / Codex) for CRO analysis.',
    )
  })
  it('prints registration guidance when site_found=false', () => {
    const out = formatDataOutput({ ...sampleResponse, site_found: false, summary: null })
    expect(out).toContain('Site not found')
    expect(out).toContain('tracker tag')
  })
  it('includes screenshot URL when present', () => {
    const out = formatDataOutput({
      ...sampleResponse,
      screenshot_url: 'https://cdn.heatmapx.com/s.png',
    })
    expect(out).toContain('Screenshot: https://cdn.heatmapx.com/s.png')
  })
})

describe('runData', () => {
  it('throws when not logged in', async () => {
    vi.mocked(loadCredentials).mockReturnValue(null)
    await expect(runData({ onMessage: () => {} })).rejects.toThrow(/Not logged in/)
  })

  it('fetches data with resolved URL and returns human-readable text', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'hmx_live_x', email: 'a@b.com' })
    vi.mocked(loadConfig).mockResolvedValue(sampleConfig)
    vi.mocked(fetchData).mockResolvedValue(sampleResponse)
    const cwd = mkdtempSync(join(tmpdir(), 'hmx-data-'))
    const r = await runData({ cwd, onMessage: () => {} })
    expect(fetchData).toHaveBeenCalledWith('hmx_live_x', {
      url: 'https://example.com/pricing',
      period: undefined,
      include_screenshot: undefined,
    })
    expect(r.text).toContain('HeatMapX data for https://example.com/pricing')
    expect(r.data.site_found).toBe(true)
  })

  it('uses pathOrUrl override and passes period + screenshot flag', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'hmx_live_x', email: 'a@b.com' })
    vi.mocked(loadConfig).mockResolvedValue(sampleConfig)
    vi.mocked(fetchData).mockResolvedValue(sampleResponse)
    const cwd = mkdtempSync(join(tmpdir(), 'hmx-data-'))
    await runData({
      cwd,
      pathOrUrl: '/checkout',
      period: { days: 7 },
      screenshot: true,
      onMessage: () => {},
    })
    expect(fetchData).toHaveBeenCalledWith('hmx_live_x', {
      url: 'https://example.com/checkout',
      period: { days: 7 },
      include_screenshot: true,
    })
  })

  it('returns raw JSON text when json option set', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'hmx_live_x', email: 'a@b.com' })
    vi.mocked(loadConfig).mockResolvedValue(sampleConfig)
    vi.mocked(fetchData).mockResolvedValue(sampleResponse)
    const cwd = mkdtempSync(join(tmpdir(), 'hmx-data-'))
    const r = await runData({ cwd, json: true, onMessage: () => {} })
    expect(JSON.parse(r.text)).toEqual(sampleResponse)
  })

  it('includes low-data warning in text when summary.lowData', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'hmx_live_x', email: 'a@b.com' })
    vi.mocked(loadConfig).mockResolvedValue(sampleConfig)
    vi.mocked(fetchData).mockResolvedValue({
      ...sampleResponse,
      summary: { ...sampleSummary, lowData: true },
    })
    const cwd = mkdtempSync(join(tmpdir(), 'hmx-data-'))
    const r = await runData({ cwd, onMessage: () => {} })
    expect(r.text).toMatch(/Low data/)
  })

  it('propagates rate_limited error from api-client', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'x', email: 'a@b.com' })
    vi.mocked(loadConfig).mockResolvedValue(sampleConfig)
    vi.mocked(fetchData).mockRejectedValue(new Error('rate_limited'))
    const cwd = mkdtempSync(join(tmpdir(), 'hmx-data-'))
    await expect(runData({ cwd, onMessage: () => {} })).rejects.toThrow('rate_limited')
  })
})
