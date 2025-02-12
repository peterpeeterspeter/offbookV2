from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import torch
import numpy as np
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import os
import tempfile
import wave
from pathlib import Path

@dataclass
class VADResult:
    """Result of voice activity detection."""
    is_speech: bool
    confidence: float
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class SpeechSegment:
    """A segment of detected speech."""
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
        min_speech_duration_ms: int = 250,
        min_silence_duration_ms: int = 100,
        window_size_samples: int = 1536,
        device: str = "cuda" if torch.cuda.is_available() else "cpu"
    ):
        self.threshold = threshold
        self.min_speech_duration_ms = min_speech_duration_ms
        self.min_silence_duration_ms = min_silence_duration_ms
        self.window_size_samples = window_size_samples
        self.device = device
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.processing_lock = asyncio.Lock()
        self.model_path = os.path.join(
            tempfile.gettempdir(),
            "silero_vad.jit"
        )
    
    async def initialize(self) -> None:
        """Initialize the VAD service."""
        if self.model is None:
            # Download and load model in a separate thread
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(
                self.executor,
                self._load_model
            )
    
    def _load_model(self) -> torch.jit.ScriptModule:
        """Load the Silero VAD model."""
        if not os.path.exists(self.model_path):
            torch.hub.download_url_to_file(
                'https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.jit',
                self.model_path
            )
        
        model = torch.jit.load(self.model_path)
        model.eval()
        return model.to(self.device)
    
    async def process_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000
    ) -> List[SpeechSegment]:
        """Process audio data and detect speech segments."""
        if self.model is None:
            await self.initialize()
        
        async with self.processing_lock:
            # Ensure audio is mono and float32
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)
            
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            if np.abs(audio_data).max() > 1.0:
                audio_data = audio_data / 32768.0
            
            # Convert to tensor
            audio_tensor = torch.from_numpy(audio_data).to(self.device)
            
            # Process in thread pool
            loop = asyncio.get_event_loop()
            segments = await loop.run_in_executor(
                self.executor,
                self._detect_speech,
                audio_tensor,
                sample_rate
            )
            
            return segments
    
    def _detect_speech(
        self,
        audio_tensor: torch.Tensor,
        sample_rate: int
    ) -> List[SpeechSegment]:
        """Detect speech segments in audio tensor."""
        # Get model sampling rate
        model_sr = 16000
        
        # Resample if needed
        if sample_rate != model_sr:
            audio_tensor = torchaudio.transforms.Resample(
                sample_rate,
                model_sr
            )(audio_tensor)
        
        # Initialize variables for tracking speech segments
        speech_segments = []
        current_segment = None
        window_size = self.window_size_samples
        
        # Process audio in windows
        for i in range(0, len(audio_tensor), window_size):
            window = audio_tensor[i:i+window_size]
            if len(window) < window_size:
                # Pad last window if needed
                window = torch.nn.functional.pad(
                    window,
                    (0, window_size - len(window))
                )
            
            # Get speech probability
            with torch.no_grad():
                speech_prob = self.model(window, model_sr).item()
            
            time = i / model_sr
            
            if speech_prob >= self.threshold:
                if current_segment is None:
                    # Start new segment
                    current_segment = {
                        "start": time,
                        "probs": [speech_prob]
                    }
                else:
                    # Continue current segment
                    current_segment["probs"].append(speech_prob)
            else:
                if current_segment is not None:
                    # End current segment
                    end_time = time
                    duration = end_time - current_segment["start"]
                    
                    if duration * 1000 >= self.min_speech_duration_ms:
                        # Add segment if it meets minimum duration
                        confidence = sum(current_segment["probs"]) / len(
                            current_segment["probs"]
                        )
                        
                        segment = SpeechSegment(
                            start_time=current_segment["start"],
                            end_time=end_time,
                            duration=duration,
                            confidence=confidence
                        )
                        
                        speech_segments.append(segment)
                    
                    current_segment = None
        
        # Handle last segment
        if current_segment is not None:
            end_time = len(audio_tensor) / model_sr
            duration = end_time - current_segment["start"]
            
            if duration * 1000 >= self.min_speech_duration_ms:
                confidence = sum(current_segment["probs"]) / len(
                    current_segment["probs"]
                )
                
                segment = SpeechSegment(
                    start_time=current_segment["start"],
                    end_time=end_time,
                    duration=duration,
                    confidence=confidence
                )
                
                speech_segments.append(segment)
        
        return speech_segments
    
    async def process_stream(
        self,
        audio_generator: asyncio.Queue,
        sample_rate: int = 16000
    ) -> asyncio.Queue:
        """Process streaming audio data."""
        if self.model is None:
            await self.initialize()
        
        result_queue = asyncio.Queue()
        buffer = np.array([], dtype=np.float32)
        window_samples = self.window_size_samples
        
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
                    
                    # Process complete windows
                    while len(buffer) >= window_samples:
                        window = buffer[:window_samples]
                        buffer = buffer[window_samples:]
                        
                        # Process window
                        if window.dtype != np.float32:
                            window = window.astype(np.float32)
                        if np.abs(window).max() > 1.0:
                            window = window / 32768.0
                        
                        # Convert to tensor and get speech probability
                        window_tensor = torch.from_numpy(window).to(self.device)
                        
                        with torch.no_grad():
                            speech_prob = self.model(
                                window_tensor,
                                sample_rate
                            ).item()
                        
                        result = VADResult(
                            is_speech=speech_prob >= self.threshold,
                            confidence=speech_prob
                        )
                        
                        await result_queue.put(result)
                
                except Exception as e:
                    await result_queue.put(e)
                    break
            
            # Process remaining audio
            if len(buffer) > 0:
                try:
                    if buffer.dtype != np.float32:
                        buffer = buffer.astype(np.float32)
                    if np.abs(buffer).max() > 1.0:
                        buffer = buffer / 32768.0
                    
                    buffer_tensor = torch.from_numpy(buffer).to(self.device)
                    
                    with torch.no_grad():
                        speech_prob = self.model(
                            buffer_tensor,
                            sample_rate
                        ).item()
                    
                    result = VADResult(
                        is_speech=speech_prob >= self.threshold,
                        confidence=speech_prob
                    )
                    
                    await result_queue.put(result)
                except Exception as e:
                    await result_queue.put(e)
            
            # Signal end of stream
            await result_queue.put(None)
        
        # Start processing in background
        asyncio.create_task(process_stream())
        return result_queue
    
    async def save_segments(
        self,
        audio_data: np.ndarray,
        segments: List[SpeechSegment],
        sample_rate: int,
        output_dir: str
    ) -> List[str]:
        """Save speech segments to WAV files."""
        os.makedirs(output_dir, exist_ok=True)
        saved_files = []
        
        for i, segment in enumerate(segments):
            start_sample = int(segment.start_time * sample_rate)
            end_sample = int(segment.end_time * sample_rate)
            
            # Extract segment audio
            segment_audio = audio_data[start_sample:end_sample]
            
            # Save to file
            filename = f"segment_{i:03d}.wav"
            filepath = os.path.join(output_dir, filename)
            
            def write_wav():
                with wave.open(filepath, 'wb') as wav_file:
                    wav_file.setnchannels(1)  # Mono
                    wav_file.setsampwidth(2)  # 16-bit
                    wav_file.setframerate(sample_rate)
                    wav_file.writeframes(segment_audio.tobytes())
            
            # Write file in thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(self.executor, write_wav)
            
            saved_files.append(filepath)
        
        return saved_files
    
    def get_model_info(self) -> Dict:
        """Get information about the VAD model."""
        return {
            "is_initialized": self.model is not None,
            "device": self.device,
            "threshold": self.threshold,
            "min_speech_duration_ms": self.min_speech_duration_ms,
            "min_silence_duration_ms": self.min_silence_duration_ms,
            "window_size_samples": self.window_size_samples
        }
    
    async def close(self) -> None:
        """Clean up resources."""
        self.executor.shutdown(wait=True)
        if self.model:
            self.model.cpu()
            self.model = None

# Export singleton instance
vad_service = VADService() 