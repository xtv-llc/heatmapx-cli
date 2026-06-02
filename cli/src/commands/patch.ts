import type { Command } from 'commander'
import { readFile } from 'node:fs/promises'
import { join, isAbsolute, relative } from 'node:path'
import { defaultCredentialsPath, loadCredentials } from '../lib/credentials'
import { loadConfig } from '../lib/config-loader'
import { extractSuggestions } from '../lib/analysis-loader'
import { resolveTargets } from '../lib/target-resolver'
import {
  buildUnifiedDiff,
  slugify,
  todayString,
  writePatchFile,
} from '../lib/diff-writer'
import { patchFindFile, patchGenerateDiff } from '../lib/api-client'

export interface RunPatchOptions {
  cwd: string
  analysisPath: string
  outputDir: string
  dryRun: boolean
  credentialsPath?: string
  forcedSuggestion?: number
  forcedTarget?: string
  onMessage?: (msg: string) => void
}

export interface RunPatchResult {
  outputPath: string
  diff: string
  targetFile: string
  suggestion: { index: number; title: string }
  usage: { used: number; quota: number; plan: string }
}

export async function runPatch(opts: RunPatchOptions): Promise<RunPatchResult> {
  const log = opts.onMessage ?? ((m) => console.error(m))

  // 1. parse analysis.md
  const md = await readFile(opts.analysisPath, 'utf8')
  const suggestions = extractSuggestions(md)
  if (suggestions.length === 0) {
    throw new Error(`no suggestions found in ${opts.analysisPath}`)
  }

  // 2. select suggestion
  let chosen = suggestions.find((s) => s.index === opts.forcedSuggestion)
  if (!chosen) {
    if (opts.forcedSuggestion !== undefined) {
      throw new Error(`suggestion #${opts.forcedSuggestion} not found in analysis`)
    }
    const { number } = await import('@inquirer/prompts')
    log('\n提案一覧:')
    for (const s of suggestions) log(`  ${s.index}. ${s.title}`)
    const value = await number({
      message: 'どれをパッチ化しますか？',
      validate: (v) =>
        (v !== undefined && suggestions.some((s) => s.index === v)) || '範囲外の番号です',
    })
    if (value === undefined) throw new Error('cancelled')
    chosen = suggestions.find((s) => s.index === value)
    if (!chosen) throw new Error('invalid suggestion')
  }

  // 3. config + credentials
  const config = await loadConfig(join(opts.cwd, 'heatmap.config.ts'))
  if (!config.targets || config.targets.length === 0) {
    throw new Error(
      'heatmap.config.ts に targets を設定してください。例: targets: ["src/**/*.tsx"]',
    )
  }
  const credPath = opts.credentialsPath ?? defaultCredentialsPath()
  const creds = loadCredentials(credPath)
  if (!creds) throw new Error('Not logged in. Run `heatmapx login`.')

  // 4. find target file
  let targetFile = opts.forcedTarget
  let candidatePaths: Set<string> | null = null
  if (!targetFile) {
    const candidates = await resolveTargets(opts.cwd, config.targets)
    if (candidates.length === 0) {
      throw new Error('targets glob にマッチするファイルがありません')
    }
    candidatePaths = new Set(candidates.map((c) => c.path))
    log(`[heatmapx] 対象ファイルを推測中... (${candidates.length} 候補)`)
    const find = await patchFindFile(creds.api_key, {
      suggestion: `${chosen.title}\n${chosen.body}`,
      target_candidates: candidates,
    })
    if (find.confidence < 0.4) {
      const { input } = await import('@inquirer/prompts')
      const value = await input({
        message: '対象ファイルが特定できません。パスを入力してください',
      })
      if (!value) throw new Error('cancelled')
      targetFile = value
    } else {
      // Defense-in-depth: server is supposed to pick from candidates only,
      // but reject anything not in our list before reading from disk.
      if (!candidatePaths.has(find.target_file)) {
        throw new Error(
          `target_file "${find.target_file}" is not in the candidate set; refusing to read.`,
        )
      }
      log(`\n推測された対象ファイル: ${find.target_file} (confidence ${find.confidence.toFixed(2)})`)
      const { confirm } = await import('@inquirer/prompts')
      const ok = await confirm({ message: 'OK?', default: true })
      if (!ok) throw new Error('cancelled')
      targetFile = find.target_file
    }
  }

  // 5. normalize absolute --target paths to cwd-relative so the unified diff
  // header is `a/src/foo.tsx` instead of `a//Users/.../src/foo.tsx`
  // (the latter is rejected by `git apply` with "invalid path").
  if (isAbsolute(targetFile)) {
    const rel = relative(opts.cwd, targetFile)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(
        `--target "${targetFile}" は cwd の外を指しています。git apply できないため、cwd 内のパスを指定してください`,
      )
    }
    targetFile = rel
  }

  // 6. read full file content
  const targetAbs = join(opts.cwd, targetFile)
  const fullContent = await readFile(targetAbs, 'utf8')

  // 6. generate diff
  log('[heatmapx] パッチを生成中...')
  const gen = await patchGenerateDiff(creds.api_key, {
    suggestion: `${chosen.title}\n${chosen.body}`,
    file_path: targetFile,
    file_content: fullContent,
  })

  if (!fullContent.includes(gen.original)) {
    throw new Error(
      `対象ファイル ${targetFile} に該当テキストが見つかりません。` +
        `薄いラッパー（例: <Marketing><Pricing /></Marketing> のみ）の page.tsx は --target に向かないことが多いです。` +
        `--target には実際のコピー文字列を含むコンポーネントや i18n 辞書ファイルを指定してください。`,
    )
  }

  const modifiedFull = fullContent.replace(gen.original, gen.modified)
  const diff = buildUnifiedDiff(targetFile, fullContent, modifiedFull)

  if (opts.dryRun) {
    return {
      outputPath: '<dry-run>',
      diff,
      targetFile,
      suggestion: { index: chosen.index, title: chosen.title },
      usage: gen.usage,
    }
  }

  const outputPath = await writePatchFile({
    outputDir: opts.outputDir,
    date: todayString(),
    slug: slugify(chosen.title),
    diff,
  })

  log(`\n✨ ${outputPath} を生成しました`)
  log(`   ファイル: ${targetFile}`)
  log(`\n適用するには:\n  git apply ${outputPath}`)

  return {
    outputPath,
    diff,
    targetFile,
    suggestion: { index: chosen.index, title: chosen.title },
    usage: gen.usage,
  }
}

