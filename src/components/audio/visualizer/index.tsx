"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { VisualizerRenderer } from "./renderer";
import { AudioDataAccessor } from "./audio-data";
import type {
  VisualizerColors,
  VisualizerContext,
  VisualizationMode,
  VisualizerOptions,
} from "./types";

const DEFAULT_COLORS: VisualizerColors = {
  background: "rgb(0, 0, 0)",
  waveform: "rgb(0, 255, 0)",
  frequency: "rgb(0, 255, 0)",
  gradient: {
    start: "rgb(0, 255, 0)",
    end: "rgb(0, 0, 255)",
  },
};

const DEFAULT_FFT_SIZE = 2048;
const DEFAULT_SMOOTHING = 0.8;

interface AudioVisualizerProps {
  audioStream: MediaStream | null;
  mode?: VisualizationMode;
  width?: number;
  height?: number;
  colors?: VisualizerColors;
  options?: VisualizerOptions;
}

const DEFAULT_OPTIONS: VisualizerOptions = {
  fftSize: DEFAULT_FFT_SIZE,
  smoothingTimeConstant: DEFAULT_SMOOTHING,
  minDecibels: -90,
  maxDecibels: -10,
  barSpacing: 2,
  barWidth: 4,
  lineWidth: 2,
  showGrid: false,
  showAxes: false,
  responsive: true,
  gradientMode: false,
};

export function AudioVisualizer({
  audioStream,
  mode = "waveform",
  width = 800,
  height = 200,
  colors = DEFAULT_COLORS,
  options = DEFAULT_OPTIONS,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<VisualizerContext | null>(null);
  const rendererRef = useRef<VisualizerRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<VisualizationMode>(mode);
  const { toast } = useToast();

  const setupVisualizer = useCallback(
    async (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = options.fftSize || DEFAULT_FFT_SIZE;
        analyser.smoothingTimeConstant =
          options.smoothingTimeConstant || DEFAULT_SMOOTHING;

        if (options.minDecibels) analyser.minDecibels = options.minDecibels;
        if (options.maxDecibels) analyser.maxDecibels = options.maxDecibels;

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

        if (!rendererRef.current) {
          rendererRef.current = new VisualizerRenderer(width, height);
        }

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setError(message);
        toast({
          id: "visualizer-error",
          title: "Error",
          description: `Failed to initialize audio visualizer: ${message}`,
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, width, height, options]
  );

  const draw = useCallback(() => {
    if (!canvasRef.current || !visualizerRef.current || !rendererRef.current)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = () => {
      if (!visualizerRef.current || !rendererRef.current) return;

      let offscreenCanvas;
      switch (currentMode) {
        case "waveform":
          offscreenCanvas = rendererRef.current.drawWaveform(
            visualizerRef.current,
            colors,
            options
          );
          break;
        case "frequency":
          offscreenCanvas = rendererRef.current.drawBars(
            visualizerRef.current,
            colors,
            options
          );
          break;
        case "circular":
          offscreenCanvas = rendererRef.current.drawCircular(
            visualizerRef.current,
            colors,
            options
          );
          break;
        case "spectrum":
          offscreenCanvas = rendererRef.current.drawSpectrum(
            visualizerRef.current,
            colors,
            options
          );
          break;
        case "bars":
          offscreenCanvas = rendererRef.current.drawBars(
            visualizerRef.current,
            colors,
            options
          );
          break;
        default:
          offscreenCanvas = rendererRef.current.drawWaveform(
            visualizerRef.current,
            colors,
            options
          );
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreenCanvas, 0, 0);

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }, [currentMode, colors, options]);

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
      setError(null);

      if (!audioStream) return;

      const success = await setupVisualizer(audioStream);
      if (!success) return;

      draw();
    };

    initialize();
    return cleanup;
  }, [audioStream, setupVisualizer, draw]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current) return;

      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const computedWidth = options.responsive
        ? canvas.parentElement?.clientWidth || width
        : width;

      canvas.width = computedWidth * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${computedWidth}px`;
      canvas.style.height = `${height}px`;

      rendererRef.current.updateDimensions(canvas.width, canvas.height);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    if (options.responsive) {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [width, height, options.responsive]);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        Failed to initialize visualizer: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={currentMode}
        onValueChange={(v) => setCurrentMode(v as VisualizationMode)}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="waveform">Waveform</TabsTrigger>
          <TabsTrigger value="frequency">Frequency</TabsTrigger>
          <TabsTrigger value="circular">Circular</TabsTrigger>
          <TabsTrigger value="spectrum">Spectrum</TabsTrigger>
          <TabsTrigger value="bars">Bars</TabsTrigger>
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
