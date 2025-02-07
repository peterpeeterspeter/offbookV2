from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
import PyPDF2
import io
import json
from datetime import datetime, UTC
from pathlib import Path
import logging
from pydantic import BaseModel

from ..database.config import get_async_session
from ..database.models import User, Script
from .auth import get_current_user
from ..services.script_analysis_service import script_analysis_service

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

class ScriptMetadata(BaseModel):
    """Script metadata model."""
    title: str
    page_count: int
    upload_date: str
    file_size: int
    language: str = "en"

@router.post("/upload")
async def upload_script(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
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

@router.get("/list")
async def list_scripts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """List all scripts for the current user."""
    try:
        result = await db.execute(
            """
            SELECT id, title, created_at, script_metadata, analysis
            FROM scripts
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            """,
            {"user_id": current_user.id}
        )
        
        scripts = result.fetchall()
        return [
            {
                "id": script.id,
                "title": script.title,
                "created_at": script.created_at,
                "metadata": json.loads(script.script_metadata),
                "analysis_status": "completed" if script.analysis and "error" not in script.analysis else "pending"
            }
            for script in scripts
        ]
        
    except Exception as e:
        logger.error(f"Error listing scripts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{script_id}")
async def get_script(
    script_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get a specific script by ID."""
    try:
        result = await db.execute(
            """
            SELECT id, title, content, script_metadata, analysis, created_at
            FROM scripts
            WHERE id = :script_id AND user_id = :user_id
            """,
            {
                "script_id": script_id,
                "user_id": current_user.id
            }
        )
        
        script = result.fetchone()
        if not script:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found"
            )
            
        return {
            "id": script.id,
            "title": script.title,
            "content": script.content,
            "metadata": json.loads(script.script_metadata),
            "analysis": script.analysis,
            "created_at": script.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving script: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{script_id}")
async def delete_script(
    script_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete a script."""
    try:
        result = await db.execute(
            """
            DELETE FROM scripts
            WHERE id = :script_id AND user_id = :user_id
            RETURNING id
            """,
            {
                "script_id": script_id,
                "user_id": current_user.id
            }
        )
        
        if not result.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found"
            )
            
        await db.commit()
        return {"message": "Script deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting script: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 