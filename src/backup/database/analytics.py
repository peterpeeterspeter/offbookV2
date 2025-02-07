from typing import Dict, List, Tuple, Optional
from sqlalchemy import select, and_, or_, desc, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from .models import (
    User, Script, Character, Scene, PracticeSession,
    Performance, Recording, Feedback, TTSCache
)
from .cache import AnalyticsCache, CachedAnalytics

class PerformanceAnalytics(CachedAnalytics):
    """Analytics for performance metrics and trends."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, AnalyticsCache())
    
    @CachedAnalytics.cached("perf_dist", expiry=3600)
    async def get_emotion_accuracy_distribution(
        self,
        days: int = 30
    ) -> Dict[str, int]:
        """Get distribution of emotion accuracy scores."""
        threshold = datetime.utcnow() - timedelta(days=days)
        query = (
            select(
                func.width_bucket(
                    Performance.emotion_accuracy,
                    0, 1, 10
                ).label('bucket'),
                func.count().label('count')
            )
            .where(Performance.start_time >= threshold)
            .group_by('bucket')
            .order_by('bucket')
        )
        result = await self.session.execute(query)
        return {f"{i/10:.1f}-{(i+1)/10:.1f}": count for i, count in result}
    
    @CachedAnalytics.cached("perf_trends", expiry=1800)
    async def get_performance_trends(
        self,
        user_id: int,
        days: int = 90
    ) -> List[Dict[str, float]]:
        """Get weekly performance trends for a user."""
        threshold = datetime.utcnow() - timedelta(days=days)
        query = (
            select(
                func.date_trunc('week', Performance.start_time).label('week'),
                func.avg(Performance.emotion_accuracy).label('avg_emotion'),
                func.avg(Performance.timing_score).label('avg_timing'),
                func.avg(Performance.pronunciation_score).label('avg_pronunciation'),
                func.avg(Performance.overall_score).label('avg_overall')
            )
            .where(
                and_(
                    Performance.user_id == user_id,
                    Performance.start_time >= threshold
                )
            )
            .group_by('week')
            .order_by('week')
        )
        result = await self.session.execute(query)
        return [
            {
                "week": row.week,
                "emotion_accuracy": float(row.avg_emotion or 0),
                "timing_score": float(row.avg_timing or 0),
                "pronunciation_score": float(row.avg_pronunciation or 0),
                "overall_score": float(row.avg_overall or 0)
            }
            for row in result
        ]
    
    @CachedAnalytics.cached("char_diff", expiry=7200)
    async def get_character_difficulty_ranking(
        self,
        script_id: Optional[int] = None,
        min_performances: int = 5
    ) -> List[Dict[str, Any]]:
        """Rank characters by average performance difficulty."""
        query = (
            select(
                Character.id,
                Character.name,
                func.count(Performance.id).label('total_performances'),
                func.avg(Performance.overall_score).label('avg_score'),
                func.stddev(Performance.overall_score).label('score_variance')
            )
            .join(Performance)
            .group_by(Character.id)
            .having(func.count(Performance.id) >= min_performances)
        )
        
        if script_id:
            query = query.join(Character.scripts).where(Script.id == script_id)
            
        query = query.order_by(func.avg(Performance.overall_score))
        
        result = await self.session.execute(query)
        return [
            {
                "character_id": row.id,
                "name": row.name,
                "total_performances": row.total_performances,
                "average_score": float(row.avg_score or 0),
                "score_variance": float(row.score_variance or 0)
            }
            for row in result
        ]

class UserEngagementAnalytics(CachedAnalytics):
    """Analytics for user engagement and activity patterns."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, AnalyticsCache())
    
    @CachedAnalytics.cached("user_activity", expiry=900)  # 15 minutes
    async def get_user_activity_heatmap(
        self,
        user_id: int,
        days: int = 30
    ) -> Dict[str, Dict[int, int]]:
        """Get user activity patterns by day and hour."""
        threshold = datetime.utcnow() - timedelta(days=days)
        query = (
            select(
                func.extract('dow', Performance.start_time).label('day_of_week'),
                func.extract('hour', Performance.start_time).label('hour'),
                func.count().label('count')
            )
            .where(
                and_(
                    Performance.user_id == user_id,
                    Performance.start_time >= threshold
                )
            )
            .group_by('day_of_week', 'hour')
            .order_by('day_of_week', 'hour')
        )
        result = await self.session.execute(query)
        
        heatmap = {}
        for row in result:
            day = int(row.day_of_week)
            hour = int(row.hour)
            if day not in heatmap:
                heatmap[day] = {}
            heatmap[day][hour] = row.count
        return heatmap
    
    @CachedAnalytics.cached("user_retention", expiry=3600)
    async def get_user_retention_metrics(
        self,
        days: int = 90
    ) -> Dict[str, float]:
        """Calculate user retention metrics."""
        threshold = datetime.utcnow() - timedelta(days=days)
        
        # Active users query
        active_query = (
            select(
                func.count(func.distinct(User.id)).label('total_users'),
                func.count(
                    func.distinct(
                        User.id
                    )
                ).filter(
                    User.last_active >= threshold
                ).label('active_users')
            )
        )
        
        # Session frequency query
        frequency_query = (
            select(
                func.avg(
                    func.count(PracticeSession.id)
                ).label('avg_sessions_per_user')
            )
            .join(PracticeSession.participants)
            .where(PracticeSession.started_at >= threshold)
            .group_by(User.id)
        )
        
        active_result = await self.session.execute(active_query)
        frequency_result = await self.session.execute(frequency_query)
        
        active_row = active_result.first()
        frequency_row = frequency_result.first()
        
        return {
            "total_users": active_row.total_users,
            "active_users": active_row.active_users,
            "retention_rate": active_row.active_users / active_row.total_users if active_row.total_users > 0 else 0,
            "avg_sessions_per_user": float(frequency_row.avg_sessions_per_user or 0)
        }

