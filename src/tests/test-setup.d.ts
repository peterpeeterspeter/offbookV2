import { MockAudioContext as AudioContextImpl, MockMediaRecorder as MediaRecorderImpl, MockMediaStream as MediaStreamImpl, MockMediaStreamTrack as MediaStreamTrackImpl, MockBlobEvent as BlobEventImpl } from './mocks/browser-apis';
declare global {
    interface Window {
        BlobEvent: typeof BlobEventImpl;
        AudioContext: typeof AudioContextImpl;
        MediaRecorder: typeof MediaRecorderImpl;
        MediaStream: typeof MediaStreamImpl;
        MediaStreamTrack: typeof MediaStreamTrackImpl;
    }
}
