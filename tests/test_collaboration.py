import pytest
from datetime import datetime, timedelta, UTC
from fastapi import HTTPException
from src.services.collaboration_service import (
    collaboration_service,
    CollaboratorInfo,
    CollaborationEvent,
    CollaborationEventType,
    VectorClock,
    StateSnapshot,
)
import asyncio
from typing import Dict, Any


@pytest.fixture
def test_session_data():
    """Provide test session data."""
    return {
        "id": "session1",
        "script_id": 1,
        "title": "Test Session",
        "content": "Test content",
        "settings": {"mode": "practice"},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


@pytest.fixture
def test_user_data():
    """Provide test user data."""
    return {
        "id": "user1",
        "username": "testuser",
        "email": "test@example.com",
        "is_active": True,
    }


@pytest.fixture
def test_script_data():
    """Provide test script data."""
    return {
        "id": 1,
        "user_id": 1,
        "title": "Test Script",
        "content": "Test script content",
        "script_metadata": {"scenes": []},
        "analysis": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


@pytest.fixture
def test_collaborator_info(test_user_data):
    """Create test collaborator info."""
    return CollaboratorInfo(
        id=test_user_data["id"], username=test_user_data["username"]
    )


@pytest.fixture
async def test_session(test_session_data, test_user_data):
    """Create a test session with one user."""
    session_id = test_session_data["id"]
    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"],
        username=test_user_data["username"],
        session_id=session_id,
    )
    return session_id


@pytest.mark.asyncio
async def test_create_session(test_session_data, test_user_data, test_script_data):
    """Test creating a new collaboration session."""
    session = await collaboration_service.create_session(
        script_id=test_script_data["id"],
        title=test_session_data["title"],
        user_id=test_user_data["id"],
    )

    assert session.title == test_session_data["title"]
    assert session.script_id == test_script_data["id"]
    assert len(session.users) == 1
    assert session.users[0].id == test_user_data["id"]


@pytest.mark.asyncio
async def test_join_session(test_session_data, test_user_data):
    """Test joining an existing collaboration session."""
    # Create a session first
    session = await collaboration_service.create_session(
        script_id=test_session_data["script_id"],
        title=test_session_data["title"],
        user_id=test_user_data["id"],
    )

    # Add another user
    new_user_id = "user2"
    new_username = "testuser2"
    await collaboration_service.add_collaborator(
        user_id=new_user_id, username=new_username, session_id=str(session.id)
    )

    # Verify the user was added
    collaborator = collaboration_service.get_collaborator_info(
        new_user_id, str(session.id)
    )
    assert collaborator is not None
    assert collaborator.username == new_username


@pytest.mark.asyncio
async def test_leave_session(test_session_data, test_user_data):
    """Test leaving a collaboration session."""
    # Create and join a session
    session = await collaboration_service.create_session(
        script_id=test_session_data["script_id"],
        title=test_session_data["title"],
        user_id=test_user_data["id"],
    )

    # Leave the session
    await collaboration_service.remove_collaborator(
        user_id=test_user_data["id"], session_id=str(session.id)
    )

    # Verify the user was removed
    collaborator = collaboration_service.get_collaborator_info(
        test_user_data["id"], str(session.id)
    )
    assert collaborator is None


@pytest.mark.asyncio
async def test_update_session_content(test_session_data, test_user_data):
    """Test updating session content."""
    # Create a session
    session = await collaboration_service.create_session(
        script_id=test_session_data["script_id"],
        title=test_session_data["title"],
        user_id=test_user_data["id"],
    )

    # Update content
    new_content = "Updated content"
    collaborator = collaboration_service.get_collaborator_info(
        test_user_data["id"], str(session.id)
    )
    collaborator.content = new_content

    # Verify the content was updated
    assert collaborator.content == new_content


@pytest.mark.asyncio
async def test_get_user_sessions(test_session_data, test_user_data):
    """Test retrieving all sessions for a user."""
    # Create multiple sessions
    session1 = await collaboration_service.create_session(
        script_id=test_session_data["script_id"],
        title="Session 1",
        user_id=test_user_data["id"],
    )

    session2 = await collaboration_service.create_session(
        script_id=test_session_data["script_id"],
        title="Session 2",
        user_id=test_user_data["id"],
    )

    # Get all sessions for the user
    sessions = [
        session_id
        for session_id, users in collaboration_service.sessions.items()
        if test_user_data["id"] in users
    ]

    assert len(sessions) == 2
    assert str(session1.id) in sessions
    assert str(session2.id) in sessions


@pytest.mark.asyncio
async def test_session_not_found():
    """Test handling of non-existent session."""
    with pytest.raises(HTTPException) as exc_info:
        await collaboration_service.get_session(999999)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_concurrent_session_updates(test_session_data, test_user_data):
    """Test concurrent updates to session content."""
    # Create a session
    session = await collaboration_service.create_session(
        script_id=test_session_data["script_id"],
        title=test_session_data["title"],
        user_id=test_user_data["id"],
    )

    # Simulate concurrent updates
    updates = []

    async def update_content(content: str):
        collaborator = collaboration_service.get_collaborator_info(
            test_user_data["id"], str(session.id)
        )
        collaborator.content = content
        updates.append(content)

    await asyncio.gather(
        update_content("Update 1"),
        update_content("Update 2"),
        update_content("Update 3"),
    )

    assert len(updates) == 3
    collaborator = collaboration_service.get_collaborator_info(
        test_user_data["id"], str(session.id)
    )
    assert collaborator.content in updates


@pytest.mark.asyncio
async def test_session_user_limit(test_session_data):
    """Test session user limit handling."""
    # Create a session
    session = await collaboration_service.create_session(
        script_id=test_session_data["script_id"],
        title=test_session_data["title"],
        user_id=1,
    )

    # Add maximum number of users
    for i in range(2, 5):
        await collaboration_service.add_collaborator(
            user_id=i, username=f"user{i}", session_id=str(session.id)
        )

    # Try to add one more user
    with pytest.raises(HTTPException) as exc_info:
        await collaboration_service.add_collaborator(
            user_id=5, username="user5", session_id=str(session.id)
        )
    assert exc_info.value.status_code == 400
    assert "Session is full" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_session_cleanup(test_session_data, test_user_data):
    """Test automatic session cleanup for inactive sessions."""
    # Create a session
    session = await collaboration_service.create_session(
        script_id=test_session_data["script_id"],
        title=test_session_data["title"],
        user_id=test_user_data["id"],
    )

    # Mark session as inactive
    collaborator = collaboration_service.get_collaborator_info(
        test_user_data["id"], str(session.id)
    )
    collaborator.is_active = False

    # Verify session is marked as inactive
    assert not collaborator.is_active


@pytest.mark.asyncio
async def test_add_collaborator(test_user_data):
    """Test adding a collaborator to the session."""
    collaboration_service.reset()  # Clear any existing state

    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"], username=test_user_data["username"]
    )

    collaborator = collaboration_service.get_collaborator_info(test_user_data["id"])
    assert collaborator is not None
    assert collaborator.username == test_user_data["username"]


