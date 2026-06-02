import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm, mkdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('../lib/api-client', () => ({
  patchFindFile: vi.fn(async () => ({
    target_file: 'src/Hero.tsx',
    confidence: 0.9,
    usage: { used: 2, quota: 100, plan: 'pro' },
  })),
  patchGenerateDiff: vi.fn(async () => ({
    original: 'AI ヒートマップ計測',
    modified: 'Claude Code から叩ける AI ヒートマップ',
    usage: { used: 3, quota: 100, plan: 'pro' },
  })),
}))

vi.mock('../lib/credentials', () => ({
  defaultCredentialsPath: vi.fn(() => '/tmp/fake-creds.json'),
  loadCredentials: vi.fn(() => ({ api_key: 'hmx_live_x', email: 'a@b.com' })),
}))

vi.mock('../lib/config-loader', () => ({
  loadConfig: vi.fn(async () => ({
    site: 'https://example.com',
    page: '/',
    goal: 'g',
    variants: [{ name: 'control' }],
    targets: ['src/**/*.tsx'],
  })),
}))

vi.mock('@inquirer/prompts', () => ({
  number: vi.fn(),
  confirm: vi.fn(async () => true),
  input: vi.fn(),
}))

import { runPatch } from '../commands/patch'
import { input as promptInput } from '@inquirer/prompts'

