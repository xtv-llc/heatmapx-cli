import { spawnSync } from 'node:child_process'

const PROXY_VARS = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy']

/** プロキシの環境変数が設定されているか */
export function proxyConfigured(env: NodeJS.ProcessEnv): boolean {
  return PROXY_VARS.some((k) => (env[k] ?? '').trim() !== '')
}

/**
 * Node 標準の fetch は、既定では HTTPS_PROXY / HTTP_PROXY を見ない。
 * NODE_USE_ENV_PROXY=1 を付けて起動したときだけプロキシを通る（Node 22.21+ / 24.5+）。
 * 利用者に付けさせる代わりに、プロキシが設定されていて未指定なら CLI が自分で付け直す。
 * 利用者が NODE_USE_ENV_PROXY を明示している（0 を含む）ときは、その指定を尊重する。
 */
export function shouldRelaunchForProxy(env: NodeJS.ProcessEnv): boolean {
  return proxyConfigured(env) && env.NODE_USE_ENV_PROXY === undefined
}

/**
 * プロキシが設定されていれば、NODE_USE_ENV_PROXY=1 を付けて自分自身を起動し直す。
 * 起動し直した場合は子プロセスの終了コードを返す（呼び出し側はそのコードで終了する）。
 * 起動し直さない場合は null。
 */
export function relaunchWithEnvProxy(
  env: NodeJS.ProcessEnv = process.env,
  run: typeof spawnSync = spawnSync
): number | null {
  if (!shouldRelaunchForProxy(env)) return null
  const child = run(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...env, NODE_USE_ENV_PROXY: '1' },
  })
  if (child.error) return null // 起動し直せないときは、そのまま続行する
  return child.status ?? 1
}

/** この Node が NODE_USE_ENV_PROXY に対応しているか（22.21+ / 24.5+ / 25+） */
export function nodeSupportsEnvProxy(version: string = process.versions.node): boolean {
  const [major, minor] = version.split('.').map((n) => parseInt(n, 10))
  if (major >= 25) return true
  if (major === 24) return minor >= 5
  if (major === 22) return minor >= 21
  return false
}

/**
 * プロキシが設定されているのに、この Node では通れないときの案内文。
 * 該当しないときは null。
 */
export function unsupportedProxyNotice(
  env: NodeJS.ProcessEnv = process.env,
  version: string = process.versions.node
): string | null {
  if (!proxyConfigured(env) || nodeSupportsEnvProxy(version)) return null
  return (
    `A proxy is configured (HTTPS_PROXY/HTTP_PROXY), but Node ${version} cannot route requests through it. ` +
    'Upgrade to Node 22.21+ or 24.5+ to use heatmapx behind a proxy.'
  )
}
