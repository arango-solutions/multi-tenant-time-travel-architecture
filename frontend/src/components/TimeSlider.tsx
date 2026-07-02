import { useEffect, useMemo, useState } from 'react'
import type { TimeRange } from '../api'

type TimeSliderProps = {
  range: TimeRange | null
  value: number | null
  onChange: (timestamp: number) => void
  isPlaying: boolean
  onPlayingChange: (playing: boolean) => void
  disabled?: boolean
}

const BASE_INTERVAL_MS = 3000
const SPEED_PRESETS = [0.5, 1, 2, 4]

export function TimeSlider({
  range,
  value,
  onChange,
  isPlaying,
  onPlayingChange,
  disabled = false,
}: TimeSliderProps) {
  const [speed, setSpeed] = useState(1)
  const step = useMemo(() => {
    if (!range) {
      return 3600
    }

    return Math.max(3600, Math.floor((range.max - range.min) / 160))
  }, [range])
  const intervalMs = Math.round(BASE_INTERVAL_MS / speed)

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Point In Time</h2>
          <p className="mt-1 text-lg font-semibold text-slate-100">{formatTimestamp(value)}</p>
          <p className="mt-1 text-xs text-slate-500">Unix {sliderValue}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            className="rounded-full border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPlayingChange(!isPlaying)}
            disabled={disabled}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
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
                  onClick={() => setSpeed(preset)}
                  disabled={disabled}
                >
                  {formatSpeedLabel(preset)}
                </button>
              )
            })}
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

function formatSpeedLabel(speed: number) {
  return `${speed}x`
}
