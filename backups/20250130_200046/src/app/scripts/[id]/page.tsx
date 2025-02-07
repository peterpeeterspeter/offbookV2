"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { SceneNavigation } from "@/components/scripts/scene-navigation"
import { ScriptContent } from "@/components/scripts/script-content"
import { ApiErrorBoundaryWrapper } from "@/components/api-error-boundary"

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
}

const characterColors = {
  Romeo: "#4f46e5",
  Juliet: "#e11d48",
}

export default function ScriptDetailPage() {
  const params = useParams()
  const [currentScene, setCurrentScene] = useState(mockScript.scenes[0].id)
  const [currentLine, setCurrentLine] = useState<string>()

  return (
    <ApiErrorBoundaryWrapper>
      <main className="container mx-auto py-6">
        <h1 className="mb-8 text-3xl font-bold">{mockScript.title}</h1>
        <div className="grid grid-cols-[300px_1fr] gap-6">
          <SceneNavigation
            scenes={mockScript.scenes}
            currentScene={currentScene}
            onSceneSelect={setCurrentScene}
          />
          <ScriptContent
            lines={mockScript.lines}
            currentLine={currentLine}
            onLineSelect={setCurrentLine}
            characterColors={characterColors}
          />
        </div>
      </main>
    </ApiErrorBoundaryWrapper>
  )
} 