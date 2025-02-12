from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime

class PerformanceMetrics(BaseModel):
    """Performance metrics model."""
    average_accuracy: float
    average_timing: float
    average_pronunciation: float
    average_emotion: float
    overall_score: float
    total_recordings: int

class PerformanceEntry(BaseModel):
    """Single performance entry model."""
    date: datetime
    accuracy: float
    timing: float
    pronunciation: float
    emotion: float
    overall: float
    suggestions: List[str]

class PerformanceHistory(BaseModel):
    """Performance history model."""
    history: List[PerformanceEntry]
