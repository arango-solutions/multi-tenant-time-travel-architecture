import { useMemo, useState } from 'react'
import type { Tenant } from '../api'
import { getTenantColor } from '../tenantColors'
import type { GraphPane as GraphPaneState } from '../useGraphPane'
import { GraphView } from './GraphView'
import { TenantSelect } from './TenantSelect'
import { TimeSlider } from './TimeSlider'

type Accent = 'cyan' | 'violet'

const ACCENTS: Record<Accent, { card: string; chip: string; trigger: string }> = {
  cyan: {
    card: 'border-cyan-500/25',
    chip: 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100',
    trigger: 'hover:border-cyan-300 hover:text-cyan-100',
  },
  violet: {
    card: 'border-violet-500/25',
    chip: 'border-violet-400/50 bg-violet-400/10 text-violet-100',
    trigger: 'hover:border-violet-300 hover:text-violet-100',
  },
}

const MAX_VISIBLE_DOTS = 6

type GraphPaneProps = {
  label: string
  accent?: Accent
  tenants: Tenant[]
  pane: GraphPaneState
  tenantsLoading?: boolean
}

export function GraphPane({ label, accent = 'cyan', tenants, pane, tenantsLoading = false }: GraphPaneProps) {
  const [showTenants, setShowTenants] = useState(false)
  const selectedTenantKey = useMemo(() => pane.selectedTenantIds.join('|'), [pane.selectedTenantIds])
  const controlsDisabled = pane.selectedTenantIds.length === 0 || pane.loadingGraph
  const styles = ACCENTS[accent]
  const orderedTenantIds = useMemo(() => tenants.map((tenant) => tenant.id), [tenants])
  const selectedTenants = useMemo(
    () => tenants.filter((tenant) => pane.selectedTenantIds.includes(tenant.id)),
    [pane.selectedTenantIds, tenants],
  )

  return (
    <div className={`flex min-h-[720px] flex-col gap-3 rounded-3xl border ${styles.card} bg-slate-950/40 p-3 lg:h-full lg:min-h-0`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles.chip}`}
          >
            {label}
          </span>
          <div className="flex min-w-0 items-center gap-1.5">
            {selectedTenants.length > 0 ? (
              <>
                {selectedTenants.slice(0, MAX_VISIBLE_DOTS).map((tenant) => (
                  <span
                    key={tenant.id}
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-950/60"
                    style={{ backgroundColor: getTenantColor(tenant.id, orderedTenantIds) }}
                    title={tenant.name}
                  />
                ))}
                {selectedTenants.length > MAX_VISIBLE_DOTS ? (
                  <span className="text-xs text-slate-400">+{selectedTenants.length - MAX_VISIBLE_DOTS}</span>
                ) : null}
              </>
            ) : (
              <span className="truncate text-xs text-slate-500">No tenants selected</span>
            )}
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            className={`rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition ${styles.trigger}`}
            onClick={() => setShowTenants((current) => !current)}
            aria-expanded={showTenants}
          >
            Tenants ({pane.selectedTenantIds.length})
          </button>
          {showTenants ? (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowTenants(false)} />
              <section className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl shadow-slate-950/70 backdrop-blur">
                <TenantSelect
                  tenants={tenants}
                  selectedTenantIds={pane.selectedTenantIds}
                  selectedTime={pane.selectedTime}
                  onChange={pane.setSelectedTenantIds}
                  disabled={tenantsLoading}
                />
              </section>
            </>
          ) : null}
        </div>
      </div>

      <TimeSlider
        range={pane.timeRange}
        value={pane.selectedTime}
        onChange={pane.setSelectedTime}
        isPlaying={pane.isPlaying}
        onPlayingChange={pane.setIsPlaying}
        speed={pane.playbackSpeed}
        onSpeedChange={pane.setPlaybackSpeed}
        disabled={controlsDisabled}
      />

      {pane.error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {pane.error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <GraphView
          graph={pane.graph}
          loading={pane.loadingGraph}
          isPlaying={pane.isPlaying}
          onPlayingChange={pane.setIsPlaying}
          resetKey={selectedTenantKey}
          selectedTenantIds={pane.selectedTenantIds}
          timeRange={pane.timeRange}
          selectedTime={pane.selectedTime}
          onTimeChange={pane.setSelectedTime}
          playbackSpeed={pane.playbackSpeed}
          onPlaybackSpeedChange={pane.setPlaybackSpeed}
          label={label}
        />
      </div>
    </div>
  )
}
