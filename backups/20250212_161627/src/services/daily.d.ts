import type { ActionResponse } from '../types/actions';
interface DailyConfig {
    apiKey: string;
    domain: string;
}
interface CreateRoomParams {
    name?: string;
    properties?: {
        maxParticipants?: number;
        enableChat?: boolean;
        startAudioOff?: boolean;
        startVideoOff?: boolean;
    };
}
interface CreateRoomResponse {
    url: string;
    name: string;
}
export declare const getDailyConfig: () => DailyConfig;
export declare function createDailyRoom(params: CreateRoomParams): Promise<ActionResponse<CreateRoomResponse>>;
export declare function joinDailyRoom(roomName: string): Promise<ActionResponse<CreateRoomResponse>>;
export {};
