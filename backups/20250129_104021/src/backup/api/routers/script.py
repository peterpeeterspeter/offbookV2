from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime

from ...services.script_analysis_service import (
    script_analysis_service,
    ScriptMetadata,
    CharacterProfile,
    SceneAnalysis,
    EmotionMarker
)

router = APIRouter(prefix="/script", tags=["script"])

class ScriptAnalysisRequest(BaseModel):
    """Request to analyze a script."""
    text: str
    title: Optional[str] = None
    language: str = "en"

class CharacterLineRequest(BaseModel):
    """Request to analyze a character's line."""
    character: str
    line: str

@router.post("/analyze")
async def analyze_script(request: ScriptAnalysisRequest) -> ScriptMetadata:
    """Analyze a complete script."""
    try:
        metadata = ScriptMetadata(
            title=request.title or "Untitled",
            characters=set(),
            scene_count=0,
            total_lines=0,
            estimated_duration=0.0,
            creation_date=datetime.now(),
            last_modified=datetime.now(),
            language=request.language
        )
        
        return script_analysis_service.analyze_script(
            request.text,
            metadata
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload")
async def upload_script(
    file: UploadFile = File(...),
    language: str = "en"
) -> ScriptMetadata:
    """Upload and analyze a script file."""
    try:
        content = await file.read()
        text = content.decode()
        
        metadata = ScriptMetadata(
            title=file.filename.rsplit(".", 1)[0],
            characters=set(),
            scene_count=0,
            total_lines=0,
            estimated_duration=0.0,
            creation_date=datetime.now(),
            last_modified=datetime.now(),
            language=language
        )
        
        return script_analysis_service.analyze_script(text, metadata)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/character/{character}")
async def get_character_profile(character: str) -> Optional[CharacterProfile]:
    """Get the profile for a specific character."""
    profile = script_analysis_service.get_character_profile(character)
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail=f"Character {character} not found"
        )
    return profile

@router.get("/scene/{scene_number}")
async def get_scene_analysis(scene_number: int) -> Optional[SceneAnalysis]:
    """Get the analysis for a specific scene."""
    analysis = script_analysis_service.get_scene_analysis(scene_number)
    if analysis is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scene {scene_number} not found"
        )
    return analysis

@router.post("/line/analyze")
async def analyze_line(request: CharacterLineRequest) -> List[EmotionMarker]:
    """Analyze a single character line."""
    try:
        return script_analysis_service.analyze_character_line(
            request.character,
            request.line
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/emotions/{text}")
async def detect_emotions(text: str) -> List[EmotionMarker]:
    """Detect emotions in a piece of text."""
    try:
        return script_analysis_service.detect_emotions(text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset")
async def reset_analysis() -> Dict:
    """Reset the script analysis service state."""
    try:
        script_analysis_service.reset()
        return {
            "status": "success",
            "message": "Script analysis service reset"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 