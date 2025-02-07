import pytest
import pytest_asyncio
from httpx import AsyncClient
import io
import numpy as np
import soundfile as sf
from typing import AsyncGenerator, Dict, Any

from src.main import app
from src.database.models import User, Script, Session
from src.services.auth import create_access_token

def create_test_audio() -> io.BytesIO:
    """Create a test audio file."""
    sample_rate = 44100
    duration = 2.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    audio = np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave

    buffer = io.BytesIO()
    sf.write(buffer, audio, sample_rate, format='WAV')
    buffer.seek(0)
    return buffer

@pytest_asyncio.fixture
async def test_user(client: AsyncClient) -> AsyncGenerator[Dict[str, Any], None]:
    """Create a test user and return credentials."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    }
    response = await client.post("/auth/register", json=user_data)
    assert response.status_code == 200
    try:
        yield {
            "user": user_data,
            "token": response.json()["access_token"]
        }
    finally:
        # Cleanup user if needed
        pass

@pytest_asyncio.fixture
async def test_script(
    client: AsyncClient,
    test_user: Dict[str, Any]
) -> AsyncGenerator[int, None]:
    """Create a test script and return its ID."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    script_content = "Test script content for practice"
    files = {
        "file": ("test_script.txt", script_content.encode())
    }
    response = await client.post(
        "/scripts/upload",
        headers=headers,
        files=files
    )
    assert response.status_code == 200
    try:
        yield response.json()["id"]
    finally:
        # Cleanup script if needed
        pass

@pytest_asyncio.fixture
async def test_session(
    client: AsyncClient,
    test_user: Dict[str, Any],
    test_script: int
) -> AsyncGenerator[int, None]:
    """Create a test session and return its ID."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    session_data = {
        "script_id": test_script,
        "settings": {
            "character_name": "Test Character",
            "scene_number": 1
        }
    }
    response = await client.post(
        "/sessions/create",
        headers=headers,
        json=session_data
    )
    assert response.status_code == 201
    try:
        yield response.json()["id"]
    finally:
        # Cleanup session if needed
        pass

@pytest.mark.asyncio
async def test_create_session(
    client: AsyncClient,
    test_user: Dict[str, Any],
    test_script: int
):
    """Test session creation endpoint."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    session_data = {
        "script_id": test_script,
        "settings": {
            "character_name": "Test Character",
            "scene_number": 1
        }
    }

    response = await client.post(
        "/sessions/create",
        headers=headers,
        json=session_data
    )
    assert response.status_code == 201

    data = response.json()
    assert "id" in data
    assert "title" in data
    assert "settings" in data
    assert data["settings"]["character_name"] == "Test Character"
    assert data["settings"]["scene_number"] == 1

@pytest.mark.asyncio
async def test_create_session_invalid_script(
    client: AsyncClient,
    test_user: Dict[str, Any]
):
    """Test session creation with invalid script ID."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    session_data = {
        "script_id": 99999,  # Non-existent script ID
        "settings": {
            "character_name": "Test Character",
            "scene_number": 1
        }
    }

    response = await client.post(
        "/sessions/create",
        headers=headers,
        json=session_data
    )
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_upload_recording(
    client: AsyncClient,
    test_user: Dict[str, Any],
    test_session: int
):
    """Test recording upload and analysis endpoint."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    audio_file = create_test_audio()

    files = {
        "file": ("test_recording.wav", audio_file, "audio/wav")
    }

    response = await client.post(
        f"/sessions/{test_session}/recordings",
        headers=headers,
        files=files
    )
    assert response.status_code == 200

    data = response.json()
    assert "id" in data
    assert "analysis" in data
    assert "accuracy" in data["analysis"]
    assert "performance_metrics" in data["analysis"]
    assert "suggestions" in data["analysis"]

@pytest.mark.asyncio
async def test_get_session_analysis(test_client: AsyncClient, test_user, test_session):
    """Test getting session analysis."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}

    # First upload a recording
    audio_file = create_test_audio()
    files = {
        "file": ("test_recording.wav", audio_file, "audio/wav")
    }
    response = await test_client.post(
        f"/sessions/{test_session}/recordings",
        headers=headers,
        files=files
    )
    assert response.status_code == 200

    # Then get the analysis
    response = await test_client.get(
        f"/sessions/{test_session}/analysis",
        headers=headers
    )
    assert response.status_code == 200

    data = response.json()
    assert "accuracy" in data
    assert "timing" in data
    assert "performance_metrics" in data
    assert "suggestions" in data

@pytest.mark.asyncio
async def test_get_session_feedback(test_client: AsyncClient, test_user, test_session):
    """Test getting session feedback."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}

    # First upload a recording
    audio_file = create_test_audio()
    files = {
        "file": ("test_recording.wav", audio_file, "audio/wav")
    }
    response = await test_client.post(
        f"/sessions/{test_session}/recordings",
        headers=headers,
        files=files
    )
    assert response.status_code == 200

    # Then get the feedback
    response = await test_client.get(
        f"/sessions/{test_session}/feedback",
        headers=headers
    )
    assert response.status_code == 200

    data = response.json()
    assert "performance_score" in data
    assert "accuracy_score" in data
    assert "suggestions" in data
    assert "settings" in data
    assert "improvements" in data

@pytest.mark.asyncio
async def test_unauthorized_access(test_client: AsyncClient, test_session):
    """Test unauthorized access to endpoints."""
    # Try to access without token
    response = await test_client.get(f"/sessions/{test_session}/feedback")
    assert response.status_code == 401

    # Try to access with invalid token
    headers = {"Authorization": "Bearer invalid_token"}
    response = await test_client.get(f"/sessions/{test_session}/feedback", headers=headers)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_session_not_found(test_client: AsyncClient, test_user):
    """Test accessing non-existent session."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}

    response = await test_client.get("/sessions/99999/feedback", headers=headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_invalid_audio_file(test_client: AsyncClient, test_user, test_session):
    """Test uploading invalid audio file."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}

    # Create invalid audio file
    invalid_audio = io.BytesIO(b"invalid audio data")
    files = {
        "file": ("invalid.wav", invalid_audio, "audio/wav")
    }

    response = await test_client.post(
        f"/sessions/{test_session}/recordings",
        headers=headers,
        files=files
    )
    assert response.status_code == 500  # Should handle invalid audio gracefully
