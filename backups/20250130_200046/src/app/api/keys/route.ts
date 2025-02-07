import { NextResponse } from 'next/server';

export async function GET() {
  // In a real app, these would be fetched from a secure environment or service
  const keys = {
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    elevenlabs: process.env.ELEVENLABS_API_KEY,
  };

  // Check if any keys are missing
  const missingKeys = Object.entries(keys)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    return NextResponse.json(
      { error: `Missing API keys: ${missingKeys.join(', ')}` },
      { status: 400 }
    );
  }

  return NextResponse.json(keys);
} 