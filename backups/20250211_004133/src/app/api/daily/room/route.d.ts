export declare function createRoom(request: Request): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: {
        url: string;
        name: any;
    };
    error?: undefined;
}>;
export declare function deleteRoom(name: string): Promise<{
    success: boolean;
    error: string;
} | {
    success: boolean;
    error?: undefined;
}>;
