"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

/**
 * Props for the AudioVisualizer component
 * @property audioStream - MediaStream from user's audio input
 * @property mode - Visualization mode (waveform or frequency)
 * @property width - Canvas width in pixels
 * @property height - Canvas height in pixels
 */
interface AudioVisualizerProps {
  audioStream: MediaStream | null;
  mode?: "waveform" | "frequency";
  width?: number;
  height?: number;
}

/**
 * Context holding audio processing state and resources
 */
interface VisualizerContext {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  dataArray: Uint8Array;
  bufferLength: number;
}

type DrawFunction = (
  ctx: CanvasRenderingContext2D,
  visualizer: VisualizerContext,
  canvas: HTMLCanvasElement
) => void;

/**
 * Type-safe array accessor that handles bounds checking and type narrowing
 */
class AudioDataAccessor {
  constructor(
    private data: Uint8Array,
    private length: number
  ) {}

  getValue(index: number): number | null {
    if (index >= 0 && index < this.length && index < this.data.length) {
      const value = this.data[index];
      return typeof value === "number" ? value : null;
    }
    return null;
  }

  getScaledValue(index: number, scale: number): number | null {
    const value = this.getValue(index);
    return value !== null ? value / scale : null;
  }
}

const drawWaveform: DrawFunction = (ctx, visualizer, canvas) => {
  const { dataArray, bufferLength, analyser } = visualizer;
  const accessor = new AudioDataAccessor(dataArray, bufferLength);

  analyser.getByteTimeDomainData(dataArray);

  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgb(0, 255, 0)";
  ctx.beginPath();

  const sliceWidth = (canvas.width * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const value = accessor.getScaledValue(i, 128.0);
    if (value !== null) {
      const y = (value * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    x += sliceWidth;
  }

  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
};

const drawFrequency: DrawFunction = (ctx, visualizer, canvas) => {
  const { dataArray, bufferLength, analyser } = visualizer;
  const accessor = new AudioDataAccessor(dataArray, bufferLength);

  analyser.getByteFrequencyData(dataArray);

  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const barWidth = (canvas.width / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const value = accessor.getScaledValue(i, 255);
    if (value !== null) {
      const barHeight = value * canvas.height;
      const green = Math.min(255, Math.floor(barHeight + 100));

      ctx.fillStyle = `rgb(0, ${green}, 0)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    }
    x += barWidth + 1;
  }
};

/**
 * AudioVisualizer component that provides real-time visualization of audio input
 * in both waveform and frequency spectrum modes.
 */
export function AudioVisualizer({
  audioStream,
  mode = "waveform",
  width = 800,
  height = 200,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<VisualizerContext | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

  const setupVisualizer = useCallback(
    async (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);

        visualizerRef.current = {
          audioContext,
          analyser,
          source,
          dataArray,
          bufferLength,
        };

        return true;
      } catch (error) {
        console.error("Failed to setup audio visualizer:", error);
        toast({
          id: "visualizer-error",
          title: "Error",
          description: "Failed to initialize audio visualizer",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  const draw = useCallback((drawFunc: DrawFunction) => {
    if (!canvasRef.current || !visualizerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = () => {
      if (!visualizerRef.current) return;
      drawFunc(ctx, visualizerRef.current, canvas);
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }, []);

  useEffect(() => {
    const cleanup = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (visualizerRef.current) {
        const { source, audioContext } = visualizerRef.current;
        source.disconnect();
        audioContext.close();
        visualizerRef.current = null;
      }
    };

    const initialize = async () => {
      cleanup();

      if (!audioStream) return;

      const success = await setupVisualizer(audioStream);
      if (!success) return;

      draw(mode === "waveform" ? drawWaveform : drawFrequency);
    };

    initialize();
    return cleanup;
  }, [audioStream, mode, setupVisualizer, draw]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [width, height]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue={mode} className="w-full">
        <TabsList>
          <TabsTrigger value="waveform">Waveform</TabsTrigger>
          <TabsTrigger value="frequency">Frequency</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="relative rounded-lg border bg-muted">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      </div>
    </div>
  );
}
