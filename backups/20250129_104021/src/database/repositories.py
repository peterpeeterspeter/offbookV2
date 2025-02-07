from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import select, and_, or_, desc, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select
from datetime import datetime, timedelta

from .repository import BaseRepository
from .models import (
    User, Script, Character, Scene, PracticeSession,
    Performance, Recording, Feedback, TTSCache
)

class UserRepository(BaseRepository[User]):
    """Repository for User model operations."""
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email using the email index."""
        return await self.get_by(email=email)
    
    async def get_active_session(self, user_id: int) -> Optional[PracticeSession]:
        """Get user's active practice session using session active index."""
        query = (
            select(PracticeSession)
            .join(PracticeSession.participants)
            .where(
                and_(
                    User.id == user_id,
                    PracticeSession.is_active == True
                )
            )
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_recently_active_users(
        self,
        minutes: int = 15,
        limit: int = 10
    ) -> List[User]:
        """Get recently active users using the last_active index."""
        threshold = datetime.utcnow() - timedelta(minutes=minutes)
        query = (
            select(User)
            .where(User.last_active >= threshold)
            .order_by(desc(User.last_active))
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

class ScriptRepository(BaseRepository[Script]):
    """Repository for Script model operations."""
    
    async def get_with_characters(self, script_id: int) -> Optional[Script]:
        """Get script with its characters."""
        query = (
            select(Script)
            .where(Script.id == script_id)
            .join(Script.characters)
        )
        result = await self.session.execute(query)
        return result.unique().scalar_one_or_none()
    
    async def search_scripts(
        self,
        search_term: str,
        limit: int = 10
    ) -> List[Script]:
        """Search scripts by title or content."""
        query = (
            select(Script)
            .where(
                Script.title.ilike(f"%{search_term}%") |
                Script.content.ilike(f"%{search_term}%")
            )
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def search_scripts_full_text(
        self,
        search_term: str,
        limit: int = 10
    ) -> List[Script]:
        """Search scripts using the GIN index for full-text search."""
        query = text(
            """
            SELECT id, title, content
            FROM scripts
            WHERE to_tsvector('english', title || ' ' || content)
            @@ plainto_tsquery('english', :search_term)
            ORDER BY ts_rank(
                to_tsvector('english', title || ' ' || content),
                plainto_tsquery('english', :search_term)
            ) DESC
            LIMIT :limit
            """
        )
        result = await self.session.execute(
            query,
            {"search_term": search_term, "limit": limit}
        )
        return result.all()
    
    async def get_scripts_by_language(
        self,
        language: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[Script]:
        """Get scripts by language using the language index."""
        return await self.list(
            filters={"language": language},
            skip=skip,
            limit=limit,
            order_by="-created_at"
        )
    
    async def get_recent_scripts(
        self,
        days: int = 30,
        limit: int = 10
    ) -> List[Script]:
        """Get recent scripts using the created_at index."""
        threshold = datetime.utcnow() - timedelta(days=days)
        query = (
            select(Script)
            .where(Script.created_at >= threshold)
            .order_by(desc(Script.created_at))
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

class CharacterRepository(BaseRepository[Character]):
    """Repository for Character model operations."""
    
    async def get_by_script(self, script_id: int) -> List[Character]:
        """Get all characters in a script."""
        query = (
            select(Character)
            .join(Character.scripts)
            .where(Script.id == script_id)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def update_emotional_profile(
        self,
        character_id: int,
        emotional_data: Dict[str, Any]
    ) -> Optional[Character]:
        """Update character's emotional profile."""
        return await self.update(
            character_id,
            {"emotional_profile": emotional_data}
        )
    
    async def search_characters_by_name(
        self,
        name_pattern: str,
        limit: int = 10
    ) -> List[Character]:
        """Search characters by name pattern using the name index."""
        query = (
            select(Character)
            .where(Character.name.ilike(f"%{name_pattern}%"))
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_characters_with_voice_settings(self) -> List[Character]:
        """Get characters that have voice settings configured."""
        query = (
            select(Character)
            .where(Character.voice_settings.is_not(None))
        )
        result = await self.session.execute(query)
        return result.scalars().all()

class SceneRepository(BaseRepository[Scene]):
    """Repository for Scene model operations."""
    
    async def get_by_script_and_number(
        self,
        script_id: int,
        scene_number: int
    ) -> Optional[Scene]:
        """Get scene by script ID and scene number."""
        return await self.get_by(
            script_id=script_id,
            scene_number=scene_number
        )
    
    async def get_scenes_with_performances(
        self,
        script_id: int
    ) -> List[Scene]:
        """Get all scenes with their performances."""
        query = (
            select(Scene)
            .where(Scene.script_id == script_id)
            .join(Scene.performances)
        )
        result = await self.session.execute(query)
        return result.unique().scalars().all()
    
    async def get_high_intensity_scenes(
        self,
        threshold: float = 0.8,
        limit: int = 10
    ) -> List[Scene]:
        """Get high intensity scenes using the intensity index."""
        return await self.list(
            filters={"intensity_score": {">=": threshold}},
            limit=limit,
            order_by="-intensity_score"
        )
    
    async def get_scene_sequence(
        self,
        script_id: int,
        start_number: int,
        count: int
    ) -> List[Scene]:
        """Get a sequence of scenes using the script_number index."""
        query = (
            select(Scene)
            .where(
                and_(
                    Scene.script_id == script_id,
                    Scene.scene_number >= start_number,
                    Scene.scene_number < start_number + count
                )
            )
            .order_by(Scene.scene_number)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

class PracticeSessionRepository(BaseRepository[PracticeSession]):
    """Repository for PracticeSession model operations."""
    
    async def get_active_sessions(self) -> List[PracticeSession]:
        """Get all active practice sessions."""
        return await self.list(filters={"is_active": True})
    
    async def end_session(self, session_id: int) -> Optional[PracticeSession]:
        """End a practice session."""
        return await self.update(
            session_id,
            {
                "is_active": False,
                "ended_at": datetime.utcnow()
            }
        )
    
    async def get_active_sessions_by_script(
        self,
        script_id: int
    ) -> List[PracticeSession]:
        """Get active sessions for a script using combined indexes."""
        return await self.list(
            filters={
                "script_id": script_id,
                "is_active": True
            },
            order_by="-started_at"
        )
    
    async def get_recent_sessions_with_participants(
        self,
        hours: int = 24,
        min_participants: int = 2
    ) -> List[PracticeSession]:
        """Get recent sessions with minimum participants."""
        threshold = datetime.utcnow() - timedelta(hours=hours)
        query = (
            select(PracticeSession)
            .join(PracticeSession.participants)
            .group_by(PracticeSession.id)
            .having(func.count(User.id) >= min_participants)
            .where(PracticeSession.started_at >= threshold)
            .order_by(desc(PracticeSession.started_at))
        )
        result = await self.session.execute(query)
        return result.unique().scalars().all()

class PerformanceRepository(BaseRepository[Performance]):
    """Repository for Performance model operations."""
    
    async def get_user_performances(
        self,
        user_id: int,
        limit: int = 10
    ) -> List[Performance]:
        """Get user's recent performances."""
        return await self.list(
            filters={"user_id": user_id},
            order_by="-start_time",
            limit=limit
        )
    
    async def get_scene_performances(
        self,
        scene_id: int
    ) -> List[Performance]:
        """Get all performances for a scene."""
        return await self.list(
            filters={"scene_id": scene_id},
            order_by="-start_time"
        )
    
    async def get_user_performance_stats(
        self,
        user_id: int,
        days: int = 30
    ) -> Dict[str, float]:
        """Get user performance statistics using score indexes."""
        threshold = datetime.utcnow() - timedelta(days=days)
        query = (
            select(
                func.avg(Performance.emotion_accuracy).label("avg_emotion"),
                func.avg(Performance.timing_score).label("avg_timing"),
                func.avg(Performance.pronunciation_score).label("avg_pronunciation"),
                func.avg(Performance.overall_score).label("avg_overall")
            )
            .where(
                and_(
                    Performance.user_id == user_id,
                    Performance.start_time >= threshold
                )
            )
        )
        result = await self.session.execute(query)
        row = result.first()
        return {
            "emotion_accuracy": row.avg_emotion or 0.0,
            "timing_score": row.avg_timing or 0.0,
            "pronunciation_score": row.avg_pronunciation or 0.0,
            "overall_score": row.avg_overall or 0.0
        }
    
    async def get_top_performers(
        self,
        limit: int = 10,
        days: int = 30
    ) -> List[Tuple[User, float]]:
        """Get top performers using score indexes."""
        threshold = datetime.utcnow() - timedelta(days=days)
        query = (
            select(
                User,
                func.avg(Performance.overall_score).label("avg_score")
            )
            .join(Performance.user)
            .where(Performance.start_time >= threshold)
            .group_by(User.id)
            .order_by(desc("avg_score"))
            .limit(limit)
        )
        result = await self.session.execute(query)
        return [(row.User, row.avg_score) for row in result]
    
    async def get_character_performances(
        self,
        character_id: int,
        limit: int = 10
    ) -> List[Performance]:
        """Get performances for a character using character index."""
        return await self.list(
            filters={"character_id": character_id},
            order_by="-start_time",
            limit=limit
        )

class RecordingRepository(BaseRepository[Recording]):
    """Repository for Recording model operations."""
    
    async def get_by_performance(
        self,
        performance_id: int
    ) -> List[Recording]:
        """Get all recordings for a performance."""
        return await self.list(
            filters={"performance_id": performance_id},
            order_by="created_at"
        )
    
    async def get_recent_recordings_with_emotion(
        self,
        emotion: str,
        limit: int = 10
    ) -> List[Recording]:
        """Get recent recordings with specific emotion."""
        query = (
            select(Recording)
            .where(Recording.emotion_analysis["primary_emotion"].astext == emotion)
            .order_by(desc(Recording.created_at))
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_performance_recordings_ordered(
        self,
        performance_id: int
    ) -> List[Recording]:
        """Get all recordings for a performance in chronological order."""
        return await self.list(
            filters={"performance_id": performance_id},
            order_by="created_at"
        )

class FeedbackRepository(BaseRepository[Feedback]):
    """Repository for Feedback model operations."""
    
    async def get_user_received_feedback(
        self,
        user_id: int,
        limit: int = 10
    ) -> List[Feedback]:
        """Get feedback received by a user."""
        return await self.list(
            filters={"to_user_id": user_id},
            order_by="-created_at",
            limit=limit
        )
    
    async def get_user_feedback_summary(
        self,
        user_id: int,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get feedback summary for a user using feedback indexes."""
        threshold = datetime.utcnow() - timedelta(days=days)
        given_query = (
            select(func.count(Feedback.id))
            .where(
                and_(
                    Feedback.from_user_id == user_id,
                    Feedback.created_at >= threshold
                )
            )
        )
        received_query = (
            select(func.avg(Feedback.content["score"].as_float()))
            .where(
                and_(
                    Feedback.to_user_id == user_id,
                    Feedback.created_at >= threshold
                )
            )
        )
        given_count = await self.session.execute(given_query)
        avg_score = await self.session.execute(received_query)
        return {
            "feedback_given": given_count.scalar() or 0,
            "average_score": float(avg_score.scalar() or 0.0)
        }
    
    async def get_session_feedback_pairs(
        self,
        session_id: int
    ) -> List[Tuple[Feedback, Feedback]]:
        """Get reciprocal feedback pairs in a session."""
        query = (
            select(Feedback)
            .where(Feedback.session_id == session_id)
            .order_by(Feedback.created_at)
        )
        result = await self.session.execute(query)
        feedbacks = result.scalars().all()
        
        # Group feedbacks into pairs
        pairs = []
        feedback_dict = {}
        for feedback in feedbacks:
            key = tuple(sorted([feedback.from_user_id, feedback.to_user_id]))
            if key in feedback_dict:
                pairs.append((feedback_dict[key], feedback))
            else:
                feedback_dict[key] = feedback
        return pairs

class TTSCacheRepository(BaseRepository[TTSCache]):
    """Repository for TTSCache model operations."""
    
    async def get_cached_audio(
        self,
        text: str,
        voice_id: str,
        settings: Dict[str, Any]
    ) -> Optional[TTSCache]:
        """Get cached TTS output using the lookup index."""
        return await self.get_by(
            text=text,
            voice_id=voice_id,
            settings=settings
        )
    
    async def increment_access_count(self, cache_id: int) -> Optional[TTSCache]:
        """Increment the access count for a cached item."""
        cache = await self.get(cache_id)
        if cache:
            return await self.update(
                cache_id,
                {
                    "access_count": cache.access_count + 1,
                    "last_accessed": datetime.utcnow()
                }
            )
        return None
    
    async def cleanup_old_cache_entries(
        self,
        days_threshold: int = 30,
        access_count_threshold: int = 5
    ) -> int:
        """Clean up old and rarely used cache entries using access indexes."""
        threshold_date = datetime.utcnow() - timedelta(days=days_threshold)
        query = (
            delete(TTSCache)
            .where(
                or_(
                    TTSCache.last_accessed < threshold_date,
                    and_(
                        TTSCache.access_count < access_count_threshold,
                        TTSCache.created_at < threshold_date
                    )
                )
            )
        )
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount 