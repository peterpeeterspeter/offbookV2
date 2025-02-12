import { vi } from 'vitest'
import {
  MockAudioContext as AudioContextImpl,
  MockMediaRecorder as MediaRecorderImpl,
  MockMediaStream as MediaStreamImpl,
  MockMediaStreamTrack as MediaStreamTrackImpl,
  MockBlobEvent as BlobEventImpl
} from './mocks/browser-apis'

// Type definitions
declare global {
  interface Window {
    BlobEvent: typeof BlobEventImpl
    AudioContext: typeof AudioContextImpl
    MediaRecorder: typeof MediaRecorderImpl
    MediaStream: typeof MediaStreamImpl
    MediaStreamTrack: typeof MediaStreamTrackImpl
  }
}

// Add mocks to global scope
Object.defineProperty(window, 'AudioContext', { value: AudioContextImpl })
Object.defineProperty(window, 'MediaRecorder', { value: MediaRecorderImpl })
Object.defineProperty(window, 'MediaStream', { value: MediaStreamImpl })
Object.defineProperty(window, 'MediaStreamTrack', { value: MediaStreamTrackImpl })
Object.defineProperty(window, 'BlobEvent', { value: BlobEventImpl })

// Suppress console errors during tests
vi.spyOn(console, 'error').mockImplementation(() => {})
