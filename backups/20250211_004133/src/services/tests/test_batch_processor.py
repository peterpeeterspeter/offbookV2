import pytest
import asyncio
from datetime import datetime, UTC
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

from src.services.batch_processor import BatchProcessor
from src.services.elevenlabs import elevenlabs_service
from src.services.deepseek import deepseek_service
from src.services.cache_manager import cache_manager
from src.services.performance_monitor import performance_monitor


@pytest.fixture
def batch_processor():
    """Create a BatchProcessor instance with test configuration."""
    test_cache_dir = Path("test_cache/batch")
    processor = BatchProcessor(max_batch_size=3, cache_dir=test_cache_dir)
    yield processor
    # Cleanup
    if test_cache_dir.exists():
        for file in test_cache_dir.glob("*.json"):
            file.unlink()
        test_cache_dir.rmdir()


@pytest.fixture
def mock_services():
    """Mock all external service dependencies."""
    with patch("src.services.batch_processor.deepseek_service") as mock_deepseek, patch(
        "src.services.batch_processor.elevenlabs_service"
    ) as mock_elevenlabs, patch(
        "src.services.batch_processor.cache_manager"
    ) as mock_cache, patch(
        "src.services.batch_processor.performance_monitor"
    ) as mock_perf:

        # Configure mock responses
        mock_deepseek.analyze_emotion = AsyncMock(
            return_value={"emotion": "happy", "confidence": 0.9}
        )
        mock_deepseek.analyze_script = AsyncMock(
            return_value={"summary": "Test analysis"}
        )
        mock_elevenlabs.generate_speech = AsyncMock(return_value=b"test_audio_data")
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
    test_lines = ["Line 1", "Line 2", "Line 3"]

    result = await batch_processor.process_script_batch(test_lines)

    assert result["total_lines"] == 3
    assert len(result["batches"]) == 1
    assert "analysis" in result
    assert len(result["errors"]) == 0

    # Verify service calls
    mock_services["deepseek"].analyze_emotion.assert_called()
    mock_services["deepseek"].analyze_script.assert_called_once_with(
        "\n".join(test_lines)
    )
    mock_services["cache"].save_to_cache.assert_called_once()
    mock_services["performance"].track_latency.assert_called()


@pytest.mark.asyncio
async def test_process_script_batch_with_voice(batch_processor, mock_services):
    """Test script batch processing with voice generation."""
    test_lines = ["Line 1", "Line 2"]
    voice_id = "test_voice"

    result = await batch_processor.process_script_batch(test_lines, voice_id)

    assert result["total_lines"] == 2
    assert len(result["batches"]) == 1
    assert len(result["batches"][0]["audio_cache_keys"]) == 2

    # Verify TTS service calls
    assert mock_services["elevenlabs"].generate_speech.call_count == 2
    mock_services["performance"].track_api_cost.assert_called_with("elevenlabs", 0.015)


@pytest.mark.asyncio
async def test_batch_size_limits(batch_processor, mock_services):
    """Test processing respects batch size limits."""
    test_lines = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"]

    result = await batch_processor.process_script_batch(test_lines)

    assert result["total_lines"] == 5
    assert len(result["batches"]) == 2  # Should split into 2 batches (3 + 2)
    assert len(result["batches"][0]["lines"]) == 3
    assert len(result["batches"][1]["lines"]) == 2


@pytest.mark.asyncio
async def test_error_handling(batch_processor, mock_services):
    """Test error handling in batch processing."""
    # Configure mock to raise an error
    mock_services["deepseek"].analyze_emotion.side_effect = Exception("Test error")

    test_lines = ["Line 1", "Line 2"]
    result = await batch_processor.process_script_batch(test_lines)

    assert len(result["errors"]) > 0
    assert "Test error" in str(result["errors"][0])
    mock_services["performance"].track_error.assert_called_with("line_processing")


@pytest.mark.asyncio
async def test_empty_input(batch_processor, mock_services):
    """Test handling of empty input."""
    result = await batch_processor.process_script_batch([])

    assert result["total_lines"] == 0
    assert len(result["batches"]) == 0
    assert len(result["errors"]) == 0


def test_get_batch_stats(batch_processor, mock_services):
    """Test retrieving batch processing statistics."""
    # Create some test cache files
    batch_processor.cache_dir.mkdir(parents=True, exist_ok=True)
    test_file = batch_processor.cache_dir / "test_batch.json"
    test_file.write_text("{}")

    stats = batch_processor.get_batch_stats()

    assert stats["total_batches"] == 1
    assert "cache_size_mb" in stats
    assert "last_processed" in stats
    assert "performance" in stats


