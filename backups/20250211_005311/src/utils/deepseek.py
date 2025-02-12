from typing import Dict
import aiohttp
from ..config import get_settings

settings = get_settings()

async def analyze_script(content: str) -> Dict:
    """
    Analyze script content using DeepSeek NLP to extract roles, scenes, emotions, and dialogue structure.
    """
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{settings.deepseek_api_url}/analyze",
            json={
                "content": content,
                "analysis_type": "theater_script",
                "model": "deepseek-script-parser-v2"
            },
            headers={
                "Authorization": f"Bearer {settings.deepseek_api_key}",
                "Content-Type": "application/json"
            }
        ) as response:
            if response.status != 200:
                error_detail = await response.text()
                raise Exception(f"DeepSeek API error: {error_detail}")

            result = await response.json()

            # Process and structure the analysis results
            processed_result = {
                "roles": [],
                "scenes": [],
                "emotions": {},
                "dialogue_map": {}
            }

            # Extract roles with suggested voices based on characteristics
            for role in result.get("roles", []):
                processed_role = {
                    "name": role["name"],
                    "line_count": role["line_count"],
                    "characteristics": role.get("characteristics", []),
                    "suggested_voice": _suggest_voice(role)
                }
                processed_result["roles"].append(processed_role)

            # Process scenes with start/end lines and context
            for scene in result.get("scenes", []):
                processed_scene = {
                    "number": scene["number"],
                    "start_line": scene["start_line"],
                    "end_line": scene["end_line"],
                    "location": scene.get("location"),
                    "description": scene.get("description"),
                    "characters": scene.get("characters", [])
                }
                processed_result["scenes"].append(processed_scene)

            # Map emotions to lines
            processed_result["emotions"] = result.get("emotions", {})

            # Create dialogue mapping
            processed_result["dialogue_map"] = result.get("dialogue_map", {})

            return processed_result

def _suggest_voice(role: Dict) -> Dict:
    """
    Suggest an appropriate ElevenLabs voice based on role characteristics.
    """
    # Example voice mapping logic - this should be expanded based on available voices
    voice_suggestions = {
        "male_young": {"voice_id": "pNInz6obpgDQGcFmaJgB", "name": "Adam"},
        "male_old": {"voice_id": "VR6AewLTigWG4xSOukaG", "name": "Arnold"},
        "female_young": {"voice_id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah"},
        "female_old": {"voice_id": "ThT5KcBeYPX3keUQqHPh", "name": "Grace"}
    }

    characteristics = [c.lower() for c in role.get("characteristics", [])]

    # Simple matching logic - can be made more sophisticated
    if "male" in characteristics:
        return voice_suggestions["male_old"] if "old" in characteristics else voice_suggestions["male_young"]
    elif "female" in characteristics:
        return voice_suggestions["female_old"] if "old" in characteristics else voice_suggestions["female_young"]
    else:
        # Default to male_young if no clear match
        return voice_suggestions["male_young"]
