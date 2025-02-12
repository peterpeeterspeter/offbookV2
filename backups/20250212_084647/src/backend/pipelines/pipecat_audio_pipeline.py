from typing import Dict, List, Optional, AsyncGenerator
from pipecat import FrameProcessor, Pipeline, Frame, PipelineTask
from pipecat.frames import AudioFrame, DataFrame, SystemFrame
from pipecat.transports import DailyTransport
import numpy as np
from enum import Enum
import asyncio

class EmotionFrame(DataFrame):
    """Frame containing emotion analysis results"""
    emotion: str
    confidence: float
    intensity: float
    features: Dict[str, List[float]]

class QualityFrame(DataFrame):
    """Frame containing audio quality metrics"""
    rms: float
    peak: float
    zero_crossings: int
    dc_offset: float
    snr: Optional[float]
    clipping_percentage: float

class AudioQualityProcessor(FrameProcessor):
    """Analyzes audio quality metrics"""
    
    async def process_frame(self, frame: Frame) -> AsyncGenerator[Frame, None]:
        if not isinstance(frame, AudioFrame):
            yield frame
            return

        # Convert to numpy array
        audio_data = np.array(frame.data)
        
        # Calculate metrics
        rms = float(np.sqrt(np.mean(np.square(audio_data))))
        peak = float(np.max(np.abs(audio_data)))
        zero_crossings = int(np.sum(np.diff(np.signbit(audio_data))))
        dc_offset = float(np.mean(audio_data))
        clipping_percentage = float(np.mean(np.abs(audio_data) > 0.95) * 100)
        
        # Calculate SNR
        snr = None
        if rms > 0:
            noise_floor = np.mean(np.sort(np.abs(audio_data))[:int(len(audio_data)*0.1)])
            if noise_floor > 0:
                snr = float(20 * np.log10(rms / noise_floor))
        
        # Create quality frame
        quality_frame = QualityFrame(
            rms=rms,
            peak=peak,
            zero_crossings=zero_crossings,
            dc_offset=dc_offset,
            snr=snr,
            clipping_percentage=clipping_percentage
        )
        
        yield quality_frame
        yield frame

class VADProcessor(FrameProcessor):
    """Voice Activity Detection processor"""
    
    def __init__(self):
        super().__init__()
        self.vad_state = False
        self.energy_threshold = 0.001
        
    async def process_frame(self, frame: Frame) -> AsyncGenerator[Frame, None]:
        if not isinstance(frame, AudioFrame):
            yield frame
            return
            
        # Calculate frame energy
        audio_data = np.array(frame.data)
        frame_energy = np.mean(np.square(audio_data))
        
        # Update VAD state with hysteresis
        if frame_energy > self.energy_threshold * 2:
            self.vad_state = True
        elif frame_energy < self.energy_threshold / 2:
            self.vad_state = False
        
        if self.vad_state:
            yield frame

class AudioEnhancementProcessor(FrameProcessor):
    """Enhances audio quality based on metrics"""
    
    async def process_frame(self, frame: Frame) -> AsyncGenerator[Frame, None]:
        if not isinstance(frame, AudioFrame):
            yield frame
            return
            
        # Get the last quality frame
        quality_frames = [f for f in self.get_previous_frames() if isinstance(f, QualityFrame)]
        if not quality_frames:
            yield frame
            return
            
        quality = quality_frames[-1]
        audio_data = np.array(frame.data)
        enhanced = audio_data.copy()
        needs_enhancement = False
        
        # Apply enhancements based on quality metrics
        if abs(quality.dc_offset) > 0.01:
            enhanced = enhanced - quality.dc_offset
            needs_enhancement = True
            
        if quality.peak < 0.3 or quality.peak > 0.9:
            target_peak = 0.7
            enhanced = enhanced * (target_peak / quality.peak)
            needs_enhancement = True
            
        if quality.snr is not None and quality.snr < 15:
            noise_gate = np.abs(enhanced) > (quality.rms * 0.5)
            enhanced = enhanced * noise_gate
            needs_enhancement = True
            
        if needs_enhancement:
            yield AudioFrame(
                data=enhanced.tolist(),
                sample_rate=frame.sample_rate,
                timestamp=frame.timestamp
            )
        else:
            yield frame

