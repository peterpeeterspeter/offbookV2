from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    ForeignKey, JSON, Enum, Table, Text, MetaData
)
from sqlalchemy.orm import relationship, Mapped, mapped_column, DeclarativeBase, registry
from sqlalchemy.sql import func
from datetime import datetime, timezone, UTC
from typing import List, Optional, Dict, Any
import enum

# Create registry and metadata
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=convention)
mapper_registry = registry(metadata=metadata)

# Create base class using registry
class Base(DeclarativeBase):
    """Base class for all models"""
    registry = mapper_registry
    metadata = mapper_registry.metadata

# Association tables defined after Base
script_characters = Table(
    'script_characters',
    Base.metadata,
    Column("script_id", Integer, ForeignKey('scripts.id', ondelete='CASCADE'), primary_key=True),
    Column("character_id", Integer, ForeignKey('characters.id', ondelete='CASCADE'), primary_key=True)
)

session_users = Table(
    'session_users',
    Base.metadata,
    Column("session_id", Integer, ForeignKey('sessions.id', ondelete='CASCADE'), primary_key=True),
    Column("user_id", Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
)

class EmotionType(enum.Enum):
    """Emotion types for analysis."""
    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    FEARFUL = "fearful"
    SURPRISED = "surprised"

class User(Base):
    """User model for authentication and session management."""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    last_active: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Define relationships
    scripts: Mapped[List["Script"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[List["Session"]] = relationship(
        secondary=session_users,
        back_populates="users",
        cascade="all, delete",
        lazy="selectin"
    )

class Script(Base):
    """Script model for storing uploaded scripts and their analysis."""
    __tablename__ = "scripts"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    script_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON)
    analysis: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Define relationships
    user: Mapped["User"] = relationship(back_populates="scripts")
    sessions: Mapped[List["Session"]] = relationship(back_populates="script", cascade="all, delete-orphan")
    characters: Mapped[List["Character"]] = relationship(
        secondary=script_characters,
        back_populates="scripts",
        lazy="selectin",
        cascade="all, delete"
    )
    scenes: Mapped[List["Scene"]] = relationship(back_populates="script", cascade="all, delete-orphan")

class Character(Base):
    """Character model for storing character information."""
    __tablename__ = 'characters'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text)
    traits: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Define relationships
    scripts: Mapped[List["Script"]] = relationship(
        secondary=script_characters,
        back_populates="characters",
        lazy="selectin",
        cascade="all, delete"
    )
    performances: Mapped[List["Performance"]] = relationship(back_populates="character", cascade="all, delete-orphan")

class Session(Base):
    """Session model for tracking practice sessions."""
    __tablename__ = "sessions"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    script_id: Mapped[int] = mapped_column(ForeignKey('scripts.id', ondelete='CASCADE'))
    title: Mapped[str] = mapped_column(String)
    content: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Define relationships
    script: Mapped["Script"] = relationship(back_populates="sessions")
    users: Mapped[List["User"]] = relationship(
        secondary=session_users,
        back_populates="sessions",
        lazy="selectin"
    )
    scenes: Mapped[List["Scene"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    performances: Mapped[List["Performance"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    recordings: Mapped[List["Recording"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    feedback: Mapped[List["Feedback"]] = relationship(back_populates="session", cascade="all, delete-orphan")

class Scene(Base):
    """Scene model for storing scene information."""
    __tablename__ = 'scenes'

    id: Mapped[int] = mapped_column(primary_key=True)
    script_id: Mapped[int] = mapped_column(ForeignKey('scripts.id', ondelete='CASCADE'))
    session_id: Mapped[int] = mapped_column(ForeignKey('sessions.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    scene_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON)
    order: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Define relationships
    script: Mapped["Script"] = relationship(back_populates="scenes")
    session: Mapped["Session"] = relationship(back_populates="scenes")
    performances: Mapped[List["Performance"]] = relationship(back_populates="scene", cascade="all, delete-orphan")

class Performance(Base):
    """Performance model for storing user performance data."""
    __tablename__ = 'performances'

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey('sessions.id', ondelete='CASCADE'))
    character_id: Mapped[int] = mapped_column(ForeignKey('characters.id', ondelete='CASCADE'))
    scene_id: Mapped[int] = mapped_column(ForeignKey('scenes.id', ondelete='CASCADE'))
    metrics: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Define relationships
    session: Mapped["Session"] = relationship(back_populates="performances")
    character: Mapped["Character"] = relationship(back_populates="performances")
    scene: Mapped["Scene"] = relationship(back_populates="performances")

class Recording(Base):
    """Recording model for storing audio recordings."""
    __tablename__ = 'recordings'

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey('sessions.id', ondelete='CASCADE'))
    audio_path: Mapped[str] = mapped_column(String)
    transcription: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Define relationships
    session: Mapped["Session"] = relationship(back_populates="recordings")

class Feedback(Base):
    """Feedback model for storing user feedback."""
    __tablename__ = 'feedback'

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey('sessions.id', ondelete='CASCADE'))
    content: Mapped[str] = mapped_column(String)
    metrics: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Define relationships
    session: Mapped["Session"] = relationship(back_populates="feedback")

class TTSCache(Base):
    """Cache model for TTS outputs."""
    __tablename__ = 'tts_cache'

    id: Mapped[int] = mapped_column(primary_key=True)
    text_hash: Mapped[str] = mapped_column(String, unique=True)
    voice_id: Mapped[str] = mapped_column(String)
    audio_path: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_accessed: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now()) 