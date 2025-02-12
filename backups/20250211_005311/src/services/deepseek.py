import os
import json
import aiohttp
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime, UTC
from pathlib import Path
from enum import Enum
from fastapi import HTTPException

class EmotionType(Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    NEUTRAL = "neutral"

class DeepSeekService:
    """Service for interacting with DeepSeek's API."""

    def __init__(self, api_key: str = None, is_test: bool = False):
        """Initialize the DeepSeek service."""
        self.api_key = api_key or "test_key"
        self.is_test = is_test
        self.base_url = "https://api.deepseek.com/v1"
        self.analysis_cache_dir = Path("cache/deepseek")
        self._initialized = False
        self._session: Optional[aiohttp.ClientSession] = None
        self.last_request = ""

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
                self.analysis_cache_dir.mkdir(parents=True, exist_ok=True)

                # Initialize HTTP session with proper SSL context
                self._session = aiohttp.ClientSession(
                    timeout=aiohttp.ClientTimeout(total=60),
                    raise_for_status=True,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )

                self._initialized = True
            except Exception as e:
                # Ensure cleanup if initialization fails
                await self.cleanup()
                raise RuntimeError(f"Failed to initialize DeepSeek service: {str(e)}")

    async def cleanup(self) -> None:
        """Cleanup service resources."""
        if self._initialized:
            try:
                # Close HTTP session if it exists
                if self._session and not self._session.closed:
                    await self._session.close()
                self._session = None

                # Clear cache if needed
                if self.analysis_cache_dir.exists():
                    for file in self.analysis_cache_dir.glob("*.json"):
                        try:
                            file.unlink()
                        except Exception as e:
                            print(f"Error deleting cache file {file}: {str(e)}")

                self._initialized = False
            except Exception as e:
                print(f"Error during cleanup: {str(e)}")
                raise

    async def ensure_initialized(self) -> None:
        """Ensure the service is initialized before use."""
        if not self._initialized:
            await self.initialize()

    def _get_cache_key(self, analysis_type: str, text: str) -> str:
        """Generate a cache key for analysis request."""
        data = f"{text}:{analysis_type}"
        return hashlib.md5(data.encode()).hexdigest()

    def _get_cache_path(self, cache_key: str) -> Path:
        """Get the file path for a cached analysis result."""
        return self.analysis_cache_dir / f"{cache_key}.json"

    def _get_mock_response(self, endpoint: str) -> Dict:
        """Get a mock response for testing."""
        if "chat/completions" in endpoint:
            if "emotion" in self.last_request.lower():
                return {
                    "choices": [{
                        "message": {
                            "content": json.dumps({
                                "emotions": ["JOY"],
                                "confidence": 0.9,
                                "explanation": "The text expresses happiness."
                            })
                        }
                    }]
                }
            elif "character" in self.last_request.lower():
                return {
                    "choices": [{
                        "message": {
                            "content": json.dumps({
                                "traits": ["PHILOSOPHICAL", "CONTEMPLATIVE"],
                                "confidence": 0.85,
                                "explanation": "The character shows deep thinking."
                            })
                        }
                    }]
                }
            elif "script" in self.last_request.lower():
                return {
                    "choices": [{
                        "message": {
                            "content": json.dumps({
                                "themes": ["CONFLICT", "TENSION"],
                                "tone": "DRAMATIC",
                                "pacing": "MODERATE",
                                "analysis": "A tense confrontation between characters."
                            })
                        }
                    }]
                }
            elif "scene dynamics" in self.last_request.lower():
                return {
                    "choices": [{
                        "message": {
                            "content": json.dumps({
                                "power_dynamics": ["CONFRONTATIONAL"],
                                "emotional_progression": "ESCALATING",
                                "subtext": "Unresolved tension between characters."
                            })
                        }
                    }]
                }
        return {"choices": [{"message": {"content": "Mock response for testing."}}]}

    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make a request to the DeepSeek API."""
        await self.ensure_initialized()

        self.last_request = kwargs.get("json", {}).get("messages", [{}])[0].get("content", "")

        if self.is_test or self.api_key == "test_key":
            return await self._get_mock_response(endpoint)

        try:
            async with self._session.request(
                method,
                f"{self.base_url}/{endpoint}",
                **kwargs
            ) as response:
                if response.status >= 400:
                    error_text = await response.text()
                    try:
                        error_data = json.loads(error_text)
                    except json.JSONDecodeError:
                        error_data = {"error": {"message": error_text}}
                    raise HTTPException(
                        status_code=response.status,
                        detail=error_data.get("error", {}).get("message", "API error")
                    )
                return await response.json()
        except Exception as e:
            if self.is_test:
                return await self._get_mock_response(endpoint)
            raise HTTPException(status_code=500, detail=str(e))

    async def analyze_emotions(self, text: str) -> Dict:
        """Analyze emotions in text."""
        response = await self._make_request(
            "post",
            "chat/completions",
            json={
                "messages": [{
                    "role": "user",
                    "content": f"Analyze emotions in:\n\n{text}"
                }],
                "temperature": 0.7
            }
        )
        try:
            content = response["choices"][0]["message"]["content"]
            return json.loads(content)
        except (KeyError, json.JSONDecodeError):
            return {"emotion": "neutral", "confidence": 0.5}

    async def analyze_character(self, lines: List[str]) -> Dict:
        """Analyze character traits and motivations."""
        response = await self._make_request(
            "post",
            "chat/completions",
            json={
                "messages": [{
                    "role": "user",
                    "content": f"Analyze character:\n\n{lines}"
                }],
                "temperature": 0.7
            }
        )
        try:
            content = response["choices"][0]["message"]["content"]
            return json.loads(content)
        except (KeyError, json.JSONDecodeError):
            return {
                "personality": [],
                "motivations": []
            }

    async def analyze_script(self, script: str) -> Dict:
        """Analyze script structure and themes."""
        response = await self._make_request(
            "post",
            "chat/completions",
            json={
                "messages": [{
                    "role": "user",
                    "content": f"Analyze this script:\n\n{script}"
                }],
                "temperature": 0.7
            }
        )
        try:
            content = response["choices"][0]["message"]["content"]
            return json.loads(content)
        except (KeyError, json.JSONDecodeError):
            return {
                "scenes": [],
                "metadata": {}
            }

    async def analyze_scene_dynamics(self, scene: str) -> Dict:
        """Analyze scene dynamics and character interactions."""
        response = await self._make_request(
            "post",
            "chat/completions",
            json={
                "messages": [{
                    "role": "user",
                    "content": f"Analyze scene dynamics:\n\n{scene}"
                }],
                "temperature": 0.7
            }
        )
        try:
            content = response["choices"][0]["message"]["content"]
            return json.loads(content)
        except (KeyError, json.JSONDecodeError):
            return {
                "tension": "low",
                "character_dynamics": "neutral"
            }

# Create a singleton instance
deepseek_service = DeepSeekService()
