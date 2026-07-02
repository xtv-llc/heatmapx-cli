const DEFAULT_BASE = 'https://heatmapx.com'

export function baseUrl(): string {
  return process.env.HEATMAPX_API_URL || DEFAULT_BASE
}

export interface InitResponse {
  user_code: string
  device_code: string
  verify_url: string
  verify_url_complete: string
  expires_in: number
  interval: number
}

export async function authInit(): Promise<InitResponse> {
  const res = await fetch(`${baseUrl()}/api/cli/auth/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_name: 'heatmapx' }),
  })
  if (!res.ok) throw new Error(`auth/init failed: ${res.status}`)
  return res.json() as Promise<InitResponse>
}

export type PollResponse =
  | { status: 'pending' }
  | { status: 'approved'; api_key: string; email: string }
  | { status: 'expired' | 'not_found'; error?: string }

export async function authPoll(device_code: string): Promise<PollResponse> {
  const res = await fetch(`${baseUrl()}/api/cli/auth/poll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_code }),
  })
  return res.json() as Promise<PollResponse>
}

export type AnalyzePeriod = { days: number } | { from: string; to: string }

export interface HeatmapSummaryDTO {
  period: { from: string; to: string }
  clickZones: { row: string; cols: number[] }[]
  totalClicks: number
  scrollReach: { 25: number; 50: number; 75: number; 100: number }
  totalSessions: number
  lowData: boolean
}

export interface DataResponse {
  url: string
  period: { from: string; to: string }
  site_found: boolean
  summary: HeatmapSummaryDTO | null
  screenshot_url?: string
}

export async function fetchData(
  apiKey: string,
  body: {
    url: string
    period?: AnalyzePeriod
    include_screenshot?: boolean
  },
): Promise<DataResponse> {
  const res = await fetch(`${baseUrl()}/api/cli/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await readApiError(res))
  }
  return res.json() as Promise<DataResponse>
}

// Format `{error, message}` API responses as `<error>: <message>` so the CLI
// can surface server-side reasons (e.g. why patch_failed) instead of just the
// generic error code.
async function readApiError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: string
    message?: string
  }
  const code = body.error ?? `http_${res.status}`
  return body.message ? `${code}: ${body.message}` : code
}

export interface UsageResponse {
  email: string | null
  plan: string
  usage: { used: number; quota: number | null }
}

export async function getUsage(apiKey: string): Promise<UsageResponse> {
  const res = await fetch(`${baseUrl()}/api/cli/usage`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`usage_failed: ${res.status}`)
  return res.json() as Promise<UsageResponse>
}
