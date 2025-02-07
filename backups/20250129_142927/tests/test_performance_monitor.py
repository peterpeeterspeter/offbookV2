import pytest
import json
from pathlib import Path
from datetime import datetime, UTC
from src.services.performance_monitor import PerformanceMonitor

@pytest.fixture
def temp_log_dir(tmp_path):
    """Create a temporary log directory."""
    log_dir = tmp_path / "test_logs"
    log_dir.mkdir()
    return log_dir

@pytest.fixture
def monitor(temp_log_dir):
    """Create a performance monitor instance."""
    return PerformanceMonitor(log_dir=temp_log_dir)

def test_track_latency(monitor):
    """Test tracking operation latency."""
    monitor.track_latency("test_op", 0.5)
    monitor.track_latency("test_op", 1.0)
    
    stats = monitor.get_latency_stats("test_op")
    assert stats["test_op"]["count"] == 2
    assert stats["test_op"]["mean"] == 0.75
    assert stats["test_op"]["min"] == 0.5
    assert stats["test_op"]["max"] == 1.0

def test_track_api_cost(monitor):
    """Test tracking API costs."""
    monitor.track_api_cost("test_service", 10.0)
    monitor.track_api_cost("test_service", 5.0)
    
    stats = monitor.get_cost_stats()
    assert stats["total_cost"] == 15.0
    assert stats["per_service"]["test_service"] == 15.0
    assert stats["cost_distribution"]["test_service"] == 1.0

def test_track_error(monitor):
    """Test tracking errors."""
    monitor.track_error("test_op")
    monitor.track_error("test_op")
    monitor.track_error("other_op")
    
    stats = monitor.get_error_stats()
    assert stats["total_errors"] == 3
    assert stats["per_operation"]["test_op"] == 2
    assert stats["per_operation"]["other_op"] == 1
    assert stats["error_distribution"]["test_op"] == pytest.approx(2/3)

def test_performance_summary(monitor):
    """Test generating performance summary."""
    # Add some test data
    monitor.track_latency("fast_op", 0.1)
    monitor.track_latency("slow_op", 2.0)
    monitor.track_api_cost("service1", 50.0)
    monitor.track_error("error_op")
    
    summary = monitor.get_performance_summary()
    
    assert "timestamp" in summary
    assert "sla_compliance" in summary
    assert "latency" in summary
    assert "costs" in summary
    assert "errors" in summary
    assert "recommendations" in summary
    
    # Check SLA breach detection
    assert summary["latency"]["slow_op"]["sla_breaches"] == 1
    assert summary["sla_compliance"] == 0.5  # 1 breach out of 2 samples

def test_metrics_persistence(temp_log_dir):
    """Test saving and loading metrics."""
    # Create monitor and add data
    monitor1 = PerformanceMonitor(log_dir=temp_log_dir)
    monitor1.track_latency("test_op", 1.0)
    monitor1.track_api_cost("test_service", 10.0)
    monitor1.track_error("test_op")
    
    # Create new monitor instance
    monitor2 = PerformanceMonitor(log_dir=temp_log_dir)
    
    # Check if data was loaded
    latency_stats = monitor2.get_latency_stats("test_op")
    cost_stats = monitor2.get_cost_stats()
    error_stats = monitor2.get_error_stats()
    
    assert latency_stats["test_op"]["count"] == 1
    assert cost_stats["total_cost"] == 10.0
    assert error_stats["total_errors"] == 1

def test_recommendations(monitor):
    """Test recommendation generation."""
    # Add data that should trigger recommendations
    for _ in range(60):  # Increase to exceed error threshold
        monitor.track_latency("slow_op", 2.0)  # All samples breach SLA
        monitor.track_error("error_op")  # Add 60 errors
    
    monitor.track_api_cost("expensive_service", 150.0)  # Exceeds cost threshold
    
    summary = monitor.get_performance_summary()
    recommendations = summary["recommendations"]
    
    assert len(recommendations) == 3  # Should have latency, cost, and error recommendations
    assert any("High latency" in rec for rec in recommendations)
    assert any("High API costs" in rec for rec in recommendations)
    assert any("High error rate" in rec for rec in recommendations)

def test_large_sample_handling(monitor):
    """Test handling of large number of samples."""
    # Add more than 1000 samples
    for i in range(1100):
        monitor.track_latency("test_op", float(i))
    
    stats = monitor.get_latency_stats("test_op")
    assert stats["test_op"]["count"] == 1000  # Should keep only last 1000 samples
    assert stats["test_op"]["max"] == 1099.0  # Should have most recent samples 