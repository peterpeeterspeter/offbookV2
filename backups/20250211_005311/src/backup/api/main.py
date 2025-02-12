from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from .routers import session, script, speech, tts

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="AI Actor Practice Platform",
    description="A real-time AI-powered platform for practicing acting and dialogue delivery.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include routers
app.include_router(session.router)
app.include_router(script.router)
app.include_router(speech.router)
app.include_router(tts.router)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    # Initialize TTS service
    from ..services.tts_service import tts_service
    await tts_service.initialize()
    
    # Initialize speech recognition service
    from ..services.speech_recognition_service import speech_recognition_service
    await speech_recognition_service.initialize()
    
    # Initialize VAD service
    from ..services.vad_service import vad_service
    await vad_service.initialize()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up services on shutdown."""
    # Close TTS service
    from ..services.tts_service import tts_service
    await tts_service.close()
    
    # Close speech recognition service
    from ..services.speech_recognition_service import speech_recognition_service
    await speech_recognition_service.close()
    
    # Close VAD service
    from ..services.vad_service import vad_service
    await vad_service.close()

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "AI Actor Practice Platform",
        "version": "1.0.0",
        "description": "A real-time AI-powered platform for practicing acting and dialogue delivery."
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "services": {
            "tts": tts_service.session is not None,
            "speech_recognition": speech_recognition_service.model is not None,
            "vad": vad_service.model is not None
        }
    } 