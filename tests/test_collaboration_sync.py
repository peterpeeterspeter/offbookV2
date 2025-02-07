import pytest
from datetime import datetime, timedelta, UTC
from src.services.collaboration_service import collaboration_service, VectorClock
import asyncio


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
async def test_real_time_sync_with_latency(test_session, test_user_data):
    """Test real-time sync with network latency simulation."""
    updates = {
        "cursor_position": 100,
        "selected_text": "Hello world",
        "timestamp": datetime.now(UTC).timestamp(),
    }

    # Simulate network latency
    await asyncio.sleep(0.1)
    await collaboration_service.update_state(
        test_session, test_user_data["id"], updates
    )

    collaborator = collaboration_service.get_collaborator_info(
        test_user_data["id"], test_session
    )
    assert collaborator.last_known_state == updates
    assert collaborator.vector_clock.timestamps[test_user_data["id"]] == 1


@pytest.mark.asyncio
async def test_concurrent_updates_with_conflict_resolution(test_session):
    """Test conflict resolution with concurrent updates."""
    user2_id = "user2"
    await collaboration_service.add_collaborator(
        user_id=user2_id, username="testuser2", session_id=test_session
    )

    ts = datetime.now(UTC).timestamp()
    updates1 = {"cursor_position": 100, "timestamp": ts, "priority": "high"}
    updates2 = {"cursor_position": 200, "timestamp": ts + 1, "priority": "low"}

    # Simulate concurrent updates
    await asyncio.gather(
        collaboration_service.update_state(test_session, "user1", updates1),
        collaboration_service.update_state(test_session, user2_id, updates2),
    )

    # Verify conflict resolution (priority-based)
    collaborator1 = collaboration_service.get_collaborator_info("user1", test_session)
    collaborator2 = collaboration_service.get_collaborator_info(user2_id, test_session)

    assert collaborator1.last_known_state["cursor_position"] == 100
    assert collaborator2.last_known_state["cursor_position"] == 100


@pytest.mark.asyncio
async def test_offline_sync_recovery(test_session, test_user_data):
    """Test offline support and sync recovery."""
    # Initial state
    initial_state = {
        "content": "Initial content",
        "timestamp": datetime.now(UTC).timestamp(),
    }
    await collaboration_service.update_state(
        test_session, test_user_data["id"], initial_state
    )

    # Simulate offline changes
    offline_changes = [
        {"content": "Offline change 1", "timestamp": datetime.now(UTC).timestamp()},
        {"content": "Offline change 2", "timestamp": datetime.now(UTC).timestamp()},
    ]

    # Simulate coming back online and syncing changes
    for change in offline_changes:
        await collaboration_service.update_state(
            test_session, test_user_data["id"], change
        )

    final_state = collaboration_service.get_collaborator_info(
        test_user_data["id"], test_session
    ).last_known_state

    assert final_state["content"] == "Offline change 2"


@pytest.mark.asyncio
async def test_state_recovery_with_snapshot(test_session, test_user_data):
    """Test state recovery from snapshots with history replay."""
    # Create initial state
    ts = datetime.now(UTC).timestamp()
    initial_state = {"content": "Initial", "timestamp": ts}
    await collaboration_service.update_state(
        test_session, test_user_data["id"], initial_state
    )

    # Take snapshot
    await collaboration_service._take_snapshot(test_session)

    # Make changes
    changes = [
        {"content": "Change 1", "timestamp": ts + 1},
        {"content": "Change 2", "timestamp": ts + 2},
    ]
    for change in changes:
        await collaboration_service.update_state(
            test_session, test_user_data["id"], change
        )

    # Simulate crash and recovery
    await collaboration_service.recover_state(test_session)

    final_state = collaboration_service.get_collaborator_info(
        test_user_data["id"], test_session
    ).last_known_state

    assert final_state["content"] == "Change 2"


@pytest.mark.asyncio
async def test_vector_clock_conflict_detection():
    """Test vector clock-based conflict detection."""
    clock1 = VectorClock()
    clock2 = VectorClock()

    # Simulate concurrent operations
    clock1.increment("node1")
    clock2.increment("node2")

    assert clock1.is_concurrent_with(clock2)
    assert not clock1.happens_before(clock2)

    # Simulate sequential operations
    clock2.merge(clock1)
    clock2.increment("node2")

    assert not clock1.is_concurrent_with(clock2)
    assert clock1.happens_before(clock2)


@pytest.mark.asyncio
async def test_large_state_sync(test_session, test_user_data):
    """Test syncing large state changes efficiently."""
    large_content = "A" * 1000000  # 1MB of content
    large_state = {"content": large_content, "timestamp": datetime.now(UTC).timestamp()}

    start_time = datetime.now(UTC)
    await collaboration_service.update_state(
        test_session, test_user_data["id"], large_state
    )
    end_time = datetime.now(UTC)

    # Verify sync completed within reasonable time
    assert (end_time - start_time) < timedelta(seconds=2)

    final_state = collaboration_service.get_collaborator_info(
        test_user_data["id"], test_session
    ).last_known_state

    assert len(final_state["content"]) == len(large_content)


@pytest.mark.asyncio
async def test_vector_clock():
    """Test vector clock functionality."""
    clock1 = VectorClock()
    clock2 = VectorClock()

    clock1.increment("node1")
    assert clock1.timestamps["node1"] == 1

    assert clock2.happens_before(clock1)
    assert not clock1.happens_before(clock2)

    clock2.increment("node2")
    assert clock1.is_concurrent_with(clock2)

    clock1.merge(clock2)
    assert clock1.timestamps["node1"] == 1
    assert clock1.timestamps["node2"] == 1


@pytest.mark.asyncio
async def test_snapshot_cleanup(test_session):
    """Test cleanup of old snapshots."""
    for _ in range(5):
        await collaboration_service._take_snapshot(test_session)
        await asyncio.sleep(0.1)

    collaboration_service.max_snapshot_age = timedelta(seconds=0)
    collaboration_service._cleanup_old_snapshots(test_session)

    assert len(collaboration_service.snapshots[test_session]) == 0
    collaboration_service.max_snapshot_age = timedelta(hours=24)
