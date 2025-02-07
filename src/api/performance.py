from fastapi import APIRouter
from typing import Dict

from ..services.performance_monitor import performance_monitor
from ..services.cache_manager import cache_manager
from ..services.batch_processor import batch_processor

router = APIRouter(prefix="/performance", tags=["performance"])

@router.get("/summary")
async def get_performance_summary() -> Dict:
    """Get overall performance summary including all services."""
    return {
        "performance": performance_monitor.get_performance_summary(),
        "cache": cache_manager.get_cache_stats(),
        "batch": batch_processor.get_batch_stats()
    }

@router.get("/latency")
async def get_latency_stats() -> Dict:
    """Get detailed latency statistics for all operations."""
    return performance_monitor.get_latency_stats()

@router.get("/costs")
async def get_cost_stats() -> Dict:
    """Get API cost statistics."""
    return performance_monitor.get_cost_stats()

@router.get("/errors")
async def get_error_stats() -> Dict:
    """Get error statistics."""
    return performance_monitor.get_error_stats()

@router.get("/cache")
async def get_cache_stats() -> Dict:
    """Get cache performance statistics."""
    return cache_manager.get_cache_stats()

@router.get("/batch")
async def get_batch_stats() -> Dict:
    """Get batch processing statistics."""
    return batch_processor.get_batch_stats() 