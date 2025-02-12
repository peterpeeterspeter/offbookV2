import { vi } from "vitest";

const mockAudioService = {
  startRecording: vi.fn().mockResolvedValue(undefined),
  stopRecording: vi.fn().mockResolvedValue(undefined),
  isRecording: vi.fn().mockReturnValue(true),
};

export const AudioService = {
  current: mockAudioService,
  initialize: vi.fn().mockResolvedValue(mockAudioService),
};
