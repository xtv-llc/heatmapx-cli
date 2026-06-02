import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runConfigGet, runConfigSet } from '../commands/config'
import { persistConfig } from '../lib/config-loader'

let workdir: string

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'heatmapx-cfg-'))
  persistConfig(join(workdir, 'heatmap.config.ts'), {
    site: 'https://example.com',
    page: '/pricing',
    goal: 'Lift CTA',
    variants: [{ name: 'control' }],
  })
})

describe('runConfigGet', () => {
  it('returns top-level string', async () => {
    expect(await runConfigGet({ cwd: workdir, key: 'site' })).toBe('https://example.com')
  })
  it('returns nested array element', async () => {
    expect(await runConfigGet({ cwd: workdir, key: 'variants.0.name' })).toBe('control')
  })
  it('throws on missing key', async () => {
    await expect(runConfigGet({ cwd: workdir, key: 'missing' })).rejects.toThrow(/not found/)
  })
})

describe('runConfigSet', () => {
  it('updates a top-level field', async () => {
    await runConfigSet({ cwd: workdir, key: 'goal', value: 'New goal' })
    const updated = await runConfigGet({ cwd: workdir, key: 'goal' })
    expect(updated).toBe('New goal')
  })
  it('updates a nested array field', async () => {
    await runConfigSet({ cwd: workdir, key: 'variants.0.name', value: 'cta-variant' })
    const updated = await runConfigGet({ cwd: workdir, key: 'variants.0.name' })
    expect(updated).toBe('cta-variant')
  })
  it('persists to disk', async () => {
    await runConfigSet({ cwd: workdir, key: 'goal', value: 'On-disk goal' })
    const raw = readFileSync(join(workdir, 'heatmap.config.ts'), 'utf8')
    expect(raw).toContain("goal: 'On-disk goal'")
  })
})
