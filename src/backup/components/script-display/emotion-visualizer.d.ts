import { Emotion } from '../../types';
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
export declare function EmotionVisualizer({ data, width, height, className, onHover }: EmotionVisualizerProps): import("react/jsx-runtime").JSX.Element;
export {};
