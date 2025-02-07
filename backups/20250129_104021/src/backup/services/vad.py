from typing import Dict, List, Optional, Any, Tuple
import torch
import numpy as np
import os
import wave
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

@dataclass
class VADResult:
    """Result of voice activity detection."""
    is_speech: bool
    confidence: float
    timestamp: datetime = datetime.utcnow()

@dataclass
class SpeechSegment:
    """Detected speech segment."""
    start_time: float
    end_time: float
    duration: float
    confidence: float
    audio_data: Optional[np.ndarray] = None

class VADService:
    """Service for voice activity detection using Silero VAD."""
    
    def __init__(
        self,
        threshold: float = 0.5,
        sampling_rate: int = 16000,
        window_size_samples: int = 512
    ):
        """Initialize the VAD service."""
        self.threshold = threshold
        self.sampling_rate = sampling_rate
        self.window_size_samples = window_size_samples
        self.model = None
        self.initialized = False
        self.executor = ThreadPoolExecutor(max_workers=1)
        
    async def initialize(self):
        """Initialize the VAD model."""
        if not self.initialized:
            try:
                # Load model in a separate thread to avoid blocking
                loop = asyncio.get_event_loop()
                self.model = await loop.run_in_executor(
                    self.executor,
                    self._load_model
                )
                self.initialized = True
            except Exception as e:
                print(f"Error initializing VAD model: {str(e)}")
                raise
                
    def _load_model(self):
        """Load the Silero VAD model."""
        model_path = Path(os.getenv("MODELS_DIR", "./models")) / "vad" / "silero_vad.jit"
        model_path.parent.mkdir(parents=True, exist_ok=True)
        
        if not model_path.exists():
            # Download model if not exists
            model = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=True
            )
            torch.jit.save(model, str(model_path))
        else:
            model = torch.jit.load(str(model_path))
            
        return model
        
    async def process_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000
    ) -> List[SpeechSegment]:
        """Process audio data and detect speech segments."""
        if not self.initialized:
            await self.initialize()
            
        try:
            # Ensure audio is in the correct format
            if sample_rate != self.sampling_rate:
                audio_data = self._resample_audio(audio_data, sample_rate, self.sampling_rate)
                
            # Convert to tensor
            audio_tensor = torch.from_numpy(audio_data).float()
            
            # Run detection in thread pool
            loop = asyncio.get_event_loop()
            segments = await loop.run_in_executor(
                self.executor,
                self._detect_speech,
                audio_tensor
            )
            
            return segments
            
        except Exception as e:
            print(f"Error processing audio: {str(e)}")
            raise
            
    def _detect_speech(self, audio_tensor: torch.Tensor) -> List[SpeechSegment]:
        """Detect speech segments in audio data."""
        window_size = self.window_size_samples
        segments = []
        current_segment = None
        
        for i in range(0, len(audio_tensor), window_size):
            chunk = audio_tensor[i:i + window_size]
            if len(chunk) < window_size:
                break
                
            # Get speech probability
            speech_prob = self.model(chunk, self.sampling_rate).item()
            
            # Convert window index to time
            time = i / self.sampling_rate
            
            if speech_prob >= self.threshold:
                if current_segment is None:
                    # Start new segment
                    current_segment = {
                        "start": time,
                        "confidence": speech_prob
                    }
            elif current_segment is not None:
                # End current segment
                segments.append(SpeechSegment(
                    start_time=current_segment["start"],
                    end_time=time,
                    duration=time - current_segment["start"],
                    confidence=current_segment["confidence"]
                ))
                current_segment = None
                
        # Handle last segment
        if current_segment is not None:
            time = len(audio_tensor) / self.sampling_rate
            segments.append(SpeechSegment(
                start_time=current_segment["start"],
                end_time=time,
                duration=time - current_segment["start"],
                confidence=current_segment["confidence"]
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
                        time = len(buffer) * self.window_size_samples / self.sampling_rate
                        await result_queue.put(VADResult(
                            is_speech=True,
                            confidence=current_segment["confidence"]
                        ))
                    await result_queue.put(None)
                    break
                    
                # Ensure correct sample rate
                if sample_rate != self.sampling_rate:
                    chunk = self._resample_audio(chunk, sample_rate, self.sampling_rate)
                    
                # Convert to tensor
                chunk_tensor = torch.from_numpy(chunk).float()
                
                # Get speech probability
                speech_prob = self.model(chunk_tensor, self.sampling_rate).item()
                
                if speech_prob >= self.threshold:
                    buffer.append(chunk)
                    if current_segment is None:
                        # Start new segment
                        current_segment = {
                            "confidence": speech_prob
                        }
                        await result_queue.put(VADResult(
                            is_speech=True,
                            confidence=speech_prob
                        ))
                elif current_segment is not None:
                    # End current segment
                    current_segment = None
                    buffer = []
                    await result_queue.put(VADResult(
                        is_speech=False,
                        confidence=1.0 - speech_prob
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
                self.executor,
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
            "threshold": self.threshold,
            "sampling_rate": self.sampling_rate,
            "window_size_samples": self.window_size_samples,
            "device": "cuda" if torch.cuda.is_available() else "cpu"
        }

# Create a singleton instance
vad_service = VADService(
    threshold=float(os.getenv("VAD_THRESHOLD", "0.5")),
    sampling_rate=int(os.getenv("VAD_SAMPLING_RATE", "16000")),
    window_size_samples=int(os.getenv("VAD_WINDOW_SIZE", "512"))
) 