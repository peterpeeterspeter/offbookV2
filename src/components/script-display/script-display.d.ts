import React from "react";
import { Emotion } from "../../types";
export interface ScriptLine {
    id: string;
    text: string;
    emotion: Emotion;
    intensity: number;
    duration: number;
    startTime?: number;
    endTime?: number;
}
interface ScriptDisplayProps {
    lines: ScriptLine[];
    currentLineId?: string;
    activeLineId?: string;
    completedLineIds?: string[];
    onLineSelect?: (lineId: string) => void;
    onLineComplete?: (lineId: string) => void;
    className?: string;
}
export declare function ScriptDisplay({ lines, currentLineId, activeLineId, completedLineIds, onLineSelect, onLineComplete, className, }: ScriptDisplayProps): React.JSX.Element;
export {};
