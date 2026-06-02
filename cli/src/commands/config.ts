import { join } from 'node:path'
import type { Command } from 'commander'
import { loadConfig, persistConfig } from '../lib/config-loader'
import { getByPath, setByPath } from '../lib/dot-path'

interface GetOpts {
  cwd: string
  key: string
}

interface SetOpts {
  cwd: string
  key: string
  value: string
}

export async function runConfigGet({ cwd, key }: GetOpts): Promise<string> {
  const config = await loadConfig(join(cwd, 'heatmap.config.ts'))
  const value = getByPath(config as unknown as Record<string, unknown>, key)
  if (value === undefined) {
    throw new Error(`key not found: ${key}`)
  }
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export async function runConfigSet({ cwd, key, value }: SetOpts): Promise<void> {
  const path = join(cwd, 'heatmap.config.ts')
  const config = await loadConfig(path)
  setByPath(config as unknown as Record<string, unknown>, key, value)
  persistConfig(path, config)
}

export function configCommand(program: Command): void {
  const cfg = program.command('config').description('Read/write heatmap.config.ts')

  cfg
    .command('get <key>')
    .description('Print a config value (dot-path supported)')
    .action(async (key: string) => {
      try {
        const out = await runConfigGet({ cwd: process.cwd(), key })
        console.log(out)
      } catch (e) {
        console.error(`[heatmapx] error: ${(e as Error).message}`)
        process.exit(1)
      }
    })

  cfg
    .command('set <key> <value>')
    .description('Update a config value (dot-path supported)')
    .action(async (key: string, value: string) => {
      try {
        await runConfigSet({ cwd: process.cwd(), key, value })
        console.error(`[heatmapx] set ${key} = ${value}`)
      } catch (e) {
        console.error(`[heatmapx] error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
