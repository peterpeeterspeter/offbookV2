import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioErrorBoundary } from "@/components/error-boundaries/AudioErrorBoundary";
import { AudioService } from "@/services/audio-service";
import {
  AudioServiceError,
  AudioServiceState,
  AudioErrorCategory,
  type AudioErrorDetails,
} from "@/services/audio-state";

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
  vi.clearAllMocks();
});

describe("AudioErrorBoundary", () => {
  const ErrorComponent = () => {
    throw new Error("Test error");
  };

  const mockAudioState = {
    state: AudioServiceState.ERROR,
    error: {
      code: AudioServiceError.INITIALIZATION_FAILED,
      message: "Failed to initialize audio",
      category: AudioErrorCategory.SYSTEM,
      retryable: true,
      timestamp: Date.now(),
    } as AudioErrorDetails,
    session: {
      id: null,
      startTime: null,
      duration: null,
      chunks: 0,
    },
    context: {
      sampleRate: 44100,
      channels: 1,
      isContextRunning: false,
      networkTimeout: 5000,
      bitsPerSample: 16,
      bufferSize: 4096,
      compressionFormat: "wav",
      vadEnabled: false,
      vadThreshold: 0.5,
      vadSampleRate: 16000,
      vadBufferSize: 512,
      silenceThreshold: -50,
      noiseThreshold: -30,
    },
  };

  beforeEach(() => {
    vi.spyOn(AudioService, "getState").mockReturnValue(mockAudioState);
  });

  it("should render children when no error", () => {
    vi.spyOn(AudioService, "getState").mockReturnValue({
      ...mockAudioState,
      state: AudioServiceState.READY,
      error: null,
    });

    const { container } = render(
      <AudioErrorBoundary>
        <div data-testid="child">Test Content</div>
      </AudioErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(container.textContent).toBe("Test Content");
  });

  it("should render error UI when error occurs", () => {
    render(
      <AudioErrorBoundary>
        <ErrorComponent />
      </AudioErrorBoundary>
    );

    expect(screen.getByText("Audio Error")).toBeInTheDocument();
    expect(screen.getByText(/Failed to initialize audio/)).toBeInTheDocument();
  });

  it("should show correct error message for permission denied", () => {
    vi.spyOn(AudioService, "getState").mockReturnValue({
      ...mockAudioState,
      error: {
        code: AudioServiceError.PERMISSION_DENIED,
        message: "Microphone access was denied",
        category: AudioErrorCategory.PERMISSION,
        retryable: true,
        timestamp: Date.now(),
      },
    });

    render(
      <AudioErrorBoundary>
        <ErrorComponent />
      </AudioErrorBoundary>
    );

    expect(
      screen.getByText(/Microphone access was denied/)
    ).toBeInTheDocument();
    expect(screen.getByText("Open Settings")).toBeInTheDocument();
  });

  it("should handle reset action", async () => {
    const onReset = vi.fn();
    render(
      <AudioErrorBoundary onReset={onReset}>
        <ErrorComponent />
      </AudioErrorBoundary>
    );

    fireEvent.click(screen.getByText("Try Again"));
    expect(onReset).toHaveBeenCalled();
  });

  it("should handle audio reset action", async () => {
    const cleanup = vi.spyOn(AudioService, "cleanup").mockResolvedValue();
    const setup = vi.spyOn(AudioService, "setup").mockResolvedValue();

    render(
      <AudioErrorBoundary>
        <ErrorComponent />
      </AudioErrorBoundary>
    );

    const resetButton = screen.getByText("Try Again");
    fireEvent.click(resetButton);

    expect(cleanup).toHaveBeenCalled();
    expect(setup).toHaveBeenCalled();
  });

  it("should handle permission request", async () => {
    vi.spyOn(AudioService, "getState").mockReturnValue({
      ...mockAudioState,
      error: {
        code: AudioServiceError.PERMISSION_DENIED,
        message: "Microphone access was denied",
        category: AudioErrorCategory.PERMISSION,
        retryable: true,
        timestamp: Date.now(),
      },
    });

    const getUserMedia = vi.fn().mockResolvedValue({});
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia },
      writable: true,
    });

    render(
      <AudioErrorBoundary>
        <ErrorComponent />
      </AudioErrorBoundary>
    );

    const openSettingsButton = screen.getByText("Open Settings");
    fireEvent.click(openSettingsButton);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  });
});
