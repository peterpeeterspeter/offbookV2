import os
import json
import aiohttp
import hashlib
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path

class ElevenLabsService:
    """Service for interacting with ElevenLabs API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the ElevenLabs service."""
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        if not self.api_key:
            raise ValueError("ElevenLabs API key not provided")
            
        self.base_url = "https://api.elevenlabs.io/v1"
        self.cache_dir = Path(os.getenv("CACHE_DIR", "./cache"))
        self.tts_cache_dir = self.cache_dir / "tts"
        self.tts_cache_dir.mkdir(parents=True, exist_ok=True)
        
    def _get_cache_key(self, text: str, voice_id: str, settings: Optional[Dict] = None) -> str:
        """Generate a cache key for TTS request."""
        data = f"{text}:{voice_id}:{json.dumps(settings or {})}"
        return hashlib.md5(data.encode()).hexdigest()
        
    def _get_cache_path(self, cache_key: str) -> Path:
        """Get the file path for a cached TTS result."""
        return self.tts_cache_dir / f"{cache_key}.mp3"
        
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make a request to the ElevenLabs API."""
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                f"{self.base_url}/{endpoint}",
                headers=headers,
                **kwargs
            ) as response:
                if response.status == 429:
                    raise Exception("Rate limit exceeded")
                elif response.status != 200:
                    text = await response.text()
                    raise Exception(f"API request failed: {text}")
                    
                return await response.json()
                
    async def get_voices(self) -> List[Dict]:
        """Get available voices."""
        try:
            response = await self._make_request("GET", "voices")
            return response["voices"]
        except Exception as e:
            print(f"Error getting voices: {str(e)}")
            return []
            
    async def generate_speech(
        self,
        text: str,
        voice_id: str,
        settings: Optional[Dict] = None
    ) -> bytes:
        """Generate speech from text."""
        cache_key = self._get_cache_key(text, voice_id, settings)
        cache_path = self._get_cache_path(cache_key)
        
        # Check cache first
        if cache_path.exists():
            return cache_path.read_bytes()
            
        # Generate new audio
        try:
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": settings or {}
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/text-to-speech/{voice_id}",
                    headers={"xi-api-key": self.api_key},
                    json=data
                ) as response:
                    if response.status != 200:
                        text = await response.text()
                        raise Exception(f"TTS generation failed: {text}")
                        
                    audio_data = await response.read()
                    
                    # Cache the result
                    cache_path.write_bytes(audio_data)
                    return audio_data
                    
        except Exception as e:
            print(f"Error generating speech: {str(e)}")
            raise
            
    def clear_cache(self):
        """Clear the TTS cache."""
        for file in self.tts_cache_dir.glob("*.mp3"):
            try:
                file.unlink()
            except Exception as e:
                print(f"Error deleting cache file {file}: {str(e)}")

# Create a singleton instance
elevenlabs_service = ElevenLabsService() 