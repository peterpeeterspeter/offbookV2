import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ScriptAnalysisService } from '@/services/script-analysis';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create script record in database
    const script = await db.script.create({
      data: {
        title,
        description,
        userId: session.user.id,
        analysisStatus: 'pending',
        analysisProgress: 0,
      },
    });

    // Initialize script analysis service
    const analysisService = new ScriptAnalysisService();

    // Start analysis in background
    analysisService.analyzeScript(script.id, file).catch((error) => {
      console.error('Script analysis failed:', error);
      db.script.update({
        where: { id: script.id },
        data: {
          analysisStatus: 'failed',
        },
      });
    });

    return NextResponse.json({
      message: 'Script upload initiated',
      scriptId: script.id,
    });
  } catch (error) {
    console.error('Script upload failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
