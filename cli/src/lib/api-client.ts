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

export interface ExperimentListItem {
  id: string
  site_id: string
  site_url: string | null
  name: string
  status: string
  target_url_pattern: string
  goal_type: string
  start_at: string | null
  end_at: string | null
  created_at: string
}

export interface ExperimentsResponse {
  site_found: boolean
  experiments: ExperimentListItem[]
}

export async function fetchExperiments(
  apiKey: string,
  site?: string,
): Promise<ExperimentsResponse> {
  const qs = site ? `?site=${encodeURIComponent(site)}` : ''
  const res = await fetch(`${baseUrl()}/api/cli/experiments${qs}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    throw new Error(await readApiError(res))
  }
  return res.json() as Promise<ExperimentsResponse>
}

export interface ExperimentResultRowDTO {
  variantId: string
  name: string
  isControl: boolean
  exposures: number
  conversions: number
  rate: number
  uplift: number | null
  probBest: number
}

export interface ExperimentResultsResponse {
  experiment: {
    id: string
    site_id: string
    name: string
    status: string
    target_url_pattern: string
    goal_type: string
    start_at: string | null
    end_at: string | null
  }
  results: { rows: ExperimentResultRowDTO[]; winnerSuggestion: string | null }
}

export async function fetchExperimentResults(
  apiKey: string,
  experimentId: string,
): Promise<ExperimentResultsResponse> {
  const res = await fetch(
    `${baseUrl()}/api/cli/experiments/${encodeURIComponent(experimentId)}/results`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  )
  if (!res.ok) {
    throw new Error(await readApiError(res))
  }
  return res.json() as Promise<ExperimentResultsResponse>
}

export interface CreateSiteResponse {
  site: { id: string; name: string; url: string; api_key: string }
  tracker_snippet: string
}

export async function createSite(
  apiKey: string,
  body: { url: string; name?: string },
): Promise<CreateSiteResponse> {
  const res = await fetch(`${baseUrl()}/api/cli/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<CreateSiteResponse>
}

export async function createExperiment(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ experiment: { id: string; status: string; name: string } }> {
  const res = await fetch(`${baseUrl()}/api/cli/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<{ experiment: { id: string; status: string; name: string } }>
}

export async function setExperimentStatus(
  apiKey: string,
  experimentId: string,
  status: 'running' | 'paused' | 'stopped',
): Promise<{ experiment: { id: string; name: string; status: string } }> {
  const res = await fetch(
    `${baseUrl()}/api/cli/experiments/${encodeURIComponent(experimentId)}/status`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ status }),
    },
  )
  if (!res.ok) throw new Error(await readApiError(res))
  return res.json() as Promise<{ experiment: { id: string; name: string; status: string } }>
}
