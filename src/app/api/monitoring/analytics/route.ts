import { NextResponse } from 'next/server';
import { analyticsService } from '@/services/monitoring/analytics-service';
import { loggingService } from '@/services/monitoring/logging-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let timeRange;
    if (start && end) {
      timeRange = {
        start: parseInt(start),
        end: parseInt(end)
      };
    }

    const metrics = analyticsService.getMetrics(timeRange);
    return NextResponse.json(metrics);
  } catch (error) {
    loggingService.error('Failed to fetch analytics data', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
