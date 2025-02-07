import { useEffect, useRef, useState } from 'react';
import { DailyService, DailyServiceConfig, DailyServiceMetrics } from '../lib/webrtc/daily-service';

interface UseDailyCallOptions extends DailyServiceConfig {
  onError?: (error: Error) => void;
  onMetricsUpdate?: (metrics: DailyServiceMetrics) => void;
}

interface UseDailyCallReturn {
  isConnected: boolean;
  isConnecting: boolean;
  audioEnabled: boolean;
  metrics: DailyServiceMetrics;
  error: Error | null;
  toggleAudio: () => Promise<void>;
  joinRoom: () => Promise<void>;
  leaveRoom: () => Promise<void>;
}

const DEFAULT_METRICS: DailyServiceMetrics = {
  networkQuality: 0,
  audioLevel: 0,
  latency: 0,
  packetLoss: 0,
  jitter: 0,
};

export function useDailyCall(options: UseDailyCallOptions): UseDailyCallReturn {
  const dailyService = useRef<DailyService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [metrics, setMetrics] = useState<DailyServiceMetrics>(DEFAULT_METRICS);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeDaily = async () => {
      try {
        dailyService.current = new DailyService(options);
        await dailyService.current.initialize();

        // Set up event listeners
        dailyService.current.on('joined-meeting', () => {
          setIsConnected(true);
          setIsConnecting(false);
        });

        dailyService.current.on('left-meeting', () => {
          setIsConnected(false);
          setIsConnecting(false);
          setAudioEnabled(false);
        });

        dailyService.current.on('error', (err: Error) => {
          setError(err);
          options.onError?.(err);
        });

        dailyService.current.on('metrics-updated', (newMetrics: DailyServiceMetrics) => {
          setMetrics(newMetrics);
          options.onMetricsUpdate?.(newMetrics);
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize Daily.co');
        setError(error);
        options.onError?.(error);
      }
    };

    initializeDaily();

    return () => {
      if (dailyService.current) {
        dailyService.current.destroy();
        dailyService.current = null;
      }
    };
  }, [options]);

  const joinRoom = async () => {
    if (!dailyService.current) {
      throw new Error('Daily.co service not initialized');
    }

    try {
      setIsConnecting(true);
      setError(null);
      await dailyService.current.joinRoom();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to join room');
      setError(error);
      options.onError?.(error);
      setIsConnecting(false);
    }
  };

  const leaveRoom = async () => {
    if (!dailyService.current) return;

    try {
      await dailyService.current.leaveRoom();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to leave room');
      setError(error);
      options.onError?.(error);
    }
  };

  const toggleAudio = async () => {
    if (!dailyService.current) return;

    try {
      const newState = await dailyService.current.setAudioEnabled(!audioEnabled);
      setAudioEnabled(newState);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle audio');
      setError(error);
      options.onError?.(error);
    }
  };

  return {
    isConnected,
    isConnecting,
    audioEnabled,
    metrics,
    error,
    toggleAudio,
    joinRoom,
    leaveRoom,
  };
} 
