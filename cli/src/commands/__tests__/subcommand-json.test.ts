import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

vi.mock('../../lib/credentials', () => ({
  defaultCredentialsPath: vi.fn(() => '/tmp/test-credentials.json'),
  loadCredentials: vi.fn(() => ({ api_key: 'hmx_live_x', email: 'a@b.com' })),
}))
vi.mock('../../lib/config-loader', () => ({
  loadConfig: vi.fn().mockRejectedValue(new Error('no config')),
}))
vi.mock('../../lib/api-client', () => ({
  fetchExperiments: vi.fn(),
  fetchExperimentResults: vi.fn(),
  createExperiment: vi.fn(),
  setExperimentStatus: vi.fn(),
  listSites: vi.fn(),
  createSite: vi.fn(),
}))

import { fetchExperimentResults, fetchExperiments, listSites } from '../../lib/api-client'
import { experimentsCommand } from '../experiments'
import { sitesCommand } from '../sites'

// index.ts と同じ構成（root で enablePositionalOptions）で親子コマンドを組む
function buildProgram(): Command {
  const program = new Command().exitOverride().enablePositionalOptions()
  experimentsCommand(program)
  sitesCommand(program)
  return program
}

const resultsResp = {
  experiment: {
    id: 'e1', site_id: 's1', name: 'CTA', status: 'running',
    target_url_pattern: '/pricing', goal_type: 'click', start_at: null, end_at: null,
  },
  results: {
    rows: [{ variantId: 'v1', name: 'A', isControl: true, exposures: 10, conversions: 1, rate: 0.1, uplift: null, probBest: 1, preview_url: null }],
    winnerSuggestion: null,
    sampleGuidance: { remainingExposures: 90, estimatedDays: null },
  },
}

let logs: string[]
let logSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  logs = []
  logSpy = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)) })
})
afterEach(() => logSpy.mockRestore())

describe('サブコマンドの --json が親コマンドに奪われない', () => {
  it('experiments results <id> --json は生JSONを出す', async () => {
    vi.mocked(fetchExperimentResults).mockResolvedValue(resultsResp)
    await buildProgram().parseAsync(['experiments', 'results', 'e1', '--json'], { from: 'user' })
    expect(logs).toHaveLength(1)
    expect(JSON.parse(logs[0])).toEqual(resultsResp)
    expect(fetchExperiments).not.toHaveBeenCalled()
  })

  it('experiments --json（親だけ）は従来どおり一覧の生JSON', async () => {
    vi.mocked(fetchExperiments).mockResolvedValue({ site_found: true, experiments: [] })
    await buildProgram().parseAsync(['experiments', '--json'], { from: 'user' })
    expect(JSON.parse(logs[0])).toEqual({ site_found: true, experiments: [] })
  })

  it('sites list --json は生JSONを出す', async () => {
    vi.mocked(listSites).mockResolvedValue({ sites: [] })
    await buildProgram().parseAsync(['sites', 'list', '--json'], { from: 'user' })
    // runSitesList の --json は sites 配列そのものを出す（従来仕様）
    expect(JSON.parse(logs[0])).toEqual([])
  })

  it('--json なしは整形表示', async () => {
    vi.mocked(fetchExperimentResults).mockResolvedValue(resultsResp)
    await buildProgram().parseAsync(['experiments', 'results', 'e1'], { from: 'user' })
    expect(logs[0]).toContain('== CTA [running]')
  })
})
