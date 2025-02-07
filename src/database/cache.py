from typing import Any, Optional, TypeVar, Callable, Awaitable
import json
from datetime import datetime, timedelta
import hashlib
import pickle
from redis import asyncio as aioredis
import os
from functools import wraps

# Type variable for generic cache decorator
T = TypeVar('T')

class AnalyticsCache:
    """Cache layer for expensive analytics queries."""
    
    def __init__(self):
        """Initialize Redis connection."""
        self.redis = aioredis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            encoding="utf-8",
            decode_responses=True
        )
        # Binary Redis client for pickle data
        self.redis_binary = aioredis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            encoding=None
        )
    
    def _get_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate a cache key from prefix and parameters."""
        # Sort kwargs for consistent key generation
        sorted_items = sorted(kwargs.items())
        # Create a string representation of parameters
        params_str = ','.join(f"{k}:{v}" for k, v in sorted_items)
        # Generate hash for the parameters
        params_hash = hashlib.md5(params_str.encode()).hexdigest()
        return f"analytics:{prefix}:{params_hash}"
    
    async def get_cached_data(
        self,
        key: str,
        is_pickle: bool = False
    ) -> Optional[Any]:
        """Get data from cache."""
        if is_pickle:
            data = await self.redis_binary.get(key)
            return pickle.loads(data) if data else None
        
        data = await self.redis.get(key)
        return json.loads(data) if data else None
    
    async def set_cached_data(
        self,
        key: str,
        data: Any,
        expiry: int,
        is_pickle: bool = False
    ) -> None:
        """Set data in cache with expiry."""
        if is_pickle:
            await self.redis_binary.setex(
                key,
                expiry,
                pickle.dumps(data)
            )
        else:
            await self.redis.setex(
                key,
                expiry,
                json.dumps(data)
            )
    
    async def invalidate_pattern(self, pattern: str) -> None:
        """Invalidate all keys matching a pattern."""
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)
    
    def cached(
        self,
        prefix: str,
        expiry: int = 3600,  # 1 hour default
        is_pickle: bool = False,
        invalidate_on: Optional[list[str]] = None
    ):
        """Decorator for caching analytics query results."""
        def decorator(
            func: Callable[..., Awaitable[T]]
        ) -> Callable[..., Awaitable[T]]:
            @wraps(func)
            async def wrapper(*args, **kwargs) -> T:
                # Generate cache key
                cache_key = self._get_cache_key(prefix, **kwargs)
                
                # Try to get from cache
                cached_result = await self.get_cached_data(
                    cache_key,
                    is_pickle
                )
                if cached_result is not None:
                    return cached_result
                
                # Execute function if not cached
                result = await func(*args, **kwargs)
                
                # Cache the result
                await self.set_cached_data(
                    cache_key,
                    result,
                    expiry,
                    is_pickle
                )
                
                return result
            return wrapper
        return decorator

class CachedAnalytics:
    """Analytics with caching support."""
    
    def __init__(self, session, cache: AnalyticsCache):
        self.session = session
        self.cache = cache
    
    @property
    def cache_keys(self):
        """Cache key patterns for different analytics."""
        return {
            "performance_distribution": "analytics:perf_dist:*",
            "performance_trends": "analytics:perf_trends:*",
            "character_difficulty": "analytics:char_diff:*",
            "user_activity": "analytics:user_activity:*",
            "user_retention": "analytics:user_retention:*",
            "tts_metrics": "analytics:tts_metrics:*",
            "script_usage": "analytics:script_usage:*",
            "collaboration_stats": "analytics:collab_stats:*"
        }
    
    async def invalidate_performance_cache(self) -> None:
        """Invalidate performance-related caches."""
        patterns = [
            self.cache_keys["performance_distribution"],
            self.cache_keys["performance_trends"],
            self.cache_keys["character_difficulty"]
        ]
        for pattern in patterns:
            await self.cache.invalidate_pattern(pattern)
    
    async def invalidate_user_cache(self) -> None:
        """Invalidate user-related caches."""
        patterns = [
            self.cache_keys["user_activity"],
            self.cache_keys["user_retention"]
        ]
        for pattern in patterns:
            await self.cache.invalidate_pattern(pattern)
    
    async def invalidate_system_cache(self) -> None:
        """Invalidate system-related caches."""
        patterns = [
            self.cache_keys["tts_metrics"],
            self.cache_keys["script_usage"],
            self.cache_keys["collaboration_stats"]
        ]
        for pattern in patterns:
            await self.cache.invalidate_pattern(pattern)
    
    @AnalyticsCache.cached("perf_dist", expiry=3600)
    async def get_emotion_accuracy_distribution(
        self,
        days: int = 30
    ) -> Dict[str, int]:
        """Cached version of emotion accuracy distribution."""
        # Implementation from PerformanceAnalytics
        pass
    
    @AnalyticsCache.cached("perf_trends", expiry=1800)
    async def get_performance_trends(
        self,
        user_id: int,
        days: int = 90
    ) -> List[Dict[str, float]]:
        """Cached version of performance trends."""
        # Implementation from PerformanceAnalytics
        pass
    
    @AnalyticsCache.cached("char_diff", expiry=7200)
    async def get_character_difficulty_ranking(
        self,
        script_id: Optional[int] = None,
        min_performances: int = 5
    ) -> List[Dict[str, Any]]:
        """Cached version of character difficulty ranking."""
        # Implementation from PerformanceAnalytics
        pass
    
    @AnalyticsCache.cached("user_activity", expiry=900)  # 15 minutes
    async def get_user_activity_heatmap(
        self,
        user_id: int,
        days: int = 30
    ) -> Dict[str, Dict[int, int]]:
        """Cached version of user activity heatmap."""
        # Implementation from UserEngagementAnalytics
        pass
    
    @AnalyticsCache.cached("user_retention", expiry=3600)
    async def get_user_retention_metrics(
        self,
        days: int = 90
    ) -> Dict[str, float]:
        """Cached version of user retention metrics."""
        # Implementation from UserEngagementAnalytics
        pass
    
    @AnalyticsCache.cached("tts_metrics", expiry=1800)
    async def get_tts_cache_metrics(self) -> Dict[str, Any]:
        """Cached version of TTS cache metrics."""
        # Implementation from SystemUsageAnalytics
        pass
    
    @AnalyticsCache.cached("script_usage", expiry=3600)
    async def get_script_usage_stats(self) -> List[Dict[str, Any]]:
        """Cached version of script usage statistics."""
        # Implementation from SystemUsageAnalytics
        pass
    
    @AnalyticsCache.cached("collab_stats", expiry=1800)
    async def get_session_collaboration_stats(
        self,
        days: int = 30
    ) -> Dict[str, float]:
        """Cached version of session collaboration statistics."""
        # Implementation from SystemUsageAnalytics
        pass 