@pytest.mark.asyncio
async def test_remove_collaborator(test_user_data):
    """Test removing a collaborator from the session."""
    collaboration_service.reset()

    # Add then remove collaborator
    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"], username=test_user_data["username"]
    )
    await collaboration_service.remove_collaborator(test_user_data["id"])

    collaborator = collaboration_service.get_collaborator_info(test_user_data["id"])
    assert collaborator is None


@pytest.mark.asyncio
async def test_assign_role(test_user_data):
    """Test assigning a role to a collaborator."""
    collaboration_service.reset()

    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"], username=test_user_data["username"]
    )

    success = await collaboration_service.assign_role(
        user_id=test_user_data["id"], role="actor"
    )

    assert success is True
    collaborator = collaboration_service.get_collaborator_info(test_user_data["id"])
    assert collaborator.role == "actor"


@pytest.mark.asyncio
async def test_update_line_progress(test_user_data):
    """Test updating line progress for a collaborator."""
    collaboration_service.reset()

    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"], username=test_user_data["username"]
    )

    line_number = 5
    await collaboration_service.update_line_progress(
        user_id=test_user_data["id"], line_number=line_number
    )

    collaborator = collaboration_service.get_collaborator_info(test_user_data["id"])
    assert collaborator.current_line == line_number


@pytest.mark.asyncio
async def test_update_performance_metrics(test_user_data):
    """Test updating performance metrics for a collaborator."""
    collaboration_service.reset()

    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"], username=test_user_data["username"]
    )

    metrics = {"accuracy": 0.95, "timing": 0.85, "emotion": 0.90}

    await collaboration_service.update_performance_metrics(
        user_id=test_user_data["id"], metrics=metrics
    )

    collaborator = collaboration_service.get_collaborator_info(test_user_data["id"])
    assert collaborator.performance_metrics == metrics


