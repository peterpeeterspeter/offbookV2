import pytest
from unittest.mock import AsyncMock, patch
from src.services.deepseek import DeepSeekService
import json
from fastapi import HTTPException
import aiohttp
from aioresponses import aioresponses

@pytest.fixture
def deepseek_service():
    return DeepSeekService(api_key="test-key")

@pytest.mark.asyncio
async def test_analyze_script(deepseek_service):
    """Test script analysis functionality."""
    script_content = "Test script content"
    expected_response = {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "scenes": [],
                    "metadata": {
                        "analyzed_at": "2024-01-29T12:00:00Z",
                        "model": "deepseek-chat",
                        "version": "1.0"
                    },
                    "emotional_cues": [],
                    "roles": []
                })
            }
        }]
    }

    with aioresponses() as m:
        m.post(
            f"{deepseek_service.base_url}/chat/completions",
            status=200,
            payload=expected_response
        )

        analysis = await deepseek_service.analyze_script(script_content)
        assert "scenes" in analysis
        assert "metadata" in analysis
        assert "emotional_cues" in analysis
        assert "roles" in analysis

@pytest.mark.asyncio
async def test_analyze_emotions(deepseek_service):
    """Test emotion analysis with authentication failure and success."""
    text = "This is a happy scene"

    auth_error_response = {
        "error": {
            "message": "Authentication Fails (no such user)",
            "type": "authentication_error",
            "code": "invalid_request_error"
        }
    }

    success_response = {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "emotion": "joy",
                    "confidence": 0.9,
                    "all_emotions": {"joy": 0.9, "neutral": 0.1}
                })
            }
        }]
    }

    with aioresponses() as m:
        # First request - auth error
        m.post(
            f"{deepseek_service.base_url}/chat/completions",
            status=401,
            payload=auth_error_response
        )

        # Second request - success
        m.post(
            f"{deepseek_service.base_url}/chat/completions",
            status=200,
            payload=success_response
        )

        # First call should raise auth error
        with pytest.raises(HTTPException) as exc_info:
            await deepseek_service.analyze_emotions(text)
        assert exc_info.value.status_code == 401
        assert "Authentication Fails" in str(exc_info.value.detail)

        # Second call should succeed
        analysis = await deepseek_service.analyze_emotions(text)
        assert "emotion" in analysis
        assert analysis["emotion"] == "joy"
        assert "confidence" in analysis
        assert "all_emotions" in analysis

@pytest.mark.asyncio
async def test_network_error(deepseek_service):
    """Test network error handling."""
    with aioresponses() as m:
        m.post(
            f"{deepseek_service.base_url}/chat/completions",
            exception=aiohttp.ClientError("Network error")
        )

        with pytest.raises(HTTPException) as exc_info:
            await deepseek_service.analyze_emotions("Test content")
        assert exc_info.value.status_code == 500

@pytest.mark.asyncio
async def test_server_error(deepseek_service):
    """Test server error handling."""
    with aioresponses() as m:
        m.post(
            f"{deepseek_service.base_url}/chat/completions",
            status=500,
            body='{"error": {"message": "Internal server error", "type": "server_error"}}'
        )

        with pytest.raises(HTTPException) as exc_info:
            await deepseek_service.analyze_emotions("Test content")
        assert exc_info.value.status_code == 500
        assert "Internal server error" in str(exc_info.value.detail)

@pytest.mark.asyncio
async def test_rate_limit_error(deepseek_service):
    """Test rate limit error handling."""
    with aioresponses() as m:
        m.post(
            f"{deepseek_service.base_url}/chat/completions",
            status=429,
            body='{"error": {"message": "Rate limit exceeded"}}'
        )

        with pytest.raises(HTTPException) as exc_info:
            await deepseek_service.analyze_emotions("Test content")
        assert exc_info.value.status_code == 429
        assert "Rate limit exceeded" in str(exc_info.value.detail)
