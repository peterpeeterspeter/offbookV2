type Emotion = "joy" | "sadness" | "anger" | "fear" | "surprise" | "disgust" | "neutral";
interface ScriptLineProps {
    text: string;
    emotion?: Emotion;
    intensity?: number;
    isActive?: boolean;
    isCurrent?: boolean;
    isCompleted?: boolean;
    timing?: {
        duration: number;
        startTime?: string;
    };
    onLineClick?: () => void;
}
export declare function ScriptLine({ text, emotion, intensity, isActive, isCurrent, isCompleted, timing, onLineClick, }: ScriptLineProps): import("react/jsx-runtime").JSX.Element;
export {};
