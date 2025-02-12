import time
import json
import asyncio
from typing import Dict, List, Optional, Any
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
        self.log_dir = log_dir or Path("logs")
        self.log_dir.mkdir(exist_ok=True)
        
        self._lock = threading.Lock()
        self._latencies = defaultdict(list)
        self._costs = defaultdict(list)
        self._errors = defaultdict(int)
        self._last_reset = datetime.now()
        self._window_size = timedelta(minutes=5)  # Keep 5 minutes of data
        self.initialized = False
        
        # Load existing data if available
        self._load_metrics()

    async def initialize(self):
        """Initialize the performance monitor."""
        if self.initialized:
            return
            
        # Load any existing metrics
        self._load_metrics()
        self.initialized = True
        
    def track_latency(self, operation: str, duration: float) -> None:
        """Track operation latency."""
        with self._lock:
            self._cleanup_old_data()
            self._latencies[operation].append({
                'timestamp': datetime.now(),
                'duration': duration
            })
            
            # Keep only last 1000 samples
            if len(self._latencies[operation]) > 1000:
                self._latencies[operation] = self._latencies[operation][-1000:]
            
        # Save metrics periodically
        if sum(len(samples) for samples in self._latencies.values()) % 100 == 0:
            self._save_metrics()
            
    def track_api_cost(self, service: str, cost: float):
        """Track API cost for a service."""
        with self._lock:
            self._costs[service].append((cost, datetime.now(UTC)))
        self._save_metrics()

    def track_error(self, operation: str) -> None:
        """Track operation error."""
        with self._lock:
            self._errors[operation] += 1
        self._save_metrics()

    def get_latency_stats(self, operation: Optional[str] = None) -> Dict:
        """Get latency statistics."""
        with self._lock:
            self._cleanup_old_data()
            
            if operation:
                samples = self._latencies.get(operation, [])
                if not samples:
                    return {operation: {"count": 0}}
                    
                durations = [s['duration'] for s in samples]
                return {
                    operation: {
                        "count": len(durations),
                        "mean": mean(durations) if durations else 0,
                        "median": median(durations) if durations else 0,
                        "p95": quantiles(durations, n=20)[18] if len(durations) >= 20 else max(durations) if durations else 0,
                        "max": max(durations) if durations else 0,
                        "min": min(durations) if durations else 0,
                        "sla_breaches": sum(1 for d in durations if d > 1.0)  # SLA breach if > 1s
                    }
                }
            
            return {
                op: {
                    "count": len(samples),
                    "mean": mean([s['duration'] for s in samples]) if samples else 0,
                    "median": median([s['duration'] for s in samples]) if samples else 0,
                    "p95": quantiles([s['duration'] for s in samples], n=20)[18] if len(samples) >= 20 else max([s['duration'] for s in samples]) if samples else 0,
                    "max": max([s['duration'] for s in samples]) if samples else 0,
                    "min": min([s['duration'] for s in samples]) if samples else 0,
                    "sla_breaches": sum(1 for s in samples if s['duration'] > 1.0)
                }
                for op, samples in self._latencies.items()
            }

    def get_cost_stats(self) -> Dict[str, Any]:
        """Get API cost statistics."""
        total_cost = sum(cost for service_costs in self._costs.values() 
                        for cost, _ in service_costs)
        per_service = {service: sum(cost for cost, _ in costs) 
                      for service, costs in self._costs.items()}
        
        # Calculate cost distribution
        cost_distribution = {}
        if total_cost > 0:
            cost_distribution = {
                service: (sum(cost for cost, _ in costs) / total_cost)
                for service, costs in self._costs.items()
            }
        
        return {
            "total_cost": total_cost,
            "per_service": per_service,
            "cost_distribution": cost_distribution
        }

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
        """Save metrics to disk."""
        try:
            metrics = {
                "latencies": {
                    k: [{"duration": float(s["duration"]), "timestamp": s["timestamp"].isoformat()} 
                        for s in vals]
                    for k, vals in self._latencies.items()
                },
                "costs": {
                    k: [{"cost": float(c), "timestamp": t.isoformat()} 
                        for c, t in vals]
                    for k, vals in self._costs.items()
                },
                "errors": dict(self._errors)
            }
            with open(self.log_dir / "metrics.json", "w") as f:
                json.dump(metrics, f)
        except Exception as e:
            print(f"Error saving metrics: {str(e)}")
            
    def _load_metrics(self) -> None:
        """Load metrics from disk."""
        try:
            if (self.log_dir / "metrics.json").exists():
                with open(self.log_dir / "metrics.json", "r") as f:
                    metrics = json.load(f)
                    
                    # Load latencies with proper structure
                    self._latencies = defaultdict(list)
                    for k, vals in metrics.get("latencies", {}).items():
                        self._latencies[k] = [
                            {
                                "duration": float(item["duration"]),
                                "timestamp": datetime.fromisoformat(item["timestamp"])
                            }
                            for item in vals
                        ]
                    
                    # Load costs with proper structure
                    self._costs = defaultdict(list)
                    for k, vals in metrics.get("costs", {}).items():
                        self._costs[k] = [
                            (float(item["cost"]), datetime.fromisoformat(item["timestamp"]))
                            for item in vals
                        ]
                    
                    # Load errors
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

    async def cleanup(self):
        """Cleanup resources."""
        self._save_metrics()
        self.initialized = False
        self._latencies.clear()
        self._costs.clear()
        self._errors.clear()

    def is_ready(self) -> bool:
        """Check if the monitor is ready."""
        return self.initialized

# Create a singleton instance
performance_monitor = PerformanceMonitor() 