from datetime import datetime, timedelta
from typing import Optional, List, Dict, Tuple
import jwt
import secrets
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from .webrtc_models import (
    WebRTCRole,
    WebRTCPermissions,
    WebRTCParticipant,
    WebRTCSession,
    WebRTCToken,
    WebRTCJoinRequest,
    WebRTCJoinResponse
)
from .models import UserInDB
from .service import JWT_SECRET_KEY, JWT_ALGORITHM

# WebRTC settings
WEBRTC_SESSION_EXPIRE_MINUTES = 120  # 2 hours
MAX_PARTICIPANTS_PER_ROOM = 10

# ICE Server configuration
ICE_SERVERS = [
    {
        "urls": ["stun:stun.l.google.com:19302"]
    }
]

# If using a TURN server, add credentials from environment
TURN_SERVER = os.getenv("TURN_SERVER")
TURN_USERNAME = os.getenv("TURN_USERNAME")
TURN_CREDENTIAL = os.getenv("TURN_CREDENTIAL")

if all([TURN_SERVER, TURN_USERNAME, TURN_CREDENTIAL]):
    ICE_SERVERS.append({
        "urls": [f"turn:{TURN_SERVER}"],
        "username": TURN_USERNAME,
        "credential": TURN_CREDENTIAL
    })

class WebRTCAuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self._active_sessions: Dict[str, WebRTCSession] = {}
    
    def _get_role_permissions(self, role: WebRTCRole) -> WebRTCPermissions:
        """Get default permissions for a role."""
        if role == WebRTCRole.SPEAKER:
            return WebRTCPermissions(
                can_speak=True,
                can_listen=True,
                can_share_screen=True
            )
        elif role == WebRTCRole.LISTENER:
            return WebRTCPermissions(
                can_speak=False,
                can_listen=True,
                can_share_screen=False
            )
        else:  # OBSERVER
            return WebRTCPermissions(
                can_speak=False,
                can_listen=False,
                can_share_screen=False
            )
    
    def create_session_token(
        self,
        user_id: int,
        session_id: str,
        room_id: str,
        role: WebRTCRole,
        permissions: WebRTCPermissions
    ) -> str:
        """Create a JWT token for WebRTC session."""
        expires_at = datetime.utcnow() + timedelta(
            minutes=WEBRTC_SESSION_EXPIRE_MINUTES
        )
        
        to_encode = {
            "sub": str(user_id),
            "session_id": session_id,
            "room_id": room_id,
            "role": role,
            "permissions": permissions.model_dump(),
            "exp": expires_at,
            "type": "webrtc"
        }
        
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    async def validate_session_token(
        self,
        token: str
    ) -> Tuple[WebRTCToken, UserInDB]:
        """Validate WebRTC session token."""
        try:
            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM]
            )
            
            if payload.get("type") != "webrtc":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            # Create WebRTCToken from payload
            token_data = WebRTCToken(
                session_token=token,
                session_id=payload["session_id"],
                user_id=int(payload["sub"]),
                role=payload["role"],
                permissions=WebRTCPermissions(**payload["permissions"]),
                expires_at=datetime.fromtimestamp(payload["exp"]),
                room_id=payload["room_id"]
            )
            
            # Get user
            result = await self.session.execute(
                select(UserInDB).where(UserInDB.id == token_data.user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
            
            return token_data, user
            
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token"
            )
    
    def _create_new_session(
        self,
        room_id: str,
        host_user_id: int
    ) -> WebRTCSession:
        """Create a new WebRTC session."""
        session = WebRTCSession(
            session_id=secrets.token_urlsafe(16),
            room_id=room_id,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(
                minutes=WEBRTC_SESSION_EXPIRE_MINUTES
            ),
            host_user_id=host_user_id,
            max_participants=MAX_PARTICIPANTS_PER_ROOM,
            participants=[]
        )
        
        self._active_sessions[session.session_id] = session
        return session
    
    def _get_session(self, room_id: str) -> Optional[WebRTCSession]:
        """Get active session for a room."""
        for session in self._active_sessions.values():
            if (
                session.room_id == room_id and
                session.expires_at > datetime.utcnow()
            ):
                return session
        return None
    
    def _clean_expired_sessions(self) -> None:
        """Remove expired sessions."""
        now = datetime.utcnow()
        expired = [
            sid for sid, session in self._active_sessions.items()
            if session.expires_at <= now
        ]
        for sid in expired:
            del self._active_sessions[sid]
    
    async def join_session(
        self,
        user: UserInDB,
        join_request: WebRTCJoinRequest
    ) -> WebRTCJoinResponse:
        """Join or create a WebRTC session."""
        self._clean_expired_sessions()
        
        # Get or create session
        session = self._get_session(join_request.room_id)
        if not session:
            session = self._create_new_session(
                join_request.room_id,
                user.id
            )
        
        # Check participant limit
        if len(session.participants) >= session.max_participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is full"
            )
        
        # Get role and permissions
        role = join_request.role or WebRTCRole.LISTENER
        permissions = self._get_role_permissions(role)
        
        # Create participant
        participant = WebRTCParticipant(
            user_id=user.id,
            role=role,
            permissions=permissions,
            joined_at=datetime.utcnow(),
            last_active=datetime.utcnow(),
            device_info=join_request.device_info
        )
        
        # Add to session
        session.participants.append(participant)
        
        # Create session token
        session_token = self.create_session_token(
            user.id,
            session.session_id,
            session.room_id,
            role,
            permissions
        )
        
        # Get TURN credentials if needed
        turn_credentials = None
        if TURN_SERVER:
            turn_credentials = {
                "username": TURN_USERNAME,
                "credential": TURN_CREDENTIAL
            }
        
        return WebRTCJoinResponse(
            session_token=session_token,
            session_id=session.session_id,
            ice_servers=ICE_SERVERS,
            turn_credentials=turn_credentials,
            participants=session.participants,
            your_permissions=permissions
        )
    
    async def leave_session(
        self,
        token_data: WebRTCToken
    ) -> None:
        """Leave a WebRTC session."""
        session = self._active_sessions.get(token_data.session_id)
        if session:
            session.participants = [
                p for p in session.participants
                if p.user_id != token_data.user_id
            ]
            
            # Remove session if empty
            if not session.participants:
                del self._active_sessions[session.session_id]
    
    async def update_participant_activity(
        self,
        token_data: WebRTCToken
    ) -> None:
        """Update participant's last active timestamp."""
        session = self._active_sessions.get(token_data.session_id)
        if session:
            for participant in session.participants:
                if participant.user_id == token_data.user_id:
                    participant.last_active = datetime.utcnow()
                    break
    
    def get_session_participants(
        self,
        session_id: str
    ) -> List[WebRTCParticipant]:
        """Get list of participants in a session."""
        session = self._active_sessions.get(session_id)
        return session.participants if session else [] 