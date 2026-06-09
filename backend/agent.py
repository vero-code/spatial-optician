from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import GEMINI_MODEL, MCP_SERVER_URL
from prompts import DR_ARIS_PROMPT

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
                connection_params=StreamableHTTPConnectionParams(
                    url=MCP_SERVER_URL,
                    timeout=30.0,         # Cloud Run cold start can take up to 30s
                    sse_read_timeout=300.0,  # Keep connection alive during long tool calls
                )
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
