import time
import json
from typing import Dict, List, Optional
from datetime import datetime, UTC, timedelta
from pathlib import Path
from statistics import mean, median, stdev, quantiles
from collections import defaultdict
import threading

class PerformanceMonitor:
    """Monitors service performance, latency, and API costs."""
    
    def __init__(self, log_dir: Optional[Path] = None):
        """Initialize the performance monitor.
        
        Args:
            log_dir: Directory for storing performance logs
        """
        self.log_dir = log_dir or Path("logs/performance")
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        self._lock = threading.Lock()
        self._latencies = defaultdict(list)
        self._errors = defaultdict(int)
        self._last_reset = datetime.now()
        self._window_size = timedelta(minutes=5)  # Keep 5 minutes of data
        
        # Load existing data if available
        self._load_metrics()
        
    def track_latency(self, operation: str, duration: float) -> None:
        """Track operation latency.
        
        Args:
            operation: Name of the operation (e.g., "tts_generation", "emotion_analysis")
            duration: Duration in seconds
        """
        with self._lock:
            self._cleanup_old_data()
            self._latencies[operation].append({
                'timestamp': datetime.now(),
                'duration': duration
            })
            
        # Save metrics periodically
        if sum(len(samples) for samples in self._latencies.values()) % 100 == 0:
            self._save_metrics()
            
    def track_api_cost(self, service: str, cost: float) -> None:
        """Track API cost.
        
        Args:
            service: Name of the service (e.g., "elevenlabs", "deepseek")
            cost: Cost in USD
        """
        # API cost tracking is not implemented in the new version
        pass
        
    def track_error(self, operation: str) -> None:
        """Track operation errors.
        
        Args:
            operation: Name of the operation that failed
        """
        with self._lock:
            self._errors[operation] += 1
        self._save_metrics()
        
    def get_latency_stats(self, operation: Optional[str] = None) -> Dict:
        """Get latency statistics.
        
        Args:
            operation: Optional operation name to filter stats
        """
        with self._lock:
            self._cleanup_old_data()
            
            stats = {}
            
            operations = [operation] if operation else self._latencies.keys()
            
            for op in operations:
                samples = self._latencies.get(op, [])
                if not samples:
                    continue
                
                try:
                    durations = [entry['duration'] for entry in samples]
                    stats[op] = {
                        "count": len(durations),
                        "avg_latency": mean(durations),
                        "min_latency": min(durations),
                        "max_latency": max(durations),
                        "p95_latency": quantiles(durations, n=20)[18] if len(durations) >= 20 else None,
                        "error_count": self._errors[op]
                    }
                except Exception as e:
                    print(f"Error calculating stats for {op}: {str(e)}")
                
            return stats
        
    def get_cost_stats(self) -> Dict:
        """Get API cost statistics."""
        # API cost tracking is not implemented in the new version
        return {}
        
    def get_error_stats(self) -> Dict:
        """Get error statistics."""
        with self._lock:
            total_errors = sum(self._errors.values())
            
            return {
                "total_errors": total_errors,
                "per_operation": dict(self._errors),
                "error_distribution": {
                    operation: (count / total_errors if total_errors > 0 else 0)
                    for operation, count in self._errors.items()
                }
            }
        
    def get_performance_summary(self) -> Dict:
        """Get overall performance summary."""
        latency_stats = self.get_latency_stats()
        cost_stats = self.get_cost_stats()
        error_stats = self.get_error_stats()
        
        # Calculate SLA compliance
        total_samples = sum(stats["count"] for stats in latency_stats.values())
        total_breaches = sum(stats["sla_breaches"] for stats in latency_stats.values())
        sla_compliance = 1 - (total_breaches / total_samples if total_samples > 0 else 0)
        
        return {
            "timestamp": datetime.now(UTC).isoformat(),
            "sla_compliance": sla_compliance,
            "latency": latency_stats,
            "costs": cost_stats,
            "errors": error_stats,
            "recommendations": self._generate_recommendations(
                latency_stats,
                cost_stats,
                error_stats
            )
        }
        
    def _generate_recommendations(
        self,
        latency_stats: Dict,
        cost_stats: Dict,
        error_stats: Dict
    ) -> List[str]:
        """Generate performance improvement recommendations."""
        recommendations = []
        
        # Check SLA compliance
        for operation, stats in latency_stats.items():
            if stats["sla_breaches"] > 0:
                breach_rate = stats["sla_breaches"] / stats["count"]
                if breach_rate > 0.05:  # More than 5% breaches
                    recommendations.append(
                        f"High latency in {operation}: {breach_rate:.1%} of requests exceed SLA"
                    )
                    
        # Check costs
        total_cost = cost_stats["total_cost"]
        if total_cost > 100:  # Arbitrary threshold
            recommendations.append(
                f"High API costs (${total_cost:.2f}). Consider increasing cache usage."
            )
            
        # Check errors
        for operation, count in error_stats["per_operation"].items():
            if count > 50:  # Arbitrary threshold
                recommendations.append(
                    f"High error rate in {operation}: {count} errors"
                )
                
        return recommendations or ["No immediate improvements needed"]
        
    def _save_metrics(self) -> None:
        """Save current metrics to disk."""
        try:
            with self._lock:
                self._cleanup_old_data()
                
                metrics = {
                    "timestamp": datetime.now(UTC).isoformat(),
                    "latencies": {k: v[-100:] for k, v in self._latencies.items()},
                    "errors": dict(self._errors),
                    "window_size_minutes": self._window_size.total_seconds() / 60
                }
                
                metrics_file = self.log_dir / "metrics.json"
                metrics_file.write_text(json.dumps(metrics))
                
        except Exception as e:
            print(f"Error saving metrics: {str(e)}")
            
    def _load_metrics(self) -> None:
        """Load metrics from disk."""
        try:
            metrics_file = self.log_dir / "metrics.json"
            if not metrics_file.exists():
                return
                
            metrics = json.loads(metrics_file.read_text())
            
            self._latencies = defaultdict(list, metrics.get("latencies", {}))
            self._errors = defaultdict(int, metrics.get("errors", {}))
            
        except Exception as e:
            print(f"Error loading metrics: {str(e)}")

    def _cleanup_old_data(self):
        """Remove data older than the window size."""
        cutoff = datetime.now() - self._window_size
        
        # Clean up latencies
        for operation in self._latencies:
            self._latencies[operation] = [
                entry for entry in self._latencies[operation]
                if entry['timestamp'] > cutoff
            ]

# Create a singleton instance
performance_monitor = PerformanceMonitor() 