import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchDatabases, fetchTenants, login, logout, selectDatabase } from './api'
import type { DatabaseInfo, LoginRequest, LoginResponse, Tenant } from './api'
import { DatabaseSelect } from './components/DatabaseSelect'
import { GraphPane } from './components/GraphPane'
import { GraphView } from './components/GraphView'
import { LoginForm } from './components/LoginForm'
import { TenantSelect } from './components/TenantSelect'
import { TenantTimeline } from './components/TenantTimeline'
import { TimeSlider } from './components/TimeSlider'
import { useGraphPane } from './useGraphPane'

function App() {
  const [session, setSession] = useState<LoginResponse | null>(null)
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loadingDatabases, setLoadingDatabases] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paneA = useGraphPane({ session, tenants, enabled: true, autoSelectFirst: true })
  const paneB = useGraphPane({ session, tenants, enabled: compareMode, autoSelectFirst: false })

  useEffect(() => {
    if (!session || !selectedDatabaseName) {
      return undefined
    }

    let isActive = true
    setError(null)
    setLoadingTenants(true)
    setTenants([])
    setCompareMode(false)

    fetchTenants(session.sessionId)
      .then((tenantList) => {
        if (!isActive) {
          return
        }

        setTenants(tenantList)
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

  const selectedTenants = useMemo(
    () => tenants.filter((tenant) => paneA.selectedTenantIds.includes(tenant.id)),
    [paneA.selectedTenantIds, tenants],
  )

  const handleLogin = useCallback(async (payload: LoginRequest) => {
    setLoadingLogin(true)
    setError(null)

    try {
      const nextSession = await login(payload)
      setSession(nextSession)
      setSelectedDatabaseName(null)
      setTenants([])
      setCompareMode(false)
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

  const handleToggleCompare = useCallback(() => {
    if (compareMode) {
      setCompareMode(false)
      return
    }

    paneB.seed(paneA.selectedTenantIds, paneA.selectedTime)
    setCompareMode(true)
  }, [compareMode, paneA.selectedTenantIds, paneA.selectedTime, paneB])

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

  const canCompare = Boolean(selectedDatabaseName) && paneA.selectedTenantIds.length > 0
  const topError = error ?? (compareMode ? null : paneA.error)

  return (
    <main className="min-h-screen text-slate-100">
      <div className="flex min-h-screen flex-col gap-4 px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        <header className="flex shrink-0 flex-col justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/30 lg:flex-row lg:items-end lg:p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Arango Time Travel</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">
              Interactive Temporal Graph
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 lg:text-base">
              Scrub through tenant history to inspect the active device and software versions, topology, locations, and
              alert state at a specific point in time.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300 lg:max-w-[38rem]">
            {session ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-400">
                  {session.username} @ {session.endpoint}
                </span>
                {selectedDatabaseName ? (
                  <button
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      compareMode
                        ? 'border-cyan-300 bg-cyan-400/10 text-cyan-100'
                        : 'border-slate-700 text-slate-200 hover:border-cyan-300 hover:text-cyan-200'
                    }`}
                    type="button"
                    onClick={handleToggleCompare}
                    disabled={!canCompare}
                  >
                    {compareMode ? 'Exit compare' : 'Compare'}
                  </button>
                ) : null}
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

        {topError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {topError}
          </div>
        ) : null}

        {!session ? (
          <LoginForm onSubmit={handleLogin} loading={loadingLogin} />
        ) : compareMode ? (
          <div className="flex flex-1 flex-col gap-4 lg:overflow-hidden">
            <div className="lg:max-w-md">
              <DatabaseSelect
                databases={databases}
                selectedDatabaseName={selectedDatabaseName}
                onChange={(databaseName) => void handleDatabaseChange(databaseName)}
                disabled={loadingDatabases}
              />
            </div>
            <div className="grid flex-1 gap-4 lg:grid-cols-2 lg:overflow-hidden">
              <GraphPane label="View A" tenants={tenants} pane={paneA} tenantsLoading={loadingTenants} />
              <GraphPane label="View B" tenants={tenants} pane={paneB} tenantsLoading={loadingTenants} />
            </div>
          </div>
        ) : (
          <>
            {selectedDatabaseName ? (
              <TimeSlider
                range={paneA.timeRange}
                value={paneA.selectedTime}
                onChange={paneA.setSelectedTime}
                isPlaying={paneA.isPlaying}
                onPlayingChange={paneA.setIsPlaying}
                speed={paneA.playbackSpeed}
                onSpeedChange={paneA.setPlaybackSpeed}
                disabled={paneA.selectedTenantIds.length === 0 || paneA.loadingGraph}
              />
            ) : null}

            <div className="grid min-h-[640px] flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden">
              <aside className="space-y-4 lg:h-full lg:overflow-auto lg:pr-1">
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
                        selectedTenantIds={paneA.selectedTenantIds}
                        selectedTime={paneA.selectedTime}
                        onChange={paneA.setSelectedTenantIds}
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

                    <TenantTimeline
                      tenants={tenants}
                      selectedTime={paneA.selectedTime}
                      selectedTenantIds={paneA.selectedTenantIds}
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
                  graph={paneA.graph}
                  loading={paneA.loadingGraph}
                  isPlaying={paneA.isPlaying}
                  onPlayingChange={paneA.setIsPlaying}
                  resetKey={paneA.selectedTenantIds.join('|')}
                  selectedTenantIds={paneA.selectedTenantIds}
                  timeRange={paneA.timeRange}
                  selectedTime={paneA.selectedTime}
                  onTimeChange={paneA.setSelectedTime}
                  playbackSpeed={paneA.playbackSpeed}
                  onPlaybackSpeedChange={paneA.setPlaybackSpeed}
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
          </>
        )}
      </div>
    </main>
  )

  function resetAppState() {
    setSession(null)
    setDatabases([])
    setSelectedDatabaseName(null)
    setTenants([])
    setCompareMode(false)
    setError(null)
    setLoadingDatabases(false)
    setLoadingTenants(false)
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
