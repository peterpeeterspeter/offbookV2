export declare function createRoom(request: Request): Promise<{
    success: boolean;
    error: string;
    data?: never;
} | {
    success: boolean;
    data: {
        url: string;
        name: any;
    };
    error?: never;
}>;
export declare function deleteRoom(name: string): Promise<{
    success: boolean;
    error: string;
} | {
    success: boolean;
    error?: never;
}>;
