import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig, persistConfig } from '../lib/config-loader'

let workdir: string
beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'heatmapx-ast-'))
})

describe('config-loader (ts-morph)', () => {
  it('preserves comments through load → mutate → save', async () => {
    const path = join(workdir, 'heatmap.config.ts')
    const original = `import { defineHypothesis } from '@heatmapx/cli'

// User goal: lift CTA on /pricing
export default defineHypothesis({
  site: 'https://example.com',
  page: '/pricing',
  // we want to validate the new hero variant
  goal: 'Old goal',
  variants: [
    { name: 'control' },
  ],
})
`
    writeFileSync(path, original, 'utf8')
    const cfg = await loadConfig(path)
    cfg.goal = 'New goal'
    persistConfig(path, cfg)
    const after = readFileSync(path, 'utf8')
    expect(after).toContain('// User goal: lift CTA on /pricing')
    expect(after).toContain('// we want to validate the new hero variant')
    expect(after).toContain("goal: 'New goal'")
    // sanity: old value gone
    expect(after).not.toContain("goal: 'Old goal'")
  })

  it('updates nested array variant name without losing surrounding structure', async () => {
    const path = join(workdir, 'heatmap.config.ts')
    const original = `import { defineHypothesis } from '@heatmapx/cli'

export default defineHypothesis({
  site: 'https://example.com',
  page: '/',
  goal: 'g',
  variants: [
    { name: 'control', description: 'baseline' },
    { name: 'v2' },
  ],
})
`
    writeFileSync(path, original, 'utf8')
    const cfg = await loadConfig(path)
    cfg.variants[0].name = 'control-renamed'
    persistConfig(path, cfg)
    const after = readFileSync(path, 'utf8')
    expect(after).toContain("name: 'control-renamed'")
    expect(after).toContain("description: 'baseline'") // sibling preserved
    expect(after).toContain("name: 'v2'") // other entry preserved
  })

  it('loads a plain `export default {...}` config (no defineHypothesis import)', async () => {
    const path = join(workdir, 'heatmap.config.ts')
    const original = `// heatmap.config.ts
export default {
  site: 'https://example.com',
  page: '/pricing',
  goal: 'Lift CTA',
  variants: [
    { name: 'control' },
  ],
}
`
    writeFileSync(path, original, 'utf8')
    const cfg = await loadConfig(path)
    expect(cfg.site).toBe('https://example.com')
    expect(cfg.page).toBe('/pricing')
    expect(cfg.variants[0].name).toBe('control')
  })

  it('init (fresh file) writes an import-free config that re-parses', async () => {
    const path = join(workdir, 'heatmap.config.ts')
    persistConfig(path, {
      site: 'https://example.com',
      page: '/',
      goal: 'g',
      variants: [{ name: 'control' }],
      targets: [],
    })
    const after = readFileSync(path, 'utf8')
    expect(after).not.toContain('import ') // グローバルCLIでは解決できないimportを生成しない
    expect(after).not.toContain('@heatmapx/cli') // 旧パッケージ名を残さない
    const cfg = await loadConfig(path) // 生成した設定が再度パースできる
    expect(cfg.site).toBe('https://example.com')
  })
})
