import asyncio
import httpx
import pytest
from pathlib import Path
import json
import base64
import os
import uuid

# Test configuration
BASE_URL = "http://localhost:8002"
TEST_USER = {
    "username": f"testactor_{uuid.uuid4().hex[:8]}",
    "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
    "password": "TestPass123!",
    "full_name": "Test Actor"
}

async def test_complete_flow():
    """Test the complete application flow from registration to performance analysis."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:  # Increased timeout to 30 seconds
        # 1. Register new user
        register_response = await client.post(
            "/auth/register",
            json=TEST_USER
        )
        print(f"Registration response: {register_response.text}")
        assert register_response.status_code == 200
        user_data = register_response.json()
        assert "access_token" in user_data
        
        # Store token for subsequent requests
        headers = {
            "Authorization": f"Bearer {user_data['access_token']}"
        }
        
        # 2. Upload test script
        script_path = Path(__file__).parent / "data" / "test_script.txt"
        with open(script_path, "rb") as f:
            files = {
                "file": ("test_script.txt", f, "text/plain")
            }
            script_response = await client.post(
                "/scripts/upload",
                files=files,
                headers=headers
            )
            print(f"Script upload response: {script_response.text}")
        assert script_response.status_code == 200
        script_data = script_response.json()
        script_id = script_data["id"]
        
        # 3. Create practice session
        session_response = await client.post(
            "/sessions/create",
            json={
                "script_id": script_id,
                "settings": {
                    "character_name": "Romeo",
                    "scene_number": 1
                }
            },
            headers=headers
        )
        print(f"Session creation response: {session_response.text}")
        assert session_response.status_code == 201
        session_data = session_response.json()
        session_id = session_data["id"]
        
        # 4. Upload test audio recording
        audio_path = Path(__file__).parent / "data" / "test_recording.wav"
        with open(audio_path, "rb") as f:
            files = {
                "file": ("recording.wav", f, "audio/wav")
            }
            recording_response = await client.post(
                f"/sessions/{session_id}/recordings",
                files=files,
                headers=headers
            )
        print(f"Recording upload response: {recording_response.text}")
        assert recording_response.status_code == 200
        recording_data = recording_response.json()
        
        # 5. Get performance analysis
        analysis_response = await client.get(
            f"/sessions/{session_id}/analysis",
            headers=headers
        )
        assert analysis_response.status_code == 200
        analysis_data = analysis_response.json()
        
        # Verify analysis data
        assert "accuracy" in analysis_data
        assert "timing" in analysis_data
        assert "performance_metrics" in analysis_data
        assert "suggestions" in analysis_data
        
        # 6. Get session feedback
        feedback_response = await client.get(
            f"/sessions/{session_id}/feedback",
            headers=headers
        )
        assert feedback_response.status_code == 200
        feedback_data = feedback_response.json()
        
        # Print summary
        print("\nTest Results Summary:")
        print(f"User ID: {user_data['user']['id']}")
        print(f"Script ID: {script_id}")
        print(f"Session ID: {session_id}")
        print("\nPerformance Metrics:")
        print(json.dumps(analysis_data["performance_metrics"], indent=2))
        print("\nSuggestions:")
        for suggestion in analysis_data["suggestions"]:
            print(f"- {suggestion}")

if __name__ == "__main__":
    asyncio.run(test_complete_flow()) 
