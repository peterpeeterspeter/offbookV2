import os
import sys
import asyncio
import asyncpg
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from src.config import get_settings
from src.database.config import Base

# Get settings instance
settings = get_settings()

async def create_test_database():
    """Create test database if it doesn't exist."""
    try:
        # Connect to default postgres database
        conn = await asyncpg.connect(
            user='postgres',
            password='postgres',
            database='postgres',
            host='localhost'
        )

        # Check if test database exists
        result = await conn.fetch(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            'test_offbook'
        )

        if not result:
            # Create test database if it doesn't exist
            await conn.execute('CREATE DATABASE test_offbook')
            print("Test database created successfully")

        await conn.close()

        # Create engine and tables
        engine = create_async_engine(settings.TEST_DATABASE_URL)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

        await engine.dispose()
        print("Test database tables created successfully")

    except Exception as e:
        print(f"Error setting up test database: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(create_test_database())
