from contextlib import asynccontextmanager
from typing import List
import os
import time
import random

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types as genai_types
from pymongo import MongoClient
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/spatial_optician")
MCP_SERVER_URL: str = (
    "https://spatial-optician-mcp-601334765015.europe-west1.run.app/sse"
)

DR_ARIS_PROMPT = """\
# ROLE & PERSONALITY
You are Dr. Aris, the Spatial Optician. You are a precise, data-driven engineering \
assistant specializing in facility lighting audits and energy optimization. \
Your tone is professional, technical, and analytical.

# GOALS
1. Analyze room lighting conditions using spatial awareness.
2. Cross-reference requirements with official ISO/NASA standards.
3. Calculate energy deficits and clear financial ROI for retrofitting.
4. Interact with external MongoDB data collections to find exact lamp replacements.

# OPERATIONAL PROTOCOL
- Step 1 (Scan): When a user provides context or an image, identify the space type, \
layout, and visible lighting elements.
- Step 2 (Analyze): Use available tools to fetch data, compute lux level requirements, \
and pinpoint inefficiency.
- Step 3 (Resolve): Provide a structured technical report highlighting energy savings (%), \
total cost, and specific bulb model recommendations.

# STRICT CONSTRAINTS
- Ground all your recommendations strictly in your provided data stores and tools.
- Do not make up product pricing, part numbers, or specifications out of nowhere.
- If you lack technical data to make an exact calculation, ask the user clear clarifying \
questions about the dimensions or use-case of the space.
- Stay completely focused on spatial lighting tasks. Politely decline tasks unrelated to \
engineering, facility management, or optics.\
"""

DR_ARIS_VISION_PROMPT = (
    "You are Dr. Aris, a spatial lighting engineer. Analyze this image thoroughly: "
    "describe the space type, visible lighting conditions, fixture types you can see, "
    "approximate lux levels, and any lighting inefficiencies or opportunities for "
    "optimization. Be concise but technically precise."
)

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

db = None

try:
    _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5_000)
    db = _mongo_client.get_default_database()
    print("MongoDB connected.")
except Exception as exc:
    print(f"Warning: MongoDB unavailable — running in sandbox mode. ({exc})")

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class SpatialAnalysisResult(BaseModel):
    site_reference: str
    calibration_date: str
    optical_scale: str
    diffusion_coefficient: float
    rayleigh_scattering: str
    lux_deficit: float
    spatial_efficiency: float
    timestamp: float


class ImageAnalysisResponse(BaseModel):
    description: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    message: str

# ---------------------------------------------------------------------------
# ADK Agent
# ---------------------------------------------------------------------------

root_agent = None


