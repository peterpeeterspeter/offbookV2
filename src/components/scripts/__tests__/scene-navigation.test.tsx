import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SceneNavigation, type Scene } from "../scene-navigation";

describe("SceneNavigation", () => {
  const mockScenes: Scene[] = [
    { id: "1", title: "Opening Scene", duration: 120, number: 1 },
    { id: "2", title: "Middle Scene", duration: 180, number: 2 },
    { id: "3", title: "Final Scene", duration: 90, number: 3 },
  ];

  it("renders all scenes", () => {
    render(
      <SceneNavigation
        scenes={mockScenes}
        currentScene="1"
        onSceneSelect={() => {}}
      />
    );

    mockScenes.forEach((scene) => {
      expect(screen.getByText(scene.title!)).toBeInTheDocument();
    });
  });

  it("highlights current scene", () => {
    render(
      <SceneNavigation
        scenes={mockScenes}
        currentScene="2"
        onSceneSelect={() => {}}
      />
    );

    const currentSceneElement = screen
      .getByText("Middle Scene")
      .closest("button");
    expect(currentSceneElement).toHaveClass("bg-secondary");
  });

  it("calls onSceneSelect when clicking a scene", () => {
    const handleSceneSelect = vi.fn();
    render(
      <SceneNavigation
        scenes={mockScenes}
        currentScene="1"
        onSceneSelect={handleSceneSelect}
      />
    );

    fireEvent.click(screen.getByText("Middle Scene"));
    expect(handleSceneSelect).toHaveBeenCalledWith("2");
  });

  it("handles empty scenes array", () => {
    render(
      <SceneNavigation scenes={[]} currentScene="" onSceneSelect={() => {}} />
    );
    expect(screen.getByText("No scenes available")).toBeInTheDocument();
  });

  it("handles invalid current scene ID", () => {
    render(
      <SceneNavigation
        scenes={mockScenes}
        currentScene="invalid-id"
        onSceneSelect={() => {}}
      />
    );

    // Should still render all scenes but none should be highlighted
    mockScenes.forEach((scene) => {
      const sceneElement = screen.getByText(scene.title!).closest("button");
      expect(sceneElement).not.toHaveClass("bg-secondary");
    });
  });

  it("is keyboard navigable", () => {
    const handleSceneSelect = vi.fn();
    render(
      <SceneNavigation
        scenes={mockScenes}
        currentScene="1"
        onSceneSelect={handleSceneSelect}
      />
    );

    const firstScene = screen.getByText("Opening Scene");
    firstScene.focus();
    fireEvent.keyDown(firstScene, { key: "Enter" });
    expect(handleSceneSelect).toHaveBeenCalledWith("1");
  });
});
