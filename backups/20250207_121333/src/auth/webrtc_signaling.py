from typing import Dict, Set, Optional
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime

from .webrtc_models import WebRTCToken, WebRTCParticipant

class SignalingMessage:
    """WebRTC signaling message."""
    def __init__(
        self,
        type: str,
        from_user_id: int,
        to_user_id: Optional[int],
        data: dict
    ):
        self.type = type
        self.from_user_id = from_user_id
        self.to_user_id = to_user_id
        self.data = data
        self.timestamp = datetime.utcnow()
    
    def to_json(self) -> dict:
        """Convert message to JSON format."""
        return {
            "type": self.type,
            "from": self.from_user_id,
            "to": self.to_user_id,
            "data": self.data,
            "timestamp": self.timestamp.isoformat()
        }

class SignalingConnection:
    """Active WebSocket connection for signaling."""
    def __init__(
        self,
        websocket: WebSocket,
        token: WebRTCToken,
        participant: WebRTCParticipant
    ):
        self.websocket = websocket
        self.token = token
        self.participant = participant
        self.connected_at = datetime.utcnow()
        self.last_heartbeat = datetime.utcnow()

class SignalingManager:
    """Manages WebRTC signaling connections and message routing."""
    
    def __init__(self):
        self._connections: Dict[str, Dict[int, SignalingConnection]] = {}
        self._user_sessions: Dict[int, Set[str]] = {}
    
    def _get_session_connections(
        self,
        session_id: str
    ) -> Dict[int, SignalingConnection]:
        """Get all connections in a session."""
        return self._connections.get(session_id, {})
    
    def _get_user_connection(
        self,
        session_id: str,
        user_id: int
    ) -> Optional[SignalingConnection]:
        """Get connection for a specific user in a session."""
        session_conns = self._get_session_connections(session_id)
        return session_conns.get(user_id)
    
    async def add_connection(
        self,
        websocket: WebSocket,
        token: WebRTCToken,
        participant: WebRTCParticipant
    ) -> None:
        """Add new signaling connection."""
        # Create connection object
        connection = SignalingConnection(websocket, token, participant)
        
        # Initialize session dict if needed
        if token.session_id not in self._connections:
            self._connections[token.session_id] = {}
        
        # Add connection to session
        self._connections[token.session_id][participant.user_id] = connection
        
        # Track user's sessions
        if participant.user_id not in self._user_sessions:
            self._user_sessions[participant.user_id] = set()
        self._user_sessions[participant.user_id].add(token.session_id)
        
        # Notify other participants about new peer
        await self.broadcast_participant_joined(
            token.session_id,
            participant,
            exclude_user_id=participant.user_id
        )
    
    async def remove_connection(
        self,
        session_id: str,
        user_id: int
    ) -> None:
        """Remove signaling connection."""
        # Remove from session connections
        session_conns = self._get_session_connections(session_id)
        if user_id in session_conns:
            connection = session_conns[user_id]
            del session_conns[user_id]
            
            # Remove session if empty
            if not session_conns:
                del self._connections[session_id]
            
            # Remove from user sessions
            if user_id in self._user_sessions:
                self._user_sessions[user_id].remove(session_id)
                if not self._user_sessions[user_id]:
                    del self._user_sessions[user_id]
            
            # Notify other participants about peer departure
            await self.broadcast_participant_left(
                session_id,
                connection.participant,
                exclude_user_id=user_id
            )
    
    async def route_message(
        self,
        session_id: str,
        message: SignalingMessage
    ) -> None:
        """Route signaling message to appropriate recipient(s)."""
        if message.to_user_id:
            # Direct message to specific user
            connection = self._get_user_connection(
                session_id,
                message.to_user_id
            )
            if connection:
                await connection.websocket.send_json(message.to_json())
        else:
            # Broadcast to all users in session except sender
            session_conns = self._get_session_connections(session_id)
            for user_id, connection in session_conns.items():
                if user_id != message.from_user_id:
                    await connection.websocket.send_json(message.to_json())
    
    async def broadcast_participant_joined(
        self,
        session_id: str,
        participant: WebRTCParticipant,
        exclude_user_id: Optional[int] = None
    ) -> None:
        """Broadcast participant joined message."""
        message = SignalingMessage(
            type="peer-joined",
            from_user_id=participant.user_id,
            to_user_id=None,
            data={
                "participant": participant.model_dump()
            }
        )
        
        session_conns = self._get_session_connections(session_id)
        for user_id, connection in session_conns.items():
            if user_id != exclude_user_id:
                await connection.websocket.send_json(message.to_json())
    
    async def broadcast_participant_left(
        self,
        session_id: str,
        participant: WebRTCParticipant,
        exclude_user_id: Optional[int] = None
    ) -> None:
        """Broadcast participant left message."""
        message = SignalingMessage(
            type="peer-left",
            from_user_id=participant.user_id,
            to_user_id=None,
            data={
                "participant": participant.model_dump()
            }
        )
        
        session_conns = self._get_session_connections(session_id)
        for user_id, connection in session_conns.items():
            if user_id != exclude_user_id:
                await connection.websocket.send_json(message.to_json())
    
    async def handle_offer(
        self,
        session_id: str,
        from_user_id: int,
        to_user_id: int,
        sdp: dict
    ) -> None:
        """Handle and route SDP offer."""
        message = SignalingMessage(
            type="offer",
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            data={"sdp": sdp}
        )
        await self.route_message(session_id, message)
    
    async def handle_answer(
        self,
        session_id: str,
        from_user_id: int,
        to_user_id: int,
        sdp: dict
    ) -> None:
        """Handle and route SDP answer."""
        message = SignalingMessage(
            type="answer",
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            data={"sdp": sdp}
        )
        await self.route_message(session_id, message)
    
    async def handle_ice_candidate(
        self,
        session_id: str,
        from_user_id: int,
        to_user_id: int,
        candidate: dict
    ) -> None:
        """Handle and route ICE candidate."""
        message = SignalingMessage(
            type="ice-candidate",
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            data={"candidate": candidate}
        )
        await self.route_message(session_id, message)
    
    def get_session_participants(
        self,
        session_id: str
    ) -> list[WebRTCParticipant]:
        """Get list of participants in a session."""
        session_conns = self._get_session_connections(session_id)
        return [conn.participant for conn in session_conns.values()]
    
    async def update_participant_heartbeat(
        self,
        session_id: str,
        user_id: int
    ) -> None:
        """Update participant's last heartbeat timestamp."""
        connection = self._get_user_connection(session_id, user_id)
        if connection:
            connection.last_heartbeat = datetime.utcnow()
    
    async def cleanup_stale_connections(
        self,
        heartbeat_timeout: int = 30
    ) -> None:
        """Remove connections that haven't sent a heartbeat recently."""
        now = datetime.utcnow()
        for session_id in list(self._connections.keys()):
            session_conns = self._connections[session_id]
            for user_id in list(session_conns.keys()):
                connection = session_conns[user_id]
                if (now - connection.last_heartbeat).seconds > heartbeat_timeout:
                    await self.remove_connection(session_id, user_id) 