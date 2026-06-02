import { describe, it, expect } from 'vitest'
import { buildPeriod, formatSummaryLines } from '../analyze'

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
  const base = {
    period: { from: '', to: '' },
    clickZones: [{ row: 'hero', cols: [8, 41, 3] }],
    totalClicks: 1240,
    totalSessions: 980,
    scrollReach: { 25: 92, 50: 68, 75: 35, 100: 14 },
    lowData: false,
  }
  it('renders click and scroll lines', () => {
    const out = formatSummaryLines(base).join('\n')
    expect(out).toContain('1,240 clicks')
    expect(out).toContain('75%')
  })
  it('adds low-data warning when lowData', () => {
    const out = formatSummaryLines({ ...base, lowData: true }).join('\n')
    expect(out).toMatch(/Low data/)
  })
})
