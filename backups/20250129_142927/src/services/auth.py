from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

class AuthService:
    """Service for handling authentication and authorization."""
    
    def __init__(self):
        """Initialize the auth service."""
        self.pwd_context = pwd_context
        
    async def authenticate_user(self, username: str, password: str, get_user_func) -> Optional[Dict[str, Any]]:
        """Authenticate a user and return user data if valid."""
        try:
            user = await get_user_func(username)
            if not user:
                return None
                
            if not verify_password(password, user.hashed_password):
                return None
                
            return {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active
            }
            
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return None
            
    def create_user_token(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        """Create access token for authenticated user."""
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data["username"], "user_id": user_data["id"]},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    def verify_token_and_get_user(self, token: str) -> Dict[str, Any]:
        """Verify token and return user data."""
        return verify_token(token)
        
    def hash_password(self, password: str) -> str:
        """Hash a password."""
        return get_password_hash(password)
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password."""
        return verify_password(plain_password, hashed_password)

# Create singleton instance
auth_service = AuthService() 