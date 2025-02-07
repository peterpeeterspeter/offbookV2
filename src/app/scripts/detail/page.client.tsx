"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { SceneNavigation } from "@/components/scripts/scene-navigation";
import { ScriptContent } from "@/components/scripts/script-content";
import { ApiErrorBoundaryWrapper } from "@/components/api-error-boundary";

// Mock data - replace with actual API calls
const mockScript = {
  id: "1",
  title: "Romeo and Juliet - Act 2, Scene 2",
  scenes: [
    { id: "1", number: 1, duration: 180 },
    { id: "2", number: 2, duration: 240 },
    { id: "3", number: 3, duration: 160 },
  ],
  lines: [
    {
      id: "1",
      character: "Romeo",
      text: "But, soft! what light through yonder window breaks?",
      emotion: "Awe",
      timing: 4,
    },
    {
      id: "2",
      character: "Romeo",
      text: "It is the east, and Juliet is the sun.",
      emotion: "Love",
      timing: 3,
    },
    {
      id: "3",
      character: "Juliet",
      text: "O Romeo, Romeo! wherefore art thou Romeo?",
      emotion: "Longing",
      timing: 5,
    },
  ],
};

const characterColors = {
  Romeo: "#4f46e5",
  Juliet: "#e11d48",
};

interface ScriptDetailPageClientProps {
  testMode?: boolean;
}

export function ScriptDetailPageClient({
  testMode = false,
}: ScriptDetailPageClientProps) {
  const params = useParams();
  const [currentScene, setCurrentScene] = useState(mockScript.scenes[0].id);
  const [currentLine, setCurrentLine] = useState<string>();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const gridColumns =
    windowWidth >= 768 ? "grid-cols-[300px_1fr]" : "grid-cols-1";

  return (
    <div className="relative">
      <main
        className="container mx-auto py-6"
        role="main"
        aria-label="Script details"
        data-testid="script-detail-page"
      >
        <h1 className="mb-8 text-3xl font-bold" role="heading" aria-level={1}>
          {mockScript.title}
        </h1>
        <div className={`grid gap-6 ${gridColumns}`}>
          <nav role="navigation" aria-label="Scene navigation">
            <SceneNavigation
              scenes={mockScript.scenes}
              currentScene={currentScene}
              onSceneSelect={setCurrentScene}
              testMode={testMode}
              disableAnimations={testMode}
            />
          </nav>
          <section
            role="region"
            aria-label="Script content"
            aria-live="polite"
            data-testid="script-content"
          >
            <ScriptContent
              lines={mockScript.lines}
              currentLine={currentLine}
              onLineSelect={setCurrentLine}
              characterColors={characterColors}
              testMode={testMode}
              disableAnimations={testMode}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
