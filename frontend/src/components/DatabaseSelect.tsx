import type { DatabaseInfo } from '../api'

type DatabaseSelectProps = {
  databases: DatabaseInfo[]
  selectedDatabaseName: string | null
  onChange: (databaseName: string) => void
  disabled?: boolean
}

export function DatabaseSelect({
  databases,
  selectedDatabaseName,
  onChange,
  disabled = false,
}: DatabaseSelectProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Database</span>
        <select
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          value={selectedDatabaseName ?? ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || databases.length === 0}
        >
          <option value="" disabled>
            Choose a database
          </option>
          {databases.map((database) => (
            <option key={database.name} value={database.name}>
              {database.name}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        Tenants are discovered from the selected database's temporal graph collections.
      </p>
    </section>
  )
}
