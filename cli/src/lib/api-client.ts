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

export interface AnalyzeResponseBody {
  analysis_run_id: string
  markdown: string
  screenshot_url: string
  duration_ms: number
  cost_usd: number
  usage: { used: number; quota: number; plan: string }
  summary?: HeatmapSummaryDTO
}

export async function cliAnalyze(
  apiKey: string,
  body: {
    url: string
    hypothesis: { goal: string; variants: { name: string }[] }
    period?: AnalyzePeriod
    lang?: 'en' | 'ja'
  },
): Promise<AnalyzeResponseBody> {
  const res = await fetch(`${baseUrl()}/api/cli/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await readApiError(res))
  }
  return res.json() as Promise<AnalyzeResponseBody>
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

export interface PatchFindFileBody {
  suggestion: string
  analysis_run_id?: string
  target_candidates: { path: string; content: string }[]
}

export interface PatchFindFileResponse {
  target_file: string
  confidence: number
  usage: { used: number; quota: number; plan: string }
}

export async function patchFindFile(
  apiKey: string,
  body: PatchFindFileBody,
): Promise<PatchFindFileResponse> {
  const res = await fetch(`${baseUrl()}/api/cli/patch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ mode: 'find_file', ...body }),
  })
  if (!res.ok) {
    throw new Error(await readApiError(res))
  }
  return res.json() as Promise<PatchFindFileResponse>
}

export interface PatchGenerateDiffBody {
  suggestion: string
  analysis_run_id?: string
  file_path: string
  file_content: string
}

export interface PatchGenerateDiffResponse {
  original: string
  modified: string
  usage: { used: number; quota: number; plan: string }
}

export async function patchGenerateDiff(
  apiKey: string,
  body: PatchGenerateDiffBody,
): Promise<PatchGenerateDiffResponse> {
  const res = await fetch(`${baseUrl()}/api/cli/patch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ mode: 'generate_diff', ...body }),
  })
  if (!res.ok) {
    throw new Error(await readApiError(res))
  }
  return res.json() as Promise<PatchGenerateDiffResponse>
}
