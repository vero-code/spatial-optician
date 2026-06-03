from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
