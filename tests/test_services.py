import asyncio
import os
from dotenv import load_dotenv
import pytest
import numpy as np
from pathlib import Path

# Import services
from src.services.elevenlabs import ElevenLabsService
from src.services.deepseek import DeepSeekService
from src.services.whisper import WhisperService
from src.services.vad import VADService

# Load environment variables
load_dotenv()

@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    # Clean up
    if not loop.is_closed():
        loop.call_soon(loop.stop)
        loop.run_forever()
        loop.close()

@pytest.fixture(scope="session")
def test_env():
    """Setup test environment with temporary directories."""
    temp_dir = Path("test_temp")
    temp_dir.mkdir(exist_ok=True)

    # Create necessary subdirectories
    cache_dir = temp_dir / "cache"
    models_dir = temp_dir / "models"
    cache_dir.mkdir(exist_ok=True)
    models_dir.mkdir(exist_ok=True)

    # Set environment variables
    os.environ["CACHE_DIR"] = str(cache_dir)
    os.environ["MODELS_DIR"] = str(models_dir)

    yield temp_dir

    # Cleanup
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture
async def elevenlabs(api_keys) -> ElevenLabsService:
    """Create an ElevenLabs service instance for testing."""
    service = ElevenLabsService(api_key=api_keys["elevenlabs"])
    await service.initialize()
    async with service as svc:
        yield svc

@pytest.fixture
async def deepseek(api_keys) -> DeepSeekService:
    """Create a DeepSeek service instance for testing."""
    service = DeepSeekService(api_key="test_key", is_test=True)
    await service.initialize()
    async with service as svc:
        yield svc

@pytest.fixture
async def whisper(service_config) -> WhisperService:
    """Create a Whisper service instance for testing."""
    service = WhisperService(test_mode=service_config["test_mode"])
    await service.initialize()
    async with service as svc:
        yield svc

@pytest.fixture
async def vad(service_config) -> VADService:
    """Create a VAD service instance for testing."""
    service = VADService(test_mode=service_config["test_mode"])
    await service.initialize()
    async with service as svc:
        yield svc

# Test classes for each service
class TestElevenLabs:
    """Test suite for ElevenLabs service."""

    @pytest.mark.asyncio
    async def test_initialization(self, elevenlabs: ElevenLabsService):
        """Test service initialization."""
        assert elevenlabs.api_key is not None
        assert elevenlabs.base_url == "https://api.elevenlabs.io/v1"
        assert elevenlabs.tts_cache_dir.exists()

    @pytest.mark.asyncio
    async def test_get_voices(self, elevenlabs: ElevenLabsService):
        """Test retrieving available voices."""
        voices = await elevenlabs.get_voices()
        assert isinstance(voices, list)
        assert len(voices) > 0
        assert all(isinstance(voice, dict) for voice in voices)
        assert all("voice_id" in voice for voice in voices)

    @pytest.mark.asyncio
    async def test_generate_speech(self, elevenlabs: ElevenLabsService):
        """Test speech generation."""
        text = "Hello, this is a test."
        voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default voice ID

        audio_data = await elevenlabs.generate_speech(text, voice_id)
        assert isinstance(audio_data, bytes)
        assert len(audio_data) > 0

class TestDeepSeek:
    """Test suite for DeepSeek service."""

    @pytest.mark.asyncio
    async def test_initialization(self, deepseek: DeepSeekService):
        """Test service initialization."""
        assert deepseek.api_key is not None
        assert deepseek.base_url == "https://api.deepseek.com/v1"
        assert deepseek.analysis_cache_dir.exists()

    @pytest.mark.asyncio
    async def test_emotion_analysis(self, deepseek: DeepSeekService):
        """Test emotion analysis."""
        text = "I am feeling very happy today!"
        result = await deepseek.analyze_emotions(text)
        assert "emotions" in result
        assert "confidence" in result
        assert "explanation" in result

    @pytest.mark.asyncio
    async def test_character_analysis(self, deepseek: DeepSeekService):
        """Test character analysis."""
        lines = [
            "To be, or not to be, that is the question.",
            "Whether 'tis nobler in the mind to suffer"
        ]
        result = await deepseek.analyze_character(lines)

        assert isinstance(result, dict)
        assert "traits" in result
        assert "confidence" in result
        assert "explanation" in result

    @pytest.mark.asyncio
    async def test_script_analysis(self, deepseek: DeepSeekService):
        """Test script analysis."""
        script = """
        Scene 1: Interior - Living Room - Day

        JOHN
        (angry)
        I can't believe you did this!

        MARY
        (defensive)
        What choice did I have?
        """

        result = await deepseek.analyze_script(script)
        assert isinstance(result, dict)
        assert "themes" in result
        assert "tone" in result
        assert "pacing" in result
        assert "analysis" in result

    @pytest.mark.asyncio
    async def test_scene_dynamics(self, deepseek: DeepSeekService):
        """Test scene dynamics analysis."""
        scene = """
        JOHN
        We need to talk about what happened.

        MARY
        (pause)
        I'm not sure I'm ready for that conversation.

        JOHN
        (stepping closer)
        We can't keep avoiding it forever.
        """

        result = await deepseek.analyze_scene_dynamics(scene)
        assert isinstance(result, dict)
        assert "power_dynamics" in result
        assert "emotional_progression" in result
        assert "subtext" in result

