import { describe, it, expect, vi } from 'vitest'
import {
  nodeSupportsEnvProxy,
  proxyConfigured,
  relaunchWithEnvProxy,
  shouldRelaunchForProxy,
  unsupportedProxyNotice,
} from '../lib/proxy'

describe('proxy', () => {
  it('プロキシの環境変数があれば設定ありと判定する（小文字も）', () => {
    expect(proxyConfigured({})).toBe(false)
    expect(proxyConfigured({ HTTPS_PROXY: '' })).toBe(false)
    expect(proxyConfigured({ HTTPS_PROXY: 'http://proxy:8080' })).toBe(true)
    expect(proxyConfigured({ http_proxy: 'http://proxy:8080' })).toBe(true)
  })

  it('プロキシあり・NODE_USE_ENV_PROXY 未指定のときだけ起動し直す', () => {
    expect(shouldRelaunchForProxy({})).toBe(false)
    expect(shouldRelaunchForProxy({ HTTPS_PROXY: 'http://p:1' })).toBe(true)
    // 付け直した子プロセス側ではもう起動し直さない（無限ループ防止）
    expect(shouldRelaunchForProxy({ HTTPS_PROXY: 'http://p:1', NODE_USE_ENV_PROXY: '1' })).toBe(false)
    // 利用者が明示的に切っている場合は尊重する
    expect(shouldRelaunchForProxy({ HTTPS_PROXY: 'http://p:1', NODE_USE_ENV_PROXY: '0' })).toBe(false)
  })

  it('起動し直すときは NODE_USE_ENV_PROXY=1 を付け、子の終了コードを返す', () => {
    const run = vi.fn().mockReturnValue({ status: 3 })
    const code = relaunchWithEnvProxy({ HTTPS_PROXY: 'http://p:1' }, run as never)
    expect(code).toBe(3)
    const [, , opts] = run.mock.calls[0]
    expect(opts.env.NODE_USE_ENV_PROXY).toBe('1')
    expect(opts.env.HTTPS_PROXY).toBe('http://p:1')
    expect(opts.stdio).toBe('inherit')
  })

  it('プロキシなしなら何もしない。起動し直しに失敗したら続行する', () => {
    const run = vi.fn()
    expect(relaunchWithEnvProxy({}, run as never)).toBeNull()
    expect(run).not.toHaveBeenCalled()
    const failing = vi.fn().mockReturnValue({ error: new Error('spawn failed'), status: null })
    expect(relaunchWithEnvProxy({ HTTPS_PROXY: 'http://p:1' }, failing as never)).toBeNull()
  })

  it('NODE_USE_ENV_PROXY に対応している Node を見分ける', () => {
    expect(nodeSupportsEnvProxy('20.19.0')).toBe(false)
    expect(nodeSupportsEnvProxy('22.20.0')).toBe(false)
    expect(nodeSupportsEnvProxy('22.21.0')).toBe(true)
    expect(nodeSupportsEnvProxy('23.11.0')).toBe(false)
    expect(nodeSupportsEnvProxy('24.4.1')).toBe(false)
    expect(nodeSupportsEnvProxy('24.5.0')).toBe(true)
    expect(nodeSupportsEnvProxy('26.12.1')).toBe(true)
  })

  it('プロキシあり・Node が非対応のときだけ案内を返す', () => {
    expect(unsupportedProxyNotice({}, '20.19.0')).toBeNull()
    expect(unsupportedProxyNotice({ HTTPS_PROXY: 'http://p:1' }, '24.5.0')).toBeNull()
    expect(unsupportedProxyNotice({ HTTPS_PROXY: 'http://p:1' }, '20.19.0')).toContain('Node 22.21+')
  })
})
