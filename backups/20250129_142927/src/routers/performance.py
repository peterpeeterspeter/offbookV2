from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json
from datetime import datetime, timedelta

from ..database.config import get_async_session as get_session
from ..database.models import Session, Performance, Feedback, User
from .auth import get_current_user
from ..services.performance_monitor import performance_monitor

router = APIRouter()

@router.post("/{session_id}/record")
async def record_performance(
    session_id: int,
    performance_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Record performance data for a practice session."""
    # Verify session exists and belongs to user
    query = """
        SELECT id
        FROM sessions
        WHERE id = :session_id AND user_id = :user_id
    """
    result = await session.execute(
        query,
        {
            "session_id": session_id,
            "user_id": current_user.id
        }
    )
    if not result.first():
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create performance record
    query = """
        INSERT INTO performances (session_id, data, recorded_at)
        VALUES (:session_id, :data, NOW())
        RETURNING id, recorded_at
    """
    result = await session.execute(
        query,
        {
            "session_id": session_id,
            "data": json.dumps(performance_data)
        }
    )
    performance = result.first()
    await session.commit()
    
    return {
        "performance_id": performance.id,
        "recorded_at": performance.recorded_at.isoformat()
    }

@router.get("/{session_id}/history")
async def get_performance_history(
    session_id: int,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get performance history for a practice session."""
    query = """
        SELECT p.id, p.data, p.recorded_at
        FROM performances p
        JOIN sessions s ON p.session_id = s.id
        WHERE s.id = :session_id AND s.user_id = :user_id
        ORDER BY p.recorded_at DESC
    """
    result = await session.execute(
        query,
        {
            "session_id": session_id,
            "user_id": current_user.id
        }
    )
    performances = result.fetchall()
    
    return [
        {
            "id": p.id,
            "data": json.loads(p.data),
            "recorded_at": p.recorded_at.isoformat()
        }
        for p in performances
    ]

@router.post("/{session_id}/feedback")
async def add_feedback(
    session_id: int,
    feedback_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Add feedback for a practice session."""
    # Verify session exists and belongs to user
    query = """
        SELECT id
        FROM sessions
        WHERE id = :session_id AND user_id = :user_id
    """
    result = await session.execute(
        query,
        {
            "session_id": session_id,
            "user_id": current_user.id
        }
    )
    if not result.first():
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create feedback record
    query = """
        INSERT INTO feedback (session_id, content, created_at)
        VALUES (:session_id, :content, NOW())
        RETURNING id, created_at
    """
    result = await session.execute(
        query,
        {
            "session_id": session_id,
            "content": json.dumps(feedback_data)
        }
    )
    feedback = result.first()
    await session.commit()
    
    return {
        "feedback_id": feedback.id,
        "created_at": feedback.created_at.isoformat()
    }

@router.get("/{session_id}/feedback")
async def get_feedback(
    session_id: int,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Get feedback for a practice session."""
    query = """
        SELECT f.id, f.content, f.created_at
        FROM feedback f
        JOIN sessions s ON f.session_id = s.id
        WHERE s.id = :session_id AND s.user_id = :user_id
        ORDER BY f.created_at DESC
    """
    result = await session.execute(
        query,
        {
            "session_id": session_id,
            "user_id": current_user.id
        }
    )
    feedback_items = result.fetchall()
    
    return [
        {
            "id": f.id,
            "content": json.loads(f.content),
            "created_at": f.created_at.isoformat()
        }
        for f in feedback_items
    ]

@router.get("/metrics")
async def get_performance_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Get performance metrics for the current user."""
    try:
        # Get recent sessions
        query = await db.execute(
            """
            SELECT s.id, s.start_time, r.emotion_analysis
            FROM sessions s
            JOIN recordings r ON r.performance_id = s.id
            WHERE s.user_id = :user_id
            AND s.start_time > :cutoff_date
            ORDER BY s.start_time DESC
            """,
            {
                "user_id": current_user.id,
                "cutoff_date": datetime.now() - timedelta(days=30)
            }
        )
        
        sessions = query.fetchall()
        
        # Calculate metrics
        total_sessions = len(sessions)
        if total_sessions == 0:
            return {
                "message": "No recent practice sessions found",
                "metrics": None
            }
            
        performance_scores = []
        accuracy_scores = []
        timing_scores = []
        
        for session in sessions:
            analysis = json.loads(session.emotion_analysis)
            metrics = analysis.get("performance_metrics", {})
            
            performance_scores.append(metrics.get("overall_score", 0))
            accuracy_scores.append(analysis.get("accuracy", {}).get("score", 0))
            timing_scores.append(metrics.get("timing_score", 0))
        
        return {
            "total_sessions": total_sessions,
            "metrics": {
                "average_performance": sum(performance_scores) / len(performance_scores),
                "average_accuracy": sum(accuracy_scores) / len(accuracy_scores),
                "average_timing": sum(timing_scores) / len(timing_scores),
                "improvement_rate": (performance_scores[0] - performance_scores[-1]) 
                    if len(performance_scores) > 1 else 0,
                "session_frequency": total_sessions / 30  # sessions per day
            },
            "trends": {
                "performance": performance_scores,
                "accuracy": accuracy_scores,
                "timing": timing_scores
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/suggestions")
async def get_performance_suggestions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Get personalized performance improvement suggestions."""
    try:
        # Get recent session analyses
        query = await db.execute(
            """
            SELECT r.emotion_analysis
            FROM sessions s
            JOIN recordings r ON r.performance_id = s.id
            WHERE s.user_id = :user_id
            AND s.start_time > :cutoff_date
            ORDER BY s.start_time DESC
            LIMIT 5
            """,
            {
                "user_id": current_user.id,
                "cutoff_date": datetime.now() - timedelta(days=30)
            }
        )
        
        sessions = query.fetchall()
        if not sessions:
            return {
                "message": "No recent sessions found",
                "suggestions": [
                    "Start practicing regularly to get personalized suggestions",
                    "Try recording different scenes to improve versatility",
                    "Focus on both emotional delivery and technical accuracy"
                ]
            }
        
        # Analyze common patterns
        emotion_scores = []
        pronunciation_scores = []
        timing_scores = []
        all_suggestions = []
        
        for session in sessions:
            analysis = json.loads(session.emotion_analysis)
            metrics = analysis.get("performance_metrics", {})
            
            emotion_scores.append(metrics.get("emotion_score", 0))
            pronunciation_scores.append(metrics.get("pronunciation_score", 0))
            timing_scores.append(metrics.get("timing_score", 0))
            all_suggestions.extend(analysis.get("suggestions", []))
        
        # Generate personalized suggestions
        suggestions = []
        
        # Emotion suggestions
        avg_emotion = sum(emotion_scores) / len(emotion_scores)
        if avg_emotion < 0.7:
            suggestions.append(
                "Focus on emotional expression - try exaggerating emotions during practice"
            )
        
        # Pronunciation suggestions
        avg_pronunciation = sum(pronunciation_scores) / len(pronunciation_scores)
        if avg_pronunciation < 0.7:
            suggestions.append(
                "Work on clear pronunciation - practice difficult words separately"
            )
        
        # Timing suggestions
        avg_timing = sum(timing_scores) / len(timing_scores)
        if avg_timing < 0.7:
            suggestions.append(
                "Improve timing and pacing - try marking pauses in your script"
            )
        
        # Add most common specific suggestions
        from collections import Counter
        common_suggestions = Counter(all_suggestions).most_common(3)
        suggestions.extend(sugg for sugg, _ in common_suggestions)
        
        return {
            "performance_areas": {
                "emotion": avg_emotion,
                "pronunciation": avg_pronunciation,
                "timing": avg_timing
            },
            "suggestions": suggestions
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/monitor")
async def get_monitoring_stats():
    """Get system performance monitoring statistics."""
    try:
        stats = performance_monitor.get_performance_summary()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 