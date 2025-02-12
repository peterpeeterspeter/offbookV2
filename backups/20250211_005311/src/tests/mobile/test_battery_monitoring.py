"""Tests for mobile battery monitoring."""

import pytest

from .utils import (
    BatteryInfo,
    mock_battery,
    mock_device,
    requires_battery_api,
    IPHONE_13,
    PIXEL_6,
    get_battery_info,
)


@pytest.fixture
def mock_battery_info() -> BatteryInfo:
    """Create mock battery info for testing."""
    return {
        "charging": True,
        "level": 0.75,
        "chargingTime": 1800,
        "dischargingTime": 0,
    }


@requires_battery_api
def test_battery_info_structure():
    """Test battery info contains all required fields."""
    info = get_battery_info()
    required_fields = {"charging", "level", "chargingTime", "dischargingTime"}

    assert set(info.keys()) == required_fields
    assert isinstance(info["charging"], bool)
    assert isinstance(info["level"], float)
    assert isinstance(info["chargingTime"], int)
    assert isinstance(info["dischargingTime"], int)


@requires_battery_api
def test_battery_level_range():
    """Test battery level stays within valid range."""
    with mock_battery(
        {
            "charging": False,
            "level": 0.5,
            "chargingTime": 0,
            "dischargingTime": 3600,
        }
    ):
        info = get_battery_info()
        assert 0.0 <= info["level"] <= 1.0


@requires_battery_api
@pytest.mark.parametrize("device_info", [IPHONE_13, PIXEL_6])
def test_device_specific_battery(device_info):
    """Test battery monitoring on different devices."""
    with mock_device(device_info):
        with mock_battery(
            {
                "charging": True,
                "level": 0.8,
                "chargingTime": 1200,
                "dischargingTime": 0,
            }
        ):
            info = get_battery_info()
            assert info["charging"] is True
            assert info["level"] == 0.8


@requires_battery_api
def test_charging_state_transition():
    """Test transitions between charging states."""
    states = [
        {
            "charging": True,
            "level": 0.5,
            "chargingTime": 3600,
            "dischargingTime": 0,
        },
        {
            "charging": False,
            "level": 0.5,
            "chargingTime": 0,
            "dischargingTime": 7200,
        },
    ]

    for state in states:
        with mock_battery(state):
            info = get_battery_info()
            assert info["charging"] == state["charging"]
            assert info["chargingTime"] == state["chargingTime"]
            assert info["dischargingTime"] == state["dischargingTime"]


@requires_battery_api
def test_low_battery_threshold():
    """Test low battery detection."""
    with mock_battery(
        {
            "charging": False,
            "level": 0.15,
            "chargingTime": 0,
            "dischargingTime": 1800,
        }
    ):
        info = get_battery_info()
        assert info["level"] <= 0.15
        assert info["dischargingTime"] > 0


@requires_battery_api
def test_full_battery_state():
    """Test full battery state detection."""
    with mock_battery(
        {
            "charging": True,
            "level": 1.0,
            "chargingTime": 0,
            "dischargingTime": 0,
        }
    ):
        info = get_battery_info()
        assert info["level"] == 1.0
        assert info["chargingTime"] == 0


def test_battery_api_not_supported():
    """Test graceful handling when Battery API is not supported."""
    with mock_device({**IPHONE_13, "battery_api": False}):
        with pytest.raises(pytest.skip.Exception):

            @requires_battery_api
            def battery_test():
                pass

            battery_test()


@requires_battery_api
def test_charging_time_accuracy():
    """Test charging time estimates."""
    initial_state = {
        "charging": True,
        "level": 0.5,
        "chargingTime": 3600,
        "dischargingTime": 0,
    }
    with mock_battery(initial_state):
        info = get_battery_info()
        assert info["chargingTime"] > 0
        assert info["dischargingTime"] == 0
