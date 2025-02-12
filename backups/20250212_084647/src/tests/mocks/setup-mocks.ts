import { MockBlob, MockAudioContext } from './browser-apis';

// Store original constructors
const originalConstructors = {
  Blob: globalThis.Blob,
  AudioContext: (globalThis as any).AudioContext,
  webkitAudioContext: (globalThis as any).webkitAudioContext
};

// Setup mocks
export function setupMocks() {
  globalThis.Blob = MockBlob as any;
  (globalThis as any).AudioContext = MockAudioContext;
  (globalThis as any).webkitAudioContext = MockAudioContext;
}

// Restore originals
export function restoreMocks() {
  globalThis.Blob = originalConstructors.Blob;
  (globalThis as any).AudioContext = originalConstructors.AudioContext;
  (globalThis as any).webkitAudioContext = originalConstructors.webkitAudioContext;
}

// Setup mocks immediately
setupMocks();