class TestWhisper:
    """Test suite for Whisper service."""

    @pytest.mark.asyncio
    async def test_initialization(self, whisper: WhisperService):
        """Test service initialization."""
        assert whisper.initialized
        assert whisper.model is not None

        model_info = whisper.get_model_info()
        assert isinstance(model_info, dict)
        assert model_info["initialized"]

    @pytest.mark.asyncio
    async def test_transcribe_audio(self, whisper: WhisperService):
        """Test audio transcription."""
        # Create a simple sine wave for testing
        duration = 3  # seconds
        sample_rate = 16000
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio_data = np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave

        result = await whisper.transcribe_audio(audio_data, sample_rate)
        assert result.text is not None
        assert isinstance(result.confidence, float)
        assert 0 <= result.confidence <= 1

    @pytest.mark.asyncio
    async def test_hesitation_detection(self, whisper: WhisperService):
        """Test hesitation detection in speech."""
        # Create a simple audio with a pause
        duration = 3  # seconds
        sample_rate = 16000
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio_data = np.zeros_like(t)
        # Add speech in first and last second
        audio_data[:sample_rate] = np.sin(2 * np.pi * 440 * t[:sample_rate])
        audio_data[-sample_rate:] = np.sin(2 * np.pi * 440 * t[-sample_rate:])

        result = await whisper.detect_hesitation(audio_data)
        assert isinstance(result, dict)
        assert "hesitations" in result
        assert "statistics" in result
        assert "performance_impact" in result

    @pytest.mark.asyncio
    async def test_performance_analysis(self, whisper: WhisperService):
        """Test performance analysis."""
        # Create a simple audio sample
        duration = 2  # seconds
        sample_rate = 16000
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio_data = np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave

        expected_text = "Hello world"
        result = await whisper.analyze_performance(audio_data, expected_text)

        assert isinstance(result, dict)
        assert "accuracy" in result
        assert "timing" in result
        assert "suggestions" in result

class TestVAD:
    """Test suite for VAD service."""

    @pytest.mark.asyncio
    async def test_initialization(self, vad: VADService):
        """Test VAD service initialization."""
        assert vad.threshold == 0.5
        assert vad.window_size_samples == 512

    @pytest.mark.asyncio
    async def test_process_audio(self, vad: VADService):
        """Test audio processing."""
        # Create a mock audio file with sufficient length
        duration = 5  # seconds
        sample_rate = 16000
        window_size = 512  # Match the VAD service window size

        # Calculate number of samples needed
        num_samples = int(sample_rate * duration)
        # Ensure number of samples is a multiple of window_size
        num_samples = (num_samples // window_size) * window_size

        t = np.linspace(0, duration, num_samples)
        # Create a more complex audio signal with multiple frequencies
        audio_data = np.sin(2 * np.pi * 440 * t) + 0.5 * np.sin(2 * np.pi * 880 * t)
        audio_data = audio_data.astype(np.float32)  # Convert to float32

        # Initialize VAD service with matching parameters
        vad.window_size_samples = window_size

        # Process audio
        result = await vad.process_audio(audio_data, sample_rate)
        assert isinstance(result, dict)
        assert "speech_segments" in result
        assert "silence_segments" in result
        assert "total_duration" in result

if __name__ == "__main__":
    asyncio.run(test_elevenlabs_service())
    asyncio.run(test_deepseek_service())
    asyncio.run(test_whisper_service())
    asyncio.run(test_vad_service())
