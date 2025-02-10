from functools import lru_cache
import os
import logging
from pydantic_settings import BaseSettings
from typing import List

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application settings."""
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    TEST_DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"
    ASYNC_DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/offbook"

    # Database Pool Settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 3
    DB_POOL_TIMEOUT: int = 20
    DB_POOL_RECYCLE: int = 1800

    # Application Settings
    APP_ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:8000,http://localhost:3000,http://127.0.0.1:3000"

    # API Keys
    DEEPSEEK_API_KEY: str = "test_key"
    ELEVENLABS_API_KEY: str = "test_key"
    OPENAI_API_KEY: str = "test_key"

    # JWT Settings
    JWT_SECRET_KEY: str = "test_secret_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Backup Settings
    BACKUP_ENABLED: bool = True
    BACKUP_INTERVAL: int = 3600
    BACKUP_RETENTION_DAYS: int = 7
    BACKUP_PATH: str = "./backups"

    # Performance Monitoring
    ENABLE_PERFORMANCE_MONITORING: bool = True
    PERFORMANCE_MONITOR_INTERVAL: int = 300

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60

    # Cache Settings
    CACHE_DIR: str = "cache"
    MAX_CACHE_SIZE_MB: int = 500
    MAX_CACHE_AGE_DAYS: int = 7
    PERFORMANCE_LOG_DIR: str = "logs/performance"

    # Model Settings
    MODELS_DIR: str = "./models"
    VAD_THRESHOLD: float = 0.5
    VAD_SAMPLING_RATE: int = 16000
    VAD_WINDOW_SIZE: int = 512
    WHISPER_MODEL: str = "base"
    WHISPER_LANGUAGE: str = "en"

    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379"

    # Test Mode
    TEST_MODE: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

        @classmethod
        def customise_sources(
            cls,
            init_settings,
            env_settings,
            file_secret_settings,
        ):
            """Customize settings sources and their priority."""
            return (
                init_settings,
                env_settings,
                file_secret_settings,
            )

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    env = os.getenv("APP_ENV", "development")
    env_file = ".env.test.backend" if env == "test" else ".env"
    logger.debug(f"Loading settings from {env_file}")
    return Settings(_env_file=env_file)

