import { describe, it, expect, vi, afterEach } from 'vitest'
import { cliAnalyze } from './api-client'

afterEach(() => vi.restoreAllMocks())

describe('cliAnalyze', () => {
  it('sends period and lang in the request body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          analysis_run_id: 'r',
          markdown: 'm',
          screenshot_url: '',
          duration_ms: 1,
          cost_usd: 0,
          usage: { used: 1, quota: 100, plan: 'pro' },
        }),
        { status: 200 },
      ),
    )
    await cliAnalyze('hmx_live_x', {
      url: 'https://x.com/p',
      hypothesis: { goal: 'g', variants: [{ name: 'control' }] },
      period: { days: 30 },
      lang: 'en',
    })
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.period).toEqual({ days: 30 })
    expect(body.lang).toBe('en')
  })

  it('omits period and lang when not provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          analysis_run_id: 'r',
          markdown: 'm',
          screenshot_url: '',
          duration_ms: 1,
          cost_usd: 0,
          usage: { used: 1, quota: 100, plan: 'pro' },
        }),
        { status: 200 },
      ),
    )
    await cliAnalyze('hmx_live_x', {
      url: 'https://x.com/p',
      hypothesis: { goal: 'g', variants: [{ name: 'control' }] },
    })
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.period).toBeUndefined()
    expect(body.lang).toBeUndefined()
  })
})
