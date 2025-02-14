import { NextResponse } from 'next/server';
import { loggingService } from '@/services/monitoring/logging-service';
import { errorTrackingService } from '@/services/monitoring/error-tracking-service';

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const options = formData.get('options');

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate API key
    const apiKey = process.env.WHISPER_API_KEY;
    if (!apiKey) {
      throw new Error('Whisper API key not configured');
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();

    // Call Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        formData.append('file', new Blob([arrayBuffer], { type: audioFile.type }), 'audio.wav');
        formData.append('model', 'whisper-1');
        if (options) {
          formData.append('options', options);
        }
        return formData;
      })(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${error}`);
    }

    const result = await response.json();

    loggingService.info('Whisper transcription completed', {
      fileSize: audioFile.size,
      duration: result.duration,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    errorTrackingService.trackError(err, 'audio', {
      service: 'whisper',
      operation: 'transcription',
    });

    loggingService.error('Whisper transcription failed', err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
