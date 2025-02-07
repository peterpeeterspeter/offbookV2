import pytest
from httpx import AsyncClient
from fastapi import status
from faker import Faker

from src.main import app
from src.database.models import User
from src.services.auth import auth_service

fake = Faker()

@pytest.fixture
def user_data():
    """Generate fake user data for testing."""
    return {
        "username": fake.user_name(),
        "email": fake.email(),
        "password": "Test123!@#"
    }

@pytest.fixture
async def async_client():
    """Create async client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_register_user(async_client, user_data):
    """Test user registration."""
    response = await async_client.post("/auth/register", json=user_data)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert "user" in data
    assert data["user"]["username"] == user_data["username"]
    assert data["user"]["email"] == user_data["email"]
    assert "id" in data["user"]

@pytest.mark.asyncio
async def test_register_duplicate_username(async_client, user_data):
    """Test registration with duplicate username."""
    # First registration
    await async_client.post("/auth/register", json=user_data)
    
    # Try to register with same username
    response = await async_client.post("/auth/register", json=user_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_register_duplicate_email(async_client, user_data):
    """Test registration with duplicate email."""
    # First registration
    await async_client.post("/auth/register", json=user_data)
    
    # Try to register with same email but different username
    user_data["username"] = fake.user_name()
    response = await async_client.post("/auth/register", json=user_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login(async_client, user_data):
    """Test user login."""
    # Register user first
    await async_client.post("/auth/register", json=user_data)
    
    # Login
    form_data = {
        "username": user_data["username"],
        "password": user_data["password"]
    }
    response = await async_client.post("/auth/token", data=form_data)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client, user_data):
    """Test login with invalid credentials."""
    # Register user first
    await async_client.post("/auth/register", json=user_data)
    
    # Try to login with wrong password
    form_data = {
        "username": user_data["username"],
        "password": "wrong_password"
    }
    response = await async_client.post("/auth/token", data=form_data)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user(async_client, user_data):
    """Test getting current user with valid token."""
    # Register and login user
    await async_client.post("/auth/register", json=user_data)
    form_data = {
        "username": user_data["username"],
        "password": user_data["password"]
    }
    login_response = await async_client.post("/auth/token", data=form_data)
    token = login_response.json()["access_token"]
    
    # Get current user with token
    headers = {"Authorization": f"Bearer {token}"}
    response = await async_client.get("/auth/me", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["username"] == user_data["username"]
    assert data["email"] == user_data["email"]

@pytest.mark.asyncio
async def test_get_current_user_invalid_token(async_client):
    """Test getting current user with invalid token."""
    headers = {"Authorization": "Bearer invalid_token"}
    response = await async_client.get("/auth/me", headers=headers)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in response.json()["detail"] 
