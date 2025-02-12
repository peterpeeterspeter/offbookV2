import { NextResponse } from 'next/server'
import { monitoringService } from '@/services/monitoring/monitoring-service'

export async function GET() {
  try {
    const healthStatus = await monitoringService.getHealthStatus()

    // Check if any critical services are unhealthy
    const criticalServices = ['audio', 'storage', 'collaboration']
    const unhealthyServices = criticalServices.filter(
      service => healthStatus.services[service] === 'unhealthy'
    )

    if (unhealthyServices.length > 0) {
      return NextResponse.json({
        status: 'degraded',
        timestamp: Date.now(),
        unhealthyServices,
        details: healthStatus.details
      }, { status: 503 })
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: Date.now(),
      services: healthStatus.services,
      details: healthStatus.details
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
