import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchDatabases, fetchGraph, fetchTenants, fetchTimeRange, login, logout, selectDatabase } from './api'
import type { DatabaseInfo, GraphPayload, LoginRequest, LoginResponse, Tenant, TimeRange } from './api'
import { DatabaseSelect } from './components/DatabaseSelect'
import { GraphView } from './components/GraphView'
import { LoginForm } from './components/LoginForm'
import { TenantSelect } from './components/TenantSelect'
import { TenantTimeline } from './components/TenantTimeline'
import { TimeSlider } from './components/TimeSlider'

function App() {
  const [session, setSession] = useState<LoginResponse | null>(null)
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null)
  const [selectedTime, setSelectedTime] = useState<number | null>(null)
  const [debouncedTime, setDebouncedTime] = useState<number | null>(null)
  const [graph, setGraph] = useState<GraphPayload | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loadingDatabases, setLoadingDatabases] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedTenantKey = useMemo(() => selectedTenantIds.join('|'), [selectedTenantIds])

  useEffect(() => {
    if (!session || !selectedDatabaseName) {
      return undefined
    }

    let isActive = true
    setError(null)
    setLoadingTenants(true)
    setTenants([])
    setSelectedTenantIds([])
    setTimeRange(null)
    setSelectedTime(null)
    setDebouncedTime(null)
    setGraph(null)
    setIsPlaying(false)

    fetchTenants(session.sessionId)
      .then((tenantList) => {
        if (!isActive) {
          return
        }

        setTenants(tenantList)
        setSelectedTenantIds(tenantList[0] ? [tenantList[0].id] : [])
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
  }, [selectedDatabaseName, session])

  useEffect(() => {
    if (!session || selectedTenantIds.length === 0) {
      setTimeRange(null)
      setSelectedTime(null)
      setDebouncedTime(null)
      setGraph(null)
      return undefined
    }

    let isActive = true
    setError(null)
    setTimeRange(null)
    setSelectedTime(null)
    setDebouncedTime(null)
    setGraph(null)

    fetchTimeRange(session.sessionId, selectedTenantIds)
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
  }, [selectedTenantIds, selectedTenantKey, session])

  useEffect(() => {
    if (selectedTime === null) {
      return undefined
    }

    const timerId = window.setTimeout(() => setDebouncedTime(selectedTime), 250)
    return () => window.clearTimeout(timerId)
  }, [selectedTime])

  useEffect(() => {
    if (!session || selectedTenantIds.length === 0 || debouncedTime === null) {
      return undefined
    }

    let isActive = true
    setLoadingGraph(true)
    setError(null)

    fetchGraph(session.sessionId, selectedTenantIds, debouncedTime)
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
  }, [debouncedTime, selectedTenantIds, selectedTenantKey, session])

  const selectedTenants = useMemo(
    () => tenants.filter((tenant) => selectedTenantIds.includes(tenant.id)),
    [selectedTenantIds, tenants],
  )

  const handleTimeChange = useCallback((timestamp: number) => {
    setSelectedTime(timestamp)
  }, [])

  const handleLogin = useCallback(async (payload: LoginRequest) => {
    setLoadingLogin(true)
    setError(null)

    try {
      const nextSession = await login(payload)
      setSession(nextSession)
      setSelectedDatabaseName(null)
      setTenants([])
      setSelectedTenantIds([])
      setGraph(null)
      setTimeRange(null)
      setLoadingDatabases(true)

      const databaseList = await fetchDatabases(nextSession.sessionId)
      setDatabases(databaseList)
    } catch (caughtError: unknown) {
      setError(toErrorMessage(caughtError))
    } finally {
      setLoadingLogin(false)
      setLoadingDatabases(false)
    }
  }, [])

  const handleDatabaseChange = useCallback(
    async (databaseName: string) => {
      if (!session) {
        return
      }

      setError(null)
      setLoadingDatabases(true)

      try {
        await selectDatabase(session.sessionId, databaseName)
        setSelectedDatabaseName(databaseName)
      } catch (caughtError: unknown) {
        setError(toErrorMessage(caughtError))
      } finally {
        setLoadingDatabases(false)
      }
    },
    [session],
  )

  const handleLogout = useCallback(async () => {
    const sessionId = session?.sessionId

    resetAppState()

    if (sessionId) {
      try {
        await logout(sessionId)
      } catch {
        // The local UI can still clear state even if the backend session already expired.
      }
    }
  }, [session])

  return (
    <main className="min-h-screen text-slate-100">
      <div className="flex min-h-screen flex-col gap-4 px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/30 lg:flex-row lg:items-end lg:p-5">
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
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300 lg:max-w-[38rem]">
            <div>
              <span className="text-slate-500">Backend:</span> FastAPI + live ArangoDB AQL
            </div>
            {session ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-400">
                  {session.username} @ {session.endpoint}
                </span>
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-rose-300 hover:text-rose-200"
                  type="button"
                  onClick={() => void handleLogout()}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {!session ? (
          <LoginForm onSubmit={handleLogin} loading={loadingLogin} />
        ) : (
          <div className="grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:max-h-full lg:overflow-auto lg:pr-1">
              <DatabaseSelect
                databases={databases}
                selectedDatabaseName={selectedDatabaseName}
                onChange={(databaseName) => void handleDatabaseChange(databaseName)}
                disabled={loadingDatabases}
              />

              {selectedDatabaseName ? (
                <>
                  <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <TenantSelect
                      tenants={tenants}
                      selectedTenantIds={selectedTenantIds}
                      selectedTime={selectedTime}
                      onChange={setSelectedTenantIds}
                      disabled={loadingTenants}
                    />
                    {selectedTenants.length > 0 ? (
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {selectedTenants.length === 1
                          ? selectedTenants[0].description ||
                            `Scale factor ${selectedTenants[0].scaleFactor ?? 'unknown'}`
                          : `${selectedTenants.length} tenants selected for temporal overlay.`}
                      </p>
                    ) : null}
                  </section>

                  <TenantTimeline tenants={tenants} selectedTime={selectedTime} selectedTenantIds={selectedTenantIds} />

                  <TimeSlider
                    range={timeRange}
                    value={selectedTime}
                    onChange={handleTimeChange}
                    isPlaying={isPlaying}
                    onPlayingChange={setIsPlaying}
                    disabled={selectedTenantIds.length === 0 || loadingGraph}
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
                </>
              ) : null}
            </aside>

            {selectedDatabaseName ? (
              <GraphView
                graph={graph}
                loading={loadingGraph}
                isPlaying={isPlaying}
                resetKey={selectedTenantKey}
                selectedTenantIds={selectedTenantIds}
              />
            ) : (
              <section className="grid min-h-[520px] place-items-center rounded-3xl border border-slate-800 bg-slate-950/70 px-6 text-center lg:min-h-full">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">Choose a database</h2>
                  <p className="mt-2 max-w-md text-sm text-slate-400">
                    After selecting an accessible database, tenants and temporal graph snapshots will load from that
                    database.
                  </p>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )

  function resetAppState() {
    setSession(null)
    setDatabases([])
    setSelectedDatabaseName(null)
    setTenants([])
    setSelectedTenantIds([])
    setTimeRange(null)
    setSelectedTime(null)
    setDebouncedTime(null)
    setGraph(null)
    setIsPlaying(false)
    setError(null)
    setLoadingDatabases(false)
    setLoadingTenants(false)
    setLoadingGraph(false)
  }
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
