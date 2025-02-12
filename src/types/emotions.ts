export const EmotionValues = ['joy', 'surprise', 'anger', 'fear', 'sadness', 'disgust', 'neutral'] as const;
export type Emotion = typeof EmotionValues[number];

export interface EmotionIntensity {
  emotion: Emotion;
  intensity: number;
}

export interface EmotionTransition {
  from: Emotion;
  to: Emotion;
  duration: number;
}

export interface EmotionMetrics {
  emotionMatch: number;
  intensityMatch: number;
  timingAccuracy: number;
  overallScore: number;
}

export interface EmotionStyle {
  intensity: number;
  duration: number;
  transition: 'smooth' | 'abrupt';
  confidence?: number;
  modulation?: {
    pitch?: number;
    speed?: number;
    volume?: number;
  };
}