@pytest.mark.asyncio
async def test_concurrent_line_processing(batch_processor, mock_services):
    """Test concurrent processing of lines within a batch."""
    test_lines = ["Line 1", "Line 2", "Line 3"]

    # Add delay to mock to verify concurrent processing
    async def delayed_response(*args, **kwargs):
        await asyncio.sleep(0.1)
        return {"emotion": "happy", "confidence": 0.9}

    mock_services["deepseek"].analyze_emotion.side_effect = delayed_response

    start_time = datetime.now(UTC)
    result = await batch_processor.process_script_batch(test_lines)
    duration = (datetime.now(UTC) - start_time).total_seconds()

    # Should take ~0.1s for all lines (concurrent) instead of ~0.3s (sequential)
    assert duration < 0.2
    assert len(result["batches"]) == 1
    assert len(result["batches"][0]["emotions"]) == 3


@pytest.mark.asyncio
async def test_cache_directory_creation_error(mock_services):
    """Test error handling when cache directory creation fails."""
    with patch("pathlib.Path.mkdir") as mock_mkdir:
        mock_mkdir.side_effect = PermissionError("Access denied")

        with pytest.raises(Exception) as exc_info:
            BatchProcessor(cache_dir=Path("/invalid/path"))

        assert "Failed to create cache directory" in str(exc_info.value)
        mock_services["performance"].track_error.assert_called_with(
            "batch_processor_init"
        )


@pytest.mark.asyncio
async def test_process_line_service_unavailable(batch_processor, mock_services):
    """Test handling of service unavailability during line processing."""
    mock_services["deepseek"].analyze_emotion.side_effect = ConnectionError(
        "Service unavailable"
    )
    mock_services["elevenlabs"].generate_speech.side_effect = ConnectionError(
        "Service unavailable"
    )

    test_lines = ["Test line"]
    result = await batch_processor.process_script_batch(test_lines)

    assert len(result["errors"]) == 1
    assert "Service unavailable" in str(result["errors"][0])
    mock_services["performance"].track_error.assert_called_with("line_processing")
    mock_services["performance"].track_latency.assert_called()


@pytest.mark.asyncio
async def test_batch_processing_memory_cleanup(batch_processor, mock_services):
    """Test proper cleanup of resources during batch processing."""
    test_lines = ["Line " + "x" * 1000 for _ in range(100)]  # Create large lines

    with patch("gc.collect") as mock_gc:
        result = await batch_processor.process_script_batch(test_lines)

        assert mock_gc.called
        assert len(result["batches"]) > 1
        mock_services["performance"].track_memory.assert_called()


@pytest.mark.asyncio
async def test_api_cost_tracking_accuracy(batch_processor, mock_services):
    """Test accurate tracking of API costs during batch processing."""
    test_lines = ["Line 1", "Line 2"]
    voice_id = "test_voice"

    await batch_processor.process_script_batch(test_lines, voice_id)

    # Verify DeepSeek API cost tracking
    mock_services["performance"].track_api_cost.assert_any_call(
        "deepseek", 0.001  # Cost per emotion analysis
    )

    # Verify ElevenLabs API cost tracking (2 lines = 2 TTS generations)
    assert mock_services["performance"].track_api_cost.call_count >= 3
    calls = mock_services["performance"].track_api_cost.call_args_list
    elevenlabs_costs = [args[0][1] for args in calls if args[0][0] == "elevenlabs"]
    assert sum(elevenlabs_costs) == 0.03  # 0.015 per TTS * 2 lines


@pytest.mark.asyncio
async def test_concurrent_error_propagation(batch_processor, mock_services):
    """Test proper error propagation in concurrent processing."""
    test_lines = ["Line 1", "Line 2", "Line 3"]

    # Make some calls succeed and others fail
    mock_services["deepseek"].analyze_emotion.side_effect = [
        {"emotion": "happy", "confidence": 0.9},
        Exception("Test error"),
        ConnectionError("Network error"),
    ]

    result = await batch_processor.process_script_batch(test_lines)

    assert len(result["errors"]) == 2
    assert any("Test error" in str(err) for err in result["errors"])
    assert any("Network error" in str(err) for err in result["errors"])
    assert len(result["batches"][0]["emotions"]) == 1


@pytest.mark.asyncio
async def test_cache_cleanup_on_error(batch_processor, mock_services):
    """Test cache cleanup when processing fails."""
    test_lines = ["Line 1"]
    mock_services["cache"].save_to_cache.side_effect = Exception("Cache write failed")

    result = await batch_processor.process_script_batch(test_lines)

    assert len(result["errors"]) > 0
    assert "Cache write failed" in str(result["errors"][0])
    mock_services["performance"].track_error.assert_called_with("cache_write")

    # Verify cleanup attempt
    mock_services["cache"].cleanup_failed_cache.assert_called_once()
