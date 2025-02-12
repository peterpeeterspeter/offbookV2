import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioErrorBoundary } from "@/components/error-boundaries/AudioErrorBoundary";
import { AudioService } from "@/services/audio-service";
import {
  AudioServiceError,
  AudioServiceState,
  AudioErrorCategory,
  type AudioErrorDetails,
  type AudioServiceStateData,
} from "@/types/audio";
import React from "react";

// Mock AudioService
const mockedAudioService = {
  getState: vi.fn(),
  cleanup: vi.fn(),
  setup: vi.fn(),
};

vi.mock("@/services/audio-service", () => ({
  AudioService: mockedAudioService,
}));

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
  const ErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({
    shouldThrow = false,
  }) => {
    if (shouldThrow) {
      throw new Error("Test error");
    }
    return <div>Test Content</div>;
  };

  const mockAudioState: AudioServiceStateData = {
    state: AudioServiceState.ERROR,
    status: "error",
    timestamp: Date.now(),
    error: {
      name: "InitializationError",
      code: AudioServiceError.INITIALIZATION_FAILED,
      message: "Failed to initialize audio",
      category: AudioErrorCategory.INITIALIZATION,
      retryable: false,
      details: { originalError: new Error("Test error") },
    },
    context: {
      sampleRate: 44100,
      channels: 1,
      isContextRunning: false,
      vadEnabled: false,
      vadThreshold: 0.5,
      vadSampleRate: 16000,
      vadBufferSize: 480,
      noiseThreshold: 0.2,
      silenceThreshold: 0.1,
    },
    session: {
      id: null,
      startTime: null,
      duration: null,
      chunks: 0,
    },
  };

  beforeEach(() => {
    mockedAudioService.getState.mockReturnValue(mockAudioState);
  });

  it("should render children when no error", () => {
    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      state: AudioServiceState.READY,
      error: null,
    });

    render(
      <AudioErrorBoundary>
        <div data-testid="child">Test Content</div>
      </AudioErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should catch and display React errors", () => {
    render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    expect(screen.getByText("Audio Error")).toBeInTheDocument();
  });

  it("should display specific error messages for known errors", () => {
    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      error: {
        name: "DeviceNotFoundError",
        code: AudioServiceError.DEVICE_NOT_FOUND,
        message: "No audio input device was found",
        category: AudioErrorCategory.DEVICE,
        retryable: true,
        details: { deviceId: "test-device" },
      },
    });

    render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    expect(
      screen.getByText("No audio input device was found")
    ).toBeInTheDocument();
  });

  it("should preserve error context", () => {
    const errorDetails = { deviceId: "test-device" };
    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      error: {
        name: "DeviceInUseError",
        code: AudioServiceError.DEVICE_IN_USE,
        message: "Device in use",
        category: AudioErrorCategory.DEVICE,
        retryable: true,
        details: errorDetails,
      },
    });

    render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    const state = mockedAudioService.getState();
    expect(state.error?.details).toEqual(errorDetails);
  });

  it("should handle multiple errors in sequence", () => {
    // First error
    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      error: {
        name: "DeviceNotFoundError",
        code: AudioServiceError.DEVICE_NOT_FOUND,
        message: "No audio input device was found",
        category: AudioErrorCategory.DEVICE,
        retryable: true,
        details: { deviceId: "test-device" },
      },
    });

    const { rerender } = render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    expect(
      screen.getByText("No audio input device was found")
    ).toBeInTheDocument();

    // Second error
    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      error: {
        name: "PermissionDeniedError",
        code: AudioServiceError.PERMISSION_DENIED,
        message: "Permission denied",
        category: AudioErrorCategory.PERMISSION,
        retryable: true,
        details: { permission: "microphone" },
      },
    });

    rerender(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });

  it("should handle error recovery", () => {
    const onReset = vi.fn();

    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      error: {
        name: "DeviceNotFoundError",
        code: AudioServiceError.DEVICE_NOT_FOUND,
        message: "No audio input device was found",
        category: AudioErrorCategory.DEVICE,
        retryable: true,
        details: { deviceId: "test-device" },
      },
    });

    render(
      <AudioErrorBoundary onReset={onReset}>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    fireEvent.click(screen.getByText("Try Again"));
    expect(onReset).toHaveBeenCalled();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    unmount();
    expect(mockedAudioService.cleanup).toHaveBeenCalled();
  });
});
