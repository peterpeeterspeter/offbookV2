from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import logging
from datetime import datetime, UTC
import os

from src.database.config import get_db, db_config
from src.services.deepseek import DeepSeekService
from src.services.whisper import whisper_service
from src.services.performance_monitor import performance_monitor
from src.routers import auth, scripts, sessions, performance

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - [%(levelname)s] - %(message)s - {%(filename)s:%(lineno)d}'
)
logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title="OFFbook API",
        description="API for OFFbook - Your AI-powered script rehearsal assistant",
        version="1.0.0"
    )

    # Get environment variables
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

    # CORS middleware configuration
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
    app.include_router(auth.router)
    app.include_router(scripts.router)
    app.include_router(sessions.router)
    app.include_router(performance.router)

    @app.on_event("startup")
    async def startup_event():
        """Initialize services on startup."""
        try:
            # Initialize database
            await db_config.initialize_async()
            logger.info("Database initialized successfully")

            # Initialize other services
            await whisper_service.initialize()
            await performance_monitor.initialize()
            logger.info("Services initialized successfully")
        except Exception as e:
            logger.error(f"Error during startup: {str(e)}")
            raise

    @app.on_event("shutdown")
    async def shutdown_event():
        """Clean up resources on shutdown."""
        try:
            await db_config.cleanup_async()
            logger.info("Database connection disposed")
        except Exception as e:
            logger.error(f"Error during shutdown: {str(e)}")

    @app.get("/health")
    async def health_check():
        """Health check endpoint that verifies all services."""
        try:
            # Check database connection
            db_healthy = await db_config.verify_async_connection()

            health_status = {
                "status": "healthy" if db_healthy else "unhealthy",
                "database": db_healthy,
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
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unhealthy",
                    "error": str(e),
                    "timestamp": datetime.now(UTC).isoformat()
                }
            )

    @app.get("/pool-stats")
    async def get_pool_statistics():
        """Get current database pool statistics."""
        return {
            "pool_stats": db_config.get_pool_stats(),
            "timestamp": datetime.now(UTC).isoformat()
        }

    return app

# Create the application instance
app = create_app()

# Re-export dependencies
get_db = get_db

def get_deepseek_service():
    """Get DeepSeek service instance."""
    return DeepSeekService()

# Make these available for imports
__all__ = ['app', 'get_db', 'get_deepseek_service', 'create_app']
