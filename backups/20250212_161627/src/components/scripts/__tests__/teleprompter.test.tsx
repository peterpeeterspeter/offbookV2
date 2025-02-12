import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Teleprompter } from "../teleprompter";

interface Line {
  id: string;
  character: string;
  text: string;
  emotion: string;
  timing: number;
}

const mockLines: Line[] = [
  {
    id: "1",
    text: "Line 1",
    character: "Character 1",
    emotion: "neutral",
    timing: 1000,
  },
  {
    id: "2",
    text: "Line 2",
    character: "Character 2",
    emotion: "neutral",
    timing: 1000,
  },
  {
    id: "3",
    text: "Line 3",
    character: "Character 3",
    emotion: "neutral",
    timing: 1000,
  },
];

const mockGetCharacterColor = (character: string) => "#000000";

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = function () {};

describe("Teleprompter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders all lines with correct styling", () => {
    render(
      <Teleprompter
        lines={mockLines}
        onLineComplete={() => {}}
        getCharacterColor={mockGetCharacterColor}
        testMode={true}
      />
    );
    mockLines.forEach((line) => {
      expect(screen.getByText(line.text)).toBeInTheDocument();
    });
  });

  it("handles auto-scroll toggle", () => {
    render(
      <Teleprompter
        lines={mockLines}
        onLineComplete={() => {}}
        getCharacterColor={mockGetCharacterColor}
        testMode={false}
      />
    );
    const autoScrollButton = screen.getByRole("button", {
      name: /auto-scroll/i,
    });
    fireEvent.click(autoScrollButton);
    expect(autoScrollButton).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onLineComplete when line is clicked", () => {
    const onLineComplete = vi.fn();
    render(
      <Teleprompter
        lines={mockLines}
        onLineComplete={onLineComplete}
        getCharacterColor={mockGetCharacterColor}
        testMode={true}
      />
    );
    const firstLine = screen.getByTestId("line-1");
    fireEvent.click(firstLine);
    expect(onLineComplete).toHaveBeenCalledWith("1");
  });

  it("handles keyboard navigation", () => {
    const onLineComplete = vi.fn();
    render(
      <Teleprompter
        lines={mockLines}
        onLineComplete={onLineComplete}
        getCharacterColor={mockGetCharacterColor}
        testMode={true}
      />
    );
    const firstLine = screen.getByTestId("line-1");
    fireEvent.keyDown(firstLine, { key: "Enter" });
    expect(onLineComplete).toHaveBeenCalledWith("1");
  });
});
