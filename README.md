# Spatial Optician

**Spatial Optician** is an intelligent analytical platform designed for performing energy-efficient facility lighting audits, calculating retrofitting Return on Investment (ROI), and conducting automated fixture selection. The system is powered by an AI Agent (Gemini 3.5 Flash) integrated via **Google ADK (Agent Development Kit)** and the **Model Context Protocol (MCP)**.

The user interface is uniquely styled as an interactive engineering blueprint workspace, catering to facility managers and optics engineers alike.

## 🏛️ Project Architecture

A comprehensive breakdown of components, databases, data structures, and multi-agent interaction flows can be found in the:
👉 **[ARCHITECTURE.md](./ARCHITECTURE.md)**

## 🚀 Quick Start Guide

### 1. Database Configuration (MongoDB)
Ensure you have a running MongoDB database or provide your connection string using the `MONGODB_URI` environment variable inside your backend configuration.

### 2. Backend (FastAPI Server)
Navigate to the `backend` folder and run the following commands:
```bash
cd backend
# Synchronize environment and install dependencies
uv sync
# Start the development server
uv run fastapi dev main.py
```
Alternatively, launch using the PowerShell utility script:
```powershell
.\run.ps1
```

### 3. Frontend (React + Vite)
Navigate to the `frontend` folder and launch the local development environment:
```bash
cd frontend
npm install
npm run dev
```

### 4. MongoDB MCP Server
If you need to run the Model Context Protocol database gateway locally:
```bash
cd mcp-mongo
npm install
npm run build
npm start
```
*Note: In production, the backend is configured to connect to the deployed SSE MCP endpoint at `https://spatial-optician-mcp-601334765015.europe-west1.run.app/sse`.*

## 🛠️ Technology Stack
* **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Motion, Lucide Icons.
* **Backend**: Python, FastAPI, PyMongo, Pydantic, Google ADK (Agent Development Kit).
* **MCP Server**: Node.js, Express, TypeScript, Model Context Protocol SDK, MongoDB Driver.
