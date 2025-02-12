import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path
import numpy as np
from datetime import datetime, UTC

from ..vad_service import VADService, VADState, VADConfig
from ..performance_monitor import performance_monitor


@pytest.fixture
def vad_service():
    """Create a VADService instance with test configuration."""
    config = VADConfig(
        sample_rate=16000,
        frame_duration=30,
        threshold=0.5,
        min_speech_duration=100,
        min_silence_duration=100,
    )
    service = VADService(config=config)
    return service


@pytest.fixture
def mock_worker():
    """Mock WebWorker for VAD processing."""
    with patch("src.services.vad_service.WebWorker") as mock:
        worker = Mock()
        worker.postMessage = AsyncMock()
        worker.onmessage = None
        mock.return_value = worker
        yield worker


@pytest.fixture
def mock_performance():
    """Mock performance monitor."""
    with patch("src.services.vad_service.performance_monitor") as mock:
        mock.track_latency = AsyncMock()
        mock.track_memory = AsyncMock()
        yield mock


@pytest.mark.asyncio
async def test_vad_initialization(vad_service, mock_worker):
    """Test VAD service initialization."""
    await vad_service.initialize()

    assert vad_service.is_initialized
    assert vad_service.worker is not None
    mock_worker.postMessage.assert_called_once_with(
        {"type": "init", "config": vad_service.config.dict()}
    )


@pytest.mark.asyncio
async def test_process_audio_chunk(vad_service, mock_worker, mock_performance):
    """Test processing of audio chunks."""
    await vad_service.initialize()

    # Create test audio data
    test_audio = np.random.rand(16000).astype(np.float32)

    # Process audio
    result = await vad_service.process_audio_chunk(test_audio)

    assert "isSpeech" in result
    assert "confidence" in result
    mock_worker.postMessage.assert_called_with(
        {"type": "process", "audio": test_audio.tobytes()}
    )
    mock_performance.track_latency.assert_called_once()


@pytest.mark.asyncio
async def test_state_transitions(vad_service, mock_worker):
    """Test VAD state transitions."""
    await vad_service.initialize()

    # Simulate speech detection
    vad_service._handle_worker_message({"data": {"isSpeech": True, "confidence": 0.8}})
    assert vad_service.state == VADState.SPEECH

    # Simulate silence detection
    vad_service._handle_worker_message({"data": {"isSpeech": False, "confidence": 0.9}})
    assert vad_service.state == VADState.SILENCE


@pytest.mark.asyncio
async def test_error_handling(vad_service, mock_worker):
    """Test error handling in VAD service."""
    await vad_service.initialize()

    # Simulate worker error
    error_message = "Test error"
    vad_service._handle_worker_error(error_message)

    assert vad_service.state == VADState.ERROR
    assert vad_service.last_error == error_message


@pytest.mark.asyncio
async def test_resource_cleanup(vad_service, mock_worker):
    """Test resource cleanup on service termination."""
    await vad_service.initialize()
    await vad_service.cleanup()

    assert vad_service.worker is None
    assert not vad_service.is_initialized
    mock_worker.terminate.assert_called_once()


@pytest.mark.asyncio
async def test_concurrent_processing(vad_service, mock_worker):
    """Test concurrent audio processing."""
    await vad_service.initialize()

    # Create multiple audio chunks
    chunks = [np.random.rand(16000).astype(np.float32) for _ in range(5)]

    # Process chunks concurrently
    tasks = [vad_service.process_audio_chunk(chunk) for chunk in chunks]
    results = await asyncio.gather(*tasks)

    assert len(results) == 5
    assert all("isSpeech" in result for result in results)
    assert mock_worker.postMessage.call_count == 6  # 1 init + 5 process calls


@pytest.mark.asyncio
async def test_performance_monitoring(vad_service, mock_worker, mock_performance):
    """Test performance monitoring integration."""
    await vad_service.initialize()

    # Process audio with performance tracking
    test_audio = np.random.rand(16000).astype(np.float32)
    await vad_service.process_audio_chunk(test_audio)

    mock_performance.track_latency.assert_called_once()
    mock_performance.track_memory.assert_called_once()


@pytest.mark.asyncio
async def test_config_validation(vad_service):
    """Test VAD configuration validation."""
    # Test invalid sample rate
    with pytest.raises(ValueError):
        VADConfig(sample_rate=0)

    # Test invalid frame duration
    with pytest.raises(ValueError):
        VADConfig(frame_duration=-1)

    # Test invalid threshold
    with pytest.raises(ValueError):
        VADConfig(threshold=2.0)


@pytest.mark.asyncio
async def test_websocket_integration(vad_service, mock_worker):
    """Test WebSocket integration for real-time processing."""
    await vad_service.initialize()

    # Mock WebSocket connection
    mock_ws = AsyncMock()
    mock_ws.send_json = AsyncMock()
    mock_ws.receive_bytes = AsyncMock(
        return_value=np.random.rand(16000).astype(np.float32).tobytes()
    )

    # Process audio through WebSocket
    await vad_service.handle_websocket(mock_ws)

    mock_ws.send_json.assert_called()
    assert "isSpeech" in mock_ws.send_json.call_args[0][0]


@pytest.mark.asyncio
async def test_mobile_optimization(vad_service, mock_worker):
    """Test mobile-specific optimizations."""
    # Configure for mobile
    mobile_config = VADConfig(
        sample_rate=16000,
        frame_duration=20,  # Reduced for mobile
        threshold=0.5,
        min_speech_duration=80,  # Adjusted for mobile
        min_silence_duration=80,
        is_mobile=True,
    )

    mobile_service = VADService(config=mobile_config)
    await mobile_service.initialize()

    # Test mobile-optimized processing
    test_audio = np.random.rand(8000).astype(np.float32)  # Smaller chunk for mobile
    result = await mobile_service.process_audio_chunk(test_audio)

    assert "isSpeech" in result
    assert mobile_service.config.is_mobile


@pytest.mark.asyncio
async def test_battery_awareness(vad_service, mock_worker):
    """Test battery-aware processing adjustments."""
    await vad_service.initialize()

    # Simulate low battery
    vad_service.update_battery_status(0.2)  # 20% battery

    # Process audio in battery-saving mode
    test_audio = np.random.rand(16000).astype(np.float32)
    result = await vad_service.process_audio_chunk(test_audio)

    assert vad_service.is_battery_saving_mode
    assert "isSpeech" in result
