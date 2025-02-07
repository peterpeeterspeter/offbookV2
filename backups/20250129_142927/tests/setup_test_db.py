import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import text

from src.database.models import Base
from src.database.config import db_config

logger = logging.getLogger(__name__)

async def setup_test_database():
    """Set up a clean test database."""
    try:
        # Create engine with superuser credentials to create/drop database
        admin_engine = create_async_engine(
            "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres",
            isolation_level="AUTOCOMMIT"
        )
        
        # Drop test database if it exists
        async with admin_engine.begin() as conn:
            await conn.execute(
                text("DROP DATABASE IF EXISTS offbook_test WITH (FORCE)")
            )
            logger.info("Dropped existing test database")
            
            # Create fresh test database
            await conn.execute(
                text("CREATE DATABASE offbook_test")
            )
            logger.info("Created fresh test database")
        
        await admin_engine.dispose()
        
        # Initialize test database schema
        await db_config.initialize_async()
        async with db_config.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Created database schema")
        
        return True
        
    except Exception as e:
        logger.error(f"Error setting up test database: {str(e)}")
        return False

async def cleanup_test_database():
    """Clean up test database resources."""
    try:
        await db_config.cleanup_async()
        logger.info("Cleaned up test database resources")
        return True
    except Exception as e:
        logger.error(f"Error cleaning up test database: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(setup_test_database()) 