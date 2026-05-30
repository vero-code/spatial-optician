from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import time
import random
from pymongo import MongoClient
from dotenv import load_dotenv
import uuid

# Load environment variables from .env file if it exists
load_dotenv()

# Global agent reference — initialized lazily on startup
root_agent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize heavy resources (ADK agents, MCP connections) AFTER the port is open."""
    global root_agent
    print("Lifespan startup: initializing ADK agents...")
    try:
        from google.adk.agents import LlmAgent
        from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
        from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
        from google.adk.tools import agent_tool
        from google.adk.tools.google_search_tool import GoogleSearchTool
        from google.adk.tools import url_context

        spatial_optician_google_search_agent = LlmAgent(
            name='Spatial_Optician_google_search_agent',
            model='gemini-3.5-flash',
            description='Agent specialized in performing Google searches.',
            sub_agents=[],
            instruction='Use the GoogleSearchTool to find information on the web.',
            tools=[GoogleSearchTool()],
        )

        spatial_optician_url_context_agent = LlmAgent(
            name='Spatial_Optician_url_context_agent',
            model='gemini-3.5-flash',
            description='Agent specialized in fetching content from URLs.',
            sub_agents=[],
            instruction='Use the UrlContextTool to retrieve content from provided URLs.',
            tools=[url_context],
        )

        root_agent = LlmAgent(
            name='Spatial_Optician',
            model='gemini-3.5-flash',
            description='Autonomous AI Agent for spatial analysis, lighting efficiency audits, and ROI optimization.',
            sub_agents=[],
            instruction='# ROLE & PERSONALITY\nYou are Dr. Aris, the Spatial Optician. You are a precise, data-driven engineering assistant specializing in facility lighting audits and energy optimization. Your tone is professional, technical, and analytical.\n\n# GOALS\n1. Analyze room lighting conditions using spatial awareness.\n2. Cross-reference requirements with official ISO/NASA standards.\n3. Calculate energy deficits and clear financial ROI for retrofitting.\n4. Interact with external MongoDB data collections to find exact lamp replacements.\n\n# OPERATIONAL PROTOCOL\n- Step 1 (Scan): When a user provides context or an image, identify the space type, layout, and visible lighting elements.\n- Step 2 (Analyze): Use available tools to fetch data, compute lux level requirements, and pinpoint inefficiency.\n- Step 3 (Resolve): Provide a structured technical report highlighting energy savings (%), total cost, and specific bulb model recommendations.\n\n# STRICT CONSTRAINTS\n- Ground all your recommendations strictly in your provided data stores and tools.\n- Do not make up product pricing, part numbers, or specifications out of nowhere.\n- If you lack technical data to make an exact calculation, ask the user clear clarifying questions about the dimensions or use-case of the space.\n- Stay completely focused on spatial lighting tasks. Politely decline tasks unrelated to engineering, facility management, or optics.',
            tools=[
                agent_tool.AgentTool(agent=spatial_optician_google_search_agent),
                agent_tool.AgentTool(agent=spatial_optician_url_context_agent),
                McpToolset(
                    connection_params=StreamableHTTPConnectionParams(
                        url='https://spatial-optician-mcp-601334765015.europe-west1.run.app/sse',
                    ),
                )
            ],
        )
        print("ADK agents initialized successfully.")
    except Exception as e:
        print(f"WARNING: Failed to initialize ADK agents: {e}. Chat endpoint will be unavailable.")

    yield  # Application is running

    # Cleanup on shutdown (if needed)
    print("Lifespan shutdown.")


app = FastAPI(
    title="Spatial Optician API",
    description="Backend API for Architectural Visual Analysis and Spatial Optometry",
    version="2.04",
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection settings
MONGODB_URI = os.getenv("MONGODB_URI") or "mongodb://localhost:27017/spatial_optician"
db = None

# Proactively try to connect to MongoDB
try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client.get_default_database()
    print("FastAPI successfully connected to MongoDB!")
except Exception as e:
    try:
        if 'client' in locals() and client:
            db = client["spatial_optician"]
            print("FastAPI successfully connected to MongoDB (spatial_optician database)!")
        else:
            raise e
    except Exception as inner_e:
        print(f"Warning: MongoDB connection offline. Running in sandbox-mode. Error: {inner_e}")

class SpatialAnalysisResult(BaseModel):
    site_reference: str
    calibration_date: str
    optical_scale: str
    diffusion_coefficient: float
    rayleigh_scattering: str
    lux_deficit: float
    spatial_efficiency: float
    timestamp: float

@app.get("/")
def read_root():
    return {
        "service": "Spatial Optician Core API",
        "status": "active",
        "version": "2.04"
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "db_connected": db is not None}

@app.post("/api/analyze", response_model=SpatialAnalysisResult)
async def analyze_photo(file: UploadFile = File(...)):
    """
    Simulates optical depth analysis of uploaded architectural scans,
    stores metadata in MongoDB, and returns calculated spatial parameters.
    """
    time.sleep(1.0)

    result = SpatialAnalysisResult(
        site_reference=f"NY-HUD-{random.randint(10, 99)}",
        calibration_date=time.strftime("%d.%m.%Y"),
        optical_scale="1:500",
        diffusion_coefficient=round(random.uniform(0.75, 0.95), 3),
        rayleigh_scattering="λ-4 η",
        lux_deficit=round(random.uniform(-1.50, -0.50), 2),
        spatial_efficiency=round(random.uniform(15.0, 22.0), 1),
        timestamp=time.time()
    )

    if db is not None:
        try:
            db.analyses.insert_one(result.dict())
            print(f"Saved analysis {result.site_reference} to MongoDB.")
        except Exception as e:
            print(f"Error saving to MongoDB: {e}")

    return result

@app.get("/api/history", response_model=List[SpatialAnalysisResult])
def get_analysis_history():
    """
    Fetches the history of past spatial analysis evaluations from MongoDB.
    """
    if db is not None:
        try:
            cursor = db.analyses.find().sort("timestamp", -1).limit(10)
            history = []
            for doc in cursor:
                doc.pop("_id", None)
                history.append(SpatialAnalysisResult(**doc))
            return history
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database query failed: {e}")
    else:
        return [
            SpatialAnalysisResult(
                site_reference="NY-HUD-01",
                calibration_date="25.05.2026",
                optical_scale="1:500",
                diffusion_coefficient=0.842,
                rayleigh_scattering="λ-4 η",
                lux_deficit=-1.24,
                spatial_efficiency=18.4,
                timestamp=time.time() - 3600
            )
        ]


class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    message: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """
    Sends a message to the ADK Agent.
    """
    if root_agent is None:
        raise HTTPException(status_code=503, detail="ADK Agent is not initialized. Check server logs.")
    try:
        response = root_agent.run(request.message)
        reply_text = getattr(response, "text", str(response))
        return ChatResponse(message=reply_text.strip() or "No response from agent.")
    except Exception as e:
        print(f"ADK Agent Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
