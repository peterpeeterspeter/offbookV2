import pytest
from datetime import datetime, UTC
from src.services.collaboration_service import (
    collaboration_service,
    CollaborationEventType,
)


@pytest.fixture(autouse=True)
def setup_teardown():
    """Reset the collaboration service before and after each test."""
    collaboration_service.reset()
    yield
    collaboration_service.reset()


@pytest.fixture
def test_session_data():
    """Provide test session data."""
    return {
        "id": "test_session",
        "script_id": 1,
        "title": "Test Session",
        "content": "Test content",
    }


@pytest.fixture
def test_user_data():
    """Provide test user data."""
    return {"id": "test_user", "username": "testuser"}


@pytest.fixture
async def test_session(test_session_data, test_user_data):
    """Create a test session."""
    session_id = test_session_data["id"]
    await collaboration_service.add_collaborator(
        user_id=test_user_data["id"],
        username=test_user_data["username"],
        session_id=session_id,
    )
    return session_id


@pytest.mark.asyncio
async def test_conflict_resolution_metrics(test_session, test_user_data):
    """Test conflict resolution metrics tracking."""
    # Add second user
    user2_id = "user2"
    await collaboration_service.add_collaborator(
        user_id=user2_id,
        username="testuser2",
        session_id=test_session,
    )

    # Create conflicting updates
    ts = datetime.now(UTC).timestamp()
    updates1 = {"cursor_position": 100, "timestamp": ts}
    updates2 = {"cursor_position": 200, "timestamp": ts + 1}

    # Make concurrent updates
    await collaboration_service.update_state(test_session, "test_user", updates1)
    await collaboration_service.update_state(test_session, user2_id, updates2)

    # Get metrics
    metrics = collaboration_service.get_metrics()
    assert metrics["conflict_resolution"]["total_conflicts"] > 0
    assert metrics["conflict_resolution"]["resolved_conflicts"] > 0
    assert len(metrics["conflict_resolution"]["resolution_times"]) > 0
    assert 0 <= metrics["conflict_resolution"]["resolution_success_rate"] <= 1


@pytest.mark.asyncio
async def test_retry_mechanism_metrics(test_session, test_user_data):
    """Test retry mechanism metrics tracking."""
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
    except Exception:
        pass
    finally:
        collaboration_service._process_operation = original_process

    # Get metrics
    metrics = collaboration_service.get_metrics()
    assert metrics["retry_mechanism"]["total_retries"] > 0
    assert "average_retry_time" in metrics["retry_mechanism"]
    assert 0 <= metrics["retry_mechanism"]["retry_success_rate"] <= 1


@pytest.mark.asyncio
async def test_state_recovery_metrics(test_session, test_user_data):
    """Test state recovery metrics tracking."""
    # Create initial state
    ts = datetime.now(UTC).timestamp()
    initial_state = {"cursor_position": 100, "timestamp": ts}
    await collaboration_service.update_state(
        test_session, test_user_data["id"], initial_state
    )

    # Take snapshot and update state
    await collaboration_service._take_snapshot(test_session)
    updated_state = {"cursor_position": 200, "timestamp": ts + 1}
    await collaboration_service.update_state(
        test_session, test_user_data["id"], updated_state
    )

    # Recover state
    await collaboration_service.recover_state(test_session)

    # Get metrics
    metrics = collaboration_service.get_metrics()
    assert metrics["state_recovery"]["total_recoveries"] > 0
    assert metrics["state_recovery"]["successful_recoveries"] > 0
    assert metrics["state_recovery"]["average_recovery_time"] > 0
    assert 0 <= metrics["state_recovery"]["recovery_success_rate"] <= 1


@pytest.mark.asyncio
async def test_error_logging(test_session, test_user_data):
    """Test error logging functionality."""
    # Trigger an error
    with pytest.raises(Exception):
        await collaboration_service.update_state(
            "invalid_session", test_user_data["id"], {}
        )

    # Check error log
    error_log = collaboration_service.get_error_log()
    assert len(error_log) > 0
    assert "timestamp" in error_log[0]
    assert "type" in error_log[0]
    assert "details" in error_log[0]

    # Test filtered error log
    filtered_log = collaboration_service.get_error_log(error_type="state_update_error")
    assert isinstance(filtered_log, list)


@pytest.mark.asyncio
async def test_metrics_collection(test_session):
    """Test overall metrics collection."""
    metrics = collaboration_service.get_metrics()

    # Check structure
    assert "uptime" in metrics
    assert "active_sessions" in metrics
    assert "conflict_resolution" in metrics
    assert "retry_mechanism" in metrics
    assert "state_recovery" in metrics
    assert "performance" in metrics
    assert "error_count" in metrics

    # Check types
    assert isinstance(metrics["uptime"], float)
    assert isinstance(metrics["active_sessions"], int)
    assert isinstance(metrics["error_count"], int)


@pytest.mark.asyncio
async def test_metrics_events(test_session):
    """Test metrics events are emitted correctly."""
    events = []

    async def event_callback(event):
        if event.type == CollaborationEventType.METRICS_UPDATE:
            events.append(event)

    # Add listener
    collaboration_service.add_event_listener(
        CollaborationEventType.METRICS_UPDATE, event_callback
    )

    # Trigger metrics update
    ts = datetime.now(UTC).timestamp()
    await collaboration_service.update_state(
        test_session, "test_user", {"value": 1, "timestamp": ts}
    )

    # Check events
    assert len(events) > 0
    assert events[0].type == CollaborationEventType.METRICS_UPDATE
    assert "metrics" in events[0].data
