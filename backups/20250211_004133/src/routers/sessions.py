from fastapi import APIRouter, HTTPException, Depends, WebSocket, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.future import select
from typing import List, Optional
import json
from datetime import datetime, UTC
import numpy as np
import soundfile as sf
import io
from pydantic import BaseModel

from ..database.config import get_db
from ..database.models import User, Script, Session, Recording, RecordingAnalysis
from .auth import get_current_user
from ..services.whisper import whisper_service
from ..services.performance_monitor import performance_monitor
from ..services.performance_analysis import performance_analysis
from ..schemas.sessions import SessionCreate, SessionResponse, SessionUpdate

router = APIRouter(
    prefix="/sessions",
    tags=["sessions"]
)

class SessionSettings(BaseModel):
    """Settings for a practice session."""
    character_name: str
    scene_number: int

class CreateSessionRequest(BaseModel):
    """Request body for creating a new session."""
    script_id: int
    settings: SessionSettings

@router.post("/", response_model=SessionResponse)
@router.post("/create", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new session."""
    try:
        # Verify script exists and belongs to user
        script_result = await db.execute(
            select(Script)
            .where(Script.id == session_data.script_id)
            .where(Script.user_id == current_user.id)
        )
        script = script_result.scalar_one_or_none()

        if not script:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found"
            )

        new_session = Session(
            script_id=session_data.script_id,
            title=session_data.title,
            content=session_data.content,
            settings=session_data.settings or {}
        )

        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)

        return new_session
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[SessionResponse])
async def get_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 10
):
    """Get all sessions for the current user's scripts."""
    try:
        result = await db.execute(
            select(Session)
            .join(Script)
            .where(Script.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
        )
        sessions = result.scalars().all()
        return sessions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific session by ID."""
    try:
        result = await db.execute(
            select(Session)
            .join(Script)
            .where(Session.id == session_id)
            .where(Script.user_id == current_user.id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_update: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a session."""
    try:
        result = await db.execute(
            select(Session)
            .join(Script)
            .where(Session.id == session_id)
            .where(Script.user_id == current_user.id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Update fields
        for field, value in session_update.dict(exclude_unset=True).items():
            setattr(session, field, value)

        session.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(session)

        return session
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a session."""
    try:
        result = await db.execute(
            select(Session)
            .join(Script)
            .where(Session.id == session_id)
            .where(Script.user_id == current_user.id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        await db.delete(session)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{session_id}/recordings")
async def upload_recording(
    session_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and analyze a recording for a session."""
    try:
        # Verify session exists and belongs to user
        result = await db.execute(
            select(Session)
            .join(Script)
            .where(Session.id == session_id)
            .where(Script.user_id == current_user.id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Save audio file
        audio_path = f"recordings/{session_id}_{datetime.now(UTC).timestamp()}.wav"
        with open(audio_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Create recording entry
        recording = Recording(
            session_id=session_id,
            audio_path=audio_path
        )
        db.add(recording)
        await db.commit()
        await db.refresh(recording)

        # Process recording
        transcription = await whisper_service.transcribe_audio(audio_path)
        performance_metrics = await performance_monitor.analyze_performance(
            audio_path,
            transcription,
            session.content
        )

        # Create analysis entry
        analysis = RecordingAnalysis(
            recording_id=recording.id,
            transcription=transcription,
            accuracy_score=performance_metrics["accuracy"],
            timing_score=performance_metrics["timing"],
            pronunciation_score=performance_metrics["pronunciation"],
            emotion_score=performance_metrics["emotion"],
            overall_score=performance_metrics["overall"],
            suggestions=performance_metrics["suggestions"]
        )
        db.add(analysis)
        await db.commit()

        return {
            "recording_id": recording.id,
            "transcription": transcription,
            "performance_metrics": performance_metrics
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{session_id}/analysis")
async def get_session_analysis(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get analysis for a practice session."""
    try:
        # Verify session exists and belongs to user
        query = await db.execute(
            text("""
            SELECT s.id
            FROM sessions s
            JOIN session_users su ON s.id = su.session_id
            WHERE s.id = :session_id AND su.user_id = :user_id
            """),
            {
                "session_id": session_id,
                "user_id": current_user.id
            }
        )

        if not query.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or does not belong to user"
            )

        # Get latest recording analysis for the session
        query = await db.execute(
            text("""
            SELECT
                ra.transcription,
                ra.accuracy_score,
                ra.timing_score,
                ra.pronunciation_score,
                ra.emotion_score,
                ra.overall_score,
                ra.suggestions
            FROM recordings r
            JOIN recording_analyses ra ON ra.recording_id = r.id
            WHERE r.session_id = :session_id
            ORDER BY r.created_at DESC, ra.created_at DESC
            LIMIT 1
            """),
            {
                "session_id": session_id
            }
        )

        result = query.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No recordings found for this session"
            )

        # Parse suggestions - handle both string and list formats
        try:
            suggestions = json.loads(result.suggestions) if isinstance(result.suggestions, str) else result.suggestions
        except (json.JSONDecodeError, TypeError):
            suggestions = []

        # Structure the response to match expected format
        return {
            "accuracy": {
                "text": result.transcription or "",
                "score": float(result.accuracy_score or 0.0)
            },
            "timing": float(result.timing_score or 0.0),  # Add timing at top level
            "performance_metrics": {
                "timing_score": float(result.timing_score or 0.0),
                "pronunciation_score": float(result.pronunciation_score or 0.0),
                "emotion_score": float(result.emotion_score or 0.0),
                "overall_score": float(result.overall_score or 0.0)
            },
            "suggestions": suggestions
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_session_analysis: {str(e)}")  # Add debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{session_id}/feedback")
async def get_session_feedback(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get feedback for a practice session."""
    try:
        # Get session recordings and generate feedback
        query = await db.execute(
            text("""
            SELECT ra.transcription, ra.accuracy_score, ra.timing_score,
                   ra.pronunciation_score, ra.emotion_score, ra.overall_score,
                   ra.suggestions, s.settings
            FROM sessions s
            JOIN session_users su ON s.id = su.session_id
            JOIN recordings r ON r.session_id = s.id
            JOIN recording_analyses ra ON ra.recording_id = r.id
            WHERE s.id = :session_id AND su.user_id = :user_id
            ORDER BY r.created_at DESC
            LIMIT 1
            """),
            {
                "session_id": session_id,
                "user_id": current_user.id
            }
        )

        result = query.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No recordings found for this session"
            )

        # Parse suggestions - handle both string and list formats
        try:
            suggestions = json.loads(result.suggestions) if isinstance(result.suggestions, str) else result.suggestions or []
        except (json.JSONDecodeError, TypeError, AttributeError):
            suggestions = []

        # Parse settings - handle both string and dict formats
        try:
            settings = json.loads(result.settings) if isinstance(result.settings, str) else result.settings or {}
        except (json.JSONDecodeError, TypeError, AttributeError):
            settings = {}

        # Generate feedback based on analysis
        feedback = {
            "performance_score": float(result.overall_score or 0.0),
            "accuracy_score": float(result.accuracy_score or 0.0),
            "suggestions": suggestions,
            "settings": settings,  # Include settings in response
            "improvements": [
                "Practice the lines with more emotion" if float(result.emotion_score or 0.0) < 0.7 else "Good emotional delivery",
                "Work on pronunciation" if float(result.pronunciation_score or 0.0) < 0.7 else "Clear pronunciation",
                "Improve timing" if float(result.timing_score or 0.0) < 0.7 else "Good timing"
            ]
        }

        return feedback

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_session_feedback: {str(e)}")  # Add debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.websocket("/{session_id}/ws")
async def session_websocket(
    websocket: WebSocket,
    session_id: int,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time session interaction."""
    await websocket.accept()

    try:
        # Authenticate user
        current_user = await get_current_user(token, db)

        # Verify session
        query = """
            SELECT s.id, s.script_id,
                   sc.content as script_content
            FROM sessions s
            JOIN scripts sc ON s.script_id = sc.id
            WHERE s.id = :session_id AND s.user_id = :user_id
        """
        result = await db.execute(
            query,
            {
                "session_id": session_id,
                "user_id": current_user.id
            }
        )
        session_data = result.first()

        if not session_data:
            await websocket.close(code=4004, reason="Session not found")
            return

        # Handle WebSocket communication
        while True:
            # Receive audio data
            audio_data = await websocket.receive_bytes()

            try:
                # Process audio with Whisper
                start_time = datetime.now()
                transcription = await whisper_service.transcribe(audio_data)

                # Track performance
                duration = (datetime.now() - start_time).total_seconds()
                performance_monitor.track_latency("transcription", duration)

                # Send results back to client
                await websocket.send_json({
                    "type": "transcription",
                    "data": transcription
                })

            except Exception as e:
                performance_monitor.track_error("transcription")
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })

    except Exception as e:
        await websocket.close(code=4000, reason=str(e))

    finally:
        await websocket.close()
