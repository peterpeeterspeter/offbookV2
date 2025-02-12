/** @jest-environment jsdom */
/** @jsxImportSource react */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SceneFlow, { type SceneStats, type Scene } from "../SceneFlow";
import { render } from "../../test/test-utils";
import { SceneFlowService } from "../../services/scene-flow";
import { AudioService } from "../../services/audio-service";
import { ScriptAnalysisService } from "../../services/script-analysis";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    themes: ["light", "dark"],
    systemTheme: "light",
  }),
}));

// Mock AudioContext
class MockAudioContext {
  createGain() {
    return {
      connect: vi.fn(),
      gain: { value: 1 },
    };
  }
}

// Mock test data
const mockScene: Scene = {
  id: "scene-1",
  number: 1,
  title: "Scene 1",
  description: "First scene",
  dialogue: [
    { id: "line-1", role: "Character 1", text: "First line" },
    { id: "line-2", role: "Character 2", text: "Second line" },
  ],
};

const mockStats: SceneStats = {
  duration: 120,
  accuracy: 0.85,
  emotions: { joy: 0.7, neutral: 0.3 },
  sceneProgress: { "scene-1": 1 },
  timingScore: 0.9,
  emotionMatchRate: 0.8,
};

// Mock services
vi.mock("../../services/scene-flow", () => ({
  SceneFlowService: {
    initialize: vi.fn().mockResolvedValue({
      scenes: [mockScene],
      stats: mockStats,
    }),
    processScene: vi.fn().mockResolvedValue({
      success: true,
      scene: mockScene,
      stats: mockStats,
    }),
    cleanup: vi.fn().mockResolvedValue(mockStats),
  },
}));

vi.mock("../../services/audio-service", () => ({
  AudioService: {
    setup: vi.fn().mockResolvedValue(undefined),
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue({
      duration: 10,
      accuracy: 0.9,
    }),
  },
}));