@pytest.mark.asyncio
async def test_event_listeners(test_user_data):
    """Test event listener functionality."""
    collaboration_service.reset()

    events = []

    async def event_callback(event: CollaborationEvent):
        events.append(event)

    # Add listener for join events
    collaboration_service.add_event_listener(
        CollaborationEventType.USER_JOINED, event_callback
    )

    # Add collaborator to trigger event
    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"], username=test_user_data["username"]
    )

    assert len(events) == 1
    assert events[0].type == CollaborationEventType.USER_JOINED
    assert events[0].user_id == test_user_data["id"]


@pytest.mark.asyncio
async def test_get_event_history(test_user_data):
    """Test retrieving event history."""
    collaboration_service.reset()

    # Add collaborator to generate events
    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"], username=test_user_data["username"]
    )

    # Get all events
    events = collaboration_service.get_event_history()
    assert len(events) > 0

    # Get specific event type
    join_events = collaboration_service.get_event_history(
        CollaborationEventType.USER_JOINED
    )
    assert len(join_events) > 0
    assert all(
        event.type == CollaborationEventType.USER_JOINED for event in join_events
    )


@pytest.mark.asyncio
async def test_concurrent_updates(test_user_data):
    """Test concurrent updates to the collaboration service."""
    collaboration_service.reset()

    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"], username=test_user_data["username"]
    )

    # Simulate concurrent metric updates
    async def update_metrics(metric_value: float):
        metrics = {"accuracy": metric_value}
        await collaboration_service.update_performance_metrics(
            test_user_data["id"], metrics
        )

    # Run multiple updates concurrently
    values = [0.1, 0.2, 0.3, 0.4, 0.5]
    await asyncio.gather(*[update_metrics(v) for v in values])

    # Verify final state
    collaborator = collaboration_service.get_collaborator_info(test_user_data["id"])
    assert collaborator.performance_metrics["accuracy"] in values


@pytest.mark.asyncio
async def test_real_time_sync(test_session, test_user_data):
    """Test real-time state synchronization."""
    updates = {
        "cursor_position": 100,
        "selected_text": "Hello world",
        "timestamp": datetime.now(UTC).timestamp(),
    }

    # Update state
    await collaboration_service.update_state(
        test_session, test_user_data["id"], updates
    )

    # Verify state was updated
    collaborator = collaboration_service.get_collaborator_info(
        test_user_data["id"], test_session
    )
    assert collaborator.last_known_state == updates
    assert collaborator.vector_clock.timestamps[test_user_data["id"]] == 1


