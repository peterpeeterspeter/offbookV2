import { NextResponse } from 'next/server'
import { monitoringService } from '@/services/monitoring/monitoring-service'
import { PerformanceAnalyzer } from '@/services/performance-analyzer'

const analyzer = new PerformanceAnalyzer()

export async function GET() {
  try {
    const [performanceMetrics, monitoringReport] = await Promise.all([
      analyzer.getPerformanceMetrics(),
      monitoringService.generateReport()
    ])

    const metrics = {
      timestamp: Date.now(),
      performance: {
        memory: performanceMetrics.pipeline,
        cache: performanceMetrics.cache,
        streaming: performanceMetrics.streaming
      },
      errors: {
        total: monitoringReport.errors.length,
        byType: monitoringReport.errors.reduce((acc, error) => {
          acc[error.type] = (acc[error.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      },
      health: monitoringReport.health,
      usage: {
        activeUsers: performanceMetrics.streaming?.activeStreams || 0,
        totalRequests: performanceMetrics.pipeline.totalRequests,
        errorRate: performanceMetrics.pipeline.errorRate,
        cacheHitRate: performanceMetrics.cache.ratio
      }
    }

    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
