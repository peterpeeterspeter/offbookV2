import '@testing-library/jest-dom';
import React, { type ReactElement } from 'react';
declare class MockMediaStream {
    private tracks;
    constructor(tracks?: MediaStreamTrack[]);
    addTrack(track: MediaStreamTrack): void;
    getTracks(): MediaStreamTrack[];
    getAudioTracks(): MediaStreamTrack[];
    removeTrack(track: MediaStreamTrack): void;
}
export declare const setNavigatorProps: {
    userAgent: (value: string) => string;
    platform: (value: string) => string;
    onLine: (value: boolean) => boolean;
};
declare class MockWebSocket implements WebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    binaryType: BinaryType;
    bufferedAmount: number;
    extensions: string;
    protocol: string;
    url: string;
    readyState: number;
    onopen: ((this: WebSocket, ev: Event) => any) | null;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
    onerror: ((this: WebSocket, ev: Event) => any) | null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
    private eventListeners;
    constructor(url: string, _protocols?: string | string[]);
    send: import("vitest").Mock<any, any>;
    close: import("vitest").Mock<[], void>;
    addEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (ev: WebSocketEventMap[K]) => any): void;
    removeEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (ev: WebSocketEventMap[K]) => any): void;
    dispatchEvent(event: Event): boolean;
}
export interface CustomMatchers<R = unknown> {
    toBeInTheDocument(): R;
    toHaveAttribute(attr: string, value?: string): R;
    toHaveClass(className: string): R;
    toBeChecked(): R;
    toHaveStyle(style: Record<string, any>): R;
}
declare module 'vitest' {
    interface Assertion extends CustomMatchers {
    }
}
export interface JSXElement {
    type: any;
    props: any;
    key: string | null;
}
export type ReactComponent = ReactElement | null;
export declare function createTestComponent<P extends object>(Component: React.ComponentType<P>, props: P): React.ReactNode;
export declare const waitForStateUpdate: () => Promise<unknown>;
export declare const createMockAudioStream: () => MockMediaStream;
export declare const simulateWebSocketMessage: (ws: MockWebSocket, data: any) => void;
export declare function setDocumentVisibility(state: DocumentVisibilityState): void;
export {};
