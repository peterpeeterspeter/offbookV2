from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime

from ...services.collaboration_service import (
    collaboration_service,
    CollaborationEventType,
    CollaboratorInfo
)

router = APIRouter(prefix="/session", tags=["session"])

class SessionJoinRequest(BaseModel):
    """Request to join a practice session."""
    user_id: str
    username: str
    session_id: str

class RoleAssignmentRequest(BaseModel):
    """Request to assign a role to a user."""
    user_id: str
    role: str

class FeedbackRequest(BaseModel):
    """Request to provide feedback to another user."""
    from_user_id: str
    to_user_id: str
    feedback: Dict

@router.post("/join")
async def join_session(request: SessionJoinRequest) -> Dict:
    """Join a practice session."""
    try:
        collaboration_service.add_collaborator(
            request.user_id,
            request.username
        )
        return {
            "status": "success",
            "message": f"User {request.username} joined the session"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/leave/{user_id}")
async def leave_session(user_id: str) -> Dict:
    """Leave a practice session."""
    try:
        collaboration_service.remove_collaborator(user_id)
        return {
            "status": "success",
            "message": f"User {user_id} left the session"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/role/assign")
async def assign_role(request: RoleAssignmentRequest) -> Dict:
    """Assign a role to a user."""
    success = collaboration_service.assign_role(
        request.user_id,
        request.role
    )
    if success:
        return {
            "status": "success",
            "message": f"Role {request.role} assigned to user {request.user_id}"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Failed to assign role"
        )

@router.post("/role/release/{role}")
async def release_role(role: str) -> Dict:
    """Release a role."""
    try:
        collaboration_service.release_role(role)
        return {
            "status": "success",
            "message": f"Role {role} released"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/feedback")
async def provide_feedback(request: FeedbackRequest) -> Dict:
    """Provide feedback to another user."""
    try:
        collaboration_service.provide_feedback(
            request.from_user_id,
            request.to_user_id,
            request.feedback
        )
        return {
            "status": "success",
            "message": "Feedback provided"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/collaborators")
async def get_collaborators() -> Dict[str, CollaboratorInfo]:
    """Get all collaborators in the session."""
    return collaboration_service.get_all_collaborators()

@router.get("/roles")
async def get_roles() -> Dict[str, str]:
    """Get current role assignments."""
    return collaboration_service.get_role_assignments()

@router.get("/events/{event_type}")
async def get_events(
    event_type: Optional[CollaborationEventType] = None
) -> List:
    """Get collaboration events, optionally filtered by type."""
    events = collaboration_service.get_event_history(event_type)
    return [
        {
            "type": e.type.value,
            "user_id": e.user_id,
            "data": e.data,
            "timestamp": e.timestamp
        }
        for e in events
    ]

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time session updates."""
    await websocket.accept()
    
    # Create event handler for the WebSocket
    async def event_handler(event):
        await websocket.send_json({
            "type": event.type.value,
            "user_id": event.user_id,
            "data": event.data,
            "timestamp": event.timestamp
        })
    
    # Add event listeners for all event types
    for event_type in CollaborationEventType:
        collaboration_service.add_event_listener(
            event_type,
            event_handler
        )
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_json()
            # Process incoming messages if needed
    except WebSocketDisconnect:
        # Clean up event listeners
        for event_type in CollaborationEventType:
            collaboration_service.remove_event_listener(
                event_type,
                event_handler
            )
        # Remove collaborator from session
        collaboration_service.remove_collaborator(user_id) 