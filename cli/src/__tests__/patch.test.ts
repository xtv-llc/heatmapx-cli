import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { patchCommand, PATCH_RETIRED_NOTICE } from '../commands/patch'

let stderrSpy: ReturnType<typeof vi.spyOn>
let exitSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called')
  }) as never)
})

afterEach(() => {
  stderrSpy.mockRestore()
  exitSpy.mockRestore()
})

function makeProgram(): Command {
  const program = new Command()
  program.exitOverride()
  patchCommand(program)
  return program
}

describe('patch (retired since v0.4.0)', () => {
  it('prints the retirement guidance to stderr and exits 1', async () => {
    const program = makeProgram()
    await expect(
      program.parseAsync(['node', 'heatmapx', 'patch']),
    ).rejects.toThrow('process.exit called')
    expect(stderrSpy).toHaveBeenCalledWith(PATCH_RETIRED_NOTICE)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('still prints guidance when called with legacy args and flags', async () => {
    const program = makeProgram()
    await expect(
      program.parseAsync([
        'node', 'heatmapx', 'patch', 'analysis.md', '--suggestion', '1', '--target', 'src/Hero.tsx',
      ]),
    ).rejects.toThrow('process.exit called')
    expect(stderrSpy).toHaveBeenCalledWith(PATCH_RETIRED_NOTICE)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('guidance mentions the new flow (heatmapx data + AI agent + PR)', () => {
    expect(PATCH_RETIRED_NOTICE).toContain("'patch' has been retired")
    expect(PATCH_RETIRED_NOTICE).toContain("heatmapx data")
    expect(PATCH_RETIRED_NOTICE).toContain('Claude Code / Codex')
    expect(PATCH_RETIRED_NOTICE).toContain('open a PR')
  })
})
