import os
import shutil
import pytest
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def test_env():
    """Setup test environment with temporary directories."""
    # Create temporary directories
    temp_dir = Path("./test_data")
    cache_dir = temp_dir / "cache"
    models_dir = temp_dir / "models"
    
    # Ensure directories exist
    cache_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)
    
    # Set environment variables for testing
    os.environ["CACHE_DIR"] = str(cache_dir)
    os.environ["MODELS_DIR"] = str(models_dir)
    
    yield {
        "temp_dir": temp_dir,
        "cache_dir": cache_dir,
        "models_dir": models_dir
    }
    
    # Cleanup after tests
    shutil.rmtree(temp_dir)

@pytest.fixture(scope="session")
def api_keys():
    """Verify and provide API keys for services."""
    keys = {
        "elevenlabs": os.getenv("ELEVENLABS_API_KEY"),
        "deepseek": os.getenv("DEEPSEEK_API_KEY")
    }
    
    # Skip API tests if keys aren't available
    if not all(keys.values()):
        pytest.skip("API keys not available")
        
    return keys

@pytest.fixture(scope="session")
def service_config():
    """Provide service configuration for tests."""
    return {
        "vad": {
            "threshold": float(os.getenv("VAD_THRESHOLD", "0.5")),
            "sampling_rate": int(os.getenv("VAD_SAMPLING_RATE", "16000")),
            "window_size": int(os.getenv("VAD_WINDOW_SIZE", "512"))
        },
        "whisper": {
            "model": os.getenv("WHISPER_MODEL", "base"),
            "language": os.getenv("WHISPER_LANGUAGE", "en")
        }
    } 