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

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate API key
    const apiKey = process.env.EMOTION_API_KEY;
    if (!apiKey) {
      throw new Error('Emotion API key not configured');
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();

    // Call Emotion Analysis API (using HuggingFace Inference API as an example)
    const response = await fetch(
      'https://api-inference.huggingface.co/models/ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'audio/wav',
        },
        body: arrayBuffer,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Emotion API error: ${error}`);
    }

    const result = await response.json();

    loggingService.info('Emotion analysis completed', {
      fileSize: audioFile.size,
      emotions: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    errorTrackingService.trackError(err, 'audio', {
      service: 'emotion',
      operation: 'analysis',
    });

    loggingService.error('Emotion analysis failed', err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
