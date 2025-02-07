import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, configure_mappers
from sqlalchemy import text, event, exc as sa_exc
from sqlalchemy.sql import func
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import all models to ensure they are registered
from .models import Base, mapper_registry
from .models import User, Script, Character, Scene, Session
from .models import Performance, Recording, Feedback, TTSCache

class DatabaseConfig:
    def __init__(self):
        self.ASYNC_DATABASE_URL = os.getenv('ASYNC_DATABASE_URL', 'postgresql+asyncpg://postgres:postgres@localhost:5432/offbook')
        self.engine = None
        self.async_session_factory = None
        self._is_initialized = False
        self._setup_logging()

    def _setup_logging(self):
        """Configure SQLAlchemy logging."""
        logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
        logging.getLogger('sqlalchemy.pool').setLevel(logging.INFO)

    async def initialize(self):
        """Initialize database connection and configuration."""
        if self._is_initialized:
            return

        try:
            # Configure mappers before engine creation
            if not getattr(Base, 'registry', None):
                logger.info("Configuring mapper registry...")
                mapper_registry.configure()
                configure_mappers()
                logger.info("Mapper registry configured successfully")

            # Create engine with optimized settings for async operations
            self.engine = create_async_engine(
                self.ASYNC_DATABASE_URL,
                echo=True,
                future=True,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=1800,
                isolation_level='READ COMMITTED'
            )

            # Create session factory with proper async configuration
            self.async_session_factory = async_sessionmaker(
                bind=self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=False
            )

            # Verify database connection
            async with self.engine.begin() as conn:
                await conn.execute(text("SELECT 1"))

            self._is_initialized = True
            logger.info("Database configuration initialized successfully")

        except sa_exc.SQLAlchemyError as e:
            logger.error(f"SQLAlchemy error during initialization: {str(e)}")
            await self.cleanup()
            raise
        except Exception as e:
            logger.error(f"Unexpected error during initialization: {str(e)}")
            await self.cleanup()
            raise

    async def verify_connection(self):
        """Verify database connection is working."""
        if not self._is_initialized:
            await self.initialize()

        try:
            async with self.engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except sa_exc.SQLAlchemyError as e:
            logger.error(f"Database connection verification failed: {str(e)}")
            return False

    async def create_tables(self):
        """Create database tables."""
        if not self._is_initialized:
            await self.initialize()

        try:
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
        except sa_exc.SQLAlchemyError as e:
            logger.error(f"Failed to create tables: {str(e)}")
            raise

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session with automatic commit/rollback."""
        if not self._is_initialized:
            await self.initialize()

        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except sa_exc.SQLAlchemyError as e:
                await session.rollback()
                logger.error(f"Session error: {str(e)}")
                raise
            finally:
                await session.close()

    async def cleanup(self):
        """Cleanup database connections."""
        if self.engine:
            await self.engine.dispose()
            self._is_initialized = False
            logger.info("Database connections cleaned up")

# Create global database instance
db = DatabaseConfig()

# Convenience functions
async def init_db():
    """Initialize the database and create tables."""
    await db.initialize()
    await db.create_tables()

async def cleanup_db():
    """Cleanup database connections."""
    await db.cleanup()

async def verify_database():
    """Verify database connection."""
    try:
        return await db.verify_connection()
    except Exception:
        return False

@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get a database session."""
    async with db.session() as session:
        yield session

