from typing import Dict, List, Optional
import json
from pipecat.frames.frames import TextFrame
from pipecat.services.deepseek import DeepSeekService

class ScriptAnalyzer:
    """Service for analyzing scripts and extracting emotions and timing information."""
    
    # Base emotions with their characteristics
    EMOTIONS = {
        "angry": {"intensity": 0.8, "speed": 1.2},
        "sad": {"intensity": 0.6, "speed": 0.8},
        "happy": {"intensity": 0.7, "speed": 1.1},
        "neutral": {"intensity": 0.5, "speed": 1.0},
        "excited": {"intensity": 0.9, "speed": 1.3},
        "scared": {"intensity": 0.7, "speed": 1.1},
        "sarcastic": {"intensity": 0.6, "speed": 0.9}
    }
    
    # Emotion modifiers from V1
    MODIFIERS = {
        "whispering": {"stability": 0.9, "speed": 0.2, "volume": 0.3},
        "shouting": {"stability": 0.2, "speed": 0.9, "volume": 1.0},
        "crying": {"stability": 0.7, "speed": 0.4, "volume": 0.6},
        "laughing": {"stability": 0.4, "speed": 0.7, "volume": 0.8}
    }
    
    def __init__(self, deepseek_service: DeepSeekService):
        self.deepseek = deepseek_service
        
    async def analyze_script(self, script_text: str) -> Dict:
        """
        Analyze a script to extract:
        - Character lines and roles
        - Emotional context for each line
        - Suggested timing/pacing
        """
        # Format prompt for script analysis
        prompt = f"""
        Analyze this script excerpt and provide detailed analysis including:
        1. Character identification (main and supporting roles)
        2. Emotional context for each line (with intensity and modifiers)
        3. Suggested timing/pauses
        4. Scene context and mood
        
        Consider these aspects for emotions:
        - Base emotions: {list(self.EMOTIONS.keys())}
        - Modifiers: {list(self.MODIFIERS.keys())}
        
        Script:
        {script_text}
        
        Return the analysis in JSON format with:
        {{
            "characters": [
                {{
                    "name": "character name",
                    "role_type": "main" or "supporting",
                    "personality": "brief description",
                    "voice_traits": ["trait1", "trait2"]
                }}
            ],
            "lines": [
                {{
                    "character": "speaking character",
                    "text": "the line",
                    "emotion": {{
                        "base": "emotion name",
                        "intensity": 0.0-1.0,
                        "modifiers": ["modifier1", "modifier2"],
                        "context": "why this emotion"
                    }},
                    "timing": {{
                        "pause_before": seconds,
                        "pause_after": seconds,
                        "suggested_speed": 0.8-1.2
                    }}
                }}
            ],
            "scene_context": {{
                "setting": "location/time",
                "mood": "overall scene mood",
                "key_themes": ["theme1", "theme2"],
                "suggested_pace": "fast/medium/slow"
            }}
        }}
        """
        
        # Get analysis from DeepSeek
        response = await self.deepseek.generate(prompt)
        
        try:
            # Parse the response into structured data
            analysis = json.loads(response)
            
            # Validate and enhance the analysis
            return await self._enhance_analysis(analysis)
            
        except Exception as e:
            print(f"Error parsing script analysis: {e}")
            return {
                "characters": [],
                "lines": [],
                "scene_context": {
                    "setting": "unknown",
                    "mood": "neutral",
                    "key_themes": [],
                    "suggested_pace": "medium"
                }
            }
    
    async def _enhance_analysis(self, analysis: Dict) -> Dict:
        """Enhance the initial analysis with additional context and validation."""
        # Ensure all lines have valid emotions
        for line in analysis.get("lines", []):
            emotion = line.get("emotion", {})
            if isinstance(emotion, str):
                # Convert simple emotion strings to detailed format
                line["emotion"] = {
                    "base": emotion,
                    "intensity": self.EMOTIONS.get(emotion, {}).get("intensity", 0.5),
                    "modifiers": [],
                    "context": "Automatically detected"
                }
            
            # Apply emotion modifiers
            modifiers = line["emotion"].get("modifiers", [])
            speed_factor = self.EMOTIONS.get(line["emotion"]["base"], {}).get("speed", 1.0)
            stability = 1.0
            volume = 1.0
            
            for modifier in modifiers:
                if modifier in self.MODIFIERS:
                    mod = self.MODIFIERS[modifier]
                    speed_factor *= mod["speed"]
                    stability *= mod["stability"]
                    volume *= mod["volume"]
            
            # Ensure timing information is present with modifier effects
            if "timing" not in line:
                line["timing"] = {
                    "pause_before": 0.5,
                    "pause_after": 1.0,
                    "suggested_speed": speed_factor
                }
            
            # Add performance parameters
            line["performance"] = {
                "stability": stability,
                "volume": volume,
                "emphasis": line["emotion"]["intensity"]
            }
        
        return analysis
    
    async def get_line_emotion(self, line_text: str) -> Dict:
        """Get detailed emotional context for a single line."""
        prompt = f"""
        Analyze the emotion in this line. Consider:
        - Primary emotion from: {list(self.EMOTIONS.keys())}
        - Possible modifiers: {list(self.MODIFIERS.keys())}
        - Intensity (0.0-1.0)
        - Subtext and context
        
        Line: "{line_text}"
        
        Return a JSON object with:
        {{
            "base": "emotion name",
            "intensity": float,
            "modifiers": ["modifier1", "modifier2"],
            "context": "explanation"
        }}
        """
        
        response = await self.deepseek.generate(prompt)
        try:
            emotion_data = json.loads(response)
            return emotion_data
        except:
            return {
                "base": "neutral",
                "intensity": 0.5,
                "modifiers": [],
                "context": "Failed to analyze emotion"
            }
    
    def format_line_with_emotion(self, line: str, emotion_data: Dict) -> TextFrame:
        """Format a line with detailed emotion metadata for TTS."""
        # Calculate combined effects of emotion and modifiers
        base_emotion = emotion_data["base"]
        modifiers = emotion_data.get("modifiers", [])
        
        speed_factor = self.EMOTIONS.get(base_emotion, {}).get("speed", 1.0)
        stability = 1.0
        volume = 1.0
        
        for modifier in modifiers:
            if modifier in self.MODIFIERS:
                mod = self.MODIFIERS[modifier]
                speed_factor *= mod["speed"]
                stability *= mod["stability"]
                volume *= mod["volume"]
        
        return TextFrame(
            text=line,
            metadata={
                "emotion": base_emotion,
                "intensity": emotion_data["intensity"],
                "speed": speed_factor,
                "stability": stability,
                "volume": volume,
                "modifiers": modifiers
            }
        ) 