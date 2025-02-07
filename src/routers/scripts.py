from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional, Dict, Any
import PyPDF2
import io
import json
from datetime import datetime, UTC
from pathlib import Path
import logging
from pydantic import BaseModel

from ..database.config import get_db
from ..database.models import User, Script
from .auth import get_current_user
from ..services.script_analysis_service import script_analysis_service
from ..schemas.scripts import ScriptCreate, ScriptResponse, ScriptUpdate

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/scripts",
    tags=["scripts"]
)

class ScriptMetadata(BaseModel):
    """Script metadata model."""
    title: str
    page_count: int
    upload_date: str
    file_size: int
    language: str = "en"

@router.post("/", response_model=ScriptResponse)
async def create_script(
    script_data: ScriptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new script."""
    try:
        new_script = Script(
            user_id=current_user.id,
            title=script_data.title,
            content=script_data.content,
            script_metadata=script_data.script_metadata or {},
            analysis=script_data.analysis or {}
        )

        db.add(new_script)
        await db.commit()
        await db.refresh(new_script)

        return new_script
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[ScriptResponse])
async def get_scripts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 10
):
    """Get all scripts for the current user."""
    try:
        result = await db.execute(
            select(Script)
            .where(Script.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
        )
        scripts = result.scalars().all()
        return scripts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{script_id}", response_model=ScriptResponse)
async def get_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific script by ID."""
    try:
        result = await db.execute(
            select(Script)
            .where(Script.id == script_id)
            .where(Script.user_id == current_user.id)
        )
        script = result.scalar_one_or_none()

        if not script:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found"
            )

        return script
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{script_id}", response_model=ScriptResponse)
async def update_script(
    script_id: int,
    script_update: ScriptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a script."""
    try:
        result = await db.execute(
            select(Script)
            .where(Script.id == script_id)
            .where(Script.user_id == current_user.id)
        )
        script = result.scalar_one_or_none()

        if not script:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found"
            )

        # Update fields
        for field, value in script_update.dict(exclude_unset=True).items():
            setattr(script, field, value)

        script.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(script)

        return script
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a script."""
    try:
        result = await db.execute(
            select(Script)
            .where(Script.id == script_id)
            .where(Script.user_id == current_user.id)
        )
        script = result.scalar_one_or_none()

        if not script:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found"
            )

        await db.delete(script)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/upload")
async def upload_script(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload and process a new script."""
    try:
        # Validate file type
        file_ext = file.filename.lower().split('.')[-1]
        if file_ext not in ['pdf', 'txt']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF and TXT files are supported"
            )

        # Read file content
        try:
            content = await file.read()
            if len(content) > 10 * 1024 * 1024:  # 10MB limit
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File size exceeds 10MB limit"
                )
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error reading file: {str(e)}"
            )

        # Process file based on type
        try:
            if file_ext == 'pdf':
                try:
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                    text_content = ""
                    for page in pdf_reader.pages:
                        text_content += page.extract_text() + "\n"
                    page_count = len(pdf_reader.pages)
                except Exception as e:
                    logger.error(f"Error processing PDF: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Error processing PDF file. Please ensure it's a valid PDF."
                    )
            else:  # txt file
                try:
                    text_content = content.decode('utf-8')
                    page_count = len(text_content.splitlines()) // 25  # Approximate pages
                except UnicodeDecodeError:
                    logger.error("Error decoding text file")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Error reading text file. Please ensure it's UTF-8 encoded."
                    )

            # Validate script content
            if not text_content.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Script content is empty"
                )

            # Create metadata
            metadata = {
                "title": file.filename.rsplit(".", 1)[0],
                "page_count": page_count,
                "upload_date": datetime.now(UTC).isoformat(),
                "file_size": len(content),
                "file_type": file_ext,
                "language": "en"
            }

            # Create script record
            try:
                script = Script(
                    user_id=current_user.id,
                    title=metadata["title"],
                    content=text_content,
                    script_metadata=metadata,
                    analysis={}  # Initialize empty analysis
                )
                db.add(script)
                await db.commit()
                await db.refresh(script)

                # Schedule background analysis
                background_tasks.add_task(
                    script_analysis_service.analyze_script_background,
                    script.id,
                    text_content
                )

                return {
                    "id": script.id,
                    "title": script.title,
                    "created_at": script.created_at,
                    "metadata": metadata
                }

            except Exception as e:
                logger.error(f"Error saving script to database: {str(e)}")
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error saving script: {str(e)}"
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing file content: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing file content: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error uploading script: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )
