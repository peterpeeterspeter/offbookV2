import { render, screen, waitFor, act } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { SceneFlow } from "./SceneFlow";
import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock AudioContext
class MockAudioContext {
  createGain() {
    return {
      connect: vi.fn(),
      gain: { value: 1 },
    };
  }
}

// Mock Radix UI components
vi.mock("@radix-ui/react-dialog", () => {
  let dialogOpenChange: ((open: boolean) => void) | undefined;

  const Overlay = ({ children }: any) => <div>{children}</div>;
  Overlay.displayName = "DialogOverlay";

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      dialogOpenChange?.(false);
    }
  };

  return {
    Root: ({ children, open, onOpenChange }: any) => {
      dialogOpenChange = onOpenChange;
      if (open) {
        window.addEventListener("keydown", handleKeyDown);
      } else {
        window.removeEventListener("keydown", handleKeyDown);
      }
      return <div>{open && children}</div>;
    },
    Portal: ({ children }: any) => <div>{children}</div>,
    Content: ({ children }: any) => (
      <div role="dialog" data-testid="dialog-content">
        {children}
      </div>
    ),
    Header: ({ children }: any) => (
      <div className="flex flex-col space-y-1.5 text-center sm:text-left">
        {children}
      </div>
    ),
    Title: ({ children }: any) => <div>{children}</div>,
    Description: ({ children }: any) => <div>{children}</div>,
    Close: ({ children }: any) => (
      <button onClick={() => dialogOpenChange?.(false)}>{children}</button>
    ),
    Trigger: ({ children }: any) => (
      <button onClick={() => dialogOpenChange?.(true)}>{children}</button>
    ),
    Overlay,
  };
});

vi.mock("@radix-ui/react-switch", () => ({
  Root: ({ children, checked, onCheckedChange, ...props }: any) => (
    <button
      type="button"
      role="switch"
      data-state={checked ? "checked" : "unchecked"}
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      {children}
    </button>
  ),
  Thumb: ({ ...props }: any) => <span data-testid="switch-thumb" {...props} />,
}));

// Mock services
vi.mock("@/services/scene-flow", () => ({
  SceneFlowService: {
    current: {
      initializeSession: vi
        .fn()
        .mockImplementation(async (scriptId: string) => {
          if (scriptId === "error-script") {
            throw new Error("Test error");
          }
          return {
            scenes: [
              {
                id: "scene-1",
                number: 1,
                title: "Scene 1",
                description: "Test scene",
                dialogue: [
                  { id: "1", role: "actor", text: "Line 1", emotion: "happy" },
                  {
                    id: "2",
                    role: "other",
                    text: "Line 2",
                    emotion: "neutral",
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
        }),
      endSession: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/services/audio-service", () => ({
  AudioService: vi.fn().mockImplementation(() => ({
    initializeSession: vi.fn(),
    endSession: vi.fn(),
  })),
}));

vi.mock("@/services/script-analysis", () => ({
  ScriptAnalysisService: vi.fn().mockImplementation(() => ({
    analyze: vi.fn(),
  })),
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

// Mock ScrollArea
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

// Mock Card
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));

// Mock Label
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe("SceneFlow", () => {
  beforeAll(() => {
    // @ts-ignore
    global.AudioContext = MockAudioContext;
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  const createMockProps = (overrides = {}) => ({
    scriptId: "test-script-1",
    userRole: "actor",
    onComplete: vi.fn(),
    ...overrides,
  });

  it("renders without crashing", async () => {
    render(<SceneFlow {...createMockProps()} />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Scene 1/i })
      ).toBeInTheDocument();
    });
  });

  it("handles errors gracefully", async () => {
    const onError = vi.fn();
    const { rerender } = render(
      <SceneFlow {...createMockProps({ scriptId: "error-script", onError })} />
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Test error");
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Test error/i)).toBeInTheDocument();
    });

    await act(async () => {
      rerender(<SceneFlow {...createMockProps()} />);
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Scene 1/i })
      ).toBeInTheDocument();
    });
  });

  it("supports keyboard navigation", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<SceneFlow {...createMockProps()} />);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Scene 1/i })
      ).toBeInTheDocument();
    });

    const settingsButton = screen.getByRole("button", { name: /settings/i });
    await act(async () => {
      await user.click(settingsButton);
    });

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const adaptivePacingSwitch = screen.getByRole("switch", {
      name: /adaptive pacing/i,
    });

    await act(async () => {
      await user.click(adaptivePacingSwitch);
    });

    await waitFor(() => {
      expect(adaptivePacingSwitch).toHaveAttribute("data-state", "checked");
    });

    await act(async () => {
      await user.click(adaptivePacingSwitch);
    });

    await waitFor(() => {
      expect(adaptivePacingSwitch).toHaveAttribute("data-state", "unchecked");
    });

    await act(async () => {
      await user.keyboard("{Escape}");
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
