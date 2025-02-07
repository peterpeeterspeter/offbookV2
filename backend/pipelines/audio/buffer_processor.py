from typing import List, Optional
from dataclasses import dataclass, field
import numpy as np
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import (
    Frame,
    AudioRawFrame,
    OutputAudioRawFrame
)

@dataclass
class AudioBuffer:
    """Audio buffer for caching and processing audio frames"""
    sample_rate: int
    num_channels: int
    max_size_bytes: int = 1024 * 1024  # 1MB default
    buffer: List[bytes] = field(default_factory=list)
    current_size: int = 0

    def add_frame(self, audio_data: bytes) -> bool:
        """Add audio frame to buffer, returns True if buffer is full"""
        if self.current_size + len(audio_data) > self.max_size_bytes:
            return True
        
        self.buffer.append(audio_data)
        self.current_size += len(audio_data)
        return False

    def clear(self):
        """Clear the buffer"""
        self.buffer = []
        self.current_size = 0

    def get_concatenated_audio(self) -> bytes:
        """Get concatenated audio data"""
        return b"".join(self.buffer)

class AudioBufferProcessor(FrameProcessor):
    def __init__(
        self,
        sample_rate: int = 16000,
        num_channels: int = 1,
        max_buffer_size_mb: int = 1,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.buffer = AudioBuffer(
            sample_rate=sample_rate,
            num_channels=num_channels,
            max_size_bytes=max_buffer_size_mb * 1024 * 1024
        )
        self.cache = {}  # Simple cache for frequently used audio

    def _process_audio(self, audio_data: bytes) -> bytes:
        """Process audio data - implement custom processing here"""
        # Convert to numpy array for processing
        audio_np = np.frombuffer(audio_data, dtype=np.int16)
        
        # Add your custom processing here
        # For example: normalization, filtering, etc.
        
        # Convert back to bytes
        return audio_np.tobytes()

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, AudioRawFrame):
            # Process audio
            processed_audio = self._process_audio(frame.audio)
            
            # Check cache
            cache_key = hash(processed_audio)
            if cache_key in self.cache:
                processed_audio = self.cache[cache_key]
            else:
                self.cache[cache_key] = processed_audio

            # Add to buffer
            buffer_full = self.buffer.add_frame(processed_audio)
            
            if buffer_full:
                # Create new frame with concatenated audio
                concatenated_audio = self.buffer.get_concatenated_audio()
                new_frame = OutputAudioRawFrame(
                    audio=concatenated_audio,
                    sample_rate=self.buffer.sample_rate,
                    num_channels=self.buffer.num_channels
                )
                await self.push_frame(new_frame, direction)
                self.buffer.clear()
            
        await self.push_frame(frame, direction)

    def _clean_cache(self, max_items: int = 1000):
        """Clean cache if it gets too large"""
        if len(self.cache) > max_items:
            # Remove oldest items
            items = list(self.cache.items())
            self.cache = dict(items[-max_items:]) 