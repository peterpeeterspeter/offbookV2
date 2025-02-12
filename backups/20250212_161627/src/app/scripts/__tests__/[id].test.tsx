import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { ScriptDetailPageClient } from "../[id]/page.client";
import { useParams } from "next/navigation";
import Page from "../[id]/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

describe("ScriptDetailPage", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    (useParams as any).mockReturnValue({ id: "1" });
  });

  it("renders the script title", () => {
    render(<ScriptDetailPageClient testMode={true} />);
    expect(
      screen.getByText("Romeo and Juliet - Act 2, Scene 2")
    ).toBeInTheDocument();
  });

  it("renders scene navigation and script content", () => {
    render(<ScriptDetailPageClient testMode={true} />);

    // Check scene navigation
    expect(screen.getByText("Scene 1")).toBeInTheDocument();
    expect(screen.getByText("Scene 2")).toBeInTheDocument();
    expect(screen.getByText("Scene 3")).toBeInTheDocument();

    // Check script content
    expect(
      screen.getByText("But, soft! what light through yonder window breaks?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("It is the east, and Juliet is the sun.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("O Romeo, Romeo! wherefore art thou Romeo?")
    ).toBeInTheDocument();
  });

  it("updates current scene when scene is selected", async () => {
    render(<ScriptDetailPageClient testMode={true} />);

    // Initially scene 1 should be selected
    await waitFor(() => {
      const scene1Button = screen.getByRole("button", { name: /Scene 1/i });
      expect(scene1Button).toHaveAttribute("aria-pressed", "true");
    });

    // Click scene 2
    await waitFor(() => {
      const scene2Button = screen.getByRole("button", { name: /Scene 2/i });
      fireEvent.click(scene2Button);
      expect(scene2Button).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("updates current line when line is selected", async () => {
    render(<ScriptDetailPageClient testMode={true} />);

    // Click a line
    await waitFor(() => {
      const line = screen.getByRole("listitem", {
        name: /Romeo: It is the east/i,
      });
      fireEvent.click(line);
      expect(line).toHaveClass("bg-primary/10");
    });
  });

  it("displays character colors correctly", async () => {
    render(<ScriptDetailPageClient testMode={true} />);

    // Check Romeo's lines
    await waitFor(() => {
      const romeoLines = screen.getAllByRole("listitem", {
        name: /^Romeo:/i,
      });
      romeoLines.forEach((line) => {
        const badge = within(line).getByText("Romeo");
        expect(badge).toHaveStyle({ backgroundColor: "#4f46e5" });
      });
    });

    // Check Juliet's lines
    await waitFor(() => {
      const julietLines = screen.getAllByRole("listitem", {
        name: /^Juliet:/i,
      });
      julietLines.forEach((line) => {
        const badge = within(line).getByText("Juliet");
        expect(badge).toHaveStyle({ backgroundColor: "#e11d48" });
      });
    });
  });

  it("displays scene durations", () => {
    render(<ScriptDetailPageClient testMode={true} />);

    // Scene 1: 180 seconds = 3m 0s
    expect(screen.getByText("3m 0s")).toBeInTheDocument();
    // Scene 2: 240 seconds = 4m 0s
    expect(screen.getByText("4m 0s")).toBeInTheDocument();
    // Scene 3: 160 seconds = 2m 40s
    expect(screen.getByText("2m 40s")).toBeInTheDocument();
  });

  it("maintains scene selection when switching between scenes", async () => {
    render(<ScriptDetailPageClient testMode={true} />);

    // Select scene 2
    await waitFor(() => {
      const scene2Button = screen.getByRole("button", { name: /Scene 2/i });
      fireEvent.click(scene2Button);
      expect(scene2Button).toHaveAttribute("aria-pressed", "true");
    });

    // Select scene 3
    await waitFor(() => {
      const scene3Button = screen.getByRole("button", { name: /Scene 3/i });
      fireEvent.click(scene3Button);
      expect(scene3Button).toHaveAttribute("aria-pressed", "true");
      const scene2Button = screen.getByRole("button", { name: /Scene 2/i });
      expect(scene2Button).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("maintains line selection when switching between lines", async () => {
    render(<ScriptDetailPageClient testMode={true} />);

    // Select first line
    await waitFor(() => {
      const firstLine = screen.getByRole("listitem", {
        name: /Romeo: But, soft!/i,
      });
      fireEvent.click(firstLine);
      expect(firstLine).toHaveClass("bg-primary/10");
    });

    // Select second line
    await waitFor(() => {
      const secondLine = screen.getByRole("listitem", {
        name: /Romeo: It is the east/i,
      });
      fireEvent.click(secondLine);
      expect(secondLine).toHaveClass("bg-primary/10");
      const firstLine = screen.getByRole("listitem", {
        name: /Romeo: But, soft!/i,
      });
      expect(firstLine).not.toHaveClass("bg-primary/10");
    });
  });

  it("handles keyboard navigation between scenes and lines", async () => {
    render(<ScriptDetailPageClient testMode={true} />);

    // Navigate to first scene with keyboard
    await waitFor(() => {
      const scene1Button = screen.getByRole("button", { name: /Scene 1/i });
      scene1Button.focus();
      fireEvent.keyDown(scene1Button, { key: "Enter" });
      expect(scene1Button).toHaveAttribute("aria-pressed", "true");
    });

    // Navigate to first line with keyboard
    await waitFor(() => {
      const firstLine = screen.getByRole("listitem", {
        name: /Romeo: But, soft!/i,
      });
      firstLine.focus();
      fireEvent.keyDown(firstLine, { key: "Enter" });
      expect(firstLine).toHaveClass("bg-primary/10");
    });
  });

  it("maintains accessibility throughout scene and line navigation", async () => {
    render(<Page />);

    const mainContainer = screen.getByRole("main", {
      name: /script details/i,
    });
    expect(mainContainer).toBeInTheDocument();
    expect(screen.getByTestId("scene-navigation")).toBeInTheDocument();

    // Check scene buttons
    await waitFor(() => {
      const sceneButtons = screen.getAllByRole("button", {
        name: /Scene \d+ - \d+m \d+s/i,
      });
      sceneButtons.forEach((button) => {
        expect(button).toHaveAttribute("aria-pressed");
        expect(button).toHaveAttribute("aria-label");
      });
    });

    // Check script lines
    await waitFor(() => {
      const lines = screen.getAllByRole("listitem");
      lines.forEach((line) => {
        expect(line).toHaveAttribute("tabIndex", "0");
        expect(line).toHaveAttribute("aria-label");
      });
    });
  });

  it("handles different script ID parameters", () => {
    // Test with different script IDs
    (useParams as any).mockReturnValue({ id: "2" });
    render(<ScriptDetailPageClient testMode={true} />);

    // Even with a different ID, the mock data should still render
    expect(
      screen.getByText("Romeo and Juliet - Act 2, Scene 2")
    ).toBeInTheDocument();
  });

  it("preserves layout on window resize", async () => {
    const { container } = render(<ScriptDetailPageClient testMode={true} />);

    // Simulate window resize
    global.innerWidth = 1024;
    global.dispatchEvent(new Event("resize"));

    // Wait for layout adjustments
    await waitFor(() => {
      expect(container.querySelector(".grid")).toBeInTheDocument();
    });
  });
});
