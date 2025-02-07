import { Emotion } from '../types'

interface CadenceMetrics {
  wordCount: number
  duration: number
  wordsPerMinute: number
  averagePauseDuration: number
  pauseFrequency: number
}

interface PausePattern {
  beforeEmotion: Emotion
  afterEmotion: Emotion
  averageDuration: number
  frequency: number
}

interface CadenceAnalysis {
  score: number;
  duration: number;
  needsAdjustment: boolean;
}

interface AnalyzeOptions {
  duration: number;
  pauses: number[];
}

export interface CadenceAnalysis {
  metrics: CadenceMetrics
  patterns: PausePattern[]
  suggestedPauses: Map<Emotion, number>
  confidence: number
}

export class SpeechCadenceAnalyzer {
  private static readonly MIN_PAUSE_DURATION = 300 // ms
  private static readonly MAX_PAUSE_DURATION = 3000 // ms
  private static readonly TARGET_WPM = 150 // words per minute
  private static readonly EMOTION_PAUSE_MULTIPLIERS = {
    joy: 0.8,      // Faster, more energetic
    sadness: 1.4,  // Slower, more contemplative
    anger: 0.9,    // Quick, but with emphasis
    fear: 1.2,     // Slightly slower, tense
    surprise: 0.7, // Quick reactions
    disgust: 1.1,  // Slightly slower
    neutral: 1.0   // Baseline
  }

  private patterns: Map<string, PausePattern[]> = new Map()
  private recentCadences: CadenceMetrics[] = []

  /**
   * Analyze speech cadence from a recorded segment
   */
  public analyzeCadence(
    text: string,
    duration: number,
    pauses: number[],
    currentEmotion: Emotion,
    nextEmotion: Emotion
  ): CadenceAnalysis {
    // Calculate basic metrics
    const wordCount = text.split(/\s+/).length
    const wordsPerMinute = (wordCount / duration) * 60000 // Convert to words per minute
    const pauseFrequency = pauses.length / wordCount
    const averagePauseDuration = pauses.reduce((a, b) => a + b, 0) / pauses.length || 0

    const metrics: CadenceMetrics = {
      wordCount,
      duration,
      wordsPerMinute,
      averagePauseDuration,
      pauseFrequency
    }

    // Update patterns
    this.updatePausePatterns(currentEmotion, nextEmotion, averagePauseDuration)

    // Keep track of recent cadences
    this.recentCadences.push(metrics)
    if (this.recentCadences.length > 10) {
      this.recentCadences.shift()
    }

    // Calculate suggested pauses
    const suggestedPauses = this.calculateSuggestedPauses(metrics, currentEmotion)

    // Calculate confidence based on consistency
    const confidence = this.calculateConfidence(metrics)

    return {
      metrics,
      patterns: this.getPausePatterns(currentEmotion),
      suggestedPauses,
      confidence
    }
  }

  /**
   * Update pause patterns between emotions
   */
  private updatePausePatterns(
    beforeEmotion: Emotion,
    afterEmotion: Emotion,
    pauseDuration: number
  ): void {
    const key = `${beforeEmotion}-${afterEmotion}`
    const patterns = this.patterns.get(key) || []

    patterns.push({
      beforeEmotion,
      afterEmotion,
      averageDuration: pauseDuration,
      frequency: 1
    })

    // Keep only recent patterns
    if (patterns.length > 5) {
      patterns.shift()
    }

    this.patterns.set(key, patterns)
  }

  /**
   * Get pause patterns for a specific emotion
   */
  private getPausePatterns(emotion: Emotion): PausePattern[] {
    const relevantPatterns: PausePattern[] = []
    
    this.patterns.forEach((patterns, key) => {
      if (key.startsWith(`${emotion}-`) || key.endsWith(`-${emotion}`)) {
        relevantPatterns.push(...patterns)
      }
    })

    return relevantPatterns
  }

  /**
   * Calculate suggested pauses based on metrics and emotion
   */
  private calculateSuggestedPauses(metrics: CadenceMetrics, emotion: Emotion): Map<Emotion, number> {
    const suggestedPauses = new Map<Emotion, number>()
    const baselinePause = this.calculateBaselinePause(metrics)

    // Calculate pause for each emotion transition
    Object.keys(SpeechCadenceAnalyzer.EMOTION_PAUSE_MULTIPLIERS).forEach(targetEmotion => {
      const multiplier = SpeechCadenceAnalyzer.EMOTION_PAUSE_MULTIPLIERS[targetEmotion as Emotion]
      const emotionAdjustedPause = baselinePause * multiplier

      // Adjust based on speaking rate
      const rateAdjustment = SpeechCadenceAnalyzer.TARGET_WPM / metrics.wordsPerMinute
      const finalPause = Math.min(
        Math.max(
          emotionAdjustedPause * rateAdjustment,
          SpeechCadenceAnalyzer.MIN_PAUSE_DURATION
        ),
        SpeechCadenceAnalyzer.MAX_PAUSE_DURATION
      )

      suggestedPauses.set(targetEmotion as Emotion, finalPause)
    })

    return suggestedPauses
  }

  /**
   * Calculate baseline pause duration
   */
  private calculateBaselinePause(metrics: CadenceMetrics): number {
    const targetWordsPerPause = 8 // Adjust based on natural speech patterns
    return (60000 / metrics.wordsPerMinute) * targetWordsPerPause
  }

  /**
   * Calculate confidence in suggestions based on consistency
   */
  private calculateConfidence(currentMetrics: CadenceMetrics): number {
    if (this.recentCadences.length < 2) {
      return 0.5 // Not enough data for high confidence
    }

    // Calculate variance in speaking rate
    const rates = this.recentCadences.map(m => m.wordsPerMinute)
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
    const variance = rates.reduce((a, b) => a + Math.pow(b - avgRate, 2), 0) / rates.length

    // Higher variance = lower confidence
    const consistencyScore = Math.max(0, 1 - (variance / (avgRate * 0.5)))
    
    // Weight by amount of data
    const dataWeight = Math.min(this.recentCadences.length / 5, 1)
    
    return consistencyScore * dataWeight
  }
}

export const speechCadenceAnalyzer = new SpeechCadenceAnalyzer()

export const speechCadence = {
  analyze(options: AnalyzeOptions): CadenceAnalysis {
    const { duration, pauses } = options;
    
    // Calculate average pause duration
    const avgPause = pauses.length > 0 
      ? pauses.reduce((a, b) => a + b, 0) / pauses.length 
      : 0;
    
    // Score based on pause frequency and duration
    const score = Math.max(0, 100 - (
      (pauses.length * 5) + // Deduct for number of pauses
      (avgPause > 1000 ? 10 : 0) // Deduct for long pauses
    ));
    
    return {
      score,
      duration,
      needsAdjustment: score < 70
    };
  }
}; 