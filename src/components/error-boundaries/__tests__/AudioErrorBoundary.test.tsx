import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react-dom/test-utils";
import { AudioErrorBoundary } from "../AudioErrorBoundary";
import { waitForStateUpdate } from "../../../test/setup";
import { AudioService } from "@/services/audio-service";
import {
  AudioServiceError,
  AudioServiceState,
  AudioErrorCategory,
  AudioServiceEvent,
} from "@/types/audio";

// Mock AudioService
vi.mock("@/services/audio-service", () => ({
  AudioService: {
    getState: vi.fn().mockReturnValue({
      state: AudioServiceState.ERROR,
      error: {
        category: AudioErrorCategory.INITIALIZATION,
        code: AudioServiceError.INITIALIZATION_FAILED,
        message: "An error occurred",
        details: { retryable: true },
      },
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
    setup: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock navigator.mediaDevices
const mockEnumerateDevices = vi.fn();
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, "mediaDevices", {
  value: {
    enumerateDevices: mockEnumerateDevices,
    getUserMedia: mockGetUserMedia,
    dispatchEvent: vi.fn(),
  },
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

describe("AudioErrorBoundary", () => {
  const ErrorComponent = ({ shouldThrow = false }) => {
    if (shouldThrow) {
      throw new Error("Test error");
    }
    return <div>Test Component</div>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <AudioErrorBoundary>
        <div data-testid="test-child">Test Child</div>
      </AudioErrorBoundary>
    );

    expect(screen.getByTestId("test-child")).toBeInTheDocument();
  });

  it("renders error UI when an error occurs", () => {
    render(
      <AudioErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    expect(screen.getByText("Audio Error")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("calls onReset when try again is clicked", async () => {
    const onReset = vi.fn();
    render(
      <AudioErrorBoundary onReset={onReset}>
        <ErrorComponent shouldThrow={true} />
      </AudioErrorBoundary>
    );

    fireEvent.click(screen.getByText("Try Again"));
    expect(onReset).toHaveBeenCalled();
  });

  it("should show correct error message for permission denied", async () => {
    (AudioService.getState as any).mockReturnValue({
      state: AudioServiceState.ERROR,
      error: {
        category: AudioErrorCategory.PERMISSION,
        code: AudioServiceError.PERMISSION_DENIED,
        message: "Microphone access was denied",
        retryable: true,
      },
    });

    await act(async () => {
      render(
        <AudioErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </AudioErrorBoundary>
      );
    });

    expect(screen.getByText(/microphone access/i)).toBeInTheDocument();
  });

  it("should handle reset action", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await act(async () => {
      render(
        <AudioErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </AudioErrorBoundary>
      );
    });

    const resetButton = screen.getByText(/try again/i);

    await act(async () => {
      fireEvent.click(resetButton);
      await waitForStateUpdate();
    });

    expect(screen.queryByText(/An error occurred/i)).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("should handle audio reset action", async () => {
    const mockAudioContext = new window.AudioContext();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await act(async () => {
      render(
        <AudioErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </AudioErrorBoundary>
      );
    });

    const resetButton = screen.getByText(/reset audio/i);

    await act(async () => {
      fireEvent.click(resetButton);
      await waitForStateUpdate();
    });

    expect(mockAudioContext.close).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("should handle permission request", async () => {
    const mockGetUserMedia = navigator.mediaDevices.getUserMedia as ReturnType<
      typeof vi.fn
    >;

    await act(async () => {
      render(
        <AudioErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </AudioErrorBoundary>
      );
    });

    const requestButton = screen.getByText(/request permission/i);

    await act(async () => {
      fireEvent.click(requestButton);
      await waitForStateUpdate();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it("should handle state transitions during recovery", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await act(async () => {
      render(
        <AudioErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </AudioErrorBoundary>
      );
    });

    const resetButton = screen.getByText(/try again/i);

    await act(async () => {
      fireEvent.click(resetButton);
      await waitForStateUpdate();
    });

    expect(screen.queryByText(/An error occurred/i)).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("should handle concurrent recovery actions", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await act(async () => {
      render(
        <AudioErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </AudioErrorBoundary>
      );
    });

    const resetButton = screen.getByText(/try again/i);
    const audioResetButton = screen.getByText(/reset audio/i);

    await act(async () => {
      fireEvent.click(resetButton);
      fireEvent.click(audioResetButton);
      await waitForStateUpdate();
    });

    expect(screen.queryByText(/An error occurred/i)).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  describe("Error Capture", () => {
    it("should catch and display React errors", () => {
      const { container } = render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(container.textContent).toContain(
        "An unexpected audio error occurred"
      );
    });

    it("should display specific error messages for known errors", () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.DEVICE,
          code: AudioServiceError.DEVICE_NOT_FOUND,
          message: "No audio input device was found",
          retryable: true,
        },
      });

      const { container } = render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(container.textContent).toContain(
        "No audio input device was found"
      );
    });

    it("should preserve error context", () => {
      const errorContext = { deviceId: "test-device" };
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.DEVICE,
          code: AudioServiceError.DEVICE_IN_USE,
          message: "Device in use",
          context: errorContext,
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      const state = AudioService.getState();
      expect(state.error?.context).toEqual(errorContext);
    });

    it("should handle multiple errors in sequence", () => {
      // First error
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.DEVICE,
          code: AudioServiceError.DEVICE_NOT_FOUND,
          message: "No audio input device was found",
          retryable: true,
        },
      });

      const { rerender } = render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(
        screen.getByText("No audio input device was found")
      ).toBeInTheDocument();

      // Second error
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.PERMISSION,
          code: AudioServiceError.PERMISSION_DENIED,
          message: "Permission denied",
          retryable: true,
        },
      });

      rerender(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(screen.getByText("Permission denied")).toBeInTheDocument();
    });

    it("should handle non-retryable errors", () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.BROWSER,
          code: AudioServiceError.BROWSER_UNSUPPORTED,
          message: "Browser not supported",
          retryable: false,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
    });
  });

  describe("Recovery Actions", () => {
    it("should handle device errors with appropriate actions", async () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.DEVICE,
          code: AudioServiceError.DEVICE_NOT_FOUND,
          message: "No audio input device was found",
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(screen.getByText("Check Devices")).toBeInTheDocument();
      expect(screen.getByText("Refresh Devices")).toBeInTheDocument();

      // Test Check Devices action
      mockEnumerateDevices.mockResolvedValueOnce([
        { kind: "audioinput", deviceId: "test-device" },
      ]);

      await fireEvent.click(screen.getByText("Check Devices"));
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      });
    });

    it("should handle permission errors with settings action", async () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.PERMISSION,
          code: AudioServiceError.PERMISSION_DENIED,
          message: "Permission denied",
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(screen.getByText("Open Settings")).toBeInTheDocument();

      await fireEvent.click(screen.getByText("Open Settings"));
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it("should handle network errors with connection check", async () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.NETWORK,
          code: AudioServiceError.NETWORK_TIMEOUT,
          message: "Network timeout",
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(screen.getByText("Check Connection")).toBeInTheDocument();
      expect(screen.getByText("Retry (Slow Connection)")).toBeInTheDocument();

      await fireEvent.click(screen.getByText("Check Connection"));
      expect(global.fetch).toHaveBeenCalledWith("/api/health");
    });

    it("should handle resource errors with cleanup actions", async () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.RESOURCE,
          code: AudioServiceError.MEMORY_EXCEEDED,
          message: "Memory exceeded",
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(screen.getByText("Clear Data")).toBeInTheDocument();
      expect(screen.getByText("Reduce Quality")).toBeInTheDocument();

      await fireEvent.click(screen.getByText("Clear Data"));
      expect(AudioService.cleanup).toHaveBeenCalled();
    });

    it("should handle system errors with diagnostics", async () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.SYSTEM,
          code: AudioServiceError.INITIALIZATION_FAILED,
          message: "Initialization failed",
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(screen.getByText("Run Diagnostics")).toBeInTheDocument();
      expect(screen.getByText("Full Reset")).toBeInTheDocument();

      await fireEvent.click(screen.getByText("Full Reset"));
      expect(AudioService.cleanup).toHaveBeenCalled();
      expect(AudioService.setup).toHaveBeenCalled();
    });

    it("should handle failed recovery actions gracefully", async () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.DEVICE,
          code: AudioServiceError.DEVICE_NOT_FOUND,
          message: "No audio input device was found",
          retryable: true,
        },
      });

      mockGetUserMedia.mockRejectedValueOnce(new Error("Permission denied"));

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      await fireEvent.click(screen.getByText("Check Devices"));

      // Error should still be displayed
      expect(
        screen.getByText("No audio input device was found")
      ).toBeInTheDocument();
    });

    it("should cleanup resources when unmounted during recovery", async () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.SYSTEM,
          code: AudioServiceError.INITIALIZATION_FAILED,
          message: "Initialization failed",
          retryable: true,
        },
      });

      const { unmount } = render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      fireEvent.click(screen.getByText("Run Diagnostics"));
      unmount();

      expect(AudioService.cleanup).toHaveBeenCalled();
    });
  });

  describe("UI Components", () => {
    it("should render error message and hint", () => {
      const hint = "Try connecting a microphone";
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.DEVICE,
          code: AudioServiceError.DEVICE_NOT_FOUND,
          message: "No audio input device was found",
          hint,
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(
        screen.getByText("No audio input device was found")
      ).toBeInTheDocument();
      expect(screen.getByText(`Hint: ${hint}`)).toBeInTheDocument();
    });

    it("should style primary and secondary actions differently", () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.DEVICE,
          code: AudioServiceError.DEVICE_NOT_FOUND,
          message: "No audio input device was found",
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      const primaryButton = screen.getByText("Try Again");
      const secondaryButton = screen.getByText("Check Devices");

      expect(primaryButton.className).toContain("bg-red-600");
      expect(secondaryButton.className).toContain("bg-white");
    });
  });

  describe("Integration", () => {
    it("should handle state transitions during recovery", async () => {
      const stateSequence = [
        {
          state: AudioServiceState.ERROR,
          error: {
            category: AudioErrorCategory.DEVICE,
            code: AudioServiceError.DEVICE_NOT_FOUND,
            message: "No audio input device was found",
            retryable: true,
          },
        },
        {
          state: AudioServiceState.INITIALIZING,
          error: null,
        },
        {
          state: AudioServiceState.READY,
          error: null,
        },
      ];

      let currentStateIndex = 0;
      (AudioService.getState as any).mockImplementation(
        () => stateSequence[currentStateIndex]
      );

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      // Initial error state
      expect(
        screen.getByText("No audio input device was found")
      ).toBeInTheDocument();

      // Simulate recovery
      currentStateIndex = 1;
      await fireEvent.click(screen.getByText("Try Again"));

      // Should show children when recovered
      currentStateIndex = 2;
      expect(
        screen.queryByText("No audio input device was found")
      ).not.toBeInTheDocument();
    });

    it("should persist error context through recovery attempts", async () => {
      const errorContext = { attemptCount: 0 };

      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.NETWORK,
          code: AudioServiceError.NETWORK_TIMEOUT,
          message: "Network timeout",
          retryable: true,
          context: errorContext,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      // Update context
      errorContext.attemptCount++;

      await fireEvent.click(screen.getByText("Check Connection"));
      const state = AudioService.getState();
      expect(state.error?.context).toEqual({ attemptCount: 1 });
    });

    it("should handle concurrent recovery actions", async () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.RESOURCE,
          code: AudioServiceError.MEMORY_EXCEEDED,
          message: "Memory exceeded",
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      // Trigger multiple actions simultaneously
      const clearDataPromise = fireEvent.click(screen.getByText("Clear Data"));
      const reduceQualityPromise = fireEvent.click(
        screen.getByText("Reduce Quality")
      );

      await Promise.all([clearDataPromise, reduceQualityPromise]);

      expect(AudioService.cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined error messages", () => {
      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.SYSTEM,
          code: "UNKNOWN_ERROR" as any,
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      expect(
        screen.getByText("An unexpected audio error occurred")
      ).toBeInTheDocument();
    });

    it("should handle rapid state changes", async () => {
      const { rerender } = render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      // Rapid state changes
      for (let i = 0; i < 5; i++) {
        (AudioService.getState as any).mockReturnValue({
          state: AudioServiceState.ERROR,
          error: {
            category: AudioErrorCategory.SYSTEM,
            code: AudioServiceError.INITIALIZATION_FAILED,
            message: `Error ${i}`,
            retryable: true,
          },
        });

        rerender(
          <AudioErrorBoundary>
            <ErrorComponent />
          </AudioErrorBoundary>
        );
      }

      // Should show the last error
      expect(screen.getByText("Error 4")).toBeInTheDocument();
    });

    it("should handle missing navigator APIs", async () => {
      // Temporarily remove navigator.mediaDevices
      const originalMediaDevices = navigator.mediaDevices;
      Object.defineProperty(navigator, "mediaDevices", {
        value: undefined,
        writable: true,
      });

      (AudioService.getState as any).mockReturnValue({
        state: AudioServiceState.ERROR,
        error: {
          category: AudioErrorCategory.DEVICE,
          code: AudioServiceError.DEVICE_NOT_FOUND,
          message: "No audio input device was found",
          retryable: true,
        },
      });

      render(
        <AudioErrorBoundary>
          <ErrorComponent />
        </AudioErrorBoundary>
      );

      await fireEvent.click(screen.getByText("Check Devices"));

      // Restore navigator.mediaDevices
      Object.defineProperty(navigator, "mediaDevices", {
        value: originalMediaDevices,
        writable: true,
      });
    });
  });
});
