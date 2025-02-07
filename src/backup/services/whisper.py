from typing import Dict, List, Optional, Any, Tuple
import torch
import whisper
import numpy as np
import os
import tempfile
import wave
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

@dataclass
class TranscriptionResult:
    """Result of speech transcription."""
    text: str
    language: str
    segments: List[Dict]
    start_time: float
    end_time: float
    confidence: float
    timestamp: datetime = datetime.utcnow()

@dataclass
class AudioSegment:
    """Audio segment for processing."""
    audio_data: np.ndarray
    sample_rate: int
    start_time: float = 0.0
    end_time: float = 0.0

class WhisperService:
    """Service for speech recognition using Whisper."""
    
    def __init__(self, model_name: str = "base"):
        """Initialize the Whisper service."""
        self.model_name = model_name
        self.model = None
        self.initialized = False
        self.executor = ThreadPoolExecutor(max_workers=1)
        
    async def initialize(self):
        """Initialize the Whisper model."""
        if not self.initialized:
            try:
                # Load model in a separate thread to avoid blocking
                loop = asyncio.get_event_loop()
                self.model = await loop.run_in_executor(
                    self.executor,
                    lambda: whisper.load_model(self.model_name)
                )
                self.initialized = True
            except Exception as e:
                print(f"Error initializing Whisper model: {str(e)}")
                raise
                
    async def transcribe_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000
    ) -> TranscriptionResult:
        """Transcribe audio data."""
        if not self.initialized:
            await self.initialize()
            
        try:
            # Ensure audio is in the correct format
            if sample_rate != 16000:
                audio_data = self._resample_audio(audio_data, sample_rate, 16000)
                
            # Run transcription in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._run_transcription,
                audio_data
            )
            
            return result
            
        except Exception as e:
            print(f"Error transcribing audio: {str(e)}")
            raise
            
    def _run_transcription(self, audio_data: np.ndarray) -> TranscriptionResult:
        """Run transcription using Whisper model."""
        result = self.model.transcribe(audio_data)
        
        # Calculate confidence score
        confidence = self._calculate_confidence(result["segments"])
        
        return TranscriptionResult(
            text=result["text"],
            language=result["language"],
            segments=result["segments"],
            start_time=result["segments"][0]["start"] if result["segments"] else 0.0,
            end_time=result["segments"][-1]["end"] if result["segments"] else 0.0,
            confidence=confidence
        )
        
    async def transcribe_stream(
        self,
        audio_queue: asyncio.Queue,
        chunk_duration: float = 30.0,
        sample_rate: int = 16000
    ) -> asyncio.Queue:
        """Process streaming audio data."""
        if not self.initialized:
            await self.initialize()
            
        result_queue = asyncio.Queue()
        buffer = []
        buffer_duration = 0.0
        
        try:
            while True:
                chunk = await audio_queue.get()
                if chunk is None:  # End of stream
                    if buffer:
                        # Process remaining buffer
                        audio_data = np.concatenate(buffer)
                        result = await self.transcribe_audio(audio_data, sample_rate)
                        await result_queue.put(result)
                    await result_queue.put(None)
                    break
                    
                buffer.append(chunk)
                chunk_samples = len(chunk)
                chunk_time = chunk_samples / sample_rate
                buffer_duration += chunk_time
                
                if buffer_duration >= chunk_duration:
                    # Process buffer
                    audio_data = np.concatenate(buffer)
                    result = await self.transcribe_audio(audio_data, sample_rate)
                    await result_queue.put(result)
                    
                    # Reset buffer
                    buffer = []
                    buffer_duration = 0.0
                    
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
        
    def _calculate_confidence(self, segments: List[Dict]) -> float:
        """Calculate overall confidence score from segment probabilities."""
        if not segments:
            return 0.0
            
        total_duration = sum(seg["end"] - seg["start"] for seg in segments)
        weighted_sum = sum(
            seg.get("confidence", 0.0) * (seg["end"] - seg["start"])
            for seg in segments
        )
        
        return weighted_sum / total_duration if total_duration > 0 else 0.0
        
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
            
    @staticmethod
    def get_available_models() -> List[str]:
        """Get list of available Whisper models."""
        return whisper.available_models()
        
    def get_model_info(self) -> Dict:
        """Get information about the current model."""
        return {
            "name": self.model_name,
            "initialized": self.initialized,
            "device": "cuda" if torch.cuda.is_available() else "cpu"
        }

# Create a singleton instance
whisper_service = WhisperService(model_name=os.getenv("WHISPER_MODEL", "base")) 