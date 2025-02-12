import { NextRequest, NextResponse } from 'next/server';
export declare function GET(req: NextRequest, { params }: {
    params: {
        scriptId: string;
    };
}): Promise<NextResponse<any>>;
