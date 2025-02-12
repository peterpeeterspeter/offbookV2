import { render, screen } from "@/test/test-utils";
import { ScriptContent } from "../script-content";
import type { Line } from "../types";

describe("ScriptContent", () => {
  const mockLines: Line[] = [
    {
      id: "1",
      character: "Romeo",
      text: "O, she doth teach the torches to burn bright!",
      emotion: "joy",
      timing: 5,
      confidence: 0.9,
    },
    {
      id: "2",
      character: "Juliet",
      text: "My bounty is as boundless as the sea",
      emotion: "love",
      timing: 4,
      confidence: 0.85,
    },
  ];

  const mockCharacterColors = {
    Romeo: "rgb(79, 70, 229)",
    Juliet: "rgb(236, 72, 153)",
  };

  it("renders script lines correctly", () => {
    render(
      <ScriptContent
        lines={mockLines}
        characterColors={mockCharacterColors}
        onLineSelect={() => {}}
      />
    );

    expect(screen.getByText("Romeo")).toBeInTheDocument();
    expect(
      screen.getByText("O, she doth teach the torches to burn bright!")
    ).toBeInTheDocument();
    expect(screen.getByText("Juliet")).toBeInTheDocument();
    expect(
      screen.getByText("My bounty is as boundless as the sea")
    ).toBeInTheDocument();
  });

  it("displays emotion indicators", () => {
    render(
      <ScriptContent
        lines={mockLines}
        characterColors={mockCharacterColors}
        onLineSelect={() => {}}
      />
    );

    const joyEmotion = screen.getByTestId("emotion-joy");
    const loveEmotion = screen.getByTestId("emotion-love");

    expect(joyEmotion).toBeInTheDocument();
    expect(loveEmotion).toBeInTheDocument();
  });

  it("handles empty lines array", () => {
    render(
      <ScriptContent lines={[]} characterColors={{}} onLineSelect={() => {}} />
    );
    expect(screen.getByText("No lines to display")).toBeInTheDocument();
  });

  it("handles missing emotion data", () => {
    const linesWithoutEmotion: Line[] = [
      {
        id: "1",
        character: "Romeo",
        text: "O, she doth teach the torches to burn bright!",
        emotion: "neutral",
        timing: 5,
        confidence: 0,
      },
    ];

    render(
      <ScriptContent
        lines={linesWithoutEmotion}
        characterColors={mockCharacterColors}
        onLineSelect={() => {}}
      />
    );
    expect(screen.getByText("Romeo")).toBeInTheDocument();
    expect(
      screen.getByText("O, she doth teach the torches to burn bright!")
    ).toBeInTheDocument();
    expect(screen.queryByTestId(/emotion-/)).toBeInTheDocument();
  });
});
