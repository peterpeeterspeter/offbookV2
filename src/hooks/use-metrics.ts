'use client'

import { useEffect } from 'react'
import { useMetricsContext } from '@/app/analytics/context/metrics-context'
import type { UsageMetrics } from '@/services/monitoring/analytics-service'

interface UseMetricsOptions {
  refreshInterval?: number
  timeRange?: {
    start: number
    end: number
  }
}

interface UseMetricsResult {
  data: UsageMetrics | null
  error: Error | null
  isLoading: boolean
  mutate: () => Promise<void>
}

export function useMetrics(options: UseMetricsOptions = {}): UseMetricsResult {
  const { refreshInterval = 60000 } = options
  const {
    timeRange,
    setTimeRange,
    metrics: data,
    setMetrics: setData,
    error,
    setError,
    isLoading,
    setIsLoading,
  } = useMetricsContext()

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams()
      params.set('start', timeRange.start.toString())
      params.set('end', timeRange.end.toString())

      const response = await fetch(`/api/monitoring/analytics?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const newData = await response.json()
      setData(newData)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (options.timeRange) {
      setTimeRange(options.timeRange)
    }
  }, [options.timeRange, setTimeRange])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [timeRange, refreshInterval])

  return {
    data,
    error,
    isLoading,
    mutate: fetchMetrics,
  }
}
