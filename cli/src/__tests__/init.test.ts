import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInit } from '../commands/init'

let workdir: string

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'heatmapx-init-'))
})

describe('runInit', () => {
  it('creates heatmap.config.ts in --yes mode with defaults', async () => {
    await runInit({
      cwd: workdir,
      yes: true,
      force: false,
      defaults: {
        site: 'https://example.com',
        page: '/',
        goal: 'TBD',
      },
    })
    const file = join(workdir, 'heatmap.config.ts')
    expect(existsSync(file)).toBe(true)
    const text = readFileSync(file, 'utf8')
    expect(text).toContain("site: 'https://example.com'")
    expect(text).toContain("goal: 'TBD'")
  })

  it('refuses to overwrite without --force in --yes mode', async () => {
    await runInit({
      cwd: workdir,
      yes: true,
      force: false,
      defaults: { site: 'https://a.com', page: '/', goal: 'a' },
    })
    await expect(
      runInit({
        cwd: workdir,
        yes: true,
        force: false,
        defaults: { site: 'https://b.com', page: '/', goal: 'b' },
      }),
    ).rejects.toThrow(/exists/)
  })

  it('overwrites with --force', async () => {
    await runInit({
      cwd: workdir,
      yes: true,
      force: false,
      defaults: { site: 'https://a.com', page: '/', goal: 'a' },
    })
    await runInit({
      cwd: workdir,
      yes: true,
      force: true,
      defaults: { site: 'https://b.com', page: '/', goal: 'b' },
    })
    const text = readFileSync(join(workdir, 'heatmap.config.ts'), 'utf8')
    expect(text).toContain("site: 'https://b.com'")
  })
})
