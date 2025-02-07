from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import PyPDF2
import io
import json
from datetime import datetime

from ..database.config import get_session
from ..database.models import User, Script
from .auth import get_current_user

router = APIRouter()

@router.post("/upload")
async def upload_script(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Upload and process a new script."""
    try:
        # Read PDF content
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        
        # Extract text from all pages
        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text()
        
        # Basic script metadata
        metadata = {
            "title": file.filename.replace(".pdf", ""),
            "page_count": len(pdf_reader.pages),
            "upload_date": datetime.now().isoformat(),
            "file_size": len(content)
        }
        
        # Create script record
        query = await db.execute(
            """
            INSERT INTO scripts (user_id, title, content, script_metadata)
            VALUES (:user_id, :title, :content, :metadata)
            RETURNING id, title, created_at
            """,
            {
                "user_id": current_user.id,
                "title": metadata["title"],
                "content": text_content,
                "metadata": json.dumps(metadata)
            }
        )
        
        result = query.fetchone()
        await db.commit()
        
        return {
            "id": result.id,
            "title": result.title,
            "created_at": result.created_at,
            "metadata": metadata
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/list")
async def list_scripts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """List all scripts for the current user."""
    try:
        query = await db.execute(
            """
            SELECT id, title, created_at, script_metadata
            FROM scripts
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            """,
            {"user_id": current_user.id}
        )
        
        scripts = query.fetchall()
        return [
            {
                "id": script.id,
                "title": script.title,
                "created_at": script.created_at,
                "metadata": json.loads(script.script_metadata)
            }
            for script in scripts
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{script_id}")
async def get_script(
    script_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Get a specific script by ID."""
    try:
        query = await db.execute(
            """
            SELECT id, title, content, script_metadata, created_at
            FROM scripts
            WHERE id = :script_id AND user_id = :user_id
            """,
            {
                "script_id": script_id,
                "user_id": current_user.id
            }
        )
        
        script = query.fetchone()
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
            "created_at": script.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{script_id}")
async def delete_script(
    script_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Delete a script."""
    try:
        query = await db.execute(
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
        
        if not query.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Script not found"
            )
            
        await db.commit()
        return {"message": "Script deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 