from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from .models import Token, UserCreate, UserInDB, UserUpdate
from .service import AuthService
from ..database.config import get_session

router = APIRouter()

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_auth_service(
    session: AsyncSession = Depends(get_session)
) -> AuthService:
    """Dependency to get AuthService instance."""
    return AuthService(session)

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    auth_service: AuthService = Depends(get_auth_service)
) -> UserInDB:
    """Dependency to get current authenticated user."""
    return await auth_service.get_current_user(token)

async def get_current_admin(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    auth_service: AuthService = Depends(get_auth_service)
) -> UserInDB:
    """Dependency to get current admin user."""
    auth_service.verify_admin(current_user)
    return current_user

@router.post("/register", response_model=Token)
async def register_user(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Register a new user."""
    # Check if user already exists
    if await auth_service.get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user in database
    hashed_password = auth_service.get_password_hash(user_data.password)
    user = UserInDB(
        **user_data.model_dump(exclude={"password"}),
        hashed_password=hashed_password
    )
    
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

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate user and return tokens."""
    user = await auth_service.authenticate_user(
        form_data.username,  # username field contains email
        form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Refresh access token using refresh token."""
    access_token, new_refresh_token = await auth_service.refresh_tokens(
        refresh_token
    )
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=1800  # 30 minutes
    )

@router.post("/logout")
async def logout(
    refresh_token: str,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Logout user by revoking refresh token."""
    await auth_service.revoke_refresh_token(refresh_token)
    return {"detail": "Successfully logged out"}

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
    # Update user in database
    if user_update.password:
        user_update.password = auth_service.get_password_hash(
            user_update.password
        )
    
    # Apply updates
    for field, value in user_update.model_dump(
        exclude_unset=True
    ).items():
        setattr(current_user, field, value)
    
    await auth_service.session.commit()
    return current_user 