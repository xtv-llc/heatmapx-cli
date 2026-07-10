import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/credentials', () => ({
  defaultCredentialsPath: vi.fn(() => '/tmp/test-credentials.json'),
  loadCredentials: vi.fn(),
}))
vi.mock('../../lib/api-client', () => ({
  createSite: vi.fn(),
  listSites: vi.fn(),
}))

import { loadCredentials } from '../../lib/credentials'
import { listSites, type SiteListItem } from '../../lib/api-client'
import { formatSitesList, runSitesList } from '../sites'

beforeEach(() => vi.clearAllMocks())

const sites: SiteListItem[] = [
  {
    id: 'a1',
    name: 'My LP',
    url: 'https://example.com/',
    created_at: '2026-07-01T00:00:00Z',
    first_event_at: '2026-07-10T00:00:00Z',
  },
  {
    id: 'b2',
    name: 'Blog',
    url: 'https://blog.example.com',
    created_at: '2026-07-02T00:00:00Z',
    first_event_at: null,
  },
]

describe('formatSitesList', () => {
  it('サイトが無ければ案内文', () => {
    expect(formatSitesList([])).toMatch(/No sites yet/)
  })

  it('名前・URL(プロトコル除去)・id・状態を表示', () => {
    const out = formatSitesList(sites)
    expect(out).toContain('Your sites (2)')
    expect(out).toContain('My LP')
    expect(out).toContain('example.com') // stripProtocol
    expect(out).not.toContain('https://example.com')
    expect(out).toContain('id: a1')
    expect(out).toContain('receiving') // first_event_at あり
    expect(out).toContain('waiting for data') // first_event_at null
  })
})

describe('runSitesList', () => {
  it('未ログインはエラー', async () => {
    vi.mocked(loadCredentials).mockReturnValue(null)
    await expect(runSitesList()).rejects.toThrow(/Not logged in/)
  })

  it('ログイン中は listSites を api_key で叩き整形する', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'k1', email: 'e' } as never)
    vi.mocked(listSites).mockResolvedValue({ sites })
    const { text, sites: got } = await runSitesList()
    expect(listSites).toHaveBeenCalledWith('k1')
    expect(got).toHaveLength(2)
    expect(text).toContain('Your sites (2)')
  })

  it('--json は生JSON配列', async () => {
    vi.mocked(loadCredentials).mockReturnValue({ api_key: 'k1' } as never)
    vi.mocked(listSites).mockResolvedValue({ sites })
    const { text } = await runSitesList({ json: true })
    expect(JSON.parse(text)).toHaveLength(2)
  })
})
