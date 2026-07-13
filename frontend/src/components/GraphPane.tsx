import { useMemo, useState } from 'react'
import type { Tenant } from '../api'
import type { GraphPane as GraphPaneState } from '../useGraphPane'
import { GraphView } from './GraphView'
import { TenantSelect } from './TenantSelect'
import { TimeSlider } from './TimeSlider'

type GraphPaneProps = {
  label: string
  tenants: Tenant[]
  pane: GraphPaneState
  tenantsLoading?: boolean
}

export function GraphPane({ label, tenants, pane, tenantsLoading = false }: GraphPaneProps) {
  const [showTenants, setShowTenants] = useState(false)
  const selectedTenantKey = useMemo(() => pane.selectedTenantIds.join('|'), [pane.selectedTenantIds])
  const controlsDisabled = pane.selectedTenantIds.length === 0 || pane.loadingGraph

  return (
    <div className="flex min-h-[720px] flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
            {label}
          </span>
          <span className="text-xs text-slate-400">{pane.selectedTenantIds.length} tenants</span>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-100"
          onClick={() => setShowTenants((current) => !current)}
        >
          {showTenants ? 'Hide tenants' : 'Choose tenants'}
        </button>
      </div>

      {showTenants ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <TenantSelect
            tenants={tenants}
            selectedTenantIds={pane.selectedTenantIds}
            selectedTime={pane.selectedTime}
            onChange={pane.setSelectedTenantIds}
            disabled={tenantsLoading}
          />
        </section>
      ) : null}

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
