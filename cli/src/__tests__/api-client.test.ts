import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authInit, authPoll, baseUrl, fetchData, getUsage } from '../lib/api-client'

const realFetch = global.fetch

beforeEach(() => {
  delete process.env.HEATMAPX_API_URL
})
afterEach(() => {
  global.fetch = realFetch
})

describe('baseUrl', () => {
  it('defaults to heatmapx.com', () => {
    expect(baseUrl()).toBe('https://heatmapx.com')
  })
  it('uses HEATMAPX_API_URL env when set', () => {
    process.env.HEATMAPX_API_URL = 'http://localhost:3000'
    expect(baseUrl()).toBe('http://localhost:3000')
  })
})

describe('authInit', () => {
  it('POSTs to /api/cli/auth/init and returns parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user_code: 'XXXX-1111',
        device_code: 'd1',
        verify_url: 'https://heatmapx.com/cli-auth',
        verify_url_complete: 'https://heatmapx.com/cli-auth?code=XXXX-1111',
        expires_in: 600,
        interval: 5,
      }),
    })
    global.fetch = fetchMock as unknown as typeof fetch
    const out = await authInit()
    expect(out.user_code).toBe('XXXX-1111')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://heatmapx.com/api/cli/auth/init',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as never
    await expect(authInit()).rejects.toThrow(/500/)
  })
})

describe('authPoll', () => {
  it('returns parsed body for pending', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'pending' }),
    }) as never
    const out = await authPoll('d1')
    expect(out.status).toBe('pending')
  })
  it('returns parsed body for approved', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'approved', api_key: 'hmx_live_x', email: 'a@b.com' }),
    }) as never
    const out = await authPoll('d1')
    expect(out.status).toBe('approved')
    if (out.status === 'approved') {
      expect(out.api_key).toBe('hmx_live_x')
    }
  })
})

describe('fetchData', () => {
  const sampleBody = {
    url: 'https://example.com/pricing',
    period: { from: '2026-06-01', to: '2026-06-30' },
    site_found: true,
    summary: {
      period: { from: '2026-06-01', to: '2026-06-30' },
      clickZones: [{ row: 'hero', cols: [8, 41, 3] }],
      totalClicks: 1240,
      scrollReach: { 25: 92, 50: 68, 75: 35, 100: 14 },
      totalSessions: 980,
      lowData: false,
    },
  }

  it('POSTs to /api/cli/data with bearer auth and returns parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleBody,
    })
    global.fetch = fetchMock as never
    const out = await fetchData('hmx_live_xxx', { url: 'https://example.com/pricing' })
    expect(out.site_found).toBe(true)
    expect(out.summary?.totalClicks).toBe(1240)
    const callArgs = fetchMock.mock.calls[0]
    expect(callArgs[0]).toBe('https://heatmapx.com/api/cli/data')
    expect(callArgs[1].method).toBe('POST')
    expect(callArgs[1].headers['Authorization']).toBe('Bearer hmx_live_xxx')
  })

  it('sends period and include_screenshot in the request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...sampleBody, screenshot_url: 'https://cdn/s.png' }),
    })
    global.fetch = fetchMock as never
    const out = await fetchData('hmx_live_xxx', {
      url: 'https://example.com/pricing',
      period: { days: 7 },
      include_screenshot: true,
    })
    expect(out.screenshot_url).toBe('https://cdn/s.png')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.period).toEqual({ days: 7 })
    expect(body.include_screenshot).toBe(true)
  })

  it('omits period and include_screenshot when not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...sampleBody, site_found: false, summary: null }),
    })
    global.fetch = fetchMock as never
    const out = await fetchData('hmx_live_xxx', { url: 'https://example.com/pricing' })
    expect(out.site_found).toBe(false)
    expect(out.summary).toBeNull()
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.period).toBeUndefined()
    expect(body.include_screenshot).toBeUndefined()
  })

  it('throws with error code on 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid_api_key' }),
    }) as never
    await expect(fetchData('bad', { url: 'https://example.com' })).rejects.toThrow(
      'invalid_api_key',
    )
  })

  it('surfaces server message alongside error code (422 invalid_url)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'invalid_url', message: 'url must be absolute http(s)' }),
    }) as never
    await expect(fetchData('hmx_live_xxx', { url: 'ftp://x' })).rejects.toThrow(
      'invalid_url: url must be absolute http(s)',
    )
  })

  it('throws http_<status> when error body has no error code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({}),
    }) as never
    await expect(fetchData('hmx_live_xxx', { url: 'https://example.com' })).rejects.toThrow(
      'http_502',
    )
  })
})

describe('getUsage', () => {
  it('GETs /api/cli/usage with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        email: 'user@example.com',
        plan: 'free',
        usage: { used: 5, quota: 10 },
      }),
    })
    global.fetch = fetchMock as never
    const out = await getUsage('hmx_live_xxx')
    expect(out.plan).toBe('free')
    expect(out.usage).toEqual({ used: 5, quota: 10 })
  })

  it('throws on 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as never
    await expect(getUsage('hmx_live_xxx')).rejects.toThrow(/usage_failed/)
  })
})
