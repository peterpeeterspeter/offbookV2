"""Mobile testing package for OFFbook v2.

This package contains test utilities and test cases specifically for
mobile device testing, including:
- Device detection and capability checking
- Mobile-specific test configurations
- Touch event simulation
- Mobile audio pipeline testing
- Battery and performance monitoring
"""

from typing import TypedDict


class DeviceInfo(TypedDict):
    """Type definition for device information."""

    type: str  # 'mobile' | 'tablet' | 'desktop'
    os: str  # 'ios' | 'android' | 'other'
    browser: str  # 'safari' | 'chrome' | 'firefox' | 'other'
    screen_size: tuple[int, int]
    touch_enabled: bool
    battery_api: bool
    orientation_api: bool
    audio_worklet: bool


def get_device_info() -> DeviceInfo:
    """Get information about the current device."""
    # This will be implemented with actual device detection
    return {
        "type": "desktop",
        "os": "other",
        "browser": "other",
        "screen_size": (1920, 1080),
        "touch_enabled": False,
        "battery_api": False,
        "orientation_api": False,
        "audio_worklet": True,
    }


def is_mobile_device() -> bool:
    """Check if current device is mobile."""
    device = get_device_info()
    return device["type"] in ("mobile", "tablet")


def supports_feature(feature: str) -> bool:
    """Check if device supports a specific feature."""
    device = get_device_info()
    return bool(device.get(feature, False))
