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
import { experimentsCommand } from './commands/experiments'
import { sitesCommand } from './commands/sites'
import { relaunchWithEnvProxy, unsupportedProxyNotice } from './lib/proxy'

// プロキシ環境（HTTPS_PROXY など）では、プロキシを通る設定で自分を起動し直す。
// 利用者が NODE_USE_ENV_PROXY=1 を手で付けなくても動くようにする。
const relaunched = relaunchWithEnvProxy()
if (relaunched !== null) process.exit(relaunched)

// プロキシ環境なのに Node が古くて通れない場合、失敗で終わるときに理由を添える。
process.on('exit', (code) => {
  if (code === 0) return
  const notice = unsupportedProxyNotice()
  if (notice) console.error(`[heatmapx] ${notice}`)
})

// バージョンは package.json を唯一のソースにする（ハードコードしてズレるのを防ぐ）
const { version } = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as { version: string }

const program = new Command()

program
  .name('heatmapx')
  .description('HeatMapX CLI — Claude Code-native heatmap analysis')
  .version(version)
  // 親コマンド（experiments / sites）の --json が、サブコマンド側の --json を
  // 横取りしないようにする（`experiments results <id> --json` が整形表示になる不具合の修正）。
  // サブコマンドで enablePositionalOptions() を使うには root でも有効化が必要。
  .enablePositionalOptions()

initCommand(program)
configCommand(program)
loginCommand(program)
logoutCommand(program)
whoamiCommand(program)
dataCommand(program)
analyzeCommand(program)
experimentsCommand(program)
sitesCommand(program)
patchCommand(program)

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`[heatmapx] fatal: ${err.message}`)
  process.exit(1)
})
