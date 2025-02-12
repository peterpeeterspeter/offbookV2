import pytest
import numpy as np
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path
import tempfile
import json

from ..whisper import WhisperService, TranscriptionResult

# Mock Whisper model responses
MOCK_TRANSCRIPTION = {
    "text": "Hello world",
    "segments": [
        {
            "id": 0,
            "start": 0.0,
            "end": 2.0,
            "text": "Hello world",
            "tokens": [1, 2, 3],
            "temperature": 0.0,
            "avg_logprob": -0.5,
            "compression_ratio": 1.2,
            "no_speech_prob": 0.1,
        }
    ],
    "language": "en",
}


class MockWhisperModel:
    def transcribe(self, audio, **kwargs):
        return MOCK_TRANSCRIPTION


@pytest.fixture
def mock_whisper():
    with patch("whisper.load_model") as mock_load:
        mock_model = MockWhisperModel()
        mock_load.return_value = mock_model
        yield mock_load


@pytest.fixture
def whisper_service():
    service = WhisperService(test_mode=True)
    return service


@pytest.fixture
def audio_data():
    # Create 1 second of audio data at 16kHz
    duration = 1.0
    sample_rate = 16000
    t = np.linspace(0, duration, int(sample_rate * duration))
    # Generate a 440Hz sine wave
    audio = np.sin(2 * np.pi * 440 * t)
    return audio.astype(np.float32)


