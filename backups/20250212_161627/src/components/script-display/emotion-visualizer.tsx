import React, { useEffect, useRef } from "react";
import { Emotion } from "../../types/emotions";
import { cn } from "../../lib/utils";

interface EmotionDataPoint {
  emotion: Emotion;
  intensity: number;
  timestamp: number;
}

interface EmotionVisualizerProps {
  data: EmotionDataPoint[];
  width?: number;
  height?: number;
  className?: string;
  onHover?: (point: EmotionDataPoint | null) => void;
}

const emotionYPositions: Record<Emotion, number> = {
  joy: 0,
  surprise: 1,
  anger: 2,
  fear: 3,
  sadness: 4,
  disgust: 5,
  neutral: 6,
};

const emotionColors: Record<Emotion, string> = {
  joy: "#FCD34D",
  surprise: "#34D399",
  anger: "#EF4444",
  fear: "#8B5CF6",
  sadness: "#3B82F6",
  disgust: "#F97316",
  neutral: "#9CA3AF",
};

export function EmotionVisualizer({
  data,
  width = 600,
  height = 300,
  className,
  onHover,
}: EmotionVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set up scales
    const timeScale =
      width /
      (data.length > 1
        ? data[data.length - 1].timestamp - data[0].timestamp
        : 1);
    const emotionScale = height / Object.keys(emotionYPositions).length;

    // Draw emotion transitions
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];

      const x1 = (current.timestamp - data[0].timestamp) * timeScale;
      const x2 = (next.timestamp - data[0].timestamp) * timeScale;
      const y1 =
        emotionYPositions[current.emotion] * emotionScale + emotionScale / 2;
      const y2 =
        emotionYPositions[next.emotion] * emotionScale + emotionScale / 2;

      // Draw transition line
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, emotionColors[current.emotion]);
      gradient.addColorStop(1, emotionColors[next.emotion]);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw intensity circles
      ctx.beginPath();
      ctx.fillStyle = emotionColors[current.emotion];
      const radius = (current.intensity / 10) * (emotionScale / 4);
      ctx.arc(x1, y1, radius, 0, Math.PI * 2);
      ctx.fill();

      if (i === data.length - 2) {
        ctx.beginPath();
        ctx.fillStyle = emotionColors[next.emotion];
        const nextRadius = (next.intensity / 10) * (emotionScale / 4);
        ctx.arc(x2, y2, nextRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw emotion labels
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    Object.entries(emotionYPositions).forEach(([emotion, position]) => {
      const y = position * emotionScale + emotionScale / 2;
      ctx.fillStyle = emotionColors[emotion as Emotion];
      ctx.fillText(emotion, 10, y);
    });
  }, [data, width, height]);

  // Handle mouse interaction
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !onHover) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const timeScale =
      width /
      (data.length > 1
        ? data[data.length - 1].timestamp - data[0].timestamp
        : 1);

    // Find closest data point
    const closestPoint = data.reduce(
      (closest, point) => {
        const pointX = (point.timestamp - data[0].timestamp) * timeScale;
        const distance = Math.abs(pointX - x);
        return distance < closest.distance ? { point, distance } : closest;
      },
      { point: null as EmotionDataPoint | null, distance: Infinity }
    );

    onHover(closestPoint.point);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
    </div>
  );
}
