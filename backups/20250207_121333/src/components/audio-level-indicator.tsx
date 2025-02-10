import React from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';

interface AudioLevelIndicatorProps {
  level: number; // 0-1 scale
}

export function AudioLevelIndicator({ level }: AudioLevelIndicatorProps) {
  const getVolumeColor = () => {
    if (level >= 0.8) return 'text-red-500';
    if (level >= 0.5) return 'text-green-500';
    if (level >= 0.2) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const getVolumeIcon = () => {
    if (level >= 0.8) return <Volume2 className={`w-5 h-5 ${getVolumeColor()}`} />;
    if (level >= 0.5) return <Volume1 className={`w-5 h-5 ${getVolumeColor()}`} />;
    if (level >= 0.2) return <Volume className={`w-5 h-5 ${getVolumeColor()}`} />;
    return <VolumeX className={`w-5 h-5 ${getVolumeColor()}`} />;
  };

  const volumePercentage = Math.round(level * 100);

  return (
    <div className="flex items-center space-x-1" title={`Audio Level: ${volumePercentage}%`}>
      {getVolumeIcon()}
      <span className={`text-xs ${getVolumeColor()}`}>{volumePercentage}%</span>
    </div>
  );
} 
