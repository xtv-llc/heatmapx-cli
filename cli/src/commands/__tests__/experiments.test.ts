import { describe, it, expect } from 'vitest'
import { formatExperimentsOutput, formatResultsOutput } from '../experiments'
import type { ExperimentsResponse, ExperimentResultsResponse } from '../../lib/api-client'

const listResp: ExperimentsResponse = {
  site_found: true,
  experiments: [
    {
      id: 'e1',
      site_id: 's1',
      site_url: 'https://cryptul.co.jp',
      name: 'CTA color',
      status: 'running',
      target_url_pattern: '/pricing',
      goal_type: 'click',
      start_at: null,
      end_at: null,
      created_at: '2026-07-03T00:00:00Z',
    },
  ],
}

const resultsResp: ExperimentResultsResponse = {
  experiment: {
    id: 'e1',
    site_id: 's1',
    name: 'CTA color',
    status: 'running',
    target_url_pattern: '/pricing',
    goal_type: 'click',
    start_at: null,
    end_at: null,
  },
  results: {
    rows: [
      {
        variantId: 'v1',
        name: 'A',
        isControl: true,
        exposures: 500,
        conversions: 25,
        rate: 0.05,
        uplift: null,
        probBest: 0.2,
      },
      {
        variantId: 'v2',
        name: 'B',
        isControl: false,
        exposures: 500,
        conversions: 40,
        rate: 0.08,
        uplift: 0.6,
        probBest: 0.97,
      },
    ],
    winnerSuggestion: 'v2',
  },
}

describe('formatExperimentsOutput', () => {
  it('実験一覧をid・status・goal付きで整形する', () => {
    const text = formatExperimentsOutput(listResp)
    expect(text).toContain('[running] CTA color — /pricing (goal: click)')
    expect(text).toContain('id: e1')
    expect(text).toContain('site: https://cryptul.co.jp')
  })

  it('サイト未登録は案内を出す', () => {
    expect(formatExperimentsOutput({ site_found: false, experiments: [] })).toContain('Site not found')
  })

  it('実験ゼロはダッシュボードへ誘導', () => {
    expect(formatExperimentsOutput({ site_found: true, experiments: [] })).toContain('No experiments yet')
  })
})

describe('formatResultsOutput', () => {
  it('バリアント別の成績と勝者提案を整形する', () => {
    const text = formatResultsOutput(resultsResp)
    expect(text).toContain('(control) A: 25/500 cv (5.00%)')
    expect(text).toContain('B: 40/500 cv (8.00%)  uplift +60.0%  P(best) 97%')
    expect(text).toContain('★ Suggested winner: B')
    expect(text).toContain('Pass this data to your AI agent')
  })

  it('勝者未確定はその旨を出す', () => {
    const noWinner = {
      ...resultsResp,
      results: { ...resultsResp.results, winnerSuggestion: null },
    }
    expect(formatResultsOutput(noWinner)).toContain('no statistically confident winner yet')
  })
})
