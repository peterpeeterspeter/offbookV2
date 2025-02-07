import React, { useEffect, useRef, useState } from 'react';
import { useDaily } from '@/lib/webrtc/daily-provider';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdvancedVisualizerProps {
  className?: string;
  analyzer: AnalyserNode;
  width?: number;
  height?: number;
  theme?: {
    backgroundColor?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    gridColor?: string;
  };
}

const DEFAULT_THEME = {
  backgroundColor: '#1f2937',
  primaryColor: '#10b981',
  secondaryColor: '#6366f1',
  tertiaryColor: '#f43f5e',
  gridColor: '#374151',
};

export const AdvancedVisualizer: React.FC<AdvancedVisualizerProps> = ({
  className,
  analyzer,
  width = 600,
  height = 300,
  theme = DEFAULT_THEME,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeView, setActiveView] = useState<'spectrum' | 'waveform' | 'stereo'>('spectrum');
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyzer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up analyzer buffers
    analyzer.fftSize = 2048;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const waveformArray = new Float32Array(bufferLength);

    const drawSpectrum = () => {
      ctx.fillStyle = theme.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Get frequency data
      analyzer.getFloatFrequencyData(dataArray);

      // Draw frequency bars
      const barWidth = (width / bufferLength) * 2.5;
      const heightScale = height / 140; // Scale for dB range (-140 to 0)
      
      ctx.beginPath();
      ctx.moveTo(0, height);
      
      for (let i = 0; i < bufferLength; i++) {
        const x = i * barWidth;
        const dbValue = dataArray[i];
        const normalizedValue = (dbValue + 140) * heightScale; // Normalize from dB to pixels
        const y = height - normalizedValue;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Fill spectrum
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = theme.primaryColor + '40'; // Add transparency
      ctx.fill();

      // Draw line on top
      ctx.strokeStyle = theme.primaryColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw grid
      ctx.strokeStyle = theme.gridColor;
      ctx.lineWidth = 1;
      
      // Frequency grid lines
      const freqLines = [100, 1000, 10000];
      freqLines.forEach(freq => {
        const x = (Math.log10(freq) - 2) * (width / 3);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        ctx.fillStyle = theme.gridColor;
        ctx.font = '10px monospace';
        ctx.fillText(`${freq}Hz`, x + 5, height - 5);
      });

      // dB grid lines
      const dbLines = [-120, -90, -60, -30, 0];
      dbLines.forEach(db => {
        const y = height - ((db + 140) * heightScale);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        
        ctx.fillStyle = theme.gridColor;
        ctx.font = '10px monospace';
        ctx.fillText(`${db}dB`, 5, y - 5);
      });
    };

    const drawWaveform = () => {
      ctx.fillStyle = theme.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Get time domain data
      analyzer.getFloatTimeDomainData(waveformArray);

      // Draw waveform
      ctx.beginPath();
      ctx.strokeStyle = theme.secondaryColor;
      ctx.lineWidth = 2;

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = waveformArray[i];
        const y = (v + 1) * height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      // Draw grid
      ctx.strokeStyle = theme.gridColor;
      ctx.lineWidth = 1;

      // Time grid lines
      const timeScale = 1000 / analyzer.context.sampleRate;
      const msLines = [0, 5, 10, 15, 20];
      msLines.forEach(ms => {
        const x = (ms / timeScale) * sliceWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        ctx.fillStyle = theme.gridColor;
        ctx.font = '10px monospace';
        ctx.fillText(`${ms}ms`, x + 5, height - 5);
      });

      // Amplitude grid lines
      const ampLines = [-1, -0.5, 0, 0.5, 1];
      ampLines.forEach(amp => {
        const y = (amp + 1) * height / 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        
        ctx.fillStyle = theme.gridColor;
        ctx.font = '10px monospace';
        ctx.fillText(amp.toFixed(1), 5, y - 5);
      });
    };

    const drawStereoField = () => {
      ctx.fillStyle = theme.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Get left and right channel data
      analyzer.getFloatTimeDomainData(waveformArray);
      
      // Draw correlation plot
      ctx.strokeStyle = theme.tertiaryColor;
      ctx.lineWidth = 2;
      
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3;

      // Draw grid
      ctx.strokeStyle = theme.gridColor;
      ctx.lineWidth = 1;

      // Draw circular grid
      [0.25, 0.5, 0.75, 1].forEach(r => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw axes
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.stroke();

      // Plot stereo correlation
      ctx.beginPath();
      ctx.strokeStyle = theme.tertiaryColor;
      ctx.lineWidth = 2;

      for (let i = 0; i < bufferLength; i += 2) {
        const left = waveformArray[i];
        const right = waveformArray[i + 1];
        
        const x = centerX + (left * radius);
        const y = centerY + (right * radius);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Add labels
      ctx.fillStyle = theme.gridColor;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('L', centerX - radius - 15, centerY);
      ctx.fillText('R', centerX + radius + 15, centerY);
      ctx.fillText('M', centerX, centerY - radius - 15);
      ctx.fillText('S', centerX, centerY + radius + 15);
    };

    const draw = () => {
      switch (activeView) {
        case 'spectrum':
          drawSpectrum();
          break;
        case 'waveform':
          drawWaveform();
          break;
        case 'stereo':
          drawStereoField();
          break;
      }
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyzer, width, height, theme, activeView]);

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as typeof activeView)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="spectrum">Spectrum</TabsTrigger>
          <TabsTrigger value="waveform">Waveform</TabsTrigger>
          <TabsTrigger value="stereo">Stereo</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}; 