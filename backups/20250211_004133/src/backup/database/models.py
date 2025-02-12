from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    ForeignKey, JSON, Enum, Table
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from typing import List
import enum

Base = declarative_base()

# Association tables for many-to-many relationships
script_characters = Table(
    'script_characters',
    Base.metadata,
    Column('script_id', Integer, ForeignKey('scripts.id'), primary_key=True),
    Column('character_id', Integer, ForeignKey('characters.id'), primary_key=True)
)

session_users = Table(
    'session_users',
    Base.metadata,
    Column('session_id', Integer, ForeignKey('practice_sessions.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True)
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
    """User model for storing user information."""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    last_active = Column(DateTime, onupdate=func.now())
    
    # Relationships
    performances = relationship("Performance", back_populates="user")
    sessions = relationship(
        "PracticeSession",
        secondary=session_users,
        back_populates="participants"
    )
    feedback_given = relationship(
        "Feedback",
        foreign_keys="[Feedback.from_user_id]",
        back_populates="from_user"
    )
    feedback_received = relationship(
        "Feedback",
        foreign_keys="[Feedback.to_user_id]",
        back_populates="to_user"
    )

class Script(Base):
    """Script model for storing script information."""
    __tablename__ = 'scripts'

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    language = Column(String, default='en')
    scene_count = Column(Integer, default=0)
    total_lines = Column(Integer, default=0)
    estimated_duration = Column(Float, default=0.0)
    metadata = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    characters = relationship(
        "Character",
        secondary=script_characters,
        back_populates="scripts"
    )
    scenes = relationship("Scene", back_populates="script")
    sessions = relationship("PracticeSession", back_populates="script")

class Character(Base):
    """Character model for storing character information."""
    __tablename__ = 'characters'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    emotional_profile = Column(JSON)  # Store emotional patterns
    common_phrases = Column(JSON)  # Store frequently used phrases
    voice_settings = Column(JSON)  # Store TTS voice settings
    
    # Relationships
    scripts = relationship(
        "Script",
        secondary=script_characters,
        back_populates="characters"
    )
    performances = relationship("Performance", back_populates="character")

class Scene(Base):
    """Scene model for storing scene information."""
    __tablename__ = 'scenes'

    id = Column(Integer, primary_key=True)
    script_id = Column(Integer, ForeignKey('scripts.id'))
    scene_number = Column(Integer, nullable=False)
    content = Column(String, nullable=False)
    duration_estimate = Column(Float, default=0.0)
    emotion_flow = Column(JSON)  # Store emotional progression
    intensity_score = Column(Float, default=0.0)
    
    # Relationships
    script = relationship("Script", back_populates="scenes")
    performances = relationship("Performance", back_populates="scene")

class PracticeSession(Base):
    """Practice session model for storing session information."""
    __tablename__ = 'practice_sessions'

    id = Column(Integer, primary_key=True)
    script_id = Column(Integer, ForeignKey('scripts.id'))
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    settings = Column(JSON)  # Store session settings
    
    # Relationships
    script = relationship("Script", back_populates="sessions")
    participants = relationship(
        "User",
        secondary=session_users,
        back_populates="sessions"
    )
    performances = relationship("Performance", back_populates="session")
    feedback = relationship("Feedback", back_populates="session")

class Performance(Base):
    """Performance model for storing user performance data."""
    __tablename__ = 'performances'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    session_id = Column(Integer, ForeignKey('practice_sessions.id'))
    character_id = Column(Integer, ForeignKey('characters.id'))
    scene_id = Column(Integer, ForeignKey('scenes.id'))
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    emotion_accuracy = Column(Float)
    timing_score = Column(Float)
    pronunciation_score = Column(Float)
    overall_score = Column(Float)
    metrics = Column(JSON)  # Store detailed performance metrics
    
    # Relationships
    user = relationship("User", back_populates="performances")
    session = relationship("PracticeSession", back_populates="performances")
    character = relationship("Character", back_populates="performances")
    scene = relationship("Scene", back_populates="performances")
    recordings = relationship("Recording", back_populates="performance")

class Recording(Base):
    """Recording model for storing audio recordings."""
    __tablename__ = 'recordings'

    id = Column(Integer, primary_key=True)
    performance_id = Column(Integer, ForeignKey('performances.id'))
    file_path = Column(String, nullable=False)
    duration = Column(Float)
    transcription = Column(String)
    emotion_analysis = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    performance = relationship("Performance", back_populates="recordings")

class Feedback(Base):
    """Feedback model for storing user feedback."""
    __tablename__ = 'feedback'

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('practice_sessions.id'))
    from_user_id = Column(Integer, ForeignKey('users.id'))
    to_user_id = Column(Integer, ForeignKey('users.id'))
    content = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    session = relationship("PracticeSession", back_populates="feedback")
    from_user = relationship(
        "User",
        foreign_keys=[from_user_id],
        back_populates="feedback_given"
    )
    to_user = relationship(
        "User",
        foreign_keys=[to_user_id],
        back_populates="feedback_received"
    )

class TTSCache(Base):
    """Cache model for TTS outputs."""
    __tablename__ = 'tts_cache'

    id = Column(Integer, primary_key=True)
    text = Column(String, nullable=False)
    voice_id = Column(String, nullable=False)
    settings = Column(JSON)
    audio_path = Column(String, nullable=False)
    duration = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    last_accessed = Column(DateTime, onupdate=func.now())
    access_count = Column(Integer, default=0) 