import sys
import pytest
import asyncio
import os
from pathlib import Path
from typing import (
    AsyncGenerator,
    Generator,
    TypeVar,
    AsyncContextManager,
    Callable,
    Dict,
    Any
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
    AsyncEngine
)
from sqlalchemy.pool import NullPool
from fastapi import FastAPI
from httpx import AsyncClient
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from src.database.models import Base
from src.main import get_db, app
from src.database.config import DatabaseConfig
from src.services.auth import AuthService
from src.main import create_app


# Test Environment Setup

def load_test_env() -> Dict[str, Any]:
    """Load test environment configuration."""
    # Load base environment variables
    load_dotenv()

    # Load test-specific environment if it exists
    test_env_path = Path(__file__).parent / "test.env"
    if test_env_path.exists():
        load_dotenv(test_env_path)

    # Set test-specific environment variables
    test_env = {
        "TESTING": "true",
        "DEBUG": "true",
        "DB_POOL_SIZE": "5",
        "DB_MAX_OVERFLOW": "2",
        "DB_POOL_TIMEOUT": "10",
        "DB_POOL_RECYCLE": "1800",
        "DB_ECHO": "false",
        "DB_ECHO_POOL": "false",
        "CACHE_DIR": str(Path("./test_data/cache").absolute()),
        "MODELS_DIR": str(Path("./test_data/models").absolute()),
        "WHISPER_MODEL": "tiny",
        "ENABLE_PERFORMANCE_MONITORING": "false",
    }

    # Update environment with test settings
    os.environ.update(test_env)

    return test_env


@pytest.fixture(scope="session", autouse=True)
def test_environment():
    """Setup and cleanup test environment."""
    # Load test environment
    env = load_test_env()

    # Create test directories
    cache_dir = Path(env["CACHE_DIR"])
    models_dir = Path(env["MODELS_DIR"])

    cache_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)

    yield env

    # Cleanup test directories
    import shutil
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
    if models_dir.exists():
        shutil.rmtree(models_dir)


@pytest.fixture(scope="session")
def test_db_url() -> str:
    """Get test database URL."""
    return os.getenv(
        "ASYNC_TEST_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"
    )


# Initialize database config with test settings
db_config = DatabaseConfig()
db_config.ASYNC_DATABASE_URL = os.getenv(
    "ASYNC_TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"
)


def pytest_configure(config):
    """Configure pytest for async testing."""
    config.addinivalue_line(
        "markers",
        "asyncio: mark test as async"
    )
    sys._called_from_test = True


def pytest_unconfigure(config):
    """Cleanup after testing."""
    if hasattr(sys, '_called_from_test'):
        del sys._called_from_test


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        os.getenv(
            "ASYNC_TEST_DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"
        ),
        poolclass=NullPool,
        echo=True
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    await db_config.initialize_async(is_test=True)
    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    Session = async_sessionmaker(
        bind=db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )

    async with Session() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


@pytest.fixture(scope="session")
def app_instance() -> FastAPI:
    """Create the FastAPI application instance."""
    return app


@pytest.fixture(scope="function")
async def auth_service(db_session: AsyncSession) -> AuthService:
    """Create a test auth service."""
    return AuthService(
        session=db_session,
        secret_key="test_secret_key",
        algorithm="HS256",
        access_token_expire_minutes=30
    )


@pytest.fixture(scope="function")
async def app(db_session: AsyncSession) -> FastAPI:
    """Create a test FastAPI application."""
    app = create_app()

    # Override the database dependency
    async def get_test_db():
        try:
            yield db_session
        finally:
            await db_session.close()

    app.dependency_overrides[get_db] = get_test_db

    return app


@pytest.fixture(scope="function")
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client."""
    async with AsyncClient(
        app=app,
        base_url="http://test"
    ) as client:
        yield client


@pytest.fixture
def test_user() -> dict:
    """Create a test user for authentication."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    }


@pytest.fixture(scope="session")
def api_keys() -> dict:
    """Provide API keys for testing."""
    return {
        "deepseek": "test-key",
        "elevenlabs": "test-key",
        "openai": "test-key"
    }


@pytest.fixture(scope="session")
def service_config() -> dict:
    """Provide service configuration for tests."""
    return {
        "test_mode": True,
        "cache_enabled": True,
        "performance_monitoring": True
    }


# Test Data Factory Fixtures

@pytest.fixture
def create_test_user(db_session: AsyncSession):
    """Factory fixture to create test users.

    Usage:
        async def test_something(create_test_user):
            user = await create_test_user(username="test1", email="test1@example.com")
    """
    from src.auth.models import User
    from src.auth.security import get_password_hash

    async def _create_user(
        username: str = "testuser",
        email: str = "test@example.com",
        password: str = "testpass123",
        is_active: bool = True,
        is_superuser: bool = False
    ) -> User:
        user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            is_active=is_active,
            is_superuser=is_superuser
        )
        db_session.add(user)
        await db_session.flush()
        await db_session.refresh(user)
        return user

    return _create_user


@pytest.fixture
def create_test_script(db_session: AsyncSession):
    """Factory fixture to create test scripts.

    Usage:
        async def test_something(create_test_script):
            script = await create_test_script(title="Test Script")
    """
    from src.scripts.models import Script

    async def _create_script(
        title: str = "Test Script",
        content: str = "Test content",
        author_id: int = None,
        is_public: bool = True
    ) -> Script:
        script = Script(
            title=title,
            content=content,
            author_id=author_id,
            is_public=is_public
        )
        db_session.add(script)
        await db_session.flush()
        await db_session.refresh(script)
        return script

    return _create_script


@pytest.fixture
def create_test_character(db_session: AsyncSession):
    """Factory fixture to create test characters.

    Usage:
        async def test_something(create_test_character):
            character = await create_test_character(name="Test Character")
    """
    from src.characters.models import Character

    async def _create_character(
        name: str = "Test Character",
        description: str = "Test description",
        creator_id: int = None,
        voice_id: str = None,
        is_public: bool = True
    ) -> Character:
        character = Character(
            name=name,
            description=description,
            creator_id=creator_id,
            voice_id=voice_id,
            is_public=is_public
        )
        db_session.add(character)
        await db_session.flush()
        await db_session.refresh(character)
        return character

    return _create_character


@pytest.fixture
def create_test_scene(db_session: AsyncSession):
    """Factory fixture to create test scenes.

    Usage:
        async def test_something(create_test_scene):
            scene = await create_test_scene(title="Test Scene")
    """
    from src.scenes.models import Scene

    async def _create_scene(
        title: str = "Test Scene",
        script_id: int = None,
        order: int = 1,
        content: str = "Test content"
    ) -> Scene:
        scene = Scene(
            title=title,
            script_id=script_id,
            order=order,
            content=content
        )
        db_session.add(scene)
        await db_session.flush()
        await db_session.refresh(scene)
        return scene

    return _create_scene
