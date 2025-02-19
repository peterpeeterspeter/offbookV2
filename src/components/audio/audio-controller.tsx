import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AudioEffectsPanel } from "./audio-effects-panel";
import { AdvancedVisualizer } from "./advanced-visualizer";
import { useAudioStream } from "@/lib/hooks/use-audio-stream";
import { useToast } from "@/lib/hooks/use-toast";
import type { VisualizerTheme } from "@/lib/audio/types";
import { joinCall, leaveCall } from "@/lib/calls";

interface AudioControllerProps {
  roomUrl: string;
  className?: string;
  visualizerTheme?: VisualizerTheme;
}

export function AudioController({
  roomUrl,
  className,
  visualizerTheme,
}: AudioControllerProps) {
  const { toast } = useToast();
  const {
    startStreaming,
    stopStreaming,
    toggleProcessing,
    updateEffects,
    isProcessing,
    effects,
    analyzer,
    error,
  } = useAudioStream();

  useEffect(() => {
    if (error) {
      toast({
        id: "error-toast",
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleJoinRoom = async () => {
    try {
      await startStreaming();
    } catch (err) {
      toast({
        id: "join-error-toast",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to join room",
        variant: "destructive",
      });
    }
  };

  const handleLeaveRoom = () => {
    stopStreaming();
  };

  const isConnected = Boolean(analyzer);

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <Button
            onClick={isConnected ? handleLeaveRoom : handleJoinRoom}
            variant={isConnected ? "destructive" : "default"}
          >
            {isConnected ? (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Leave Room
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Join Room
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isConnected && (
        <>
          <AudioEffectsPanel
            isProcessing={isProcessing}
            onToggleProcessing={toggleProcessing}
            onUpdateEffects={updateEffects}
            effects={effects}
          />
          <AdvancedVisualizer analyzer={analyzer} theme={visualizerTheme} />
        </>
      )}
    </div>
  );
}
