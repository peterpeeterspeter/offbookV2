import { NextResponse } from 'next/server';
import { loggingService } from '@/services/monitoring/logging-service';
import { alertService } from '@/services/monitoring/alert-service';
import { analyticsService } from '@/services/monitoring/analytics-service';

export async function GET() {
  try {
    const services = {
      logging: true,
      alerts: true,
      analytics: true,
      database: process.env.DATABASE_URL !== undefined
    };

    // Check logging service
    try {
      loggingService.info('Health check');
    } catch (error) {
      services.logging = false;
    }

    // Check alert service
    try {
      alertService.getAlerts();
    } catch (error) {
      services.alerts = false;
    }

    // Check analytics service
    try {
      analyticsService.getMetrics();
    } catch (error) {
      services.analytics = false;
    }

    // Calculate overall status
    const isHealthy = Object.values(services).every(status => status);
    const status = isHealthy ? 'healthy' : 'degraded';

    // Track health status in alert service
    if (!isHealthy) {
      alertService.trackHealthAlert(
        'system',
        'degraded',
        'healthy'
      );
    }

    return NextResponse.json({
      status,
      timestamp: Date.now(),
      services,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    loggingService.error('Health check failed', error as Error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}
