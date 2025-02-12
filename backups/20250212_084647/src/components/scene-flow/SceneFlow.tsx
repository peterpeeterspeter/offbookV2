import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SceneFlowService,
  type Scene,
  type SessionStats,
} from "@/services/scene-flow";

interface SceneFlowProps {
  scriptId: string;
  userRole: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function SceneFlow({
  scriptId,
  userRole,
  onComplete,
  onError,
}: SceneFlowProps) {
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    adaptivePacing: false,
    showEmotions: true,
    autoAdvance: false,
  });

  useEffect(() => {
    async function initializeSession() {
      try {
        const session = await SceneFlowService.current.initializeSession(
          scriptId
        );
        setScenes(session.scenes);
        setStats(session.stats);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        onError?.(errorMessage);
      }
    }

    initializeSession();

    return () => {
      SceneFlowService.current.endSession();
    };
  }, [scriptId, onError]);

  if (error) {
    return (
      <div role="alert" className="p-4 text-red-500">
        {error}
      </div>
    );
  }

  const currentScene = scenes[currentSceneIndex];

  return (
    <div className="grid grid-cols-[300px_1fr] gap-6 p-6">
      <motion.aside
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="space-y-4"
      >
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Scenes</h2>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  onClick={() => setCurrentSceneIndex(index)}
                  className={`w-full text-left p-2 rounded ${
                    index === currentSceneIndex
                      ? "bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                >
                  Scene {scene.number}: {scene.title}
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </motion.aside>

      <main className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {currentScene?.title || "Loading..."}
          </h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-muted rounded"
            aria-label="settings"
          >
            ⚙️
          </button>
        </div>

        <AnimatePresence mode="wait">
          {currentScene && (
            <motion.div
              key={currentScene.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Card className="p-4">
                <p className="text-muted-foreground mb-4">
                  {currentScene.description}
                </p>
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="space-y-4">
                    {currentScene.dialogue.map((line) => (
                      <div
                        key={line.id}
                        className={`p-4 rounded ${
                          line.role === userRole
                            ? "bg-primary/10"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{line.role}</span>
                          {settings.showEmotions && (
                            <span className="text-sm text-muted-foreground">
                              {line.emotion}
                            </span>
                          )}
                        </div>
                        <p>{line.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scene Flow Settings</DialogTitle>
            <DialogDescription>
              Customize your practice session settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="adaptive-pacing">Adaptive Pacing</Label>
              <Switch
                id="adaptive-pacing"
                checked={settings.adaptivePacing}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, adaptivePacing: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-emotions">Show Emotions</Label>
              <Switch
                id="show-emotions"
                checked={settings.showEmotions}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, showEmotions: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-advance">Auto-advance</Label>
              <Switch
                id="auto-advance"
                checked={settings.autoAdvance}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, autoAdvance: checked }))
                }
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
