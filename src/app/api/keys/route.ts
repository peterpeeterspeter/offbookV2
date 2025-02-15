import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      keys: keys as ApiKey[],
      elevenlabs_key: process.env.ELEVENLABS_API_KEY,
      deepseek_key: process.env.DEEPSEEK_API_KEY,
    });
  } catch (err) {
    console.error('Unexpected error in API keys route:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
