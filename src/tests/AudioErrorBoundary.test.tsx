import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioErrorBoundary } from "@/components/error-boundaries/AudioErrorBoundary";
import {
  AudioServiceError,
  AudioServiceState,
  AudioErrorCategory,
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
    isContextRunning: false,
    sampleRate: 44100,
    error: {
      code: AudioServiceError.INITIALIZATION_FAILED,
      message: "Failed to initialize audio",
      details: { originalError: new Error("Test error") },
    },
    context: {
      sampleRate: 44100,
      channelCount: 1,
      isContextRunning: false,
      vadEnabled: false,
      vadThreshold: 0.5,
      vadSampleRate: 16000,
      vadBufferSize: 480,
      noiseThreshold: 0.2,
      silenceThreshold: 0.1,
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

  it("should display specific error messages for known errors", async () => {
    const errorMessage = "No audio input device was found";
    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      error: {
        name: "DeviceNotFoundError",
        code: AudioServiceError.DEVICE_NOT_FOUND,
        message: errorMessage,
        category: AudioErrorCategory.DEVICE,
        details: { deviceId: "test-device" },
      },
    });

    render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
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

  it("should handle multiple errors in sequence", async () => {
    // First error
    const firstErrorMessage = "No audio input device was found";
    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      error: {
        name: "DeviceNotFoundError",
        code: AudioServiceError.DEVICE_NOT_FOUND,
        message: firstErrorMessage,
        category: AudioErrorCategory.DEVICE,
        details: { deviceId: "test-device" },
      },
    });

    const { rerender } = render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    expect(await screen.findByText(firstErrorMessage)).toBeInTheDocument();

    // Second error
    const secondErrorMessage = "Permission denied";
    mockedAudioService.getState.mockReturnValue({
      ...mockAudioState,
      error: {
        name: "PermissionDeniedError",
        code: AudioServiceError.PERMISSION_DENIED,
        message: secondErrorMessage,
        category: AudioErrorCategory.PERMISSION,
        details: { permission: "microphone" },
      },
    });

    rerender(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    expect(await screen.findByText(secondErrorMessage)).toBeInTheDocument();
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

  it("should cleanup on unmount", async () => {
    mockedAudioService.cleanup.mockResolvedValueOnce(undefined);

    const { unmount } = render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    unmount();
    await expect(mockedAudioService.cleanup).toHaveBeenCalled();
  });
});
