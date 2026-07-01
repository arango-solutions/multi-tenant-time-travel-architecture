import type { Tenant } from '../api'

type TenantSelectProps = {
  tenants: Tenant[]
  selectedTenantId: string | null
  onChange: (tenantId: string) => void
  disabled?: boolean
}

export function TenantSelect({ tenants, selectedTenantId, onChange, disabled = false }: TenantSelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">Tenant</span>
      <select
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        value={selectedTenantId ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || tenants.length === 0}
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name} ({tenant.id})
          </option>
        ))}
      </select>
    </label>
  )
}
