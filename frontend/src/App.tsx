import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGraph, fetchTenants, fetchTimeRange } from './api'
import type { GraphPayload, Tenant, TimeRange } from './api'
import { GraphView } from './components/GraphView'
import { TenantSelect } from './components/TenantSelect'
import { TimeSlider } from './components/TimeSlider'

function App() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null)
  const [selectedTime, setSelectedTime] = useState<number | null>(null)
  const [debouncedTime, setDebouncedTime] = useState<number | null>(null)
  const [graph, setGraph] = useState<GraphPayload | null>(null)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    fetchTenants()
      .then((tenantList) => {
        if (!isActive) {
          return
        }

        setTenants(tenantList)
        setSelectedTenantId(tenantList[0]?.id ?? null)
      })
      .catch((caughtError: unknown) => setError(toErrorMessage(caughtError)))
      .finally(() => {
        if (isActive) {
          setLoadingTenants(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!selectedTenantId) {
      return undefined
    }

    let isActive = true
    setError(null)
    setTimeRange(null)
    setGraph(null)

    fetchTimeRange(selectedTenantId)
      .then((range) => {
        if (!isActive) {
          return
        }

        setTimeRange(range)
        setSelectedTime(range.now)
        setDebouncedTime(range.now)
      })
      .catch((caughtError: unknown) => setError(toErrorMessage(caughtError)))

    return () => {
      isActive = false
    }
  }, [selectedTenantId])

  useEffect(() => {
    if (selectedTime === null) {
      return undefined
    }

    const timerId = window.setTimeout(() => setDebouncedTime(selectedTime), 250)
    return () => window.clearTimeout(timerId)
  }, [selectedTime])

  useEffect(() => {
    if (!selectedTenantId || debouncedTime === null) {
      return undefined
    }

    let isActive = true
    setLoadingGraph(true)
    setError(null)

    fetchGraph(selectedTenantId, debouncedTime)
      .then((snapshot) => {
        if (isActive) {
          setGraph(snapshot)
        }
      })
      .catch((caughtError: unknown) => setError(toErrorMessage(caughtError)))
      .finally(() => {
        if (isActive) {
          setLoadingGraph(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [debouncedTime, selectedTenantId])

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants],
  )

  const handleTimeChange = useCallback((timestamp: number) => {
    setSelectedTime(timestamp)
  }, [])

  return (
    <main className="min-h-screen px-5 py-6 text-slate-100 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">ArangoDB Time Travel</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">
              Interactive Temporal Graph
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 lg:text-base">
              Scrub through tenant history to inspect the active device and software versions, topology, locations, and
              alert state at a specific point in time.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <span className="text-slate-500">Backend:</span> FastAPI + live ArangoDB AQL
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <TenantSelect
                tenants={tenants}
                selectedTenantId={selectedTenantId}
                onChange={setSelectedTenantId}
                disabled={loadingTenants}
              />
              {selectedTenant ? (
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {selectedTenant.description || `Scale factor ${selectedTenant.scaleFactor ?? 'unknown'}`}
                </p>
              ) : null}
            </section>

            <TimeSlider
              range={timeRange}
              value={selectedTime}
              onChange={handleTimeChange}
              disabled={!selectedTenantId || loadingGraph}
            />

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Legend</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <LegendItem color="bg-cyan-300" label="Device version active at timestamp" />
                <LegendItem color="bg-violet-300" label="Software version active at timestamp" />
                <LegendItem color="bg-emerald-300" label="Location" />
                <LegendItem color="bg-rose-300" label="Alert active at timestamp" />
              </div>
            </section>
          </aside>

          <GraphView graph={graph} loading={loadingGraph} />
        </div>
      </div>
    </main>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  )
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred'
}

export default App
