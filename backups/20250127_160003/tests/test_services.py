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

# Fixtures for services
@pytest.fixture(scope="module")
async def elevenlabs(api_keys, test_env):
    """Initialize ElevenLabs service for testing."""
    service = ElevenLabsService(api_key=api_keys["elevenlabs"])
    return service

@pytest.fixture(scope="module")
async def deepseek(api_keys, test_env):
    """Initialize DeepSeek service for testing."""
    service = DeepSeekService(api_key=api_keys["deepseek"])
    return service

@pytest.fixture(scope="module")
async def whisper(test_env, service_config):
    """Initialize Whisper service for testing."""
    service = WhisperService(model_name=service_config["whisper"]["model"])
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
    return service

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