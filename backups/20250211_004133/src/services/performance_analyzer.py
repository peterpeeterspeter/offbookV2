from typing import List, Dict, Optional
import difflib
import json
from datetime import datetime

from .performance_monitor import performance_monitor

class PerformanceAnalyzer:
    def __init__(self):
        """Initialize the performance analyzer."""
        self.similarity_threshold = 0.8  # Minimum similarity score to consider text matching
    
    def analyze_performance(
        self,
        expected_text: str,
        actual_text: str,
        timing_data: Optional[Dict] = None
    ) -> Dict:
        """
        Analyze the performance by comparing expected and actual text.
        Optionally includes timing analysis if timing_data is provided.
        """
        start_time = datetime.now()
        
        try:
            # Normalize text for comparison
            expected = self._normalize_text(expected_text)
            actual = self._normalize_text(actual_text)
            
            # Calculate similarity metrics
            similarity = difflib.SequenceMatcher(None, expected, actual).ratio()
            
            # Find differences
            differences = list(difflib.ndiff(expected.split(), actual.split()))
            
            # Extract additions and deletions
            additions = [word[2:] for word in differences if word.startswith('+ ')]
            deletions = [word[2:] for word in differences if word.startswith('- ')]
            
            # Calculate word-level accuracy
            expected_words = expected.split()
            actual_words = actual.split()
            correct_words = len(expected_words) - len(deletions)
            accuracy = correct_words / len(expected_words) if expected_words else 1.0
            
            # Prepare analysis results
            analysis = {
                "accuracy": accuracy,
                "similarity": similarity,
                "word_count": {
                    "expected": len(expected_words),
                    "actual": len(actual_words),
                    "correct": correct_words
                },
                "differences": {
                    "additions": additions,
                    "deletions": deletions
                },
                "is_successful": similarity >= self.similarity_threshold
            }
            
            # Add timing analysis if provided
            if timing_data:
                analysis["timing"] = self._analyze_timing(timing_data)
            
            # Track performance
            duration = (datetime.now() - start_time).total_seconds()
            performance_monitor.track_latency("performance_analysis", duration)
            
            return analysis
            
        except Exception as e:
            performance_monitor.track_error("performance_analysis")
            raise Exception(f"Performance analysis failed: {str(e)}")
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        # Convert to lowercase
        text = text.lower()
        
        # Remove punctuation and extra whitespace
        text = ''.join(c for c in text if c.isalnum() or c.isspace())
        
        # Normalize whitespace
        return ' '.join(text.split())
    
    def _analyze_timing(self, timing_data: Dict) -> Dict:
        """
        Analyze timing data for the performance.
        Expected timing_data format:
        {
            "start_time": float,  # timestamp in seconds
            "end_time": float,
            "pauses": [{"start": float, "end": float}, ...],
            "word_timings": [{"word": str, "start": float, "end": float}, ...]
        }
        """
        # Calculate total duration
        total_duration = timing_data["end_time"] - timing_data["start_time"]
        
        # Calculate total pause time
        pause_duration = sum(
            pause["end"] - pause["start"]
            for pause in timing_data.get("pauses", [])
        )
        
        # Calculate speaking time
        speaking_duration = total_duration - pause_duration
        
        # Calculate speaking rate (words per minute)
        word_count = len(timing_data.get("word_timings", []))
        speaking_rate = (word_count / speaking_duration * 60) if speaking_duration > 0 else 0
        
        # Analyze word timing consistency
        word_durations = [
            timing["end"] - timing["start"]
            for timing in timing_data.get("word_timings", [])
        ]
        
        return {
            "total_duration": total_duration,
            "speaking_duration": speaking_duration,
            "pause_duration": pause_duration,
            "speaking_rate": speaking_rate,
            "word_timing": {
                "min": min(word_durations) if word_durations else 0,
                "max": max(word_durations) if word_durations else 0,
                "average": sum(word_durations) / len(word_durations) if word_durations else 0
            },
            "pause_count": len(timing_data.get("pauses", [])),
            "fluency_score": self._calculate_fluency_score(
                speaking_rate,
                pause_duration / total_duration if total_duration > 0 else 0,
                len(timing_data.get("pauses", [])),
                word_count
            )
        }
    
    def _calculate_fluency_score(
        self,
        speaking_rate: float,
        pause_ratio: float,
        pause_count: int,
        word_count: int
    ) -> float:
        """
        Calculate a fluency score based on speaking metrics.
        Returns a score between 0 and 1.
        """
        # Ideal ranges
        IDEAL_SPEAKING_RATE = 150  # words per minute
        IDEAL_PAUSE_RATIO = 0.2    # 20% of total time
        IDEAL_PAUSE_FREQUENCY = 0.1  # pauses per word
        
        # Calculate component scores
        rate_score = 1.0 - min(abs(speaking_rate - IDEAL_SPEAKING_RATE) / IDEAL_SPEAKING_RATE, 1.0)
        pause_ratio_score = 1.0 - min(abs(pause_ratio - IDEAL_PAUSE_RATIO) / IDEAL_PAUSE_RATIO, 1.0)
        pause_frequency_score = 1.0 - min(
            abs((pause_count / word_count if word_count > 0 else 0) - IDEAL_PAUSE_FREQUENCY) / IDEAL_PAUSE_FREQUENCY,
            1.0
        )
        
        # Weighted average of scores
        weights = {
            "rate": 0.4,
            "pause_ratio": 0.3,
            "pause_frequency": 0.3
        }
        
        return (
            rate_score * weights["rate"] +
            pause_ratio_score * weights["pause_ratio"] +
            pause_frequency_score * weights["pause_frequency"]
        )

# Global instance
performance_analyzer = PerformanceAnalyzer() 