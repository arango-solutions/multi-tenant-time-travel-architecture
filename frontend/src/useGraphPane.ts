import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchGraph, fetchTimeRange } from './api'
import type { GraphPayload, LoginResponse, Tenant, TimeRange } from './api'

type UseGraphPaneOptions = {
  session: LoginResponse | null
  tenants: Tenant[]
  enabled?: boolean
  autoSelectFirst?: boolean
}

export type GraphPane = {
  selectedTenantIds: string[]
  setSelectedTenantIds: (tenantIds: string[]) => void
  timeRange: TimeRange | null
  selectedTime: number | null
  setSelectedTime: (timestamp: number) => void
  debouncedTime: number | null
  graph: GraphPayload | null
  loadingGraph: boolean
  error: string | null
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  seed: (tenantIds: string[], time: number | null) => void
}

export function useGraphPane({
  session,
  tenants,
  enabled = true,
  autoSelectFirst = false,
}: UseGraphPaneOptions): GraphPane {
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null)
  const [selectedTime, setSelectedTime] = useState<number | null>(null)
  const [debouncedTime, setDebouncedTime] = useState<number | null>(null)
  const [graph, setGraph] = useState<GraphPayload | null>(null)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const pendingSeedRef = useRef<number | null>(null)
  const selectedTenantKey = useMemo(() => selectedTenantIds.join('|'), [selectedTenantIds])

  const seed = useCallback((tenantIds: string[], time: number | null) => {
    pendingSeedRef.current = time
    setSelectedTenantIds(tenantIds)
  }, [])

  useEffect(() => {
    setSelectedTenantIds(autoSelectFirst && tenants[0] ? [tenants[0].id] : [])
  }, [autoSelectFirst, tenants])

  useEffect(() => {
    if (!enabled || !session || selectedTenantIds.length === 0) {
      setTimeRange(null)
      setSelectedTime(null)
      setDebouncedTime(null)
      setGraph(null)
      setIsPlaying(false)
      return undefined
    }

    let isActive = true
    setError(null)

    const seedTime = pendingSeedRef.current
    pendingSeedRef.current = null

    if (seedTime === null) {
      setTimeRange(null)
      setSelectedTime(null)
      setDebouncedTime(null)
      setGraph(null)
    }

    fetchTimeRange(session.sessionId, selectedTenantIds)
      .then((range) => {
        if (!isActive) {
          return
        }

        setTimeRange(range)
        const nextTime = seedTime !== null ? seedTime : range.now
        setSelectedTime(nextTime)
        setDebouncedTime(nextTime)
      })
      .catch((caughtError: unknown) => {
        if (isActive) {
          setError(toErrorMessage(caughtError))
        }
      })

    return () => {
      isActive = false
    }
  }, [enabled, selectedTenantIds, selectedTenantKey, session])

  useEffect(() => {
    if (selectedTime === null) {
      return undefined
    }

    const timerId = window.setTimeout(() => setDebouncedTime(selectedTime), 250)
    return () => window.clearTimeout(timerId)
  }, [selectedTime])

  useEffect(() => {
    if (!enabled || !session || selectedTenantIds.length === 0 || debouncedTime === null) {
      return undefined
    }

    let isActive = true
    setLoadingGraph(true)
    setError(null)

    fetchGraph(session.sessionId, selectedTenantIds, debouncedTime)
      .then((snapshot) => {
        if (isActive) {
          setGraph(snapshot)
        }
      })
      .catch((caughtError: unknown) => {
        if (isActive) {
          setError(toErrorMessage(caughtError))
        }
      })
      .finally(() => {
        if (isActive) {
          setLoadingGraph(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [enabled, debouncedTime, selectedTenantIds, selectedTenantKey, session])

  const handleTimeChange = useCallback((timestamp: number) => {
    setSelectedTime(timestamp)
  }, [])

  return {
    selectedTenantIds,
    setSelectedTenantIds,
    timeRange,
    selectedTime,
    setSelectedTime: handleTimeChange,
    debouncedTime,
    graph,
    loadingGraph,
    error,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    seed,
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred'
}
