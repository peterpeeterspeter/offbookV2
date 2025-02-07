from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum
import statistics
from datetime import datetime, timedelta

class EmotionType(Enum):
    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    FEARFUL = "fearful"
    SURPRISED = "surprised"

@dataclass
class EmotionTiming:
    """Timing parameters for different emotions."""
    base_pause: float
    pause_multiplier: float
    min_pause: float
    max_pause: float
    performance_threshold: float

EMOTION_TIMING_DEFAULTS = {
    EmotionType.NEUTRAL: EmotionTiming(0.5, 1.0, 0.3, 1.0, 0.8),
    EmotionType.HAPPY: EmotionTiming(0.4, 0.9, 0.2, 0.8, 0.85),
    EmotionType.SAD: EmotionTiming(0.7, 1.2, 0.5, 1.5, 0.75),
    EmotionType.ANGRY: EmotionTiming(0.3, 0.8, 0.2, 0.6, 0.9),
    EmotionType.FEARFUL: EmotionTiming(0.6, 1.1, 0.4, 1.2, 0.8),
    EmotionType.SURPRISED: EmotionTiming(0.35, 0.85, 0.2, 0.7, 0.85)
}

@dataclass
class CadenceMetrics:
    """Metrics related to speech cadence."""
    word_count: int
    duration: float
    words_per_minute: float
    avg_word_duration: float
    pause_pattern: List[float] = field(default_factory=list)
    emotion: EmotionType = EmotionType.NEUTRAL

@dataclass
class TimingMetrics:
    """Metrics for timing performance."""
    expected_duration: float
    actual_duration: float
    deviation: float
    performance_score: float
    emotion: EmotionType

class TimingAdjustmentReason(Enum):
    TOO_FAST = "too_fast"
    TOO_SLOW = "too_slow"
    INCONSISTENT_PACE = "inconsistent_pace"
    EMOTION_MISMATCH = "emotion_mismatch"
    NATURAL_PAUSE_NEEDED = "natural_pause_needed"

@dataclass
class TimingAdjustment:
    """Suggested timing adjustment based on performance."""
    reason: TimingAdjustmentReason
    adjustment_factor: float
    suggested_pause: float
    emotion_context: EmotionType
    confidence: float

class TimingService:
    """Service for analyzing and adjusting speech timing."""
    
    def __init__(self):
        self.emotion_timing = EMOTION_TIMING_DEFAULTS.copy()
        self.recent_interactions: List[TimingMetrics] = []
        self.interaction_window = timedelta(minutes=5)
        self.max_recent_interactions = 50
    
    def analyze_cadence(
        self,
        text: str,
        duration: float,
        pauses: List[float],
        emotion: EmotionType = EmotionType.NEUTRAL
    ) -> CadenceMetrics:
        """Analyze speech cadence from timing data."""
        words = text.split()
        word_count = len(words)
        words_per_minute = (word_count / duration) * 60
        avg_word_duration = duration / word_count if word_count > 0 else 0
        
        return CadenceMetrics(
            word_count=word_count,
            duration=duration,
            words_per_minute=words_per_minute,
            avg_word_duration=avg_word_duration,
            pause_pattern=pauses,
            emotion=emotion
        )
    
    def record_interaction(
        self,
        expected_duration: float,
        actual_duration: float,
        emotion: EmotionType
    ) -> TimingMetrics:
        """Record a timing interaction for analysis."""
        deviation = actual_duration - expected_duration
        timing = self.emotion_timing[emotion]
        performance_score = max(0, 1 - (abs(deviation) / expected_duration))
        
        metrics = TimingMetrics(
            expected_duration=expected_duration,
            actual_duration=actual_duration,
            deviation=deviation,
            performance_score=performance_score,
            emotion=emotion
        )
        
        # Update recent interactions
        current_time = datetime.now()
        cutoff_time = current_time - self.interaction_window
        
        self.recent_interactions = [
            m for m in self.recent_interactions[-self.max_recent_interactions:]
            if m.performance_score >= timing.performance_threshold
        ]
        
        self.recent_interactions.append(metrics)
        return metrics
    
    def get_timing_adjustment(
        self,
        current_metrics: TimingMetrics,
        cadence: CadenceMetrics
    ) -> TimingAdjustment:
        """Calculate timing adjustment based on performance."""
        emotion = current_metrics.emotion
        timing = self.emotion_timing[emotion]
        
        # Calculate baseline adjustment
        deviation_ratio = current_metrics.deviation / current_metrics.expected_duration
        adjustment_factor = 1.0
        
        if abs(deviation_ratio) > 0.1:
            # Significant deviation detected
            adjustment_factor = 1.0 / (1.0 + deviation_ratio)
            reason = (
                TimingAdjustmentReason.TOO_FAST
                if deviation_ratio < 0
                else TimingAdjustmentReason.TOO_SLOW
            )
        else:
            # Check for inconsistent pacing
            if cadence.pause_pattern:
                pause_variance = statistics.variance(cadence.pause_pattern)
                if pause_variance > timing.base_pause * 0.5:
                    reason = TimingAdjustmentReason.INCONSISTENT_PACE
                    adjustment_factor = 0.9
                else:
                    reason = TimingAdjustmentReason.NATURAL_PAUSE_NEEDED
                    adjustment_factor = 1.0
            else:
                reason = TimingAdjustmentReason.EMOTION_MISMATCH
                adjustment_factor = timing.pause_multiplier
        
        # Calculate suggested pause
        base_pause = timing.base_pause * adjustment_factor
        suggested_pause = max(
            timing.min_pause,
            min(timing.max_pause, base_pause)
        )
        
        # Calculate confidence based on recent performance
        recent_scores = [m.performance_score for m in self.recent_interactions[-5:]]
        confidence = statistics.mean(recent_scores) if recent_scores else 0.5
        
        return TimingAdjustment(
            reason=reason,
            adjustment_factor=adjustment_factor,
            suggested_pause=suggested_pause,
            emotion_context=emotion,
            confidence=confidence
        )
    
    def update_emotion_timing(
        self,
        emotion: EmotionType,
        timing: EmotionTiming
    ) -> None:
        """Update timing parameters for an emotion."""
        self.emotion_timing[emotion] = timing
    
    def get_performance_stats(
        self,
        emotion: Optional[EmotionType] = None
    ) -> Dict:
        """Get performance statistics for recent interactions."""
        interactions = (
            [m for m in self.recent_interactions if m.emotion == emotion]
            if emotion
            else self.recent_interactions
        )
        
        if not interactions:
            return {}
        
        scores = [m.performance_score for m in interactions]
        deviations = [abs(m.deviation) for m in interactions]
        
        return {
            "avg_score": statistics.mean(scores),
            "max_score": max(scores),
            "min_score": min(scores),
            "avg_deviation": statistics.mean(deviations),
            "interaction_count": len(interactions)
        }
    
    def reset_stats(self) -> None:
        """Reset performance statistics."""
        self.recent_interactions.clear()

# Export singleton instance
timing_service = TimingService() 