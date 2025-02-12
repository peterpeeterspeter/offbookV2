import React, { useEffect, useState } from 'react';
import { useDailyCall } from '@/lib/hooks/use-daily-call';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AudioLevelIndicator } from './audio-level-indicator';

interface PracticeRoomProps {
  roomUrl: string;
  userName: string;
  onAudioData?: (audioData: Float32Array) => void;
}

export function PracticeRoom({ roomUrl, userName, onAudioData }: PracticeRoomProps) {
  const { toast } = useToast();
  const [audioLevel, setAudioLevel] = useState(0);

  const {
    state: { isJoined, isAudioEnabled, error },
    joinMeeting,
    leaveMeeting,
    toggleAudio,
  } = useDailyCall({
    url: roomUrl,
    userName,
    audioOnly: true,
    onJoinedMeeting: () => {
      toast({
        title: 'Joined Practice Room',
        description: 'You are now connected to the practice session.',
      });
    },
    onLeftMeeting: () => {
      toast({
        title: 'Left Practice Room',
        description: 'You have disconnected from the practice session.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onAudioLevel: (level) => {
      setAudioLevel(level);
      // Process audio data if needed
      if (onAudioData) {
        // Convert audio level to Float32Array for processing
        const audioData = new Float32Array([level]);
        onAudioData(audioData);
      }
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Practice Room</h2>
        <AudioLevelIndicator level={audioLevel} />
      </div>

      <div className="flex items-center space-x-4">
        {!isJoined ? (
          <Button onClick={joinMeeting} variant="default">
            Join Session
          </Button>
        ) : (
          <>
            <Button onClick={leaveMeeting} variant="destructive">
              Leave Session
            </Button>
            <Button
              onClick={toggleAudio}
              variant={isAudioEnabled ? 'default' : 'secondary'}
            >
              {isAudioEnabled ? 'Mute' : 'Unmute'}
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm">
          Error: {error.message}
        </div>
      )}
    </Card>
  );
} 
