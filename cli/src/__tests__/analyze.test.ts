import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'

vi.mock('../commands/data', () => ({
  runDataCli: vi.fn(),
  handleDataError: vi.fn(),
}))

import { runDataCli } from '../commands/data'
import { analyzeCommand, ANALYZE_ALIAS_NOTICE } from '../commands/analyze'

beforeEach(() => {
  vi.clearAllMocks()
})

function makeProgram(): Command {
  const program = new Command()
  program.exitOverride()
  analyzeCommand(program)
  return program
}

describe('analyze (alias of data since v0.4.0)', () => {
  it('prints the BYO-AI notice to stderr and delegates to runDataCli', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const program = makeProgram()
    await program.parseAsync(['node', 'heatmapx', 'analyze', '/pricing', '--json', '--days', '7'])
    expect(stderrSpy).toHaveBeenCalledWith(ANALYZE_ALIAS_NOTICE)
    expect(runDataCli).toHaveBeenCalledWith(
      '/pricing',
      expect.objectContaining({ json: true, days: '7' }),
    )
    stderrSpy.mockRestore()
  })

  it('passes output/from/to/screenshot flags through', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const program = makeProgram()
    await program.parseAsync([
      'node', 'heatmapx', 'analyze',
      '-o', 'out.txt',
      '--from', '2026-05-01',
      '--to', '2026-05-31',
      '--screenshot',
    ])
    expect(runDataCli).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        output: 'out.txt',
        from: '2026-05-01',
        to: '2026-05-31',
        screenshot: true,
      }),
    )
    vi.mocked(console.error).mockRestore()
  })

  it('no longer accepts --lang (server AI retired)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const program = makeProgram()
    await expect(
      program.parseAsync(['node', 'heatmapx', 'analyze', '--lang', 'ja']),
    ).rejects.toThrow()
    expect(runDataCli).not.toHaveBeenCalled()
    vi.mocked(console.error).mockRestore()
  })
})