class SystemUsageAnalytics(CachedAnalytics):
    """Analytics for system usage and performance."""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, AnalyticsCache())
    
    @CachedAnalytics.cached("tts_metrics", expiry=1800)
    async def get_tts_cache_metrics(self) -> Dict[str, Any]:
        """Analyze TTS cache effectiveness."""
        query = (
            select(
                func.count().label('total_entries'),
                func.avg(TTSCache.access_count).label('avg_access_count'),
                func.sum(TTSCache.duration).label('total_duration'),
                func.avg(
                    func.extract(
                        'epoch',
                        func.now() - TTSCache.created_at
                    )
                ).label('avg_age_seconds')
            )
            .select_from(TTSCache)
        )
        result = await self.session.execute(query)
        row = result.first()
        
        return {
            "total_cached_entries": row.total_entries,
            "average_access_count": float(row.avg_access_count or 0),
            "total_cached_duration": float(row.total_duration or 0),
            "average_cache_age_days": float(row.avg_age_seconds or 0) / 86400
        }
    
    @CachedAnalytics.cached("script_usage", expiry=3600)
    async def get_script_usage_stats(self) -> List[Dict[str, Any]]:
        """Get script usage statistics."""
        query = (
            select(
                Script.id,
                Script.title,
                func.count(Performance.id).label('total_performances'),
                func.count(func.distinct(User.id)).label('unique_users'),
                func.avg(Performance.overall_score).label('avg_score')
            )
            .join(Scene)
            .join(Performance)
            .join(Performance.user)
            .group_by(Script.id)
            .order_by(desc('total_performances'))
        )
        result = await self.session.execute(query)
        
        return [
            {
                "script_id": row.id,
                "title": row.title,
                "total_performances": row.total_performances,
                "unique_users": row.unique_users,
                "average_score": float(row.avg_score or 0)
            }
            for row in result
        ]
    
    @CachedAnalytics.cached("collab_stats", expiry=1800)
    async def get_session_collaboration_stats(
        self,
        days: int = 30
    ) -> Dict[str, float]:
        """Analyze collaboration patterns in practice sessions."""
        threshold = datetime.utcnow() - timedelta(days=days)
        
        query = (
            select(
                func.avg(
                    func.count(User.id)
                ).label('avg_participants'),
                func.avg(
                    func.extract(
                        'epoch',
                        PracticeSession.ended_at - PracticeSession.started_at
                    )
                ).label('avg_duration')
            )
            .join(PracticeSession.participants)
            .where(PracticeSession.started_at >= threshold)
            .group_by(PracticeSession.id)
        )
        
        result = await self.session.execute(query)
        row = result.first()
        
        return {
            "average_participants": float(row.avg_participants or 0),
            "average_session_duration_minutes": float(row.avg_duration or 0) / 60
        } 