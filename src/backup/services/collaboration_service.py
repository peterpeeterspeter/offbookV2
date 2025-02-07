from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
import asyncio
import json
from enum import Enum

class CollaborationEventType(Enum):
    JOIN = "join"
    LEAVE = "leave"
    LINE_COMPLETE = "line_complete"
    EMOTION_UPDATE = "emotion_update"
    TIMING_UPDATE = "timing_update"
    FEEDBACK = "feedback"
    ROLE_CHANGE = "role_change"

@dataclass
class CollaboratorInfo:
    """Information about a collaborator in the session."""
    user_id: str
    username: str
    role: Optional[str] = None
    is_active: bool = True
    current_line: int = 0
    performance_metrics: Dict = field(default_factory=dict)

@dataclass
class CollaborationEvent:
    """Event in the collaboration session."""
    type: CollaborationEventType
    user_id: str
    data: Dict
    timestamp: float

class CollaborationService:
    """Service for managing multi-user practice sessions."""
    
    def __init__(self):
        self.collaborators: Dict[str, CollaboratorInfo] = {}
        self.active_roles: Dict[str, str] = {}  # role -> user_id
        self.event_listeners: Dict[CollaborationEventType, Set] = {
            event_type: set() for event_type in CollaborationEventType
        }
        self.event_history: List[CollaborationEvent] = []
    
    def add_collaborator(self, user_id: str, username: str) -> None:
        """Add a new collaborator to the session."""
        self.collaborators[user_id] = CollaboratorInfo(
            user_id=user_id,
            username=username
        )
        self._emit_event(CollaborationEventType.JOIN, user_id, {
            "username": username
        })
    
    def remove_collaborator(self, user_id: str) -> None:
        """Remove a collaborator from the session."""
        if user_id in self.collaborators:
            collaborator = self.collaborators[user_id]
            if collaborator.role:
                self.release_role(collaborator.role)
            del self.collaborators[user_id]
            self._emit_event(CollaborationEventType.LEAVE, user_id, {})
    
    def assign_role(self, user_id: str, role: str) -> bool:
        """Assign a role to a collaborator."""
        if role in self.active_roles:
            return False
        
        if user_id in self.collaborators:
            # Release previous role if any
            if self.collaborators[user_id].role:
                self.release_role(self.collaborators[user_id].role)
            
            self.collaborators[user_id].role = role
            self.active_roles[role] = user_id
            
            self._emit_event(CollaborationEventType.ROLE_CHANGE, user_id, {
                "role": role
            })
            return True
        
        return False
    
    def release_role(self, role: str) -> None:
        """Release a role so it can be assigned to another collaborator."""
        if role in self.active_roles:
            user_id = self.active_roles[role]
            if user_id in self.collaborators:
                self.collaborators[user_id].role = None
            del self.active_roles[role]
    
    def update_line_progress(self, user_id: str, line_number: int) -> None:
        """Update a collaborator's current line progress."""
        if user_id in self.collaborators:
            self.collaborators[user_id].current_line = line_number
            self._emit_event(CollaborationEventType.LINE_COMPLETE, user_id, {
                "line_number": line_number
            })
    
    def update_performance_metrics(
        self,
        user_id: str,
        metrics: Dict
    ) -> None:
        """Update a collaborator's performance metrics."""
        if user_id in self.collaborators:
            self.collaborators[user_id].performance_metrics.update(metrics)
            self._emit_event(CollaborationEventType.TIMING_UPDATE, user_id, metrics)
    
    def provide_feedback(
        self,
        from_user_id: str,
        to_user_id: str,
        feedback: Dict
    ) -> None:
        """Record feedback from one collaborator to another."""
        if from_user_id in self.collaborators and to_user_id in self.collaborators:
            self._emit_event(CollaborationEventType.FEEDBACK, from_user_id, {
                "to_user_id": to_user_id,
                **feedback
            })
    
    def get_collaborator_info(self, user_id: str) -> Optional[CollaboratorInfo]:
        """Get information about a specific collaborator."""
        return self.collaborators.get(user_id)
    
    def get_all_collaborators(self) -> Dict[str, CollaboratorInfo]:
        """Get information about all collaborators."""
        return self.collaborators.copy()
    
    def get_role_assignments(self) -> Dict[str, str]:
        """Get current role assignments (role -> user_id)."""
        return self.active_roles.copy()
    
    def add_event_listener(
        self,
        event_type: CollaborationEventType,
        callback: callable
    ) -> None:
        """Add a listener for collaboration events."""
        self.event_listeners[event_type].add(callback)
    
    def remove_event_listener(
        self,
        event_type: CollaborationEventType,
        callback: callable
    ) -> None:
        """Remove an event listener."""
        if callback in self.event_listeners[event_type]:
            self.event_listeners[event_type].remove(callback)
    
    def _emit_event(
        self,
        event_type: CollaborationEventType,
        user_id: str,
        data: Dict
    ) -> None:
        """Emit a collaboration event to all registered listeners."""
        event = CollaborationEvent(
            type=event_type,
            user_id=user_id,
            data=data,
            timestamp=asyncio.get_event_loop().time()
        )
        
        self.event_history.append(event)
        
        # Notify all listeners
        for listener in self.event_listeners[event_type]:
            try:
                asyncio.create_task(listener(event))
            except Exception as e:
                print(f"Error notifying listener: {e}")
    
    def get_event_history(
        self,
        event_type: Optional[CollaborationEventType] = None
    ) -> List[CollaborationEvent]:
        """Get history of collaboration events, optionally filtered by type."""
        if event_type:
            return [e for e in self.event_history if e.type == event_type]
        return self.event_history.copy()
    
    def reset(self) -> None:
        """Reset the collaboration service state."""
        self.collaborators.clear()
        self.active_roles.clear()
        self.event_history.clear()

# Export singleton instance
collaboration_service = CollaborationService() 