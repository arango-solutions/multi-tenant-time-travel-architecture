import type { Tenant } from '../api'
import { getTenantColor } from '../tenantColors'

type TenantSelectProps = {
  tenants: Tenant[]
  selectedTenantIds: string[]
  selectedTime: number | null
  onChange: (tenantIds: string[]) => void
  disabled?: boolean
}

export function TenantSelect({ tenants, selectedTenantIds, selectedTime, onChange, disabled = false }: TenantSelectProps) {
  const tenantIds = tenants.map((tenant) => tenant.id)
  const availableTenantIds = tenants
    .filter((tenant) => isTenantAvailable(tenant, selectedTime))
    .map((tenant) => tenant.id)
  const hasTenants = tenants.length > 0

  const toggleTenant = (tenantId: string) => {
    if (selectedTenantIds.includes(tenantId)) {
      onChange(selectedTenantIds.filter((selectedTenantId) => selectedTenantId !== tenantId))
      return
    }

    onChange([...selectedTenantIds, tenantId])
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Tenants</h2>
          <p className="mt-1 text-xs text-slate-500">{selectedTenantIds.length} selected</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onChange(availableTenantIds)}
            disabled={disabled || !hasTenants}
          >
            Select all
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-rose-300 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onChange([])}
            disabled={disabled || selectedTenantIds.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="max-h-72 space-y-2 overflow-auto pr-1">
        {tenants.map((tenant) => {
          const isSelected = selectedTenantIds.includes(tenant.id)
          const isAvailable = isTenantAvailable(tenant, selectedTime)
          const isDisabled = disabled || (!isAvailable && !isSelected)

          return (
            <label
              key={tenant.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                isSelected
                  ? 'border-cyan-400/50 bg-cyan-400/10 text-slate-100'
                  : 'border-slate-800 bg-slate-950/55 text-slate-300 hover:border-slate-700'
              } ${!isAvailable ? 'opacity-55' : ''} ${isDisabled ? 'cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                className="mt-1 accent-cyan-300 disabled:cursor-not-allowed"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggleTenant(tenant.id)}
              />
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-lg"
                style={{ backgroundColor: getTenantColor(tenant.id, tenantIds) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{tenant.name}</span>
                <span className="block truncate text-xs text-slate-500">{tenant.id}</span>
                {!isAvailable ? <span className="mt-1 block text-xs text-amber-200">Not yet created</span> : null}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function isTenantAvailable(tenant: Tenant, selectedTime: number | null) {
  return selectedTime === null || tenant.createdAt === null || tenant.createdAt === undefined || tenant.createdAt <= selectedTime
}