def _build_root_agent():
    """Construct and return the Dr. Aris root agent with all sub-agents and tools."""
    from google.adk.agents import LlmAgent
    from google.adk.tools import agent_tool, url_context
    from google.adk.tools.google_search_tool import GoogleSearchTool
    from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
    from google.adk.tools.mcp_tool.mcp_toolset import McpToolset

    search_agent = LlmAgent(
        name="Spatial_Optician_google_search_agent",
        model=GEMINI_MODEL,
        description="Agent specialized in performing Google searches.",
        instruction="Use the GoogleSearchTool to find information on the web.",
        tools=[GoogleSearchTool()],
    )

    url_agent = LlmAgent(
        name="Spatial_Optician_url_context_agent",
        model=GEMINI_MODEL,
        description="Agent specialized in fetching content from URLs.",
        instruction="Use the UrlContextTool to retrieve content from provided URLs.",
        tools=[url_context],
    )

    return LlmAgent(
        name="Spatial_Optician",
        model=GEMINI_MODEL,
        description=(
            "Autonomous AI Agent for spatial analysis, "
            "lighting efficiency audits, and ROI optimization."
        ),
        instruction=DR_ARIS_PROMPT,
        tools=[
            agent_tool.AgentTool(agent=search_agent),
            agent_tool.AgentTool(agent=url_agent),
            McpToolset(
                connection_params=StreamableHTTPConnectionParams(url=MCP_SERVER_URL)
            ),
        ],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize ADK agents after the server port is open, then yield."""
    global root_agent
    print("Lifespan startup: initializing ADK agents...")
    try:
        root_agent = _build_root_agent()
        print("ADK agents initialized successfully.")
    except Exception as exc:
        print(f"WARNING: ADK agent initialization failed: {exc}. Chat will be unavailable.")

    yield

    print("Lifespan shutdown.")

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# Routes — system
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"service": "Spatial Optician Core API", "status": "active", "version": "2.04"}


@app.get("/health")
def health_check():
    return {"status": "ok", "db_connected": db is not None}

# ---------------------------------------------------------------------------
# Routes — analysis
# ---------------------------------------------------------------------------

_FALLBACK_HISTORY = [
    SpatialAnalysisResult(
        site_reference="NY-HUD-01",
        calibration_date="25.05.2026",
        optical_scale="1:500",
        diffusion_coefficient=0.842,
        rayleigh_scattering="λ-4 η",
        lux_deficit=-1.24,
        spatial_efficiency=18.4,
        timestamp=time.time() - 3_600,
    )
]


@app.post("/api/analyze", response_model=SpatialAnalysisResult)
async def analyze_photo(file: UploadFile = File(...)):
    """Simulate optical depth analysis, persist metadata, and return spatial parameters."""
    time.sleep(1.0)

    result = SpatialAnalysisResult(
        site_reference=f"NY-HUD-{random.randint(10, 99)}",
        calibration_date=time.strftime("%d.%m.%Y"),
        optical_scale="1:500",
        diffusion_coefficient=round(random.uniform(0.75, 0.95), 3),
        rayleigh_scattering="λ-4 η",
        lux_deficit=round(random.uniform(-1.50, -0.50), 2),
        spatial_efficiency=round(random.uniform(15.0, 22.0), 1),
        timestamp=time.time(),
    )

    if db is not None:
        try:
            db.analyses.insert_one(result.model_dump())
            print(f"Saved analysis {result.site_reference} to MongoDB.")
        except Exception as exc:
            print(f"MongoDB write error: {exc}")

    return result


@app.post("/api/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_image_with_ai(file: UploadFile = File(...)):
    """Send the uploaded image to Gemini Vision and return an AI lighting analysis."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server.",
        )

    image_bytes = await file.read()
    mime_type = file.content_type or "image/jpeg"

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                DR_ARIS_VISION_PROMPT,
            ],
        )
        description = response.text or "No description returned from Gemini."
        print(f"[Vision] '{file.filename}': {description[:80]}...")
        return ImageAnalysisResponse(description=description)

    except Exception as exc:
        print(f"[Vision] Gemini error: {exc}")
        raise HTTPException(status_code=500, detail=f"Gemini Vision error: {exc}")


@app.get("/api/history", response_model=List[SpatialAnalysisResult])
def get_analysis_history():
    """Return the last 10 audit records from MongoDB, or a fallback stub."""
    if db is None:
        return _FALLBACK_HISTORY

    try:
        docs = db.analyses.find().sort("timestamp", -1).limit(10)
        return [SpatialAnalysisResult(**{k: v for k, v in doc.items() if k != "_id"}) for doc in docs]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}")

# ---------------------------------------------------------------------------
# Routes — chat
# ---------------------------------------------------------------------------

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """Forward a user message to the Dr. Aris ADK agent and return the reply."""
    if root_agent is None:
        raise HTTPException(status_code=503, detail="ADK Agent is not initialized. Check server logs.")

    try:
        response = root_agent.run(request.message)
        reply = getattr(response, "text", str(response)).strip()
        return ChatResponse(message=reply or "No response from agent.")
    except Exception as exc:
        print(f"ADK Agent error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