describe('runPatch', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'hmx-patch-'))
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(
      join(dir, 'src/Hero.tsx'),
      'export const Hero = () => <h1>AI ヒートマップ計測</h1>;\n',
    )
    await writeFile(
      join(dir, 'analysis.md'),
      `## 観察\nfoo\n\n## 改善提案（優先度順 2件）\n### 1. Hero の見出しを変更\n- 観察した課題：弱い\n- 改善案：強める\n\n### 2. CTA文言\n- 観察した課題：曖昧\n`,
    )
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('提案番号と対象ファイルを明示すれば対話なしで patch を出力', async () => {
    const result = await runPatch({
      cwd: dir,
      analysisPath: join(dir, 'analysis.md'),
      outputDir: join(dir, 'patches'),
      dryRun: false,
      forcedSuggestion: 1,
      forcedTarget: 'src/Hero.tsx',
    })
    expect(result.outputPath).toMatch(/patches\/\d{4}-\d{2}-\d{2}-hero.*\.patch$/)
    const written = await readFile(result.outputPath, 'utf8')
    expect(written).toContain('--- a/src/Hero.tsx')
    expect(written).toContain('-export const Hero = () => <h1>AI ヒートマップ計測</h1>')
    expect(written).toContain('+export const Hero = () => <h1>Claude Code')
    expect(result.targetFile).toBe('src/Hero.tsx')
    expect(result.suggestion.title).toBe('Hero の見出しを変更')
  })

  it('dry-run はファイルを書き出さず diff を返す', async () => {
    const result = await runPatch({
      cwd: dir,
      analysisPath: join(dir, 'analysis.md'),
      outputDir: join(dir, 'patches'),
      dryRun: true,
      forcedSuggestion: 1,
      forcedTarget: 'src/Hero.tsx',
    })
    expect(result.outputPath).toBe('<dry-run>')
    expect(result.diff).toContain('--- a/src/Hero.tsx')
  })

  it('提案が見つからない analysis.md は例外', async () => {
    await writeFile(join(dir, 'empty.md'), '## 観察\nfoo\n')
    await expect(
      runPatch({
        cwd: dir,
        analysisPath: join(dir, 'empty.md'),
        outputDir: join(dir, 'patches'),
        dryRun: true,
        forcedSuggestion: 1,
        forcedTarget: 'src/Hero.tsx',
      }),
    ).rejects.toThrow(/no suggestions/)
  })

  it('Claude が返した original がファイルに無い場合は例外', async () => {
    const apiClient = await import('../lib/api-client')
    vi.mocked(apiClient.patchGenerateDiff).mockResolvedValueOnce({
      original: '存在しないテキスト',
      modified: 'なんでも',
      usage: { used: 1, quota: 100, plan: 'pro' },
    })
    await expect(
      runPatch({
        cwd: dir,
        analysisPath: join(dir, 'analysis.md'),
        outputDir: join(dir, 'patches'),
        dryRun: true,
        forcedSuggestion: 1,
        forcedTarget: 'src/Hero.tsx',
      }),
    ).rejects.toThrow(/該当テキストが見つかりません/)
  })

  it('対象ファイルが薄いラッパー想定でも誘導メッセージで失敗（page.tsx ヒント入り）', async () => {
    const apiClient = await import('../lib/api-client')
    vi.mocked(apiClient.patchGenerateDiff).mockResolvedValueOnce({
      original: '存在しないコピー',
      modified: '新コピー',
      usage: { used: 1, quota: 100, plan: 'pro' },
    })
    await expect(
      runPatch({
        cwd: dir,
        analysisPath: join(dir, 'analysis.md'),
        outputDir: join(dir, 'patches'),
        dryRun: true,
        forcedSuggestion: 1,
        forcedTarget: 'src/Hero.tsx',
      }),
    ).rejects.toThrow(/コンポーネントや i18n 辞書/)
  })

  it('--target が絶対パスなら diff ヘッダーは cwd 相対に正規化される', async () => {
    const absTarget = join(dir, 'src/Hero.tsx')
    const result = await runPatch({
      cwd: dir,
      analysisPath: join(dir, 'analysis.md'),
      outputDir: join(dir, 'patches'),
      dryRun: true,
      forcedSuggestion: 1,
      forcedTarget: absTarget,
    })
    // 修正前は `a//Users/.../src/Hero.tsx` というダブルスラッシュ絶対パスになっていた
    expect(result.diff).toContain('--- a/src/Hero.tsx')
    expect(result.diff).toContain('+++ b/src/Hero.tsx')
    expect(result.diff).not.toMatch(/--- a\/\//)
    expect(result.targetFile).toBe('src/Hero.tsx')
  })

  it('--target が cwd の外を指す絶対パスは拒否', async () => {
    await expect(
      runPatch({
        cwd: dir,
        analysisPath: join(dir, 'analysis.md'),
        outputDir: join(dir, 'patches'),
        dryRun: true,
        forcedSuggestion: 1,
        forcedTarget: '/etc/passwd',
      }),
    ).rejects.toThrow(/cwd の外/)
  })

  it('targets が空配列の config は例外', async () => {
    const cfg = await import('../lib/config-loader')
    vi.mocked(cfg.loadConfig).mockResolvedValueOnce({
      site: 'https://example.com',
      page: '/',
      goal: 'g',
      variants: [{ name: 'control' }],
      targets: [],
    })
    await expect(
      runPatch({
        cwd: dir,
        analysisPath: join(dir, 'analysis.md'),
        outputDir: join(dir, 'patches'),
        dryRun: true,
        forcedSuggestion: 1,
      }),
    ).rejects.toThrow(/targets/)
  })

  it('confidence < 0.4 のときは @inquirer/prompts.input でフォールバック', async () => {
    const apiClient = await import('../lib/api-client')
    vi.mocked(apiClient.patchFindFile).mockResolvedValueOnce({
      target_file: 'src/Hero.tsx',
      confidence: 0.2,
      usage: { used: 1, quota: 100, plan: 'pro' },
    })
    vi.mocked(promptInput).mockResolvedValueOnce('src/Hero.tsx')

    const result = await runPatch({
      cwd: dir,
      analysisPath: join(dir, 'analysis.md'),
      outputDir: join(dir, 'patches'),
      dryRun: true,
      forcedSuggestion: 1,
      // forcedTarget を渡さないことで find_file ブランチに入れる
    })
    expect(promptInput).toHaveBeenCalledOnce()
    expect(result.targetFile).toBe('src/Hero.tsx')
  })

  it('Claude が候補外のパスを返したら例外（defense-in-depth）', async () => {
    const apiClient = await import('../lib/api-client')
    vi.mocked(apiClient.patchFindFile).mockResolvedValueOnce({
      target_file: '/etc/passwd',
      confidence: 0.99,
      usage: { used: 1, quota: 100, plan: 'pro' },
    })
    await expect(
      runPatch({
        cwd: dir,
        analysisPath: join(dir, 'analysis.md'),
        outputDir: join(dir, 'patches'),
        dryRun: true,
        forcedSuggestion: 1,
      }),
    ).rejects.toThrow(/not in the candidate set/)
  })
})
