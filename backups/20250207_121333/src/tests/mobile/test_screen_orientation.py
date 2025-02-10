"""Tests for mobile screen orientation handling."""

import pytest
from unittest.mock import patch

from .utils import (
    mock_device,
    requires_orientation,
    set_orientation,
    wait_for_orientation,
    get_screen_size,
    IPHONE_13,
    PIXEL_6,
    IPAD_PRO,
)


@pytest.fixture
def mock_orientation():
    """Create mock orientation for testing."""
    return 0  # Portrait


@requires_orientation
def test_orientation_change():
    """Test device orientation changes."""
    with mock_device(IPHONE_13):
        # Test portrait to landscape
        set_orientation(90)
        assert wait_for_orientation(90)
        size = get_screen_size()
        assert size[0] > size[1]  # Width > Height in landscape

        # Test landscape to portrait
        set_orientation(0)
        assert wait_for_orientation(0)
        size = get_screen_size()
        assert size[1] > size[0]  # Height > Width in portrait


@requires_orientation
@pytest.mark.parametrize(
    "device_info,orientation,expected_size",
    [
        (IPHONE_13, 0, (390, 844)),
        (IPHONE_13, 90, (844, 390)),
        (PIXEL_6, 0, (412, 915)),
        (PIXEL_6, 90, (915, 412)),
        (IPAD_PRO, 0, (1024, 1366)),
        (IPAD_PRO, 90, (1366, 1024)),
    ],
)
def test_device_specific_orientation(device_info, orientation, expected_size):
    """Test orientation behavior on different devices."""
    with mock_device(device_info):
        set_orientation(orientation)
        assert wait_for_orientation(orientation)
        assert get_screen_size() == expected_size


@requires_orientation
def test_invalid_orientation():
    """Test handling of invalid orientation angles."""
    with mock_device(IPHONE_13):
        with pytest.raises(ValueError):
            set_orientation(45)  # Only 0, 90, 180, 270 are valid


@requires_orientation
def test_orientation_lock():
    """Test orientation lock functionality."""
    with mock_device(IPHONE_13):
        # Mock orientation lock
        with patch(".utils.is_orientation_locked", autospec=True) as mock_lock:
            mock_lock.return_value = True
            with pytest.raises(RuntimeError):
                set_orientation(90)


def test_orientation_not_supported():
    """Test graceful handling when orientation API is not supported."""
    with mock_device({**IPHONE_13, "orientation_api": False}):
        with pytest.raises(pytest.skip.Exception):

            @requires_orientation
            def orientation_test():
                pass

            orientation_test()


@requires_orientation
def test_orientation_event_handling():
    """Test orientation change event handling."""
    with mock_device(IPHONE_13):
        events = []

        def on_orientation_change(angle):
            events.append(angle)

        # Mock event listener
        with patch(
            "src.tests.mobile.utils.add_orientation_listener",
            side_effect=lambda x: on_orientation_change,
        ):
            set_orientation(90)
            set_orientation(180)
            set_orientation(0)

            assert events == [90, 180, 0]


@requires_orientation
def test_orientation_transition_time():
    """Test orientation change transition timing."""
    with mock_device(IPHONE_13):
        set_orientation(90)
        assert wait_for_orientation(90, timeout=0.5)

        set_orientation(0)
        assert wait_for_orientation(0, timeout=0.5)