vi.mock("../../services/script-analysis", () => ({
  ScriptAnalysisService: {
    analyze: vi.fn().mockResolvedValue({
      scenes: [mockScene],
      characters: ["Character 1", "Character 2"],
    }),
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }: any) => (
      <aside {...props}>{children}</aside>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("SceneFlow", () => {
  const user = userEvent.setup();
  const mockProps = {
    scriptId: "test-script-1",
    userRole: "Character 1",
    onComplete: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.AudioContext = MockAudioContext as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("initializes correctly", async () => {
    render(<SceneFlow {...mockProps} />);

    await waitFor(() => {
      expect(SceneFlowService.initialize).toHaveBeenCalledWith(
        mockProps.scriptId
      );
    });
  });

  it("handles scene navigation", async () => {
    render(<SceneFlow {...mockProps} />);

    const nextButton = await screen.findByRole("button", { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(SceneFlowService.processScene).toHaveBeenCalled();
    });
  });

  it("handles audio recording", async () => {
    render(<SceneFlow {...mockProps} />);

    const recordButton = await screen.findByRole("button", { name: /record/i });
    await user.click(recordButton);

    await waitFor(() => {
      expect(AudioService.startRecording).toHaveBeenCalled();
    });

    await user.click(recordButton);

    await waitFor(() => {
      expect(AudioService.stopRecording).toHaveBeenCalled();
    });
  });

  it("updates UI based on scene changes", async () => {
    const { rerender } = render(<SceneFlow {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("scene-container")).toBeInTheDocument();
    });

    // Simulate scene change
    rerender(<SceneFlow {...mockProps} initialScene={1} />);

    await waitFor(() => {
      expect(SceneFlowService.processScene).toHaveBeenCalledWith(1);
    });
  });

  it("renders initial scene flow interface", async () => {
    await waitFor(() => {
      render(<SceneFlow {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Scene Flow Mode")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Scene Selection/i })
      ).toBeInTheDocument();
    });
  });

  it("toggles scene selector", async () => {
    await waitFor(() => {
      render(<SceneFlow {...mockProps} />);
    });

    await waitFor(
      () => {
        expect(screen.getByText("First line")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    const sceneSelectorButton = screen.getByRole("button", {
      name: /Scene Selection/i,
    });

    await waitFor(
      () => {
        const sceneList = screen.getByRole("complementary", {
          name: /Scene Selection/i,
        });
        expect(sceneList).toBeInTheDocument();
        expect(sceneList).toHaveAttribute("aria-label", "Scene Selection");
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("toggles settings panel", async () => {
    await waitFor(() => {
      render(<SceneFlow {...mockProps} />);
    });

    await waitFor(
      () => {
        expect(screen.getByText("First line")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    const settingsButton = screen.getByRole("button", { name: /settings/i });

    await waitFor(
      () => {
        expect(
          screen.getByRole("dialog", { name: /settings/i })
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/adaptive pacing/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/show emotions/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/auto-advance/i)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("handles recording state", async () => {
    await waitFor(() => {
      render(<SceneFlow {...mockProps} />);
    });

    // Wait for initial scene load
    await waitFor(
      () => {
        expect(screen.getByText("First line")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Check if recording status is shown
    expect(
      screen.getByRole("status", { name: /recording in progress/i })
    ).toBeInTheDocument();
  }, 15000);

  it("calls onComplete with stats when session ends", async () => {
    let unmount: () => void;
    await waitFor(() => {
      const result = render(<SceneFlow {...mockProps} />);
      unmount = result.unmount;
    });

    // Wait for initial scene load
    await waitFor(
      () => {
        expect(screen.getByText("First line")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Unmount to trigger session end
    await waitFor(() => {
      unmount();
    });

    // Check if onComplete was called with stats
    expect(mockProps.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: expect.any(Number),
        accuracy: expect.any(Number),
        emotions: expect.any(Object),
        sceneProgress: expect.any(Object),
      })
    );
  }, 15000);

  it("maintains accessibility requirements", async () => {
    await waitFor(() => {
      render(<SceneFlow {...mockProps} />);
    });

    await waitFor(
      () => {
        expect(screen.getByText("First line")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Check if main navigation elements are accessible
    const sceneSelectorButton = screen.getByRole("button", {
      name: /Scene Selection/i,
    });
    const settingsButton = screen.getByRole("button", { name: /settings/i });

    // Verify ARIA labels and keyboard accessibility
    expect(sceneSelectorButton).toHaveAttribute(
      "aria-label",
      "Scene Selection"
    );
    expect(settingsButton).toHaveAttribute("aria-label", "settings");

    // Test keyboard interaction
    await waitFor(() => {
      // Click the scene selector button first
      fireEvent.click(sceneSelectorButton);
    });

    // Scene selector should be visible and accessible
    await waitFor(
      () => {
        const sceneList = screen.getByRole("complementary", {
          name: /Scene Selection/i,
        });
        expect(sceneList).toBeInTheDocument();
        expect(sceneList).toHaveAttribute("aria-label", "Scene Selection");
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("displays lines correctly with emotions when enabled", async () => {
    await waitFor(() => {
      render(<SceneFlow {...mockProps} />);
    });

    // Wait for initial scene load
    await waitFor(
      () => {
        expect(screen.getByText("First line")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Check if all lines from Scene 1 are displayed with correct roles and emotions
    expect(screen.getAllByText("Character 1")).toHaveLength(2); // Two lines for Character 1 in Scene 1
    expect(screen.getByText("First line")).toBeInTheDocument();
    expect(screen.getByText("Second line")).toBeInTheDocument();
    expect(screen.getByText("Emotion: happy")).toBeInTheDocument();
    expect(screen.getByText("Emotion: sad")).toBeInTheDocument();
  }, 15000);

  it("navigates between scenes and displays correct lines", async () => {
    await waitFor(() => {
      render(<SceneFlow {...mockProps} />);
    });

    // Wait for initial scene load
    await waitFor(
      () => {
        expect(screen.getByText("First line")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Open scene selector
    const sceneSelectorButton = screen.getByRole("button", {
      name: /Scene Selection/i,
    });
    await waitFor(() => {
      fireEvent.click(sceneSelectorButton);
    });

    // Select Scene 2
    await waitFor(
      () => {
        const scene2Button = screen.getAllByRole("button", {
          name: /Select Scene/i,
        })[1];
        return scene2Button;
      },
      { timeout: 10000 }
    ).then(async (scene2Button) => {
      await waitFor(() => {
        fireEvent.click(scene2Button);
      });
    });

    // Check if Scene 2's line is displayed
    await waitFor(
      () => {
        expect(screen.getByText("Third line")).toBeInTheDocument();
        expect(screen.getByText("Emotion: neutral")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 15000);
});
