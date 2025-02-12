"""Tests for mobile device detection and capabilities."""

import pytest

from . import get_device_info, is_mobile_device, supports_feature
from .utils import (
    IPHONE_13,
    PIXEL_6,
    IPAD_PRO,
    mock_device,
)


def test_device_info_structure():
    """Test that device info contains all required fields."""
    info = get_device_info()

    required_fields = {
        "type",
        "os",
        "browser",
        "screen_size",
        "touch_enabled",
        "battery_api",
        "orientation_api",
        "audio_worklet",
    }

    assert set(info.keys()) == required_fields
    assert isinstance(info["screen_size"], tuple)
    assert len(info["screen_size"]) == 2
    assert all(isinstance(x, int) for x in info["screen_size"])


@pytest.mark.parametrize(
    "device_info,expected",
    [
        (IPHONE_13, True),
        (PIXEL_6, True),
        (IPAD_PRO, True),
        ({**IPHONE_13, "type": "desktop"}, False),
    ],
)
def test_is_mobile_device(device_info, expected):
    """Test mobile device detection for different devices."""
    with mock_device(device_info):
        assert is_mobile_device() == expected


@pytest.mark.parametrize(
    "feature,device_info,expected",
    [
        ("touch_enabled", IPHONE_13, True),
        ("battery_api", IPHONE_13, True),
        ("orientation_api", IPHONE_13, True),
        ("audio_worklet", IPHONE_13, True),
        ("unknown_feature", IPHONE_13, False),
        ("touch_enabled", {**IPHONE_13, "touch_enabled": False}, False),
    ],
)
def test_feature_detection(feature, device_info, expected):
    """Test feature detection for different device capabilities."""
    with mock_device(device_info):
        assert supports_feature(feature) == expected


def test_screen_size_detection():
    """Test screen size detection for different devices."""
    test_cases = [IPHONE_13, PIXEL_6, IPAD_PRO]

    for device in test_cases:
        with mock_device(device):
            info = get_device_info()
            assert info["screen_size"] == device["screen_size"]


def test_invalid_device_info():
    """Test handling of invalid device information."""
    invalid_info = {
        "type": "invalid",
        "os": "unknown",
        "browser": "test",
        "screen_size": "invalid",  # Should be tuple
        "touch_enabled": "yes",  # Should be bool
        "battery_api": 1,  # Should be bool
        "orientation_api": None,  # Should be bool
        "audio_worklet": "true",  # Should be bool
    }

    with pytest.raises(TypeError):
        with mock_device(invalid_info):
            get_device_info()
