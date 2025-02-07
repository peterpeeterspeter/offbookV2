from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession
import json
from datetime import datetime

from .webrtc_models import (
    WebRTCJoinRequest,
    WebRTCJoinResponse,
    WebRTCParticipant,
    WebRTCToken
)
from .webrtc_service import WebRTCAuthService
from .webrtc_signaling import SignalingManager
from .rate_limiter import RateLimiter
from .router import get_current_user
from .models import UserInDB
from ..database.config import get_session

router = APIRouter()

# Global managers
signaling_manager = SignalingManager()
rate_limiter = RateLimiter()

async def get_webrtc_service(
    session: AsyncSession = Depends(get_session)
) -> WebRTCAuthService:
    """Dependency to get WebRTCAuthService instance."""
    return WebRTCAuthService(session)

@router.post("/join", response_model=WebRTCJoinResponse)
async def join_session(
    join_request: WebRTCJoinRequest,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    webrtc_service: WebRTCAuthService = Depends(get_webrtc_service)
):
    """Join or create a WebRTC session."""
    # Check connection rate limit
    await rate_limiter.check_and_update(
        current_user.id,
        join_request.room_id,
        is_connection=True
    )
    return await webrtc_service.join_session(current_user, join_request)

@router.get("/participants/{session_id}", response_model=List[WebRTCParticipant])
async def get_participants(
    session_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    webrtc_service: WebRTCAuthService = Depends(get_webrtc_service)
):
    """Get list of participants in a session."""
    return signaling_manager.get_session_participants(session_id)

@router.websocket("/ws/{session_token}")
async def webrtc_websocket(
    websocket: WebSocket,
    session_token: str,
    webrtc_service: WebRTCAuthService = Depends(get_webrtc_service)
):
    """WebSocket endpoint for WebRTC signaling."""
    try:
        # Validate session token
        token_data, user = await webrtc_service.validate_session_token(
            session_token
        )
        
        # Check connection rate limit
        try:
            await rate_limiter.check_and_update(
                user.id,
                token_data.session_id,
                is_connection=True
            )
        except HTTPException as e:
            await websocket.close(
                code=4029,
                reason=f"Rate limit exceeded: {e.detail}"
            )
            return
        
        # Accept WebSocket connection
        await websocket.accept()
        
        # Add connection to signaling manager
        await signaling_manager.add_connection(
            websocket,
            token_data,
            WebRTCParticipant(
                user_id=user.id,
                role=token_data.role,
                permissions=token_data.permissions,
                joined_at=datetime.utcnow(),
                last_active=datetime.utcnow()
            )
        )
        
        try:
            while True:
                # Receive message
                message = await websocket.receive_text()
                data = json.loads(message)
                
                # Check message rate limit
                try:
                    await rate_limiter.check_and_update(
                        user.id,
                        token_data.session_id
                    )
                except HTTPException as e:
                    await websocket.send_json({
                        "error": f"Rate limit exceeded: {e.detail}",
                        "retry_after": e.headers.get("Retry-After")
                    })
                    continue
                
                # Validate message type
                if "type" not in data:
                    await websocket.send_json({
                        "error": "Missing message type"
                    })
                    continue
                
                # Handle different message types
                if data["type"] == "offer":
                    if not all(k in data for k in ["to", "sdp"]):
                        await websocket.send_json({
                            "error": "Invalid offer message"
                        })
                        continue
                    
                    await signaling_manager.handle_offer(
                        token_data.session_id,
                        user.id,
                        data["to"],
                        data["sdp"]
                    )
                
                elif data["type"] == "answer":
                    if not all(k in data for k in ["to", "sdp"]):
                        await websocket.send_json({
                            "error": "Invalid answer message"
                        })
                        continue
                    
                    await signaling_manager.handle_answer(
                        token_data.session_id,
                        user.id,
                        data["to"],
                        data["sdp"]
                    )
                
                elif data["type"] == "ice-candidate":
                    if not all(k in data for k in ["to", "candidate"]):
                        await websocket.send_json({
                            "error": "Invalid ICE candidate message"
                        })
                        continue
                    
                    await signaling_manager.handle_ice_candidate(
                        token_data.session_id,
                        user.id,
                        data["to"],
                        data["candidate"]
                    )
                
                elif data["type"] == "heartbeat":
                    await signaling_manager.update_participant_heartbeat(
                        token_data.session_id,
                        user.id
                    )
                    await websocket.send_json({"type": "heartbeat-ack"})
                
                else:
                    await websocket.send_json({
                        "error": f"Unknown message type: {data['type']}"
                    })
        
        except WebSocketDisconnect:
            # Handle disconnect
            await signaling_manager.remove_connection(
                token_data.session_id,
                user.id
            )
            await rate_limiter.release_connection(user.id)
        
        except Exception as e:
            # Handle other errors
            await websocket.send_json({
                "error": str(e)
            })
            # Also remove connection on error
            await signaling_manager.remove_connection(
                token_data.session_id,
                user.id
            )
            await rate_limiter.release_connection(user.id)
    
    except HTTPException as e:
        # Handle authentication errors
        await websocket.close(code=4001, reason=e.detail)
    except Exception as e:
        # Handle other errors
        await websocket.close(code=4000, reason=str(e))

@router.post("/leave/{session_id}")
async def leave_session(
    session_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    webrtc_service: WebRTCAuthService = Depends(get_webrtc_service)
):
    """Leave a WebRTC session."""
    await signaling_manager.remove_connection(session_id, current_user.id)
    await rate_limiter.release_connection(current_user.id)
    return {"detail": "Successfully left session"} 