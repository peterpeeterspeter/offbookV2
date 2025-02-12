rom typing import Generic, TypeVar, Type, Optional, List, Any, Dict, Union, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.sql import Select
from sqlalchemy.exc import SQLAlchemyError
from contextlib import asynccontextmanager
import logging

from .models import Base

logger = logging.getLogger(__name__)
ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    """Base repository class with common database operations."""

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self._session = session

    @property
    def session(self) -> AsyncSession:
        """Get the current session."""
        if not self._session:
            raise RuntimeError("No active database session")
        return self._session

    async def _execute_and_handle_error(self, operation: str, func: Any, *args, **kwargs) -> Any:
        """Execute database operation and handle errors."""
        try:
            result = await func(*args, **kwargs)
            return result
        except SQLAlchemyError as e:
            logger.error(f"Database error during {operation}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during {operation}: {str(e)}")
            raise

    async def create(self, **kwargs) -> ModelType:
        """Create a new record."""
        async def _create():
            instance = self.model(**kwargs)
            self.session.add(instance)
            await self.session.flush()
            await self.session.refresh(instance)
            return instance

        return await self._execute_and_handle_error("create", _create)

    async def get(self, id: Any) -> Optional[ModelType]:
        """Get a record by id."""
        async def _get():
            query = select(self.model).where(self.model.id == id)
            result = await self.session.execute(query)
            return result.scalar_one_or_none()

        return await self._execute_and_handle_error("get", _get)

    async def get_by(self, **kwargs) -> Optional[ModelType]:
        """Get a record by arbitrary filters."""
        async def _get_by():
            query = select(self.model)
            for key, value in kwargs.items():
                query = query.where(getattr(self.model, key) == value)
            result = await self.session.execute(query)
            return result.scalar_one_or_none()

        return await self._execute_and_handle_error("get_by", _get_by)

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """List records with pagination and filtering."""
        async def _list():
            query = select(self.model)

            if filters:
                query = self.filter(query, filters)

            if order_by:
                if order_by.startswith("-"):
                    query = query.order_by(getattr(self.model, order_by[1:]).desc())
                else:
                    query = query.order_by(getattr(self.model, order_by).asc())

            query = query.offset(skip).limit(limit)
            result = await self.session.execute(query)
            return result.scalars().all()

        return await self._execute_and_handle_error("list", _list)

    async def update(
        self,
        id: Any,
        update_data: Dict[str, Any]
    ) -> Optional[ModelType]:
        """Update a record by id."""
        async def _update():
            query = (
                update(self.model)
                .where(self.model.id == id)
                .values(**update_data)
                .returning(self.model)
            )
            result = await self.session.execute(query)
            await self.session.flush()
            return result.scalar_one_or_none()

        return await self._execute_and_handle_error("update", _update)

    async def delete(self, id: Any) -> bool:
        """Delete a record by id."""
        async def _delete():
            query = delete(self.model).where(self.model.id == id)
            result = await self.session.execute(query)
            await self.session.flush()
            return result.rowcount > 0

        return await self._execute_and_handle_error("delete", _delete)

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filtering."""
        async def _count():
            query = select(self.model)
            if filters:
                query = self.filter(query, filters)
            result = await self.session.execute(query)
            return len(result.scalars().all())

        return await self._execute_and_handle_error("count", _count)

    def filter(self, query: Select, filters: Dict[str, Any]) -> Select:
        """Apply filters to a query."""
        for key, value in filters.items():
            if isinstance(value, dict):
                for op, val in value.items():
                    if op == ">=":
                        query = query.where(getattr(self.model, key) >= val)
                    elif op == "<=":
                        query = query.where(getattr(self.model, key) <= val)
                    elif op == "!=":
                        query = query.where(getattr(self.model, key) != val)
                    elif op == "like":
                        query = query.where(getattr(self.model, key).like(val))
                    elif op == "ilike":
                        query = query.where(getattr(self.model, key).ilike(val))
            elif isinstance(value, (list, tuple)):
                query = query.where(getattr(self.model, key).in_(value))
            elif value is None:
                query = query.where(getattr(self.model, key).is_(None))
            else:
                query = query.where(getattr(self.model, key) == value)
        return query
