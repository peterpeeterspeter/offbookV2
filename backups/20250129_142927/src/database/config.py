import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, Dict, Any
from datetime import datetime, UTC

from dotenv import load_dotenv
from sqlalchemy import create_engine, text, event
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool

# Load environment variables
load_dotenv()

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - [%(levelname)s] - %(message)s - {%(filename)s:%(lineno)d}'
)
logger = logging.getLogger(__name__)

class PoolStats:
    """Class to track database pool statistics."""
    
    def __init__(self):
        self.checkouts = 0
        self.checkins = 0
        self.size = 0
        self.overflow = 0
        self.checkedin = 0
        self.checkedout = 0
        self.last_checkout: Optional[datetime] = None
        self.last_checkin: Optional[datetime] = None
        self.failed_checkouts = 0
        self.timeouts = 0
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_checkouts": self.checkouts,
            "total_checkins": self.checkins,
            "checkins": self.checkins,  # Added for backward compatibility
            "current_size": self.size,
            "current_overflow": self.overflow,
            "available_connections": self.checkedin,
            "used_connections": self.checkedout,
            "last_checkout": self.last_checkout.isoformat() if self.last_checkout else None,
            "last_checkin": self.last_checkin.isoformat() if self.last_checkin else None,
            "failed_checkouts": self.failed_checkouts,
            "connection_timeouts": self.timeouts
        }

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
        # Database URLs
        self.DATABASE_URL = os.getenv(
            "DATABASE_URL", 
            "postgresql://postgres:postgres@localhost:5432/offbook"
        )
        self.ASYNC_DATABASE_URL = os.getenv(
            "ASYNC_DATABASE_URL", 
            "postgresql+asyncpg://postgres:postgres@localhost:5432/offbook"
        )
        
        # Engine configurations
        self.sync_engine: Optional[QueuePool] = None
        self.async_engine: Optional[AsyncEngine] = None
        
        # Session factories
        self.sync_session_factory = None
        self.async_session_factory = None
        
        # Connection state
        self._is_initialized = False
        self._health_check_interval = 30  # seconds
        
        # Base pool settings
        base_pool_settings = {
            "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
            "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "1800")),
            "pool_pre_ping": True,
        }
        
        # Sync-specific pool settings
        self.sync_pool_settings = {
            **base_pool_settings,
            "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
        }
        
        # Async-specific pool settings
        self.async_pool_settings = {
            **base_pool_settings,
            "pool_timeout": float(os.getenv("DB_POOL_TIMEOUT", "30")),  # Async needs float
        }
        
        # Add pool statistics tracking
        self.sync_pool_stats = PoolStats()
        self.async_pool_stats = PoolStats()
    
    def _setup_engine_logging(self, engine, is_async: bool):
        """Setup detailed logging for database engine events."""
        stats = self.async_pool_stats if is_async else self.sync_pool_stats
        target_engine = engine.sync_engine if is_async else engine
        target_pool = target_engine.pool
        
        @event.listens_for(target_pool, 'checkout')
        def receive_checkout(dbapi_connection, connection_record, connection_proxy):
            stats.checkouts += 1
            stats.checkedout += 1
            stats.checkedin = max(0, stats.size - stats.checkedout)
            stats.last_checkout = datetime.now(UTC)
            logger.debug(
                f"Connection checkout - Pool Stats: "
                f"Used={stats.checkedout}, "
                f"Available={stats.checkedin}, "
                f"Total={stats.size + stats.overflow}"
            )

        @event.listens_for(target_pool, 'checkin')
        def receive_checkin(dbapi_connection, connection_record):
            stats.checkins += 1
            stats.checkedout = max(0, stats.checkedout - 1)
            stats.checkedin = stats.size - stats.checkedout
            stats.last_checkin = datetime.now(UTC)
            logger.debug(
                f"Connection checkin - Pool Stats: "
                f"Used={stats.checkedout}, "
                f"Available={stats.checkedin}, "
                f"Total={stats.size + stats.overflow}"
            )

        @event.listens_for(target_pool, 'connect')
        def receive_connect(dbapi_connection, connection_record):
            stats.size += 1
            stats.checkedin += 1
            logger.info(
                f"New connection established - Pool Size: {stats.size}, "
                f"Overflow: {stats.overflow}"
            )

        @event.listens_for(target_pool, 'reset')
        def receive_reset(dbapi_connection, connection_record):
            logger.debug(
                f"Connection reset - Pool Stats: "
                f"Used={stats.checkedout}, "
                f"Available={stats.checkedin}"
            )

        @event.listens_for(target_pool, 'soft_invalidate')
        def receive_soft_invalidate(dbapi_connection, connection_record):
            stats.failed_checkouts += 1
            logger.warning(
                f"Connection soft invalidated - Pool Stats: "
                f"Used={stats.checkedout}, "
                f"Available={stats.checkedin}"
            )

        @event.listens_for(target_pool, 'invalidate')
        def receive_invalidate(dbapi_connection, connection_record):
            stats.failed_checkouts += 1
            stats.size = max(0, stats.size - 1)
            stats.checkedin = max(0, stats.checkedin - 1)
            logger.warning(
                f"Connection invalidated - Pool Stats: "
                f"Used={stats.checkedout}, "
                f"Available={stats.checkedin}"
            )

        # Only add timeout event listener for sync engines
        if not is_async:
            @event.listens_for(target_pool, 'timeout')
            def receive_timeout(dbapi_connection, connection_record):
                stats.timeouts += 1
                stats.failed_checkouts += 1
                logger.warning(
                    f"Connection timeout - Pool Stats: "
                    f"Used={stats.checkedout}, "
                    f"Available={stats.checkedin}, "
                    f"Timeouts={stats.timeouts}"
                )
                raise SQLAlchemyError("Connection timeout")

    def initialize_sync(self):
        """Initialize synchronous database connection."""
        if self.sync_engine is not None:
            return
        
        try:
            self.sync_engine = create_engine(
                self.DATABASE_URL,
                **self.sync_pool_settings,
                echo=True,
                future=True,
                isolation_level="READ_COMMITTED",
                logging_name="sync_pool"
            )
            
            self._setup_engine_logging(self.sync_engine, is_async=False)
            
            self.sync_session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.sync_engine
            )
            
            # Test connection
            with self.sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info(
                f"Sync database initialized - Pool Settings: {self.sync_pool_settings}"
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to initialize sync database: {str(e)}")
            self.cleanup_sync()
            raise
    
    async def initialize_async(self):
        """Initialize asynchronous database connection."""
        if self.async_engine is not None:
            return
        
        try:
            self.async_engine = create_async_engine(
                self.ASYNC_DATABASE_URL,
                **self.async_pool_settings,
                echo=True,
                future=True,
                isolation_level="READ_COMMITTED",
                logging_name="async_pool"
            )
            
            self._setup_engine_logging(self.async_engine, is_async=True)
            
            self.async_session_factory = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=False
            )
            
            # Test connection
            async with self.async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            
            self._is_initialized = True
            logger.info(
                f"Async database initialized - Pool Settings: {self.async_pool_settings}"
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to initialize async database: {str(e)}")
            await self.cleanup_async()
            raise
    
    def cleanup_sync(self):
        """Cleanup synchronous database resources."""
        if self.sync_engine:
            self.sync_engine.dispose()
            self.sync_engine = None
            self.sync_session_factory = None
            logger.info("Synchronous database resources cleaned up")
    
    async def cleanup_async(self):
        """Cleanup asynchronous database resources."""
        if self.async_engine:
            await self.async_engine.dispose()
            self.async_engine = None
            self.async_session_factory = None
            self._is_initialized = False
            logger.info("Asynchronous database resources cleaned up")
    
    async def verify_async_connection(self) -> bool:
        """Verify async database connection is working."""
        if not self._is_initialized:
            await self.initialize_async()
        
        try:
            async with self.async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError as e:
            logger.error(f"Async database connection verification failed: {str(e)}")
            return False
    
    def verify_sync_connection(self) -> bool:
        """Verify sync database connection is working."""
        if not self.sync_engine:
            self.initialize_sync()
        
        try:
            with self.sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError as e:
            logger.error(f"Sync database connection verification failed: {str(e)}")
            return False
    
    @asynccontextmanager
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get an async database session with automatic cleanup."""
        if not self._is_initialized:
            await self.initialize_async()
        
        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except SQLAlchemyError as e:
                await session.rollback()
                logger.error(f"Async session error: {str(e)}")
                raise
            finally:
                await session.close()
    
    @asynccontextmanager
    async def get_sync_session(self) -> Session:
        """Get a sync database session with automatic cleanup."""
        if not self.sync_engine:
            self.initialize_sync()
        
        session = self.sync_session_factory()
        try:
            yield session
            session.commit()
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Sync session error: {str(e)}")
            raise
        finally:
            session.close()

    def get_pool_stats(self, is_async: bool = True) -> Dict[str, Any]:
        """Get current pool statistics."""
        stats = self.async_pool_stats if is_async else self.sync_pool_stats
        return stats.to_dict()
    
    async def log_pool_health(self):
        """Log detailed pool health information."""
        async_stats = self.get_pool_stats(is_async=True)
        sync_stats = self.get_pool_stats(is_async=False)
        
        logger.info("Database Pool Health Report:")
        logger.info(f"Async Pool Stats: {async_stats}")
        logger.info(f"Sync Pool Stats: {sync_stats}")
        
        # Log warnings for potential issues
        for stats, pool_type in [(async_stats, "Async"), (sync_stats, "Sync")]:
            used_ratio = stats["used_connections"] / (self.sync_pool_settings["pool_size"] + self.sync_pool_settings["max_overflow"])
            if used_ratio > 0.8:
                logger.warning(
                    f"{pool_type} pool usage high ({used_ratio:.1%}). "
                    f"Consider increasing pool size."
                )
            if stats["failed_checkouts"] > 0:
                logger.warning(
                    f"{pool_type} pool has {stats['failed_checkouts']} failed checkouts. "
                    f"Check for connection leaks."
                )
            if stats["connection_timeouts"] > 0:
                logger.warning(
                    f"{pool_type} pool has {stats['connection_timeouts']} timeouts. "
                    f"Consider adjusting timeout settings."
                )

# Create global instance
db_config = DatabaseConfig()

# Convenience functions for dependency injection
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions."""
    async with db_config.get_async_session() as session:
        yield session

def get_sync_session() -> Session:
    """Dependency for getting sync database sessions."""
    with db_config.get_sync_session() as session:
        yield session

