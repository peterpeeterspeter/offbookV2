"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SceneFlowService } from "@/services/scene-flow";
import { AudioService } from "@/services/audio-service";
import { ScriptAnalysisService } from "@/services/script-analysis";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AudioErrorBoundary } from "./error-boundaries/AudioErrorBoundary";

export interface DialogueLine {
  id: string;
  role: string;
  text: string;
  emotion?: string;
}

export interface Scene {
  id: string;
  number: number;
  title: string;
  description: string;
  dialogue: DialogueLine[];
}

export interface SceneStats {
  duration: number;
  accuracy: number;
  emotions: Record<string, number>;
  sceneProgress: Record<string, number>;
  timingScore: number;
  emotionMatchRate: number;
}

export interface SceneSettings {
  adaptivePacing: boolean;
  showEmotions: boolean;
  autoAdvance: boolean;
}

export interface SceneFlowProps {
  scriptId: string;
  userRole: string;
  initialScene?: number;
  onComplete?: (stats: SceneStats) => void;
  onError?: (error: string) => void;
}

export interface SceneFlowServiceType {
  initialize: (scriptId: string) => Promise<{
    scenes: Scene[];
    stats: SceneStats;
  }>;
  processScene: (sceneNumber: number) => Promise<{
    success: boolean;
    scene: Scene;
    stats: SceneStats;
  }>;
  cleanup: () => Promise<SceneStats>;
}

export interface AudioServiceType {
  setup: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{
    duration: number;
    accuracy: number;
  }>;
}

export default function SceneFlow({
  scriptId,
  userRole,
  initialScene = 0,
  onComplete,
  onError,
}: SceneFlowProps) {
  // State
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const [settings, setSettings] = useState<SceneSettings>({
    adaptivePacing: true,
    showEmotions: true,
    autoAdvance: true,
  });
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    // Reset state when scriptId changes
    setError(null);
    setScenes([]);
    setCurrentScene(null);
    setStats(null);
    setIsRecording(false);

    async function initSession() {
      if (!SceneFlowService.current) {
        const msg = "Scene flow service not initialized";
        setError(msg);
        onError?.(msg);
        return;
      }
      try {
        const response = await SceneFlowService.current.initializeSession(
          scriptId,
          userRole
        );

        // Validate response structure
        if (!response || typeof response !== "object") {
          throw new Error(
            "Invalid response format - response must be an object"
          );
        }

        // Validate scenes array
        if (!Array.isArray(response.scenes)) {
          throw new Error("Invalid response format - scenes must be an array");
        }

        if (response.scenes.length === 0) {
          throw new Error("No scenes available - please check the script");
        }

        // Validate stats object
        if (!response.stats || typeof response.stats !== "object") {
          throw new Error("Invalid response format - stats must be an object");
        }

        const requiredStats = [
          "duration",
          "accuracy",
          "timingScore",
          "emotionMatchRate",
        ];
        for (const stat of requiredStats) {
          if (!(stat in response.stats)) {
            throw new Error(
              `Invalid response format - missing required stat: ${stat}`
            );
          }
        }

        setScenes(response.scenes);
        setStats(response.stats);
        setCurrentScene(response.scenes[0]);
        setIsRecording(true);
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        onError?.(errorMessage);
        // Reset state on error
        setScenes([]);
        setCurrentScene(null);
        setStats(null);
        setIsRecording(false);
      }
    }

    initSession();

    return () => {
      // Cleanup function
      if (!SceneFlowService.current?.endSession) {
        return;
      }

      // Store service reference to avoid race conditions
      const service = SceneFlowService.current;

      // Ensure endSession exists and handle promise rejection
      const cleanup = async () => {
        try {
          await service.endSession();
          if (onComplete && stats) {
            onComplete(stats);
          }
        } catch (err: unknown) {
          console.error("Error ending session:", err);
        }
      };

      void cleanup();
    };
  }, [scriptId, userRole, onComplete, onError, stats]);

  // Load scene
  async function loadScene(scene: Scene) {
    setCurrentScene(scene);
    setShowSceneSelector(false);
  }

  const handleErrorReset = async () => {
    // Reset any necessary state
    await AudioService.cleanup();
    await AudioService.setup();
  };

  return (
    <AudioErrorBoundary onReset={handleErrorReset}>
      <div className="relative min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSceneSelector(!showSceneSelector)}
                aria-label="Scene Selection"
                aria-expanded={showSceneSelector}
                aria-controls="scene-selector"
              >
                <span className="sr-only">Scene Selection</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                  <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
                  <path d="M12 3v6" />
                </svg>
              </Button>
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Scene Flow Mode</h1>
            </div>
            <div className="ml-auto flex items-center space-x-4">
              {isRecording && (
                <div
                  role="status"
                  aria-label="recording in progress"
                  className="text-sm text-muted-foreground"
                >
                  Recording in progress
                </div>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                aria-label="settings"
                aria-expanded={showSettings}
                aria-controls="settings-panel"
              >
                <span className="sr-only">Settings</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Button>
            </div>
          </div>
        </header>

        <main className="container py-6">
          {error ? (
            <div
              className="p-4 mb-6 bg-destructive/10 text-destructive rounded-lg"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          ) : currentScene ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Scene {currentScene.number}: {currentScene.title}
              </h2>
              <p className="text-gray-600 mb-6">{currentScene.description}</p>
              <ul className="space-y-4" role="list" aria-label="Scene dialogue">
                {currentScene.dialogue.map((line) => (
                  <li
                    key={line.id}
                    className={cn(
                      "p-4 bg-card rounded-lg",
                      line.role === userRole && "border-2 border-primary"
                    )}
                    role="listitem"
                    aria-label={`${line.role}'s dialogue`}
                  >
                    <div className="font-semibold text-card-foreground">
                      {line.role}
                    </div>
                    <div className="mt-2">{line.text}</div>
                    {settings.showEmotions && line.emotion && (
                      <div
                        className="mt-1 text-sm text-muted-foreground"
                        aria-label={`Emotion: ${line.emotion}`}
                      >
                        Emotion: {line.emotion}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Scene Selector */}
          <AnimatePresence>
            {showSceneSelector && (
              <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-80 bg-background border-r"
                role="complementary"
                aria-label="Scene Selection"
                id="scene-selector"
              >
                <ScrollArea className="h-full p-4">
                  <nav aria-label="Scene navigation">
                    <div className="space-y-4">
                      {scenes.map((scene) => (
                        <Card key={scene.id} className="p-4">
                          <h3 className="text-lg font-semibold">
                            Scene {scene.number}: {scene.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {scene.description}
                          </p>
                          <Button
                            variant="ghost"
                            className="mt-2 w-full"
                            onClick={() => loadScene(scene)}
                            aria-current={currentScene?.id === scene.id}
                          >
                            Select Scene
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </nav>
                </ScrollArea>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Settings Panel */}
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Adjust your scene flow settings
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="adaptive-pacing">Adaptive Pacing</Label>
                  <Switch
                    id="adaptive-pacing"
                    checked={settings.adaptivePacing}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        adaptivePacing: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-emotions">Show Emotions</Label>
                  <Switch
                    id="show-emotions"
                    checked={settings.showEmotions}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        showEmotions: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-advance">Auto-advance</Label>
                  <Switch
                    id="auto-advance"
                    checked={settings.autoAdvance}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoAdvance: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </AudioErrorBoundary>
  );
}
