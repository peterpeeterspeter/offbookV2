import React from 'react';
import { Emotion } from '../../types';
interface ScriptLineProps {
    text: string;
    emotion?: Emotion;
    intensity?: number;
    isActive?: boolean;
    isCurrent?: boolean;
    isCompleted?: boolean;
    timing?: {
        duration: number;
        startTime?: number;
        endTime?: number;
    };
    onLineClick?: () => void;
}
export declare function ScriptLine({ text, emotion, intensity, isActive, isCurrent, isCompleted, timing, onLineClick }: ScriptLineProps): React.JSX.Element;
export {};
