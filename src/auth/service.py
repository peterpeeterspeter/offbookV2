from datetime import datetime, timedelta
from typing import Optional, Union, Tuple, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
import secrets
import os
import logging

from .models import UserInDB, TokenData, UserRole, RefreshToken
from ..database.models import User

# Configure logging
logger = logging.getLogger(__name__)

# Configure password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Get JWT settings from environment
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        logger.debug("AuthService initialized with session: %s", session)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Generate password hash."""
        if not password:
            raise ValueError("Password cannot be empty")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in password):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in password):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in password):
            raise ValueError("Password must contain at least one number")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            raise ValueError("Password must contain at least one special character")
        return pwd_context.hash(password)

    # Alias for get_password_hash to maintain compatibility with tests
    hash_password = get_password_hash

    async def get_user(self, user_id: int) -> Optional[UserInDB]:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            return UserInDB.model_validate(user)
        return None

    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """Get user by email."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        if user:
            return UserInDB.model_validate(user)
        return None

    async def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        """Get user by username."""
        result = await self.session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()
        if user:
            return UserInDB.model_validate(user)
        return None

    async def authenticate_user(
        self,
        username_or_email: str,
        password: str
    ) -> Optional[UserInDB]:
        """Authenticate user with username/email and password."""
        logger.debug("Attempting authentication for user: %s", username_or_email)

        # Try username first
        user = await self.get_user_by_username(username_or_email)
        if not user:
            logger.debug("User not found by username, trying email")
            # Try email if username not found
            user = await self.get_user_by_email(username_or_email)

        if not user:
            logger.debug("User not found by username or email")
            return None

        if not self.verify_password(password, user.hashed_password):
            logger.debug("Password verification failed for user: %s", username_or_email)
            return None

        logger.debug("Authentication successful for user: %s", username_or_email)
        return user

    def create_access_token(
        self,
        user_id: int,
        role: UserRole,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token."""
        logger.debug("Creating access token for user_id: %s with role: %s", user_id, role)

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        logger.debug("Token will expire at: %s", expire)

        to_encode = {
            "sub": str(user_id),
            "role": role,
            "exp": expire,
            "type": "access"
        }
        token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        logger.debug("Access token created successfully")
        return token

    def create_refresh_token(
        self,
        user_id: int,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT refresh token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                days=REFRESH_TOKEN_EXPIRE_DAYS
            )

        to_encode = {
            "sub": str(user_id),
            "exp": expire,
            "type": "refresh"
        }
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    async def get_current_user(
        self,
        token: str,
        token_type: str = "access"
    ) -> UserInDB:
        """Validate JWT token and return current user."""
        logger.debug("Validating %s token", token_type)

        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM]
            )
            logger.debug("Token decoded successfully")

            user_id = int(payload.get("sub"))
            if payload.get("type") != token_type:
                logger.error("Token type mismatch. Expected: %s, Got: %s",
                           token_type, payload.get("type"))
                raise credentials_exception

            token_data = TokenData(
                user_id=user_id,
                role=payload.get("role"),
                exp=datetime.fromtimestamp(payload.get("exp"))
            )
        except jwt.PyJWTError as e:
            logger.error("Token validation failed: %s", str(e))
            raise credentials_exception

        user = await self.get_user(token_data.user_id)
        if user is None:
            logger.error("User not found for token user_id: %s", token_data.user_id)
            raise credentials_exception

        logger.debug("User successfully retrieved from token")
        return user

    async def refresh_tokens(
        self,
        refresh_token: str
    ) -> tuple[str, str]:
        """Create new access and refresh tokens using refresh token."""
        try:
            user = await self.get_current_user(refresh_token, "refresh")

            # Create new tokens
            access_token = self.create_access_token(
                user.id,
                user.role
            )
            new_refresh_token = self.create_refresh_token(user.id)

            return access_token, new_refresh_token

        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    async def revoke_refresh_token(self, token: str) -> None:
        """Revoke a refresh token."""
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token == token)
        )
        refresh_token = result.scalar_one_or_none()
        if refresh_token:
            refresh_token.revoked = True
            await self.session.commit()

    def verify_admin(self, user: UserInDB) -> None:
        """Verify user has admin role."""
        if user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
