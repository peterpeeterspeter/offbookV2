import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from fastapi import status
import logging

from src.main import db_config
from src.services.whisper import whisper_service
from src.services.performance_monitor import performance_monitor

# Configure test logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@pytest.fixture
async def async_client(app_with_db) -> AsyncGenerator[AsyncClient, None]:
    """Async client fixture for testing endpoints."""
    async with AsyncClient(
        app=app_with_db,
        base_url="http://test"
    ) as client:
        yield client

@pytest.fixture(autouse=True)
async def setup_and_teardown() -> AsyncGenerator[None, None]:
    """Setup and teardown for each test."""
    # Setup
    await db_config.initialize_async()
    await whisper_service.initialize()
    await performance_monitor.initialize()

    yield

    # Teardown
    await performance_monitor.cleanup()
    await whisper_service.cleanup()
    await db_config.cleanup_async()

@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient) -> None:
    """Test the health check endpoint."""
    response = await async_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "status" in data
    assert "database" in data
    assert "whisper" in data
    assert "performance_monitor" in data
    assert "timestamp" in data

    assert data["database"] is True
    assert data["whisper"] is True
    assert data["performance_monitor"] is True

@pytest.mark.asyncio
async def test_pool_stats(async_client: AsyncClient) -> None:
    """Test the pool statistics endpoint."""
    response = await async_client.get("/pool-stats")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "pool_stats" in data
    pool_stats = data["pool_stats"]
    assert "async_pool" in pool_stats
    assert "sync_pool" in pool_stats

    # Verify pool stats structure
    for pool in ["async_pool", "sync_pool"]:
        pool_data = pool_stats[pool]
        assert "checkedin" in pool_data
        assert "checkedout" in pool_data
        assert "total_checkouts" in pool_data
        assert "total_checkins" in pool_data
        assert "current_size" in pool_data
        assert "overflow" in pool_data
        assert "checkedin_overflow" in pool_data
        assert "detached" in pool_data

@pytest.mark.asyncio
async def test_database_connection_pool() -> None:
    """Test database connection pool behavior."""
    # Test multiple concurrent database operations
    async def db_operation() -> bool:
        async with db_config.get_async_session() as _:
            # Simulate some database work
            await asyncio.sleep(0.1)
            return True

    # Run multiple concurrent operations
    tasks = [db_operation() for _ in range(5)]
    results = await asyncio.gather(*tasks)

    # Verify all operations completed successfully
    assert all(results)

    # Check pool stats
    stats = db_config.get_pool_stats(is_async=True)["async_pool"]
    assert stats["total_checkouts"] >= 5
    assert stats["total_checkins"] >= 5
    assert stats["current_size"] <= db_config.pool_settings["pool_size"]

@pytest.mark.asyncio
async def test_connection_timeout_handling() -> None:
    """Test connection timeout handling."""
    # Temporarily reduce pool timeout for testing
    original_timeout = db_config.pool_settings["pool_timeout"]
    db_config.pool_settings["pool_timeout"] = 1

    try:
        async def slow_operation():
            async with db_config.get_async_session() as session:
                await asyncio.sleep(2)  # Operation longer than timeout

        # This should raise a timeout error
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(slow_operation(), timeout=1)
    finally:
        # Restore original timeout
        db_config.pool_settings["pool_timeout"] = original_timeout

@pytest.mark.asyncio
async def test_connection_cleanup() -> None:
    """Test proper connection cleanup."""
    initial_stats = db_config.get_pool_stats(is_async=True)["async_pool"]

    async with db_config.get_async_session() as _:
        pass  # Session should be automatically cleaned up

    final_stats = db_config.get_pool_stats(is_async=True)["async_pool"]
    assert final_stats["total_checkins"] == initial_stats["total_checkins"] + 1
    assert final_stats["checkedout"] == initial_stats["checkedout"]

@pytest.mark.asyncio
async def test_pool_overflow() -> None:
    """Test pool overflow behavior."""
    pool_size = db_config.pool_settings["pool_size"]
    max_overflow = db_config.pool_settings["max_overflow"]
    total_allowed = pool_size + max_overflow

    async def hold_connection() -> None:
        async with db_config.get_async_session() as _:
            await asyncio.sleep(0.5)

    # Try to exceed pool size but stay within overflow
    tasks = [hold_connection() for _ in range(total_allowed - 1)]
    await asyncio.gather(*tasks)

    # Verify we haven't exceeded limits
    stats = db_config.get_pool_stats(is_async=True)["async_pool"]
    assert stats["current_size"] <= total_allowed

@pytest.mark.asyncio
async def test_static_files(async_client: AsyncClient) -> None:
    """Test static files serving."""
    response = await async_client.get("/static/test.txt")
    status_codes = [
        status.HTTP_404_NOT_FOUND,
        status.HTTP_200_OK
    ]
    assert response.status_code in status_codes

@pytest.mark.asyncio
async def test_cors_configuration(async_client: AsyncClient) -> None:
    """Test CORS configuration."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = await async_client.options("/health", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert "access-control-allow-origin" in response.headers

@pytest.mark.asyncio
async def test_service_initialization() -> None:
    """Test service initialization sequence."""
    # Reset services
    await db_config.cleanup_async()
    await whisper_service.cleanup()
    await performance_monitor.cleanup()

    # Reinitialize
    await db_config.initialize_async()
    await whisper_service.initialize()
    await performance_monitor.initialize()

    # Verify all services are running
    assert await db_config.verify_async_connection()
    assert whisper_service.is_ready()
    assert performance_monitor.is_ready()

if __name__ == "__main__":
    pytest.main(["-v", "test_application.py"])
