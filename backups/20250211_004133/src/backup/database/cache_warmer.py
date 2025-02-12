from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .models import (
    User, Script, Performance, PracticeSession
)
from .analytics import (
    PerformanceAnalytics,
    UserEngagementAnalytics,
    SystemUsageAnalytics
)

class CacheWarmer:
    """Handles warming of analytics cache for frequently accessed data."""
    
    def __init__(
        self,
        session: AsyncSession,
        performance_analytics: PerformanceAnalytics,
        user_analytics: UserEngagementAnalytics,
        system_analytics: SystemUsageAnalytics
    ):
        self.session = session
        self.performance_analytics = performance_analytics
        self.user_analytics = user_analytics
        self.system_analytics = system_analytics
    
    async def get_active_users(self, days: int = 7) -> List[int]:
        """Get IDs of users active in the last N days."""
        threshold = datetime.utcnow() - timedelta(days=days)
        query = (
            select(User.id)
            .where(User.last_active >= threshold)
            .order_by(User.last_active.desc())
        )
        result = await self.session.execute(query)
        return [row[0] for row in result]
    
    async def get_popular_scripts(self, limit: int = 10) -> List[int]:
        """Get IDs of most frequently used scripts."""
        query = (
            select(Script.id)
            .join(PracticeSession)
            .group_by(Script.id)
            .order_by(func.count(PracticeSession.id).desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return [row[0] for row in result]
    
    async def warm_performance_cache(self) -> None:
        """Warm performance-related caches."""
        # Get active users
        active_users = await self.get_active_users()
        
        # Warm global performance distribution
        await self.performance_analytics.get_emotion_accuracy_distribution()
        
        # Warm performance trends for active users
        for user_id in active_users:
            await self.performance_analytics.get_performance_trends(user_id)
        
        # Warm character difficulty rankings
        popular_scripts = await self.get_popular_scripts()
        await self.performance_analytics.get_character_difficulty_ranking()
        for script_id in popular_scripts:
            await self.performance_analytics.get_character_difficulty_ranking(
                script_id=script_id
            )
    
    async def warm_user_engagement_cache(self) -> None:
        """Warm user engagement-related caches."""
        # Get active users
        active_users = await self.get_active_users()
        
        # Warm activity heatmaps for active users
        for user_id in active_users:
            await self.user_analytics.get_user_activity_heatmap(user_id)
        
        # Warm retention metrics for different time periods
        for days in [30, 60, 90]:
            await self.user_analytics.get_user_retention_metrics(days)
    
    async def warm_system_cache(self) -> None:
        """Warm system-related caches."""
        # Warm TTS cache metrics
        await self.system_analytics.get_tts_cache_metrics()
        
        # Warm script usage statistics
        await self.system_analytics.get_script_usage_stats()
        
        # Warm collaboration stats for different time periods
        for days in [7, 30]:
            await self.system_analytics.get_session_collaboration_stats(days)
    
    async def warm_all_caches(self) -> None:
        """Warm all frequently accessed caches."""
        await asyncio.gather(
            self.warm_performance_cache(),
            self.warm_user_engagement_cache(),
            self.warm_system_cache()
        )

class ScheduledCacheWarmer:
    """Handles scheduled cache warming operations."""
    
    def __init__(
        self,
        warmer: CacheWarmer,
        performance_interval: int = 1800,  # 30 minutes
        engagement_interval: int = 3600,   # 1 hour
        system_interval: int = 7200        # 2 hours
    ):
        self.warmer = warmer
        self.performance_interval = performance_interval
        self.engagement_interval = engagement_interval
        self.system_interval = system_interval
        self.is_running = False
        self._tasks: List[asyncio.Task] = []
    
    async def _warm_performance_loop(self) -> None:
        """Periodically warm performance caches."""
        while self.is_running:
            try:
                await self.warmer.warm_performance_cache()
            except Exception as e:
                print(f"Error warming performance cache: {e}")
            await asyncio.sleep(self.performance_interval)
    
    async def _warm_engagement_loop(self) -> None:
        """Periodically warm engagement caches."""
        while self.is_running:
            try:
                await self.warmer.warm_user_engagement_cache()
            except Exception as e:
                print(f"Error warming engagement cache: {e}")
            await asyncio.sleep(self.engagement_interval)
    
    async def _warm_system_loop(self) -> None:
        """Periodically warm system caches."""
        while self.is_running:
            try:
                await self.warmer.warm_system_cache()
            except Exception as e:
                print(f"Error warming system cache: {e}")
            await asyncio.sleep(self.system_interval)
    
    async def start(self) -> None:
        """Start scheduled cache warming."""
        if self.is_running:
            return
        
        self.is_running = True
        self._tasks = [
            asyncio.create_task(self._warm_performance_loop()),
            asyncio.create_task(self._warm_engagement_loop()),
            asyncio.create_task(self._warm_system_loop())
        ]
    
    async def stop(self) -> None:
        """Stop scheduled cache warming."""
        self.is_running = False
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks = []

class CacheWarmerFactory:
    """Factory for creating cache warmers with appropriate analytics instances."""
    
    @staticmethod
    async def create_warmer(session: AsyncSession) -> CacheWarmer:
        """Create a cache warmer with initialized analytics instances."""
        performance_analytics = PerformanceAnalytics(session)
        user_analytics = UserEngagementAnalytics(session)
        system_analytics = SystemUsageAnalytics(session)
        
        return CacheWarmer(
            session,
            performance_analytics,
            user_analytics,
            system_analytics
        )
    
    @staticmethod
    async def create_scheduled_warmer(
        session: AsyncSession,
        **intervals: Dict[str, int]
    ) -> ScheduledCacheWarmer:
        """Create a scheduled cache warmer with custom intervals."""
        warmer = await CacheWarmerFactory.create_warmer(session)
        return ScheduledCacheWarmer(warmer, **intervals) 