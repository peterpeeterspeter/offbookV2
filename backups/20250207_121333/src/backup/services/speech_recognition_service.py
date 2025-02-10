from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import numpy as np
import torch
import whisper
from datetime import datetime
import os
import tempfile
import wave
import asyncio
from concurrent.futures import ThreadPoolExecutor

@dataclass
class TranscriptionResult:
    """Result of speech transcription."""
    text: str
    language: str
    segments: List[Dict]
    start_time: float
    end_time: float
    confidence: float
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class AudioSegment:
    """Audio segment for processing."""
    audio_data: np.ndarray
    sample_rate: int
    start_time: float
    end_time: float

class SpeechRecognitionService:
    """Service for speech recognition using Whisper."""
    
    def __init__(
        self,
        model_name: str = "base",
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        compute_type: str = "float16" if torch.cuda.is_available() else "float32"
    ):
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.processing_lock = asyncio.Lock()
        self.last_result: Optional[TranscriptionResult] = None
    
    async def initialize(self) -> None:
        """Initialize the speech recognition service."""
        if self.model is None:
            # Load model in a separate thread to avoid blocking
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(
                self.executor,
                lambda: whisper.load_model(
                    self.model_name,
                    device=self.device
                )
            )
    
    async def transcribe_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: Optional[str] = None,
        task: str = "transcribe"
    ) -> TranscriptionResult:
        """Transcribe audio data to text."""
        if self.model is None:
            await self.initialize()
        
        async with self.processing_lock:
            # Prepare audio data
            if sample_rate != 16000:
                # Resample audio to 16kHz if needed
                audio_data = self._resample_audio(audio_data, sample_rate, 16000)
            
            # Convert to float32 and normalize
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32) / 32768.0
            
            # Prepare options
            options = {
                "task": task,
                "language": language,
                "temperature": 0,  # Use greedy decoding
                "compression_ratio_threshold": 2.4,
                "logprob_threshold": -1.0,
                "no_speech_threshold": 0.6
            }
            
            # Run transcription in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                lambda: self.model.transcribe(
                    audio_data,
                    **{k: v for k, v in options.items() if v is not None}
                )
            )
            
            # Calculate confidence score
            confidence = self._calculate_confidence(result)
            
            # Create transcription result
            transcription = TranscriptionResult(
                text=result["text"],
                language=result["language"],
                segments=result["segments"],
                start_time=result["segments"][0]["start"]
                if result["segments"]
                else 0,
                end_time=result["segments"][-1]["end"]
                if result["segments"]
                else 0,
                confidence=confidence
            )
            
            self.last_result = transcription
            return transcription
    
    async def transcribe_stream(
        self,
        audio_generator: asyncio.Queue,
        sample_rate: int = 16000,
        segment_duration: float = 30.0,
        language: Optional[str] = None
    ) -> asyncio.Queue:
        """Transcribe streaming audio data."""
        if self.model is None:
            await self.initialize()
        
        result_queue = asyncio.Queue()
        segment_samples = int(segment_duration * sample_rate)
        buffer = np.array([], dtype=np.float32)
        
        async def process_stream():
            nonlocal buffer
            
            while True:
                try:
                    # Get audio chunk from generator
                    chunk = await audio_generator.get()
                    if chunk is None:  # End of stream
                        break
                    
                    # Add to buffer
                    buffer = np.append(buffer, chunk)
                    
                    # Process complete segments
                    while len(buffer) >= segment_samples:
                        segment = buffer[:segment_samples]
                        buffer = buffer[segment_samples:]
                        
                        # Process segment
                        result = await self.transcribe_audio(
                            segment,
                            sample_rate,
                            language
                        )
                        await result_queue.put(result)
                
                except Exception as e:
                    await result_queue.put(e)
                    break
            
            # Process remaining audio
            if len(buffer) > 0:
                try:
                    result = await self.transcribe_audio(
                        buffer,
                        sample_rate,
                        language
                    )
                    await result_queue.put(result)
                except Exception as e:
                    await result_queue.put(e)
            
            # Signal end of stream
            await result_queue.put(None)
        
        # Start processing in background
        asyncio.create_task(process_stream())
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
        
        # Simple resampling using linear interpolation
        duration = len(audio_data) / orig_sr
        new_length = int(duration * target_sr)
        x_old = np.linspace(0, duration, len(audio_data))
        x_new = np.linspace(0, duration, new_length)
        return np.interp(x_new, x_old, audio_data)
    
    def _calculate_confidence(self, result: Dict) -> float:
        """Calculate overall confidence score from segment probabilities."""
        if not result["segments"]:
            return 0.0
        
        # Use average of segment-level confidence scores
        segment_scores = [
            segment.get("confidence", 0.0)
            for segment in result["segments"]
        ]
        return sum(segment_scores) / len(segment_scores)
    
    async def save_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        output_path: str
    ) -> None:
        """Save audio data to a WAV file."""
        # Ensure audio data is in the right format
        if audio_data.dtype != np.int16:
            audio_data = (audio_data * 32768).astype(np.int16)
        
        def write_wav():
            with wave.open(output_path, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.tobytes())
        
        # Write file in thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(self.executor, write_wav)
    
    async def load_audio(
        self,
        file_path: str
    ) -> Tuple[np.ndarray, int]:
        """Load audio data from a WAV file."""
        def read_wav():
            with wave.open(file_path, 'rb') as wav_file:
                sample_rate = wav_file.getframerate()
                n_frames = wav_file.getnframes()
                audio_data = np.frombuffer(
                    wav_file.readframes(n_frames),
                    dtype=np.int16
                )
            return audio_data, sample_rate
        
        # Read file in thread pool
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, read_wav)
    
    def get_available_models(self) -> List[str]:
        """Get list of available Whisper models."""
        return [
            "tiny", "base", "small", "medium", "large",
            "tiny.en", "base.en", "small.en", "medium.en"
        ]
    
    def get_model_info(self) -> Dict:
        """Get information about the current model."""
        return {
            "name": self.model_name,
            "device": self.device,
            "compute_type": self.compute_type,
            "is_initialized": self.model is not None
        }
    
    async def close(self) -> None:
        """Clean up resources."""
        self.executor.shutdown(wait=True)
        if self.model and hasattr(self.model, "cpu"):
            self.model.cpu()
        self.model = None

# Export singleton instance
speech_recognition_service = SpeechRecognitionService() 