class EmotionAnalysisProcessor(FrameProcessor):
    """Analyzes emotion in audio using ML models"""
    
    def __init__(self, emotion_service):
        super().__init__()
        self.emotion_service = emotion_service
        
    async def process_frame(self, frame: Frame) -> AsyncGenerator[Frame, None]:
        if not isinstance(frame, AudioFrame):
            yield frame
            return
            
        # Only process if we have voice activity
        vad_frames = [f for f in self.get_previous_frames() if isinstance(f, AudioFrame)]
        if not vad_frames:
            yield frame
            return
            
        try:
            # Get target emotion and intensity if set
            target_frames = [f for f in self.get_previous_frames() if isinstance(f, DataFrame) and hasattr(f, 'target_emotion')]
            target_emotion = target_frames[-1].target_emotion if target_frames else None
            target_intensity = target_frames[-1].target_intensity if target_frames else None
            
            # Analyze emotion using ML service
            prediction = await self.emotion_service.analyze_emotion(
                np.array(frame.data),
                frame.sample_rate,
                target_emotion,
                target_intensity
            )
            
            # Create emotion frame
            emotion_frame = EmotionFrame(
                emotion=prediction.emotion,
                confidence=prediction.confidence,
                intensity=prediction.intensity,
                features=prediction.features
            )
            
            # Create timing frame
            timing_frame = DataFrame(timing=prediction.timing)
            
            # Create suggestions frame
            suggestions_frame = DataFrame(suggestions=prediction.suggestions)
            
            # Yield all frames
            yield emotion_frame
            yield timing_frame
            yield suggestions_frame
            yield frame
            
        except Exception as e:
            print(f"Error in emotion analysis: {str(e)}")
            yield frame

class PerformanceAnalysisProcessor(FrameProcessor):
    """Analyzes performance and provides feedback"""
    
    def __init__(self, target_emotion: str = 'NEUTRAL', target_intensity: float = 0.5):
        super().__init__()
        self.target_emotion = target_emotion
        self.target_intensity = target_intensity
        
    async def process_frame(self, frame: Frame) -> AsyncGenerator[Frame, None]:
        if not isinstance(frame, AudioFrame):
            yield frame
            return
            
        # Get the latest emotion and quality frames
        emotion_frames = [f for f in self.get_previous_frames() if isinstance(f, EmotionFrame)]
        quality_frames = [f for f in self.get_previous_frames() if isinstance(f, QualityFrame)]
        
        if emotion_frames and quality_frames:
            emotion = emotion_frames[-1]
            quality = quality_frames[-1]
            
            # Generate feedback
            feedback = {
                'emotion_match': 1.0 if emotion.emotion == self.target_emotion else 0.0,
                'intensity_match': 1.0 - abs(emotion.intensity - self.target_intensity),
                'quality_issues': self._analyze_quality_issues(quality),
                'suggestions': emotion.features.get('suggestions', [])
            }
            
            # Create feedback frame
            yield DataFrame(feedback=feedback)
        
        yield frame
        
    def _analyze_quality_issues(self, quality: QualityFrame) -> List[str]:
        issues = []
        
        if quality.snr is not None and quality.snr < 15:
            issues.append('High background noise detected')
            
        if quality.clipping_percentage > 1.0:
            issues.append('Audio clipping detected')
            
        if quality.peak < 0.3:
            issues.append('Audio level too low')
            
        if quality.peak > 0.9:
            issues.append('Audio level too high')
            
        return issues

def create_audio_pipeline(
    transport: DailyTransport,
    emotion_service,
    target_emotion: str = 'NEUTRAL',
    target_intensity: float = 0.5
) -> Pipeline:
    """Creates the complete audio processing pipeline"""
    
    # Create target emotion frame
    target_frame = DataFrame(target_emotion=target_emotion, target_intensity=target_intensity)
    
    return Pipeline([
        transport.input_processor,
        AudioQualityProcessor(),
        VADProcessor(),
        AudioEnhancementProcessor(),
        EmotionAnalysisProcessor(emotion_service),
        PerformanceAnalysisProcessor(target_emotion, target_intensity),
        transport.output_processor
    ], initial_frames=[target_frame])

async def run_audio_pipeline(
    room_url: str,
    model_path: str,
    target_emotion: str = 'NEUTRAL',
    target_intensity: float = 0.5
):
    """Runs the audio pipeline with Daily.co transport"""
    
    # Create Daily.co transport
    transport = DailyTransport(room_url)
    
    # Create emotion analysis service
    emotion_service = EmotionAnalysisService(model_path)
    
    # Create and start pipeline
    pipeline = create_audio_pipeline(
        transport,
        emotion_service,
        target_emotion,
        target_intensity
    )
    
    # Create pipeline task
    task = PipelineTask(pipeline)
    
    try:
        # Run the pipeline
        await task.run()
    except Exception as e:
        print(f"Pipeline error: {str(e)}")
    finally:
        # Cleanup
        await transport.close() 