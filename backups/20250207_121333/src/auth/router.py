from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
import logging

from .models import Token, UserCreate, UserInDB, UserUpdate
from .service import AuthService, AuthenticationError
from ..database.session import session_manager

logger = logging.getLogger(__name__)
router = APIRouter()

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_auth_service() -> AuthService:
    """Dependency to get AuthService instance."""
    async with session_manager.session() as session:
        yield AuthService(session)

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    auth_service: AuthService = Depends(get_auth_service)
) -> UserInDB:
    """Dependency to get current authenticated user."""
    try:
        return await auth_service.get_current_user(token)
    except AuthenticationError as e:
        logger.warning(f"Authentication failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

async def get_current_admin(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    auth_service: AuthService = Depends(get_auth_service)
) -> UserInDB:
    """Dependency to get current admin user."""
    try:
        auth_service.verify_admin(current_user)
        return current_user
    except HTTPException:
        logger.warning(f"Admin access denied for user {current_user.id}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/register", response_model=Token)
async def register_user(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Register a new user."""
    try:
        # Check if user already exists
        if await auth_service.get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user in database
        async with session_manager.session() as session:
            # Hash password
            hashed_password = auth_service.get_password_hash(user_data.password)

            # Create user
            user = UserInDB(
                **user_data.model_dump(exclude={"password"}),
                hashed_password=hashed_password
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Generate tokens
            access_token = auth_service.create_access_token(
                user.id,
                user.role
            )
            refresh_token = auth_service.create_refresh_token(user.id)

            return Token(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=1800  # 30 minutes
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user account"
        )

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate user and return tokens."""
    try:
        user = await auth_service.authenticate_user(
            form_data.username,  # username field contains email
            form_data.password
        )
        if not user:
            raise AuthenticationError("Incorrect email or password")

        access_token = auth_service.create_access_token(
            user.id,
            user.role
        )
        refresh_token = auth_service.create_refresh_token(user.id)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=1800  # 30 minutes
        )
    except AuthenticationError as e:
        logger.warning(f"Login failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login error"
        )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Refresh access token using refresh token."""
    try:
        access_token, new_refresh_token = await auth_service.refresh_tokens(
            refresh_token
        )

        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=1800  # 30 minutes
        )
    except AuthenticationError as e:
        logger.warning(f"Token refresh failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error refreshing token"
        )

@router.post("/logout")
async def logout(
    refresh_token: str,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Logout user by revoking refresh token."""
    try:
        await auth_service.revoke_refresh_token(refresh_token)
        return {"detail": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during logout"
        )

@router.get("/me", response_model=UserInDB)
async def read_users_me(
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    """Get current user information."""
    return current_user

@router.put("/me", response_model=UserInDB)
async def update_user_me(
    user_update: UserUpdate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    auth_service: AuthService = Depends(get_auth_service)
):
    """Update current user information."""
    try:
        async with session_manager.session() as session:
            # Update password if provided
            if user_update.password:
                user_update.password = auth_service.get_password_hash(
                    user_update.password
                )

            # Apply updates
            update_data = user_update.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(current_user, field, value)

            session.add(current_user)
            await session.commit()
            await session.refresh(current_user)

            return current_user
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user information"
        )
