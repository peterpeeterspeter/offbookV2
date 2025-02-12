import React, { useEffect, useRef } from 'react';

interface AudioLevelIndicatorProps {
  level: number;
  width?: number;
  height?: number;
}

export function AudioLevelIndicator({
  level,
  width = 200,
  height = 40,
}: AudioLevelIndicatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate bar width and spacing
    const numBars = 20;
    const barWidth = (width - (numBars - 1) * 2) / numBars;
    const spacing = 2;

    // Draw background bars
    ctx.fillStyle = '#e5e7eb'; // Tailwind gray-200
    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + spacing);
      ctx.fillRect(x, 0, barWidth, height);
    }

    // Calculate number of active bars based on level (0-1)
    const activeBars = Math.floor(level * numBars);

    // Draw active bars with gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#22c55e'); // Tailwind green-500
    gradient.addColorStop(0.6, '#eab308'); // Tailwind yellow-500
    gradient.addColorStop(1, '#ef4444'); // Tailwind red-500

    ctx.fillStyle = gradient;
    for (let i = 0; i < activeBars; i++) {
      const x = i * (barWidth + spacing);
      ctx.fillRect(x, 0, barWidth, height);
    }
  }, [level, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg"
    />
  );
} 