@pytest.mark.asyncio
async def test_conflict_resolution(test_session):
    """Test conflict resolution between multiple users."""
    # Add second user
    user2_id = "user2"
    await collaboration_service.add_collaborator(
        user_id=user2_id, username="testuser2", session_id=test_session
    )

    # Set up conflicting updates
    updates1 = {"cursor_position": 100, "timestamp": datetime.now(UTC).timestamp()}
    updates2 = {"cursor_position": 200, "timestamp": datetime.now(UTC).timestamp() + 1}

    # Make concurrent updates
    await collaboration_service.update_state(test_session, "user1", updates1)
    await collaboration_service.update_state(test_session, user2_id, updates2)

    # Verify conflict resolution (last write wins)
    collaborator1 = collaboration_service.get_collaborator_info("user1", test_session)
    collaborator2 = collaboration_service.get_collaborator_info(user2_id, test_session)

    assert collaborator1.last_known_state["cursor_position"] == 200
    assert collaborator2.last_known_state["cursor_position"] == 200


@pytest.mark.asyncio
async def test_retry_mechanism(test_session, test_user_data):
    """Test operation retry mechanism."""
    operation = {"type": "state_update", "data": {"cursor_position": 100}}

    # Mock a failing operation that succeeds on retry
    fail_count = 0

    async def mock_process_operation(*args):
        nonlocal fail_count
        if fail_count < 2:
            fail_count += 1
            raise Exception("Temporary failure")
        return True

    # Replace _process_operation temporarily
    original_process = collaboration_service._process_operation
    collaboration_service._process_operation = mock_process_operation

    try:
        await collaboration_service.retry_operation(
            test_session, test_user_data["id"], operation
        )
        assert fail_count == 2  # Operation succeeded after 2 retries
    finally:
        # Restore original method
        collaboration_service._process_operation = original_process


@pytest.mark.asyncio
async def test_state_recovery(test_session, test_user_data):
    """Test state recovery from snapshots."""
    # Create initial state
    initial_state = {"cursor_position": 100, "timestamp": datetime.now(UTC).timestamp()}
    await collaboration_service.update_state(
        test_session, test_user_data["id"], initial_state
    )

    # Take snapshot
    await collaboration_service._take_snapshot(test_session)

    # Update state again
    updated_state = {"cursor_position": 200, "timestamp": datetime.now(UTC).timestamp()}
    await collaboration_service.update_state(
        test_session, test_user_data["id"], updated_state
    )

    # Recover state from snapshot
    await collaboration_service.recover_state(test_session)

    # Verify state was recovered
    collaborator = collaboration_service.get_collaborator_info(
        test_user_data["id"], test_session
    )
    assert collaborator.last_known_state["cursor_position"] == 200


@pytest.mark.asyncio
async def test_vector_clock():
    """Test vector clock functionality."""
    clock1 = VectorClock()
    clock2 = VectorClock()

    # Test increment
    clock1.increment("node1")
    assert clock1.timestamps["node1"] == 1

    # Test happens before
    assert clock2.happens_before(clock1)
    assert not clock1.happens_before(clock2)

    # Test concurrent updates
    clock2.increment("node2")
    assert clock1.is_concurrent_with(clock2)

    # Test merge
    clock1.merge(clock2)
    assert clock1.timestamps["node1"] == 1
    assert clock1.timestamps["node2"] == 1


@pytest.mark.asyncio
async def test_snapshot_cleanup(test_session):
    """Test cleanup of old snapshots."""
    # Create multiple snapshots
    for _ in range(5):
        await collaboration_service._take_snapshot(test_session)
        await asyncio.sleep(0.1)  # Small delay between snapshots

    # Set max age to 0 to force cleanup
    collaboration_service.max_snapshot_age = timedelta(seconds=0)
    collaboration_service._cleanup_old_snapshots(test_session)

    # Verify old snapshots were cleaned up
    assert len(collaboration_service.snapshots[test_session]) == 0

    # Reset max age
    collaboration_service.max_snapshot_age = timedelta(hours=24)
