import { useState } from 'react'
import type { FormEvent } from 'react'
import type { LoginRequest } from '../api'

type LoginFormProps = {
  onSubmit: (payload: LoginRequest) => Promise<void>
  loading?: boolean
}

export function LoginForm({ onSubmit, loading = false }: LoginFormProps) {
  const [endpoint, setEndpoint] = useState('')
  const [username, setUsername] = useState('root')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({ endpoint, username, password })
  }

  return (
    <form
      className="mx-auto w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl shadow-slate-950/40"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Connect Server</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Log in to ArangoDB</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Credentials are sent to the local FastAPI backend and held in memory behind a session token.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <TextField
          label="Endpoint"
          placeholder="https://your-cluster.example.com"
          value={endpoint}
          onChange={setEndpoint}
          autoComplete="url"
        />
        <TextField label="Username" value={username} onChange={setUsername} autoComplete="username" />
        <TextField
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="current-password"
        />
      </div>

      <button
        className="mt-6 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={loading || !endpoint || !username || !password}
      >
        {loading ? 'Connecting...' : 'Connect'}
      </button>
    </form>
  )
}

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
}

function TextField({ label, value, onChange, type = 'text', placeholder, autoComplete }: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
