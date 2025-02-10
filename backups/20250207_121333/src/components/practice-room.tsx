import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDailyCall } from "@/hooks/use-daily-call";
import { useConfig } from "@/hooks/use-config";
import { AudioLevelIndicator } from "@/components/audio-level-indicator";
import { NetworkQualityIndicator } from "@/components/network-quality-indicator";
import { createRoom, deleteRoom } from "@/api/daily";
import type { ActionResponse } from "@/types/actions";

interface PracticeRoomProps {
  userName: string;
  onError?: (error: Error) => void;
}

interface RoomInfo {
  url: string;
  token?: string;
}

export function PracticeRoom({ userName, onError }: PracticeRoomProps) {
  const { config, isValid, errors } = useConfig();
  const [isReady, setIsReady] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isConnected,
    isConnecting,
    audioEnabled,
    metrics,
    error: callError,
    toggleAudio,
    joinRoom,
    leaveRoom,
  } = useDailyCall({
    roomUrl: roomInfo?.url || "",
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
    const initializeRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/daily/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `practice-${Date.now()}`,
            properties: {
              maxParticipants: 2,
              enableChat: true,
              startAudioOff: false,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          let errorMessage = "Failed to create room";
          try {
            const parsed = JSON.parse(errorData);
            errorMessage = parsed.error || parsed.message || errorMessage;
          } catch {
            errorMessage = errorData || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to create room");
        }

        setRoomInfo({
          url: result.data.url,
          token: result.data.token,
        });
        setIsReady(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create room";
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    if (isValid && !roomInfo) {
      initializeRoom();
    }

    return () => {
      if (roomInfo?.url) {
        const roomName = roomInfo.url.split("/").pop();
        if (roomName) {
          fetch(`/api/daily/rooms?name=${roomName}`, {
            method: "DELETE",
          }).catch(console.error);
        }
      }
    };
  }, [isValid, onError, roomInfo]);

  useEffect(() => {
    if (!isConnected && !isConnecting && isReady && roomInfo && !error) {
      joinRoom();
    }
  }, [isConnected, isConnecting, isReady, roomInfo, error, joinRoom]);

  if (!isValid) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-500">
            Invalid configuration. Please check your settings.
          </p>
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

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (isLoading || !roomInfo) {
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
            {isConnecting
              ? "Connecting..."
              : isConnected
              ? "Connected"
              : "Disconnected"}
          </span>
          {config.webrtc.enableMetrics && (
            <span className="text-sm text-gray-500">
              Latency: {metrics.latency.toFixed(0)}ms
            </span>
          )}
        </div>

        {callError && (
          <div className="p-2 text-sm text-red-500 bg-red-50 rounded">
            {callError.message}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <Button
          variant={audioEnabled ? "default" : "secondary"}
          onClick={toggleAudio}
          disabled={!isConnected}
        >
          {audioEnabled ? "Mute" : "Unmute"}
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
