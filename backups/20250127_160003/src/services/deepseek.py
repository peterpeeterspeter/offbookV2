import os
import json
import aiohttp
import hashlib
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path
from enum import Enum

class EmotionType(Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    NEUTRAL = "neutral"

class DeepSeekService:
    """Service for interacting with DeepSeek API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the DeepSeek service."""
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("DeepSeek API key not provided")
            
        self.base_url = "https://api.deepseek.com/v1"
        self.cache_dir = Path(os.getenv("CACHE_DIR", "./cache"))
        self.analysis_cache_dir = self.cache_dir / "analysis"
        self.analysis_cache_dir.mkdir(parents=True, exist_ok=True)
        
    def _get_cache_key(self, text: str, analysis_type: str) -> str:
        """Generate a cache key for analysis request."""
        data = f"{text}:{analysis_type}"
        return hashlib.md5(data.encode()).hexdigest()
        
    def _get_cache_path(self, cache_key: str) -> Path:
        """Get the file path for a cached analysis result."""
        return self.analysis_cache_dir / f"{cache_key}.json"
        
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make a request to the DeepSeek API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
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
                
    async def analyze_emotion(self, text: str) -> Dict:
        """Analyze the emotional content of text."""
        cache_key = self._get_cache_key(text, "emotion")
        cache_path = self._get_cache_path(cache_key)
        
        # Check cache first
        if cache_path.exists():
            return json.loads(cache_path.read_text())
            
        try:
            data = {
                "text": text,
                "analysis_type": "emotion"
            }
            
            response = await self._make_request("POST", "analyze", json=data)
            result = self._parse_emotion_response(response)
            
            # Cache the result
            cache_path.write_text(json.dumps(result))
            return result
            
        except Exception as e:
            print(f"Error analyzing emotion: {str(e)}")
            raise
            
    def _parse_emotion_response(self, response: Dict) -> Dict:
        """Parse the emotion analysis response."""
        emotions = response.get("emotions", {})
        max_emotion = max(emotions.items(), key=lambda x: x[1])
        
        return {
            "emotion": EmotionType(max_emotion[0]).value,
            "confidence": max_emotion[1],
            "all_emotions": emotions
        }
        
    async def analyze_character(self, lines: List[str]) -> Dict:
        """Analyze a character based on their lines."""
        text = "\n".join(lines)
        cache_key = self._get_cache_key(text, "character")
        cache_path = self._get_cache_path(cache_key)
        
        # Check cache first
        if cache_path.exists():
            return json.loads(cache_path.read_text())
            
        try:
            data = {
                "text": text,
                "analysis_type": "character"
            }
            
            response = await self._make_request("POST", "analyze", json=data)
            result = self._parse_character_response(response)
            
            # Cache the result
            cache_path.write_text(json.dumps(result))
            return result
            
        except Exception as e:
            print(f"Error analyzing character: {str(e)}")
            raise
            
    def _parse_character_response(self, response: Dict) -> Dict:
        """Parse the character analysis response."""
        return {
            "personality": response.get("personality", {}),
            "emotional_range": response.get("emotional_range", {}),
            "common_phrases": response.get("common_phrases", []),
            "speech_patterns": response.get("speech_patterns", {})
        }
        
    def clear_cache(self):
        """Clear the analysis cache."""
        for file in self.analysis_cache_dir.glob("*.json"):
            try:
                file.unlink()
            except Exception as e:
                print(f"Error deleting cache file {file}: {str(e)}")

# Create a singleton instance
deepseek_service = DeepSeekService() 