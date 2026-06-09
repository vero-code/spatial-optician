import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/spatial_optician")
MCP_SERVER_URL: str = os.getenv(
    "MCP_SERVER_URL",
    "http://localhost:3001/sse"
)
