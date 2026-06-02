import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  renderTemplate,
  loadConfig,
  persistConfig,
} from '../lib/config-loader'

let workdir: string

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'heatmapx-cli-'))
})

describe('renderTemplate', () => {
  it('substitutes site/page/goal placeholders', () => {
    const out = renderTemplate({
      site: 'https://example.com',
      page: '/pricing',
      goal: 'Lift CTA',
      variants: [{ name: 'control' }],
    })
    expect(out).toContain("site: 'https://example.com'")
    expect(out).toContain("page: '/pricing'")
    expect(out).toContain("goal: 'Lift CTA'")
  })
})

describe('persistConfig + loadConfig roundtrip', () => {
  it('writes a file readable by loadConfig', async () => {
    const path = join(workdir, 'heatmap.config.ts')
    const cfg = {
      site: 'https://example.com',
      page: '/',
      goal: 'g',
      variants: [{ name: 'control' }],
    }
    persistConfig(path, cfg)
    const text = readFileSync(path, 'utf8')
    expect(text).toContain("site: 'https://example.com'")

    const loaded = await loadConfig(path)
    expect(loaded.site).toBe(cfg.site)
    expect(loaded.variants[0].name).toBe('control')
  })

  it('throws on invalid config', async () => {
    const path = join(workdir, 'heatmap.config.ts')
    writeFileSync(path, "module.exports = { default: { site: '', page: '/', goal: '', variants: [] } }")
    await expect(loadConfig(path)).rejects.toThrow()
  })
})
