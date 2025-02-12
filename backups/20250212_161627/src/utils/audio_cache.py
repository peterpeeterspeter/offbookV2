import hashlib
import json
from typing import Optional, Dict
import aioredis

class TTSCache:
    """Cache for storing and retrieving TTS audio outputs."""
    
    def __init__(self, redis_url: str = "redis://localhost"):
        self.redis = aioredis.from_url(redis_url)
        
    def _generate_cache_key(self, text: str, emotion: str, voice_id: str) -> str:
        """Generate a unique cache key for the TTS request."""
        data = {
            "text": text,
            "emotion": emotion,
            "voice_id": voice_id
        }
        json_str = json.dumps(data, sort_keys=True)
        return f"tts:{hashlib.md5(json_str.encode()).hexdigest()}"
    
    async def get_cached_audio(
        self,
        text: str,
        emotion: str,
        voice_id: str
    ) -> Optional[bytes]:
        """Retrieve cached audio if available."""
        key = self._generate_cache_key(text, emotion, voice_id)
        cached = await self.redis.get(key)
        return cached
    
    async def cache_audio(
        self,
        text: str,
        emotion: str,
        voice_id: str,
        audio_data: bytes,
        ttl: int = 604800  # 1 week in seconds
    ) -> None:
        """Cache audio data with TTL."""
        key = self._generate_cache_key(text, emotion, voice_id)
        await self.redis.set(key, audio_data, ex=ttl)
    
    async def clear_cache(self) -> None:
        """Clear all cached TTS data."""
        await self.redis.flushdb()
    
    async def get_cache_stats(self) -> Dict:
        """Get cache statistics."""
        info = await self.redis.info()
        return {
            "used_memory": info["used_memory_human"],
            "hits": info["keyspace_hits"],
            "misses": info["keyspace_misses"],
            "keys": await self.redis.dbsize()
        } 