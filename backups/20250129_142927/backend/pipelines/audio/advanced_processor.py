from typing import Optional
import numpy as np
from scipy import signal
from dataclasses import dataclass
import logging
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import Frame, AudioRawFrame, OutputAudioRawFrame
from .error_frames import AudioProcessingErrorFrame, AudioQualityMetricFrame, AudioProcessingStateFrame

logger = logging.getLogger(__name__)

@dataclass
class AudioProcessingConfig:
    """Configuration for advanced audio processing"""
    # Noise reduction
    noise_reduction_strength: float = 0.5
    noise_threshold: float = 0.1
    
    # Normalization
    target_rms: float = 0.1
    
    # Filtering
    low_cut_freq: float = 80.0  # Hz
    high_cut_freq: float = 7500.0  # Hz
    filter_order: int = 4
    
    # Compression
    threshold_db: float = -20.0
    ratio: float = 4.0
    attack_ms: float = 5.0
    release_ms: float = 50.0
    
    # Quality monitoring
    enable_metrics: bool = True
    metric_window_size: int = 100  # Number of frames to calculate metrics over

class AdvancedAudioProcessor(FrameProcessor):
    def __init__(
        self,
        sample_rate: int = 16000,
        num_channels: int = 1,
        config: Optional[AudioProcessingConfig] = None,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.sample_rate = sample_rate
        self.num_channels = num_channels
        self.config = config or AudioProcessingConfig()
        self._metrics_buffer = []
        self._initialize_sync()
        
    def _initialize_sync(self):
        """Synchronous initialization of basic components"""
        self._initialize_filters()
        self._noise_profile = None
        self._rms_history = []

    async def _initialize_async(self):
        """Asynchronous initialization with state management"""
        try:
            await self.push_frame(AudioProcessingStateFrame(
                state='ready',
                processor_name=self.__class__.__name__
            ))
        except Exception as e:
            logger.error(f"Failed to initialize audio processor: {str(e)}")
            await self.push_frame(AudioProcessingErrorFrame(
                error_type='initialization_error',
                error_message=str(e),
                processor_name=self.__class__.__name__,
                recoverable=False
            ))
            raise

    def _initialize_filters(self):
        """Initialize bandpass filter coefficients"""
        nyquist = self.sample_rate / 2
        low = self.config.low_cut_freq / nyquist
        high = self.config.high_cut_freq / nyquist
        self.b, self.a = signal.butter(
            self.config.filter_order, 
            [low, high], 
            btype='band'
        )

    def _apply_noise_reduction(self, audio: np.ndarray) -> np.ndarray:
        """Apply spectral noise reduction"""
        # Estimate noise profile if not available
        if self._noise_profile is None:
            self._noise_profile = np.mean(np.abs(audio[:min(len(audio), 2048)]))
        
        # Apply spectral subtraction
        stft = np.abs(signal.stft(audio)[2])
        noise_mask = (stft > self._noise_profile * self.config.noise_threshold).astype(float)
        noise_mask = noise_mask * self.config.noise_reduction_strength
        return signal.istft(stft * noise_mask)[1]

    def _apply_normalization(self, audio: np.ndarray) -> np.ndarray:
        """Apply RMS normalization with smoothing"""
        current_rms = np.sqrt(np.mean(audio**2))
        self._rms_history.append(current_rms)
        if len(self._rms_history) > 10:
            self._rms_history.pop(0)
        
        # Use smoothed RMS for more stable normalization
        smooth_rms = np.mean(self._rms_history)
        if smooth_rms > 0:
            gain = self.config.target_rms / smooth_rms
            return audio * gain
        return audio

    def _apply_compression(self, audio: np.ndarray) -> np.ndarray:
        """Apply dynamic range compression"""
        # Convert to dB
        db = 20 * np.log10(np.abs(audio) + 1e-10)
        
        # Calculate gain reduction
        threshold_db = self.config.threshold_db
        ratio = self.config.ratio
        gain_reduction = np.minimum(0, (threshold_db - db) * (1 - 1/ratio))
        
        # Apply attack/release envelope
        attack_samples = int(self.sample_rate * self.config.attack_ms / 1000)
        release_samples = int(self.sample_rate * self.config.release_ms / 1000)
        
        # Smooth gain reduction
        gain_envelope = np.zeros_like(gain_reduction)
        for i in range(1, len(gain_reduction)):
            if gain_reduction[i] < gain_envelope[i-1]:
                # Attack
                gain_envelope[i] = gain_envelope[i-1] + (gain_reduction[i] - gain_envelope[i-1]) / attack_samples
            else:
                # Release
                gain_envelope[i] = gain_envelope[i-1] + (gain_reduction[i] - gain_envelope[i-1]) / release_samples
        
        # Apply gain
        return audio * np.power(10, gain_envelope / 20)

    def _calculate_metrics(self, audio: np.ndarray) -> dict:
        """Calculate audio quality metrics"""
        metrics = {
            'rms_level': float(np.sqrt(np.mean(audio**2))),
            'peak_level': float(np.max(np.abs(audio))),
            'crest_factor': float(np.max(np.abs(audio)) / (np.sqrt(np.mean(audio**2)) + 1e-10)),
            'zero_crossings': int(np.sum(np.diff(np.signbit(audio)))),
            'dc_offset': float(np.mean(audio))
        }
        
        # Add to metrics buffer for trend analysis
        self._metrics_buffer.append(metrics)
        if len(self._metrics_buffer) > self.config.metric_window_size:
            self._metrics_buffer.pop(0)
        
        # Calculate trends
        if len(self._metrics_buffer) > 1:
            prev_metrics = self._metrics_buffer[-2]
            metrics['level_change'] = metrics['rms_level'] - prev_metrics['rms_level']
            metrics['peak_change'] = metrics['peak_level'] - prev_metrics['peak_level']
        
        return metrics

    async def _handle_quality_issues(self, metrics: dict):
        """Handle audio quality issues"""
        issues = []
        
        # Check for clipping
        if metrics['peak_level'] > 0.99:
            issues.append('clipping_detected')
            
        # Check for low levels
        if metrics['rms_level'] < 0.01:
            issues.append('low_level_detected')
            
        # Check for DC offset
        if abs(metrics['dc_offset']) > 0.01:
            issues.append('dc_offset_detected')
            
        # Check for sudden level changes
        if 'level_change' in metrics and abs(metrics['level_change']) > 0.3:
            issues.append('sudden_level_change')
        
        if issues:
            await self.push_frame(AudioQualityMetricFrame(
                metrics=metrics,
                issues=issues,
                processor_name=self.__class__.__name__
            ))
            
        return issues

    async def _process_audio_with_error_handling(self, audio_data: bytes) -> bytes:
        """Process audio with error handling and metrics"""
        try:
            # Convert to float32 numpy array
            audio = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Apply processing chain
            audio = signal.filtfilt(self.b, self.a, audio)  # Bandpass filter
            audio = self._apply_noise_reduction(audio)
            audio = self._apply_normalization(audio)
            audio = self._apply_compression(audio)
            
            # Calculate and emit metrics if enabled
            if self.config.enable_metrics:
                metrics = self._calculate_metrics(audio)
                await self._handle_quality_issues(metrics)
            
            # Clip and convert back to int16
            audio = np.clip(audio * 32768.0, -32768, 32767).astype(np.int16)
            return audio.tobytes()
            
        except Exception as e:
            logger.error(f"Audio processing error: {str(e)}")
            await self.push_frame(AudioProcessingErrorFrame(
                error_type='processing_error',
                error_message=str(e),
                processor_name=self.__class__.__name__,
                recoverable=True
            ))
            # Return original audio in case of error
            return audio_data

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, AudioRawFrame):
            await self.push_frame(AudioProcessingStateFrame(
                state='processing',
                processor_name=self.__class__.__name__
            ))
            
            processed_audio = await self._process_audio_with_error_handling(frame.audio)
            
            new_frame = OutputAudioRawFrame(
                audio=processed_audio,
                sample_rate=self.sample_rate,
                num_channels=self.num_channels
            )
            
            await self.push_frame(AudioProcessingStateFrame(
                state='ready',
                processor_name=self.__class__.__name__
            ))
            
            await self.push_frame(new_frame, direction)
        else:
            await self.push_frame(frame, direction) 