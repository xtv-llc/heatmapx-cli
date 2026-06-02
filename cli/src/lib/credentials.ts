import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, chmodSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export interface Credentials {
  api_key: string
  email: string
  saved_at?: string
}

export function defaultCredentialsPath(): string {
  return join(homedir(), '.heatmapx', 'credentials.json')
}

export function saveCredentials(path: string, creds: Credentials): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const payload: Credentials = { ...creds, saved_at: new Date().toISOString() }
  writeFileSync(path, JSON.stringify(payload, null, 2), { mode: 0o600 })
  chmodSync(path, 0o600)
}

export function loadCredentials(path: string): Credentials | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Credentials
  } catch {
    return null
  }
}

export function deleteCredentials(path: string): void {
  if (existsSync(path)) unlinkSync(path)
}
