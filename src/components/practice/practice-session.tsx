import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { api } from "../../lib/api";

interface PracticeSessionProps {
  scriptId: string;
  onComplete?: () => void;
}

export function PracticeSession({
  scriptId,
  onComplete,
}: PracticeSessionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState<{
    id: string;
    name: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true);
        const response = await api.createPracticeSession(scriptId);
        if (response.error) {
          throw new Error(response.error);
        }
        // Load initial scene
        // TODO: Implement scene loading
      } catch (error) {
        toast({
          id: "practice-session-error",
          title: "Error",
          description: "Failed to start practice session",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [scriptId, toast]);

  const handleNext = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement next scene logic
      setProgress((prev) => Math.min(prev + 20, 100));
    } catch (error) {
      toast({
        id: "next-scene-error",
        title: "Error",
        description: "Failed to load next scene",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    toast({
      id: "practice-complete",
      title: "Success",
      description: "Practice session completed!",
    });
    onComplete?.();
  };

  if (!currentScene) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading practice session...</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={0} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{currentScene.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-[200px] p-4 bg-muted rounded-md">
          {currentScene.content}
        </div>
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/scripts/${scriptId}`)}
          >
            Exit
          </Button>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={isLoading || progress >= 100}
            >
              Next Scene
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isLoading || progress < 100}
            >
              Complete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
