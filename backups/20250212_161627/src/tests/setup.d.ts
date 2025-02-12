import { type Mock } from 'vitest';
import '@testing-library/jest-dom';
import { Blob } from 'buffer';
import { MockAudioContext as AudioContextImpl, MockMediaRecorder as MediaRecorderImpl, MockMediaStream as MediaStreamImpl, MockMediaStreamTrack as MediaStreamTrackImpl, MockBlobEvent as BlobEventImpl } from './mocks/browser-apis';
declare global {
    interface ProcessEnv {
        REACT_APP_DEEPSEEK_API_KEY: string;
        REACT_APP_ELEVENLABS_API_KEY: string;
        VITE_DAILY_API_KEY: string;
    }
}
declare class MockAudioContext {
    state: AudioContextState;
    sampleRate: number;
    baseLatency: number;
    destination: {
        channelCount: number;
        channelCountMode: string;
        channelInterpretation: string;
        maxChannelCount: number;
        numberOfInputs: number;
        numberOfOutputs: number;
        connect: Mock<any, any>;
        disconnect: Mock<any, any>;
    };
    constructor();
    createDynamicsCompressor(this: MockAudioContext): DynamicsCompressorNode;
    createGain(this: MockAudioContext): GainNode;
    createOscillator(this: MockAudioContext): OscillatorNode;
    createAnalyser(this: MockAudioContext): AnalyserNode;
    createScriptProcessor(this: MockAudioContext, bufferSize?: number, numberOfInputChannels?: number, numberOfOutputChannels?: number): ScriptProcessorNode;
    suspend(): Promise<void>;
    resume(): Promise<void>;
    close(): Promise<void>;
    addEventListener: Mock<any, any>;
    removeEventListener: Mock<any, any>;
    dispatchEvent: Mock<any, any>;
}
declare global {
    interface Window {
        Blob: typeof Blob;
        BlobEvent: typeof BlobEventImpl;
        AudioContext: typeof AudioContextImpl;
        MediaRecorder: typeof MediaRecorderImpl;
        MediaStream: typeof MediaStreamImpl;
        MediaStreamTrack: typeof MediaStreamTrackImpl;
        ElevenLabs: ElevenLabsAPI;
        __FORCE_BATTERY_API__: boolean;
        mockAudioContext: typeof MockAudioContext;
    }
}
interface MockBatteryManager {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    addEventListener: (event: string, handler: () => void) => void;
    removeEventListener: (event: string, handler: () => void) => void;
}
declare global {
    interface Navigator {
        getBattery(): Promise<MockBatteryManager>;
    }
}
interface ElevenLabsVoice {
    id: string;
    name: string;
}
interface ElevenLabsModel {
    id: string;
    name: string;
}
interface ElevenLabsAPI {
    synthesizeSpeech: (text: string, options?: any) => Promise<Uint8Array>;
    getVoices: () => Promise<ElevenLabsVoice[]>;
    getModels: () => Promise<ElevenLabsModel[]>;
}
export {};
