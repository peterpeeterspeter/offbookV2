import pytest
import asyncio
import numpy as np
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, UTC

from ..vad_service import VADService, VADState, VADConfig
from ..websocket_manager import WebSocketManager, WebSocketState, ConnectionConfig
from ..performance_monitor import performance_monitor


@pytest.fixture
def integrated_services():
    """Create integrated VAD and WebSocket services."""
    vad_config = VADConfig(
        sample_rate=16000,
        frame_duration=30,
        threshold=0.5,
        min_speech_duration=100,
        min_silence_duration=100,
    )
    ws_config = ConnectionConfig(
        heartbeat_interval=1000, reconnect_delay=100, max_reconnect_attempts=3
    )

    vad_service = VADService(config=vad_config)
    ws_manager = WebSocketManager(config=ws_config)

    return {"vad": vad_service, "ws": ws_manager}


@pytest.fixture
def mock_services():
    """Mock external dependencies."""
    with patch("src.services.vad_service.WebWorker") as mock_worker, patch(
        "websockets.connect"
    ) as mock_ws_connect, patch(
        "src.services.vad_service.performance_monitor"
    ) as mock_perf:

        # Configure worker mock
        worker = Mock()
        worker.postMessage = AsyncMock()
        worker.onmessage = None
        mock_worker.return_value = worker

        # Configure WebSocket mock
        mock_ws = AsyncMock()
        mock_ws.send = AsyncMock()
        mock_ws.send_json = AsyncMock()
        mock_ws.receive = AsyncMock()
        mock_ws.receive_json = AsyncMock()
        mock_ws.close = AsyncMock()
        mock_ws_connect.return_value = mock_ws

        # Configure performance monitor
        mock_perf.track_latency = AsyncMock()
        mock_perf.track_memory = AsyncMock()
        mock_perf.track_connection = AsyncMock()

        yield {"worker": worker, "websocket": mock_ws, "performance": mock_perf}


@pytest.mark.asyncio
async def test_realtime_vad_streaming(integrated_services, mock_services):
    """Test real-time VAD processing over WebSocket."""
    vad = integrated_services["vad"]
    ws = integrated_services["ws"]

    # Initialize services
    await vad.initialize()
    await ws.connect("ws://test.com")

    # Simulate audio streaming
    audio_chunks = [np.random.rand(16000).astype(np.float32) for _ in range(3)]

    for chunk in audio_chunks:
        # Process audio with VAD
        vad_result = await vad.process_audio_chunk(chunk)
        # Send result over WebSocket
        await ws.send_message({"type": "vad_result", "data": vad_result})

    assert mock_services["websocket"].send_json.call_count == 3
    assert vad.state in [VADState.SPEECH, VADState.SILENCE]


@pytest.mark.asyncio
async def test_bidirectional_communication(integrated_services, mock_services):
    """Test bidirectional communication between VAD and WebSocket."""
    vad = integrated_services["vad"]
    ws = integrated_services["ws"]

    await vad.initialize()
    await ws.connect("ws://test.com")

    # Simulate receiving config update from server
    mock_services["websocket"].receive_json.return_value = {
        "type": "config_update",
        "data": {"threshold": 0.7, "frame_duration": 40},
    }

    # Handle config update
    message = await ws.receive_message()
    if message["type"] == "config_update":
        vad.update_config(message["data"])

    assert vad.config.threshold == 0.7
    assert vad.config.frame_duration == 40


@pytest.mark.asyncio
async def test_error_propagation(integrated_services, mock_services):
    """Test error propagation between services."""
    vad = integrated_services["vad"]
    ws = integrated_services["ws"]

    await vad.initialize()
    await ws.connect("ws://test.com")

    # Simulate VAD error
    error_message = "VAD processing error"
    vad._handle_worker_error(error_message)

    # Verify error is sent over WebSocket
    await ws.send_message({"type": "error", "service": "vad", "message": error_message})

    assert vad.state == VADState.ERROR
    mock_services["websocket"].send_json.assert_called_with(
        {"type": "error", "service": "vad", "message": error_message}
    )


