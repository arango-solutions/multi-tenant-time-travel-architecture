import type { Tenant } from '../api'
import { getTenantColor } from '../tenantColors'

type TenantTimelineProps = {
  tenants: Tenant[]
  selectedTime: number | null
  selectedTenantIds: string[]
}

export function TenantTimeline({ tenants, selectedTime, selectedTenantIds }: TenantTimelineProps) {
  const orderedTenantIds = tenants.map((tenant) => tenant.id)
  const orderedTenants = [...tenants].sort((left, right) => {
    const leftCreated = left.createdAt ?? Number.POSITIVE_INFINITY
    const rightCreated = right.createdAt ?? Number.POSITIVE_INFINITY

    return leftCreated - rightCreated || left.name.localeCompare(right.name)
  })
  const availableTenants = orderedTenants.filter((tenant) => isTenantAvailable(tenant, selectedTime))

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Tenant Timeline</h2>
          <p className="mt-2 text-sm text-slate-300">
            {availableTenants.length} of {tenants.length} tenants available
          </p>
          {selectedTime ? <p className="mt-1 text-xs text-slate-500">at {formatTimestamp(selectedTime)}</p> : null}
        </div>
        <div className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-cyan-200">
          {selectedTenantIds.length} selected
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {orderedTenants.map((tenant) => {
          const isAvailable = isTenantAvailable(tenant, selectedTime)
          const isSelected = selectedTenantIds.includes(tenant.id)

          return (
            <div
              key={tenant.id}
              className={`rounded-xl border px-3 py-2 ${
                isAvailable ? 'border-slate-800 bg-slate-950/45' : 'border-slate-800/70 bg-slate-950/25 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-lg"
                  style={{ backgroundColor: getTenantColor(tenant.id, orderedTenantIds) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-200">{tenant.name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide ${
                        isAvailable ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'
                      }`}
                    >
                      {isAvailable ? 'Available' : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{tenant.id}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Created {tenant.createdAt ? formatTimestamp(tenant.createdAt) : 'unknown'}
                  </p>
                  {isSelected ? <p className="mt-1 text-xs font-medium text-cyan-200">Included in graph</p> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function isTenantAvailable(tenant: Tenant, selectedTime: number | null) {
  return selectedTime === null || tenant.createdAt === null || tenant.createdAt === undefined || tenant.createdAt <= selectedTime
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp * 1000))
}
