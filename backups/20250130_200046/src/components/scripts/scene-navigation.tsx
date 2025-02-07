"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Clock } from "lucide-react"

export interface Scene {
  id: string
  number: number
  duration: number
  title?: string
}

interface SceneNavigationProps {
  scenes: Scene[]
  currentScene?: string
  onSceneSelect: (sceneId: string) => void
}

export function SceneNavigation({
  scenes,
  currentScene,
  onSceneSelect,
}: SceneNavigationProps) {
  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="space-y-2 p-4">
        <h2 className="font-semibold mb-4">Scenes</h2>
        {scenes.map((scene) => (
          <Button
            key={scene.id}
            variant={currentScene === scene.id ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onSceneSelect(scene.id)}
          >
            <span>Scene {scene.number}</span>
            {scene.duration > 0 && (
              <span className="ml-auto flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" />
                {Math.round(scene.duration / 60)}m {scene.duration % 60}s
              </span>
            )}
          </Button>
        ))}
      </div>
    </ScrollArea>
  )
} 