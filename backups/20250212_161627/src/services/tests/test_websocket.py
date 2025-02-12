import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import json
import websockets
from datetime import datetime, UTC

from ..websocket_manager import WebSocketManager, WebSocketState, ConnectionConfig
from ..performance_monitor import performance_monitor


@pytest.fixture
def ws_manager():
    """Create a WebSocketManager instance with test configuration."""
    config = ConnectionConfig(
        heartbeat_interval=1000, reconnect_delay=100, max_reconnect_attempts=3
    )
    manager = WebSocketManager(config=config)
    return manager


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection."""
    mock_ws = AsyncMock()
    mock_ws.send = AsyncMock()
    mock_ws.send_json = AsyncMock()
    mock_ws.receive = AsyncMock()
    mock_ws.receive_json = AsyncMock()
    mock_ws.close = AsyncMock()
    return mock_ws


@pytest.fixture
def mock_performance():
    """Mock performance monitor."""
    with patch("src.services.websocket_manager.performance_monitor") as mock:
        mock.track_latency = AsyncMock()
        mock.track_connection = AsyncMock()
        yield mock


@pytest.mark.asyncio
async def test_connection_establishment(ws_manager, mock_websocket):
    """Test WebSocket connection establishment."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        assert ws_manager.state == WebSocketState.CONNECTED
        assert ws_manager.connection is not None
        assert ws_manager.connection_attempts == 1


@pytest.mark.asyncio
async def test_message_sending(ws_manager, mock_websocket):
    """Test sending messages through WebSocket."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        test_message = {"type": "test", "data": "hello"}
        await ws_manager.send_message(test_message)

        mock_websocket.send_json.assert_called_once_with(test_message)


@pytest.mark.asyncio
async def test_message_receiving(ws_manager, mock_websocket):
    """Test receiving messages through WebSocket."""
    test_message = {"type": "test", "data": "hello"}
    mock_websocket.receive_json.return_value = test_message

    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")
        message = await ws_manager.receive_message()

        assert message == test_message
        mock_websocket.receive_json.assert_called_once()


@pytest.mark.asyncio
async def test_heartbeat(ws_manager, mock_websocket):
    """Test heartbeat mechanism."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")
        await ws_manager._send_heartbeat()

        mock_websocket.send_json.assert_called_with({"type": "heartbeat"})


@pytest.mark.asyncio
async def test_reconnection(ws_manager, mock_websocket):
    """Test automatic reconnection on connection loss."""
    mock_websocket.receive.side_effect = websockets.ConnectionClosed(1000, "test")

    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        # Simulate connection loss
        await ws_manager._handle_connection_loss()

        assert ws_manager.connection_attempts == 2
        assert ws_manager.state == WebSocketState.RECONNECTING


@pytest.mark.asyncio
async def test_error_handling(ws_manager, mock_websocket):
    """Test error handling in WebSocket communication."""
    # Test connection error
    mock_websocket.connect.side_effect = Exception("Connection failed")

    with patch("websockets.connect", side_effect=Exception("Connection failed")):
        with pytest.raises(Exception):
            await ws_manager.connect("ws://test.com")

        assert ws_manager.state == WebSocketState.ERROR
        assert ws_manager.last_error is not None


@pytest.mark.asyncio
async def test_message_validation(ws_manager, mock_websocket):
    """Test message validation before sending."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        # Test invalid message
        with pytest.raises(ValueError):
            await ws_manager.send_message({"type": None})

        # Test valid message
        valid_message = {"type": "test", "data": "valid"}
        await ws_manager.send_message(valid_message)
        mock_websocket.send_json.assert_called_with(valid_message)


@pytest.mark.asyncio
async def test_connection_state_tracking(ws_manager, mock_websocket, mock_performance):
    """Test connection state tracking and metrics."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        assert ws_manager.state == WebSocketState.CONNECTED
        mock_performance.track_connection.assert_called_with(
            "websocket_connected",
            {"attempt": 1, "latency": mock_performance.track_latency.return_value},
        )


@pytest.mark.asyncio
async def test_concurrent_messages(ws_manager, mock_websocket):
    """Test handling concurrent message sending."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        # Send multiple messages concurrently
        messages = [{"type": "test", "id": i} for i in range(5)]
        tasks = [ws_manager.send_message(msg) for msg in messages]
        await asyncio.gather(*tasks)

        assert mock_websocket.send_json.call_count == 5


@pytest.mark.asyncio
async def test_connection_cleanup(ws_manager, mock_websocket):
    """Test proper cleanup on connection close."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")
        await ws_manager.disconnect()

        assert ws_manager.state == WebSocketState.DISCONNECTED
        assert ws_manager.connection is None
        mock_websocket.close.assert_called_once()


@pytest.mark.asyncio
async def test_message_ordering(ws_manager, mock_websocket):
    """Test message ordering preservation."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        sent_messages = []
        for i in range(5):
            msg = {"type": "test", "sequence": i}
            await ws_manager.send_message(msg)
            sent_messages.append(msg)

        # Verify order of sent messages
        calls = mock_websocket.send_json.call_args_list
        received_messages = [call[0][0] for call in calls]
        assert received_messages == sent_messages


@pytest.mark.asyncio
async def test_large_message_handling(ws_manager, mock_websocket):
    """Test handling of large messages."""
    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        # Create a large message
        large_data = "x" * (1024 * 1024)  # 1MB of data
        large_message = {"type": "test", "data": large_data}

        # Test sending large message
        await ws_manager.send_message(large_message)
        mock_websocket.send_json.assert_called_with(large_message)


@pytest.mark.asyncio
async def test_connection_timeout(ws_manager, mock_websocket):
    """Test connection timeout handling."""
    # Mock connection timeout
    mock_websocket.receive.side_effect = asyncio.TimeoutError()

    with patch("websockets.connect", return_value=mock_websocket):
        await ws_manager.connect("ws://test.com")

        with pytest.raises(asyncio.TimeoutError):
            await ws_manager.receive_message(timeout=1.0)

        assert ws_manager.state == WebSocketState.ERROR
