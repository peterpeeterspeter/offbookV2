import { NextRequest, NextResponse } from 'next/server';
import { DailyAPI } from '@/lib/webrtc/daily-api';

export async function POST(req: NextRequest) {
  try {
    const dailyApi = new DailyAPI();
    const { name, properties } = await req.json();

    const room = await dailyApi.createRoom({
      name,
      properties,
    });

    const token = await dailyApi.createMeetingToken(
      room.name,
      `Actor_${Math.random().toString(36).slice(2, 7)}`
    );

    return NextResponse.json({
      room,
      token,
      url: dailyApi.getRoomUrl(room.name),
    });
  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const dailyApi = new DailyAPI();
    const url = new URL(req.url);
    const name = url.searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    const room = await dailyApi.getRoom(name);
    return NextResponse.json(room);
  } catch (error) {
    console.error('Failed to get room:', error);
    return NextResponse.json(
      { error: 'Failed to get room' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const dailyApi = new DailyAPI();
    const url = new URL(req.url);
    const name = url.searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    await dailyApi.deleteRoom(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    );
  }
} 