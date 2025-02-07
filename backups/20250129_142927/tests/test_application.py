import pytest
import asyncio
from httpx import AsyncClient
from fastapi import status
from datetime import datetime, timedelta
import logging

from src.main import app, db_config
from src.services.whisper import whisper_service
from src.services.performance_monitor import performance_monitor

# Configure test logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@pytest.fixture
async def async_client():
    """Async client fixture for testing endpoints."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture(autouse=True)
async def setup_and_teardown():
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
async def test_health_check(async_client):
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
async def test_pool_stats(async_client):
    """Test the pool statistics endpoint."""
    response = await async_client.get("/pool-stats")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert "async_pool" in data
    assert "sync_pool" in data
    assert "timestamp" in data
    
    # Verify pool stats structure
    for pool in ["async_pool", "sync_pool"]:
        pool_data = data[pool]
        assert "total_checkouts" in pool_data
        assert "total_checkins" in pool_data
        assert "current_size" in pool_data
        assert "current_overflow" in pool_data
        assert "available_connections" in pool_data
        assert "used_connections" in pool_data

@pytest.mark.asyncio
async def test_database_connection_pool():
    """Test database connection pool behavior."""
    # Test multiple concurrent database operations
    async def db_operation():
        async with db_config.get_async_session() as session:
            # Simulate some database work
            await asyncio.sleep(0.1)
            return True
    
    # Run multiple concurrent operations
    tasks = [db_operation() for _ in range(5)]
    results = await asyncio.gather(*tasks)
    
    # Verify all operations completed successfully
    assert all(results)
    
    # Check pool stats
    stats = db_config.get_pool_stats(is_async=True)
    assert stats["total_checkouts"] >= 5
    assert stats["total_checkins"] >= 5
    assert stats["current_size"] <= db_config.pool_settings["pool_size"]

@pytest.mark.asyncio
async def test_connection_timeout_handling():
    """Test connection timeout handling."""
    # Temporarily reduce pool timeout for testing
    original_timeout = db_config.pool_settings["pool_timeout"]
    db_config.pool_settings["pool_timeout"] = 1
    
    try:
        async def slow_operation():
            async with db_config.get_async_session() as session:
                await asyncio.sleep(2)  # Operation longer than timeout
                return True
        
        # This should raise a timeout error
        with pytest.raises(Exception):
            await slow_operation()
    
    finally:
        # Restore original timeout
        db_config.pool_settings["pool_timeout"] = original_timeout

@pytest.mark.asyncio
async def test_connection_cleanup():
    """Test proper connection cleanup."""
    initial_stats = db_config.get_pool_stats(is_async=True)
    
    async with db_config.get_async_session() as session:
        pass  # Session should be automatically cleaned up
    
    final_stats = db_config.get_pool_stats(is_async=True)
    assert final_stats["checkins"] == initial_stats["checkins"] + 1
    assert final_stats["used_connections"] == initial_stats["used_connections"]

@pytest.mark.asyncio
async def test_pool_overflow():
    """Test pool overflow behavior."""
    pool_size = db_config.pool_settings["pool_size"]
    max_overflow = db_config.pool_settings["max_overflow"]
    total_allowed = pool_size + max_overflow
    
    async def hold_connection():
        async with db_config.get_async_session() as session:
            await asyncio.sleep(0.5)
    
    # Try to exceed pool size but stay within overflow
    tasks = [hold_connection() for _ in range(total_allowed - 1)]
    await asyncio.gather(*tasks)
    
    # Verify we haven't exceeded limits
    stats = db_config.get_pool_stats(is_async=True)
    assert stats["current_size"] <= total_allowed

@pytest.mark.asyncio
async def test_static_files(async_client):
    """Test static files serving."""
    response = await async_client.get("/static/test.txt")
    assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_200_OK]

@pytest.mark.asyncio
async def test_cors_configuration(async_client):
    """Test CORS configuration."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = await async_client.options("/health", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert "access-control-allow-origin" in response.headers

@pytest.mark.asyncio
async def test_service_initialization():
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