from typing import List, Dict, Optional
from datetime import datetime

from .performance_monitor import performance_monitor

class FeedbackGenerator:
    def __init__(self):
        """Initialize the feedback generator."""
        # Thresholds for different aspects of performance
        self.thresholds = {
            "accuracy": {
                "excellent": 0.95,
                "good": 0.85,
                "fair": 0.70
            },
            "speaking_rate": {
                "too_slow": 100,  # words per minute
                "too_fast": 200,
                "ideal_min": 130,
                "ideal_max": 170
            },
            "pause_ratio": {
                "too_low": 0.1,
                "too_high": 0.3,
                "ideal": 0.2
            }
        }
    
    def generate_feedback(
        self,
        performance_data: Dict,
        historical_data: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Generate detailed feedback based on performance data and optional historical context.
        """
        start_time = datetime.now()
        
        try:
            feedback = {
                "summary": self._generate_summary(performance_data),
                "detailed_feedback": [],
                "improvements": [],
                "strengths": [],
                "progress": None
            }
            
            # Add detailed feedback for different aspects
            feedback["detailed_feedback"].extend(
                self._analyze_accuracy(performance_data)
            )
            
            if "timing" in performance_data:
                feedback["detailed_feedback"].extend(
                    self._analyze_timing(performance_data["timing"])
                )
            
            # Identify key strengths and areas for improvement
            self._identify_strengths_and_improvements(
                performance_data,
                feedback["strengths"],
                feedback["improvements"]
            )
            
            # Add progress analysis if historical data is available
            if historical_data:
                feedback["progress"] = self._analyze_progress(
                    performance_data,
                    historical_data
                )
            
            # Track performance
            duration = (datetime.now() - start_time).total_seconds()
            performance_monitor.track_latency("feedback_generation", duration)
            
            return feedback
            
        except Exception as e:
            performance_monitor.track_error("feedback_generation")
            raise Exception(f"Feedback generation failed: {str(e)}")
    
    def _generate_summary(self, performance_data: Dict) -> str:
        """Generate a brief summary of the performance."""
        accuracy = performance_data["accuracy"]
        
        if accuracy >= self.thresholds["accuracy"]["excellent"]:
            base_summary = "Excellent performance!"
        elif accuracy >= self.thresholds["accuracy"]["good"]:
            base_summary = "Good performance with minor areas for improvement."
        elif accuracy >= self.thresholds["accuracy"]["fair"]:
            base_summary = "Fair performance with several areas for improvement."
        else:
            base_summary = "Performance needs significant improvement."
        
        if "timing" in performance_data:
            timing = performance_data["timing"]
            if timing["fluency_score"] > 0.8:
                base_summary += " Your delivery was very fluent."
            elif timing["fluency_score"] > 0.6:
                base_summary += " Your delivery was generally smooth."
            else:
                base_summary += " Focus on improving your delivery fluency."
        
        return base_summary
    
    def _analyze_accuracy(self, performance_data: Dict) -> List[str]:
        """Analyze accuracy and generate specific feedback."""
        feedback = []
        
        # Word accuracy feedback
        accuracy = performance_data["accuracy"]
        word_count = performance_data["word_count"]
        
        if accuracy < self.thresholds["accuracy"]["fair"]:
            feedback.append(
                f"Work on accuracy: {word_count['correct']} correct words out of {word_count['expected']} expected."
            )
        
        # Analyze specific mistakes
        differences = performance_data["differences"]
        if differences["deletions"]:
            feedback.append(
                f"You missed {len(differences['deletions'])} words: {', '.join(differences['deletions'][:3])}..."
                if len(differences['deletions']) > 3 else
                f"You missed these words: {', '.join(differences['deletions'])}"
            )
        
        if differences["additions"]:
            feedback.append(
                f"You added {len(differences['additions'])} extra words: {', '.join(differences['additions'][:3])}..."
                if len(differences['additions']) > 3 else
                f"You added these extra words: {', '.join(differences['additions'])}"
            )
        
        return feedback
    
    def _analyze_timing(self, timing_data: Dict) -> List[str]:
        """Analyze timing and generate specific feedback."""
        feedback = []
        
        # Speaking rate feedback
        rate = timing_data["speaking_rate"]
        if rate < self.thresholds["speaking_rate"]["too_slow"]:
            feedback.append(
                f"Your speaking rate ({rate:.0f} words/min) is too slow. "
                f"Aim for {self.thresholds['speaking_rate']['ideal_min']}-"
                f"{self.thresholds['speaking_rate']['ideal_max']} words/min."
            )
        elif rate > self.thresholds["speaking_rate"]["too_fast"]:
            feedback.append(
                f"Your speaking rate ({rate:.0f} words/min) is too fast. "
                f"Try to slow down to {self.thresholds['speaking_rate']['ideal_min']}-"
                f"{self.thresholds['speaking_rate']['ideal_max']} words/min."
            )
        
        # Pause analysis
        total_duration = timing_data["total_duration"]
        pause_ratio = timing_data["pause_duration"] / total_duration if total_duration > 0 else 0
        
        if pause_ratio < self.thresholds["pause_ratio"]["too_low"]:
            feedback.append(
                "Try to include more natural pauses in your delivery."
            )
        elif pause_ratio > self.thresholds["pause_ratio"]["too_high"]:
            feedback.append(
                "You're pausing too frequently. Work on maintaining a smoother flow."
            )
        
        return feedback
    
    def _identify_strengths_and_improvements(
        self,
        performance_data: Dict,
        strengths: List[str],
        improvements: List[str]
    ):
        """Identify key strengths and areas for improvement."""
        accuracy = performance_data["accuracy"]
        
        # Accuracy-based feedback
        if accuracy >= self.thresholds["accuracy"]["excellent"]:
            strengths.append("Excellent word accuracy")
        elif accuracy < self.thresholds["accuracy"]["fair"]:
            improvements.append("Work on memorizing the script more accurately")
        
        # Timing-based feedback (if available)
        if "timing" in performance_data:
            timing = performance_data["timing"]
            rate = timing["speaking_rate"]
            
            if (self.thresholds["speaking_rate"]["ideal_min"] <= rate <=
                self.thresholds["speaking_rate"]["ideal_max"]):
                strengths.append("Good speaking pace")
            
            if timing["fluency_score"] >= 0.8:
                strengths.append("Excellent delivery fluency")
            elif timing["fluency_score"] < 0.6:
                improvements.append("Practice for smoother delivery")
    
    def _analyze_progress(
        self,
        current_performance: Dict,
        historical_data: List[Dict]
    ) -> Dict:
        """Analyze progress compared to historical performances."""
        # Calculate average historical metrics
        historical_accuracy = sum(p["accuracy"] for p in historical_data) / len(historical_data)
        
        # Compare current performance
        accuracy_change = current_performance["accuracy"] - historical_accuracy
        
        # Analyze timing progress if available
        timing_progress = None
        if "timing" in current_performance and all("timing" in p for p in historical_data):
            historical_fluency = sum(
                p["timing"]["fluency_score"] for p in historical_data
            ) / len(historical_data)
            fluency_change = (
                current_performance["timing"]["fluency_score"] - historical_fluency
            )
            timing_progress = {
                "fluency_change": fluency_change,
                "is_improving": fluency_change > 0
            }
        
        return {
            "accuracy_change": accuracy_change,
            "is_improving": accuracy_change > 0,
            "timing_progress": timing_progress
        }

# Global instance
feedback_generator = FeedbackGenerator() 