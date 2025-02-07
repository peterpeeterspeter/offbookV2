import asyncio
import os
from dotenv import load_dotenv
import pytest
import numpy as np
from pathlib import Path

# Load environment variables
load_dotenv()

# Import services
from src.services.elevenlabs import ElevenLabsService
from src.services.deepseek import DeepSeekService
from src.services.whisper import WhisperService
from src.services.vad import VADService

@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    # Clean up
    if not loop.is_closed():
        loop.call_soon(loop.stop)
        loop.run_forever()
        loop.close()

# Fixtures for services
@pytest.fixture(scope="module")
async def elevenlabs(api_keys, test_env):
    """Initialize ElevenLabs service for testing."""
    service = ElevenLabsService(api_key=api_keys["elevenlabs"])
    yield service

@pytest.fixture(scope="module")
async def deepseek(api_keys, test_env):
    """Initialize DeepSeek service for testing."""
    service = DeepSeekService(api_key=api_keys["deepseek"])
    yield service

@pytest.fixture(scope="module")
async def whisper(test_env, service_config):
    """Initialize Whisper service for testing."""
    service = WhisperService()
    await service.initialize()
    return service

@pytest.fixture(scope="module")
async def vad(test_env, service_config):
    """Initialize VAD service for testing."""
    service = VADService(
        threshold=service_config["vad"]["threshold"],
        sampling_rate=service_config["vad"]["sampling_rate"],
        window_size_samples=service_config["vad"]["window_size"]
    )
    await service.initialize()
    yield service

# Test classes for each service
class TestElevenLabs:
    @pytest.mark.asyncio
    async def test_initialization(self, elevenlabs):
        """Test service initialization."""
        assert elevenlabs.api_key is not None
        assert elevenlabs.base_url == "https://api.elevenlabs.io/v1"
        assert elevenlabs.tts_cache_dir.exists()

    @pytest.mark.asyncio
    async def test_get_voices(self, elevenlabs):
        """Test retrieving available voices."""
        voices = await elevenlabs.get_voices()
        assert isinstance(voices, list)
        assert len(voices) > 0
        assert all(isinstance(voice, dict) for voice in voices)
        assert all("voice_id" in voice for voice in voices)

    @pytest.mark.asyncio
    async def test_generate_speech(self, elevenlabs):
        """Test speech generation."""
        text = "Hello, this is a test."
        voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default voice ID
        
        audio_data = await elevenlabs.generate_speech(text, voice_id)
        assert isinstance(audio_data, bytes)
        assert len(audio_data) > 0

class TestDeepSeek:
    @pytest.mark.asyncio
    async def test_initialization(self, deepseek):
        """Test service initialization."""
        assert deepseek.api_key is not None
        assert deepseek.base_url == "https://api.deepseek.com/v1"
        assert deepseek.analysis_cache_dir.exists()

    @pytest.mark.asyncio
    async def test_emotion_analysis(self, deepseek):
        """Test emotion analysis."""
        text = "I am feeling very happy today!"
        result = await deepseek.analyze_emotion(text)
        
        assert isinstance(result, dict)
        assert "emotion" in result
        assert "confidence" in result
        assert "all_emotions" in result
        assert isinstance(result["confidence"], float)
        assert 0 <= result["confidence"] <= 1

    @pytest.mark.asyncio
    async def test_character_analysis(self, deepseek):
        """Test character analysis."""
        lines = [
            "To be, or not to be, that is the question.",
            "Whether 'tis nobler in the mind to suffer"
        ]
        result = await deepseek.analyze_character(lines)
        
        assert isinstance(result, dict)
        assert "personality" in result
        assert "emotional_range" in result
        assert "common_phrases" in result
        assert "speech_patterns" in result

    @pytest.mark.asyncio
    async def test_script_analysis(self, deepseek):
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
        assert "roles" in result
        assert "scenes" in result
        assert "emotional_cues" in result
        assert "metadata" in result
        
    @pytest.mark.asyncio
    async def test_scene_dynamics(self, deepseek):
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
        assert "pacing" in result
        assert "character_dynamics" in result
        assert "emotional_progression" in result
        assert "suggested_timing" in result

class TestWhisper:
    @pytest.mark.asyncio
    async def test_initialization(self, whisper):
        """Test service initialization."""
        assert whisper.initialized
        assert whisper.model is not None
        
        model_info = whisper.get_model_info()
        assert isinstance(model_info, dict)
        assert model_info["initialized"]

    @pytest.mark.asyncio
    async def test_transcribe_audio(self, whisper):
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
    async def test_hesitation_detection(self, whisper):
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
    async def test_performance_analysis(self, whisper):
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
        assert "performance_metrics" in result
        assert "suggestions" in result

class TestVAD:
    @pytest.mark.asyncio
    async def test_initialization(self, vad):
        """Test service initialization."""
        assert vad.initialized
        assert vad.model is not None
        
        model_info = vad.get_model_info()
        assert isinstance(model_info, dict)
        assert model_info["initialized"]

    @pytest.mark.asyncio
    async def test_process_audio(self, vad):
        """Test audio processing."""
        # Create a simple sine wave for testing
        duration = 3  # seconds
        sample_rate = 16000
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio_data = np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave
        
        segments = await vad.process_audio(audio_data, sample_rate)
        assert isinstance(segments, list)
        
        if segments:  # There might not be speech in our test signal
            segment = segments[0]
            assert isinstance(segment.start_time, float)
            assert isinstance(segment.end_time, float)
            assert isinstance(segment.confidence, float)
            assert segment.end_time > segment.start_time

if __name__ == "__main__":
    asyncio.run(test_elevenlabs_service())
    asyncio.run(test_deepseek_service())
    asyncio.run(test_whisper_service())
    asyncio.run(test_vad_service()) 