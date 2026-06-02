import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Command } from 'commander'
import { input, confirm } from '@inquirer/prompts'
import { persistConfig } from '../lib/config-loader'
import type { HeatmapConfig } from '../lib/schema'

interface InitOptions {
  cwd: string
  yes: boolean
  force: boolean
  defaults?: Partial<{ site: string; page: string; goal: string }>
}

export async function runInit(opts: InitOptions): Promise<void> {
  const target = join(opts.cwd, 'heatmap.config.ts')

  if (existsSync(target) && !opts.force) {
    if (opts.yes) {
      throw new Error(`heatmap.config.ts already exists at ${target} — pass --force to overwrite`)
    }
    const ok = await confirm({ message: `${target} exists. Overwrite?`, default: false })
    if (!ok) return
  }

  const site = opts.yes
    ? opts.defaults?.site ?? 'https://example.com'
    : await input({
        message: 'Site URL',
        default: opts.defaults?.site ?? 'https://example.com',
      })

  const page = opts.yes
    ? opts.defaults?.page ?? '/'
    : await input({ message: 'Page path to track', default: '/' })

  const goal = opts.yes
    ? opts.defaults?.goal ?? 'TBD'
    : await input({
        message: 'Goal of the first hypothesis',
        default: 'Lift CTA reach rate',
      })

  const config: HeatmapConfig = {
    site,
    page,
    goal,
    variants: [{ name: 'control' }],
    targets: [],
  }

  persistConfig(target, config)

  if (!opts.yes) {
    console.error(`\n[heatmapx] heatmap.config.ts written to ${target}`)
    console.error('[heatmapx] Try: heatmapx config get site')
  }
}

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Create heatmap.config.ts in the current directory')
    .option('--force', 'Overwrite existing heatmap.config.ts')
    .option('--yes', 'Use defaults without prompting (CI/E2E)')
    .action(async (opts: { force?: boolean; yes?: boolean }) => {
      await runInit({
        cwd: process.cwd(),
        yes: opts.yes ?? false,
        force: opts.force ?? false,
      })
    })
}
