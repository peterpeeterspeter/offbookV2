"""Test SQLAlchemy models and database operations."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from src.database.models import User, Script, Session, Recording, RecordingAnalysis, Feedback
from .test_data import (
    create_test_user_data,
    create_test_script_data,
    create_test_session_data,
    create_test_recording_data,
    create_test_feedback_data
)

@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    """Test user creation and retrieval."""
    user_data = create_test_user_data(unique_id=1)
    user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password="test_hash"
    )
    db_session.add(user)
    await db_session.flush()

    assert user.id is not None
    assert user.username == user_data["username"]
    assert user.email == user_data["email"]

@pytest.mark.asyncio
async def test_create_script(db_session: AsyncSession):
    """Test script creation and retrieval."""
    # Create user first
    user_data = create_test_user_data(unique_id=2)
    user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password="test_hash"
    )
    db_session.add(user)
    await db_session.flush()

    # Create script with user_id
    script_data = create_test_script_data(unique_id=1)
    script = Script(
        user_id=user.id,
        title=script_data["title"],
        content=script_data["content"],
        script_metadata={},
        analysis={}
    )
    db_session.add(script)
    await db_session.flush()

    assert script.id is not None
    assert script.title == script_data["title"]
    assert script.content == script_data["content"]
    assert script.user_id == user.id

@pytest.mark.asyncio
async def test_create_session_with_settings(db_session: AsyncSession):
    """Test session creation with settings."""
    # Create user first
    user_data = create_test_user_data(unique_id=3)
    user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password="test_hash"
    )
    db_session.add(user)
    await db_session.flush()

    # Create script with user_id
    script_data = create_test_script_data(unique_id=2)
    script = Script(
        user_id=user.id,
        title=script_data["title"],
        content=script_data["content"],
        script_metadata={},
        analysis={}
    )
    db_session.add(script)
    await db_session.flush()

    # Create session
    session_data = create_test_session_data(script.id)
    session = Session(
        script_id=script.id,
        title="Test Session",
        content="Session content",
        settings=session_data["settings"]
    )
    db_session.add(session)
    await db_session.flush()

    assert session.id is not None
    assert session.script_id == script.id
    assert session.settings == session_data["settings"]

@pytest.mark.asyncio
async def test_create_recording_with_analysis(db_session: AsyncSession):
    """Test recording creation with analysis."""
    # Create user first
    user_data = create_test_user_data(unique_id=4)
    user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password="test_hash"
    )
    db_session.add(user)
    await db_session.flush()

    # Create script with user_id
    script_data = create_test_script_data(unique_id=3)
    script = Script(
        user_id=user.id,
        title=script_data["title"],
        content=script_data["content"],
        script_metadata={},
        analysis={}
    )
    db_session.add(script)
    await db_session.flush()

    # Create session
    session = Session(
        script_id=script.id,
        title="Test Session",
        content="Session content",
        settings={}
    )
    db_session.add(session)
    await db_session.flush()

    # Create recording
    recording_data = create_test_recording_data(unique_id=1)
    recording = Recording(
        session_id=session.id,
        audio_path="/path/to/audio.wav"
    )
    db_session.add(recording)
    await db_session.flush()

    # Create recording analysis
    analysis = RecordingAnalysis(
        recording_id=recording.id,
        transcription=recording_data["transcription"],
        accuracy_score=recording_data["accuracy_score"],
        timing_score=recording_data["timing_score"],
        pronunciation_score=recording_data["pronunciation_score"],
        emotion_score=recording_data["emotion_score"],
        overall_score=recording_data["overall_score"],
        suggestions=recording_data["suggestions"]
    )
    db_session.add(analysis)
    await db_session.flush()

    assert recording.id is not None
    assert recording.session_id == session.id
    assert analysis.recording_id == recording.id
    assert analysis.transcription == recording_data["transcription"]
    assert analysis.accuracy_score == recording_data["accuracy_score"]

@pytest.mark.asyncio
async def test_cascade_delete(db_session: AsyncSession):
    """Test cascade deletion of related records."""
    # Create user first
    user_data = create_test_user_data(unique_id=5)
    user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password="test_hash"
    )
    db_session.add(user)
    await db_session.flush()

    # Create script with user_id
    script_data = create_test_script_data(unique_id=4)
    script = Script(
        user_id=user.id,
        title=script_data["title"],
        content=script_data["content"],
        script_metadata={},
        analysis={}
    )
    db_session.add(script)
    await db_session.flush()

    # Create session
    session = Session(
        script_id=script.id,
        title="Test Session",
        content="Session content",
        settings={}
    )
    db_session.add(session)
    await db_session.flush()

    # Create recording
    recording_data = create_test_recording_data(unique_id=2)
    recording = Recording(
        session_id=session.id,
        audio_path="/path/to/audio.wav"
    )
    db_session.add(recording)
    await db_session.flush()

    # Create recording analysis
    analysis = RecordingAnalysis(
        recording_id=recording.id,
        transcription=recording_data["transcription"],
        accuracy_score=recording_data["accuracy_score"],
        timing_score=recording_data["timing_score"],
        pronunciation_score=recording_data["pronunciation_score"],
        emotion_score=recording_data["emotion_score"],
        overall_score=recording_data["overall_score"],
        suggestions=recording_data["suggestions"]
    )
    db_session.add(analysis)
    await db_session.flush()

    # Delete script and verify cascade
    await db_session.delete(script)
    await db_session.flush()

    # Verify deletion
    result = await db_session.get(Script, script.id)
    assert result is None

    session_result = await db_session.get(Session, session.id)
    assert session_result is None

    recording_result = await db_session.get(Recording, recording.id)
    assert recording_result is None

    analysis_result = await db_session.get(RecordingAnalysis, analysis.id)
    assert analysis_result is None

@pytest.mark.asyncio
async def test_relationship_loading(db_session: AsyncSession):
    """Test relationship loading between models."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from sqlalchemy.util._concurrency_py3k import greenlet_spawn

    # Create user first
    user_data = create_test_user_data(unique_id=6)
    user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password="test_hash"
    )
    db_session.add(user)
    await db_session.flush()

    # Create script with user_id
    script_data = create_test_script_data(unique_id=5)
    script = Script(
        user_id=user.id,
        title=script_data["title"],
        content=script_data["content"],
        script_metadata={},
        analysis={}
    )
    db_session.add(script)
    await db_session.flush()

    # Create session
    session = Session(
        script_id=script.id,
        title="Test Session",
        content="Session content",
        settings={}
    )
    db_session.add(session)
    await db_session.flush()

    # Create recording
    recording_data = create_test_recording_data(unique_id=3)
    recording = Recording(
        session_id=session.id,
        audio_path="/path/to/audio.wav"
    )
    db_session.add(recording)
    await db_session.flush()

    # Create recording analysis
    analysis = RecordingAnalysis(
        recording_id=recording.id,
        transcription=recording_data["transcription"],
        accuracy_score=recording_data["accuracy_score"],
        timing_score=recording_data["timing_score"],
        pronunciation_score=recording_data["pronunciation_score"],
        emotion_score=recording_data["emotion_score"],
        overall_score=recording_data["overall_score"],
        suggestions=recording_data["suggestions"]
    )
    db_session.add(analysis)
    await db_session.flush()

    # Test relationship loading
    db_session.expire_all()

    async def load_relationships():
        # This function runs in a separate greenlet
        stmt = select(Session).options(
            selectinload(Session.recordings).selectinload(Recording.analyses)
        ).where(Session.id == session.id)
        # Execute and get scalar result in one step
        result = await db_session.execute(stmt)
        loaded_session = await result.scalar()
        return loaded_session

    # Execute the greenlet and get result directly
    loaded_session = await greenlet_spawn(load_relationships())

    # Verify the loaded session
    assert loaded_session is not None
    assert loaded_session.title == "Test Session"
    assert loaded_session.content == "Session content"
    assert len(loaded_session.recordings) == 1
    assert loaded_session.recordings[0].audio_path == "/path/to/audio.wav"
    assert len(loaded_session.recordings[0].analyses) == 1
    assert loaded_session.recordings[0].analyses[0].transcription == recording_data["transcription"]
    assert loaded_session.recordings[0].analyses[0].accuracy_score == recording_data["accuracy_score"]
    assert loaded_session.recordings[0].analyses[0].timing_score == recording_data["timing_score"]
    assert loaded_session.recordings[0].analyses[0].pronunciation_score == recording_data["pronunciation_score"]
    assert loaded_session.recordings[0].analyses[0].emotion_score == recording_data["emotion_score"]
    assert loaded_session.recordings[0].analyses[0].overall_score == recording_data["overall_score"]
    assert loaded_session.recordings[0].analyses[0].suggestions == recording_data["suggestions"] 