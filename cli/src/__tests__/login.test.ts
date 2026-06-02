import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/api-client', () => ({
  authInit: vi.fn(),
  authPoll: vi.fn(),
}))
vi.mock('../lib/credentials', () => ({
  defaultCredentialsPath: vi.fn(() => '/tmp/test-credentials.json'),
  saveCredentials: vi.fn(),
}))

import { authInit, authPoll } from '../lib/api-client'
import { saveCredentials } from '../lib/credentials'
import { runLogin } from '../commands/login'

const initResponse = {
  user_code: 'XXXX-1111',
  device_code: 'd1',
  verify_url: 'https://heatmapx.com/cli-auth',
  verify_url_complete: 'https://heatmapx.com/cli-auth?code=XXXX-1111',
  expires_in: 600,
  interval: 5,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runLogin', () => {
  it('saves credentials on approval', async () => {
    vi.mocked(authInit).mockResolvedValue(initResponse)
    vi.mocked(authPoll)
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'approved', api_key: 'hmx_live_x', email: 'a@b.com' })

    await runLogin({ pollIntervalMs: 0, maxPolls: 5, onMessage: () => {} })

    expect(saveCredentials).toHaveBeenCalledWith(
      '/tmp/test-credentials.json',
      { api_key: 'hmx_live_x', email: 'a@b.com' },
    )
  })

  it('throws on expired session', async () => {
    vi.mocked(authInit).mockResolvedValue(initResponse)
    vi.mocked(authPoll).mockResolvedValueOnce({ status: 'expired', error: 'session_expired' })

    await expect(runLogin({ pollIntervalMs: 0, maxPolls: 1, onMessage: () => {} })).rejects.toThrow(/expired/)
  })

  it('throws on timeout (max polls reached without approval)', async () => {
    vi.mocked(authInit).mockResolvedValue(initResponse)
    vi.mocked(authPoll).mockResolvedValue({ status: 'pending' })

    await expect(runLogin({ pollIntervalMs: 0, maxPolls: 3, onMessage: () => {} })).rejects.toThrow(/timed out/)
  })
})
