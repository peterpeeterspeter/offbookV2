import { NextResponse } from 'next/server';
export declare function POST(request: Request): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        url: string;
        name: any;
    };
}>>;
export declare function DELETE(request: Request): Promise<NextResponse<{
    success: boolean;
}>>;
