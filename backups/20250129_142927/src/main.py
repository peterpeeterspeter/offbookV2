from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import logging
import sys
import os
import asyncio
from typing import Optional
from datetime import datetime, UTC
from contextlib import asynccontextmanager

from .database.config import db_config
from .routers import auth, scripts, sessions, performance
from .services.whisper import whisper_service
from .services.performance_monitor import performance_monitor

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Get environment variables
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:8000").split(",")
POOL_HEALTH_CHECK_INTERVAL = int(os.getenv("POOL_HEALTH_CHECK_INTERVAL", "300"))  # 5 minutes

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Set SQLAlchemy logging based on DEBUG mode
logging.getLogger('sqlalchemy.engine').setLevel(logging.DEBUG if DEBUG else logging.INFO)
logging.getLogger('sqlalchemy.pool').setLevel(logging.DEBUG if DEBUG else logging.INFO)
logging.getLogger('uvicorn').setLevel(logging.DEBUG if DEBUG else logging.INFO)

# Application state
class AppState:
    def __init__(self):
        self.db_initialized = False
        self.whisper_initialized = False
        self.performance_monitor_initialized = False
    
    def is_ready(self):
        return all([
            self.db_initialized,
            self.whisper_initialized,
            self.performance_monitor_initialized
        ])

app_state = AppState()

async def pool_health_monitor():
    """Background task to monitor database pool health."""
    while True:
        try:
            await db_config.log_pool_health()
            await asyncio.sleep(POOL_HEALTH_CHECK_INTERVAL)
        except Exception as e:
            logger.error(f"Error in pool health monitor: {str(e)}")
            await asyncio.sleep(60)  # Wait a minute before retrying

@asynccontextmanager
async def app_lifespan(app: FastAPI):
    """Startup and shutdown events for the FastAPI application."""
    # Initialize services
    health_monitor_task = None
    try:
        # Initialize database
        await db_config.initialize_async()
        app_state.db_initialized = True
        logger.info("Database initialized successfully")
        
        # Start pool health monitoring
        health_monitor_task = asyncio.create_task(pool_health_monitor())
        logger.info("Pool health monitoring started")
        
        # Initialize other services
        await whisper_service.initialize()
        app_state.whisper_initialized = True
        logger.info("Whisper service initialized successfully")
        
        await performance_monitor.initialize()
        app_state.performance_monitor_initialized = True
        logger.info("Performance monitor initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise
    finally:
        # Cleanup
        if health_monitor_task:
            health_monitor_task.cancel()
            try:
                await health_monitor_task
            except asyncio.CancelledError:
                pass
            logger.info("Pool health monitoring stopped")
        
        await performance_monitor.cleanup()
        await whisper_service.cleanup()
        await db_config.cleanup_async()
        logger.info("Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="OFFbook",
    description="AI-powered platform for practicing acting and dialogue delivery",
    version="1.0.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
    openapi_url="/openapi.json" if DEBUG else None,
    debug=DEBUG,
    lifespan=app_lifespan
)

# CORS middleware configuration using environment variables
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
try:
    static_dir = Path(__file__).parent / "static"
    static_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
except Exception as e:
    logger.error(f"Failed to mount static directory: {str(e)}")

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(scripts.router, prefix="/scripts", tags=["scripts"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(performance.router, prefix="/performance", tags=["performance"])

@app.get("/health")
async def health_check():
    """Health check endpoint that verifies all services."""
    health_status = {
        "status": "healthy" if app_state.is_ready() else "initializing",
        "database": await db_config.verify_async_connection(),
        "whisper": whisper_service.is_ready(),
        "performance_monitor": performance_monitor.is_ready(),
        "timestamp": datetime.now(UTC).isoformat()
    }
    
    if not all(health_status.values()):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )
    
    return health_status 

@app.get("/pool-stats")
async def get_pool_statistics():
    """Endpoint to get current pool statistics."""
    return {
        "async_pool": db_config.get_pool_stats(is_async=True),
        "sync_pool": db_config.get_pool_stats(is_async=False),
        "timestamp": datetime.now(UTC).isoformat()
    } 