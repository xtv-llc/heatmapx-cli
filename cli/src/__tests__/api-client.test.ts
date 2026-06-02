import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  authInit,
  authPoll,
  baseUrl,
  cliAnalyze,
  getUsage,
  patchFindFile,
  patchGenerateDiff,
} from '../lib/api-client'

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

describe('cliAnalyze', () => {
  it('POSTs to /api/cli/analyze with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        analysis_run_id: 'run-1',
        markdown: '# observation',
        screenshot_url: 'https://...',
        duration_ms: 1000,
        cost_usd: 0.05,
        usage: { used: 1, quota: 10, plan: 'free' },
      }),
    })
    global.fetch = fetchMock as never
    const out = await cliAnalyze('hmx_live_xxx', {
      url: 'https://example.com/pricing',
      hypothesis: { goal: 'g', variants: [{ name: 'control' }] },
    })
    expect(out.markdown).toBe('# observation')
    const callArgs = fetchMock.mock.calls[0]
    expect(callArgs[0]).toBe('https://heatmapx.com/api/cli/analyze')
    expect(callArgs[1].headers['Authorization']).toBe('Bearer hmx_live_xxx')
  })

  it('throws with error code when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 429,
      json: async () => ({ error: 'quota_exceeded', usage: { used: 10, quota: 10, plan: 'free' } }),
    }) as never
    await expect(
      cliAnalyze('hmx_live_xxx', { url: 'https://example.com', hypothesis: { goal: 'g', variants: [{ name: 'control' }] } }),
    ).rejects.toThrow('quota_exceeded')
  })

  it('throws http_<status> when error body has no error code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 500,
      json: async () => ({}),
    }) as never
    await expect(
      cliAnalyze('hmx_live_xxx', { url: 'https://example.com', hypothesis: { goal: 'g', variants: [{ name: 'control' }] } }),
    ).rejects.toThrow('http_500')
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

describe('patchFindFile', () => {
  it('POSTs mode=find_file with bearer and returns target_file', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        target_file: 'src/Hero.tsx',
        confidence: 0.91,
        usage: { used: 1, quota: 100, plan: 'pro' },
      }),
    })
    global.fetch = fetchMock as never
    const out = await patchFindFile('hmx_live_xxx', {
      suggestion: 'Hero の見出しを変更',
      target_candidates: [{ path: 'src/Hero.tsx', content: 'export const Hero' }],
    })
    expect(out.target_file).toBe('src/Hero.tsx')
    expect(out.confidence).toBe(0.91)
    const callArgs = fetchMock.mock.calls[0]
    expect(callArgs[0]).toBe('https://heatmapx.com/api/cli/patch')
    expect(callArgs[1].method).toBe('POST')
    expect(callArgs[1].headers['Authorization']).toBe('Bearer hmx_live_xxx')
    const body = JSON.parse(callArgs[1].body)
    expect(body.mode).toBe('find_file')
    expect(body.target_candidates).toHaveLength(1)
  })

  it('throws with error code on 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid_token' }),
    }) as never
    await expect(
      patchFindFile('bad', { suggestion: 's', target_candidates: [] }),
    ).rejects.toThrow('invalid_token')
  })
})

describe('patchGenerateDiff', () => {
  it('POSTs mode=generate_diff and returns original/modified', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        original: 'old text',
        modified: 'new text',
        usage: { used: 2, quota: 100, plan: 'pro' },
      }),
    })
    global.fetch = fetchMock as never
    const out = await patchGenerateDiff('hmx_live_xxx', {
      suggestion: 's',
      file_path: 'src/Hero.tsx',
      file_content: 'old text',
    })
    expect(out.original).toBe('old text')
    expect(out.modified).toBe('new text')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.mode).toBe('generate_diff')
    expect(body.file_path).toBe('src/Hero.tsx')
  })

  it('throws http_<status> when error body has no error code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as never
    await expect(
      patchGenerateDiff('hmx_live_xxx', {
        suggestion: 's',
        file_path: 'x',
        file_content: '',
      }),
    ).rejects.toThrow('http_500')
  })

  it('includes server message when error body has both error and message', async () => {
    // サーバが `{error:'patch_failed', message:'<真因>'}` を返すケース。
    // 旧実装は error だけ拾って message を捨てていたので、原因の切り分けができなかった。
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'patch_failed',
        message: 'Claude could not locate the snippet',
      }),
    }) as never
    await expect(
      patchGenerateDiff('hmx_live_xxx', {
        suggestion: 's',
        file_path: 'x',
        file_content: '',
      }),
    ).rejects.toThrow('patch_failed: Claude could not locate the snippet')
  })
})

describe('error message surfacing (regression: D-01)', () => {
  it('cliAnalyze surfaces server message alongside error code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'analyze_failed', message: 'anthropic_balance_zero' }),
    }) as never
    await expect(
      cliAnalyze('hmx_live_xxx', {
        url: 'https://example.com',
        hypothesis: { goal: 'g', variants: [{ name: 'control' }] },
      }),
    ).rejects.toThrow('analyze_failed: anthropic_balance_zero')
  })

  it('patchFindFile surfaces server message alongside error code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'patch_failed', message: 'no high-confidence candidate' }),
    }) as never
    await expect(
      patchFindFile('hmx_live_xxx', { suggestion: 's', target_candidates: [] }),
    ).rejects.toThrow('patch_failed: no high-confidence candidate')
  })
})
