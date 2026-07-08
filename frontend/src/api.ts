export type Tenant = {
  id: string
  name: string
  description: string
  scaleFactor?: number | null
  createdAt?: number | null
}

export type LoginRequest = {
  endpoint: string
  username: string
  password: string
}

export type LoginResponse = {
  sessionId: string
  endpoint: string
  username: string
}

export type DatabaseInfo = {
  name: string
}

export type TimeRange = {
  min: number
  max: number
  now: number
}

export type GraphNodeGroup = 'device' | 'software' | 'location' | 'alert'

export type GraphNode = {
  id: string
  label: string
  group: GraphNodeGroup
  key?: string
  arangoId?: string
  created?: number
  expired?: number
  activeAt: number
  tenantId?: string
  data: Record<string, unknown>
}

export type GraphLink = {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  label: string
  relationship: string
  tenantId?: string
  data: Record<string, unknown>
}

export type GraphCounts = {
  devices: number
  software: number
  locations: number
  alerts: number
  links: number
}

export type GraphPayload = {
  timestamp: number
  nodes: GraphNode[]
  links: GraphLink[]
  edges: GraphLink[]
  counts: GraphCounts
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/api/login', {
    method: 'POST',
    body: payload,
  })
}

export async function logout(sessionId: string): Promise<void> {
  await fetchJson<{ ok: boolean }>('/api/logout', {
    method: 'POST',
    sessionId,
  })
}

export async function fetchDatabases(sessionId: string): Promise<DatabaseInfo[]> {
  const databaseNames = await fetchJson<string[]>('/api/databases', { sessionId })
  return databaseNames.map((name) => ({ name }))
}

export async function selectDatabase(sessionId: string, databaseName: string): Promise<void> {
  await fetchJson<{ databaseName: string }>('/api/database', {
    method: 'POST',
    sessionId,
    body: { databaseName },
  })
}

export async function fetchTenants(sessionId: string): Promise<Tenant[]> {
  return fetchJson<Tenant[]>('/api/tenants', { sessionId })
}

export async function fetchTimeRange(sessionId: string, tenantIds: string[]): Promise<TimeRange> {
  return fetchJson<TimeRange>(`/api/time-range?${buildTenantParams(tenantIds)}`, { sessionId })
}

export async function fetchGraph(sessionId: string, tenantIds: string[], timestamp: number): Promise<GraphPayload> {
  const params = buildTenantParams(tenantIds)
  params.set('t', String(timestamp))

  return fetchJson<GraphPayload>(`/api/graph?${params.toString()}`, { sessionId })
}

function buildTenantParams(tenantIds: string[]) {
  const params = new URLSearchParams()

  tenantIds.forEach((tenantId) => params.append('tenant', tenantId))

  return params
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  sessionId?: string
  body?: unknown
}

async function fetchJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers()

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.sessionId) {
    headers.set('X-Session-Id', options.sessionId)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const detail = await readErrorDetail(response)
    throw new Error(detail || `${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: string }
    return body.detail ?? null
  } catch {
    return null
  }
}
