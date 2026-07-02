#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Command } from 'commander'
import { initCommand } from './commands/init'
import { configCommand } from './commands/config'
import { loginCommand } from './commands/login'
import { logoutCommand } from './commands/logout'
import { whoamiCommand } from './commands/whoami'
import { analyzeCommand } from './commands/analyze'
import { dataCommand } from './commands/data'
import { patchCommand } from './commands/patch'

// バージョンは package.json を唯一のソースにする（ハードコードしてズレるのを防ぐ）
const { version } = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as { version: string }

const program = new Command()

program
  .name('heatmapx')
  .description('HeatMapX CLI — Claude Code-native heatmap analysis')
  .version(version)

initCommand(program)
configCommand(program)
loginCommand(program)
logoutCommand(program)
whoamiCommand(program)
dataCommand(program)
analyzeCommand(program)
patchCommand(program)

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`[heatmapx] fatal: ${err.message}`)
  process.exit(1)
})
