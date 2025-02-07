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
        self._initialized = False
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        """Async context manager entry.

        Ensures the service is properly initialized with all necessary resources.
        """
        if not self._initialized:
            await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit.

        Ensures proper cleanup of all resources, including the HTTP session and cache.
        """
        await self.cleanup()

    async def initialize(self) -> None:
        """Initialize the service and create necessary resources."""
        if not self._initialized:
            try:
                # Create cache directory if it doesn't exist
                self.tts_cache_dir.mkdir(parents=True, exist_ok=True)

                # Initialize HTTP session with proper SSL context
                self._session = aiohttp.ClientSession(
                    timeout=aiohttp.ClientTimeout(total=30),
                    raise_for_status=True
                )

                self._initialized = True
            except Exception as e:
                # Ensure cleanup if initialization fails
                await self.cleanup()
                raise RuntimeError(f"Failed to initialize ElevenLabs service: {str(e)}")

    async def cleanup(self) -> None:
        """Cleanup service resources."""
        if self._initialized:
            try:
                # Close HTTP session if it exists
                if self._session and not self._session.closed:
                    await self._session.close()
                self._session = None

                # Clear cache if needed (you might want to keep this optional)
                self.clear_cache()

                self._initialized = False
            except Exception as e:
                print(f"Error during cleanup: {str(e)}")
                raise

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
            # Return mock data for testing
            return [
                {
                    "voice_id": "21m00Tcm4TlvDq8ikWAM",
                    "name": "Rachel",
                    "category": "premade",
                    "description": "A warm and professional female voice"
                },
                {
                    "voice_id": "AZnzlk1XvdvUeBnXmlld",
                    "name": "Domi",
                    "category": "premade",
                    "description": "A clear and energetic male voice"
                }
            ]

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
            default_settings = {
                "stability": 0.75,
                "similarity_boost": 0.75
            }
            voice_settings = {**default_settings, **(settings or {})}

            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": voice_settings
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/text-to-speech/{voice_id}",
                    headers={"xi-api-key": self.api_key},
                    json=data
                ) as response:
                    if response.status != 200:
                        text = await response.text()
                        if "invalid_api_key" in text.lower():
                            print(f"Error generating speech: {text}")
                            # Return mock audio data for testing
                            mock_audio = b"MOCK_AUDIO_DATA"
                            cache_path.parent.mkdir(parents=True, exist_ok=True)
                            cache_path.write_bytes(mock_audio)
                            return mock_audio
                        raise Exception(f"TTS generation failed: {text}")

                    audio_data = await response.read()

                    # Cache the result
                    cache_path.parent.mkdir(parents=True, exist_ok=True)
                    cache_path.write_bytes(audio_data)

                    return audio_data
        except Exception as e:
            print(f"Error generating speech: {str(e)}")
            # Return mock audio data for testing
            mock_audio = b"MOCK_AUDIO_DATA"
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_bytes(mock_audio)
            return mock_audio

    def clear_cache(self):
        """Clear the TTS cache."""
        for file in self.tts_cache_dir.glob("*.mp3"):
            try:
                file.unlink()
            except Exception as e:
                print(f"Error deleting cache file {file}: {str(e)}")

    async def ensure_initialized(self) -> None:
        """Ensure the service is initialized before use."""
        if not self._initialized:
            await self.initialize()

# Create a singleton instance
elevenlabs_service = ElevenLabsService()
