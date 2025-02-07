from typing import List, Optional, Dict
from dataclasses import dataclass
import time
import numpy as np
from pipecat.pipeline.pipeline import Pipeline
from pipecat.processors.frame_processor import FrameProcessor
from .vad_processor import SileroVADProcessor
from .buffer_processor import AudioBufferProcessor
from .advanced_processor import AdvancedAudioProcessor, AudioProcessingConfig
from .error_frames import AudioQualityIssueFrame, AudioProcessingStateFrame

@dataclass
class PipelineStats:
    """Statistics for pipeline performance monitoring"""
    total_frames_processed: int = 0
    total_processing_time: float = 0
    avg_processing_time: float = 0
    peak_processing_time: float = 0
    error_count: int = 0
    quality_issues: Dict[str, int] = None
    last_update: float = 0

class AudioPipeline:
    """Factory for creating audio processing pipelines"""
    
    def __init__(self):
        self.stats = PipelineStats()
        self.stats.quality_issues = {}
        self.adaptive_config = {
            'noise_reduction_strength': 0.5,
            'buffer_size': 1024,
            'vad_threshold': 0.5
        }
    
    def _update_stats(self, processing_time: float, has_error: bool = False, quality_issues: List[str] = None):
        """Update pipeline statistics"""
        self.stats.total_frames_processed += 1
        self.stats.total_processing_time += processing_time
        self.stats.avg_processing_time = (
            self.stats.total_processing_time / self.stats.total_frames_processed
        )
        self.stats.peak_processing_time = max(
            self.stats.peak_processing_time, 
            processing_time
        )
        
        if has_error:
            self.stats.error_count += 1
            
        if quality_issues:
            for issue in quality_issues:
                self.stats.quality_issues[issue] = (
                    self.stats.quality_issues.get(issue, 0) + 1
                )
        
        self.stats.last_update = time.time()
    
    def _adapt_processing_parameters(self, stats: PipelineStats) -> AudioProcessingConfig:
        """Adapt processing parameters based on performance metrics"""
        config = AudioProcessingConfig()
        
        # Adjust noise reduction based on error rate
        error_rate = stats.error_count / max(stats.total_frames_processed, 1)
        if error_rate > 0.1:  # More than 10% errors
            self.adaptive_config['noise_reduction_strength'] = max(
                0.3,
                self.adaptive_config['noise_reduction_strength'] - 0.1
            )
        
        # Adjust buffer size based on processing time
        if stats.avg_processing_time > 0.1:  # More than 100ms
            self.adaptive_config['buffer_size'] = max(
                512,
                int(self.adaptive_config['buffer_size'] * 0.8)
            )
        
        # Adjust VAD threshold based on quality issues
        if stats.quality_issues.get('low_level_detected', 0) > stats.total_frames_processed * 0.05:
            self.adaptive_config['vad_threshold'] = max(
                0.3,
                self.adaptive_config['vad_threshold'] - 0.05
            )
        
        # Apply adapted config
        config.noise_reduction_strength = self.adaptive_config['noise_reduction_strength']
        return config

    @staticmethod
    async def create_pipeline(
        sample_rate: int = 16000,
        num_channels: int = 1,
        vad_threshold: float = 0.5,
        buffer_size_mb: int = 1,
        audio_config: Optional[AudioProcessingConfig] = None,
        additional_processors: Optional[List[FrameProcessor]] = None
    ) -> Pipeline:
        """Create a new audio processing pipeline"""
        pipeline_instance = AudioPipeline()
        
        # Create base processors
        advanced_processor = AdvancedAudioProcessor(
            sample_rate=sample_rate,
            num_channels=num_channels,
            config=audio_config or pipeline_instance._adapt_processing_parameters(pipeline_instance.stats)
        )
        
        # Initialize async components
        await advanced_processor._initialize_async()
        
        processors = [
            # Voice activity detection
            SileroVADProcessor(
                sample_rate=sample_rate,
                threshold=pipeline_instance.adaptive_config['vad_threshold']
            ),
            
            # Advanced audio processing
            advanced_processor,
            
            # Audio buffering and processing
            AudioBufferProcessor(
                sample_rate=sample_rate,
                num_channels=num_channels,
                max_buffer_size_mb=buffer_size_mb
            )
        ]
        
        # Add any additional processors
        if additional_processors:
            processors.extend(additional_processors)
            
        # Create pipeline with monitoring
        pipeline = Pipeline(processors=processors)
        
        # Add monitoring callback
        async def monitor_callback(frame):
            start_time = time.time()
            
            if isinstance(frame, AudioQualityIssueFrame):
                pipeline_instance._update_stats(
                    time.time() - start_time,
                    quality_issues=[frame.issue_type]
                )
            elif isinstance(frame, AudioProcessingStateFrame):
                if frame.state == 'error':
                    pipeline_instance._update_stats(
                        time.time() - start_time,
                        has_error=True
                    )
                else:
                    pipeline_instance._update_stats(time.time() - start_time)
        
        pipeline.add_frame_callback(monitor_callback)
        return pipeline

    @staticmethod
    async def create_realtime_pipeline(
        sample_rate: int = 16000,
        num_channels: int = 1,
        vad_threshold: float = 0.5,
        buffer_size_mb: int = 1,
        audio_config: Optional[AudioProcessingConfig] = None,
        additional_processors: Optional[List[FrameProcessor]] = None
    ) -> Pipeline:
        """Create a pipeline optimized for real-time processing"""
        # Create optimized audio config for real-time if none provided
        if audio_config is None:
            audio_config = AudioProcessingConfig(
                noise_reduction_strength=0.3,  # Less aggressive for lower latency
                attack_ms=2.0,  # Faster attack time
                release_ms=20.0,  # Faster release time
                filter_order=2  # Lower order filter for less latency
            )
        
        pipeline = await AudioPipeline.create_pipeline(
            sample_rate=sample_rate,
            num_channels=num_channels,
            vad_threshold=vad_threshold,
            buffer_size_mb=buffer_size_mb,
            audio_config=audio_config,
            additional_processors=additional_processors
        )
        
        return pipeline 