from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import Dict, List
from ..services.script_analysis import ScriptAnalysisService, ScriptMetadata
from ..auth.dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/scripts", tags=["scripts"])
script_service = ScriptAnalysisService()

@router.post("/upload")
async def upload_script(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(None),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Upload and analyze a new script"""
    metadata = ScriptMetadata(title=title, description=description)
    script = await script_service.upload_and_analyze(file, metadata, current_user.id)
    return {"message": "Script upload initiated", "script_id": script.id}

@router.get("/{script_id}")
async def get_script_details(
    script_id: int,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Get detailed script analysis"""
    return await script_service.get_script_details(script_id)

@router.patch("/roles/{role_id}")
async def update_role(
    role_id: int,
    updates: Dict,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Update role details (name, voice assignment)"""
    updated_role = await script_service.update_role(role_id, updates)
    return {"message": "Role updated successfully", "role": updated_role}

@router.get("/{script_id}/analysis-status")
async def get_analysis_status(
    script_id: int,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Get the current status of script analysis"""
    script = await script_service.get_script_details(script_id)
    return {
        "status": script["script"].analysis_status,
        "progress": script["script"].analysis_progress
    }
