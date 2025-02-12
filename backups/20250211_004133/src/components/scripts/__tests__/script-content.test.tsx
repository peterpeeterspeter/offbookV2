import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScriptContent } from "../script-content";

describe("ScriptContent", () => {
  const mockLines = [
    {
      id: "1",
      character: "Romeo",
      text: "But, soft! what light through yonder window breaks?",
      emotion: "curious",
      timing: 5,
    },
    {
      id: "2",
      character: "Romeo",
      text: "It is the east, and Juliet is the sun.",
      emotion: "loving",
      timing: 4,
    },
    {
      id: "3",
      character: "Juliet",
      text: "O Romeo, Romeo! wherefore art thou Romeo?",
      emotion: "yearning",
      timing: 6,
    },
  ];

  const mockCharacterColors = {
    Romeo: "rgb(79, 70, 229)",
    Juliet: "rgb(236, 72, 153)",
  };

  const renderComponent = () => {
    return render(
      <ScriptContent
        lines={mockLines}
        characterColors={mockCharacterColors}
        onLineSelect={() => {}}
      />
    );
  };

  it("renders all script lines", () => {
    renderComponent();

    mockLines.forEach((line) => {
      expect(screen.getByText(line.text)).toBeInTheDocument();
    });
  });

  it("applies character colors correctly", () => {
    renderComponent();

    const romeoBadges = screen.getAllByTestId(/^character-badge-[12]$/);
    romeoBadges.forEach((badge) => {
      expect(badge).toHaveStyle({ backgroundColor: "rgb(79, 70, 229)" });
    });

    const julietBadge = screen.getByTestId("character-badge-3");
    expect(julietBadge).toHaveStyle({ backgroundColor: "rgb(236, 72, 153)" });
  });

  it("maintains accessibility attributes", () => {
    renderComponent();

    const lines = screen.getAllByRole("listitem");
    lines.forEach((line) => {
      expect(line).toHaveAttribute("tabIndex", "0");
      expect(line).toHaveAttribute("aria-label");
    });
  });
});
