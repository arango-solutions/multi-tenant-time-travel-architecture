import { useEffect, useMemo, useState } from 'react'
import type { TimeRange } from '../api'

type TimeSliderProps = {
  range: TimeRange | null
  value: number | null
  onChange: (timestamp: number) => void
  disabled?: boolean
}

export function TimeSlider({ range, value, onChange, disabled = false }: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const step = useMemo(() => {
    if (!range) {
      return 3600
    }

    return Math.max(3600, Math.floor((range.max - range.min) / 160))
  }, [range])

  useEffect(() => {
    if (!isPlaying || !range || value === null) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      const nextValue = value + step > range.max ? range.min : value + step
      onChange(nextValue)
    }, 900)

    return () => window.clearInterval(timerId)
  }, [isPlaying, onChange, range, step, value])

  if (!range || value === null) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
        Select a tenant to load the temporal range.
      </div>
    )
  }

  const sliderValue = Math.round(value)
  const min = Math.floor(range.min)
  const max = Math.ceil(range.max)

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Point In Time</h2>
          <p className="mt-1 text-lg font-semibold text-slate-100">{formatTimestamp(value)}</p>
          <p className="mt-1 text-xs text-slate-500">Unix {sliderValue}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setIsPlaying((current) => !current)}
          disabled={disabled}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      <input
        className="h-2 w-full cursor-pointer accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
      />

      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatDateOnly(range.min)}</span>
        <span>{formatDateOnly(range.max)}</span>
      </div>
    </section>
  )
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(timestamp * 1000))
}

function formatDateOnly(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp * 1000))
}
