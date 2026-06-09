#!/bin/sh
cd /app/mcp-mongo
touch .env
PORT=3001 npm start &

sleep 2

# Return to /app and run FastAPI backend
cd /app
export MCP_SERVER_URL="http://localhost:3001/sse"
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
