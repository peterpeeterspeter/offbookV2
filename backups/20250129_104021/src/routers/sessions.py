from fastapi import APIRouter, HTTPException, Depends, WebSocket, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json
from datetime import datetime
import numpy as np
import soundfile as sf
import io

from ..database.config import get_session
from ..database.models import User, Script, Session
from .auth import get_current_user
from ..services.whisper import whisper_service
from ..services.performance_monitor import performance_monitor

router = APIRouter()

@router.post("/create")
async def create_session(
    script_id: int,
    settings: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Create a new practice session."""
    try:
        # Verify script exists and belongs to user
        query = await db.execute(
            """
            SELECT id FROM scripts
            WHERE id = :script_id AND user_id = :user_id
            """,
            {
                "script_id": script_id,
                "user_id": current_user.id
            }
        )
        
        if not query.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found"
            )
        
        # Create session
        query = await db.execute(
            """
            INSERT INTO sessions (user_id, script_id, start_time, settings)
            VALUES (:user_id, :script_id, :start_time, :settings)
            RETURNING id, start_time
            """,
            {
                "user_id": current_user.id,
                "script_id": script_id,
                "start_time": datetime.now(),
                "settings": json.dumps(settings)
            }
        )
        
        result = query.fetchone()
        await db.commit()
        
        return {
            "id": result.id,
            "start_time": result.start_time,
            "settings": settings
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
            """
            SELECT s.id, s.script_id, sc.content
            FROM sessions s
            JOIN scripts sc ON s.script_id = sc.id
            WHERE s.id = :session_id AND s.user_id = :user_id
            """,
            {
                "session_id": session_id,
                "user_id": current_user.id
            }
        )
        
        session = query.fetchone()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Read and process audio file
        audio_data = await file.read()
        audio_array, sample_rate = sf.read(io.BytesIO(audio_data))
        
        # Analyze recording using Whisper
        result = await whisper_service.analyze_performance(
            audio_array,
            session.content
        )
        
        # Save recording
        query = await db.execute(
            """
            INSERT INTO recordings (
                performance_id,
                file_path,
                duration,
                transcription,
                emotion_analysis
            )
            VALUES (
                :performance_id,
                :file_path,
                :duration,
                :transcription,
                :emotion_analysis
            )
            RETURNING id
            """,
            {
                "performance_id": session_id,
                "file_path": f"recordings/{session_id}_{datetime.now().timestamp()}.wav",
                "duration": len(audio_array) / sample_rate,
                "transcription": result["accuracy"]["text"],
                "emotion_analysis": json.dumps(result)
            }
        )
        
        recording_id = query.scalar_one()
        await db.commit()
        
        return {
            "id": recording_id,
            "analysis": result
        }
        
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
    db: AsyncSession = Depends(get_session)
):
    """Get analysis for a practice session."""
    try:
        # Get session recordings and analysis
        query = await db.execute(
            """
            SELECT r.emotion_analysis
            FROM sessions s
            JOIN recordings r ON r.performance_id = s.id
            WHERE s.id = :session_id AND s.user_id = :user_id
            ORDER BY r.created_at DESC
            LIMIT 1
            """,
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
            
        return json.loads(result.emotion_analysis)
        
    except HTTPException:
        raise
    except Exception as e:
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
            """
            SELECT r.emotion_analysis, s.settings
            FROM sessions s
            JOIN recordings r ON r.performance_id = s.id
            WHERE s.id = :session_id AND s.user_id = :user_id
            ORDER BY r.created_at DESC
            LIMIT 1
            """,
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
            
        analysis = json.loads(result.emotion_analysis)
        settings = json.loads(result.settings)
        
        # Generate feedback based on analysis
        feedback = {
            "performance_score": analysis["performance_metrics"]["overall_score"],
            "accuracy_score": analysis["accuracy"]["score"],
            "suggestions": analysis["suggestions"],
            "improvements": [
                "Practice the lines with more emotion" if analysis["performance_metrics"]["emotion_score"] < 0.7 else "Good emotional delivery",
                "Work on pronunciation" if analysis["performance_metrics"]["pronunciation_score"] < 0.7 else "Clear pronunciation",
                "Improve timing" if analysis["performance_metrics"]["timing_score"] < 0.7 else "Good timing"
            ]
        }
        
        return feedback
        
    except HTTPException:
        raise
    except Exception as e:
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