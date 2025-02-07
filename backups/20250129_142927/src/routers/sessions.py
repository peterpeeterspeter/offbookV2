from fastapi import APIRouter, HTTPException, Depends, WebSocket, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
import json
from datetime import datetime
import numpy as np
import soundfile as sf
import io
from pydantic import BaseModel

from ..database.config import get_async_session as get_session
from ..database.models import User, Script, Session
from .auth import get_current_user
from ..services.whisper import whisper_service
from ..services.performance_monitor import performance_monitor
from ..services.performance_analysis import performance_analysis

router = APIRouter()

class SessionSettings(BaseModel):
    """Settings for a practice session."""
    character_name: str
    scene_number: int

class CreateSessionRequest(BaseModel):
    """Request body for creating a new session."""
    script_id: int
    settings: SessionSettings

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_session(
    request: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Create a new practice session."""
    try:
        # Verify script exists and belongs to user
        query = await db.execute(
            text("""
            SELECT id FROM scripts
            WHERE id = :script_id AND user_id = :user_id
            """),
            {
                "script_id": request.script_id,
                "user_id": current_user.id
            }
        )
        
        if not query.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found or does not belong to user"
            )
        
        # Create session with settings
        query = await db.execute(
            text("""
            INSERT INTO sessions (script_id, title, settings, created_at, updated_at)
            VALUES (:script_id, :title, :settings, :created_at, :updated_at)
            RETURNING id
            """),
            {
                "script_id": request.script_id,
                "title": f"Practice Session {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "settings": json.dumps(request.settings.model_dump()),
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
        )
        
        session_id = query.scalar_one()
        
        # Link user to session
        await db.execute(
            text("""
            INSERT INTO session_users (session_id, user_id)
            VALUES (:session_id, :user_id)
            """),
            {
                "session_id": session_id,
                "user_id": current_user.id
            }
        )
        
        await db.commit()
        
        return {
            "id": session_id,
            "title": f"Practice Session {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "settings": request.settings.model_dump()
        }
        
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Upload and analyze a recording for a session."""
    try:
        # Verify session exists and belongs to user
        query = await db.execute(
            text("""
            SELECT s.id, s.script_id, sc.content
            FROM sessions s
            JOIN scripts sc ON s.script_id = sc.id
            JOIN session_users su ON s.id = su.session_id
            WHERE s.id = :session_id AND su.user_id = :user_id
            """),
            {
                "session_id": session_id,
                "user_id": current_user.id
            }
        )
        
        session = query.fetchone()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or does not belong to user"
            )
        
        # Read and process audio file
        audio_data = await file.read()
        audio_array, sample_rate = sf.read(io.BytesIO(audio_data))
        
        # Convert script content to string and analyze recording
        script_content = str(session.content) if session.content else ""
        print(f"Script content: {script_content[:100]}...")  # Debug log
        
        # First save the recording
        recording_filename = f"recordings/{session_id}_{datetime.now().timestamp()}.wav"
        query = await db.execute(
            text("""
            INSERT INTO recordings (
                session_id,
                audio_path,
                created_at
            )
            VALUES (
                :session_id,
                :audio_path,
                :created_at
            )
            RETURNING id
            """),
            {
                "session_id": session_id,
                "audio_path": recording_filename,
                "created_at": datetime.now()
            }
        )
        
        recording_id = query.scalar_one()
        
        # Perform analysis
        analysis_result = await performance_analysis.analyze_performance(
            audio_array,
            script_content,
            sample_rate
        )
        
        # Save analysis results
        query = await db.execute(
            text("""
            INSERT INTO recording_analyses (
                recording_id,
                transcription,
                accuracy_score,
                timing_score,
                pronunciation_score,
                emotion_score,
                overall_score,
                suggestions,
                created_at
            )
            VALUES (
                :recording_id,
                :transcription,
                :accuracy_score,
                :timing_score,
                :pronunciation_score,
                :emotion_score,
                :overall_score,
                :suggestions,
                :created_at
            )
            RETURNING id
            """),
            {
                "recording_id": recording_id,
                "transcription": analysis_result["accuracy"]["text"],
                "accuracy_score": analysis_result["accuracy"]["score"],
                "timing_score": analysis_result["performance_metrics"]["timing_score"],
                "pronunciation_score": analysis_result["performance_metrics"]["pronunciation_score"],
                "emotion_score": analysis_result["performance_metrics"]["emotion_score"],
                "overall_score": analysis_result["performance_metrics"]["overall_score"],
                "suggestions": json.dumps(analysis_result["suggestions"]),
                "created_at": datetime.now()
            }
        )
        
        analysis_id = query.scalar_one()
        await db.commit()
        
        return {
            "id": recording_id,
            "analysis": {
                "id": analysis_id,
                "accuracy": {
                    "text": analysis_result["accuracy"]["text"],
                    "score": analysis_result["accuracy"]["score"]
                },
                "performance_metrics": analysis_result["performance_metrics"],
                "suggestions": analysis_result["suggestions"]
            }
        }
        
    except Exception as e:
        await db.rollback()
        print(f"Error in upload_recording: {str(e)}")  # Add debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{session_id}/analysis")
async def get_session_analysis(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
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
    db: AsyncSession = Depends(get_session)
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
    db: AsyncSession = Depends(get_session)
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