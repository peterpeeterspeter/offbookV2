from dataclasses import dataclass
from typing import Dict, List, Optional
import asyncio
import aiohttp
import json
import os
from datetime import datetime, timedelta
import hashlib
import base64

@dataclass
class VoiceSettings:
    """Settings for voice generation."""
    stability: float = 0.5
    similarity_boost: float = 0.75
    style: float = 0.0
    use_speaker_boost: bool = True

@dataclass
class VoiceModel:
    """Voice model information."""
    voice_id: str
    name: str
    settings: VoiceSettings
    samples: List[str]
    labels: Dict[str, str]

@dataclass
class TTSRequest:
    """Request for text-to-speech generation."""
    text: str
    voice_id: str
    settings: Optional[VoiceSettings] = None
    model_id: str = "eleven_multilingual_v2"

@dataclass
class TTSResponse:
    """Response from text-to-speech generation."""
    audio_data: bytes
    duration: float
    cache_key: str
    timestamp: datetime

class TTSService:
    """Service for text-to-speech generation using ElevenLabs."""
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.base_url = "https://api.elevenlabs.io/v1"
        self.voice_cache: Dict[str, VoiceModel] = {}
        self.audio_cache: Dict[str, TTSResponse] = {}
        self.cache_duration = timedelta(hours=24)
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self) -> None:
        """Initialize the TTS service."""
        if not self.session:
            self.session = aiohttp.ClientSession(
                headers={"xi-api-key": self.api_key}
            )
            await self.refresh_voice_list()
    
    async def close(self) -> None:
        """Close the TTS service."""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def refresh_voice_list(self) -> List[VoiceModel]:
        """Refresh the list of available voices."""
        if not self.session:
            await self.initialize()
        
        async with self.session.get(f"{self.base_url}/voices") as response:
            if response.status == 200:
                voices_data = await response.json()
                for voice in voices_data["voices"]:
                    voice_model = VoiceModel(
                        voice_id=voice["voice_id"],
                        name=voice["name"],
                        settings=VoiceSettings(
                            stability=voice.get("settings", {}).get(
                                "stability",
                                0.5
                            ),
                            similarity_boost=voice.get("settings", {}).get(
                                "similarity_boost",
                                0.75
                            )
                        ),
                        samples=voice.get("samples", []),
                        labels=voice.get("labels", {})
                    )
                    self.voice_cache[voice["voice_id"]] = voice_model
                
                return list(self.voice_cache.values())
            else:
                raise Exception(f"Failed to get voices: {response.status}")
    
    def _generate_cache_key(self, request: TTSRequest) -> str:
        """Generate a cache key for a TTS request."""
        # Create a unique key based on text, voice, and settings
        key_data = {
            "text": request.text,
            "voice_id": request.voice_id,
            "model_id": request.model_id,
            "settings": request.settings.__dict__ if request.settings else None
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return base64.b64encode(
            hashlib.sha256(key_string.encode()).digest()
        ).decode()
    
    def _get_cached_response(self, cache_key: str) -> Optional[TTSResponse]:
        """Get a cached TTS response if available and not expired."""
        if cache_key in self.audio_cache:
            response = self.audio_cache[cache_key]
            if datetime.now() - response.timestamp < self.cache_duration:
                return response
            else:
                del self.audio_cache[cache_key]
        return None
    
    async def generate_speech(
        self,
        request: TTSRequest,
        use_cache: bool = True
    ) -> TTSResponse:
        """Generate speech from text."""
        if not self.session:
            await self.initialize()
        
        # Check cache first
        cache_key = self._generate_cache_key(request)
        if use_cache:
            cached = self._get_cached_response(cache_key)
            if cached:
                return cached
        
        # Prepare request data
        data = {
            "text": request.text,
            "model_id": request.model_id,
            "voice_settings": (
                request.settings.__dict__
                if request.settings
                else VoiceSettings().__dict__
            )
        }
        
        # Make API request
        url = f"{self.base_url}/text-to-speech/{request.voice_id}"
        async with self.session.post(
            url,
            json=data,
            headers={"Accept": "audio/mpeg"}
        ) as response:
            if response.status == 200:
                audio_data = await response.read()
                
                # Get audio duration (if available in headers)
                duration = float(
                    response.headers.get("X-Audio-Duration", 0)
                )
                
                tts_response = TTSResponse(
                    audio_data=audio_data,
                    duration=duration,
                    cache_key=cache_key,
                    timestamp=datetime.now()
                )
                
                # Cache the response
                self.audio_cache[cache_key] = tts_response
                
                return tts_response
            else:
                error_text = await response.text()
                raise Exception(
                    f"Failed to generate speech: {response.status} - {error_text}"
                )
    
    async def get_voice_settings(
        self,
        voice_id: str
    ) -> Optional[VoiceSettings]:
        """Get settings for a specific voice."""
        if voice_id in self.voice_cache:
            return self.voice_cache[voice_id].settings
        
        # Try refreshing voice list if not found
        await self.refresh_voice_list()
        return (
            self.voice_cache[voice_id].settings
            if voice_id in self.voice_cache
            else None
        )
    
    def clear_cache(
        self,
        voice_id: Optional[str] = None
    ) -> None:
        """Clear the audio cache for a specific voice or all voices."""
        if voice_id:
            # Clear cache for specific voice
            self.audio_cache = {
                k: v for k, v in self.audio_cache.items()
                if k.split(":")[0] != voice_id
            }
        else:
            # Clear entire cache
            self.audio_cache.clear()
    
    def get_cache_stats(self) -> Dict:
        """Get statistics about the cache."""
        current_time = datetime.now()
        total_entries = len(self.audio_cache)
        expired_entries = sum(
            1 for r in self.audio_cache.values()
            if current_time - r.timestamp >= self.cache_duration
        )
        total_size = sum(
            len(r.audio_data) for r in self.audio_cache.values()
        )
        
        return {
            "total_entries": total_entries,
            "expired_entries": expired_entries,
            "total_size_bytes": total_size,
            "cache_duration_hours": self.cache_duration.total_seconds() / 3600
        }

# Export singleton instance
tts_service = TTSService() 