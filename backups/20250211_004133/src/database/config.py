from datetime import datetime, UTC
import logging
import os
from typing import Dict, Any, Optional, AsyncGenerator
from contextlib import asynccontextmanager
import asyncio

from alembic.config import Config
from alembic import command
from dotenv import load_dotenv
from sqlalchemy import text, event
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine
)
from sqlalchemy.pool import AsyncAdaptedQueuePool
from sqlalchemy.orm import sessionmaker

from .models import Base
from .pool_stats import PoolStats

# Load environment variables
load_dotenv()

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format=(
        '%(asctime)s - %(name)s - [%(levelname)s] - '
        '%(message)s - {%(filename)s:%(lineno)d}'
    )
)
logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Singleton database configuration class with robust connection handling."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseConfig, cls).__new__(cls)
            cls._instance._initialize_attributes()
        return cls._instance

    def _initialize_attributes(self):
        """Initialize instance attributes."""
        # Reset pool stats
        self.sync_pool_stats = PoolStats()
        self.async_pool_stats = PoolStats()

        # Database URLs
        db_host = "postgresql://postgres:postgres@localhost:5432"
        self.DATABASE_URL = os.getenv(
            "DATABASE_URL",
            f"{db_host}/offbook"
        )
        self.TEST_DATABASE_URL = os.getenv(
            "TEST_DATABASE_URL",
            f"{db_host}/test_db"
        )
        async_db_host = (
            "postgresql+asyncpg://postgres:postgres@localhost:5432"
        )
        self.ASYNC_DATABASE_URL = os.getenv(
            "ASYNC_DATABASE_URL",
            f"{async_db_host}/offbook"
        )
        self.ASYNC_TEST_DATABASE_URL = os.getenv(
            "ASYNC_TEST_DATABASE_URL",
            f"{async_db_host}/test_db"
        )

        # Engine configurations
        self.sync_engine: Optional[AsyncAdaptedQueuePool] = None
        self.async_engine: Optional[AsyncEngine] = None

        # Session factories
        self.sync_session_factory = None
        self.async_session_factory = None

        # Connection state
        self._is_initialized = False
        self._health_check_interval = int(os.getenv("DB_HEALTH_CHECK_INTERVAL", "30"))

        # Base pool settings
        self._pool_settings = {
            "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
            "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "1800")),
            "pool_pre_ping": True,
            "pool_timeout": float(os.getenv("DB_POOL_TIMEOUT", "30")),
            "pool_use_lifo": True,  # Use LIFO to improve connection reuse
            "echo": bool(os.getenv("DB_ECHO", "False")),
            "echo_pool": bool(os.getenv("DB_ECHO_POOL", "False")),
        }

        # Health check task
        self._health_check_task = None

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session using async context manager.

        Usage:
            async with db_config.get_session() as session:
                result = await session.execute(query)
        """
        if not self._is_initialized:
            await self.initialize_async()

        async with self.async_session_factory() as session:
            try:
                yield session
            except Exception as e:
                logger.error(f"Session error: {e}")
                await session.rollback()
                raise
            finally:
                await session.close()

    @asynccontextmanager
    async def get_transaction(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session with automatic transaction management.

        Usage:
            async with db_config.get_transaction() as session:
                result = await session.execute(query)
                # Auto-commits if no exception, auto-rollback if exception
        """
        async with self.get_session() as session:
            async with session.begin():
                try:
                    yield session
                except Exception as e:
                    logger.error(f"Transaction error: {e}")
                    raise

    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[AsyncEngine, None]:
        """Get a direct database connection using async context manager.

        Usage:
            async with db_config.get_connection() as conn:
                result = await conn.execute(text("SELECT 1"))
        """
        if not self._is_initialized:
            await self.initialize_async()

        async with self.async_engine.connect() as connection:
            try:
                yield connection
            except Exception as e:
                logger.error(f"Connection error: {e}")
                raise
            finally:
                await connection.close()

    async def execute_in_transaction(self, operation):
        """Execute an operation within a transaction.

        Args:
            operation: Async callable that takes a session parameter

        Usage:
            result = await db_config.execute_in_transaction(
                lambda session: session.execute(query)
            )
        """
        async with self.get_transaction() as session:
            return await operation(session)

    async def initialize_async(self, is_test: bool = False) -> None:
        """Initialize async database connection."""
        if self._is_initialized:
            return

        # Select appropriate database URL
        db_url = self.ASYNC_TEST_DATABASE_URL if is_test else self.ASYNC_DATABASE_URL

        # Create async engine with connection pooling
        self.async_engine = create_async_engine(
            db_url,
            **self._pool_settings
        )

        # Set up connection event listeners
        event.listen(
            self.async_engine.sync_engine,
            'connect',
            self._on_connect
        )
        event.listen(
            self.async_engine.sync_engine,
            'first_connect',
            self._on_first_connect
        )
        event.listen(
            self.async_engine.sync_engine,
            'checkout',
            self._on_checkout
        )
        event.listen(
            self.async_engine.sync_engine,
            'checkin',
            self._on_checkin
        )
        event.listen(
            self.async_engine.sync_engine,
            'close',
            self._on_close
        )
        event.listen(
            self.async_engine.sync_engine,
            'detach',
            self._on_detach
        )

        # Create async session factory
        self.async_session_factory = async_sessionmaker(
            bind=self.async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False
        )

        # Create tables if they don't exist
        async with self.async_engine.begin() as conn:
            await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn))

        self._is_initialized = True
        logger.info(f"Initialized async database connection to {db_url}")

        # Start health check task if not already running
        if not self._health_check_task:
            self._health_check_task = asyncio.create_task(self._health_check())

    def _on_connect(self, dbapi_connection, connection_record):
        """Handle connection creation event."""
        logger.debug("New database connection created")

    def _on_first_connect(self, dbapi_connection, connection_record):
        """Handle first connection event."""
        logger.info("First database connection established")

    def _on_checkout(self, dbapi_connection, connection_record, connection_proxy):
        """Handle connection checkout event."""
        self.async_pool_stats.checkedout += 1
        self.async_pool_stats.total_checkouts += 1
        logger.debug("Database connection checked out")

    def _on_checkin(self, dbapi_connection, connection_record):
        """Handle connection checkin event."""
        self.async_pool_stats.checkedin += 1
        self.async_pool_stats.total_checkins += 1
        logger.debug("Database connection checked in")

    def _on_close(self, dbapi_connection, connection_record):
        """Handle connection close event."""
        logger.debug("Database connection closed")

    def _on_detach(self, dbapi_connection, connection_record):
        """Handle connection detach event."""
        self.async_pool_stats.detached += 1
        logger.debug("Database connection detached")

    async def _health_check(self):
        """Periodic health check of database connections."""
        while True:
            try:
                async with self.get_connection() as conn:
                    await conn.execute(text("SELECT 1"))
                logger.debug("Database health check passed")
            except Exception as e:
                logger.error(f"Database health check failed: {e}")
            finally:
                await asyncio.sleep(self._health_check_interval)

    @property
    def pool_settings(self) -> Dict[str, Any]:
        """Get pool settings."""
        return self._pool_settings.copy()

    @pool_settings.setter
    def pool_settings(self, settings: Dict[str, Any]) -> None:
        """Update pool settings."""
        self._pool_settings.update(settings)
        if self._is_initialized:
            logger.warning("Pool settings updated but require restart to take effect")

    def get_pool_stats(self) -> Dict[str, Any]:
        """Get current pool statistics."""
        if not self.async_engine:
            return {}

        pool = self.async_engine.sync_engine.pool
        return {
            "size": pool.size(),
            "checkedin": self.async_pool_stats.checkedin,
            "checkedout": self.async_pool_stats.checkedout,
            "overflow": pool.overflow(),
            "detached": self.async_pool_stats.detached,
            "total_checkouts": self.async_pool_stats.total_checkouts,
            "total_checkins": self.async_pool_stats.total_checkins,
            "timestamp": datetime.now(UTC).isoformat()
        }

    async def cleanup(self) -> None:
        """Cleanup database resources and connections."""
        try:
            # Cancel health check task
            if self._health_check_task and not self._health_check_task.done():
                self._health_check_task.cancel()
                try:
                    await self._health_check_task
                except asyncio.CancelledError:
                    pass
                self._health_check_task = None

            # Close all connections and dispose of the engine
            if self.async_engine:
                await self.async_engine.dispose()
                self.async_engine = None

            # Reset session factory
            self.async_session_factory = None

            # Reset initialization state
            self._is_initialized = False

            # Reset pool stats
            self.async_pool_stats = PoolStats()

            logger.info("Database resources cleaned up successfully")
        except Exception as e:
            logger.error(f"Error during database cleanup: {e}")
            raise

    async def create_test_database(self) -> None:
        """Create test database if it doesn't exist."""
        try:
            # Create temporary engine to postgres database
            temp_url = self.ASYNC_DATABASE_URL.rsplit('/', 1)[0] + '/postgres'
            temp_engine = create_async_engine(temp_url)

            # Check if test database exists
            async with temp_engine.connect() as conn:
                result = await conn.execute(
                    text("SELECT 1 FROM pg_database WHERE datname = 'test_db'")
                )
                exists = result.scalar() is not None

            if not exists:
                # Create test database
                async with temp_engine.connect() as conn:
                    # Terminate existing connections
                    await conn.execute(
                        text(
                            """
                            SELECT pg_terminate_backend(pg_stat_activity.pid)
                            FROM pg_stat_activity
                            WHERE pg_stat_activity.datname = 'test_db'
                            AND pid <> pg_backend_pid()
                            """
                        )
                    )
                    await conn.execute(text("DROP DATABASE IF EXISTS test_db"))
                    await conn.execute(text("CREATE DATABASE test_db"))
                logger.info("Created test database")

            await temp_engine.dispose()
        except Exception as e:
            logger.error(f"Failed to create test database: {e}")
            raise

    async def run_migrations(self):
        """Run database migrations."""
        try:
            config = Config("alembic.ini")
            async with self.async_engine.begin() as connection:
                await connection.run_sync(lambda conn: command.upgrade(config, "head"))
            logger.info("Database migrations completed successfully")
        except Exception as e:
            logger.error(f"Error running migrations: {e}")
            raise

    @property
    def is_initialized(self) -> bool:
        """Check if database is initialized."""
        return self._is_initialized

    async def cleanup_async(self):
        """Clean up database connections."""
        if self.async_engine:
            await self.async_engine.dispose()
            self.async_engine = None
        logger.info("Database connections cleaned up")

    async def verify_async_connection(self) -> bool:
        """Verify database connection is working."""
        try:
            if not self._is_initialized:
                await self.initialize_async()
            async with self.get_connection() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Database connection verification failed: {e}")
            return False

# Initialize the singleton instance
db_config = DatabaseConfig()

# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides a database session."""
    async with db_config.get_session() as session:
        yield session

# Export all necessary components
__all__ = ['Base', 'DatabaseConfig', 'db_config', 'get_db']

