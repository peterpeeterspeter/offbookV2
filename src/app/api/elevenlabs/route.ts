import { NextResponse } from 'next/server';
import { loggingService } from '@/services/monitoring/logging-service';
import { errorTrackingService } from '@/services/monitoring/error-tracking-service';

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const { text, voiceId, modelId, ...settings } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Validate API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'default'}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId || 'eleven_monolingual_v1',
          voice_settings: settings,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();

    loggingService.info('ElevenLabs synthesis completed', {
      textLength: text.length,
      voiceId,
      modelId,
    });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    const err = error as Error;
    errorTrackingService.trackError(err, 'audio', {
      service: 'elevenlabs',
      operation: 'synthesis',
    });

    loggingService.error('ElevenLabs synthesis failed', err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
