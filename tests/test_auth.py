import pytest
import pytest_asyncio
from httpx import AsyncClient
from fastapi import status
from faker import Faker
from datetime import datetime, timedelta, UTC
from jose import jwt
import asyncio
import time

from src.main import app
from src.database.models import User, Base
from src.database.config import get_db
from src.auth.service import (
    AuthService,
    JWT_SECRET_KEY as SECRET_KEY,
    JWT_ALGORITHM as ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    pwd_context
)

fake = Faker()

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture
async def auth_service():
    """Create an AuthService instance for testing."""
    async for db in get_db():
        service = AuthService(session=db)
        yield service
        await db.close()

@pytest_asyncio.fixture
async def test_client():
    """Create an async test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def user_data():
    """Generate fake user data for testing."""
    return {
        "username": fake.user_name(),
        "email": fake.email(),
        "password": "Test123!@#"
    }

@pytest.mark.asyncio
async def test_register_user(test_client: AsyncClient, user_data: dict):
    """Test user registration."""
    response = await test_client.post("/auth/register", json=user_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert "user" in data
    assert data["user"]["username"] == user_data["username"]
    assert data["user"]["email"] == user_data["email"]
    assert "id" in data["user"]

@pytest.mark.asyncio
async def test_register_duplicate_username(test_client: AsyncClient, user_data: dict):
    """Test registration with duplicate username."""
    # First registration
    await test_client.post("/auth/register", json=user_data)

    # Try to register with same username
    response = await test_client.post("/auth/register", json=user_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_register_duplicate_email(test_client: AsyncClient, user_data: dict):
    """Test registration with duplicate email."""
    # First registration
    await test_client.post("/auth/register", json=user_data)

    # Try to register with same email but different username
    user_data["username"] = fake.user_name()
    response = await test_client.post("/auth/register", json=user_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login(test_client: AsyncClient, user_data: dict):
    """Test user login."""
    # Register user first
    await test_client.post("/auth/register", json=user_data)

    # Login
    form_data = {
        "username": user_data["username"],
        "password": user_data["password"]
    }
    response = await test_client.post("/auth/token", data=form_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(test_client: AsyncClient, user_data: dict):
    """Test login with invalid credentials."""
    # Register user first
    await test_client.post("/auth/register", json=user_data)

    # Try to login with wrong password
    form_data = {
        "username": user_data["username"],
        "password": "wrong_password"
    }
    response = await test_client.post("/auth/token", data=form_data)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user(test_client: AsyncClient, user_data: dict):
    """Test getting current user with valid token."""
    # Register and login user
    await test_client.post("/auth/register", json=user_data)
    form_data = {
        "username": user_data["username"],
        "password": user_data["password"]
    }
    login_response = await test_client.post("/auth/token", data=form_data)
    token = login_response.json()["access_token"]

    # Get current user with token
    headers = {"Authorization": f"Bearer {token}"}
    response = await test_client.get("/auth/me", headers=headers)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["username"] == user_data["username"]
    assert data["email"] == user_data["email"]

@pytest.mark.asyncio
async def test_get_current_user_invalid_token(test_client: AsyncClient):
    """Test getting current user with invalid token."""
    headers = {"Authorization": "Bearer invalid_token"}
    response = await test_client.get("/auth/me", headers=headers)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in response.json()["detail"]

@pytest.fixture
def test_user_data():
    return {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "is_active": True
    }

@pytest.fixture
def test_password():
    return "StrongP@ssw0rd123"

@pytest.fixture
def hashed_password(test_password):
    return pwd_context.hash(test_password)

@pytest.fixture
def mock_get_user(test_user_data, hashed_password):
    async def _get_user(username):
        if username == test_user_data["username"]:
            class User:
                def __init__(self):
                    self.id = test_user_data["id"]
                    self.username = test_user_data["username"]
                    self.email = test_user_data["email"]
                    self.is_active = test_user_data["is_active"]
                    self.hashed_password = hashed_password
            return User()
        return None
    return _get_user

def test_password_hashing():
    password = "MySecurePassword123!"
    hashed = pwd_context.hash(password)
    assert hashed != password
    assert pwd_context.verify(password, hashed)
    assert not pwd_context.verify("wrong_password", hashed)

def test_password_requirements(auth_service):
    # Test empty password
    with pytest.raises(ValueError):
        auth_service.hash_password("")

    # Test password without uppercase
    with pytest.raises(ValueError, match="must contain at least one uppercase letter"):
        auth_service.hash_password("password123!")

    # Test password without lowercase
    with pytest.raises(ValueError, match="must contain at least one lowercase letter"):
        auth_service.hash_password("PASSWORD123!")

    # Test password without number
    with pytest.raises(ValueError, match="must contain at least one number"):
        auth_service.hash_password("Password!")

    # Test password without special character
    with pytest.raises(ValueError, match="must contain at least one special character"):
        auth_service.hash_password("Password123")

    # Test password too short
    with pytest.raises(ValueError, match="must be at least 8 characters"):
        auth_service.hash_password("Pa1!")

    # Test valid password
    valid_password = "Password123!"
    hashed = auth_service.hash_password(valid_password)
    assert hashed != valid_password
    assert auth_service.verify_password(valid_password, hashed)

def test_password_hash_consistency():
    password = "TestPassword123!"
    hash1 = pwd_context.hash(password)
    hash2 = pwd_context.hash(password)

    # Different salts should produce different hashes
    assert hash1 != hash2

    # Both hashes should verify correctly
    assert pwd_context.verify(password, hash1)
    assert pwd_context.verify(password, hash2)

@pytest.mark.asyncio
async def test_authenticate_user(auth_service, test_user_data, test_password):
    # Create a test user
    hashed_password = auth_service.hash_password(test_password)
    user = User(
        username=test_user_data["username"],
        email=test_user_data["email"],
        hashed_password=hashed_password,
        is_active=test_user_data["is_active"]
    )
    auth_service.session.add(user)
    await auth_service.session.commit()

    # Test successful authentication
    authenticated_user = await auth_service.authenticate_user(
        test_user_data["username"],
        test_password
    )
    assert authenticated_user is not None
    assert authenticated_user.username == test_user_data["username"]

    # Test wrong password
    wrong_user = await auth_service.authenticate_user(
        test_user_data["username"],
        "wrong_password"
    )
    assert wrong_user is None

    # Test non-existent user
    nonexistent_user = await auth_service.authenticate_user(
        "nonexistent_user",
        test_password
    )
    assert nonexistent_user is None

    # Clean up
    await auth_service.session.delete(user)
    await auth_service.session.commit()

@pytest.mark.asyncio
async def test_token_creation(auth_service):
    user_data = {"id": 1, "username": "testuser"}
    token = auth_service.create_access_token(
        user_id=user_data["id"],
        role="user"
    )
    assert token is not None

    # Verify token contents
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == str(user_data["id"])
    assert payload["type"] == "access"
    assert "exp" in payload

@pytest.mark.asyncio
async def test_token_verification(auth_service):
    user_data = {"id": 1, "username": "testuser"}
    token = auth_service.create_access_token(
        user_id=user_data["id"],
        role="user"
    )

    # Verify token
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == str(user_data["id"])
    assert payload["type"] == "access"
    assert "exp" in payload

@pytest.mark.asyncio
async def test_token_expiration(auth_service):
    user_data = {"id": 1, "username": "testuser"}

    # Create token that expires in 1 second
    token = auth_service.create_access_token(
        user_id=user_data["id"],
        role="user",
        expires_delta=timedelta(seconds=1)
    )

    # Token should be valid initially
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == str(user_data["id"])

    # Wait for token to expire
    await asyncio.sleep(2)

    # Token should be expired
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

@pytest.mark.asyncio
async def test_concurrent_authentication(auth_service, test_client):
    """Test concurrent authentication requests."""
    # Register multiple users
    users = []
    for i in range(3):
        user_data = {
            "username": f"testuser{i}_{int(time.time())}",  # Make usernames unique
            "email": f"test{i}_{int(time.time())}@example.com",
            "password": "Test123!@#"
        }
        response = await test_client.post("/auth/register", json=user_data)
        assert response.status_code == 200
        users.append(user_data)

    # Authenticate users concurrently
    async def auth_user(user):
        form_data = {
            "username": user["username"],
            "password": user["password"]
        }
        response = await test_client.post("/auth/token", data=form_data)
        assert response.status_code == 200
        return response.json()["access_token"]

    # Run concurrent authentications
    tokens = await asyncio.gather(
        *[auth_user(user) for user in users]
    )

    # Verify all tokens are valid and different
    token_payloads = [
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        for token in tokens
    ]
    assert len(set(tokens)) == len(tokens)  # All tokens should be unique

@pytest.mark.asyncio
async def test_token_validation_edge_cases(auth_service):
    # Test malformed token
    with pytest.raises(jwt.JWTError):
        jwt.decode("malformed.token.here", SECRET_KEY, algorithms=[ALGORITHM])

    # Test token with invalid signature
    user_data = {"id": 1, "username": "testuser"}
    token = auth_service.create_access_token(
        user_id=user_data["id"],
        role="user"
    )

    # Convert token to string if it's bytes
    if isinstance(token, bytes):
        token = token.decode('utf-8')

    # Now we can safely encode to bytes
    token_bytes = token.encode('utf-8')
    modified_bytes = token_bytes[:-1] + bytes([token_bytes[-1] ^ 1])  # Flip last bit
    modified_token = modified_bytes.decode('utf-8')

    with pytest.raises(jwt.JWTError):
        jwt.decode(modified_token, SECRET_KEY, algorithms=[ALGORITHM])

@pytest.mark.asyncio
async def test_token_refresh(auth_service):
    user_data = {"id": 1, "username": "testuser"}

    # Create initial tokens
    access_token = auth_service.create_access_token(
        user_id=user_data["id"],
        role="user"
    )
    refresh_token = auth_service.create_refresh_token(
        user_id=user_data["id"]
    )

    # Verify both tokens are valid and different
    access_payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
    refresh_payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])

    assert access_payload["type"] == "access"
    assert refresh_payload["type"] == "refresh"
    assert access_token != refresh_token
