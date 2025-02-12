import React from 'react';
import { Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react';

interface NetworkQualityIndicatorProps {
  quality: number; // 0-5 scale
}

export function NetworkQualityIndicator({ quality }: NetworkQualityIndicatorProps) {
  const getQualityColor = () => {
    if (quality >= 4) return 'text-green-500';
    if (quality >= 3) return 'text-yellow-500';
    if (quality >= 1) return 'text-orange-500';
    return 'text-red-500';
  };

  const getQualityIcon = () => {
    if (quality >= 4) return <SignalHigh className={`w-5 h-5 ${getQualityColor()}`} />;
    if (quality >= 3) return <SignalMedium className={`w-5 h-5 ${getQualityColor()}`} />;
    if (quality >= 1) return <SignalLow className={`w-5 h-5 ${getQualityColor()}`} />;
    return <Signal className={`w-5 h-5 ${getQualityColor()}`} />;
  };

  return (
    <div className="flex items-center space-x-1" title={`Network Quality: ${quality}/5`}>
      {getQualityIcon()}
      <span className={`text-xs ${getQualityColor()}`}>{quality}/5</span>
    </div>
  );
} 
