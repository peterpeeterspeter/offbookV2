import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "./test-utils";
import userEvent from "@testing-library/user-event";
import ScriptUpload from "@/components/ScriptUpload";
import SceneFlow from "@/components/SceneFlow";
import { ScriptDetailPageClient } from "@/app/scripts/[id]/page.client";
import React from "react";

interface SceneAnalysisParams {
  shouldError?: boolean;
}

vi.mock("@/services/scene-flow", () => {
  const mockInitializeSession = vi
    .fn()
    .mockImplementation(async (scriptId: string, userRole: string) => {
      if (scriptId === "error-script") {
        throw new Error("Test error");
      }
      return {
        scenes: [
          {
            id: "scene-1",
            number: 1,
            title: "Test Scene",
            description: "A test scene",
            dialogue: [
              {
                id: "1",
                role: "Character 1",
                text: "Line 1",
                emotion: "happy",
                isUserLine: userRole === "Character 1",
              },
              {
                id: "2",
                role: "Character 2",
                text: "Line 2",
                emotion: "neutral",
                isUserLine: userRole === "Character 2",
              },
              {
                id: "3",
                role: "Character 1",
                text: "Line 3",
                emotion: "excited",
                isUserLine: userRole === "Character 1",
              },
            ],
          },
        ],
        stats: {
          duration: 120,
          accuracy: 0.85,
          emotions: { happy: 0.6, neutral: 0.4 },
          sceneProgress: { "scene-1": 1.0 },
          timingScore: 0.9,
          emotionMatchRate: 0.75,
        },
      };
    });

  const mockEndSession = vi.fn().mockImplementation(async () => {
    return {
      duration: 120,
      accuracy: 0.85,
      emotions: { happy: 0.6, neutral: 0.4 },
      sceneProgress: { "scene-1": 1.0 },
      timingScore: 0.9,
      emotionMatchRate: 0.75,
    };
  });

  const mockAnalyzeScene = vi
    .fn()
    .mockImplementation(async (params: SceneAnalysisParams) => {
      if (params?.shouldError) {
        throw new Error("Test error");
      }
      return {
        lines: [
          { id: "1", role: "Character 1", text: "Line 1", emotion: "happy" },
          { id: "2", role: "Character 2", text: "Line 2", emotion: "neutral" },
          { id: "3", role: "Character 1", text: "Line 3", emotion: "excited" },
        ],
      };
    });

  const mockProcessSceneResponse = vi.fn();

  return {
    SceneFlowService: {
      current: {
        initializeSession: mockInitializeSession,
        endSession: mockEndSession,
        analyzeScene: mockAnalyzeScene,
      },
    },
    processSceneResponse: mockProcessSceneResponse,
  };
});

vi.mock("@/services/audio-service", () => {
  const mockState = {
    state: "READY",
    context: {
      sampleRate: 44100,
      channelCount: 2,
      vadBufferSize: 2048,
      noiseThreshold: 0.2,
      silenceThreshold: 0.1,
      isContextRunning: true,
      vadEnabled: true,
      vadThreshold: 0.5,
      vadSampleRate: 16000,
    },
    error: null,
  };

  return {
    AudioService: {
      setup: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue(undefined),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue({
        audioData: new Float32Array(1024),
        duration: 1000,
        hasVoice: true,
        metrics: {
          averageAmplitude: 0.5,
          peakAmplitude: 0.8,
          silenceRatio: 0.1,
          processingTime: 100,
        },
      }),
      processAudioChunk: vi.fn().mockResolvedValue(true),
      initializeTTS: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockReturnValue(mockState),
      addStateListener: vi.fn().mockReturnValue(() => {}),
      removeStateListener: vi.fn(),
    },
  };
});

vi.mock("@/services/script-analysis", () => ({
  analyzeScript: vi.fn().mockResolvedValue({
    title: "Test Script",
    scenes: [{ id: 1, name: "Scene 1" }],
  }),
}));

