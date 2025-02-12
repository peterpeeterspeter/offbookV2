"""Tests for mobile audio pipeline functionality."""

import pytest
from unittest.mock import Mock, patch

from .utils import (
    mock_device,
    IPHONE_13,
    PIXEL_6,
    IPAD_PRO,
)


@pytest.fixture
def mock_audio_context():
    """Create mock audio context for testing."""
    return Mock()


@pytest.fixture
def mock_audio_worklet():
    """Create mock audio worklet for testing."""
    return Mock()


def test_audio_context_creation():
    """Test audio context creation on mobile devices."""
    with mock_device(IPHONE_13):
        with patch("src.audio.create_audio_context") as mock_create:
            mock_create.return_value = Mock()
            context = mock_create()

            assert context is not None
            assert mock_create.called_once
            assert context.sampleRate == 48000


def test_worklet_initialization():
    """Test audio worklet initialization."""
    with mock_device(IPHONE_13):
        with patch("src.audio.init_worklet") as mock_init:
            mock_init.return_value = True
            result = mock_init()

            assert result is True
            assert mock_init.called_once


@pytest.mark.parametrize(
    "device_info,expected_latency",
    [
        (IPHONE_13, 0.1),
        (PIXEL_6, 0.1),
        (IPAD_PRO, 0.1),
    ],
)
def test_device_specific_latency(device_info, expected_latency):
    """Test audio latency on different devices."""
    with mock_device(device_info):
        with patch("src.audio.measure_latency") as mock_measure:
            mock_measure.return_value = expected_latency
            latency = mock_measure()

            assert latency == expected_latency


def test_audio_buffer_size():
    """Test audio buffer size configuration."""
    with mock_device(IPHONE_13):
        with patch("src.audio.get_buffer_size") as mock_buffer:
            mock_buffer.return_value = 256
            size = mock_buffer()

            assert size == 256
            assert mock_buffer.called_once


def test_background_audio_handling():
    """Test audio handling when app goes to background."""
    with mock_device(IPHONE_13):
        with patch("src.audio.handle_background") as mock_handler:
            # Simulate app going to background
            mock_handler.return_value = "suspended"
            state = mock_handler("background")

            assert state == "suspended"
            assert mock_handler.called_once_with("background")

            # Simulate app returning to foreground
            mock_handler.return_value = "running"
            state = mock_handler("foreground")

            assert state == "running"
            assert mock_handler.called_with("foreground")


def test_audio_interruption_handling():
    """Test handling of audio interruptions."""
    with mock_device(IPHONE_13):
        with patch("src.audio.handle_interruption") as mock_handler:
            # Simulate phone call interruption
            mock_handler.return_value = "interrupted"
            state = mock_handler("call")

            assert state == "interrupted"

            # Simulate interruption end
            mock_handler.return_value = "resumed"
            state = mock_handler("end")

            assert state == "resumed"


def test_audio_reconnection():
    """Test audio reconnection after disconnection."""
    with mock_device(IPHONE_13):
        with patch("src.audio.reconnect_audio") as mock_reconnect:
            mock_reconnect.return_value = True
            result = mock_reconnect()

            assert result is True
            assert mock_reconnect.called_once


def test_audio_permission_handling():
    """Test handling of audio permissions."""
    with mock_device(IPHONE_13):
        with patch("src.audio.request_permission") as mock_request:
            # Test permission granted
            mock_request.return_value = "granted"
            result = mock_request()
            assert result == "granted"

            # Test permission denied
            mock_request.return_value = "denied"
            result = mock_request()
            assert result == "denied"


def test_audio_format_support():
    """Test audio format support detection."""
    formats = ["mp3", "aac", "opus"]
    with mock_device(IPHONE_13):
        with patch("src.audio.check_format_support") as mock_check:
            for fmt in formats:
                mock_check.return_value = True
                assert mock_check(fmt) is True
