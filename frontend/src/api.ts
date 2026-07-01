export type Tenant = {
  id: string
  name: string
  description: string
  scaleFactor?: number | null
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
  data: Record<string, unknown>
}

export type GraphLink = {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  label: string
  relationship: string
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

export async function fetchTenants(): Promise<Tenant[]> {
  return fetchJson<Tenant[]>('/api/tenants')
}

export async function fetchTimeRange(tenantId: string): Promise<TimeRange> {
  return fetchJson<TimeRange>(`/api/time-range?tenant=${encodeURIComponent(tenantId)}`)
}

export async function fetchGraph(tenantId: string, timestamp: number): Promise<GraphPayload> {
  const params = new URLSearchParams({
    tenant: tenantId,
    t: String(timestamp),
  })

  return fetchJson<GraphPayload>(`/api/graph?${params.toString()}`)
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

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
