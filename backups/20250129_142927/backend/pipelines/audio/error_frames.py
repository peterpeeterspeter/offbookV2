from typing import List, Dict
from dataclasses import dataclass
from pipecat.frames.frames import Frame

@dataclass
class AudioProcessingErrorFrame(Frame):
    """Frame for audio processing errors"""
    error_type: str
    error_message: str
    processor_name: str
    recoverable: bool

@dataclass
class AudioProcessingStateFrame(Frame):
    """Frame for audio processing state changes"""
    state: str
    processor_name: str

@dataclass
class AudioQualityMetricFrame(Frame):
    """Frame for audio quality metrics"""
    metrics: Dict[str, float]
    processor_name: str
    issues: List[str] = None

@dataclass
class AudioQualityIssueFrame(Frame):
    """Frame for audio quality issues that need attention"""
    issue_type: str
    severity: str  # 'warning' | 'error'
    description: str
    metrics: Dict[str, float]
    processor_name: str
    timestamp: float
    suggested_actions: List[str] 