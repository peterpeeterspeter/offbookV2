export interface PracticeMetrics {
  emotionMatch: number;
  intensityMatch: number;
  timingAccuracy: number;
  overallScore: number;
  timing: {
    averageDelay: number;
    maxDelay: number;
    minDelay: number;
    responseDelays: number[];
  };
  accuracy: {
    correctLines: number;
    totalLines: number;
    accuracy: number;
  };
  emotions: {
    matchedEmotions: number;
    totalEmotionalCues: number;
    emotionAccuracy: number;
  };
}
