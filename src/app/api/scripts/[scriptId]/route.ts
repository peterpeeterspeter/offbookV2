import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { scriptId: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const scriptId = parseInt(params.scriptId);
    if (isNaN(scriptId)) {
      return NextResponse.json(
        { error: 'Invalid script ID' },
        { status: 400 }
      );
    }

    // Fetch script with related data
    const script = await db.script.findUnique({
      where: {
        id: scriptId,
        userId: session.user.id, // Ensure user owns the script
      },
      include: {
        roles: true,
        scenes: true,
      },
    });

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(script);
  } catch (error) {
    console.error('Failed to fetch script details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
