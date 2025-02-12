from typing import AsyncGenerator, Optional, TypeVar, Type, Any
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import logging

from .config import DatabaseConfig
from .repository import BaseRepository
from .models import Base

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=Base)

class SessionManager:
    """Manages database session lifecycle and provides repository access."""

    def __init__(self):
        self.db_config = DatabaseConfig()
        self._session: Optional[AsyncSession] = None

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session within a context manager.

        Usage:
            async with session_manager.session() as session:
                # use session here
        """
        if not self.db_config._is_initialized:
            await self.db_config.initialize_async()

        session = self.db_config.async_session_factory()
        try:
            yield session
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Database error: {str(e)}")
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Unexpected error during session: {str(e)}")
            raise
        finally:
            await session.close()

    @asynccontextmanager
    async def get_repository(self, model: Type[T]) -> AsyncGenerator[BaseRepository[T], None]:
        """Get a repository instance within a session context.

        Usage:
            async with session_manager.get_repository(User) as repo:
                user = await repo.get(user_id)
        """
        async with self.session() as session:
            yield BaseRepository(model, session)

    async def run_in_transaction(self, func: Any, *args, **kwargs) -> Any:
        """Run a function within a transaction.

        Usage:
            result = await session_manager.run_in_transaction(
                repository.create_user,
                username="test",
                email="test@example.com"
            )
        """
        async with self.session() as session:
            try:
                result = await func(*args, **kwargs, session=session)
                await session.commit()
                return result
            except Exception as e:
                await session.rollback()
                logger.error(f"Transaction error: {str(e)}")
                raise

# Create a singleton instance
session_manager = SessionManager()
