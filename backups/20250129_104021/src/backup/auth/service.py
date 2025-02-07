from datetime import datetime, timedelta
from typing import Optional, Union
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets
import os

from .models import UserInDB, TokenData, UserRole, RefreshToken
from ..database.models import User

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
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Generate password hash."""
        return pwd_context.hash(password)
    
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
    
    async def authenticate_user(
        self,
        email: str,
        password: str
    ) -> Optional[UserInDB]:
        """Authenticate user with email and password."""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user
    
    def create_access_token(
        self,
        user_id: int,
        role: UserRole,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        to_encode = {
            "sub": str(user_id),
            "role": role,
            "exp": expire,
            "type": "access"
        }
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
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
            user_id = int(payload.get("sub"))
            if payload.get("type") != token_type:
                raise credentials_exception
            
            token_data = TokenData(
                user_id=user_id,
                role=payload.get("role"),
                exp=datetime.fromtimestamp(payload.get("exp"))
            )
        except jwt.PyJWTError:
            raise credentials_exception
        
        user = await self.get_user(token_data.user_id)
        if user is None:
            raise credentials_exception
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