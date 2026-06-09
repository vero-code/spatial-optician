from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from agent import lifespan
from routers import analysis, chat, system

app = FastAPI(
    title="Spatial Optician API",
    description="Backend API for Architectural Visual Analysis and Spatial Optometry",
    version="2.04",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(analysis.router)
app.include_router(chat.router)

# Serve React frontend static files if they exist in the 'static' directory
static_dir = os.path.join(os.path.dirname(__file__), "static")

@app.exception_handler(StarletteHTTPException)
async def spa_exception_handler(request, exc):
    if exc.status_code == 404:
        if not request.url.path.startswith("/api"):
            index_path = os.path.join(static_dir, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
    from fastapi.exception_handlers import http_exception_handler
    return await http_exception_handler(request, exc)

if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
