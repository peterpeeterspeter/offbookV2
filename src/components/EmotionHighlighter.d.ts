interface EmotionHighlighterProps {
    content: string;
    onSelect?: (text: string, emotion?: string, intensity?: number) => void;
    onUpdate?: (content: string) => void;
    readOnly?: boolean;
}
declare const EMOTIONS: readonly ["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral"];
export type Emotion = (typeof EMOTIONS)[number];
export declare function EmotionHighlighter({ content, onSelect, onUpdate, readOnly, }: EmotionHighlighterProps): import("react/jsx-runtime").JSX.Element;
export {};
