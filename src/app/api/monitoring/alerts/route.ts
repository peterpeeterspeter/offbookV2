import { NextResponse } from 'next/server';
import { alertService } from '@/services/monitoring/alert-service';
import { loggingService } from '@/services/monitoring/logging-service';
import { ErrorReport } from '@/types/monitoring';

export async function POST(request: Request) {
  try {
    const errorReport: ErrorReport = await request.json();

    // Track the error
    alertService.trackError(errorReport);

    return NextResponse.json({ success: true });
  } catch (error) {
    loggingService.error('Failed to process error report', error as Error);
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const alerts = alertService.getAlerts();
    return NextResponse.json(alerts);
  } catch (error) {
    loggingService.error('Failed to fetch alerts', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    alertService.clearAlerts();
    return NextResponse.json({ success: true });
  } catch (error) {
    loggingService.error('Failed to clear alerts', error as Error);
    return NextResponse.json(
      { error: 'Failed to clear alerts' },
      { status: 500 }
    );
  }
}
