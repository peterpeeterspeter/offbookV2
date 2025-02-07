from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Any
from enum import Enum
import re
from datetime import datetime, UTC
import logging
from ..database.config import get_async_session
from sqlalchemy import text

logger = logging.getLogger(__name__)

class EmotionIntensity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

@dataclass
class EmotionMarker:
    """Marker for emotion in text."""
    emotion: str
    intensity: EmotionIntensity
    confidence: float
    start_index: int
    end_index: int
    context: str = ""

@dataclass
class CharacterProfile:
    """Profile of a character in the script."""
    name: str
    emotions: Dict[str, int] = field(default_factory=dict)
    lines: List[str] = field(default_factory=list)
    word_count: int = 0
    scene_appearances: Set[int] = field(default_factory=set)
    common_phrases: List[str] = field(default_factory=list)
    emotional_patterns: List[EmotionMarker] = field(default_factory=list)

@dataclass
class SceneAnalysis:
    """Analysis of a scene in the script."""
    scene_number: int
    characters: Set[str]
    emotion_flow: List[EmotionMarker]
    duration_estimate: float
    intensity_score: float
    key_moments: List[str]
    context: str

@dataclass
class ScriptMetadata:
    """Metadata about the script."""
    title: str
    characters: Set[str]
    scene_count: int
    total_lines: int
    estimated_duration: float
    creation_date: datetime
    last_modified: datetime
    language: str = "en"

