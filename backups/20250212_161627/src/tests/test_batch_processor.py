import pytest
import asyncio
from datetime import datetime, UTC
from pathlib import Path
from unittest.mock import patch, AsyncMock
from typing import Any

from ..services.batch_processor import BatchProcessor


# Test Constants
TEST_CACHE_DIR = Path("test_cache/batch")
MOCK_PATHS = {
    "deepseek": "src.services.batch_processor.deepseek_service",
    "elevenlabs": "src.services.batch_processor.elevenlabs_service",
    "cache": "src.services.batch_processor.cache_manager",
    "perf": "src.services.batch_processor.performance_monitor",
}
EMOTION_RESPONSE = {"emotion": "happy", "confidence": 0.9}
SCRIPT_RESPONSE = {"summary": "Test analysis"}
AUDIO_RESPONSE = b"test_audio_data"


def setup_mock_response(mock: AsyncMock, response: Any) -> None:
    """Configure a mock with the given response."""
    mock.return_value = response


def setup_mock_error(mock: AsyncMock, error_class: type, msg: str) -> None:
    """Configure a mock to raise an error."""
    mock.side_effect = error_class(msg)


def assert_service_call(mock: AsyncMock, method: str, *args) -> None:
    """Assert that a service method was called with given args."""
    getattr(mock, method).assert_called_with(*args)


@pytest.fixture
def batch_processor():
    """Create a BatchProcessor instance with test configuration."""
    processor = BatchProcessor(max_batch_size=3, cache_dir=TEST_CACHE_DIR)
    yield processor
    # Cleanup
    if TEST_CACHE_DIR.exists():
        for file in TEST_CACHE_DIR.glob("*.json"):
            file.unlink()
        TEST_CACHE_DIR.rmdir()


@pytest.fixture
def mock_services():
    """Mock all external service dependencies."""
    with (
        patch(MOCK_PATHS["deepseek"]) as mock_deepseek,
        patch(MOCK_PATHS["elevenlabs"]) as mock_elevenlabs,
        patch(MOCK_PATHS["cache"]) as mock_cache,
        patch(MOCK_PATHS["perf"]) as mock_perf,
    ):
        # Configure default responses
        setup_mock_response(mock_deepseek.analyze_emotion, EMOTION_RESPONSE)
        setup_mock_response(mock_deepseek.analyze_script, SCRIPT_RESPONSE)
        setup_mock_response(mock_elevenlabs.generate_speech, AUDIO_RESPONSE)
        mock_cache.save_to_cache.return_value = True

        yield {
            "deepseek": mock_deepseek,
            "elevenlabs": mock_elevenlabs,
            "cache": mock_cache,
            "performance": mock_perf,
        }


@pytest.mark.asyncio
async def test_process_script_batch_basic(batch_processor, mock_services):
    """Test basic script batch processing without voice generation."""
    # Arrange
    test_lines = ["Line 1", "Line 2", "Line 3"]

    # Act
    result = await batch_processor.process_script_batch(test_lines)

    # Assert
    assert result["total_lines"] == 3
    assert len(result["batches"]) == 1
    assert "analysis" in result
    assert len(result["errors"]) == 0

    # Verify service calls
    deepseek = mock_services["deepseek"]
    deepseek.analyze_emotion.assert_called()
    deepseek.analyze_script.assert_called_once_with("\n".join(test_lines))
    mock_services["cache"].save_to_cache.assert_called_once()
    mock_services["performance"].track_latency.assert_called()


@pytest.mark.asyncio
async def test_process_script_batch_with_voice(batch_processor, mock_services):
    """Test script batch processing with voice generation."""
    # Arrange
    test_lines = ["Line 1", "Line 2"]
    voice_id = "test_voice"

    # Act
    result = await batch_processor.process_script_batch(test_lines, voice_id)

    # Assert
    assert result["total_lines"] == 2
    assert len(result["batches"]) == 1
    assert len(result["batches"][0]["audio_cache_keys"]) == 2

    # Verify TTS service calls
    elevenlabs = mock_services["elevenlabs"]
    assert elevenlabs.generate_speech.call_count == 2

    perf = mock_services["performance"]
    perf.track_api_cost.assert_called_with("elevenlabs", 0.015)


@pytest.mark.asyncio
async def test_batch_size_limits(batch_processor, mock_services):
    """Test processing respects batch size limits."""
    # Arrange
    test_lines = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"]

    # Act
    result = await batch_processor.process_script_batch(test_lines)

    # Assert - Should split into 2 batches (3 + 2)
    assert result["total_lines"] == 5
    assert len(result["batches"]) == 2
    assert len(result["batches"][0]["lines"]) == 3
    assert len(result["batches"][1]["lines"]) == 2


@pytest.mark.asyncio
async def test_error_handling(batch_processor, mock_services):
    """Test error handling in batch processing."""
    # Arrange
    error_msg = "Test error"
    deepseek = mock_services["deepseek"]
    setup_mock_error(deepseek.analyze_emotion, Exception, error_msg)

    # Act
    test_lines = ["Line 1", "Line 2"]
    result = await batch_processor.process_script_batch(test_lines)

    # Assert
    assert len(result["errors"]) > 0
    assert error_msg in str(result["errors"][0])

    perf = mock_services["performance"]
    perf.track_error.assert_called_with("line_processing")


@pytest.mark.asyncio
async def test_empty_input(batch_processor, mock_services):
    """Test handling of empty input."""
    result = await batch_processor.process_script_batch([])

    assert result["total_lines"] == 0
    assert len(result["batches"]) == 0
    assert len(result["errors"]) == 0


