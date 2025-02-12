from typing import Dict, Any, Optional
from datetime import datetime, UTC
import numpy as np
from .whisper import WhisperService

class PerformanceAnalysisService:
    """Service for analyzing user performances."""
    
    def __init__(self):
        """Initialize the performance analysis service."""
        self.whisper_service = WhisperService()
        self.initialized = False
        
    async def initialize(self):
        """Initialize the service."""
        if not self.initialized:
            await self.whisper_service.initialize()
            self.initialized = True
            
    async def analyze_performance(
        self,
        audio_data: np.ndarray,
        script_text: str,
        sample_rate: int = 16000
    ) -> Dict[str, Any]:
        """Analyze a performance recording."""
        if not self.initialized:
            await self.initialize()
            
        try:
            # Get transcription from Whisper
            transcription = await self.whisper_service.transcribe_audio(
                audio_data,
                sample_rate
            )
            
            # Calculate accuracy metrics
            accuracy = self._calculate_accuracy(transcription.text, script_text)
            
            # Calculate performance metrics
            performance_metrics = self._calculate_performance_metrics(
                transcription,
                script_text
            )
            
            # Generate suggestions
            suggestions = self._generate_suggestions(
                accuracy,
                performance_metrics
            )
            
            return {
                "accuracy": accuracy,
                "performance_metrics": performance_metrics,
                "suggestions": suggestions,
                "timestamp": datetime.now(UTC).isoformat()
            }
            
        except Exception as e:
            print(f"Error analyzing performance: {str(e)}")
            return {
                "accuracy": {
                    "text": "",
                    "score": 0.0,
                    "errors": []
                },
                "performance_metrics": {
                    "overall_score": 0.0,
                    "timing_score": 0.0,
                    "pronunciation_score": 0.0,
                    "emotion_score": 0.0
                },
                "suggestions": [
                    "Error analyzing performance. Please try again."
                ],
                "timestamp": datetime.now(UTC).isoformat()
            }
            
    def _calculate_accuracy(
        self,
        transcribed_text: str,
        script_text: str
    ) -> Dict[str, Any]:
        """Calculate accuracy metrics between transcribed text and script."""
        # Simple word-based accuracy for now
        transcribed_words = transcribed_text.lower().split()
        script_words = script_text.lower().split()
        
        # Find matching words
        matches = sum(1 for t, s in zip(transcribed_words, script_words) if t == s)
        total = max(len(transcribed_words), len(script_words))
        
        # Calculate accuracy score
        score = matches / total if total > 0 else 0.0
        
        # Find errors (simple diff)
        errors = []
        for i, (t, s) in enumerate(zip(transcribed_words, script_words)):
            if t != s:
                errors.append({
                    "index": i,
                    "expected": s,
                    "actual": t
                })
                
        return {
            "text": transcribed_text,
            "score": score,
            "errors": errors
        }
        
    def _calculate_performance_metrics(
        self,
        transcription: Any,
        script_text: str
    ) -> Dict[str, float]:
        """Calculate various performance metrics."""
        # For now, use simple metrics
        timing_score = transcription.confidence
        pronunciation_score = transcription.confidence
        emotion_score = 0.7  # Placeholder until we add emotion detection
        
        # Overall score is weighted average
        overall_score = 0.4 * timing_score + 0.4 * pronunciation_score + 0.2 * emotion_score
        
        return {
            "overall_score": overall_score,
            "timing_score": timing_score,
            "pronunciation_score": pronunciation_score,
            "emotion_score": emotion_score
        }
        
    def _generate_suggestions(
        self,
        accuracy: Dict[str, Any],
        metrics: Dict[str, float]
    ) -> list[str]:
        """Generate improvement suggestions based on performance metrics."""
        suggestions = []
        
        # Accuracy-based suggestions
        if accuracy["score"] < 0.8:
            suggestions.append(
                "Work on memorizing your lines more accurately."
            )
            if accuracy["errors"]:
                suggestions.append(
                    "Pay special attention to commonly misread words."
                )
                
        # Timing-based suggestions
        if metrics["timing_score"] < 0.7:
            suggestions.append(
                "Practice your timing and pacing. Try to maintain a steady rhythm."
            )
            
        # Pronunciation-based suggestions
        if metrics["pronunciation_score"] < 0.7:
            suggestions.append(
                "Focus on clear pronunciation and enunciation."
            )
            
        # Emotion-based suggestions
        if metrics["emotion_score"] < 0.7:
            suggestions.append(
                "Try to convey more emotion in your delivery."
            )
            
        return suggestions or ["Good job! Keep practicing to maintain consistency."]

# Create singleton instance
performance_analysis = PerformanceAnalysisService() 