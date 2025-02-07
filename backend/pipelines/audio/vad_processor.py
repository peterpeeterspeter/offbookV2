from typing import Optional
import torch
import numpy as np
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import (
    Frame,
    AudioRawFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame
)

class SileroVADProcessor(FrameProcessor):
    def __init__(
        self,
        sample_rate: int = 16000,
        threshold: float = 0.5,
        min_speech_duration_ms: int = 250,
        min_silence_duration_ms: int = 100,
        window_size_samples: int = 512,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.model = None
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.min_speech_duration_ms = min_speech_duration_ms
        self.min_silence_duration_ms = min_silence_duration_ms
        self.window_size_samples = window_size_samples
        self.speaking = False
        self.audio_buffer = []
        self._initialize_model()

    def _initialize_model(self):
        """Initialize the Silero VAD model"""
        self.model, _ = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            force_reload=False
        )
        self.model.eval()

    def _process_audio(self, audio_data: bytes) -> bool:
        """Process audio data and return whether speech is detected"""
        # Convert bytes to float32 numpy array
        audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        
        # Convert to torch tensor
        audio_tensor = torch.from_numpy(audio_np)
        
        # Get speech probabilities
        speech_probs = self.model(audio_tensor, self.sample_rate)
        
        # Return True if speech probability exceeds threshold
        return speech_probs.mean().item() > self.threshold

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, AudioRawFrame):
            is_speech = self._process_audio(frame.audio)
            
            if is_speech and not self.speaking:
                self.speaking = True
                await self.push_frame(UserStartedSpeakingFrame(), direction)
            elif not is_speech and self.speaking:
                self.speaking = False
                await self.push_frame(UserStoppedSpeakingFrame(), direction)

        await self.push_frame(frame, direction) 