import React from 'react'

interface CacheMetricsDisplayProps {
  hitRate: number
  totalRequests: number
  averageLatency: number
  frequentItemsRatio: number
  uptime: number
}

export const CacheMetricsDisplay: React.FC<CacheMetricsDisplayProps> = ({
  hitRate,
  totalRequests,
  averageLatency,
  frequentItemsRatio,
  uptime
}) => {
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Cache Performance Metrics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-600">Hit Rate</div>
          <div className="text-xl font-medium">
            {(hitRate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-600">Total Requests</div>
          <div className="text-xl font-medium">
            {totalRequests.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-600">Avg. Latency</div>
          <div className="text-xl font-medium">
            {averageLatency.toFixed(1)}ms
          </div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-600">Frequent Items</div>
          <div className="text-xl font-medium">
            {(frequentItemsRatio * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-3 rounded border col-span-2">
          <div className="text-sm text-gray-600">Uptime</div>
          <div className="text-xl font-medium">
            {formatDuration(uptime)}
          </div>
        </div>
      </div>
    </div>
  )
} 