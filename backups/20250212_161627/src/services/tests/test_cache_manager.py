import pytest
import json
from pathlib import Path
from datetime import datetime, timedelta, UTC
from ..cache_manager import CacheManager


@pytest.fixture
def cache_manager():
    """Create a CacheManager instance with test configuration."""
    test_cache_dir = Path("test_cache")
    manager = CacheManager(
        cache_dir=test_cache_dir, max_cache_size_mb=10, cache_ttl_hours=24
    )
    yield manager
    # Cleanup
    if test_cache_dir.exists():
        for file in test_cache_dir.glob("**/*"):
            if file.is_file():
                file.unlink()
        test_cache_dir.rmdir()


def test_save_and_load_cache(cache_manager):
    """Test basic cache save and load operations."""
    test_data = {"key": "value", "timestamp": datetime.now(UTC).isoformat()}
    cache_key = "test_key"

    # Save to cache
    success = cache_manager.save_to_cache(cache_key, test_data)
    assert success

    # Load from cache
    loaded_data = cache_manager.load_from_cache(cache_key)
    assert loaded_data is not None
    assert loaded_data["key"] == "value"


def test_cache_expiration(cache_manager):
    """Test cache entry expiration."""
    old_timestamp = datetime.now(UTC) - timedelta(hours=25)
    test_data = {"key": "value", "timestamp": old_timestamp.isoformat()}
    cache_key = "expired_key"

    cache_manager.save_to_cache(cache_key, test_data)
    loaded_data = cache_manager.load_from_cache(cache_key)

    assert loaded_data is None  # Should be None as entry is expired


def test_cache_size_limit(cache_manager):
    """Test cache size limit enforcement."""
    # Create large data that exceeds cache size
    large_data = {"data": "x" * (11 * 1024 * 1024)}  # 11MB
    cache_key = "large_key"

    success = cache_manager.save_to_cache(cache_key, large_data)
    assert not success  # Should fail as it exceeds max cache size


def test_cache_cleanup(cache_manager):
    """Test automatic cache cleanup of expired entries."""
    # Create mix of expired and valid entries
    now = datetime.now(UTC)
    valid_data = {"key": "valid", "timestamp": now.isoformat()}
    expired_data = {
        "key": "expired",
        "timestamp": (now - timedelta(hours=25)).isoformat(),
    }

    cache_manager.save_to_cache("valid_key", valid_data)
    cache_manager.save_to_cache("expired_key", expired_data)

    cache_manager.cleanup_expired()

    assert cache_manager.load_from_cache("valid_key") is not None
    assert cache_manager.load_from_cache("expired_key") is None


def test_cache_metrics(cache_manager):
    """Test cache metrics collection."""
    test_data = {"key": "value", "timestamp": datetime.now(UTC).isoformat()}

    # Generate some cache activity
    cache_manager.save_to_cache("key1", test_data)
    cache_manager.load_from_cache("key1")
    cache_manager.load_from_cache("nonexistent")

    metrics = cache_manager.get_metrics()

    assert metrics["hits"] == 1
    assert metrics["misses"] == 1
    assert metrics["total_entries"] == 1
    assert "cache_size_mb" in metrics
    assert "hit_rate" in metrics


def test_concurrent_access(cache_manager):
    """Test cache behavior with concurrent access patterns."""
    import threading

    def worker(key, data):
        cache_manager.save_to_cache(key, data)
        loaded = cache_manager.load_from_cache(key)
        assert loaded is not None
        assert loaded["value"] == data["value"]

    threads = []
    for i in range(5):
        data = {"value": f"test{i}", "timestamp": datetime.now(UTC).isoformat()}
        t = threading.Thread(target=worker, args=(f"key{i}", data))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    metrics = cache_manager.get_metrics()
    assert metrics["total_entries"] == 5


def test_invalid_cache_data(cache_manager):
    """Test handling of invalid cache data."""
    # Create invalid JSON file
    cache_key = "invalid_key"
    cache_file = cache_manager.cache_dir / f"{cache_key}.json"
    cache_manager.cache_dir.mkdir(exist_ok=True)
    cache_file.write_text("invalid json")

    loaded_data = cache_manager.load_from_cache(cache_key)
    assert loaded_data is None  # Should handle invalid data gracefully


def test_cache_persistence(cache_manager):
    """Test cache persistence across manager instances."""
    test_data = {"key": "value", "timestamp": datetime.now(UTC).isoformat()}
    cache_key = "persistent_key"

    # Save with first instance
    cache_manager.save_to_cache(cache_key, test_data)

    # Create new instance with same cache dir
    new_manager = CacheManager(
        cache_dir=cache_manager.cache_dir, max_cache_size_mb=10, cache_ttl_hours=24
    )

    # Load with new instance
    loaded_data = new_manager.load_from_cache(cache_key)
    assert loaded_data is not None
    assert loaded_data["key"] == "value"
