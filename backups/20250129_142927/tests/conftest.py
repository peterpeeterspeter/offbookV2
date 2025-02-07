import os
import shutil
import pytest
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from typing import AsyncGenerator

from src.database.models import Base  # Import the Base class from your models
from src.database.config import get_async_session

# Load environment variables
load_dotenv()

# Load test environment variables
test_env_path = Path(__file__).parent / "test.env"
if test_env_path.exists():
    load_dotenv(test_env_path)
else:
    # Create test environment file with test settings
    with open(test_env_path, "w") as f:
        f.write("""
# Test Database Settings
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/offbook_test
ASYNC_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/offbook_test

# Test Pool Settings
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=2
DB_POOL_TIMEOUT=10
DB_POOL_RECYCLE=1800

# Test Application Settings
DEBUG=true
LOG_LEVEL=DEBUG
TESTING=true

# Test Server Settings
HOST=127.0.0.1
PORT=8001

# Test CORS Settings
ALLOWED_ORIGINS=http://localhost:8001,http://127.0.0.1:8001

# Test Service Settings
ENABLE_PERFORMANCE_MONITORING=false
WHISPER_MODEL=tiny
""")
    load_dotenv(test_env_path)

# Test database URL
TEST_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/offbook_test")

# Create test engine
engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=True
)

# Create test session factory
TestingSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def setup_database():
    """Set up the test database."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session(setup_database) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for a test."""
    async with TestingSessionLocal() as session:
        yield session
        # Roll back any changes made in the test
        await session.rollback()

@pytest.fixture
async def client(db_session):
    """Create a test client with the test database session."""
    from fastapi.testclient import TestClient
    from src.main import app
    
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.fixture(scope="session")
def test_env():
    """Setup test environment with temporary directories."""
    # Create temporary directories
    temp_dir = Path("./test_data")
    cache_dir = temp_dir / "cache"
    models_dir = temp_dir / "models"
    
    # Ensure directories exist
    cache_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)
    
    # Set environment variables for testing
    os.environ["CACHE_DIR"] = str(cache_dir)
    os.environ["MODELS_DIR"] = str(models_dir)
    
    yield {
        "temp_dir": temp_dir,
        "cache_dir": cache_dir,
        "models_dir": models_dir
    }
    
    # Cleanup after tests
    shutil.rmtree(temp_dir)

@pytest.fixture(scope="session")
def api_keys():
    """Verify and provide API keys for services."""
    keys = {
        "elevenlabs": os.getenv("ELEVENLABS_API_KEY"),
        "deepseek": os.getenv("DEEPSEEK_API_KEY")
    }
    
    # Skip API tests if keys aren't available
    if not all(keys.values()):
        pytest.skip("API keys not available")
        
    return keys

@pytest.fixture(scope="session")
def service_config():
    """Provide service configuration for tests."""
    return {
        "vad": {
            "threshold": float(os.getenv("VAD_THRESHOLD", "0.5")),
            "sampling_rate": int(os.getenv("VAD_SAMPLING_RATE", "16000")),
            "window_size": int(os.getenv("VAD_WINDOW_SIZE", "512"))
        },
        "whisper": {
            "model": os.getenv("WHISPER_MODEL", "base"),
            "language": os.getenv("WHISPER_LANGUAGE", "en")
        }
    }

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Setup test environment variables."""
    os.environ["TESTING"] = "true"
    os.environ["DEBUG"] = "true"
    
    # Use a separate test database
    if "DATABASE_URL" not in os.environ:
        os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/offbook_test"
    if "ASYNC_DATABASE_URL" not in os.environ:
        os.environ["ASYNC_DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/offbook_test"
    
    return os.environ.copy() 