from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union
import aiohttp
import json
import os
from datetime import datetime, timedelta
import asyncio
from enum import Enum

class EmotionType(Enum):
    """Types of emotions that can be detected."""
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    NEUTRAL = "neutral"

@dataclass
class EmotionAnalysis:
    """Analysis of emotions in text."""
    primary_emotion: EmotionType
    emotion_scores: Dict[EmotionType, float]
    confidence: float
    context: str
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class ScriptSegment:
    """A segment of the script for analysis."""
    text: str
    character: Optional[str]
    scene_number: Optional[int]
    line_number: int
    emotion_analysis: Optional[EmotionAnalysis] = None

@dataclass
class AnalysisRequest:
    """Request for script analysis."""
    text: str
    analysis_type: str
    context: Optional[Dict] = None
    options: Optional[Dict] = None

@dataclass
class AnalysisResponse:
    """Response from script analysis."""
    result: Dict
    raw_response: str
    timestamp: datetime = field(default_factory=datetime.now)

class DeepSeekService:
    """Service for script analysis using DeepSeek."""
    
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.base_url = "https://api.deepseek.com/v1"
        self.session: Optional[aiohttp.ClientSession] = None
        self.cache: Dict[str, AnalysisResponse] = {}
        self.cache_duration = timedelta(hours=24)
        
        # Prompts for different analysis types
        self.prompts = {
            "emotion": """
                Analyze the emotional content of the following text and provide a structured response with:
                1. Primary emotion (joy, sadness, anger, fear, surprise, or neutral)
                2. Confidence score (0-1)
                3. Brief explanation of the emotional context
                4. Distribution of emotion probabilities
                
                Text to analyze: {text}
                """,
            "character": """
                Analyze the following character's dialogue and provide insights about:
                1. Emotional patterns and tendencies
                2. Speaking style and vocabulary choices
                3. Character traits and personality indicators
                4. Relationship dynamics with other characters
                
                Character: {character}
                Dialogue: {text}
                """,
            "scene": """
                Analyze the following scene and provide:
                1. Emotional arc and intensity
                2. Key dramatic moments
                3. Character interactions and dynamics
                4. Pacing and rhythm suggestions
                
                Scene: {text}
                """
        }
    
    async def initialize(self) -> None:
        """Initialize the DeepSeek service."""
        if not self.session:
            self.session = aiohttp.ClientSession(
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
    
    async def close(self) -> None:
        """Close the DeepSeek service."""
        if self.session:
            await self.session.close()
            self.session = None
    
    def _generate_cache_key(self, request: AnalysisRequest) -> str:
        """Generate a cache key for an analysis request."""
        key_data = {
            "text": request.text,
            "type": request.analysis_type,
            "context": request.context,
            "options": request.options
        }
        return json.dumps(key_data, sort_keys=True)
    
    def _get_cached_response(
        self,
        cache_key: str
    ) -> Optional[AnalysisResponse]:
        """Get a cached response if available and not expired."""
        if cache_key in self.cache:
            response = self.cache[cache_key]
            if datetime.now() - response.timestamp < self.cache_duration:
                return response
            else:
                del self.cache[cache_key]
        return None
    
    async def analyze_text(
        self,
        request: AnalysisRequest,
        use_cache: bool = True
    ) -> AnalysisResponse:
        """Analyze text using DeepSeek."""
        if not self.session:
            await self.initialize()
        
        # Check cache first
        cache_key = self._generate_cache_key(request)
        if use_cache:
            cached = self._get_cached_response(cache_key)
            if cached:
                return cached
        
        # Prepare prompt
        prompt_template = self.prompts.get(
            request.analysis_type,
            self.prompts["emotion"]
        )
        prompt = prompt_template.format(
            text=request.text,
            **(request.context or {})
        )
        
        # Prepare request data
        data = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are an expert script and emotion analyzer."},
                {"role": "user", "content": prompt}
            ],
            **(request.options or {})
        }
        
        # Make API request
        async with self.session.post(
            f"{self.base_url}/chat/completions",
            json=data
        ) as response:
            if response.status == 200:
                result = await response.json()
                
                # Parse and structure the response
                structured_result = self._parse_analysis_response(
                    result["choices"][0]["message"]["content"],
                    request.analysis_type
                )
                
                analysis_response = AnalysisResponse(
                    result=structured_result,
                    raw_response=result["choices"][0]["message"]["content"]
                )
                
                # Cache the response
                self.cache[cache_key] = analysis_response
                
                return analysis_response
            else:
                error_text = await response.text()
                raise Exception(
                    f"Failed to analyze text: {response.status} - {error_text}"
                )
    
    def _parse_analysis_response(
        self,
        response: str,
        analysis_type: str
    ) -> Dict:
        """Parse and structure the analysis response."""
        try:
            if analysis_type == "emotion":
                # Extract emotion information using simple parsing
                lines = response.lower().split('\n')
                primary_emotion = None
                confidence = 0.0
                explanation = ""
                emotion_scores = {}
                
                for line in lines:
                    if "primary emotion" in line:
                        for emotion in EmotionType:
                            if emotion.value in line:
                                primary_emotion = emotion
                                break
                    elif "confidence" in line:
                        try:
                            confidence = float(
                                ''.join(c for c in line if c.isdigit() or c == '.')
                            )
                        except ValueError:
                            pass
                    elif "explanation" in line:
                        explanation = line.split(":", 1)[1].strip()
                    elif "probability" in line or "distribution" in line:
                        for emotion in EmotionType:
                            if emotion.value in line:
                                try:
                                    score = float(
                                        ''.join(
                                            c for c in line
                                            if c.isdigit() or c == '.'
                                        )
                                    )
                                    emotion_scores[emotion] = score
                                except ValueError:
                                    pass
                
                return {
                    "primary_emotion": primary_emotion,
                    "confidence": confidence,
                    "explanation": explanation,
                    "emotion_scores": emotion_scores
                }
            
            elif analysis_type == "character":
                # Parse character analysis
                sections = response.split('\n\n')
                analysis = {
                    "emotional_patterns": [],
                    "speaking_style": [],
                    "character_traits": [],
                    "relationships": []
                }
                
                current_section = None
                for section in sections:
                    if "emotional pattern" in section.lower():
                        current_section = "emotional_patterns"
                    elif "speaking style" in section.lower():
                        current_section = "speaking_style"
                    elif "character trait" in section.lower():
                        current_section = "character_traits"
                    elif "relationship" in section.lower():
                        current_section = "relationships"
                    
                    if current_section and ":" in section:
                        points = [
                            p.strip()
                            for p in section.split(':')[1].split('-')
                            if p.strip()
                        ]
                        analysis[current_section].extend(points)
                
                return analysis
            
            elif analysis_type == "scene":
                # Parse scene analysis
                analysis = {
                    "emotional_arc": [],
                    "key_moments": [],
                    "character_dynamics": [],
                    "pacing_suggestions": []
                }
                
                sections = response.split('\n\n')
                current_section = None
                
                for section in sections:
                    if "emotional arc" in section.lower():
                        current_section = "emotional_arc"
                    elif "key moment" in section.lower():
                        current_section = "key_moments"
                    elif "character" in section.lower():
                        current_section = "character_dynamics"
                    elif "pacing" in section.lower():
                        current_section = "pacing_suggestions"
                    
                    if current_section and ":" in section:
                        points = [
                            p.strip()
                            for p in section.split(':')[1].split('-')
                            if p.strip()
                        ]
                        analysis[current_section].extend(points)
                
                return analysis
            
            else:
                # Return raw response for unknown analysis types
                return {"raw_analysis": response}
        
        except Exception as e:
            return {
                "error": f"Failed to parse response: {str(e)}",
                "raw_response": response
            }
    
    async def analyze_script_segment(
        self,
        segment: ScriptSegment
    ) -> ScriptSegment:
        """Analyze a script segment."""
        # Determine analysis type based on segment properties
        if segment.character:
            analysis_type = "character"
            context = {"character": segment.character}
        else:
            analysis_type = "emotion"
            context = None
        
        # Create analysis request
        request = AnalysisRequest(
            text=segment.text,
            analysis_type=analysis_type,
            context=context
        )
        
        # Get analysis
        response = await self.analyze_text(request)
        
        # Create emotion analysis if applicable
        if analysis_type == "emotion":
            result = response.result
            segment.emotion_analysis = EmotionAnalysis(
                primary_emotion=result.get(
                    "primary_emotion",
                    EmotionType.NEUTRAL
                ),
                emotion_scores=result.get("emotion_scores", {}),
                confidence=result.get("confidence", 0.0),
                context=result.get("explanation", "")
            )
        
        return segment
    
    async def analyze_scene(
        self,
        scene_text: str,
        scene_number: Optional[int] = None
    ) -> Dict:
        """Analyze a complete scene."""
        request = AnalysisRequest(
            text=scene_text,
            analysis_type="scene",
            context={"scene_number": scene_number} if scene_number else None
        )
        
        response = await self.analyze_text(request)
        return response.result
    
    def clear_cache(self) -> None:
        """Clear the analysis cache."""
        self.cache.clear()
    
    def get_cache_stats(self) -> Dict:
        """Get statistics about the cache."""
        current_time = datetime.now()
        total_entries = len(self.cache)
        expired_entries = sum(
            1 for r in self.cache.values()
            if current_time - r.timestamp >= self.cache_duration
        )
        
        return {
            "total_entries": total_entries,
            "expired_entries": expired_entries,
            "cache_duration_hours": self.cache_duration.total_seconds() / 3600
        }

# Export singleton instance
deepseek_service = DeepSeekService() 