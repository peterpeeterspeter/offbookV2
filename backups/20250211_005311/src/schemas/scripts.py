from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class ScriptBase(BaseModel):
    """Base script model."""
    title: str
    content: str
    script_metadata: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None

class ScriptCreate(ScriptBase):
    """Script creation model."""
    pass

class ScriptUpdate(BaseModel):
    """Script update model."""
    title: Optional[str] = None
    content: Optional[str] = None
    script_metadata: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None

class ScriptResponse(ScriptBase):
    """Script response model."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
