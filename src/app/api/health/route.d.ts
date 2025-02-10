import { NextResponse } from 'next/server';
export declare function GET(): Promise<NextResponse<{
    status: string;
    timestamp: number;
    unhealthyServices: string[];
    details: {
        memory?: {
            used: number;
            total: number;
            threshold: number;
        };
        audio?: {
            context: string;
            sampleRate: number;
            bufferSize: number;
        };
        storage?: {
            used: number;
            available: number;
            quota: number;
        };
    } | undefined;
}> | NextResponse<{
    status: string;
    timestamp: number;
    services: Record<string, import("../../../types/monitoring").ServiceStatus>;
    details: {
        memory?: {
            used: number;
            total: number;
            threshold: number;
        };
        audio?: {
            context: string;
            sampleRate: number;
            bufferSize: number;
        };
        storage?: {
            used: number;
            available: number;
            quota: number;
        };
    } | undefined;
}> | NextResponse<{
    status: string;
    timestamp: number;
    error: string;
}>>;