@pytest.mark.asyncio
async def test_performance_metrics_integration(integrated_services, mock_services):
    """Test integrated performance monitoring."""
    vad = integrated_services["vad"]
    ws = integrated_services["ws"]

    await vad.initialize()
    await ws.connect("ws://test.com")

    # Process audio and track metrics
    test_audio = np.random.rand(16000).astype(np.float32)
    vad_result = await vad.process_audio_chunk(test_audio)

    # Send metrics over WebSocket
    await ws.send_message(
        {
            "type": "metrics",
            "data": {
                "vad_latency": mock_services["performance"].track_latency.return_value,
                "memory_usage": mock_services["performance"].track_memory.return_value,
                "connection_status": ws.state.value,
            },
        }
    )

    assert mock_services["performance"].track_latency.called
    assert mock_services["performance"].track_memory.called
    assert mock_services["websocket"].send_json.called


@pytest.mark.asyncio
async def test_reconnection_with_state_recovery(integrated_services, mock_services):
    """Test WebSocket reconnection with VAD state recovery."""
    vad = integrated_services["vad"]
    ws = integrated_services["ws"]

    await vad.initialize()
    await ws.connect("ws://test.com")

    # Store initial state
    initial_state = {"vad_state": vad.state, "config": vad.config.dict()}

    # Simulate connection loss
    await ws._handle_connection_loss()

    # Reconnect and restore state
    await ws.connect("ws://test.com")
    await ws.send_message({"type": "state_recovery", "data": initial_state})

    assert ws.state == WebSocketState.CONNECTED
    assert vad.state == initial_state["vad_state"]
    assert vad.config.dict() == initial_state["config"]


@pytest.mark.asyncio
async def test_concurrent_operations(integrated_services, mock_services):
    """Test concurrent VAD processing and WebSocket communication."""
    vad = integrated_services["vad"]
    ws = integrated_services["ws"]

    await vad.initialize()
    await ws.connect("ws://test.com")

    # Create concurrent tasks
    audio_chunks = [np.random.rand(16000).astype(np.float32) for _ in range(5)]

    async def process_and_send(chunk):
        result = await vad.process_audio_chunk(chunk)
        await ws.send_message({"type": "vad_result", "data": result})

    # Run tasks concurrently
    tasks = [process_and_send(chunk) for chunk in audio_chunks]
    await asyncio.gather(*tasks)

    assert mock_services["websocket"].send_json.call_count == 5


@pytest.mark.asyncio
async def test_mobile_optimization_integration(integrated_services, mock_services):
    """Test mobile optimization integration between services."""
    vad = integrated_services["vad"]
    ws = integrated_services["ws"]

    # Configure for mobile
    mobile_config = VADConfig(
        sample_rate=16000,
        frame_duration=20,
        threshold=0.5,
        min_speech_duration=80,
        min_silence_duration=80,
        is_mobile=True,
    )
    vad.update_config(mobile_config.dict())

    await vad.initialize()
    await ws.connect("ws://test.com")

    # Process optimized audio chunk
    test_audio = np.random.rand(8000).astype(np.float32)
    result = await vad.process_audio_chunk(test_audio)

    # Send result with device info
    await ws.send_message(
        {
            "type": "vad_result",
            "data": result,
            "device_info": {
                "is_mobile": True,
                "battery_level": 0.8,
                "connection_type": "4g",
            },
        }
    )

    assert vad.config.is_mobile
    assert mock_services["websocket"].send_json.called


@pytest.mark.asyncio
async def test_performance_benchmarking(integrated_services, mock_services):
    """Benchmark VAD processing and WebSocket communication."""
    vad = integrated_services["vad"]
    ws = integrated_services["ws"]

    await vad.initialize()
    await ws.connect("ws://test.com")

    # Prepare benchmark data
    chunk_sizes = [8000, 16000, 32000]  # Different audio chunk sizes
    results = {}

    for size in chunk_sizes:
        test_audio = np.random.rand(size).astype(np.float32)

        # Measure processing time
        start_time = datetime.now(UTC)
        result = await vad.process_audio_chunk(test_audio)
        await ws.send_message({"type": "vad_result", "data": result})
        duration = (datetime.now(UTC) - start_time).total_seconds() * 1000

        results[size] = {"duration_ms": duration, "success": "isSpeech" in result}

    # Send benchmark results
    await ws.send_message({"type": "benchmark_results", "data": results})

    assert all(size in results for size in chunk_sizes)
    assert all(results[size]["duration_ms"] > 0 for size in chunk_sizes)
