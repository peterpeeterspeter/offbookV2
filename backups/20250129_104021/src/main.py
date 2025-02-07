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

from .database.config import init_db, cleanup_db, verify_database, db
from .routers import auth, scripts, sessions, performance
from .services.whisper import whisper_service
from .services.performance_monitor import performance_monitor

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Set SQLAlchemy logging to INFO
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
logging.getLogger('sqlalchemy.pool').setLevel(logging.INFO)
logging.getLogger('uvicorn').setLevel(logging.DEBUG)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Application state
class AppState:
    def __init__(self):
        self.db_initialized = False
        self.whisper_initialized = False
        self.performance_monitor_initialized = False
    
    def is_ready(self):
        return self.db_initialized

app_state = AppState()

@asynccontextmanager
async def app_lifespan(app: FastAPI):
    """Startup and shutdown events for the FastAPI application."""
    try:
        logger.debug("Starting application initialization...")
        # Initialize database with retries
        retry_count = 0
        max_retries = 3
        while retry_count < max_retries:
            try:
                logger.debug(f"Attempting database initialization (attempt {retry_count + 1}/{max_retries})")
                await initialize_database()
                break
            except Exception as e:
                retry_count += 1
                if retry_count == max_retries:
                    logger.error(f"Failed to initialize database after {max_retries} attempts: {str(e)}")
                    raise
                logger.warning(f"Database initialization attempt {retry_count} failed: {str(e)}, retrying...")
                await asyncio.sleep(2 ** retry_count)  # Exponential backoff
        
        # Initialize services
        try:
            await initialize_services()
        except Exception as e:
            logger.warning(f"Service initialization failed: {str(e)}, continuing anyway...")
            # Don't raise the error, allow the app to start without whisper service
        
        logger.info("Application startup completed successfully")
        yield
        
    except Exception as e:
        logger.error(f"Application startup failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        await cleanup_db()
        logger.info("Application shutdown completed successfully")

# Create FastAPI app
app = FastAPI(
    title="OFFbook",
    description="AI-powered platform for practicing acting and dialogue delivery",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=app_lifespan
)

# CORS middleware with more specific configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files with error handling
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

async def initialize_database():
    """Initialize database connection and verify it's working."""
    try:
        # Ensure clean state
        if db._is_initialized:
            await db.cleanup()
        
        # Initialize database
        await init_db()
        
        # Verify connection
        if not await verify_database():
            raise Exception("Database verification failed")
        
        app_state.db_initialized = True
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        app_state.db_initialized = False
        raise

async def initialize_services():
    """Initialize application services."""
    try:
        await whisper_service.initialize()
        app_state.whisper_initialized = True
        logger.info("Services initialized successfully")
    except Exception as e:
        logger.error(f"Service initialization failed: {str(e)}")
        app_state.whisper_initialized = False
        raise

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "OFFbook",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    db_status = await verify_database()
    return {
        "status": "healthy" if app_state.is_ready() and db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "services": {
            "database": app_state.db_initialized,
            "whisper": app_state.whisper_initialized,
            "performance_monitor": app_state.performance_monitor_initialized
        },
        "timestamp": datetime.now(UTC).isoformat()
    }

# Middleware to check application readiness
@app.middleware("http")
async def check_readiness(request, call_next):
    if not app_state.is_ready() and request.url.path not in ["/health", "/docs", "/redoc", "/openapi.json"]:
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Application is starting up. Please try again in a moment.",
                "status": await health_check()
            }
        )
    return await call_next(request)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for better error reporting."""
    logger.error(f"Global exception handler caught: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "path": request.url.path
        }
    ) 