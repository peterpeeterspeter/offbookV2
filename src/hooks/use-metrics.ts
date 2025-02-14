import { useState, useEffect } from 'react'
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
  const { refreshInterval = 60000, timeRange } = options
  const [data, setData] = useState<UsageMetrics | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams()
      if (timeRange) {
        params.set('start', timeRange.start.toString())
        params.set('end', timeRange.end.toString())
      }

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
    fetchMetrics()

    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, timeRange?.start, timeRange?.end])

  return {
    data,
    error,
    isLoading,
    mutate: fetchMetrics
  }
}
