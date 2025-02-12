"""Mobile test utilities for OFFbook v2."""

from typing import TypedDict, Callable, Any
from dataclasses import dataclass
from contextlib import contextmanager
import pytest
from unittest.mock import patch

from . import DeviceInfo, get_device_info


# Device configurations for testing
IPHONE_13 = {
    "type": "mobile",
    "os": "ios",
    "browser": "safari",
    "screen_size": (390, 844),
    "touch_enabled": True,
    "battery_api": True,
    "orientation_api": True,
    "audio_worklet": True,
}

PIXEL_6 = {
    "type": "mobile",
    "os": "android",
    "browser": "chrome",
    "screen_size": (412, 915),
    "touch_enabled": True,
    "battery_api": True,
    "orientation_api": True,
    "audio_worklet": True,
}

IPAD_PRO = {
    "type": "tablet",
    "os": "ios",
    "browser": "safari",
    "screen_size": (1024, 1366),
    "touch_enabled": True,
    "battery_api": True,
    "orientation_api": True,
    "audio_worklet": True,
}


@dataclass
class TouchEvent:
    """Mock touch event data."""

    type: str  # 'start' | 'move' | 'end'
    x: int
    y: int
    identifier: int = 0
    force: float = 1.0
    radius_x: float = 1.0
    radius_y: float = 1.0


class BatteryInfo(TypedDict):
    """Battery status information."""

    charging: bool
    level: float  # 0.0 to 1.0
    chargingTime: int  # seconds until full, or 0 if not charging
    dischargingTime: int  # seconds until empty, or 0 if charging


@contextmanager
def mock_device(device_info: DeviceInfo):
    """Context manager to mock a specific device environment."""
    with patch("src.tests.mobile.get_device_info") as mock_info:
        mock_info.return_value = device_info
        yield mock_info


@contextmanager
def mock_battery(battery_info: BatteryInfo):
    """Context manager to mock battery status."""
    with patch("src.tests.mobile.utils.get_battery_info") as mock_battery:
        mock_battery.return_value = battery_info
        yield mock_battery


def simulate_touch(element: Any, events: list[TouchEvent], delay: float = 0.0) -> None:
    """Simulate a series of touch events on an element."""
    for event in events:
        # This will be implemented with proper touch event simulation
        pass


def requires_touch(func: Callable) -> Callable:
    """Decorator to skip tests if touch is not supported."""
    return pytest.mark.skipif(not supports_touch(), reason="Touch support required")(
        func
    )


def requires_battery_api(func: Callable) -> Callable:
    """Decorator to skip tests if Battery API is not supported."""
    return pytest.mark.skipif(
        not supports_battery_api(), reason="Battery API required"
    )(func)


def requires_orientation(func: Callable) -> Callable:
    """Decorator to skip tests if Orientation API is not supported."""
    return pytest.mark.skipif(
        not supports_orientation(), reason="Orientation API required"
    )(func)


def supports_touch() -> bool:
    """Check if touch events are supported."""
    device = get_device_info()
    return device["touch_enabled"]


def supports_battery_api() -> bool:
    """Check if Battery API is supported."""
    device = get_device_info()
    return device["battery_api"]


def supports_orientation() -> bool:
    """Check if Orientation API is supported."""
    device = get_device_info()
    return device["orientation_api"]


def get_battery_info() -> BatteryInfo:
    """Get current battery status."""
    # This will be implemented with actual Battery API
    return {"charging": True, "level": 0.8, "chargingTime": 1200, "dischargingTime": 0}


def set_orientation(angle: int) -> None:
    """Set the device orientation angle."""
    # This will be implemented with proper orientation simulation
    pass


def wait_for_orientation(angle: int, timeout: float = 1.0) -> bool:
    """Wait for device to reach specified orientation."""
    # This will be implemented with proper orientation detection
    return True


def get_screen_size() -> tuple[int, int]:
    """Get current screen dimensions."""
    device = get_device_info()
    return device["screen_size"]
