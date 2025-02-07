import { Emotion } from '../types'
import { speechCadenceAnalyzer, CadenceAnalysis } from './speechCadence'

export type { CadenceAnalysis }

export interface TimingMetrics {
  lastInteractionTime: number
  averageDelay: number
  hesitationCount: number
  totalInteractions: number
  emotionTimings: Map<Emotion, number[]>
  lastCadenceAnalysis?: CadenceAnalysis
}

export interface TimingAdjustment {
  suggestedDelay: number
  confidence: number
  reason: 'hesitation' | 'emotion' | 'pattern' | 'cadence' | 'default'
  cadenceMetrics?: {
    wordsPerMinute: number
    pauseFrequency: number
    suggestedPauses: Map<Emotion, number>
  }
}

export class TimingService {
  private static readonly HESITATION_THRESHOLD = 2000 // ms
  private static readonly MIN_INTERACTIONS = 3
  private static readonly DEFAULT_DELAY = 1000 // ms
  private static readonly MAX_HISTORY = 50
  private static readonly CADENCE_WEIGHT = 0.7 // Weight given to cadence analysis vs timing history

  private metrics: TimingMetrics = {
    lastInteractionTime: 0,
    averageDelay: TimingService.DEFAULT_DELAY,
    hesitationCount: 0,
    totalInteractions: 0,
    emotionTimings: new Map()
  }

  private recordedPauses: number[] = []
  private lastSpeechSegment?: {
    text: string
    startTime: number
    emotion: Emotion
  }

  /**
   * Record a new interaction with its timing and emotion
   */
  public recordInteraction(timestamp: number, emotion?: Emotion, text?: string): void {
    const currentDelay = this.metrics.lastInteractionTime > 0 
      ? timestamp - this.metrics.lastInteractionTime 
      : TimingService.DEFAULT_DELAY

    // Update general metrics
    this.metrics.totalInteractions++
    this.metrics.averageDelay = this.calculateNewAverage(
      this.metrics.averageDelay,
      currentDelay,
      this.metrics.totalInteractions
    )

    // Record pause for cadence analysis
    if (currentDelay > 300) { // Minimum pause threshold
      this.recordedPauses.push(currentDelay)
    }

    // Check for hesitation
    if (currentDelay > TimingService.HESITATION_THRESHOLD) {
      this.metrics.hesitationCount++
    }

    // Update emotion-specific timing if provided
    if (emotion) {
      const timings = this.metrics.emotionTimings.get(emotion) || []
      timings.push(currentDelay)
      
      // Keep only recent history
      if (timings.length > TimingService.MAX_HISTORY) {
        timings.shift()
      }
      
      this.metrics.emotionTimings.set(emotion, timings)
    }

    // Update speech segment and analyze cadence if text is provided
    if (text && emotion) {
      if (this.lastSpeechSegment) {
        const duration = timestamp - this.lastSpeechSegment.startTime
        const cadenceAnalysis = speechCadenceAnalyzer.analyzeCadence(
          this.lastSpeechSegment.text,
          duration,
          this.recordedPauses,
          this.lastSpeechSegment.emotion,
          emotion
        )
        this.metrics.lastCadenceAnalysis = cadenceAnalysis
        this.recordedPauses = [] // Reset for next segment
      }
      
      this.lastSpeechSegment = {
        text,
        startTime: timestamp,
        emotion
      }
    }

    this.metrics.lastInteractionTime = timestamp
  }

  /**
   * Get timing adjustment suggestion based on recent interactions and cadence
   */
  public getTimingAdjustment(emotion?: Emotion): TimingAdjustment {
    // Not enough data for accurate suggestions
    if (this.metrics.totalInteractions < TimingService.MIN_INTERACTIONS) {
      return {
        suggestedDelay: TimingService.DEFAULT_DELAY,
        confidence: 0.5,
        reason: 'default'
      }
    }

    // Check for recent hesitation pattern
    const hesitationRate = this.metrics.hesitationCount / this.metrics.totalInteractions
    if (hesitationRate > 0.3) {
      return {
        suggestedDelay: Math.min(this.metrics.averageDelay * 1.5, 3000),
        confidence: 0.8,
        reason: 'hesitation'
      }
    }

    // Use cadence-based timing if available
    if (this.metrics.lastCadenceAnalysis && emotion) {
      const cadenceSuggestion = this.metrics.lastCadenceAnalysis.suggestedPauses.get(emotion)
      if (cadenceSuggestion) {
        const emotionTimings = this.metrics.emotionTimings.get(emotion)
        let historicalAverage = TimingService.DEFAULT_DELAY
        
        if (emotionTimings && emotionTimings.length > 0) {
          historicalAverage = emotionTimings.reduce((a, b) => a + b, 0) / emotionTimings.length
        }

        // Blend cadence-based and historical timing
        const blendedDelay = (cadenceSuggestion * TimingService.CADENCE_WEIGHT) +
          (historicalAverage * (1 - TimingService.CADENCE_WEIGHT))

        return {
          suggestedDelay: blendedDelay,
          confidence: this.metrics.lastCadenceAnalysis.confidence,
          reason: 'cadence',
          cadenceMetrics: {
            wordsPerMinute: this.metrics.lastCadenceAnalysis.metrics.wordsPerMinute,
            pauseFrequency: this.metrics.lastCadenceAnalysis.metrics.pauseFrequency,
            suggestedPauses: this.metrics.lastCadenceAnalysis.suggestedPauses
          }
        }
      }
    }

    // Use emotion-specific timing if available
    if (emotion && this.metrics.emotionTimings.has(emotion)) {
      const emotionTimings = this.metrics.emotionTimings.get(emotion)!
      const averageEmotionTiming = emotionTimings.reduce((a, b) => a + b, 0) / emotionTimings.length
      
      return {
        suggestedDelay: averageEmotionTiming,
        confidence: 0.9,
        reason: 'emotion'
      }
    }

    // Use pattern-based suggestion
    return {
      suggestedDelay: this.metrics.averageDelay,
      confidence: 0.7,
      reason: 'pattern'
    }
  }

  /**
   * Reset timing metrics
   */
  public reset(): void {
    this.metrics = {
      lastInteractionTime: 0,
      averageDelay: TimingService.DEFAULT_DELAY,
      hesitationCount: 0,
      totalInteractions: 0,
      emotionTimings: new Map()
    }
    this.recordedPauses = []
    this.lastSpeechSegment = undefined
  }

  /**
   * Get current timing metrics
   */
  public getMetrics(): TimingMetrics {
    return { ...this.metrics }
  }

  /**
   * Calculate new moving average
   */
  private calculateNewAverage(oldAverage: number, newValue: number, count: number): number {
    return oldAverage + (newValue - oldAverage) / count
  }
}

// Export singleton instance
export const timingService = new TimingService() 