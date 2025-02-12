import type { ActionResponse } from '@/types/actions';
interface CreateRoomParams {
    name?: string;
    properties?: {
        maxParticipants?: number;
        enableChat?: boolean;
        startAudioOff?: boolean;
    };
}
interface CreateRoomResponse {
    url: string;
    name: string;
    token?: string;
}
export declare function createRoom(params: CreateRoomParams): Promise<ActionResponse<CreateRoomResponse>>;
export declare function deleteRoom(name: string): Promise<ActionResponse<void>>;
export {};
