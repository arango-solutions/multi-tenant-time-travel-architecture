import { useEffect, useMemo, useState } from 'react'
import type { TimeRange } from '../api'

type TimeSliderProps = {
  range: TimeRange | null
  value: number | null
  onChange: (timestamp: number) => void
  isPlaying: boolean
  onPlayingChange: (playing: boolean) => void
  speed: number
  onSpeedChange: (speed: number) => void
  disabled?: boolean
}

export const BASE_INTERVAL_MS = 3000
export const MIN_INTERVAL_MS = 200
export const MAX_INTERVAL_MS = 30000
export const SPEED_PRESETS = [0.5, 1, 2, 4]

export function formatSpeedLabel(speed: number) {
  return `${speed}x`
}

export function TimeSlider({
  range,
  value,
  onChange,
  isPlaying,
  onPlayingChange,
  speed,
  onSpeedChange,
  disabled = false,
}: TimeSliderProps) {
  const [baseIntervalMs, setBaseIntervalMs] = useState(BASE_INTERVAL_MS)
  const step = useMemo(() => {
    if (!range) {
      return 3600
    }

    return Math.max(3600, Math.floor((range.max - range.min) / 160))
  }, [range])
  const intervalMs = Math.round(baseIntervalMs / speed)

  useEffect(() => {
    if (!isPlaying || !range || value === null) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      const nextValue = value + step > range.max ? range.min : value + step
      onChange(nextValue)
    }, intervalMs)

    return () => window.clearInterval(timerId)
  }, [intervalMs, isPlaying, onChange, range, step, value])

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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Point In Time</h2>
          <p className="mt-1 truncate text-lg font-semibold text-slate-100">{formatTimestamp(value)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Unix {sliderValue}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-cyan-400/40 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPlayingChange(!isPlaying)}
          disabled={disabled}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Speed</span>
          <div className="flex rounded-full border border-slate-700 bg-slate-950/70 p-1">
            {SPEED_PRESETS.map((preset) => {
              const isActive = preset === speed

              return (
                <button
                  key={preset}
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isActive
                      ? 'bg-cyan-300 text-slate-950'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-200'
                  }`}
                  onClick={() => onSpeedChange(preset)}
                  disabled={disabled}
                >
                  {formatSpeedLabel(preset)}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="tick-interval" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Interval
          </label>
          <div className="flex items-center rounded-full border border-slate-700 bg-slate-950/70 px-1 py-1">
            <input
              id="tick-interval"
              className="w-12 bg-transparent px-1 text-right text-sm text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              type="number"
              min={MIN_INTERVAL_MS / 1000}
              max={MAX_INTERVAL_MS / 1000}
              step={0.1}
              value={Number((baseIntervalMs / 1000).toFixed(1))}
              onChange={(event) => setBaseIntervalMs(clampIntervalMs(Number(event.target.value) * 1000))}
              disabled={disabled}
            />
            <span className="pr-2 text-xs text-slate-500">s</span>
          </div>
        </div>
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

function clampIntervalMs(intervalMs: number) {
  if (!Number.isFinite(intervalMs)) {
    return BASE_INTERVAL_MS
  }

  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, Math.round(intervalMs)))
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