def test_get_batch_stats(batch_processor, mock_services):
    """Test retrieving batch processing statistics."""
    # Arrange
    TEST_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    test_file = TEST_CACHE_DIR / "test_batch.json"
    test_file.write_text("{}")

    # Act
    stats = batch_processor.get_batch_stats()

    # Assert
    assert stats["total_batches"] == 1
    assert "cache_size_mb" in stats
    assert "last_processed" in stats
    assert "performance" in stats


@pytest.mark.asyncio
async def test_concurrent_line_processing(batch_processor, mock_services):
    """Test concurrent processing of lines within a batch."""
    # Arrange
    test_lines = ["Line 1", "Line 2", "Line 3"]

    async def delayed_response(*args, **kwargs):
        await asyncio.sleep(0.1)
        return EMOTION_RESPONSE

    deepseek = mock_services["deepseek"]
    deepseek.analyze_emotion.side_effect = delayed_response

    # Act
    start_time = datetime.now(UTC)
    result = await batch_processor.process_script_batch(test_lines)
    duration = (datetime.now(UTC) - start_time).total_seconds()

    # Assert - Should take ~0.1s for all lines (concurrent)
    assert duration < 0.2
    assert len(result["batches"]) == 1
    assert len(result["batches"][0]["emotions"]) == 3


@pytest.mark.asyncio
async def test_cache_directory_creation_error(mock_services):
    """Test error handling when cache directory creation fails."""
    # Arrange
    with patch("pathlib.Path.mkdir") as mock_mkdir:
        mock_mkdir.side_effect = PermissionError("Access denied")

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            BatchProcessor(cache_dir=Path("/invalid/path"))

        error_msg = str(exc_info.value)
        assert "Failed to create cache directory" in error_msg

        perf = mock_services["performance"]
        perf.track_error.assert_called_with("batch_processor_init")


@pytest.mark.asyncio
async def test_process_line_service_unavailable(
    batch_processor: BatchProcessor,
    mock_services: dict,
) -> None:
    """Test handling of service unavailability during line processing."""
    # Arrange
    error_msg = "Service unavailable"
    deepseek = mock_services["deepseek"]
    elevenlabs = mock_services["elevenlabs"]

    setup_mock_error(deepseek.analyze_emotion, ConnectionError, error_msg)
    setup_mock_error(elevenlabs.generate_speech, ConnectionError, error_msg)

    # Act
    test_lines = ["Test line"]
    result = await batch_processor.process_script_batch(test_lines)

    # Assert
    assert len(result["errors"]) == 1
    assert error_msg in str(result["errors"][0])

    perf = mock_services["performance"]
    perf.track_error.assert_called_with("line_processing")
    perf.track_latency.assert_called()


@pytest.mark.asyncio
async def test_batch_processing_memory_cleanup(batch_processor, mock_services):
    """Test proper cleanup of resources during batch processing."""
    # Arrange - Create large lines
    test_lines = ["Line " + "x" * 1000 for _ in range(100)]

    # Act
    with patch("gc.collect") as mock_gc:
        result = await batch_processor.process_script_batch(test_lines)

        # Assert
        assert mock_gc.called
        assert len(result["batches"]) > 1
        mock_services["performance"].track_memory.assert_called()


@pytest.mark.asyncio
async def test_api_cost_tracking_accuracy(batch_processor, mock_services):
    """Test accurate tracking of API costs during batch processing."""
    # Arrange
    test_lines = ["Line 1", "Line 2"]
    voice_id = "test_voice"

    # Act
    await batch_processor.process_script_batch(test_lines, voice_id)

    # Assert - Verify DeepSeek API cost tracking
    perf = mock_services["performance"]
    # Cost per emotion analysis
    perf.track_api_cost.assert_any_call("deepseek", 0.001)

    # Verify ElevenLabs API cost tracking
    call_count = perf.track_api_cost.call_count
    assert call_count >= 3

    # Calculate total ElevenLabs costs
    calls = perf.track_api_cost.call_args_list
    costs = [args[0][1] for args in calls if args[0][0] == "elevenlabs"]
    total_cost = sum(costs)
    # 0.015 per TTS * 2 lines = 0.03
    assert total_cost == 0.03


@pytest.mark.asyncio
async def test_concurrent_error_propagation(batch_processor, mock_services):
    """Test proper error propagation in concurrent processing."""
    # Arrange
    test_lines = ["Line 1", "Line 2", "Line 3"]
    deepseek = mock_services["deepseek"]

    # Configure mixed success/failure responses
    deepseek.analyze_emotion.side_effect = [
        EMOTION_RESPONSE,
        Exception("Test error"),
        ConnectionError("Network error"),
    ]

    # Act
    result = await batch_processor.process_script_batch(test_lines)

    # Assert
    assert len(result["errors"]) == 2
    error_messages = [str(err) for err in result["errors"]]
    assert any("Test error" in msg for msg in error_messages)
    assert any("Network error" in msg for msg in error_messages)
    assert len(result["batches"][0]["emotions"]) == 1


@pytest.mark.asyncio
async def test_cache_cleanup_on_error(batch_processor, mock_services):
    """Test cache cleanup when processing fails."""
    # Arrange
    test_lines = ["Line 1"]
    error_msg = "Cache write failed"
    cache = mock_services["cache"]
    setup_mock_error(cache.save_to_cache, Exception, error_msg)

    # Act
    result = await batch_processor.process_script_batch(test_lines)

    # Assert
    assert len(result["errors"]) > 0
    assert error_msg in str(result["errors"][0])

    perf = mock_services["performance"]
    perf.track_error.assert_called_with("cache_write")
    cache.cleanup_failed_cache.assert_called_once()