export function patchCommand(program: Command): void {
  program
    .command('patch <analysis-markdown>')
    .description('analyze 結果から HTML パッチ (unified diff) を生成')
    .option('--suggestion <n>', '提案番号', (v) => parseInt(v, 10))
    .option('--target <path>', '対象ファイルを明示指定')
    .option('--output-dir <dir>', 'パッチ保存先', './patches')
    .option('--dry-run', 'パッチを保存せず stdout に出力', false)
    .action(
      async (
        analysis: string,
        opts: { suggestion?: number; target?: string; outputDir: string; dryRun?: boolean },
      ) => {
        try {
          const result = await runPatch({
            cwd: process.cwd(),
            analysisPath: analysis,
            outputDir: opts.outputDir,
            dryRun: !!opts.dryRun,
            forcedSuggestion: opts.suggestion,
            forcedTarget: opts.target,
          })
          if (opts.dryRun) {
            console.log(result.diff)
          }
          console.error(
            `\nThis month: ${result.usage.used}/${result.usage.quota} used (${result.usage.plan} plan)`,
          )
        } catch (err) {
          const msg = (err as Error).message
          if (msg === 'quota_exceeded') {
            console.error('[heatmapx] Monthly quota exceeded. Upgrade at https://heatmapx.com/pricing')
          } else {
            console.error(`[heatmapx] error: ${msg}`)
          }
          process.exit(1)
        }
      },
    )
}
