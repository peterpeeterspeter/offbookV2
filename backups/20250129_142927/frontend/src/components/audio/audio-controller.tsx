import React, { useEffect, useState } from 'react';
import { useDaily } from '@/lib/webrtc/daily-provider';
import { useAudioStream } from '@/lib/webrtc/use-audio-stream';
import { AdvancedVisualizer } from './advanced-visualizer';
import { AudioEffectsPanel } from './audio-effects-panel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Mic, MicOff, Phone, PhoneOff, Settings2 } from 'lucide-react';
import { AudioEffectsConfig } from '@/lib/webrtc/audio-processor';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AudioControllerProps {
  roomUrl: string;
  className?: string;
  visualizerTheme?: {
    backgroundColor?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    gridColor?: string;
  };
}

export const AudioController: React.FC<AudioControllerProps> = ({
  roomUrl,
  className,
  visualizerTheme,
}) => {
  const { joinRoom, leaveRoom, isJoined, error } = useDaily();
  const {
    isStreaming,
    isMuted,
    startStreaming,
    stopStreaming,
    toggleProcessing,
    updateAudioEffects,
    processingEnabled,
    audioLevel,
    error: streamError,
    audioProcessor,
  } = useAudioStream();
  const { toast } = useToast();

  // Audio processing state
  const [effects, setEffects] = useState<Partial<AudioEffectsConfig>>({
    lowGain: 0,
    midGain: 0,
    highGain: 0,
    threshold: -24,
    ratio: 12,
    gateThreshold: -50,
    reverbEnabled: false,
    reverbMix: 0.3,
    reverbDecay: 2.0,
    reverbPreDelay: 0.1,
    delayEnabled: false,
    delayTime: 0.25,
    delayFeedback: 0.3,
    delayMix: 0.3,
    stereoEnabled: false,
    stereoWidth: 0.5,
  });

  // Handle connection errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Handle streaming errors
  useEffect(() => {
    if (streamError) {
      toast({
        title: 'Streaming Error',
        description: streamError.message,
        variant: 'destructive',
      });
    }
  }, [streamError, toast]);

  // Handle room connection
  const handleConnect = async () => {
    try {
      await joinRoom(roomUrl);
      await startStreaming();
    } catch (e) {
      toast({
        title: 'Failed to connect',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  };

  // Handle room disconnection
  const handleDisconnect = async () => {
    try {
      stopStreaming();
      await leaveRoom();
    } catch (e) {
      toast({
        title: 'Failed to disconnect',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  };

  // Handle effects changes
  const handleEffectChange = (key: keyof AudioEffectsConfig, value: number | boolean) => {
    const newEffects = { ...effects, [key]: value };
    setEffects(newEffects);
    updateAudioEffects(newEffects);
  };

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audio Connection</h3>
          <div className="space-x-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!isStreaming || !processingEnabled}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Audio Effects</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <AudioEffectsPanel
                    effects={effects}
                    onEffectChange={handleEffectChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Button
              variant={processingEnabled ? 'default' : 'outline'}
              size="icon"
              onClick={toggleProcessing}
              disabled={!isStreaming}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              variant={isJoined ? 'destructive' : 'default'}
              size="icon"
              onClick={isJoined ? handleDisconnect : handleConnect}
            >
              {isJoined ? (
                <PhoneOff className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="h-[400px]">
          {audioProcessor && (
            <AdvancedVisualizer
              analyzer={audioProcessor.getAnalyzer()}
              width={600}
              height={400}
              theme={visualizerTheme}
            />
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {isJoined ? (
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Connected to room</span>
              {processingEnabled && (
                <span className="ml-2 text-xs">
                  (Audio Level: {(audioLevel * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-gray-500" />
              <span>Disconnected</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}; 