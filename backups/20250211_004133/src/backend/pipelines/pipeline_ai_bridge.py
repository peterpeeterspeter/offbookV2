from typing import Dict, Optional, List
import asyncio
import json
from fastapi import WebSocket
from .audio_pipeline import AudioFrame, EmotionLabel, EmotionAnalysis, ProcessedAudioFrame
from pydantic import BaseModel

class AIServiceRequest(BaseModel):
    service: str
    action: str
    data: Dict
    session_id: str

class AIServiceResponse(BaseModel):
    success: bool
    data: Optional[Dict]
    error: Optional[str]

class PipelineAIBridge:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.processing_queue = asyncio.Queue()
        self.response_handlers = {}
        
    async def start(self):
        """Start the bridge processing loop"""
        asyncio.create_task(self._process_queue())
        
    async def _process_queue(self):
        """Process requests in the queue"""
        while True:
            request = await self.processing_queue.get()
            try:
                response = await self._send_to_ai_service(request)
                if request.session_id in self.response_handlers:
                    await self.response_handlers[request.session_id](response)
            except Exception as e:
                print(f"Error processing AI request: {str(e)}")
            finally:
                self.processing_queue.task_done()

    async def _send_to_ai_service(self, request: AIServiceRequest) -> AIServiceResponse:
        """Send request to TypeScript AI service through WebSocket"""
        try:
            await self.websocket.send_json({
                "type": "ai_service_request",
                "service": request.service,
                "action": request.action,
                "data": request.data,
                "session_id": request.session_id
            })
            
            response = await self.websocket.receive_json()
            return AIServiceResponse(**response)
        except Exception as e:
            return AIServiceResponse(
                success=False,
                data=None,
                error=str(e)
            )

    async def analyze_emotion(self, audio_frame: AudioFrame) -> EmotionAnalysis:
        """Analyze emotion using DeepSeek service"""
        request = AIServiceRequest(
            service="deepseek",
            action="analyzeEmotion",
            data={
                "audioData": audio_frame.data,
                "sampleRate": audio_frame.sample_rate
            },
            session_id=audio_frame.session_id
        )
        
        response = await self._send_to_ai_service(request)
        if not response.success:
            raise RuntimeError(f"Emotion analysis failed: {response.error}")
            
        return EmotionAnalysis(
            emotion=EmotionLabel(response.data["emotion"]),
            confidence=response.data["confidence"],
            intensity=response.data["intensity"],
            features=response.data["features"]
        )

    async def enhance_audio(self, audio_data: List[float], sample_rate: int) -> List[float]:
        """Enhance audio using AI-powered techniques"""
        request = AIServiceRequest(
            service="audioEnhancement",
            action="enhance",
            data={
                "audioData": audio_data,
                "sampleRate": sample_rate
            },
            session_id="enhancement"
        )
        
        response = await self._send_to_ai_service(request)
        if not response.success:
            raise RuntimeError(f"Audio enhancement failed: {response.error}")
            
        return response.data["enhancedAudio"]

    async def get_performance_feedback(
        self,
        processed_frame: ProcessedAudioFrame,
        target_emotion: EmotionLabel,
        target_intensity: float
    ) -> Dict:
        """Get performance feedback using the AI coach"""
        request = AIServiceRequest(
            service="performanceCoach",
            action="analyzeFeedback",
            data={
                "audio": {
                    "data": processed_frame.original.data,
                    "sampleRate": processed_frame.original.sample_rate
                },
                "emotion": {
                    "detected": processed_frame.emotion.emotion if processed_frame.emotion else None,
                    "target": target_emotion,
                    "intensity": {
                        "detected": processed_frame.emotion.intensity if processed_frame.emotion else 0,
                        "target": target_intensity
                    }
                },
                "quality": processed_frame.quality.dict()
            },
            session_id=processed_frame.original.session_id
        )
        
        response = await self._send_to_ai_service(request)
        if not response.success:
            raise RuntimeError(f"Performance analysis failed: {response.error}")
            
        return response.data 