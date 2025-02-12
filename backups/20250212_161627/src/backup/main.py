from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

from .database.config import init_db, cleanup_db, get_session
from .database.cache_warmer import CacheWarmerFactory
from .routers import session, script, speech, tts
from .auth.router import router as auth_router
from .auth.webrtc_router import router as webrtc_router
from .auth.monitoring_router import router as monitoring_router

# Global variable for the cache warmer
scheduled_warmer = None

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events for the FastAPI application."""
    # Initialize database
    await init_db()
    
    # Initialize cache warmer
    async with get_session() as session:
        global scheduled_warmer
        scheduled_warmer = await CacheWarmerFactory.create_scheduled_warmer(
            session,
            performance_interval=1800,  # 30 minutes
            engagement_interval=3600,   # 1 hour
            system_interval=7200        # 2 hours
        )
        await scheduled_warmer.start()
    
    yield
    
    # Cleanup
    if scheduled_warmer:
        await scheduled_warmer.stop()
    await cleanup_db()

app = FastAPI(
    title="AI Actor Practice Platform",
    description="Real-time AI-powered platform for practicing acting and dialogue delivery",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(webrtc_router, prefix="/webrtc", tags=["webrtc"])
app.include_router(monitoring_router, prefix="/monitoring", tags=["monitoring"])
app.include_router(session.router, prefix="/session", tags=["session"])
app.include_router(script.router, prefix="/script", tags=["script"])
app.include_router(speech.router, prefix="/speech", tags=["speech"])
app.include_router(tts.router, prefix="/tts", tags=["tts"])

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "AI Actor Practice Platform",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"} 