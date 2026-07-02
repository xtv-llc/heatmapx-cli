import type { Command } from 'commander'
import { handleDataError, runDataCli, type DataCliFlags } from './data'

export const ANALYZE_ALIAS_NOTICE =
  "[heatmapx] Note: since v0.4.0, analysis runs in YOUR AI agent (Claude Code / Codex). This command now fetches data only — same as 'heatmapx data'."

export function analyzeCommand(program: Command): void {
  program
    .command('analyze [path]')
    .description("Alias of 'data': fetch heatmap data (analysis runs in your AI agent)")
    .option('--json', 'Output raw JSON instead of a human-readable summary')
    .option('-o, --output <file>', 'Write the output to a file')
    .option('--days <n>', 'Heatmap period: last N days (default 30)')
    .option('--from <date>', 'Heatmap period start (YYYY-MM-DD)')
    .option('--to <date>', 'Heatmap period end (YYYY-MM-DD)')
    .option('--screenshot', 'Include a page screenshot URL in the response')
    .action(async (path: string | undefined, opts: DataCliFlags) => {
      console.error(ANALYZE_ALIAS_NOTICE)
      try {
        await runDataCli(path, opts)
      } catch (e) {
        handleDataError(e)
      }
    })
}
