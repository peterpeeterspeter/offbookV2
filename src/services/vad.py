from typing import Dict, List, Optional, Any, Tuple
import torch
import numpy as np
import os
import wave
from datetime import datetime, UTC
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
import webrtcvad

@dataclass
class VADResult:
    """Result of voice activity detection."""
    is_speech: bool
    confidence: float
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))

@dataclass
class SpeechSegment:
    """Detected speech segment."""
    start_time: float
    end_time: float
    duration: float
    confidence: float
    audio_data: Optional[np.ndarray] = None

class VADService:
    """Voice Activity Detection service."""

    def __init__(self, test_mode: bool = False):
        """Initialize the VAD service."""
        self.test_mode = test_mode
        self.initialized = False
        self.model = None
        self.sample_rate = 16000
        self.frame_duration = 30  # ms
        self.threshold = 0.5  # Speech detection threshold
        self.window_size_samples = 512  # Standard window size for audio processing
        self.temp_dir = Path("temp_audio")
        self._executor: Optional[ThreadPoolExecutor] = None

    async def __aenter__(self):
        """Async context manager entry.

        Ensures the service is properly initialized with all necessary resources.
        """
        if not self.initialized:
            await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit.

        Ensures proper cleanup of all resources, including the thread pool and temporary files.
        """
        await self.cleanup()

    async def initialize(self) -> None:
        """Initialize the VAD service and create necessary resources."""
        if not self.initialized:
            try:
                # Create temp directory
                self.temp_dir.mkdir(parents=True, exist_ok=True)

                # Initialize thread pool
                self._executor = ThreadPoolExecutor(max_workers=1)

                if self.test_mode:
                    # In test mode, don't load the actual model
                    self.initialized = True
                    return

                # Initialize the model
                loop = asyncio.get_event_loop()
                self.model = await loop.run_in_executor(
                    self._executor,
                    lambda: webrtcvad.Vad(3)  # Aggressiveness level 3
                )
                self.initialized = True
            except Exception as e:
                print(f"Error initializing VAD service: {str(e)}")
                await self.cleanup()
                raise RuntimeError(f"Failed to initialize VAD service: {str(e)}")

    async def cleanup(self) -> None:
        """Cleanup resources."""
        if self.initialized:
            try:
                # Clean up temp directory
                if self.temp_dir.exists():
                    for file in self.temp_dir.glob("*"):
                        try:
                            file.unlink()
                        except Exception as e:
                            print(f"Error deleting temp file {file}: {str(e)}")
                    try:
                        self.temp_dir.rmdir()
                    except Exception as e:
                        print(f"Error removing temp directory: {str(e)}")

                # Clean up thread pool
                if self._executor:
                    self._executor.shutdown(wait=True)
                    self._executor = None

                # Clear model
                self.model = None
                self.initialized = False
            except Exception as e:
                print(f"Error during cleanup: {str(e)}")
                raise

    async def ensure_initialized(self) -> None:
        """Ensure the service is initialized before use."""
        if not self.initialized:
            await self.initialize()

    async def process_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000
    ) -> Dict[str, Any]:
        """Process audio data and detect voice activity."""
        await self.ensure_initialized()

        try:
            if self.test_mode:
                # Return mock data in test mode
                return {
                    "speech_segments": [
                        {"start": 0.0, "end": 1.0, "is_speech": True}
                    ],
                    "silence_segments": [
                        {"start": 1.0, "end": 2.0, "is_speech": False}
                    ],
                    "total_duration": 2.0,
                    "speech_duration": 1.0,
                    "silence_duration": 1.0
                }

            # Process audio data
            if sample_rate != self.sample_rate:
                audio_data = self._resample_audio(audio_data, sample_rate, self.sample_rate)

            # Convert to tensor
            audio_tensor = torch.from_numpy(audio_data).float()

            # Run detection in thread pool
            loop = asyncio.get_event_loop()
            segments = await loop.run_in_executor(
                self._executor,
                self._detect_speech,
                audio_tensor
            )

            # Calculate silence segments
            silence_segments = self._get_silence_segments(segments, len(audio_data) / self.sample_rate)

            return {
                "speech_segments": segments,
                "silence_segments": silence_segments,
                "total_duration": len(audio_data) / self.sample_rate,
                "speech_duration": sum(segment.duration for segment in segments),
                "silence_duration": sum(segment["duration"] for segment in silence_segments)
            }

        except Exception as e:
            print(f"Error processing audio: {str(e)}")
            raise

    def _detect_speech(self, audio_tensor: torch.Tensor) -> List[SpeechSegment]:
        """Detect speech segments in audio data."""
        window_size = self.frame_duration * (self.sample_rate // 1000)
        segments = []
        current_segment = None

        for i in range(0, len(audio_tensor), window_size):
            chunk = audio_tensor[i:i + window_size]
            if len(chunk) < window_size:
                break

            # Get speech probability
            speech_prob = self.model.is_speech(chunk.numpy(), self.sample_rate)

            # Convert window index to time
            time = i / self.sample_rate

            if speech_prob:
                if current_segment is None:
                    # Start new segment
                    current_segment = {
                        "start": time,
                        "confidence": 1.0
                    }
            elif current_segment is not None:
                # End current segment
                segments.append(SpeechSegment(
                    start_time=current_segment["start"],
                    end_time=time,
                    duration=time - current_segment["start"],
                    confidence=1.0
                ))
                current_segment = None

        # Handle last segment
        if current_segment is not None:
            time = len(audio_tensor) / self.sample_rate
            segments.append(SpeechSegment(
                start_time=current_segment["start"],
                end_time=time,
                duration=time - current_segment["start"],
                confidence=1.0
            ))

        return segments

    async def process_stream(
        self,
        audio_queue: asyncio.Queue,
        sample_rate: int = 16000
    ) -> asyncio.Queue:
        """Process streaming audio data."""
        if not self.initialized:
            await self.initialize()

        result_queue = asyncio.Queue()
        buffer = []
        current_segment = None

        try:
            while True:
                chunk = await audio_queue.get()
                if chunk is None:  # End of stream
                    if current_segment is not None:
                        # End current segment
                        time = len(buffer) * self.frame_duration / 1000
                        await result_queue.put(VADResult(
                            is_speech=True,
                            confidence=1.0
                        ))
                    await result_queue.put(None)
                    break

                # Ensure correct sample rate
                if sample_rate != self.sample_rate:
                    chunk = self._resample_audio(chunk, sample_rate, self.sample_rate)

                # Convert to tensor
                chunk_tensor = torch.from_numpy(chunk).float()

                # Get speech probability
                speech_prob = self.model.is_speech(chunk_tensor.numpy(), self.sample_rate)

                if speech_prob:
                    buffer.append(chunk)
                    if current_segment is None:
                        # Start new segment
                        current_segment = {
                            "confidence": 1.0
                        }
                        await result_queue.put(VADResult(
                            is_speech=True,
                            confidence=1.0
                        ))
                elif current_segment is not None:
                    # End current segment
                    current_segment = None
                    buffer = []
                    await result_queue.put(VADResult(
                        is_speech=False,
                        confidence=0.0
                    ))

        except Exception as e:
            print(f"Error processing audio stream: {str(e)}")
            await result_queue.put(None)
            raise

        return result_queue

    def _resample_audio(
        self,
        audio_data: np.ndarray,
        orig_sr: int,
        target_sr: int
    ) -> np.ndarray:
        """Resample audio to target sample rate."""
        if orig_sr == target_sr:
            return audio_data

        duration = len(audio_data) / orig_sr
        target_length = int(duration * target_sr)
        return np.interp(
            np.linspace(0, duration, target_length),
            np.linspace(0, duration, len(audio_data)),
            audio_data
        )

    async def save_segments(
        self,
        segments: List[SpeechSegment],
        audio_data: np.ndarray,
        sample_rate: int,
        output_dir: str
    ) -> List[str]:
        """Save detected speech segments to WAV files."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        saved_files = []

        try:
            for i, segment in enumerate(segments):
                start_sample = int(segment.start_time * sample_rate)
                end_sample = int(segment.end_time * sample_rate)
                segment_audio = audio_data[start_sample:end_sample]

                file_path = output_dir / f"segment_{i:03d}.wav"
                await self.save_audio(segment_audio, sample_rate, str(file_path))
                saved_files.append(str(file_path))

            return saved_files

        except Exception as e:
            print(f"Error saving segments: {str(e)}")
            raise

    async def save_audio(self, audio_data: np.ndarray, sample_rate: int, file_path: str):
        """Save audio data to WAV file."""
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                self._save_audio_sync,
                audio_data,
                sample_rate,
                file_path
            )
        except Exception as e:
            print(f"Error saving audio file: {str(e)}")
            raise

    def _save_audio_sync(self, audio_data: np.ndarray, sample_rate: int, file_path: str):
        """Save audio data to WAV file synchronously."""
        with wave.open(file_path, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data.tobytes())

    def get_model_info(self) -> Dict:
        """Get information about the current model."""
        return {
            "initialized": self.initialized,
            "sample_rate": self.sample_rate,
            "frame_duration": self.frame_duration,
            "device": "cuda" if torch.cuda.is_available() else "cpu"
        }

    def _get_silence_segments(self, speech_segments: List[SpeechSegment], total_duration: float) -> List[Dict]:
        """Calculate silence segments from speech segments."""
        silence_segments = []
        last_end = 0.0

        for segment in speech_segments:
            if segment.start_time > last_end:
                silence_segments.append({
                    "start": last_end,
                    "end": segment.start_time,
                    "duration": segment.start_time - last_end,
                    "is_speech": False
                })
            last_end = segment.end_time

        # Add final silence segment if needed
        if last_end < total_duration:
            silence_segments.append({
                "start": last_end,
                "end": total_duration,
                "duration": total_duration - last_end,
                "is_speech": False
            })

        return silence_segments

# Create a singleton instance
vad_service = VADService(test_mode=bool(os.getenv("VAD_TEST_MODE", "False")))
