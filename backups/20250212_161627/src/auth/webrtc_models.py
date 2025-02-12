from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel
from enum import Enum

class WebRTCRole(str, Enum):
    """Role in a WebRTC session."""
    SPEAKER = "speaker"      # Can speak and listen
    LISTENER = "listener"    # Can only listen
    OBSERVER = "observer"    # Can only observe (no audio)

class WebRTCPermissions(BaseModel):
    """Permissions for a WebRTC session participant."""
    can_speak: bool = False
    can_listen: bool = True
    can_share_screen: bool = False
    can_record: bool = False
    can_moderate: bool = False

class WebRTCParticipant(BaseModel):
    """Participant in a WebRTC session."""
    user_id: int
    role: WebRTCRole
    permissions: WebRTCPermissions
    joined_at: datetime
    last_active: datetime
    device_info: Optional[Dict[str, str]] = None
    
    class Config:
        from_attributes = True

class WebRTCSession(BaseModel):
    """WebRTC session details."""
    session_id: str
    room_id: str
    created_at: datetime
    expires_at: datetime
    host_user_id: int
    max_participants: int = 10
    is_private: bool = True
    participants: List[WebRTCParticipant] = []
    settings: Dict[str, any] = {}
    
    class Config:
        from_attributes = True

class WebRTCToken(BaseModel):
    """Token for WebRTC authentication."""
    session_token: str
    session_id: str
    user_id: int
    role: WebRTCRole
    permissions: WebRTCPermissions
    expires_at: datetime
    room_id: str
    
    class Config:
        from_attributes = True

class WebRTCJoinRequest(BaseModel):
    """Request to join a WebRTC session."""
    room_id: str
    role: Optional[WebRTCRole] = WebRTCRole.LISTENER
    device_info: Optional[Dict[str, str]] = None

class WebRTCJoinResponse(BaseModel):
    """Response for a successful join request."""
    session_token: str
    session_id: str
    ice_servers: List[Dict[str, any]]
    turn_credentials: Optional[Dict[str, str]]
    participants: List[WebRTCParticipant]
    your_permissions: WebRTCPermissions 