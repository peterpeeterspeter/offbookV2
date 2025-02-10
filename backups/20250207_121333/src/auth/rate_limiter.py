from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
from fastapi import HTTPException, status
import redis.asyncio as redis
import os

class RateLimiter:
    """Rate limiter for WebSocket connections and messages."""
    
    def __init__(self):
        """Initialize rate limiter with Redis connection."""
        self.redis = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            encoding="utf-8",
            decode_responses=True
        )
        
        # Rate limit settings
        self.CONN_LIMIT = 5  # Max connections per user
        self.MSG_RATE = 50   # Max messages per minute
        self.BURST_RATE = 10 # Max burst messages
        
        # Keys will expire after 1 minute
        self.EXPIRY = 60
    
    def _get_conn_key(self, user_id: int) -> str:
        """Get Redis key for connection count."""
        return f"rate:conn:{user_id}"
    
    def _get_msg_key(self, user_id: int) -> str:
        """Get Redis key for message count."""
        return f"rate:msg:{user_id}"
    
    def _get_burst_key(self, user_id: int) -> str:
        """Get Redis key for burst count."""
        return f"rate:burst:{user_id}"
    
    async def check_connection_limit(self, user_id: int) -> bool:
        """Check if user has exceeded connection limit."""
        key = self._get_conn_key(user_id)
        
        # Get current connection count
        count = await self.redis.get(key)
        if count is None:
            # First connection
            await self.redis.setex(key, self.EXPIRY, 1)
            return True
        
        count = int(count)
        if count >= self.CONN_LIMIT:
            return False
        
        # Increment connection count
        await self.redis.incr(key)
        return True
    
    async def release_connection(self, user_id: int) -> None:
        """Release a connection count for user."""
        key = self._get_conn_key(user_id)
        
        # Decrement connection count
        count = await self.redis.get(key)
        if count and int(count) > 0:
            await self.redis.decr(key)
    
    async def check_message_rate(
        self,
        user_id: int,
        session_id: str
    ) -> Tuple[bool, Optional[float]]:
        """Check if user has exceeded message rate limit.
        Returns (allowed, retry_after)."""
        msg_key = self._get_msg_key(user_id)
        burst_key = self._get_burst_key(user_id)
        
        # Get current counts
        msg_count = await self.redis.get(msg_key)
        burst_count = await self.redis.get(burst_key)
        
        if msg_count is None:
            # First message in window
            pipe = self.redis.pipeline()
            pipe.setex(msg_key, self.EXPIRY, 1)
            pipe.setex(burst_key, 1, 1)  # 1 second burst window
            await pipe.execute()
            return True, None
        
        msg_count = int(msg_count)
        if msg_count >= self.MSG_RATE:
            # Exceeded per-minute rate
            ttl = await self.redis.ttl(msg_key)
            return False, ttl
        
        if burst_count and int(burst_count) >= self.BURST_RATE:
            # Exceeded burst rate
            ttl = await self.redis.ttl(burst_key)
            return False, ttl
        
        # Increment counters
        pipe = self.redis.pipeline()
        pipe.incr(msg_key)
        pipe.incr(burst_key)
        await pipe.execute()
        
        return True, None
    
    async def check_and_update(
        self,
        user_id: int,
        session_id: str,
        is_connection: bool = False
    ) -> None:
        """Check rate limits and raise exception if exceeded."""
        if is_connection:
            # Check connection limit
            if not await self.check_connection_limit(user_id):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many concurrent connections"
                )
        else:
            # Check message rate
            allowed, retry_after = await self.check_message_rate(
                user_id,
                session_id
            )
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={"Retry-After": str(retry_after)}
                )
    
    async def cleanup_user(self, user_id: int) -> None:
        """Clean up rate limit data for user."""
        keys = [
            self._get_conn_key(user_id),
            self._get_msg_key(user_id),
            self._get_burst_key(user_id)
        ]
        await self.redis.delete(*keys) 