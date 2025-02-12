import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmotionHighlighter } from "../EmotionHighlighter";
import { detectEmotions } from "@/services/deepseek";
import type { DeepSeekResponse, EmotionSuggestion } from "@/services/types";

// Mock the detectEmotions service
vi.mock("@/services/deepseek", () => ({
  detectEmotions: vi.fn().mockImplementation(async (text: string) => {
    if (text === "error-test") {
      throw new Error("API Error");
    }
    return {
      suggestions: [
        {
          emotion: "joy",
          intensity: 0.8,
          confidence: 0.9,
        },
      ] as EmotionSuggestion[],
      error: undefined,
    };
  }),
}));

describe("EmotionHighlighter", () => {
  const user = userEvent.setup();
  let mockRange: any;
  let mockSelection: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.getSelection
    mockRange = {
      toString: () => "Test",
      getBoundingClientRect: () => ({
        left: 0,
        bottom: 0,
        right: 50,
        top: 0,
      }),
      startOffset: 0,
      endOffset: 4,
    };

    mockSelection = {
      toString: () => "Test",
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
      isCollapsed: false,
      addRange: vi.fn(),
    };

    Object.defineProperty(window, "getSelection", {
      value: () => mockSelection,
      writable: true,
      configurable: true,
    });
  });

  it("renders content correctly", () => {
    render(<EmotionHighlighter content="Test content" onSelect={() => {}} />);
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("handles text selection and emotion detection", async () => {
    const onSelect = vi.fn();
    render(
      <EmotionHighlighter
        content="Test content for emotion detection"
        onSelect={onSelect}
      />
    );

    const content = screen.getByTestId("emotion-highlighter");

    // Simulate text selection
    fireEvent.mouseUp(content);

    await waitFor(() => {
      expect(detectEmotions).toHaveBeenCalledWith("Test");
    });

    const emotionButton = await screen.findByRole("button", { name: /joy/i });
    await user.click(emotionButton);

    expect(onSelect).toHaveBeenCalledWith("Test", "joy", 0.8);
  });

  it("cleans up selection on unmount", async () => {
    const { unmount } = render(
      <EmotionHighlighter content="Test content" onSelect={() => {}} />
    );

    const content = screen.getByTestId("emotion-highlighter");
    fireEvent.mouseUp(content);

    unmount();

    expect(mockSelection.removeAllRanges).toHaveBeenCalled();
  });

  it("handles empty selection", async () => {
    mockSelection.isCollapsed = true;

    render(<EmotionHighlighter content="Test content" onSelect={() => {}} />);

    const content = screen.getByTestId("emotion-highlighter");
    fireEvent.mouseUp(content);

    await waitFor(() => {
      expect(detectEmotions).not.toHaveBeenCalled();
    });
  });

  it("displays loading state during emotion detection", async () => {
    // Mock a delayed emotion detection
    vi.mocked(detectEmotions).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<EmotionHighlighter content="Test content" onSelect={() => {}} />);

    const content = screen.getByTestId("emotion-highlighter");
    fireEvent.mouseUp(content);

    expect(await screen.findByRole("progressbar")).toBeInTheDocument();
  });

  it("updates content when edited", async () => {
    const onUpdate = vi.fn();
    render(
      <EmotionHighlighter
        content="Test content"
        onSelect={() => {}}
        onUpdate={onUpdate}
      />
    );

    const content = screen.getByTestId("emotion-highlighter");
    await user.type(content, " additional");

    expect(onUpdate).toHaveBeenCalledWith("Test content additional");
  });

  it("parses existing emotion tags", () => {
    const content = "Hello {world|joy|8} test";
    render(
      <EmotionHighlighter
        content={content}
        readOnly={false}
        onUpdate={() => {}}
      />
    );

    // The content should be rendered with the emotion tag parsed
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("shows emotion picker on text selection", async () => {
    render(
      <EmotionHighlighter
        content="Test content"
        readOnly={false}
        onUpdate={() => {}}
      />
    );

    // Simulate text selection
    const textElement = screen.getByText("Test content");
    await act(async () => {
      fireEvent.mouseUp(textElement);
    });

    // Wait for emotion picker
    expect(screen.getByText("Emotion")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("applies selected emotion to text", async () => {
    const onUpdate = vi.fn();

    // Mock detectEmotions with a stable response
    const mockEmotionResponse: DeepSeekResponse = {
      suggestions: [
        {
          emotion: "joy",
          intensity: 0.8,
          confidence: 0.9,
        },
      ],
      error: undefined,
    };
    vi.mocked(detectEmotions).mockResolvedValue(mockEmotionResponse);

    await act(async () => {
      render(
        <EmotionHighlighter
          content="Test content"
          readOnly={false}
          onUpdate={onUpdate}
        />
      );
    });

    // Simulate text selection and show picker
    const textElement = screen.getByText("Test content");

    await act(async () => {
      fireEvent.mouseUp(textElement);
    });

    // Wait for emotion detection and UI updates
    await waitFor(() => {
      expect(detectEmotions).toHaveBeenCalled();
    });

    // Wait for the emotion picker to appear
    const joyButton = await screen.findByText("joy");

    await act(async () => {
      await user.click(joyButton);
    });

    const applyButton = await screen.findByText("Apply");

    await act(async () => {
      await user.click(applyButton);
    });

    // Verify the update was called with the correct format
    expect(onUpdate).toHaveBeenCalledWith("{Test|joy|8} content");
  });

  it("handles read-only mode", () => {
    render(
      <EmotionHighlighter
        content="Test content"
        readOnly={true}
        onUpdate={() => {}}
      />
    );

    const textElement = screen.getByText("Test content");
    fireEvent.mouseUp(textElement);

    // Verify that emotion picker is not shown in read-only mode
    expect(screen.queryByText("Emotion")).not.toBeInTheDocument();
  });

  it("handles emotion detection errors", async () => {
    // Mock detectEmotions to throw an error
    vi.mocked(detectEmotions).mockRejectedValueOnce(new Error("API Error"));

    render(<EmotionHighlighter content="Test content" onSelect={() => {}} />);

    // Simulate text selection with error-triggering text
    const content = screen.getByTestId("emotion-highlighter");
    mockSelection.toString = () => "error-test";
    fireEvent.mouseUp(content);

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
  });

  it("updates intensity value", async () => {
    const onSelect = vi.fn();
    render(
      <EmotionHighlighter
        content="Test content"
        readOnly={false}
        onSelect={onSelect}
      />
    );

    // Simulate text selection
    const content = screen.getByTestId("emotion-highlighter");
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(content);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      fireEvent.mouseUp(content);
      // Wait for emotion detection
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Find and update intensity slider
    const intensitySlider = await screen.findByRole("slider");
    await act(async () => {
      await userEvent.type(intensitySlider, "5");
      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(intensitySlider).toHaveValue("5");

    // Clean up selection
    selection?.removeAllRanges();
  });

  it("closes emotion picker on cancel", async () => {
    const user = userEvent.setup();

    // Mock detectEmotions with a successful response
    vi.mocked(detectEmotions).mockResolvedValueOnce({
      suggestions: [
        {
          emotion: "joy",
          intensity: 0.8,
          confidence: 0.9,
        },
      ],
      error: undefined,
    });

    render(
      <EmotionHighlighter
        content="Test content"
        readOnly={false}
        onUpdate={() => {}}
      />
    );

    // Show picker with non-error text
    const textElement = screen.getByText("Test content");
    mockSelection.toString = () => "Test";
    await act(async () => {
      fireEvent.mouseUp(textElement);
      // Wait for emotion detection to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Wait for emotion detection to complete
    await waitFor(() => {
      expect(screen.getByText("joy")).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByText("Cancel");
    await act(async () => {
      await user.click(cancelButton);
    });

    // Verify picker is closed
    expect(screen.queryByText("joy")).not.toBeInTheDocument();
  });
});
