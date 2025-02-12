import { NextRequest, NextResponse } from 'next/server';
interface DailyRoom {
    id: string;
    name: string;
    url: string;
    privacy: string;
    created_at: string;
    config?: Record<string, unknown>;
}
interface DailyApiResponse {
    room: DailyRoom;
    token?: string;
    url?: string;
}
export declare function POST(req: NextRequest): Promise<NextResponse<DailyApiResponse>>;
export declare function GET(req: NextRequest): Promise<NextResponse<DailyRoom | {
    error: string;
}>>;
export declare function DELETE(req: NextRequest): Promise<NextResponse<{
    success: boolean;
} | {
    error: string;
}>>;
export {};
