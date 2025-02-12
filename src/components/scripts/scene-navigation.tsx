"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";

export interface Scene {
  id: string;
  number: number;
  duration: number;
  title?: string;
  description?: string;
}

interface SceneNavigationProps {
  scenes: Scene[];
  currentScene?: string;
  onSceneSelect: (sceneId: string) => void;
  disableAnimations?: boolean;
  testMode?: boolean;
}

export function SceneNavigation({
  scenes,
  currentScene,
  onSceneSelect,
  disableAnimations = false,
  testMode = false,
}: SceneNavigationProps) {
  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderSceneButton = (scene: Scene) => {
    const duration = formatDuration(scene.duration);
    const isSelected = scene.id === currentScene;
    const buttonContent = (
      <Button
        variant={isSelected ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSceneSelect(scene.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onSceneSelect(scene.id);
            e.preventDefault();
          }
        }}
        type="button"
        aria-pressed={isSelected}
        data-testid={`scene-button-${scene.number}`}
        aria-label={`${scene.title || `Scene ${scene.number}`}${duration ? ` - ${duration}` : ""}`}
        tabIndex={0}
        role="button"
      >
        <span>{scene.title || `Scene ${scene.number}`}</span>
        {duration && (
          <span className="ml-auto flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
            {duration}
          </span>
        )}
      </Button>
    );

    if (testMode || disableAnimations) {
      return <div key={scene.id}>{buttonContent}</div>;
    }

    return (
      <motion.div
        key={scene.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        data-testid={`motion-scene-${scene.number}`}
        role="presentation"
      >
        {buttonContent}
      </motion.div>
    );
  };

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="space-y-2 p-4">
        <h2 className="font-semibold mb-4" id="scenes-heading">
          Scenes
        </h2>
        <nav
          data-testid="scene-navigation"
          role="navigation"
          aria-label="Scene navigation"
          aria-labelledby="scenes-heading"
          className="space-y-2"
        >
          {scenes.length === 0 ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="no-scenes-message"
            >
              No scenes available
            </p>
          ) : (
            scenes.map((scene) => renderSceneButton(scene))
          )}
        </nav>
      </div>
    </ScrollArea>
  );
}

SceneNavigation.displayName = "SceneNavigation";
