from typing import Dict, List, Optional
import json
from fastapi import UploadFile, HTTPException
from pydantic import BaseModel
import mammoth
import PyPDF2
import asyncio
from ..models.script import Script, ScriptAnalysis, Role
from ..utils.deepseek import analyze_script
from ..config import get_settings

class ScriptMetadata(BaseModel):
    title: str
    description: Optional[str] = None

class ScriptAnalysisService:
    def __init__(self):
        self.settings = get_settings()
        self.supported_formats = {
            'application/pdf': self._parse_pdf,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': self._parse_docx,
            'text/plain': self._parse_txt
        }
        self.max_file_size = 20 * 1024 * 1024  # 20MB

    async def upload_and_analyze(self, file: UploadFile, metadata: ScriptMetadata, user_id: int) -> Script:
        """Upload script file, parse content, and initiate AI analysis"""
        if file.size > self.max_file_size:
            raise HTTPException(status_code=400, detail="File size exceeds 20MB limit")

        if file.content_type not in self.supported_formats:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        # Parse file content
        content = await self.supported_formats[file.content_type](file)

        # Create script record
        script = await Script.create(
            title=metadata.title,
            description=metadata.description,
            content=content,
            user_id=user_id
        )

        # Start async analysis
        asyncio.create_task(self._analyze_script(script))

        return script

    async def _parse_pdf(self, file: UploadFile) -> str:
        """Parse PDF file content"""
        pdf_reader = PyPDF2.PdfReader(await file.read())
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text

    async def _parse_docx(self, file: UploadFile) -> str:
        """Parse DOCX file content"""
        result = mammoth.convert_to_html(await file.read())
        return result.value

    async def _parse_txt(self, file: UploadFile) -> str:
        """Parse TXT file content"""
        content = await file.read()
        return content.decode('utf-8')

    async def _analyze_script(self, script: Script):
        """Analyze script using DeepSeek and store results"""
        try:
            # Get AI analysis
            analysis = await analyze_script(script.content)

            # Store analysis results
            script_analysis = await ScriptAnalysis.create(
                script_id=script.id,
                roles=analysis['roles'],
                scenes=analysis['scenes'],
                emotions=analysis['emotions'],
                dialogue_map=analysis['dialogue_map']
            )

            # Create role records
            for role in analysis['roles']:
                await Role.create(
                    script_id=script.id,
                    name=role['name'],
                    suggested_voice=role.get('suggested_voice'),
                    line_count=role.get('line_count', 0)
                )

            # Update script status
            await script.update(analysis_status='completed').apply()

        except Exception as e:
            await script.update(analysis_status='failed').apply()
            raise HTTPException(status_code=500, detail=f"Script analysis failed: {str(e)}")

    async def get_script_details(self, script_id: int) -> Dict:
        """Get detailed script analysis including roles, scenes, and emotions"""
        script = await Script.get(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="Script not found")

        analysis = await ScriptAnalysis.get(script_id=script_id)
        roles = await Role.get_all(script_id=script_id)

        return {
            "script": script,
            "analysis": analysis,
            "roles": roles
        }

    async def update_role(self, role_id: int, updates: Dict) -> Role:
        """Update role details including name and voice assignment"""
        role = await Role.get(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        await role.update(**updates).apply()
        return role
