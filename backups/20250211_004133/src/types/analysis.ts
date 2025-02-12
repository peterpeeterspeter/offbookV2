export interface DeepSeekR1Analysis {
  primary_emotion: string;
  intensity: number;
  confidence: number;
  secondary_emotions: Array<{
    emotion: string;
    intensity: number;
  }>;
  explanation: string;
}

export interface DeepSeekR1Response {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      content: DeepSeekR1Analysis;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmotionSceneAnalysis {
  primaryEmotion: string;
  intensity: number;
  confidence: number;
  secondaryEmotions: Array<{
    emotion: string;
    intensity: number;
  }>;
  description: string;
  sceneId?: string;
  metrics: EmotionSceneMetrics;
}

export interface EmotionSceneMetrics {
  totalScenes: number;
  averageIntensity: number;
  dominantEmotions: string[];
  confidenceStats: {
    min: number;
    max: number;
    average: number;
  };
  pacing: {
    averageLineLength: number;
    dialogueCount: number;
    actionCount: number;
    emotionalShifts: number;
  };
}