@pytest.mark.asyncio
class TestWhisperService:
    async def test_initialization(self, whisper_service, mock_whisper):
        """Test service initialization"""
        assert not whisper_service.initialized
        await whisper_service.initialize()
        assert whisper_service.initialized
        mock_whisper.assert_called_once_with("base")

    async def test_initialization_error(self, whisper_service):
        """Test handling of initialization errors"""
        with patch("whisper.load_model", side_effect=Exception("Model load failed")):
            with pytest.raises(RuntimeError) as exc_info:
                await whisper_service.initialize()
            assert "Failed to initialize Whisper service" in str(exc_info.value)
            assert not whisper_service.initialized

    async def test_transcribe_audio(self, whisper_service, audio_data, mock_whisper):
        """Test audio transcription"""
        await whisper_service.initialize()
        result = await whisper_service.transcribe_audio(audio_data)

        assert isinstance(result, TranscriptionResult)
        assert result.text == "Hello world"
        assert result.confidence > 0
        assert result.language == "en"
        assert len(result.segments) > 0

    async def test_transcribe_stream(self, whisper_service, audio_data):
        """Test streaming transcription"""
        await whisper_service.initialize()

        # Create audio queue and add chunks
        audio_queue = asyncio.Queue()
        chunk_size = 1600  # 100ms at 16kHz
        chunks = [
            audio_data[i : i + chunk_size]
            for i in range(0, len(audio_data), chunk_size)
        ]
        for chunk in chunks:
            await audio_queue.put(chunk)
        await audio_queue.put(None)  # Signal end of stream

        # Get result queue
        result_queue = await whisper_service.transcribe_stream(
            audio_queue, chunk_duration=0.1, sample_rate=16000
        )

        # Collect results
        results = []
        while True:
            result = await result_queue.get()
            if result is None:
                break
            results.append(result)

        assert len(results) > 0
        assert all(isinstance(r, TranscriptionResult) for r in results)

    async def test_invalid_audio_format(self, whisper_service):
        """Test handling of invalid audio format"""
        await whisper_service.initialize()

        # Test with invalid sample rate
        invalid_audio = np.random.rand(16000).astype(np.float32)
        with pytest.raises(ValueError) as exc_info:
            await whisper_service.transcribe_audio(invalid_audio, sample_rate=8000)
        assert "Unsupported sample rate" in str(exc_info.value)

        # Test with invalid audio data type
        with pytest.raises(ValueError) as exc_info:
            await whisper_service.transcribe_audio([1, 2, 3])
        assert "Invalid audio data type" in str(exc_info.value)

    async def test_concurrent_transcriptions(self, whisper_service, audio_data):
        """Test handling of concurrent transcription requests"""
        await whisper_service.initialize()

        # Create multiple transcription tasks
        tasks = [whisper_service.transcribe_audio(audio_data) for _ in range(5)]

        # Run concurrently
        results = await asyncio.gather(*tasks)

        assert len(results) == 5
        assert all(isinstance(r, TranscriptionResult) for r in results)

    async def test_cleanup(self, whisper_service, mock_whisper):
        """Test resource cleanup"""
        await whisper_service.initialize()
        await whisper_service.cleanup()

        assert whisper_service.model is None
        assert not whisper_service.initialized
        assert whisper_service._executor is None

    async def test_memory_management(self, whisper_service, audio_data):
        """Test memory management during transcription"""
        await whisper_service.initialize()

        # Process multiple large audio chunks
        for _ in range(10):
            large_audio = np.tile(audio_data, 10)  # 10 seconds of audio
            result = await whisper_service.transcribe_audio(large_audio)
            assert isinstance(result, TranscriptionResult)

        # Verify temp directory is cleaned up
        temp_files = list(whisper_service.temp_dir.glob("*.wav"))
        assert len(temp_files) == 0

    @pytest.mark.parametrize("model_name", ["tiny", "base", "small"])
    async def test_model_loading(self, model_name):
        """Test loading different model sizes"""
        service = WhisperService(test_mode=True)

        with patch("whisper.load_model") as mock_load:
            mock_model = MockWhisperModel()
            mock_load.return_value = mock_model

            await service.initialize(model_name=model_name)
            mock_load.assert_called_once_with(model_name)
            assert service.initialized

    async def test_error_handling(self, whisper_service, audio_data):
        """Test error handling during transcription"""
        await whisper_service.initialize()

        # Test transcription error
        with patch.object(
            whisper_service.model,
            "transcribe",
            side_effect=Exception("Transcription failed"),
        ):
            with pytest.raises(RuntimeError) as exc_info:
                await whisper_service.transcribe_audio(audio_data)
            assert "Transcription failed" in str(exc_info.value)

        # Test file handling error
        with patch("numpy.save", side_effect=IOError("File write failed")):
            with pytest.raises(RuntimeError) as exc_info:
                await whisper_service.transcribe_audio(audio_data)
            assert "Failed to process audio data" in str(exc_info.value)

    async def test_performance_metrics(self, whisper_service, audio_data):
        """Test performance metrics collection"""
        await whisper_service.initialize()

        start_time = asyncio.get_event_loop().time()
        result = await whisper_service.transcribe_audio(audio_data)
        end_time = asyncio.get_event_loop().time()

        assert hasattr(result, "processing_time")
        assert result.processing_time == pytest.approx(end_time - start_time, rel=0.1)
        assert hasattr(result, "model_latency")
        assert result.model_latency > 0

    async def test_batch_processing(self, whisper_service):
        """Test batch processing of audio files"""
        await whisper_service.initialize()

        # Create temporary audio files
        temp_dir = Path(tempfile.mkdtemp())
        audio_files = []

        try:
            for i in range(3):
                audio_path = temp_dir / f"test_{i}.wav"
                np.save(str(audio_path), np.random.rand(16000))
                audio_files.append(audio_path)

            results = await whisper_service.batch_process_files(audio_files)

            assert len(results) == 3
            assert all(isinstance(r, TranscriptionResult) for r in results)

        finally:
            # Cleanup
            for file in audio_files:
                file.unlink(missing_ok=True)
            temp_dir.rmdir()

    async def test_language_detection(self, whisper_service, audio_data):
        """Test language detection in transcription"""
        await whisper_service.initialize()

        # Mock different language detections
        languages = ["en", "es", "fr"]
        for lang in languages:
            with patch.object(
                whisper_service.model,
                "transcribe",
                return_value={**MOCK_TRANSCRIPTION, "language": lang},
            ):
                result = await whisper_service.transcribe_audio(audio_data)
                assert result.language == lang

    async def test_streaming_error_handling(self, whisper_service):
        """Test error handling in streaming mode"""
        await whisper_service.initialize()

        audio_queue = asyncio.Queue()
        await audio_queue.put(np.random.rand(1600))  # Valid chunk
        await audio_queue.put("invalid")  # Invalid chunk
        await audio_queue.put(None)  # End marker

        result_queue = await whisper_service.transcribe_stream(
            audio_queue, chunk_duration=0.1, sample_rate=16000
        )

        # Should get error in results
        results = []
        while True:
            try:
                result = await result_queue.get()
                if result is None:
                    break
                results.append(result)
            except Exception as e:
                assert "Invalid audio data" in str(e)
                break
