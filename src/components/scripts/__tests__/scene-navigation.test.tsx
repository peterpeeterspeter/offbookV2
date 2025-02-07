import { describe, it, vi, expect, beforeEach } from "vitest";
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { SceneNavigation, Scene } from "../scene-navigation";

// Mock components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  Clock: () => <div data-testid="clock-icon" />,
}));

// Mock Framer Motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockScenes: Scene[] = [
  {
    id: "1",
    number: 1,
    duration: 180,
    title: "Scene 1",
    description: "First scene",
  },
  {
    id: "2",
    number: 2,
    duration: 240,
    title: "Scene 2",
    description: "Second scene",
  },
  {
    id: "3",
    number: 3,
    duration: 160,
    title: "Scene 3",
    description: "Third scene",
  },
];

describe("SceneNavigation", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderSceneNavigation = (props = {}) => {
    const defaultProps = {
      scenes: mockScenes,
      currentScene: "1",
      onSceneSelect: vi.fn(),
      testMode: true,
    };

    const mergedProps = { ...defaultProps, ...props };
    const { container } = render(<SceneNavigation {...mergedProps} />);

    const getSceneNavigation = () => {
      const nav = screen.getByTestId("scene-navigation");
      if (!nav) throw new Error("Scene navigation not found");
      return nav;
    };

    const getSceneButton = (sceneId: number) => {
      const nav = getSceneNavigation();
      const button = within(nav).getByTestId(`scene-button-${sceneId}`);
      if (!button) throw new Error(`Scene button ${sceneId} not found`);
      return button;
    };

    const getAllSceneButtons = () => {
      const nav = getSceneNavigation();
      return within(nav).getAllByRole("button");
    };

    return {
      container,
      getSceneNavigation,
      getSceneButton,
      getAllSceneButtons,
    };
  };

  it("renders all scenes", () => {
    const { getSceneNavigation, getAllSceneButtons } = renderSceneNavigation();

    const nav = getSceneNavigation();
    expect(nav).toBeInTheDocument();

    const buttons = getAllSceneButtons();
    expect(buttons).toHaveLength(3);
  });

  it("updates aria-pressed when current scene changes", () => {
    const { getSceneButton } = renderSceneNavigation({ currentScene: "2" });

    const button1 = getSceneButton(1);
    const button2 = getSceneButton(2);
    const button3 = getSceneButton(3);

    expect(button1.getAttribute("aria-pressed")).toBe("false");
    expect(button2.getAttribute("aria-pressed")).toBe("true");
    expect(button3.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onSceneSelect with correct scene id when clicked", () => {
    const onSceneSelect = vi.fn();
    const { getSceneButton } = renderSceneNavigation({ onSceneSelect });

    const button2 = getSceneButton(2);
    fireEvent.click(button2);

    expect(onSceneSelect).toHaveBeenCalledWith("2");
  });

  it("supports keyboard navigation", () => {
    const onSceneSelect = vi.fn();
    const { getSceneButton } = renderSceneNavigation({ onSceneSelect });

    const button2 = getSceneButton(2);
    fireEvent.keyDown(button2, { key: "Enter" });

    expect(onSceneSelect).toHaveBeenCalledWith("2");
  });
});
