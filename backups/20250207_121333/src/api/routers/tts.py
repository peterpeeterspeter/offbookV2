from fastapi import APIRouter, HTTPException, Response
from typing import Dict, List, Optional
from pydantic import BaseModel

from ...services.tts_service import (
    tts_service,
    TTSRequest,
    VoiceSettings,
    VoiceModel
)

router = APIRouter(prefix="/tts", tags=["tts"])

class TTSGenerationRequest(BaseModel):
    """Request for text-to-speech generation."""
    text: str
    voice_id: str
    stability: Optional[float] = None
    similarity_boost: Optional[float] = None
    style: Optional[float] = None
    use_speaker_boost: Optional[bool] = None
    model_id: Optional[str] = None

@router.post("/generate")
async def generate_speech(request: TTSGenerationRequest) -> Response:
    """Generate speech from text."""
    try:
        # Create voice settings if any parameters provided
        settings = None
        if any([
            request.stability is not None,
            request.similarity_boost is not None,
            request.style is not None,
            request.use_speaker_boost is not None
        ]):
            settings = VoiceSettings(
                stability=request.stability or 0.5,
                similarity_boost=request.similarity_boost or 0.75,
                style=request.style or 0.0,
                use_speaker_boost=request.use_speaker_boost or True
            )
        
        # Create TTS request
        tts_request = TTSRequest(
            text=request.text,
            voice_id=request.voice_id,
            settings=settings,
            model_id=request.model_id or "eleven_multilingual_v2"
        )
        
        # Generate speech
        response = await tts_service.generate_speech(tts_request)
        
        # Return audio data with appropriate headers
        return Response(
            content=response.audio_data,
            media_type="audio/mpeg",
            headers={
                "X-Audio-Duration": str(response.duration),
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/voices")
async def get_voices() -> List[VoiceModel]:
    """Get list of available voices."""
    try:
        return await tts_service.refresh_voice_list()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/voice/{voice_id}/settings")
async def get_voice_settings(voice_id: str) -> Optional[VoiceSettings]:
    """Get settings for a specific voice."""
    try:
        settings = await tts_service.get_voice_settings(voice_id)
        if settings is None:
            raise HTTPException(
                status_code=404,
                detail=f"Voice {voice_id} not found"
            )
        return settings
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/cache/clear")
async def clear_cache(voice_id: Optional[str] = None) -> Dict:
    """Clear the TTS cache."""
    try:
        tts_service.clear_cache(voice_id)
        return {
            "status": "success",
            "message": f"Cache cleared for {'all voices' if voice_id is None else f'voice {voice_id}'}"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/cache/stats")
async def get_cache_stats() -> Dict:
    """Get statistics about the TTS cache."""
    try:
        return tts_service.get_cache_stats()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 