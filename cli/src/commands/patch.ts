import type { Command } from 'commander'

export const PATCH_RETIRED_NOTICE =
  "[heatmapx] 'patch' has been retired. Your AI agent now edits code directly: run 'heatmapx data', let Claude Code / Codex analyze it, and ask it to apply the change and open a PR (the official HeatMapX skill automates this)."

export function patchCommand(program: Command): void {
  program
    .command('patch [analysis-markdown]')
    .description('(retired) analysis & patching now run in your AI agent')
    // 旧バージョンの --suggestion / --target 等を付けて呼ばれても
    // usage エラーにせず、必ず案内メッセージを出す
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(() => {
      console.error(PATCH_RETIRED_NOTICE)
      process.exit(1)
    })
}
