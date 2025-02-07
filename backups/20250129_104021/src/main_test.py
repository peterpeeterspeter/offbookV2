from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from .api import performance

app = FastAPI(title="OFFbook Performance Monitor")

# Mount static files
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Include performance routes
app.include_router(performance.router, prefix="/api")

@app.get("/")
async def get_dashboard():
    """Serve the performance dashboard."""
    return FileResponse(static_dir / "performance.html") 