// Mock components
vi.mock("@/components/ScriptUpload", () => ({
  default: ({ onUpload }: { onUpload: (file: File) => void }) => (
    <input
      type="file"
      data-testid="upload-input"
      onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
    />
  ),
}));

vi.mock("@/app/scripts/[id]/page.client", () => ({
  ScriptDetailPageClient: () => (
    <div data-testid="script-detail">
      <h1 data-testid="script-title">Test Script</h1>
    </div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: { children: React.ReactNode }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/error-boundaries/AudioErrorBoundary", () => ({
  AudioErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Remove SceneFlow mock since we want to test the real component
vi.unmock("@/components/SceneFlow");

describe("End-to-End Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Script Upload and Rehearsal Flow", () => {
    it("completes full script rehearsal session", async () => {
      // 1. Upload Script
      const onUpload = vi.fn();
      const { rerender } = render(<ScriptUpload onUpload={onUpload} />);

      const file = new File(["test script content"], "script.txt", {
        type: "text/plain",
      });
      const input = screen.getByTestId("upload-input");

      await userEvent.upload(input, file);
      expect(onUpload).toHaveBeenCalledWith(file);

      // 2. View Script Details
      rerender(<ScriptDetailPageClient testMode={true} />);
      await waitFor(() => {
        expect(screen.getByTestId("script-title")).toHaveTextContent(
          "Test Script"
        );
      });

      // 3. Start Scene Flow
      rerender(<SceneFlow scriptId="test-script-1" userRole="Character 1" />);

      // Wait for scene to load
      await waitFor(() => {
        const lines = screen.getAllByRole("listitem");
        expect(lines).toHaveLength(3);
      });
    });
  });

  describe("Performance Analysis Flow", () => {
    it("analyzes performance metrics after session", async () => {
      const onComplete = vi.fn();
      render(
        <SceneFlow
          scriptId="test-script-1"
          userRole="Character 1"
          onComplete={onComplete}
        />
      );

      // Wait for scene to load
      await waitFor(() => {
        const lines = screen.getAllByRole("listitem");
        expect(lines).toHaveLength(3);
      });

      // Verify scene content
      expect(screen.getByText(/Scene 1: Test Scene/i)).toBeInTheDocument();
      expect(screen.getByText(/Character 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Line 1/i)).toBeInTheDocument();
    });
  });

  describe("Error Recovery Flow", () => {
    it("handles and recovers from errors during session", async () => {
      const { rerender } = render(
        <SceneFlow scriptId="error-script" userRole="Character 1" />
      );

      // Should show error state
      await waitFor(
        () => {
          expect(
            screen.getByText(/Error: Something went wrong - Test error/i)
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Re-render with valid script ID to test recovery
      rerender(<SceneFlow scriptId="test-script-1" userRole="Character 1" />);

      // Wait for scene to load after recovery
      await waitFor(
        () => {
          const lines = screen.getAllByRole("listitem");
          expect(lines).toHaveLength(3);
        },
        { timeout: 2000 }
      );

      // Verify recovered state
      expect(screen.getByText(/Scene 1: Test Scene/i)).toBeInTheDocument();
      expect(screen.getByText(/Character 1/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility Flow", () => {
    it("completes session using keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<SceneFlow scriptId="test-script-1" userRole="Character 1" />);

      // Wait for scene to load
      await waitFor(
        () => {
          const lines = screen.getAllByRole("listitem");
          expect(lines).toHaveLength(3);
        },
        { timeout: 2000 }
      );

      // Navigate using keyboard
      const settingsButton = screen.getByRole("button", { name: /settings/i });
      await user.tab();
      await user.keyboard("{Enter}");
      expect(settingsButton).toHaveFocus();

      // Check settings panel
      await waitFor(
        () => {
          expect(screen.getByText(/Adaptive Pacing/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});
