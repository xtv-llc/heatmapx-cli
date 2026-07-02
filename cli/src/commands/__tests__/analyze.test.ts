import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'

vi.mock('../data', () => ({
  runDataCli: vi.fn(),
  handleDataError: vi.fn(),
}))

import { runDataCli, handleDataError } from '../data'
import { analyzeCommand, ANALYZE_ALIAS_NOTICE } from '../analyze'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ANALYZE_ALIAS_NOTICE', () => {
  it('tells the user analysis now runs in their AI agent', () => {
    expect(ANALYZE_ALIAS_NOTICE).toContain('since v0.4.0')
    expect(ANALYZE_ALIAS_NOTICE).toContain('YOUR AI agent')
    expect(ANALYZE_ALIAS_NOTICE).toContain("same as 'heatmapx data'")
  })
})

describe('analyzeCommand option surface', () => {
  it('registers the same options as data (no --lang)', () => {
    const program = new Command()
    analyzeCommand(program)
    const cmd = program.commands.find((c) => c.name() === 'analyze')
    expect(cmd).toBeDefined()
    const flags = cmd!.options.map((o) => o.long)
    expect(flags).toEqual(
      expect.arrayContaining(['--json', '--output', '--days', '--from', '--to', '--screenshot']),
    )
    expect(flags).not.toContain('--lang')
  })

  it('delegates errors from runDataCli to handleDataError', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('rate_limited')
    vi.mocked(runDataCli).mockRejectedValue(err)
    const program = new Command()
    program.exitOverride()
    analyzeCommand(program)
    await program.parseAsync(['node', 'heatmapx', 'analyze', '/pricing'])
    expect(handleDataError).toHaveBeenCalledWith(err)
    vi.mocked(console.error).mockRestore()
  })
})
