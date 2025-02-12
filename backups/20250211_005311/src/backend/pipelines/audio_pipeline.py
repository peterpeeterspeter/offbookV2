from typing import Dict, List, Optional
from pydantic import BaseModel
from fastapi import WebSocket
import numpy as np
from enum import Enum
from .pipeline_ai_bridge import PipelineAIBridge

class AudioFrame(BaseModel):
    data: List[float]
    sample_rate: int
    timestamp: float
    session_id: str

class AudioQualityMetrics(BaseModel):
    rms: float
    peak: float
    zero_crossings: int
    dc_offset: float
    snr: Optional[float]
    clipping_percentage: float

class EmotionLabel(str, Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    NEUTRAL = "neutral"

class EmotionAnalysis(BaseModel):
    emotion: EmotionLabel
    confidence: float
    intensity: float
    features: Dict[str, List[float]]

class ProcessedAudioFrame(BaseModel):
    original: AudioFrame
    quality: AudioQualityMetrics
    emotion: Optional[EmotionAnalysis]
    enhanced: Optional[List[float]]

class AudioPipeline:
    def __init__(self, session_id: str, websocket: WebSocket):
        self.session_id = session_id
        self.websocket = websocket
        self.buffer_size = 4096
        self.sample_rate = 16000
        self.frame_overlap = 0.5
        
        # Initialize AI bridge
        self.ai_bridge = PipelineAIBridge(websocket)
        
        # Initialize processing states
        self.vad_state = False
        self.last_emotion: Optional[EmotionLabel] = None
        self.emotion_confidence = 0.0
        
        # Performance tracking
        self.processed_frames = 0
        self.dropped_frames = 0
        self.total_latency = 0.0

    async def start(self):
        """Start the pipeline and AI bridge"""
        await self.ai_bridge.start()

    async def process_frame(self, frame: AudioFrame) -> ProcessedAudioFrame:
        """Process a single audio frame through the pipeline."""
        try:
            # Convert to numpy array for processing
            audio_data = np.array(frame.data)
            
            # Quality analysis
            quality_metrics = await self._analyze_quality(audio_data)
            
            # Voice activity detection
            if not await self._check_voice_activity(audio_data):
                return ProcessedAudioFrame(
                    original=frame,
                    quality=quality_metrics,
                    emotion=None,
                    enhanced=None
                )
            
            # Audio enhancement using AI if needed
            if self._needs_enhancement(quality_metrics):
                enhanced_audio = await self.ai_bridge.enhance_audio(
                    audio_data.tolist(),
                    frame.sample_rate
                )
                enhanced_audio = np.array(enhanced_audio)
            else:
                enhanced_audio = None
            
            # Emotion analysis using DeepSeek
            emotion_analysis = await self.ai_bridge.analyze_emotion(frame)
            
            processed_frame = ProcessedAudioFrame(
                original=frame,
                quality=quality_metrics,
                emotion=emotion_analysis,
                enhanced=enhanced_audio.tolist() if enhanced_audio is not None else None
            )
            
            # Get performance feedback if emotion is detected
            if emotion_analysis and hasattr(self, 'target_emotion'):
                feedback = await self.ai_bridge.get_performance_feedback(
                    processed_frame,
                    self.target_emotion,
                    self.target_intensity
                )
                await self.send_feedback({
                    **processed_frame.dict(),
                    "performance_feedback": feedback
                })
            else:
                await self.send_feedback(processed_frame.dict())
            
            # Update performance metrics
            self.processed_frames += 1
            
            return processed_frame
            
        except Exception as e:
            self.dropped_frames += 1
            raise RuntimeError(f"Frame processing failed: {str(e)}")

    def _needs_enhancement(self, quality_metrics: AudioQualityMetrics) -> bool:
        """Determine if audio needs AI enhancement based on quality metrics"""
        return (
            abs(quality_metrics.dc_offset) > 0.01 or
            quality_metrics.peak < 0.3 or
            quality_metrics.peak > 0.9 or
            (quality_metrics.snr is not None and quality_metrics.snr < 15) or
            quality_metrics.clipping_percentage > 1.0
        )

    async def set_target_emotion(self, emotion: EmotionLabel, intensity: float):
        """Set target emotion for performance feedback"""
        self.target_emotion = emotion
        self.target_intensity = intensity

    async def _analyze_quality(self, audio_data: np.ndarray) -> AudioQualityMetrics:
        """Analyze audio quality metrics."""
        # Calculate RMS
        rms = np.sqrt(np.mean(np.square(audio_data)))
        
        # Calculate peak amplitude
        peak = np.max(np.abs(audio_data))
        
        # Count zero crossings
        zero_crossings = np.sum(np.diff(np.signbit(audio_data)))
        
        # Calculate DC offset
        dc_offset = np.mean(audio_data)
        
        # Calculate clipping percentage
        clipping_percentage = np.mean(np.abs(audio_data) > 0.95) * 100
        
        # Estimate SNR if possible
        snr = None
        if rms > 0:
            noise_floor = np.mean(np.sort(np.abs(audio_data))[:int(len(audio_data)*0.1)])
            if noise_floor > 0:
                snr = 20 * np.log10(rms / noise_floor)
        
        return AudioQualityMetrics(
            rms=float(rms),
            peak=float(peak),
            zero_crossings=int(zero_crossings),
            dc_offset=float(dc_offset),
            snr=snr,
            clipping_percentage=float(clipping_percentage)
        )

    async def _check_voice_activity(self, audio_data: np.ndarray) -> bool:
        """Detect voice activity in the frame."""
        # Simple energy-based VAD
        frame_energy = np.mean(np.square(audio_data))
        threshold = 0.001  # Adjust based on your needs
        
        # Add hysteresis to prevent rapid switching
        if frame_energy > threshold * 2:
            self.vad_state = True
        elif frame_energy < threshold / 2:
            self.vad_state = False
        
        return self.vad_state

    async def _enhance_audio(
        self, 
        audio_data: np.ndarray, 
        quality: AudioQualityMetrics
    ) -> Optional[np.ndarray]:
        """Enhance audio quality if needed."""
        enhanced = audio_data.copy()
        needs_enhancement = False
        
        # DC offset removal if significant
        if abs(quality.dc_offset) > 0.01:
            enhanced = enhanced - quality.dc_offset
            needs_enhancement = True
        
        # Normalization if too quiet or loud
        if quality.peak < 0.3 or quality.peak > 0.9:
            target_peak = 0.7
            enhanced = enhanced * (target_peak / quality.peak)
            needs_enhancement = True
        
        # Simple noise reduction if SNR is low
        if quality.snr is not None and quality.snr < 15:
            # Apply simple noise gate
            noise_gate = np.abs(enhanced) > (quality.rms * 0.5)
            enhanced = enhanced * noise_gate
            needs_enhancement = True
        
        return enhanced if needs_enhancement else None

    async def _analyze_emotion(self, audio_data: np.ndarray) -> EmotionAnalysis:
        """Analyze emotion in the audio frame."""
        # Extract audio features
        features = await self._extract_features(audio_data)
        
        # Simple feature-based emotion classification
        # This should be replaced with a proper ML model
        energy = np.mean(np.square(audio_data))
        zero_crossing_rate = np.mean(np.abs(np.diff(np.signbit(audio_data))))
        
        # Dummy emotion classification based on features
        # Replace with actual ML model inference
        if energy > 0.1 and zero_crossing_rate > 0.3:
            emotion = EmotionLabel.JOY if self.last_emotion != EmotionLabel.JOY else EmotionLabel.SURPRISE
            confidence = 0.8
        elif energy > 0.08:
            emotion = EmotionLabel.ANGER
            confidence = 0.7
        elif zero_crossing_rate > 0.2:
            emotion = EmotionLabel.FEAR
            confidence = 0.6
        else:
            emotion = EmotionLabel.NEUTRAL
            confidence = 0.5
        
        # Calculate intensity based on energy
        intensity = min(10.0, energy * 100)
        
        self.last_emotion = emotion
        self.emotion_confidence = confidence
        
        return EmotionAnalysis(
            emotion=emotion,
            confidence=confidence,
            intensity=float(intensity),
            features=features
        )

    async def _extract_features(self, audio_data: np.ndarray) -> Dict[str, List[float]]:
        """Extract audio features for emotion analysis."""
        # Time-domain features
        rms = np.sqrt(np.mean(np.square(audio_data)))
        zcr = np.mean(np.abs(np.diff(np.signbit(audio_data))))
        
        # Frequency-domain features
        fft = np.fft.fft(audio_data)
        freq = np.fft.fftfreq(len(audio_data), 1/self.sample_rate)
        magnitude = np.abs(fft)
        
        # Calculate spectral features
        spectral_centroid = np.sum(freq * magnitude) / np.sum(magnitude)
        spectral_rolloff = np.percentile(magnitude, 85)
        
        # Energy in frequency bands
        bands = [
            (0, 500),      # Low
            (500, 2000),   # Mid-low
            (2000, 5000),  # Mid-high
            (5000, 8000)   # High
        ]
        
        band_energies = []
        for low, high in bands:
            mask = (freq >= low) & (freq <= high)
            band_energies.append(np.mean(magnitude[mask]))
        
        return {
            "rms": [float(rms)],
            "zero_crossing_rate": [float(zcr)],
            "spectral_centroid": [float(spectral_centroid)],
            "spectral_rolloff": [float(spectral_rolloff)],
            "band_energies": [float(e) for e in band_energies]
        }

    async def send_feedback(self, processed: ProcessedAudioFrame):
        """Send real-time feedback through WebSocket."""
        await self.websocket.send_json({
            "type": "audio_feedback",
            "session_id": self.session_id,
            "timestamp": processed.original.timestamp,
            "quality": processed.quality.dict(),
            "emotion": processed.emotion.dict() if processed.emotion else None,
            "enhanced": bool(processed.enhanced),
            "metrics": {
                "processed_frames": self.processed_frames,
                "dropped_frames": self.dropped_frames,
                "average_latency": self.total_latency / max(1, self.processed_frames)
            }
        })

    def get_performance_stats(self) -> Dict:
        """Get pipeline performance statistics."""
        return {
            "processed_frames": self.processed_frames,
            "dropped_frames": self.dropped_frames,
            "drop_rate": self.dropped_frames / max(1, self.processed_frames + self.dropped_frames),
            "average_latency": self.total_latency / max(1, self.processed_frames),
            "emotion_stability": self.emotion_confidence
        } 