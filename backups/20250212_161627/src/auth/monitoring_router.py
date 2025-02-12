from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Optional, Annotated
from datetime import datetime

from .models import UserInDB
from .router import get_current_admin
from .rate_limiter import RateLimiter
from .webrtc_signaling import SignalingManager

router = APIRouter()

# Use the same instances as webrtc_router
from .webrtc_router import rate_limiter, signaling_manager

@router.get("/rate-limits/user/{user_id}")
async def get_user_rate_limits(
    user_id: int,
    current_admin: Annotated[UserInDB, Depends(get_current_admin)]
) -> Dict[str, any]:
    """Get rate limit status for a specific user."""
    # Get connection count
    conn_key = rate_limiter._get_conn_key(user_id)
    conn_count = await rate_limiter.redis.get(conn_key)
    conn_ttl = await rate_limiter.redis.ttl(conn_key)
    
    # Get message count
    msg_key = rate_limiter._get_msg_key(user_id)
    msg_count = await rate_limiter.redis.get(msg_key)
    msg_ttl = await rate_limiter.redis.ttl(msg_key)
    
    # Get burst count
    burst_key = rate_limiter._get_burst_key(user_id)
    burst_count = await rate_limiter.redis.get(burst_key)
    burst_ttl = await rate_limiter.redis.ttl(burst_key)
    
    return {
        "user_id": user_id,
        "connections": {
            "current": int(conn_count) if conn_count else 0,
            "limit": rate_limiter.CONN_LIMIT,
            "ttl": conn_ttl if conn_ttl > 0 else None
        },
        "messages": {
            "current": int(msg_count) if msg_count else 0,
            "limit": rate_limiter.MSG_RATE,
            "ttl": msg_ttl if msg_ttl > 0 else None
        },
        "burst": {
            "current": int(burst_count) if burst_count else 0,
            "limit": rate_limiter.BURST_RATE,
            "ttl": burst_ttl if burst_ttl > 0 else None
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/rate-limits/active")
async def get_active_rate_limits(
    current_admin: Annotated[UserInDB, Depends(get_current_admin)]
) -> List[Dict[str, any]]:
    """Get rate limit status for all active users."""
    # Get all rate limit keys
    all_keys = await rate_limiter.redis.keys("rate:*")
    
    # Group keys by user_id
    user_keys: Dict[int, List[str]] = {}
    for key in all_keys:
        parts = key.split(":")
        if len(parts) == 3:  # rate:type:user_id
            user_id = int(parts[2])
            if user_id not in user_keys:
                user_keys[user_id] = []
            user_keys[user_id].append(key)
    
    # Get rate limits for each active user
    results = []
    for user_id in user_keys:
        result = await get_user_rate_limits(user_id, current_admin)
        results.append(result)
    
    return results

@router.delete("/rate-limits/user/{user_id}")
async def reset_user_rate_limits(
    user_id: int,
    current_admin: Annotated[UserInDB, Depends(get_current_admin)]
) -> Dict[str, str]:
    """Reset rate limits for a specific user."""
    await rate_limiter.cleanup_user(user_id)
    return {"status": "Rate limits reset successfully"}

@router.get("/sessions/active")
async def get_active_sessions(
    current_admin: Annotated[UserInDB, Depends(get_current_admin)]
) -> List[Dict[str, any]]:
    """Get information about all active WebRTC sessions."""
    sessions = []
    for session_id, conns in signaling_manager._connections.items():
        participants = signaling_manager.get_session_participants(session_id)
        sessions.append({
            "session_id": session_id,
            "participant_count": len(participants),
            "participants": [
                {
                    "user_id": p.user_id,
                    "role": p.role,
                    "permissions": p.permissions.model_dump(),
                    "joined_at": p.joined_at.isoformat(),
                    "last_active": p.last_active.isoformat()
                }
                for p in participants
            ]
        })
    return sessions

@router.get("/sessions/{session_id}/metrics")
async def get_session_metrics(
    session_id: str,
    current_admin: Annotated[UserInDB, Depends(get_current_admin)]
) -> Dict[str, any]:
    """Get detailed metrics for a specific session."""
    session_conns = signaling_manager._get_session_connections(session_id)
    if not session_conns:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    participants = signaling_manager.get_session_participants(session_id)
    
    # Calculate session metrics
    now = datetime.utcnow()
    metrics = {
        "session_id": session_id,
        "participant_count": len(participants),
        "participants": [
            {
                "user_id": p.user_id,
                "role": p.role,
                "connection_duration": (
                    now - session_conns[p.user_id].connected_at
                ).total_seconds(),
                "last_heartbeat": (
                    now - session_conns[p.user_id].last_heartbeat
                ).total_seconds(),
                "permissions": p.permissions.model_dump()
            }
            for p in participants
        ],
        "timestamp": now.isoformat()
    }
    
    return metrics

@router.post("/sessions/{session_id}/cleanup")
async def cleanup_session(
    session_id: str,
    current_admin: Annotated[UserInDB, Depends(get_current_admin)]
) -> Dict[str, str]:
    """Force cleanup of a specific session."""
    session_conns = signaling_manager._get_session_connections(session_id)
    if not session_conns:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Remove all participants
    for user_id in list(session_conns.keys()):
        await signaling_manager.remove_connection(session_id, user_id)
        await rate_limiter.release_connection(user_id)
    
    return {"status": "Session cleaned up successfully"} 