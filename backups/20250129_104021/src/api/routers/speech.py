from fastapi import (
    APIRouter,
    HTTPException,
    UploadFile,
    File,
    WebSocket,
    WebSocketDisconnect
)
from typing import Dict, List, Optional
from pydantic import BaseModel
import numpy as np
import asyncio
import tempfile
import os

from ...services.speech_recognition_service import (
    speech_recognition_service,
    TranscriptionResult,
    AudioSegment
)
from ...services.vad_service import (
    vad_service,
    VADResult,
    SpeechSegment
)

router = APIRouter(prefix="/speech", tags=["speech"])

class TranscriptionRequest(BaseModel):
    """Request for speech transcription."""
    language: Optional[str] = None
    task: str = "transcribe"

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    request: TranscriptionRequest = TranscriptionRequest()
) -> TranscriptionResult:
    """Transcribe uploaded audio file."""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Load audio file
            audio_data, sample_rate = await speech_recognition_service.load_audio(
                temp_path
            )
            
            # Transcribe audio
            result = await speech_recognition_service.transcribe_audio(
                audio_data,
                sample_rate,
                request.language,
                request.task
            )
            
            return result
        finally:
            # Clean up temporary file
            os.unlink(temp_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/detect_speech")
async def detect_speech(
    file: UploadFile = File(...),
) -> List[SpeechSegment]:
    """Detect speech segments in audio file."""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Load audio file
            audio_data, sample_rate = await speech_recognition_service.load_audio(
                temp_path
            )
            
            # Detect speech segments
            segments = await vad_service.process_audio(
                audio_data,
                sample_rate
            )
            
            return segments
        finally:
            # Clean up temporary file
            os.unlink(temp_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/save_segments")
async def save_speech_segments(
    file: UploadFile = File(...),
    output_dir: str = "segments"
) -> List[str]:
    """Save detected speech segments to files."""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Load audio file
            audio_data, sample_rate = await speech_recognition_service.load_audio(
                temp_path
            )
            
            # Detect speech segments
            segments = await vad_service.process_audio(
                audio_data,
                sample_rate
            )
            
            # Save segments
            saved_files = await vad_service.save_segments(
                audio_data,
                segments,
                sample_rate,
                output_dir
            )
            
            return saved_files
        finally:
            # Clean up temporary file
            os.unlink(temp_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/models")
async def get_available_models() -> List[str]:
    """Get list of available speech recognition models."""
    return speech_recognition_service.get_available_models()

@router.get("/model_info")
async def get_model_info() -> Dict:
    """Get information about the current models."""
    return {
        "speech_recognition": speech_recognition_service.get_model_info(),
        "vad": vad_service.get_model_info()
    }

@router.websocket("/stream")
async def stream_audio(websocket: WebSocket):
    """WebSocket endpoint for streaming audio processing."""
    await websocket.accept()
    
    # Create queues for audio streaming
    audio_queue = asyncio.Queue()
    vad_queue = asyncio.Queue()
    transcription_queue = asyncio.Queue()
    
    try:
        # Start VAD and transcription processing
        vad_task = asyncio.create_task(
            vad_service.process_stream(audio_queue)
        )
        transcription_task = asyncio.create_task(
            speech_recognition_service.transcribe_stream(audio_queue)
        )
        
        while True:
            try:
                # Receive audio chunk
                chunk = await websocket.receive_bytes()
                
                # Convert to numpy array (assuming 16-bit PCM)
                audio_data = np.frombuffer(chunk, dtype=np.int16)
                
                # Add to audio queue
                await audio_queue.put(audio_data)
                
                # Get VAD results
                vad_result = await vad_queue.get()
                if isinstance(vad_result, Exception):
                    raise vad_result
                elif vad_result is None:
                    break
                
                # Get transcription results if available
                try:
                    while True:
                        transcription = transcription_queue.get_nowait()
                        if isinstance(transcription, Exception):
                            raise transcription
                        elif transcription is None:
                            break
                        
                        # Send transcription result
                        await websocket.send_json({
                            "type": "transcription",
                            "result": {
                                "text": transcription.text,
                                "language": transcription.language,
                                "confidence": transcription.confidence
                            }
                        })
                except asyncio.QueueEmpty:
                    pass
                
                # Send VAD result
                await websocket.send_json({
                    "type": "vad",
                    "result": {
                        "is_speech": vad_result.is_speech,
                        "confidence": vad_result.confidence
                    }
                })
            
            except WebSocketDisconnect:
                break
    
    finally:
        # Signal end of stream
        await audio_queue.put(None)
        
        # Cancel processing tasks
        vad_task.cancel()
        transcription_task.cancel()
        
        try:
            await vad_task
            await transcription_task
        except asyncio.CancelledError:
            pass 