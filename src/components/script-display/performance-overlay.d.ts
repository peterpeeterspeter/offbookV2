import { Emotion } from "../../types";
interface PerformanceMetrics {
    emotionMatch: number;
    intensityMatch: number;
    timingAccuracy: number;
    overallScore: number;
}
interface PerformanceOverlayProps {
    isVisible: boolean;
    currentEmotion: Emotion;
    targetEmotion: Emotion;
    currentIntensity: number;
    targetIntensity: number;
    metrics: PerformanceMetrics;
    remainingTime?: number;
    className?: string;
}
export declare function PerformanceOverlay({ isVisible, currentEmotion, targetEmotion, currentIntensity, targetIntensity, metrics, remainingTime, className, }: PerformanceOverlayProps): import("react/jsx-runtime").JSX.Element | null;
export {};
