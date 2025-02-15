import { NextResponse } from 'next/server'
import { monitoringService } from '@/services/monitoring/monitoring-service'
import { PerformanceAnalyzer } from '@/services/performance-analyzer'
import { logger } from '@/lib/logger'

const analyzer = new PerformanceAnalyzer()

export async function GET() {
  try {
    // Server-side metrics collection
    const metrics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION,
    }

    return NextResponse.json(metrics)
  } catch (error) {
    logger.error({
      message: 'Failed to collect metrics',
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    logger.info({
      message: 'Received metrics data',
      data,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({
      message: 'Failed to process metrics data',
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Failed to process metrics data' },
      { status: 500 }
    )
  }
}
