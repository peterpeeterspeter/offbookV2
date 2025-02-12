from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class SessionBase(BaseModel):
    """Base session model."""
    script_id: int
    title: str
    content: str
    settings: Optional[Dict[str, Any]] = None

class SessionCreate(SessionBase):
    """Session creation model."""
    pass

class SessionUpdate(BaseModel):
    """Session update model."""
    title: Optional[str] = None
    content: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class SessionResponse(SessionBase):
    """Session response model."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
