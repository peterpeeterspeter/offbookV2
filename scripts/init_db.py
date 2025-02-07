#!/usr/bin/env python3
import asyncio
import os
import sys
from pathlib import Path

# Add the src directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from src.database.config import init_db, engine
from src.database.models import Base
from sqlalchemy import text
from sqlalchemy.schema import CreateTable

async def create_database():
    """Create the database if it doesn't exist."""
    try:
        # Connect to PostgreSQL server
        async with engine.begin() as conn:
            # Check if database exists
            result = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = 'offbook'")
            )
            exists = result.scalar()
            
            if not exists:
                # Close all connections to postgres database
                await conn.execute(text("COMMIT"))
                await conn.execute(text("CREATE DATABASE offbook"))
                print("Database 'offbook' created successfully")
            else:
                print("Database 'offbook' already exists")
    except Exception as e:
        print(f"Error creating database: {str(e)}")
        raise

async def initialize_tables():
    """Initialize database tables."""
    try:
        async with engine.begin() as conn:
            # Drop all tables if they exist
            await conn.run_sync(Base.metadata.drop_all)
            print("Dropped existing tables")
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            print("Created all tables")
            
            # Print table schemas
            for table in Base.metadata.sorted_tables:
                print(f"\nTable: {table.name}")
                print(CreateTable(table).compile(engine))
    except Exception as e:
        print(f"Error initializing tables: {str(e)}")
        raise

async def main():
    """Main initialization function."""
    try:
        await create_database()
        await initialize_tables()
        print("Database initialization completed successfully")
    except Exception as e:
        print(f"Database initialization failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 