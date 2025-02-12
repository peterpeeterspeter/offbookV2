import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDailyCall } from '@/hooks/use-daily-call';
import { useConfig } from '@/hooks/use-config';
import { AudioLevelIndicator } from '@/components/audio-level-indicator';
import { NetworkQualityIndicator } from '@/components/network-quality-indicator';

interface PracticeRoomProps {
  userName: string;
  onError?: (error: Error) => void;
}

interface RoomInfo {
  url: string;
  token: string;
}

export function PracticeRoom({ userName, onError }: PracticeRoomProps) {
  const { config, isValid, errors } = useConfig();
  const [isReady, setIsReady] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);

  // Show configuration errors if any
  useEffect(() => {
    if (!isValid) {
      onError?.(new Error(`Configuration errors: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`));
    }
  }, [isValid, errors, onError]);

  const {
    isConnected,
    isConnecting,
    audioEnabled,
    metrics,
    error,
    toggleAudio,
    joinRoom,
    leaveRoom,
  } = useDailyCall({
    roomUrl: roomInfo?.url || '',
    token: roomInfo?.token,
    userName,
    onError,
    audioConfig: {
      sampleRate: config.audio.sampleRate,
      echoCancellation: config.audio.enableEchoCancellation,
      noiseSuppression: config.audio.enableNoiseSuppression,
      autoGainControl: config.audio.enableAutoGain,
    },
  });

  useEffect(() => {
    const createRoom = async () => {
      try {
        const response = await fetch('/api/daily/room', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `practice-${Date.now()}`,
            properties: {
              start_audio_off: false,
              start_video_off: true,
              enable_network_ui: config.webrtc.enableMetrics,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create room');
        }

        const data = await response.json();
        setRoomInfo({
          url: data.url,
          token: data.token,
        });
        setIsReady(true);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create room');
        onError?.(error);
      }
    };

    if (isValid) {
      createRoom();
    }

    return () => {
      if (roomInfo) {
        // Clean up room when component unmounts
        fetch(`/api/daily/room?name=${roomInfo.url.split('/').pop()}`, {
          method: 'DELETE',
        }).catch(console.error);
      }
    };
  }, [isValid, onError]);

  useEffect(() => {
    // Auto-join the room when it's ready
    if (!isConnected && !isConnecting && isReady && roomInfo) {
      joinRoom();
    }
  }, [isConnected, isConnecting, isReady, roomInfo, joinRoom]);

  useEffect(() => {
    // Cleanup: leave room when component unmounts
    return () => {
      if (isConnected) {
        leaveRoom();
      }
    };
  }, [isConnected, leaveRoom]);

  if (!isValid) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-500">Invalid configuration. Please check your settings.</p>
          <div className="mt-2 text-sm text-gray-500">
            {errors.map((error, index) => (
              <div key={index}>
                {error.path}: {error.message}
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!roomInfo) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Creating practice room...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Practice Room</h2>
        <div className="flex items-center space-x-2">
          {config.webrtc.enableMetrics && (
            <>
              <NetworkQualityIndicator quality={metrics.networkQuality} />
              <AudioLevelIndicator level={metrics.audioLevel} />
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {config.webrtc.enableMetrics && (
            <span className="text-sm text-gray-500">
              Latency: {metrics.latency.toFixed(0)}ms
            </span>
          )}
        </div>

        {error && (
          <div className="p-2 text-sm text-red-500 bg-red-50 rounded">
            {error.message}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <Button
          variant={audioEnabled ? 'default' : 'secondary'}
          onClick={toggleAudio}
          disabled={!isConnected}
        >
          {audioEnabled ? 'Mute' : 'Unmute'}
        </Button>

        <Button
          variant="destructive"
          onClick={leaveRoom}
          disabled={!isConnected}
        >
          Leave Room
        </Button>
      </div>

      {config.webrtc.enableMetrics && (
        <div className="text-xs text-gray-400">
          <div>Packet Loss: {(metrics.packetLoss * 100).toFixed(1)}%</div>
          <div>Jitter: {metrics.jitter.toFixed(0)}ms</div>
        </div>
      )}
    </Card>
  );
} 
