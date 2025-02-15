"use client";

import React, { useEffect, useRef } from "react";
import { VisualizationMode, VisualizerOptions } from "./types";
import { VisualizerRenderer } from "./visualizer-renderer";

interface AdvancedVisualizerProps {
  audioContext: AudioContext;
  analyserNode: AnalyserNode;
  mode?: VisualizationMode;
  options?: Partial<VisualizerOptions>;
  className?: string;
}

export function AdvancedVisualizer({
  audioContext,
  analyserNode,
  mode = "waveform",
  options = {},
  className = "",
}: AdvancedVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<VisualizerRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new VisualizerRenderer(canvas, analyserNode, {
      ...options,
      mode,
    });

    const animate = () => {
      if (!rendererRef.current) return;
      rendererRef.current.render();
      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [analyserNode, mode, options]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