class ScriptAnalysisService:
    """Service for analyzing scripts and detecting emotions."""
    
    def __init__(self):
        self.script_metadata: Optional[ScriptMetadata] = None
        self.character_profiles: Dict[str, CharacterProfile] = {}
        self.scene_analyses: List[SceneAnalysis] = []
        self.emotion_patterns: Dict[str, List[str]] = {
            "joy": [
                r"laugh[ing|s|ed]*",
                r"smil[e|ing|ed]*",
                r"happy",
                r"excite[d|ment]*"
            ],
            "sadness": [
                r"cry[ing|s|ied]*",
                r"tear[s|ful]*",
                r"sigh[s|ing|ed]*",
                r"depress[ed|ing]*"
            ],
            "anger": [
                r"shout[s|ing|ed]*",
                r"anger[ed]*",
                r"rage[s|ing|d]*",
                r"furious[ly]*"
            ],
            "fear": [
                r"trembl[e|ing|ed]*",
                r"fear[ful|ed]*",
                r"scared",
                r"nervous[ly]*"
            ],
            "surprise": [
                r"gasp[s|ing|ed]*",
                r"shock[ed]*",
                r"startl[e|ed|ing]*",
                r"surprise[d]*"
            ]
        }
    
    def analyze_script(
        self,
        script_text: str,
        metadata: Optional[ScriptMetadata] = None
    ) -> ScriptMetadata:
        """Analyze a complete script and generate metadata."""
        # Initialize or update metadata
        if metadata:
            self.script_metadata = metadata
        else:
            self.script_metadata = self._generate_metadata(script_text)
        
        # Reset analysis data
        self.character_profiles.clear()
        self.scene_analyses.clear()
        
        # Split into scenes and analyze each
        scenes = self._split_into_scenes(script_text)
        for i, scene in enumerate(scenes, 1):
            self._analyze_scene(scene, i)
        
        # Update character profiles with scene-level data
        self._update_character_profiles()
        
        return self.script_metadata
    
    def get_character_profile(self, character: str) -> Optional[CharacterProfile]:
        """Get the profile for a specific character."""
        return self.character_profiles.get(character)
    
    def get_scene_analysis(self, scene_number: int) -> Optional[SceneAnalysis]:
        """Get the analysis for a specific scene."""
        try:
            return self.scene_analyses[scene_number - 1]
        except IndexError:
            return None
    
    def detect_emotions(self, text: str) -> List[EmotionMarker]:
        """Detect emotions in a piece of text."""
        emotions: List[EmotionMarker] = []
        
        for emotion, patterns in self.emotion_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    # Get context around the match
                    start = max(0, match.start() - 20)
                    end = min(len(text), match.end() + 20)
                    context = text[start:end]
                    
                    # Determine intensity based on context and pattern
                    intensity = self._determine_emotion_intensity(
                        emotion,
                        match.group(),
                        context
                    )
                    
                    emotions.append(EmotionMarker(
                        emotion=emotion,
                        intensity=intensity,
                        confidence=0.8,  # Base confidence
                        start_index=match.start(),
                        end_index=match.end(),
                        context=context
                    ))
        
        return emotions
    
    def analyze_character_line(
        self,
        character: str,
        line: str
    ) -> List[EmotionMarker]:
        """Analyze a single character line for emotions."""
        if character not in self.character_profiles:
            self.character_profiles[character] = CharacterProfile(name=character)
        
        profile = self.character_profiles[character]
        profile.lines.append(line)
        profile.word_count += len(line.split())
        
        # Detect emotions in the line
        emotions = self.detect_emotions(line)
        
        # Update character's emotional profile
        for emotion in emotions:
            profile.emotions[emotion.emotion] = (
                profile.emotions.get(emotion.emotion, 0) + 1
            )
            profile.emotional_patterns.append(emotion)
        
        return emotions
    
    def _generate_metadata(self, script_text: str) -> ScriptMetadata:
        """Generate metadata for a script."""
        lines = script_text.split('\n')
        characters = set()
        
        # Extract character names (assumed to be in ALL CAPS)
        for line in lines:
            matches = re.findall(r'^[A-Z][A-Z\s]+(?=:)', line)
            characters.update(matches)
        
        return ScriptMetadata(
            title="Untitled",  # Should be updated with actual title
            characters=characters,
            scene_count=len(self._split_into_scenes(script_text)),
            total_lines=len(lines),
            estimated_duration=len(lines) * 3.0,  # Rough estimate: 3s per line
            creation_date=datetime.now(),
            last_modified=datetime.now()
        )
    
    def _split_into_scenes(self, script_text: str) -> List[str]:
        """Split a script into scenes."""
        # Simple scene splitting by "SCENE" or "ACT" markers
        scenes = re.split(r'\b(?:SCENE|ACT)\b', script_text)
        return [s.strip() for s in scenes if s.strip()]
    
    def _analyze_scene(self, scene_text: str, scene_number: int) -> None:
        """Analyze a single scene."""
        characters = set()
        emotions = []
        key_moments = []
        
        # Extract character names and analyze their lines
        lines = scene_text.split('\n')
        for line in lines:
            char_match = re.match(r'^([A-Z][A-Z\s]+):', line)
            if char_match:
                character = char_match.group(1)
                characters.add(character)
                
                # Get the actual line text
                line_text = line[len(character) + 1:].strip()
                line_emotions = self.analyze_character_line(character, line_text)
                emotions.extend(line_emotions)
                
                # Check for key moments
                if line_emotions:
                    key_moments.append(f"{character}: {line_text}")
        
        # Calculate scene intensity
        intensity = sum(
            1 for e in emotions
            if e.intensity in [EmotionIntensity.MEDIUM, EmotionIntensity.HIGH]
        ) / max(1, len(emotions))
        
        # Create scene analysis
        analysis = SceneAnalysis(
            scene_number=scene_number,
            characters=characters,
            emotion_flow=emotions,
            duration_estimate=len(lines) * 3.0,  # Rough estimate
            intensity_score=intensity,
            key_moments=key_moments[:5],  # Top 5 key moments
            context=scene_text[:200]  # First 200 chars as context
        )
        
        self.scene_analyses.append(analysis)
        
        # Update character scene appearances
        for character in characters:
            if character in self.character_profiles:
                self.character_profiles[character].scene_appearances.add(
                    scene_number
                )
    
    def _update_character_profiles(self) -> None:
        """Update character profiles with scene-level information."""
        for profile in self.character_profiles.values():
            # Find common phrases
            text = ' '.join(profile.lines)
            words = text.split()
            phrases = [
                ' '.join(words[i:i+3])
                for i in range(len(words)-2)
            ]
            
            # Count phrase frequencies
            phrase_counts = {}
            for phrase in phrases:
                if len(phrase.split()) == 3:  # Ensure complete phrases
                    phrase_counts[phrase] = phrase_counts.get(phrase, 0) + 1
            
            # Sort and store top phrases
            profile.common_phrases = sorted(
                phrase_counts.keys(),
                key=lambda x: phrase_counts[x],
                reverse=True
            )[:5]  # Top 5 phrases
    
    def _determine_emotion_intensity(
        self,
        emotion: str,
        match: str,
        context: str
    ) -> EmotionIntensity:
        """Determine the intensity of an emotion based on context."""
        # Check for intensity modifiers
        intensity_modifiers = {
            "very": 2,
            "extremely": 2,
            "slightly": 0.5,
            "somewhat": 0.7,
            "really": 1.5
        }
        
        base_intensity = 1.0
        for modifier, factor in intensity_modifiers.items():
            if modifier in context.lower():
                base_intensity *= factor
        
        # Determine intensity level
        if base_intensity >= 1.5:
            return EmotionIntensity.HIGH
        elif base_intensity >= 0.8:
            return EmotionIntensity.MEDIUM
        else:
            return EmotionIntensity.LOW
    
    def reset(self) -> None:
        """Reset the analysis service state."""
        self.script_metadata = None
        self.character_profiles.clear()
        self.scene_analyses.clear()

    async def analyze_script_background(self, script_id: int, script_text: str) -> None:
        """Analyze a script in the background and update the database with results."""
        try:
            # Create a new database session for this background task
            async_session = get_async_session()
            async for session in async_session:
                try:
                    # Reset state for this analysis
                    self.reset()
                    
                    # Analyze the script
                    metadata = self.analyze_script(script_text)
                    
                    # Prepare analysis results
                    analysis_results = {
                        "characters": [
                            {
                                "name": name,
                                "profile": {
                                    "emotions": profile.emotions,
                                    "word_count": profile.word_count,
                                    "scene_appearances": list(profile.scene_appearances),
                                    "common_phrases": profile.common_phrases,
                                    "emotional_patterns": [
                                        {
                                            "emotion": e.emotion,
                                            "intensity": e.intensity.value,
                                            "confidence": e.confidence,
                                            "context": e.context
                                        }
                                        for e in profile.emotional_patterns
                                    ]
                                }
                            }
                            for name, profile in self.character_profiles.items()
                        ],
                        "scenes": [
                            {
                                "scene_number": scene.scene_number,
                                "characters": list(scene.characters),
                                "duration_estimate": scene.duration_estimate,
                                "intensity_score": scene.intensity_score,
                                "key_moments": scene.key_moments,
                                "context": scene.context
                            }
                            for scene in self.scene_analyses
                        ],
                        "metadata": {
                            "title": metadata.title,
                            "characters": list(metadata.characters),
                            "scene_count": metadata.scene_count,
                            "total_lines": metadata.total_lines,
                            "estimated_duration": metadata.estimated_duration,
                            "language": metadata.language
                        }
                    }
                    
                    # Update the database
                    await session.execute(
                        text("""
                        UPDATE scripts 
                        SET analysis = :analysis,
                            updated_at = :updated_at
                        WHERE id = :script_id
                        """),
                        {
                            "script_id": script_id,
                            "analysis": analysis_results,
                            "updated_at": datetime.now(UTC)
                        }
                    )
                    await session.commit()
                    
                except Exception as e:
                    await session.rollback()
                    logger.error(f"Error analyzing script {script_id}: {str(e)}")
                    # Update script with error status
                    await session.execute(
                        text("""
                        UPDATE scripts 
                        SET analysis = :analysis,
                            updated_at = :updated_at
                        WHERE id = :script_id
                        """),
                        {
                            "script_id": script_id,
                            "analysis": {"error": str(e)},
                            "updated_at": datetime.now(UTC)
                        }
                    )
                    await session.commit()
                finally:
                    await session.close()
                    
        except Exception as e:
            logger.error(f"Critical error in background analysis for script {script_id}: {str(e)}")

# Export singleton instance
script_analysis_service = ScriptAnalysisService() 