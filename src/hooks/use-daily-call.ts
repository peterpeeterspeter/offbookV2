import { useEffect, useState, useCallback } from 'react';
import { DailyService } from '@/services/daily-service';

interface UseDailyCallProps {
  roomUrl: string;
  token?: string;
  userName: string;
  onError?: (error: Error) => void;
  daily: {
    apiKey: string;
    domain: string;
  };
  audioConfig?: {
    sampleRate: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
}

interface CallMetrics {
  networkQuality: number;
  audioLevel: number;
  latency: number;
  packetLoss: number;
  jitter: number;
}

let activeInstance: DailyService | null = null;

function cleanupDailyInstance() {
  if (activeInstance) {
    try {
      activeInstance.destroy();
    } catch (error) {
      console.error('Error cleaning up Daily instance:', error);
    }
    activeInstance = null;
  }
}

export function useDailyCall({
  roomUrl,
  token,
  userName,
  onError,
  daily,
  audioConfig
}: UseDailyCallProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<CallMetrics>({
    networkQuality: 100,
    audioLevel: 0,
    latency: 0,
    packetLoss: 0,
    jitter: 0
  });

  const handleError = useCallback((err: Error) => {
    setError(err);
    onError?.(err);
  }, [onError]);

  const initializeDaily = useCallback(async () => {
    try {
      cleanupDailyInstance();
      const service = new DailyService();
      const config = {
        url: roomUrl,
        userName,
        daily,
        ...(token && { token }),
        ...(audioConfig && { audioConfig })
      };
      await service.initialize(config);
      activeInstance = service;
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to initialize Daily.co service'));
    }
  }, [roomUrl, token, userName, daily, audioConfig, handleError]);

  const joinRoom = useCallback(async () => {
    try {
      setIsConnecting(true);
      await initializeDaily();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to join room'));
    } finally {
      setIsConnecting(false);
    }
  }, [initializeDaily, handleError]);

  const leaveRoom = useCallback(async () => {
    cleanupDailyInstance();
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  }, []);

  const toggleAudio = useCallback(async () => {
    if (!activeInstance) return;

    try {
      const newState = await activeInstance.setAudioEnabled(!audioEnabled);
      setAudioEnabled(newState);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to toggle audio'));
    }
  }, [audioEnabled, handleError]);

  useEffect(() => {
    return () => {
      cleanupDailyInstance();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    audioEnabled,
    metrics,
    error,
    toggleAudio,
    joinRoom,
    leaveRoom
  };
}
