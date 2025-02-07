"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { SceneNavigation, type Scene } from "@/components/scripts/scene-navigation"
import { ScriptContent } from "@/components/scripts/script-content"

// Mock data - replace with API calls later
const mockScript = {
  id: "1",
  title: "Romeo and Juliet - Act 2, Scene 2",
  scenes: [
    { id: "scene1", number: 1, duration: 180 },
    { id: "scene2", number: 2, duration: 240 },
  ],
  lines: [
    {
      id: "line1",
      character: "Romeo",
      text: "But, soft! what light through yonder window breaks?",
      emotion: "wonder",
      timing: 4
    },
    {
      id: "line2",
      character: "Romeo",
      text: "It is the east, and Juliet is the sun.",
      emotion: "love",
      timing: 3
    },
    {
      id: "line3",
      character: "Juliet",
      text: "O Romeo, Romeo! wherefore art thou Romeo?",
      emotion: "longing",
      timing: 5
    }
  ]
}

const characterColors = {
  "Romeo": "rgb(var(--primary) / 0.2)",
  "Juliet": "rgb(var(--secondary) / 0.2)"
}

export default function ScriptDetailPage() {
  const params = useParams()
  const [currentScene, setCurrentScene] = useState<string>("scene1")
  const [currentLine, setCurrentLine] = useState<string>()

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{mockScript.title}</h1>
      </div>
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
    </div>
  )
} 